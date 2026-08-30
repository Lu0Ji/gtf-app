import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { IMG } from '../lib/images.js'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useToast } from '../contexts/ToastContext.jsx'
import { useOnlineUsers } from '../contexts/PresenceContext.jsx'

const DEFAULT_AVATAR = IMG('45ef8632-46e1-43ca-9a32-ce5f5800af73')

export default function Sohbet() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { showToast } = useToast()
  const onlineIds = useOnlineUsers()
  const partner = location.state?.partner
  const partnerOnline = partner ? onlineIds.has(partner.id) : false

  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    if (!partner) {
      navigate('/mesajlar', { replace: true })
    }
  }, [partner, navigate])

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

    const channel = supabase
      .channel(`chat-${user.id}-${partner.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `recipient_id=eq.${user.id}` },
        (payload) => {
          if (payload.new.sender_id === partner.id) {
            setMessages((prev) => [...prev, payload.new])
          }
        }
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [user, partner])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
      showToast('Mesaj gönderilemedi, tekrar dene.')
    }
    setSending(false)
  }

  if (!partner) return null

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
                  src={partner.avatar_url || DEFAULT_AVATAR}
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
                  {partnerOnline ? 'Çevrimiçi' : `@${partner.username}`}
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
              Henüz mesaj yok. İlk mesajı sen gönder.
            </p>
          ) : (
            <section className="space-y-5" aria-label="Sohbet mesajları">
              {messages.map((m) => {
                const isMine = m.sender_id === user.id
                return (
                  <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'items-end gap-2.5'}`}>
                    {!isMine && (
                      <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-muted">
                        <img
                          src={partner.avatar_url || DEFAULT_AVATAR}
                          alt={partner.display_name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}
                    <div className={isMine ? 'max-w-[286px]' : 'max-w-[268px]'}>
                      <div
                        className={
                          isMine
                            ? 'rounded-theme rounded-br-sm bg-primary px-4 py-3 text-primary-foreground shadow-sm'
                            : 'rounded-theme rounded-bl-sm border border-border bg-card px-4 py-3 shadow-sm'
                        }
                      >
                        <p className="text-sm leading-5">{m.content}</p>
                      </div>
                      <p className={`mt-1.5 px-1 text-[10px] text-muted-foreground ${isMine ? 'text-right' : ''}`}>
                        {new Date(m.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                )
              })}
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
                  onChange={(e) => setDraft(e.target.value)}
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
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-theme bg-primary text-primary-foreground shadow-sm disabled:opacity-50"
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
