import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IMG } from '../lib/images.js'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { timeAgo } from '../lib/format.js'

const DEFAULT_AVATAR = IMG('30bcaf3b-c1a8-4dcb-bb98-3fdcc1b6b596')

function NewChatModal({ onClose, onPick }) {
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
    <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[70vh] w-full flex-col overflow-hidden rounded-t-theme bg-background pb-8"
      >
        <div className="sticky top-0 border-b border-border bg-background px-5 py-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg font-bold">Yeni mesaj</h2>
            <button onClick={onClose} aria-label="Kapat" className="text-muted-foreground">
              <iconify-icon icon="lucide:x" class="text-xl"></iconify-icon>
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-theme border border-border bg-card px-3.5 py-2.5">
            <iconify-icon icon="lucide:search" class="text-base text-muted-foreground"></iconify-icon>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Kullanıcı ara…"
              className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>
        <div className="overflow-y-auto">
          {loading ? (
            <p className="px-5 py-6 text-xs text-muted-foreground">Yükleniyor…</p>
          ) : people.length === 0 ? (
            <p className="px-5 py-6 text-xs text-muted-foreground">
              {query.trim() ? 'Kimse bulunamadı.' : 'Takip ettiğin kimse yok. Aramak için yaz.'}
            </p>
          ) : (
            people.map((p) => (
            <button
              key={p.id}
              onClick={() => onPick(p)}
              className="flex w-full items-center gap-3 border-b border-border px-5 py-3.5 text-left"
            >
              <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-muted">
                <img src={p.avatar_url || DEFAULT_AVATAR} alt={p.display_name} className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{p.display_name}</p>
                <p className="truncate text-xs text-muted-foreground">@{p.username}</p>
              </div>
            </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default function Mesajlar() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNewChat, setShowNewChat] = useState(false)

  useEffect(() => {
    if (!user) return
    let cancelled = false

    async function load() {
      const { data, error } = await supabase
        .from('messages')
        .select(
          'id, content, created_at, sender_id, recipient_id, sender:sender_id(id, display_name, username, avatar_url), recipient:recipient_id(id, display_name, username, avatar_url)'
        )
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

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
      setConversations(Array.from(byPartner.values()))
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

  return (
    <div className="min-h-screen w-full bg-background text-foreground font-body pb-28">
      <header className="px-5 pt-12">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-[26px] font-extrabold tracking-[-0.06em] text-primary">
              Mesajlar
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">Tahminlerin etrafındaki sohbetler</p>
          </div>
          <button
            aria-label="Yeni mesaj oluştur"
            onClick={() => setShowNewChat(true)}
            className="flex h-11 w-11 items-center justify-center rounded-theme bg-primary text-primary-foreground shadow-sm"
          >
            <iconify-icon icon="lucide:pen-square" class="text-xl"></iconify-icon>
          </button>
        </div>
      </header>

      <main>
        <section className="mt-6">
          <div className="flex items-center justify-between px-5">
            <h2 className="font-heading text-lg font-bold tracking-tight">Sohbetler</h2>
          </div>

          {loading ? (
            <p className="mt-4 px-5 text-xs text-muted-foreground">Yükleniyor…</p>
          ) : conversations.length === 0 ? (
            <section className="mx-5 mt-4 rounded-theme border border-dashed border-border bg-muted/60 px-5 py-6 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-card text-primary shadow-sm">
                <iconify-icon icon="lucide:message-circle" class="text-lg"></iconify-icon>
              </div>
              <h2 className="mt-3 font-heading text-sm font-bold">Yeni bir sohbet başlat</h2>
              <p className="mx-auto mt-1 max-w-[250px] text-xs leading-5 text-muted-foreground">
                Henüz kimseyle mesajlaşmadın. Bir kullanıcı seçip ilk mesajını gönder.
              </p>
              <button
                onClick={() => setShowNewChat(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-theme bg-secondary px-4 py-2.5 text-xs font-bold text-secondary-foreground"
              >
                <iconify-icon icon="lucide:user-plus" class="text-sm"></iconify-icon>
                Kişi bul
              </button>
            </section>
          ) : (
            <div className="mt-3 border-y border-border bg-card">
              {conversations.map(({ partner, lastMessage }) => (
                <button
                  key={partner.id}
                  onClick={() => openChat(partner)}
                  className="flex w-full items-center gap-3 border-b border-border px-5 py-4 text-left last:border-b-0"
                >
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-muted">
                    <img
                      src={partner.avatar_url || DEFAULT_AVATAR}
                      alt={partner.display_name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="truncate text-sm font-bold">{partner.display_name}</p>
                      <time className="shrink-0 text-[11px] font-semibold text-muted-foreground">
                        {timeAgo(lastMessage.created_at)}
                      </time>
                    </div>
                    <p className="mt-1 truncate text-xs font-medium text-foreground">
                      {lastMessage.sender_id === user.id ? 'Sen: ' : ''}
                      {lastMessage.content}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </main>

      {showNewChat && <NewChatModal onClose={() => setShowNewChat(false)} onPick={openChat} />}
    </div>
  )
}
