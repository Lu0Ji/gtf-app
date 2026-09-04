import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { fallbackAvatarFor } from '../lib/images.js'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useToast } from '../contexts/ToastContext.jsx'
import { useOnlineUsers } from '../contexts/PresenceContext.jsx'
import { formatTime } from '../lib/format.js'
import { dayLabel, groupInfo } from '../lib/chatGrouping.js'

// How long one person's "typing" broadcast stays valid before dropping out
// of the indicator — see Sohbet.jsx's identical constant for why.
const TYPING_TIMEOUT_MS = 3000

// Live group chat — one thread per group, not per pair (see Sohbet.jsx for
// 1:1 DMs, which this otherwise mirrors: same postgres_changes INSERT
// subscribe-while-open pattern, just filtered by group_id, plus the same
// message-grouping and typing-indicator treatment). Members currently
// online (PresenceContext, already shared app-wide) get a strip of avatars
// up top so people can see who's actually here to talk right now, not just
// who's a member on paper.
export default function GrupSohbeti() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { showToast } = useToast()
  const onlineIds = useOnlineUsers()
  const groupId = location.state?.groupId
  const groupName = location.state?.groupName || t('chat.defaultGroupName')

  const [members, setMembers] = useState([])
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  // userId -> display name, for whoever has an active "typing" broadcast.
  const [typingUsers, setTypingUsers] = useState({})
  const bottomRef = useRef(null)
  const channelRef = useRef(null)
  const typingSentAtRef = useRef(0)
  const typingTimeoutsRef = useRef({})

  useEffect(() => {
    if (!groupId) {
      navigate('/gruplar', { replace: true })
    }
  }, [groupId, navigate])

  useEffect(() => {
    if (!groupId) return
    supabase
      .from('group_members')
      .select('user_id, profiles:user_id(id, display_name, username, avatar_url)')
      .eq('group_id', groupId)
      .then(({ data }) => setMembers((data || []).map((m) => m.profiles).filter(Boolean)))
  }, [groupId])

  useEffect(() => {
    if (!user || !groupId) return
    let cancelled = false

    async function load() {
      const { data, error } = await supabase
        .from('group_messages')
        .select('*, profiles:sender_id(display_name, username, avatar_url)')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true })
      if (!cancelled) {
        if (!error) setMessages(data || [])
        setLoading(false)
      }
    }
    load()

    const channel = supabase
      .channel(`grup-sohbeti-${groupId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'group_messages', filter: `group_id=eq.${groupId}` },
        (payload) => {
          // Whoever just sent a real message is done typing.
          setTypingUsers((prev) => {
            if (!(payload.new.sender_id in prev)) return prev
            const next = { ...prev }
            delete next[payload.new.sender_id]
            return next
          })
          clearTimeout(typingTimeoutsRef.current[payload.new.sender_id])
          // Our own sends are already in state optimistically — a second
          // copy would double it up on the realtime echo.
          if (payload.new.sender_id === user.id) return
          setMessages((prev) => [...prev, payload.new])
        }
      )
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (!payload?.userId || payload.userId === user.id) return
        setTypingUsers((prev) => ({ ...prev, [payload.userId]: payload.name || t('chat.someone') }))
        clearTimeout(typingTimeoutsRef.current[payload.userId])
        typingTimeoutsRef.current[payload.userId] = setTimeout(() => {
          setTypingUsers((prev) => {
            const next = { ...prev }
            delete next[payload.userId]
            return next
          })
        }, TYPING_TIMEOUT_MS)
      })
      .subscribe()
    channelRef.current = channel

    return () => {
      cancelled = true
      for (const timeoutId of Object.values(typingTimeoutsRef.current)) clearTimeout(timeoutId)
      typingTimeoutsRef.current = {}
      channelRef.current = null
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, groupId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typingUsers])

  function handleDraftChange(value) {
    setDraft(value)
    const now = Date.now()
    if (value.trim() && now - typingSentAtRef.current > 2000) {
      typingSentAtRef.current = now
      const myName = members.find((m) => m.id === user.id)?.display_name?.split(' ')[0] || t('chat.someone')
      channelRef.current?.send({ type: 'broadcast', event: 'typing', payload: { userId: user.id, name: myName } })
    }
  }

  async function handleSend() {
    const content = draft.trim()
    if (!content || sending || !groupId) return
    setSending(true)
    setDraft('')
    const optimistic = {
      id: `local-${Date.now()}`,
      group_id: groupId,
      sender_id: user.id,
      content,
      created_at: new Date().toISOString(),
      profiles: null,
    }
    setMessages((prev) => [...prev, optimistic])

    const { error } = await supabase.from('group_messages').insert({
      group_id: groupId,
      sender_id: user.id,
      content,
    })
    if (error) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
      setDraft(content)
      showToast(
        error.code === '42501' ? t('chat.sendFailedNotMember') : t('chat.sendFailedGeneric')
      )
    }
    setSending(false)
  }

  if (!groupId) return null

  const onlineMembers = members.filter((m) => onlineIds.has(m.id))
  const typingNames = Object.values(typingUsers)
  const typingLabel =
    typingNames.length === 0
      ? null
      : typingNames.length === 1
        ? t('chat.typingOne', { name: typingNames[0] })
        : typingNames.length === 2
          ? t('chat.typingTwo', { name1: typingNames[0], name2: typingNames[1] })
          : t('chat.typingMany', { count: typingNames.length })

  return (
    <div className="min-h-screen w-full bg-background text-foreground font-body">
      <div className="relative flex min-h-screen flex-col overflow-hidden">
        <header className="sticky top-0 z-20 border-b border-border bg-background/95 px-5 pb-4 pt-12 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <button
              aria-label={t('common.backAria')}
              onClick={() => navigate(-1)}
              className="flex h-10 w-10 items-center justify-center rounded-theme bg-secondary text-secondary-foreground"
            >
              <iconify-icon icon="lucide:arrow-left" class="text-xl"></iconify-icon>
            </button>
            <div className="min-w-0 flex-1 px-3 text-center">
              <p className="truncate font-heading text-sm font-extrabold tracking-tight">{groupName}</p>
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                {typingLabel ? (
                  <span className="font-semibold text-primary">{typingLabel}</span>
                ) : onlineMembers.length > 0 ? (
                  t('chat.onlineCount', { count: onlineMembers.length })
                ) : (
                  t('groups.memberCount', { count: members.length })
                )}
              </p>
            </div>
            <div className="h-10 w-10" />
          </div>

          {onlineMembers.length > 0 && (
            <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-0.5">
              {onlineMembers.map((m) => (
                <button
                  key={m.id}
                  onClick={() => navigate(`/kullanici/${m.id}`)}
                  className="flex shrink-0 flex-col items-center gap-1"
                >
                  <div className="relative h-9 w-9 overflow-hidden rounded-full bg-muted">
                    <img src={m.avatar_url || fallbackAvatarFor(m.id)} alt={m.display_name} className="h-full w-full object-cover" />
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-success" />
                  </div>
                  <span className="max-w-[52px] truncate text-[9px] font-semibold text-muted-foreground">
                    {m.display_name?.split(' ')[0]}
                  </span>
                </button>
              ))}
            </div>
          )}
        </header>

        <main className="flex-1 px-5 pb-36 pt-6">
          {loading ? (
            <p className="text-center text-xs text-muted-foreground">{t('common.loading')}</p>
          ) : messages.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground">
              {t('chat.emptyGroupMessages')}
            </p>
          ) : (
            <section aria-label={t('chat.groupMessagesAria')}>
              {messages.map((m, i) => {
                const isMine = m.sender_id === user.id
                const sender = m.profiles
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
                            <button onClick={() => navigate(`/kullanici/${m.sender_id}`)} className="block h-full w-full">
                              <img
                                src={sender?.avatar_url || fallbackAvatarFor(m.sender_id)}
                                alt={sender?.display_name || t('common.unknownUser')}
                                className="h-full w-full rounded-full bg-muted object-cover"
                              />
                            </button>
                          )}
                        </div>
                      )}
                      <div className={isMine ? 'max-w-[286px]' : 'max-w-[268px]'}>
                        {!isMine && isFirstInGroup && (
                          <p className="mb-1 px-1 text-[11px] font-bold text-muted-foreground">
                            {sender?.display_name || t('common.unknownUser')}
                          </p>
                        )}
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
                          <p className={`mt-1.5 px-1 text-[10px] text-muted-foreground ${isMine ? 'text-right' : ''}`}>
                            {formatTime(m.created_at)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}

              {typingNames.length > 0 && (
                <div className="mt-4 flex items-end gap-2.5">
                  <div className="h-8 w-8 shrink-0" />
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
          <div className="mx-auto flex max-w-[393px] items-end gap-2">
            <div className="flex h-12 min-w-0 flex-1 items-center rounded-theme border border-border bg-input px-4 shadow-sm">
              <input
                value={draft}
                onChange={(e) => handleDraftChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSend()
                }}
                placeholder={t('chat.groupMessagePlaceholder')}
                className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
            <button
              aria-label={t('chat.sendAria')}
              onClick={handleSend}
              disabled={!draft.trim() || sending}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-theme bg-primary text-primary-foreground shadow-sm transition-transform duration-150 active:scale-90 disabled:opacity-60 disabled:active:scale-100"
            >
              <iconify-icon icon="lucide:send" class="text-lg"></iconify-icon>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
