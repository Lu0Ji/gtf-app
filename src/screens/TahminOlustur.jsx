import { useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useToast } from '../contexts/ToastContext.jsx'
import { useUserSettings } from '../hooks/useUserSettings.js'
import { CATEGORIES, CATEGORY_META } from '../lib/categories.js'
import { checkPredictionText } from '../lib/predictionCheck.js'
import DateTimePicker from '../components/DateTimePicker.jsx'
import DetailHeader from '../components/ui/DetailHeader.jsx'

function isFutureDate(dateStr) {
  return Boolean(dateStr) && new Date(dateStr).getTime() > Date.now()
}

export default function TahminOlustur() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { showToast } = useToast()
  const { settings } = useUserSettings()
  // Present when launched from Grup Detayı's "Tahmin oluştur" — tags the
  // prediction to that group so it lands in the group's own feed instead of
  // the public one. Only applies to "Tahmin" mode: a Zaman kapsülü stays a
  // private personal record regardless of where it was created from.
  const groupId = location.state?.groupId || null
  const groupName = location.state?.groupName || ''
  // Present when launched from a "Yaklaşan Etkinlikler" card (Keşfet) — a
  // real-world event's own title/category/date, so starting a prediction
  // from one doesn't mean retyping what it already told you. The sealed
  // content itself is still left blank: that's the actual prediction, not
  // something a fixture listing could ever fill in for you.
  const prefill = location.state?.prefill || null
  const [mode, setMode] = useState('Tahmin')
  const [category, setCategory] = useState(() =>
    prefill?.category ? CATEGORY_META[prefill.category]?.label || 'Spor' : 'Spor'
  )
  const [title, setTitle] = useState(prefill?.title || '')
  const [sealedContent, setSealedContent] = useState('')
  const [eventDate, setEventDate] = useState(prefill?.eventDate || '')
  // 'scheduled' (default, unchanged behaviour) — a chosen minute unlocks it
  // for everyone. 'manual' — no date at all; only the author can open it,
  // whenever they decide to, from Tahmin Kaydı. Once opened it's permanent —
  // enforced server-side by verify_prediction()'s own state machine (sealed
  // → verified_*, one-way), not by anything client-side.
  const [unlockMode, setUnlockMode] = useState('scheduled')
  const [isSensitive, setIsSensitive] = useState(false)
  const [mediaFile, setMediaFile] = useState(null)
  const [mediaPreview, setMediaPreview] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const mediaInputRef = useRef(null)

  const eventDateIsFuture = isFutureDate(eventDate)
  const canSubmit =
    title.trim().length > 0 && sealedContent.trim().length > 0 && (unlockMode === 'manual' || eventDateIsFuture)

  // Client-side check for fast feedback only — the storage bucket itself
  // enforces the real limit (see supabase/schema.sql's PREDICTION MEDIA —
  // VİDEO DESTEĞİ section) since a raw API call could otherwise skip this.
  const MAX_IMAGE_BYTES = 8 * 1024 * 1024
  const MAX_VIDEO_BYTES = 25 * 1024 * 1024

  function handlePickMedia(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const isVideo = file.type.startsWith('video/')
    const limit = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES
    if (file.size > limit) {
      setError(isVideo ? 'Video en fazla 25 MB olabilir.' : 'Görsel en fazla 8 MB olabilir.')
      if (mediaInputRef.current) mediaInputRef.current.value = ''
      return
    }
    setError('')
    setMediaFile(file)
    setMediaPreview(URL.createObjectURL(file))
  }

  function handleRemoveMedia() {
    setMediaFile(null)
    setMediaPreview(null)
    if (mediaInputRef.current) mediaInputRef.current.value = ''
  }

  async function handleSeal() {
    if (!canSubmit || submitting) return
    setError('')

    // Zaman kapsülü is a personal note, not a public claim someone else
    // will ever vote on — only real "Tahmin" mode content needs to look
    // like an actual prediction. See lib/predictionCheck.js.
    if (mode === 'Tahmin') {
      const check = checkPredictionText(sealedContent)
      if (!check.valid) {
        setError(check.reason)
        return
      }
    }

    setSubmitting(true)
    try {
      const isCapsule = mode === 'Zaman kapsülü'
      const targetGroupId = !isCapsule ? groupId : null
      const basePayload = {
        author_id: user.id,
        category: category.toLowerCase(),
        title: title.trim(),
        sealed_content: sealedContent.trim(),
        status: 'sealed',
        is_private: isCapsule,
        event_date: unlockMode === 'manual' ? null : new Date(eventDate).toISOString(),
        sealed_at: new Date().toISOString(),
      }

      let mediaUrl = null
      let mediaType = null
      if (mediaFile) {
        mediaType = mediaFile.type.startsWith('video/') ? 'video' : 'image'
        const ext = mediaFile.name.split('.').pop()
        const path = `${user.id}/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage.from('prediction-media').upload(path, mediaFile)
        // A missing bucket (migration not run yet) shouldn't block the
        // whole prediction — the text content still matters more than the
        // attached media. Just drop it and tell the user why.
        if (uploadError) {
          showToast(mediaType === 'video' ? 'Video yüklenemedi, tahmin medyasız kaydedilecek.' : 'Görsel yüklenemedi, tahmin görselsiz kaydedilecek.')
          mediaType = null
        } else {
          const { data: publicUrlData } = supabase.storage.from('prediction-media').getPublicUrl(path)
          mediaUrl = publicUrlData.publicUrl
        }
      }

      // Optional columns only added to the payload when actually set —
      // PostgREST rejects the whole insert (PGRST204) if a key isn't a real
      // column, and both of these only exist once their migrations (see
      // supabase/schema.sql) have run. Omitting an unset key covers the
      // common case regardless of migration status; if a genuinely-used
      // optional field 42P01/PGRST204s, fall back to the base payload alone
      // rather than losing the user's work.
      const fullPayload = { ...basePayload }
      if (targetGroupId) fullPayload.group_id = targetGroupId
      if (isSensitive) fullPayload.is_sensitive = true
      if (mediaUrl) fullPayload.media_url = mediaUrl
      if (mediaType) fullPayload.media_type = mediaType

      let { error: insertError } = await supabase.from('predictions').insert(fullPayload)
      if (insertError?.code === 'PGRST204' && Object.keys(fullPayload).length > Object.keys(basePayload).length) {
        ;({ error: insertError } = await supabase.from('predictions').insert(basePayload))
        if (!insertError) {
          navigate('/', { replace: true })
          return
        }
      }
      if (insertError) throw insertError
      navigate(targetGroupId ? `/grup/${targetGroupId}` : '/', { replace: true })
    } catch (err) {
      setError(err.message || 'Tahmin kaydedilemedi, tekrar deneyin.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-background text-foreground font-body pb-28">
      <DetailHeader eyebrow={groupId ? groupName || 'Grup kaydı' : 'Yeni kayıt'} title="Tahmin oluştur" />

      <main className="space-y-7 px-5">
        <section>
          {groupId ? (
            <div className="flex items-center justify-center gap-2 rounded-theme bg-primary px-3 py-3 text-sm font-bold text-primary-foreground shadow-sm">
              <iconify-icon icon="lucide:pen-line" class="text-base"></iconify-icon>
              Tahmin
            </div>
          ) : (
            <div className="flex rounded-theme bg-secondary p-1">
              <button
                onClick={() => setMode('Tahmin')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-[10px] px-3 py-3 text-sm font-bold ${
                  mode === 'Tahmin' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-secondary-foreground'
                }`}
              >
                <iconify-icon icon="lucide:pen-line" class="text-base"></iconify-icon>
                Tahmin
              </button>
              <button
                onClick={() => setMode('Zaman kapsülü')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-[10px] px-3 py-3 text-sm font-bold ${
                  mode === 'Zaman kapsülü' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-secondary-foreground'
                }`}
              >
                <iconify-icon icon="lucide:archive" class="text-base"></iconify-icon>
                Zaman kapsülü
              </button>
            </div>
          )}
          {prefill && (
            <div className="mt-3 flex items-center gap-2.5 rounded-theme border border-accent/30 bg-accent/10 px-3.5 py-3">
              <iconify-icon icon="lucide:calendar-clock" class="shrink-0 text-lg text-accent"></iconify-icon>
              <p className="text-xs leading-5 text-foreground">
                <span className="font-semibold">Yaklaşan Etkinlikler</span>'den başlatıldı — başlık ve tarih
                doldu, mühürlenecek tahmini sen yazacaksın.
              </p>
            </div>
          )}
          <div className="mt-3 flex gap-3 rounded-theme border border-border bg-card p-3.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-theme bg-secondary text-primary">
              <iconify-icon icon="lucide:chart-no-axes-combined" class="text-[18px]"></iconify-icon>
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              {groupId ? (
                <>
                  Bu tahmin yalnızca <span className="font-semibold text-foreground">{groupName || 'grup'}</span>{' '}
                  üyelerine görünür, herkese açık akışta yer almaz. Zaman kapsülü şu an yalnızca kişisel akıştan
                  oluşturulabiliyor.
                </>
              ) : (
                <>
                  Doğrulanan sonuç, <span className="font-semibold text-foreground">{category}</span> kategorisindeki
                  kalıcı başarı istatistiklerine eklenir. Zaman kapsülleri yalnızca sana ait kalır ve istatistikleri
                  etkilemez.
                </>
              )}
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-bold text-foreground">Görünür başlık</label>
              <span className="text-[11px] font-medium text-muted-foreground">Zorunlu</span>
            </div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Önümüzdeki derbi tahminimdir"
              className="w-full rounded-theme border border-border bg-input px-4 py-3 font-heading text-[15px] font-bold leading-5 text-foreground shadow-sm outline-none"
            />
            <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
              Bu başlık mühürlü içerikten önce görünür.
            </p>
          </div>
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-bold text-foreground">Görsel veya video</label>
            <span className="text-[11px] font-medium text-muted-foreground">İsteğe bağlı</span>
          </div>
          <input
            ref={mediaInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={handlePickMedia}
          />
          {mediaPreview ? (
            <div className="relative overflow-hidden rounded-theme border border-border bg-muted">
              {mediaFile?.type.startsWith('video/') ? (
                <video src={mediaPreview} controls className="h-40 w-full object-cover" />
              ) : (
                <img src={mediaPreview} alt="Seçilen görsel" className="h-40 w-full object-cover" />
              )}
              <button
                type="button"
                aria-label="Medyayı kaldır"
                onClick={handleRemoveMedia}
                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white"
              >
                <iconify-icon icon="lucide:x" class="text-sm"></iconify-icon>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => mediaInputRef.current?.click()}
              className="flex h-24 w-full items-center justify-center gap-1.5 rounded-theme border border-dashed border-border bg-muted text-xs font-bold text-muted-foreground"
            >
              <iconify-icon icon="lucide:image-plus" class="text-base"></iconify-icon>
              Görsel (8 MB) veya video (25 MB) ekle
            </button>
          )}
        </section>

        <section className="rounded-theme border-2 border-primary bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-theme bg-primary text-primary-foreground">
                <iconify-icon icon="lucide:lock-keyhole" class="text-base"></iconify-icon>
              </span>
              <div>
                <h2 className="font-heading text-[16px] font-extrabold tracking-tight">Mühürlenecek tahmin</h2>
                <p className="mt-0.5 text-[11px] text-muted-foreground">Sadece açılış anında görünür</p>
              </div>
            </div>
            <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold text-secondary-foreground">
              GİZLİ
            </span>
          </div>
          <textarea
            value={sealedContent}
            onChange={(e) => setSealedContent(e.target.value)}
            placeholder="Fenerbahçe, Galatasaray'ı 3-2 yenecek."
            rows={2}
            className="mt-4 w-full resize-none rounded-theme border border-border bg-muted px-4 py-3.5 font-heading text-[16px] font-bold leading-6 text-foreground outline-none"
          />
          <div className="mt-3 flex gap-2.5">
            <iconify-icon icon="lucide:shield-check" class="mt-0.5 shrink-0 text-[17px] text-primary"></iconify-icon>
            <p className="text-[11px] leading-5 text-muted-foreground">
              Mühürledikten sonra sen dahil hiç kimse açılış anına kadar göremez veya değiştiremez.
            </p>
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-heading text-[16px] font-extrabold tracking-tight">Kategori</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => {
              const isActive = cat === category
              return (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`rounded-full px-4 py-2.5 text-xs font-bold ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border bg-card text-card-foreground'
                  }`}
                >
                  {cat}
                </button>
              )
            })}
          </div>
        </section>

        <section>
          <button
            type="button"
            onClick={() => setIsSensitive((v) => !v)}
            className="flex w-full items-center gap-3 rounded-theme border border-border bg-card p-3.5 text-left"
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 ${
                isSensitive ? 'border-destructive bg-destructive text-destructive-foreground' : 'border-border'
              }`}
            >
              {isSensitive && <iconify-icon icon="lucide:check" class="text-xs"></iconify-icon>}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-foreground">Hassas içerik olarak işaretle</span>
              <span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">
                Görenlerin gösterim tercihine göre bir uyarı etiketiyle gösterilir.
              </span>
            </span>
          </button>
        </section>

        <section>
          <h2 className="font-heading text-[16px] font-extrabold tracking-tight">Açılış nasıl olsun?</h2>
          <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
            Bir an seç, o an gelince herkese açılsın — ya da tarih verme, tamamen sana bağlı kalsın.
          </p>
          <div className="mt-3 flex rounded-theme bg-secondary p-1">
            <button
              type="button"
              onClick={() => setUnlockMode('scheduled')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-[10px] px-3 py-3 text-sm font-bold ${
                unlockMode === 'scheduled' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-secondary-foreground'
              }`}
            >
              <iconify-icon icon="lucide:calendar-clock" class="text-base"></iconify-icon>
              Bir an seç
            </button>
            <button
              type="button"
              onClick={() => setUnlockMode('manual')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-[10px] px-3 py-3 text-sm font-bold ${
                unlockMode === 'manual' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-secondary-foreground'
              }`}
            >
              <iconify-icon icon="lucide:hand" class="text-base"></iconify-icon>
              Ben açarım
            </button>
          </div>

          {unlockMode === 'scheduled' ? (
            <>
              <DateTimePicker
                value={eventDate}
                onChange={setEventDate}
                timeFormat={settings.region.timeFormat}
              />
              {eventDate && !eventDateIsFuture && (
                <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-destructive">
                  <iconify-icon icon="lucide:circle-alert" class="text-sm"></iconify-icon>
                  Seçilen an artık geçmişte kaldı, lütfen ileri bir tarih/saat seç.
                </p>
              )}
            </>
          ) : (
            <div className="mt-3 flex gap-3 rounded-theme border border-dashed border-border bg-muted/60 p-4">
              <iconify-icon icon="lucide:lock-keyhole" class="mt-0.5 shrink-0 text-lg text-primary"></iconify-icon>
              <p className="text-xs leading-5 text-muted-foreground">
                Bu kayıt kendiliğinden hiç açılmaz. Kayıt sayfasına gidip{' '}
                <span className="font-semibold text-foreground">istediğin an</span> açabilirsin — 5 dakika sonra da
                olur, bir yıl sonra da. Ama dikkat:{' '}
                <span className="font-semibold text-foreground">bir kere açtığında geri mühürleyemezsin.</span>
              </p>
            </div>
          )}
        </section>

        <section className="flex gap-3 rounded-theme bg-muted p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-theme bg-card text-accent shadow-sm">
            <iconify-icon icon="lucide:handshake" class="text-[18px]"></iconify-icon>
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Nasıl doğrulanır?</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Açılış anında sonucu ilk sen işaretlersin, ama son karar sende kalmaz — diğer kullanıcılar da
              "doğru/yanlış" oyu verebilir, topluluk senden farklı düşünürse sonuç değişebilir.
            </p>
          </div>
        </section>

        <div className="h-8" />
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-background/95 px-5 pb-5 pt-3 backdrop-blur-md">
        <div className="mx-auto max-w-[393px]">
          {error && (
            <p className="mb-2 rounded-theme bg-destructive/10 px-3 py-2.5 text-xs font-semibold text-destructive">
              {error}
            </p>
          )}
          <button
            onClick={handleSeal}
            disabled={!canSubmit || submitting}
            className="flex w-full items-center justify-center gap-2 rounded-theme bg-primary px-4 py-4 text-sm font-extrabold text-primary-foreground shadow-sm disabled:opacity-50"
          >
            <iconify-icon icon="lucide:lock-keyhole" class="text-[18px]"></iconify-icon>
            {submitting ? 'Mühürleniyor…' : 'Tahmini mühürle'}
          </button>
          <p className="mt-2 text-center text-[10px] text-muted-foreground">
            Mühürleme işleminden sonra kayıt değiştirilemez.
          </p>
        </div>
      </div>
    </div>
  )
}
