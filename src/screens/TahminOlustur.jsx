import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { CATEGORIES } from '../lib/categories.js'

export default function TahminOlustur() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  // Present when launched from Grup Detayı's "Tahmin oluştur" — tags the
  // prediction to that group so it lands in the group's own feed instead of
  // the public one. Only applies to "Tahmin" mode: a Zaman kapsülü stays a
  // private personal record regardless of where it was created from.
  const groupId = location.state?.groupId || null
  const groupName = location.state?.groupName || ''
  const [mode, setMode] = useState('Tahmin')
  const [category, setCategory] = useState('Spor')
  const [title, setTitle] = useState('')
  const [sealedContent, setSealedContent] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const canSubmit = title.trim().length > 0 && sealedContent.trim().length > 0 && eventDate

  async function handleSeal() {
    if (!canSubmit || submitting) return
    setSubmitting(true)
    setError('')
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
        event_date: new Date(eventDate).toISOString(),
        sealed_at: new Date().toISOString(),
      }
      // Only add group_id to the payload when actually needed — PostgREST
      // rejects the whole insert (PGRST204) if a key isn't a real column,
      // and that column only exists once the group-predictions migration
      // (see supabase/schema.sql) has run. Omitting the key entirely covers
      // every ordinary (non-group) prediction regardless of migration
      // status; only a genuine group-scoped seal needs the fallback retry.
      let { error: insertError } = targetGroupId
        ? await supabase.from('predictions').insert({ ...basePayload, group_id: targetGroupId })
        : await supabase.from('predictions').insert(basePayload)

      if (insertError?.code === 'PGRST204' && targetGroupId) {
        // Group predictions aren't live yet on this database — fall back to
        // an ordinary personal seal rather than losing the user's work.
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
      <header className="flex items-center gap-3 px-5 pt-12 pb-5">
        <button
          aria-label="Geri dön"
          onClick={() => navigate(-1)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-theme border border-border bg-card text-foreground shadow-sm"
        >
          <iconify-icon icon="lucide:arrow-left" class="text-[20px]"></iconify-icon>
        </button>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            {groupId ? groupName || 'Grup kaydı' : 'Yeni kayıt'}
          </p>
          <h1 className="font-heading text-[21px] font-extrabold tracking-tight text-primary">Tahmin oluştur</h1>
        </div>
      </header>

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
          <h2 className="font-heading text-[16px] font-extrabold tracking-tight">Açılış tarihi</h2>
          <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
            Kayıt bu tarihe kadar mühürlü kalır, tarih geçince herkese açılır.
          </p>
          <input
            type="date"
            required
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            min={new Date().toISOString().slice(0, 10)}
            className="mt-3 w-full rounded-theme border border-border bg-input px-4 py-3 text-sm font-semibold text-foreground shadow-sm outline-none"
          />
        </section>

        <section className="flex gap-3 rounded-theme bg-muted p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-theme bg-card text-accent shadow-sm">
            <iconify-icon icon="lucide:handshake" class="text-[18px]"></iconify-icon>
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Nasıl doğrulanır?</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Sonucu, açılış anında yalnızca sen işaretlersin — şu an bağımsız bir doğrulama yok, bu beyana
              dayalı bir onur sistemidir.
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
