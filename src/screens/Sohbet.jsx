import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { fallbackAvatarFor } from '../lib/images.js'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useToast } from '../contexts/ToastContext.jsx'
import { useOnlineUsers } from '../contexts/PresenceContext.jsx'
import { formatTime } from '../lib/format.js'
import { dayLabel, groupInfo } from '../lib/chatGrouping.js'

// How long a single "typing" broadcast stays valid before the indicator
// auto-hides — covers both a partner who stopped typing without sending
// anything, and one whose device dropped the connection mid-type.
const TYPING_TIMEOUT_MS = 3000

export default function Sohbet() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { showToast } = useToast()
  const onlineIds = useOnlineUsers()
  const [partner, setPartner] = useState(location.state?.partner || null)
  const partnerOnline = partner ? onlineIds.has(partner.id) : false

  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [partnerTyping, setPartnerTyping] = useState(false)
  const bottomRef = useRef(null)
  const channelRef = useRef(null)
  const typingSentAtRef = useRef(0)
  const partnerTypingTimeoutRef = useRef(null)

  // Arriving from a push notification deep link means there's no navigation
  // state to read the chat partner from — only ?userId=. Fetch the profile
  // once before giving up and bouncing back to Mesajlar.
  useEffect(() => {
    if (partner) return
    const userId = new URLSearchParams(location.search).get('userId')
    if (!userId) {
      navigate('/mesajlar', { replace: true })
      return
    }
    let cancelled = false
    supabase
      .from('profiles')
      .select('id, display_name, username, avatar_url')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return
        if (data) setPartner(data)
        else navigate('/mesajlar', { replace: true })
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partner])

  useEffect(() => {
    if (!partner) return
    supabase.rpc('is_blocked', { other_user_id: partner.id }).then(({ data }) => setBlocked(!!data))
  }, [partner])

  useEffect(() => {
    if (!user || !partner) return
    let cancelled = false

    async function load() {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(
          `and(sender_id.eq.${user.id},recipient_id.eq.${partner.id}),and(sender_id.eq.${partner.id},recipient_id.eq.${user.id})`
        )
        .order('created_at', { ascending: true })
      if (!cancelled) {
        if (!error) setMessages(data || [])
        setLoading(false)
      }

      // Mark incoming messages as read.
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('sender_id', partner.id)
        .eq('recipient_id', user.id)
        .is('read_at', null)
    }
    load()

    // Canonical name (ids sorted) so both sides of the conversation join
    // the same realtime topic — required for broadcast (typing) to reach
    // the other person at all; postgres_changes doesn't care about the
    // name, but sharing it here too keeps the two concerns on one channel.
    const channelName = `chat-${[user.id, partner.id].sort().join('-')}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `recipient_id=eq.${user.id}` },
        (payload) => {
          if (payload.new.sender_id === partner.id) {
            setMessages((prev) => [...prev, payload.new])
            setPartnerTyping(false)
            clearTimeout(partnerTypingTimeoutRef.current)
          }
        }
      )
      .on(
        // Flips a sent message's checkmark to "read" the moment the partner
        // opens the chat — filtered to messages I sent (RLS already scopes
        // this to my own rows); cross-conversation noise from other DMs is
        // dropped by the recipient_id check below.
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `sender_id=eq.${user.id}` },
        (payload) => {
          if (payload.new.recipient_id !== partner.id) return
          setMessages((prev) => prev.map((m) => (m.id === payload.new.id ? payload.new : m)))
        }
      )
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload?.userId !== partner.id) return
        setPartnerTyping(true)
        clearTimeout(partnerTypingTimeoutRef.current)
        partnerTypingTimeoutRef.current = setTimeout(() => setPartnerTyping(false), TYPING_TIMEOUT_MS)
      })
      .subscribe()
    channelRef.current = channel

    return () => {
      cancelled = true
      clearTimeout(partnerTypingTimeoutRef.current)
      channelRef.current = null
      supabase.removeChannel(channel)
    }
  }, [user, partner])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, partnerTyping])

  function handleDraftChange(value) {
    setDraft(value)
    const now = Date.now()
    // Throttled, not per-keystroke — a "typing" broadcast every 2s while
    // someone's actively typing is plenty to keep the indicator alive on
    // the other end without flooding the channel.
    if (value.trim() && now - typingSentAtRef.current > 2000) {
      typingSentAtRef.current = now
      channelRef.current?.send({ type: 'broadcast', event: 'typing', payload: { userId: user.id } })
    }
  }

  async function handleSend() {
    const content = draft.trim()
    if (!content || sending || !partner || blocked) return
    setSending(true)
    setDraft('')
    const optimistic = {
      id: `local-${Date.now()}`,
      sender_id: user.id,
      recipient_id: partner.id,
      content,
      created_at: new Date().toISOString(),
      read_at: null,
    }
    setMessages((prev) => [...prev, optimistic])

    const { error } = await supabase.from('messages').insert({
      sender_id: user.id,
      recipient_id: partner.id,
      content,
    })
    if (error) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
      setDraft(content)
      // 42501 = RLS insert policy rejected it — this user's "kimin mesaj
      // atabileceği" preference permanently blocks us (see MesajIstekleri),
      // not a network blip. "tekrar dene" would be a lie: retrying can't
      // ever succeed here, so say what's actually true instead.
      showToast(
        error.code === '42501'
          ? 'Bu kişi yalnızca takip ettiklerinden mesaj kabul ediyor.'
          : 'Mesaj gönderilemedi, tekrar dene.'
      )
    }
    setSending(false)
  }

  if (!partner) return null

  const lastMineIndex = messages.reduce((acc, m, i) => (m.sender_id === user.id ? i : acc), -1)

  return (
    <div className="min-h-screen w-full bg-background text-foreground font-body">
      <div className="relative flex min-h-screen flex-col overflow-hidden">
        <header className="sticky top-0 z-20 border-b border-border bg-background/95 px-5 pb-4 pt-12 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <button
              aria-label="Mesajlara dön"
              onClick={() => navigate(-1)}
              className="flex h-10 w-10 items-center justify-center rounded-theme bg-secondary text-secondary-foreground"
            >
              <iconify-icon icon="lucide:arrow-left" class="text-xl"></iconify-icon>
            </button>

            <button
              onClick={() => navigate(`/kullanici/${partner.id}`)}
              className="flex min-w-0 flex-1 items-center justify-center gap-3 px-3"
            >
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted">
                <img
                  src={partner.avatar_url || fallbackAvatarFor(partner.id)}
                  alt={partner.display_name}
                  className="h-full w-full object-cover"
                />
                {partnerOnline && (
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-success" />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate font-heading text-sm font-extrabold tracking-tight">{partner.display_name}</p>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                  {partnerTyping ? (
                    <span className="font-semibold text-primary">yazıyor…</span>
                  ) : partnerOnline ? (
                    'Çevrimiçi'
                  ) : (
                    `@${partner.username}`
                  )}
                </p>
              </div>
            </button>

            <div className="h-10 w-10" />
          </div>
        </header>

        <main className="flex-1 px-5 pb-36 pt-6">
          {loading ? (
            <p className="text-center text-xs text-muted-foreground">Yükleniyor…</p>
          ) : messages.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground">
              Henüz mesaj yok. İlk mesajı sen göndererek sohbeti başlat.
            </p>
          ) : (
            <section aria-label="Sohbet mesajları">
              {messages.map((m, i) => {
                const isMine = m.sender_id === user.id
                const { newDay, isFirstInGroup, isLastInGroup } = groupInfo(messages, i)
                const tailRadius = isLastInGroup ? (isMine ? 'rounded-br-sm' : 'rounded-bl-sm') : ''

                return (
                  <div key={m.id}>
                    {newDay && (
                      <div className="my-4 flex items-center justify-center">
                        <span className="rounded-full bg-muted px-3 py-1 text-[10px] font-bold text-muted-foreground">
                          {dayLabel(m.created_at)}
                        </span>
                      </div>
                    )}
                    <div
                      className={`flex ${isMine ? 'justify-end' : 'items-end gap-2.5'} ${isFirstInGroup ? 'mt-4' : 'mt-1'}`}
                    >
                      {!isMine && (
                        <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full">
                          {isLastInGroup && (
                            <img
                              src={partner.avatar_url || fallbackAvatarFor(partner.id)}
                              alt={partner.display_name}
                              className="h-full w-full rounded-full bg-muted object-cover"
                            />
                          )}
                        </div>
                      )}
                      <div className={isMine ? 'max-w-[286px]' : 'max-w-[268px]'}>
                        <div
                          className={
                            isMine
                              ? `rounded-theme ${tailRadius} bg-primary px-4 py-3 text-primary-foreground shadow-sm`
                              : `rounded-theme ${tailRadius} border border-border bg-card px-4 py-3 shadow-sm`
                          }
                        >
                          <p className="text-sm leading-5">{m.content}</p>
                        </div>
                        {isLastInGroup && (
                          <p
                            className={`mt-1.5 flex items-center gap-1 px-1 text-[10px] text-muted-foreground ${isMine ? 'justify-end' : ''}`}
                          >
                            {formatTime(m.created_at)}
                            {isMine && i === lastMineIndex && (
                              <iconify-icon
                                icon={m.read_at ? 'lucide:check-check' : 'lucide:check'}
                                class={`text-xs ${m.read_at ? 'text-primary' : ''}`}
                              ></iconify-icon>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}

              {partnerTyping && (
                <div className="mt-4 flex items-end gap-2.5">
                  <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full">
                    <img
                      src={partner.avatar_url || fallbackAvatarFor(partner.id)}
                      alt={partner.display_name}
                      className="h-full w-full rounded-full bg-muted object-cover"
                    />
                  </div>
                  <div className="flex items-center gap-1 rounded-theme rounded-bl-sm border border-border bg-card px-4 py-3.5 shadow-sm">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:300ms]" />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </section>
          )}
        </main>

        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-background/95 px-4 pb-5 pt-3 backdrop-blur-md">
          {blocked ? (
            <div className="mx-auto flex max-w-[393px] items-center gap-2 rounded-theme bg-muted px-4 py-3 text-xs font-semibold text-muted-foreground">
              <iconify-icon icon="lucide:ban" class="text-base"></iconify-icon>
              Bu kullanıcıyla mesajlaşamazsın.
            </div>
          ) : (
            <div className="mx-auto flex max-w-[393px] items-end gap-2">
              <div className="flex h-12 min-w-0 flex-1 items-center rounded-theme border border-border bg-input px-4 shadow-sm">
                <input
                  value={draft}
                  onChange={(e) => handleDraftChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSend()
                  }}
                  placeholder="Mesaj yaz..."
                  className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
              </div>
              <button
                aria-label="Mesaj gönder"
                onClick={handleSend}
                disabled={!draft.trim() || sending}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-theme bg-primary text-primary-foreground shadow-sm transition-transform duration-150 active:scale-90 disabled:opacity-50 disabled:active:scale-100"
              >
                <iconify-icon icon="lucide:send" class="text-xl"></iconify-icon>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
