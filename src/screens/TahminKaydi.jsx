import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { IMG } from '../lib/images.js'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useToast } from '../contexts/ToastContext.jsx'
import { formatDateLong } from '../lib/format.js'

const CORRECT_POINTS_REWARD = 50
// Marking a sealed prediction is self-reported (honor system — there's no
// independent check yet), so a $0 reward for "incorrect" made honesty
// strictly worse than always claiming "correct": there was nothing to lose
// by lying and nothing to gain by admitting a miss. This doesn't stop
// dishonesty (only a dispute/verification system can), but it stops
// punishing the honest close.
const HONEST_CLOSE_REWARD = 5

const DEFAULT_AVATAR = IMG('a4692a40-aad2-478a-927f-ac284145b46f')

function useCountdown(targetDate) {
  const [remaining, setRemaining] = useState(() => Math.max(0, new Date(targetDate).getTime() - Date.now()))

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining(Math.max(0, new Date(targetDate).getTime() - Date.now()))
    }, 30000)
    return () => clearInterval(id)
  }, [targetDate])

  const days = Math.floor(remaining / (1000 * 60 * 60 * 24))
  const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))
  return { days, hours, minutes, isPast: remaining <= 0 }
}

export default function TahminKaydi() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, profile, refreshProfile } = useAuth()
  const { showToast } = useToast()
  const [record, setRecord] = useState(location.state?.prediction || null)
  const [copied, setCopied] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [saved, setSaved] = useState(false)
  const [comments, setComments] = useState([])
  const [commentDraft, setCommentDraft] = useState('')
  const [postingComment, setPostingComment] = useState(false)

  useEffect(() => {
    if (!record) {
      navigate('/', { replace: true })
    }
  }, [record, navigate])

  useEffect(() => {
    if (!record) return
    let cancelled = false

    async function loadSocial() {
      const [{ data: likes }, { data: comments }, saveRes] = await Promise.all([
        supabase.from('prediction_likes').select('user_id').eq('prediction_id', record.id),
        supabase
          .from('prediction_comments')
          .select('*, profiles:author_id(display_name, username, avatar_url)')
          .eq('prediction_id', record.id)
          .order('created_at', { ascending: true }),
        user
          ? supabase
              .from('prediction_saves')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', user.id)
              .eq('prediction_id', record.id)
          : Promise.resolve({ count: 0 }),
      ])
      if (cancelled) return
      setLikeCount((likes || []).length)
      setLiked(user ? (likes || []).some((l) => l.user_id === user.id) : false)
      setComments(comments || [])
      setSaved((saveRes.count || 0) > 0)
    }

    loadSocial()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record?.id, user])

  const countdown = useCountdown(record?.event_date || '1970-01-01T00:00:00Z')

  if (!record) return null

  const author = record.profiles
  const isVerified = record.status === 'verified_correct' || record.status === 'verified_incorrect'
  const isCorrect = record.status === 'verified_correct'
  const isOwner = user?.id === record.author_id
  const canVerify = isOwner && record.status === 'sealed' && countdown.isPast

  async function handleShare() {
    try {
      await navigator.clipboard.writeText(record.title)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard unavailable — silently ignore, share is a nice-to-have
    }
  }

  async function handleVerify(result) {
    if (verifying) return
    setVerifying(true)
    const newStatus = result === 'correct' ? 'verified_correct' : 'verified_incorrect'
    const verifiedAt = new Date().toISOString()

    const { error } = await supabase
      .from('predictions')
      .update({ status: newStatus, verified_at: verifiedAt })
      .eq('id', record.id)

    if (!error) {
      if (profile) {
        const reward = result === 'correct' ? CORRECT_POINTS_REWARD : HONEST_CLOSE_REWARD
        const { error: pointsError } = await supabase
          .from('profiles')
          .update({ points: profile.points + reward })
          .eq('id', user.id)
        if (pointsError) {
          showToast('Sonuç kaydedildi ama puan eklenemedi.')
        } else {
          await refreshProfile()
        }
      }
      setRecord((prev) => ({ ...prev, status: newStatus, verified_at: verifiedAt }))
    } else {
      showToast('Sonuç işaretlenemedi, tekrar dene.')
    }
    setVerifying(false)
  }

  async function handleToggleLike() {
    if (!user) return
    const nextLiked = !liked
    setLiked(nextLiked)
    setLikeCount((c) => c + (nextLiked ? 1 : -1))
    const { error } = nextLiked
      ? await supabase.from('prediction_likes').insert({ user_id: user.id, prediction_id: record.id })
      : await supabase.from('prediction_likes').delete().eq('user_id', user.id).eq('prediction_id', record.id)
    if (error) {
      setLiked(!nextLiked)
      setLikeCount((c) => c + (nextLiked ? -1 : 1))
      showToast('Beğeni kaydedilemedi, tekrar dene.')
    }
  }

  async function handleToggleSave() {
    if (!user) return
    const nextSaved = !saved
    setSaved(nextSaved)
    const { error } = nextSaved
      ? await supabase.from('prediction_saves').insert({ user_id: user.id, prediction_id: record.id })
      : await supabase.from('prediction_saves').delete().eq('user_id', user.id).eq('prediction_id', record.id)
    if (error) {
      setSaved(!nextSaved)
      showToast('Kaydetme işlemi başarısız oldu, tekrar dene.')
    }
  }

  async function handlePostComment() {
    const content = commentDraft.trim()
    if (!content || postingComment || !user) return
    setPostingComment(true)
    const { data, error } = await supabase
      .from('prediction_comments')
      .insert({ prediction_id: record.id, author_id: user.id, content })
      .select('*, profiles:author_id(display_name, username, avatar_url)')
      .single()
    if (!error && data) {
      setComments((prev) => [...prev, data])
      setCommentDraft('')
    } else {
      showToast('Yorum gönderilemedi, tekrar dene.')
    }
    setPostingComment(false)
  }

  return (
    <div className="min-h-screen w-full bg-background text-foreground font-body pb-28">
      <header className="flex items-center justify-between px-5 pt-12 pb-5">
        <button
          aria-label="Geri dön"
          onClick={() => navigate(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-theme border border-border bg-card text-foreground shadow-sm"
        >
          <iconify-icon icon="lucide:arrow-left" class="text-xl"></iconify-icon>
        </button>
        <p className="font-heading text-sm font-bold tracking-tight">Tahmin Kaydı</p>
        <button
          aria-label="Kaydı paylaş"
          onClick={handleShare}
          className="flex h-10 w-10 items-center justify-center rounded-theme border border-border bg-card text-foreground shadow-sm"
        >
          <iconify-icon icon={copied ? 'lucide:check' : 'lucide:share-2'} class="text-[18px]"></iconify-icon>
        </button>
      </header>

      <main>
        <section className="px-5">
          <div className="rounded-theme border border-border bg-card p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <button
                onClick={() => navigate(`/kullanici/${record.author_id}`)}
                className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-muted"
              >
                <img
                  src={author?.avatar_url || DEFAULT_AVATAR}
                  alt={author?.display_name || 'Kullanıcı'}
                  className="h-full w-full object-cover"
                />
              </button>
              <button onClick={() => navigate(`/kullanici/${record.author_id}`)} className="min-w-0 flex-1 text-left">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold">{author?.display_name || 'Kullanıcı'}</p>
                  <iconify-icon icon="lucide:badge-check" class="text-base text-primary"></iconify-icon>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Mühürlü kayıt · {formatDateLong(record.created_at)}
                </p>
              </button>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold text-secondary-foreground">
                  {record.category?.toUpperCase()}
                </span>
                {record.is_private && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-accent">
                    <iconify-icon icon="lucide:archive" class="text-xs"></iconify-icon>
                    Zaman kapsülü
                  </span>
                )}
              </div>
            </div>

            <div className="mt-5">
              <h1 className="font-heading text-[25px] font-extrabold leading-8 tracking-[-0.045em]">
                {record.title}
              </h1>
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <iconify-icon icon="lucide:shield-check" class="text-base text-success"></iconify-icon>
                <span>İçerik kaydedildi ve değiştirilemez.</span>
              </div>
              <div className="flex items-center gap-4 text-muted-foreground">
                <button
                  aria-label="Beğen"
                  onClick={handleToggleLike}
                  className={`flex items-center gap-1.5 text-xs font-semibold ${liked ? 'text-destructive' : ''}`}
                >
                  <iconify-icon icon="lucide:heart" class="text-[18px]"></iconify-icon>
                  {likeCount}
                </button>
                <button
                  aria-label="Kaydet"
                  onClick={handleToggleSave}
                  className={saved ? 'text-primary' : 'text-muted-foreground'}
                >
                  <iconify-icon icon={saved ? 'lucide:bookmark-check' : 'lucide:bookmark'} class="text-[18px]"></iconify-icon>
                </button>
              </div>
            </div>
          </div>
        </section>

        {isVerified ? (
          <section className="mx-5 mt-5 overflow-hidden rounded-theme border border-border bg-card shadow-sm">
            <div
              className={`flex items-center justify-between px-5 py-3 text-sm font-bold ${
                isCorrect ? 'bg-success text-success-foreground' : 'bg-destructive text-destructive-foreground'
              }`}
            >
              <span className="flex items-center gap-2">
                <iconify-icon icon={isCorrect ? 'lucide:badge-check' : 'lucide:x-circle'} class="text-lg"></iconify-icon>
                {isCorrect ? 'Doğrulandı' : 'Gerçekleşmedi'}
              </span>
              <span className="text-xs font-semibold">{formatDateLong(record.verified_at)}</span>
            </div>
            <div className="p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Mühürlü tahmin
              </p>
              <p className="mt-2 font-heading text-lg font-bold leading-6">
                &ldquo;{record.sealed_content}&rdquo;
              </p>
            </div>
          </section>
        ) : (
          <section className="mx-5 mt-5 overflow-hidden rounded-theme bg-primary text-primary-foreground shadow-sm">
            <div className="relative px-5 pb-5 pt-6">
              <div className="absolute right-[-18px] top-[-18px] h-28 w-28 rounded-full border border-white/10" />
              <div className="absolute right-6 top-7 h-16 w-16 rounded-full border border-white/10" />
              <div className="relative flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-theme bg-white/15">
                    <iconify-icon icon="lucide:lock-keyhole" class="text-lg"></iconify-icon>
                  </span>
                  <div>
                    <p className="font-heading text-xl font-extrabold tracking-tight">Mühürlü</p>
                    <p className="text-[11px] text-white/65">Kayıt güvenle saklanıyor</p>
                  </div>
                </div>
                <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold">
                  {countdown.isPast ? 'AÇILDI · SONUÇ BEKLENİYOR' : 'AÇILMADI'}
                </span>
              </div>

              <div className="relative mt-6 rounded-theme border border-white/15 bg-white/10 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/60">Açılış zamanı</p>
                    <p className="mt-1 font-heading text-base font-bold">{formatDateLong(record.event_date)}</p>
                  </div>
                  <iconify-icon icon="lucide:calendar-clock" class="text-2xl text-white/75"></iconify-icon>
                </div>
                <div className="mt-4 h-px bg-white/15" />
                <div className="mt-4 flex items-center gap-2 text-xs text-white/75">
                  <iconify-icon icon={countdown.isPast ? 'lucide:eye' : 'lucide:eye-off'} class="text-base"></iconify-icon>
                  <span>
                    {countdown.isPast
                      ? isOwner
                        ? 'Süre doldu. Sonucu aşağıdan işaretleyebilirsin.'
                        : 'Süre doldu, yazar sonucu henüz işaretlemedi.'
                      : 'Tahmin metni açılışa kadar görüntülenemez.'}
                  </span>
                </div>
              </div>

              {canVerify && (
                <div className="relative mt-4 rounded-theme border border-white/15 bg-white/10 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/60">
                    Bu tahmin gerçekleşti mi?
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleVerify('correct')}
                      disabled={verifying}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-theme bg-success py-2.5 text-xs font-bold text-success-foreground disabled:opacity-60"
                    >
                      <iconify-icon icon="lucide:check-circle-2" class="text-sm"></iconify-icon>
                      Doğru çıktı
                    </button>
                    <button
                      onClick={() => handleVerify('incorrect')}
                      disabled={verifying}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-theme bg-destructive py-2.5 text-xs font-bold text-destructive-foreground disabled:opacity-60"
                    >
                      <iconify-icon icon="lucide:x-circle" class="text-sm"></iconify-icon>
                      Yanlış çıktı
                    </button>
                  </div>
                  <p className="mt-2 text-[10px] text-white/60">
                    Doğru çıktıysa +{CORRECT_POINTS_REWARD}, yanlış çıktıysa dürüstçe kapattığın için +
                    {HONEST_CLOSE_REWARD} puan kazanırsın.
                  </p>
                </div>
              )}

              <div className="relative mt-5 grid grid-cols-3 gap-2">
                <div className="rounded-theme bg-white/10 px-2 py-3 text-center">
                  <p className="font-heading text-lg font-extrabold">{countdown.isPast ? 0 : countdown.days}</p>
                  <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/65">Gün</p>
                </div>
                <div className="rounded-theme bg-white/10 px-2 py-3 text-center">
                  <p className="font-heading text-lg font-extrabold">{countdown.isPast ? 0 : countdown.hours}</p>
                  <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/65">Saat</p>
                </div>
                <div className="rounded-theme bg-white/10 px-2 py-3 text-center">
                  <p className="font-heading text-lg font-extrabold">{countdown.isPast ? 0 : countdown.minutes}</p>
                  <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/65">Dakika</p>
                </div>
              </div>
            </div>

            <div className="border-t border-white/15 bg-black/10 px-5 py-3">
              <div className="flex items-center gap-2">
                <iconify-icon icon="lucide:circle-check" class="text-base text-white/75"></iconify-icon>
                <p className="text-xs text-white/75">Mühür sonrası içerik kopyalanamaz, düzenlenemez veya silinemez.</p>
              </div>
            </div>
          </section>
        )}

        <section className="mx-5 mt-7">
          <h2 className="font-heading text-base font-bold tracking-tight">Açıldığında</h2>
          <div className="mt-3 rounded-theme border border-dashed border-border bg-muted/60 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-theme bg-card text-primary shadow-sm">
                <iconify-icon icon="lucide:scan-search" class="text-lg"></iconify-icon>
              </div>
              <div>
                <p className="text-sm font-bold">
                  {isVerified ? 'Sonuçla birlikte değerlendirildi' : 'Sonuçla birlikte değerlendirilecek'}
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Orijinal tahmin, resmi sonuç ve doğruluk değerlendirmesi aynı kayıtta görünür.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-5 mt-7">
          <h2 className="font-heading text-base font-bold tracking-tight">Yorumlar ({comments.length})</h2>

          {comments.length === 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">Henüz yorum yok. İlk yorumu sen yaz.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-2.5">
                  <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-muted">
                    <img
                      src={c.profiles?.avatar_url || DEFAULT_AVATAR}
                      alt={c.profiles?.display_name || 'Kullanıcı'}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1 rounded-theme border border-border bg-card px-3 py-2.5 shadow-sm">
                    <p className="text-xs font-bold">{c.profiles?.display_name || 'Kullanıcı'}</p>
                    <p className="mt-1 text-[13px] leading-5 text-foreground">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {user && (
            <div className="mt-4 flex items-center gap-2">
              <input
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handlePostComment()
                }}
                placeholder="Yorum yaz…"
                className="h-11 flex-1 rounded-theme border border-border bg-input px-4 text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              <button
                onClick={handlePostComment}
                disabled={!commentDraft.trim() || postingComment}
                aria-label="Yorumu gönder"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-theme bg-primary text-primary-foreground disabled:opacity-50"
              >
                <iconify-icon icon="lucide:send" class="text-lg"></iconify-icon>
              </button>
            </div>
          )}
        </section>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-background/95 px-5 pb-5 pt-3 backdrop-blur-md">
        <div className="mx-auto max-w-[393px]">
          <button
            onClick={handleShare}
            className="flex w-full items-center justify-center gap-2 rounded-theme bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-sm"
          >
            <iconify-icon icon={copied ? 'lucide:check' : 'lucide:share-2'} class="text-base"></iconify-icon>
            {copied ? 'Kopyalandı' : 'Başlığı kopyala'}
          </button>
        </div>
      </div>
    </div>
  )
}
