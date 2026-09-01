import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { fallbackAvatarFor } from '../lib/images.js'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useToast } from '../contexts/ToastContext.jsx'
import { formatDateLong } from '../lib/format.js'
import { difficultyMeta } from '../lib/difficulty.js'

const CORRECT_POINTS_REWARD = 50
// Marking a sealed prediction is self-reported (honor system — there's no
// independent check yet), so a $0 reward for "incorrect" made honesty
// strictly worse than always claiming "correct": there was nothing to lose
// by lying and nothing to gain by admitting a miss. This doesn't stop
// dishonesty (only a dispute/verification system can), but it stops
// punishing the honest close.
const HONEST_CLOSE_REWARD = 5


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
  const [correctVotes, setCorrectVotes] = useState(0)
  const [incorrectVotes, setIncorrectVotes] = useState(0)
  const [myVote, setMyVote] = useState(null)
  const [voting, setVoting] = useState(false)
  // Which result the owner tapped, while they're still filling in the
  // optional evidence citation — null means the correct/incorrect buttons
  // are showing, not the citation form.
  const [pendingResult, setPendingResult] = useState(null)
  const [evidenceNote, setEvidenceNote] = useState('')
  const [evidenceUrl, setEvidenceUrl] = useState('')

  // Arriving from a push notification deep link (or any bare URL) means
  // there's no navigation state to read the prediction from — only the
  // ?id= query param. Fetch it once before giving up and redirecting home.
  useEffect(() => {
    if (record) return
    const id = new URLSearchParams(location.search).get('id')
    if (!id) {
      navigate('/', { replace: true })
      return
    }
    let cancelled = false
    supabase
      .from('predictions')
      .select('*, profiles:author_id(display_name, username, avatar_url)')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return
        if (data) setRecord(data)
        else navigate('/', { replace: true })
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record])

  useEffect(() => {
    if (!record) return
    let cancelled = false

    async function loadSocial() {
      const [{ data: likes }, { data: comments }, saveRes, votesRes] = await Promise.all([
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
        // prediction_votes may not exist yet (see supabase/schema.sql — it's
        // the newest migration section); PostgREST's "table not found"
        // (PGRST205) just means voting quietly shows as 0/hidden until the
        // migration is run.
        supabase.from('prediction_votes').select('voter_id, vote').eq('prediction_id', record.id),
      ])
      if (cancelled) return
      setLikeCount((likes || []).length)
      setLiked(user ? (likes || []).some((l) => l.user_id === user.id) : false)
      setComments(comments || [])
      setSaved((saveRes.count || 0) > 0)
      const voteRows = votesRes.error ? [] : votesRes.data || []
      setCorrectVotes(voteRows.filter((v) => v.vote === 'correct').length)
      setIncorrectVotes(voteRows.filter((v) => v.vote === 'incorrect').length)
      setMyVote(user ? voteRows.find((v) => v.voter_id === user.id)?.vote || null : null)
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
  // Anyone but the author, once the seal has opened — whether the author
  // already resolved it (a vote against that is a dispute) or never
  // showed up (a vote here is what resolves it in the first place).
  const canVote = !isOwner && user && countdown.isPast && record.status !== 'open'
  const tierMeta = difficultyMeta(record.difficulty_tier)

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
    const trimmedNote = evidenceNote.trim()
    const trimmedUrl = evidenceUrl.trim()

    // Real fix (see supabase/schema.sql's SECURITY REVIEW section): status
    // + evidence + the points award now happen atomically inside a single
    // server-side function that checks ownership/state itself, instead of
    // the client updating profiles.points directly — a raw client update
    // to points is now rejected by a trigger, so this RPC is the only way
    // to actually award them. Falls back to the old direct-update path
    // (no server-side validation, but still functional) only when that
    // migration hasn't been run yet — PGRST202 is PostgREST's "function
    // not found in schema cache".
    const { error: rpcError } = await supabase.rpc('verify_prediction', {
      p_prediction_id: record.id,
      p_result: result,
      p_evidence_note: trimmedNote || null,
      p_evidence_url: trimmedUrl || null,
    })

    if (!rpcError) {
      setRecord((prev) => ({
        ...prev,
        status: newStatus,
        verified_at: verifiedAt,
        evidence_note: trimmedNote || null,
        evidence_url: trimmedUrl || null,
      }))
      await refreshProfile()
      setPendingResult(null)
      setVerifying(false)
      return
    }

    if (rpcError.code !== 'PGRST202') {
      showToast('Sonuç işaretlenemedi, tekrar dene.')
      setVerifying(false)
      return
    }

    // Fallback: verify_prediction() doesn't exist yet.
    const basePayload = { status: newStatus, verified_at: verifiedAt }
    const fullPayload =
      trimmedNote || trimmedUrl
        ? { ...basePayload, evidence_note: trimmedNote || null, evidence_url: trimmedUrl || null }
        : basePayload

    let evidenceSaved = fullPayload !== basePayload
    let { error } = await supabase.from('predictions').update(fullPayload).eq('id', record.id)
    if (error?.code === 'PGRST204' && fullPayload !== basePayload) {
      showToast('Kaynak henüz kaydedilemiyor, sonuç kaynaksız işaretlendi.')
      evidenceSaved = false
      ;({ error } = await supabase.from('predictions').update(basePayload).eq('id', record.id))
    }

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
      setRecord((prev) => ({
        ...prev,
        status: newStatus,
        verified_at: verifiedAt,
        ...(evidenceSaved ? { evidence_note: trimmedNote || null, evidence_url: trimmedUrl || null } : {}),
      }))
      setPendingResult(null)
    } else {
      showToast('Sonuç işaretlenemedi, tekrar dene.')
    }
    setVerifying(false)
  }

  // Weighted community vote — resolves a sealed prediction the author
  // never showed up for, or overturns one they got wrong (see
  // cast_prediction_vote() in supabase/schema.sql). Replaces the old
  // flat "itiraz et" button: a vote against the current result IS a
  // dispute, the RPC records both in one action.
  async function handleVote(vote) {
    if (!user || voting) return
    setVoting(true)
    const prevVote = myVote
    setMyVote(vote)
    setCorrectVotes((c) => c + (vote === 'correct' ? 1 : 0) - (prevVote === 'correct' ? 1 : 0))
    setIncorrectVotes((c) => c + (vote === 'incorrect' ? 1 : 0) - (prevVote === 'incorrect' ? 1 : 0))

    const { error } = await supabase.rpc('cast_prediction_vote', {
      p_prediction_id: record.id,
      p_vote: vote,
    })

    if (error) {
      setMyVote(prevVote)
      setCorrectVotes((c) => c - (vote === 'correct' ? 1 : 0) + (prevVote === 'correct' ? 1 : 0))
      setIncorrectVotes((c) => c - (vote === 'incorrect' ? 1 : 0) + (prevVote === 'incorrect' ? 1 : 0))
      showToast(
        error.code === 'PGRST202' || error.code === 'PGRST205' || error.code === '42883'
          ? 'Topluluk oylaması özelliği henüz etkin değil.'
          : error.message || 'Oy kaydedilemedi, tekrar dene.'
      )
      setVoting(false)
      return
    }

    // The vote may have just resolved or flipped the prediction server-side
    // (quorum reached, or the community outweighed the author) — re-fetch
    // to reflect that instead of the client guessing at the new state.
    const { data: fresh } = await supabase
      .from('predictions')
      .select('status, verified_at, disputed, resolved_by')
      .eq('id', record.id)
      .single()
    if (fresh) setRecord((prev) => ({ ...prev, ...fresh }))
    setVoting(false)
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

  // Best-effort — never blocks the comment that already posted. Only
  // comments support @mentions today (see Etiketleme ve Bahsetmeler); a
  // mentioned user's own permission (herkes/takip ettiklerim/hiç kimse)
  // decides whether the mention actually gets recorded.
  async function createMentions(content, commentId) {
    const usernames = [...new Set([...content.matchAll(/@([a-z0-9_]{2,32})/gi)].map((m) => m[1].toLowerCase()))]
    if (usernames.length === 0 || !user) return
    const { data: candidates } = await supabase
      .from('profiles')
      .select('id, username, mention_permission')
      .in('username', usernames)
    for (const candidate of candidates || []) {
      if (candidate.id === user.id) continue
      const permission = candidate.mention_permission || 'everyone'
      if (permission === 'none') continue
      if (permission === 'following') {
        const { count } = await supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('follower_id', candidate.id)
          .eq('following_id', user.id)
          .eq('status', 'accepted')
        if (!count) continue
      }
      await supabase
        .from('mentions')
        .insert({ mentioned_user_id: candidate.id, author_id: user.id, comment_id: commentId })
        .then(() => {}, () => {})
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
      createMentions(content, data.id)
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
                  src={author?.avatar_url || fallbackAvatarFor(record.author_id)}
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
                {tierMeta && (
                  <span
                    className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold"
                    style={{ background: tierMeta.tint, color: tierMeta.ink }}
                  >
                    <iconify-icon icon={tierMeta.icon} class="text-xs"></iconify-icon>
                    {tierMeta.label}
                  </span>
                )}
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

            {record.media_url && (
              <div className="mt-4 overflow-hidden rounded-theme border border-border bg-muted">
                {record.media_type === 'video' ? (
                  <video src={record.media_url} controls className="max-h-80 w-full object-cover" />
                ) : (
                  <img src={record.media_url} alt="" className="max-h-80 w-full object-cover" />
                )}
              </div>
            )}

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
                {record.disputed && (
                  <span className="rounded-full bg-black/15 px-2 py-0.5 text-[9px] font-bold">TARTIŞMALI</span>
                )}
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
              {(record.evidence_note || record.evidence_url) && (
                <div className="mt-3 rounded-theme border border-dashed border-border bg-muted/60 p-3">
                  <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                    <iconify-icon icon="lucide:link" class="text-xs"></iconify-icon>
                    Yazarın eklediği kaynak
                  </p>
                  {record.evidence_note && (
                    <p className="mt-1.5 text-xs leading-5 text-foreground">{record.evidence_note}</p>
                  )}
                  {record.evidence_url && (
                    <a
                      href={record.evidence_url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1.5 block truncate text-xs font-semibold text-primary underline"
                    >
                      {record.evidence_url}
                    </a>
                  )}
                </div>
              )}
            </div>
            {canVote && (
              <div className="border-t border-border px-5 py-4">
                <p className="text-xs font-semibold text-foreground">Bu sonuca katılıyor musun?</p>
                <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
                  Topluluk yeterince katılmazsa sonuç değişebilir — yazarın kaydı tek başına son söz değil.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() => handleVote('correct')}
                    disabled={voting}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-theme py-2.5 text-xs font-bold disabled:opacity-60 ${
                      myVote === 'correct' ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <iconify-icon icon="lucide:thumbs-up" class="text-sm"></iconify-icon>
                    Katılıyorum · {correctVotes}
                  </button>
                  <button
                    onClick={() => handleVote('incorrect')}
                    disabled={voting}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-theme py-2.5 text-xs font-bold disabled:opacity-60 ${
                      myVote === 'incorrect' ? 'bg-destructive text-destructive-foreground' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <iconify-icon icon="lucide:thumbs-down" class="text-sm"></iconify-icon>
                    Katılmıyorum · {incorrectVotes}
                  </button>
                </div>
              </div>
            )}
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
                        : 'Süre doldu, yazar sonucu henüz işaretlemedi — aşağıdan sen oy verebilirsin.'
                      : 'Tahmin metni açılışa kadar görüntülenemez.'}
                  </span>
                </div>
              </div>

              {canVerify && pendingResult === null && (
                <div className="relative mt-4 rounded-theme border border-white/15 bg-white/10 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/60">
                    Bu tahmin gerçekleşti mi?
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => setPendingResult('correct')}
                      disabled={verifying}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-theme bg-success py-2.5 text-xs font-bold text-success-foreground disabled:opacity-60"
                    >
                      <iconify-icon icon="lucide:check-circle-2" class="text-sm"></iconify-icon>
                      Doğru çıktı
                    </button>
                    <button
                      onClick={() => setPendingResult('incorrect')}
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

              {canVerify && pendingResult !== null && (
                <div className="relative mt-4 rounded-theme border border-white/15 bg-white/10 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/60">
                    Kaynak ekle (isteğe bağlı)
                  </p>
                  <p className="mt-1.5 text-[11px] leading-4 text-white/70">
                    Sonuç hâlâ beyana dayalı, ama bir kaynak eklersen itiraz edenler ve diğer kullanıcılar
                    kontrol edebilir.
                  </p>
                  <textarea
                    value={evidenceNote}
                    onChange={(e) => setEvidenceNote(e.target.value)}
                    rows={2}
                    placeholder="Kısa not (opsiyonel)"
                    className="mt-3 w-full resize-none rounded-theme border border-white/20 bg-white/10 px-3 py-2.5 text-xs leading-5 text-white outline-none placeholder:text-white/50"
                  />
                  <input
                    value={evidenceUrl}
                    onChange={(e) => setEvidenceUrl(e.target.value)}
                    placeholder="Kaynak bağlantısı (opsiyonel)"
                    className="mt-2 w-full rounded-theme border border-white/20 bg-white/10 px-3 py-2.5 text-xs text-white outline-none placeholder:text-white/50"
                  />
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => {
                        setPendingResult(null)
                        setEvidenceNote('')
                        setEvidenceUrl('')
                      }}
                      disabled={verifying}
                      className="flex-1 rounded-theme bg-white/10 py-2.5 text-xs font-bold text-white disabled:opacity-60"
                    >
                      Vazgeç
                    </button>
                    <button
                      onClick={() => handleVerify(pendingResult)}
                      disabled={verifying}
                      className={`flex-1 rounded-theme py-2.5 text-xs font-bold disabled:opacity-60 ${
                        pendingResult === 'correct'
                          ? 'bg-success text-success-foreground'
                          : 'bg-destructive text-destructive-foreground'
                      }`}
                    >
                      {verifying ? 'Kaydediliyor…' : 'Sonucu onayla'}
                    </button>
                  </div>
                </div>
              )}

              {canVote && (
                <div className="relative mt-4 rounded-theme border border-white/15 bg-white/10 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/60">
                    Yazar henüz işaretlemedi — sen ne düşünüyorsun?
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleVote('correct')}
                      disabled={voting}
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-theme py-2.5 text-xs font-bold disabled:opacity-60 ${
                        myVote === 'correct' ? 'bg-success text-success-foreground' : 'bg-white/10 text-white'
                      }`}
                    >
                      <iconify-icon icon="lucide:check-circle-2" class="text-sm"></iconify-icon>
                      Doğru · {correctVotes}
                    </button>
                    <button
                      onClick={() => handleVote('incorrect')}
                      disabled={voting}
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-theme py-2.5 text-xs font-bold disabled:opacity-60 ${
                        myVote === 'incorrect' ? 'bg-destructive text-destructive-foreground' : 'bg-white/10 text-white'
                      }`}
                    >
                      <iconify-icon icon="lucide:x-circle" class="text-sm"></iconify-icon>
                      Yanlış · {incorrectVotes}
                    </button>
                  </div>
                  <p className="mt-2 text-[10px] text-white/60">
                    Yeterince kişi katılırsa, yazar hiç işaretlemese bile sonuç topluluğun oyuna göre belirlenir.
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
                      src={c.profiles?.avatar_url || fallbackAvatarFor(c.author_id)}
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
