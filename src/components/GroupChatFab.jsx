import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import GrupSohbeti from '../screens/GrupSohbeti.jsx'

// Replaces the old small header icon button in GrupDetayi.jsx per beta
// feedback: "Grup sohbet butonunun yeri hoşuma gitmedi, mobilde sağ altta
// dinamik bir buton olabilir kaydırdıkça bizimle birlikte gelen ve
// insanlar mesaj attıkça kırmızı sayı bildirimi çıkar... Web de ise yine
// sağ alt köşede bulunsun, ama basınca başka sayfaya gitmesin, chat ekranı
// ekranın çeyreği kadar açılıp görünsün." Two CSS-toggled variants (same
// md:hidden / hidden md:flex split as BottomNav/SidebarNav), portalled
// straight to document.body for the same reason BottomNav is — AppShell's
// transformed ancestor would otherwise pin `fixed` to the scrolling content
// box instead of the real viewport, defeating "kaydırdıkça bizimle
// birlikte gelen".
//
// Unread badge needs supabase/schema.sql's group_members.last_read_at
// (2026-09 migration) — GrupSohbeti stamps it to now() whenever the member
// actually has the thread open (page or drawer), this component compares
// new messages against it. Pre-migration, membership.last_read_at just
// comes back null and the badge silently stays at 0 instead of breaking.
export default function GroupChatFab({ groupId, groupName }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const drawerOpenRef = useRef(false)

  useEffect(() => {
    drawerOpenRef.current = drawerOpen
  }, [drawerOpen])

  useEffect(() => {
    if (!user || !groupId) return
    let cancelled = false

    async function loadUnread() {
      const { data: membership } = await supabase
        .from('group_members')
        .select('last_read_at')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .maybeSingle()
      const lastReadAt = membership?.last_read_at
      if (!lastReadAt) {
        if (!cancelled) setUnreadCount(0)
        return
      }
      const { count } = await supabase
        .from('group_messages')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', groupId)
        .neq('sender_id', user.id)
        .gt('created_at', lastReadAt)
      if (!cancelled) setUnreadCount(count || 0)
    }
    loadUnread()

    const channel = supabase
      .channel(`grup-fab-${groupId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'group_messages', filter: `group_id=eq.${groupId}` },
        (payload) => {
          // Drawer open means GrupSohbeti itself is stamping last_read_at
          // as these land — don't let the badge tick up behind it.
          if (payload.new.sender_id === user.id || drawerOpenRef.current) return
          setUnreadCount((prev) => prev + 1)
        }
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [user, groupId])

  if (!groupId) return null

  function handleMobileOpen() {
    setUnreadCount(0)
    navigate('/grup-sohbeti', { state: { groupId, groupName } })
  }

  function handleDesktopToggle() {
    setUnreadCount(0)
    setDrawerOpen((prev) => !prev)
  }

  const badge = unreadCount > 0 && (
    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
      {unreadCount > 9 ? '9+' : unreadCount}
    </span>
  )

  return createPortal(
    <>
      <button
        type="button"
        aria-label={t('groups.chatAria')}
        onClick={handleMobileOpen}
        className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform duration-150 active:scale-90 md:hidden"
      >
        <iconify-icon icon="lucide:message-circle" class="text-2xl"></iconify-icon>
        {badge}
      </button>

      <button
        type="button"
        aria-label={t('groups.chatAria')}
        onClick={handleDesktopToggle}
        className="fixed bottom-6 right-6 z-30 hidden h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform duration-150 active:scale-90 md:flex"
      >
        <iconify-icon icon={drawerOpen ? 'lucide:x' : 'lucide:message-circle'} class="text-2xl"></iconify-icon>
        {!drawerOpen && badge}
      </button>

      {drawerOpen && (
        <div className="fixed bottom-24 right-6 z-30 hidden h-[70vh] w-[25vw] min-w-[340px] max-w-[420px] flex-col overflow-hidden rounded-theme border border-border bg-background shadow-2xl md:flex">
          <GrupSohbeti groupId={groupId} groupName={groupName} variant="drawer" onClose={() => setDrawerOpen(false)} />
        </div>
      )}
    </>,
    document.body
  )
}
