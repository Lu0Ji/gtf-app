import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { fallbackAvatarFor } from '../lib/images.js'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { timeAgo } from '../lib/format.js'
import Sheet from '../components/ui/Sheet.jsx'
import ScreenHeader from '../components/ui/ScreenHeader.jsx'
import SectionHeader from '../components/ui/SectionHeader.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'
import Button from '../components/ui/Button.jsx'


function NewChatModal({ onClose, onPick }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [people, setPeople] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const handle = setTimeout(async () => {
      const term = query.trim()
      const [{ data: blockedRows }, { data: peopleData }] = await Promise.all([
        supabase.rpc('blocked_user_ids'),
        term
          ? supabase
              .from('profiles')
              .select('id, display_name, username, avatar_url')
              .neq('id', user.id)
              .or(`username.ilike.%${term}%,display_name.ilike.%${term}%`)
              .order('display_name')
              .limit(20)
          : supabase
              .from('follows')
              .select('profiles:following_id(id, display_name, username, avatar_url)')
              .eq('follower_id', user.id)
              .eq('status', 'accepted')
              .limit(20),
      ])
      if (cancelled) return
      const blockedSet = new Set((blockedRows || []).map((row) => row.blocked_user_ids ?? row))
      const list = term ? peopleData || [] : (peopleData || []).map((r) => r.profiles).filter(Boolean)
      setPeople(list.filter((p) => !blockedSet.has(p.id)))
      setLoading(false)
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [user, query])

  return (
    <Sheet onClose={onClose} className="flex max-h-[70vh] flex-col overflow-hidden pb-8">
      <div className="sticky top-0 border-b border-border bg-background px-5 py-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold tracking-[-0.04em]">{t('messages.newChatTitle')}</h2>
          <button onClick={onClose} aria-label={t('common.close')} className="text-muted-foreground">
            <iconify-icon icon="lucide:x" class="text-xl"></iconify-icon>
          </button>
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-theme border border-border bg-card px-3.5 py-2.5">
          <iconify-icon icon="lucide:search" class="text-base text-muted-foreground"></iconify-icon>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('messages.searchUsersPlaceholder')}
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>
      <div className="overflow-y-auto">
        {loading ? (
          <p className="px-5 py-6 text-xs text-muted-foreground">{t('common.loading')}</p>
        ) : people.length === 0 ? (
          <p className="px-5 py-6 text-xs text-muted-foreground">
            {query.trim() ? t('messages.noOneFound') : t('messages.noFollowingYet')}
          </p>
        ) : (
          people.map((p) => (
            <button
              key={p.id}
              onClick={() => onPick(p)}
              className="flex w-full items-center gap-3 border-b border-border px-5 py-3.5 text-left transition-colors duration-150 active:bg-muted"
            >
              <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-muted">
                <img src={p.avatar_url || fallbackAvatarFor(p.id)} alt={p.display_name} className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{p.display_name}</p>
                <p className="truncate text-xs text-muted-foreground">@{p.username}</p>
              </div>
            </button>
          ))
        )}
      </div>
    </Sheet>
  )
}

export default function Mesajlar() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [conversations, setConversations] = useState([])
  const [unreadCounts, setUnreadCounts] = useState(new Map())
  const [loading, setLoading] = useState(true)
  const [showNewChat, setShowNewChat] = useState(false)
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!user) return
    let cancelled = false

    async function load() {
      const [{ data, error }, { data: unreadRows }] = await Promise.all([
        supabase
          .from('messages')
          .select(
            'id, content, created_at, sender_id, recipient_id, read_at, sender:sender_id(id, display_name, username, avatar_url), recipient:recipient_id(id, display_name, username, avatar_url)'
          )
          .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
          .order('created_at', { ascending: false }),
        // Per-conversation unread badge — the global count already lives in
        // UnreadMessagesContext for the nav dot, this is the same rows just
        // tallied per sender instead of summed to one number.
        supabase.from('messages').select('sender_id').eq('recipient_id', user.id).is('read_at', null),
      ])

      if (cancelled) return
      if (error) {
        setLoading(false)
        return
      }

      const byPartner = new Map()
      for (const msg of data || []) {
        const partner = msg.sender_id === user.id ? msg.recipient : msg.sender
        if (!partner) continue
        if (!byPartner.has(partner.id)) {
          byPartner.set(partner.id, { partner, lastMessage: msg })
        }
      }
      const counts = new Map()
      for (const row of unreadRows || []) {
        counts.set(row.sender_id, (counts.get(row.sender_id) || 0) + 1)
      }
      setConversations(Array.from(byPartner.values()))
      setUnreadCounts(counts)
      setLoading(false)
    }

    load()

    const channel = supabase
      .channel('messages-list')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `recipient_id=eq.${user.id}` },
        () => load()
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [user])

  function openChat(partner) {
    setShowNewChat(false)
    navigate('/sohbet', { state: { partner } })
  }

  const term = query.trim().toLowerCase()
  const filteredConversations = term
    ? conversations.filter(
        ({ partner }) =>
          partner.display_name?.toLowerCase().includes(term) || partner.username?.toLowerCase().includes(term)
      )
    : conversations
  const totalUnread = Array.from(unreadCounts.values()).reduce((a, b) => a + b, 0)

  return (
    <div className="min-h-screen w-full bg-background text-foreground font-body pb-28">
      <ScreenHeader
        title={t('nav.messages')}
        subtitle={totalUnread > 0 ? t('messages.unreadSubtitle', { count: totalUnread }) : t('messages.defaultSubtitle')}
        action={
          <Button
            variant="primary"
            aria-label={t('messages.newMessageAria')}
            onClick={() => setShowNewChat(true)}
            className="h-11 w-11 shrink-0 rounded-theme p-0"
          >
            <iconify-icon icon="lucide:pen-square" class="text-xl"></iconify-icon>
          </Button>
        }
        className="pb-0"
      />

      {conversations.length > 0 && (
        <div className="px-5 pb-5 pt-4">
          <div className="flex items-center gap-2 rounded-theme border border-border bg-card px-4 py-2.5 shadow-sm">
            <iconify-icon icon="lucide:search" class="text-base text-muted-foreground"></iconify-icon>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('messages.searchConversationsPlaceholder')}
              className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            {query && (
              <button aria-label={t('discover.clearSearchAria')} onClick={() => setQuery('')} className="text-muted-foreground">
                <iconify-icon icon="lucide:x" class="text-lg"></iconify-icon>
              </button>
            )}
          </div>
        </div>
      )}

      <main>
        <section className="mt-6">
          {conversations.length > 0 && <SectionHeader title={t('messages.conversationsHeading')} />}

          {loading ? (
            <p className="mt-4 px-5 text-xs text-muted-foreground">{t('common.loading')}</p>
          ) : conversations.length === 0 ? (
            <div className="mx-5 mt-4">
              <EmptyState
                icon="lucide:message-circle"
                title={t('messages.emptyTitle')}
                description={t('messages.emptyDesc')}
                action={
                  <Button variant="secondary" icon="lucide:user-plus" iconClass="text-sm" onClick={() => setShowNewChat(true)} className="px-4 py-2.5 text-xs">
                    {t('messages.findPersonCta')}
                  </Button>
                }
              />
            </div>
          ) : filteredConversations.length === 0 ? (
            <p className="mx-5 mt-4 rounded-theme border border-dashed border-border bg-muted/60 p-4 text-center text-xs text-muted-foreground">
              {t('discover.noResults', { query })}
            </p>
          ) : (
            <div className="mt-3 border-y border-border bg-card">
              {filteredConversations.map(({ partner, lastMessage }) => {
                const unread = unreadCounts.get(partner.id) || 0
                const isMine = lastMessage.sender_id === user.id
                return (
                  <button
                    key={partner.id}
                    onClick={() => openChat(partner)}
                    className="flex w-full items-center gap-3 border-b border-border px-5 py-4 text-left transition-colors duration-150 active:bg-muted last:border-b-0"
                  >
                    <div className="relative shrink-0">
                      <div
                        className={`h-14 w-14 overflow-hidden rounded-full bg-muted ${
                          unread > 0 ? 'ring-2 ring-primary ring-offset-2 ring-offset-card' : ''
                        }`}
                      >
                        <img
                          src={partner.avatar_url || fallbackAvatarFor(partner.id)}
                          alt={partner.display_name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className={`truncate text-sm ${unread > 0 ? 'font-extrabold text-foreground' : 'font-bold text-foreground'}`}>
                          {partner.display_name}
                        </p>
                        <time
                          className={`shrink-0 text-[11px] font-semibold ${
                            unread > 0 ? 'text-primary' : 'text-muted-foreground'
                          }`}
                        >
                          {timeAgo(lastMessage.created_at)}
                        </time>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <p
                          className={`flex min-w-0 flex-1 items-center gap-1 truncate text-xs ${
                            unread > 0 ? 'font-bold text-foreground' : 'font-medium text-muted-foreground'
                          }`}
                        >
                          {isMine && (
                            <iconify-icon
                              icon={lastMessage.read_at ? 'lucide:check-check' : 'lucide:check'}
                              class={`shrink-0 text-sm ${lastMessage.read_at ? 'text-primary' : ''}`}
                            ></iconify-icon>
                          )}
                          <span className="truncate">
                            {isMine ? t('messages.youPrefix') : ''}
                            {lastMessage.content}
                          </span>
                        </p>
                        {unread > 0 && (
                          <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                            {unread > 9 ? '9+' : unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </section>
      </main>

      {showNewChat && <NewChatModal onClose={() => setShowNewChat(false)} onPick={openChat} />}
    </div>
  )
}
