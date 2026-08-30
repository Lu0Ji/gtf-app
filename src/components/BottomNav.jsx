import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'

const TABS = [
  { name: 'Anasayfa', icon: 'lucide:house', path: '/' },
  { name: 'Gruplar', icon: 'lucide:users-round', path: '/gruplar' },
  { name: 'Mesajlar', icon: 'lucide:message-circle', path: '/mesajlar' },
  { name: 'Keşfet', icon: 'lucide:compass', path: '/kesfet' },
  { name: 'Profil', icon: 'lucide:user', path: '/profil' },
]

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!user) return

    async function loadUnread() {
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .is('read_at', null)
      setUnreadCount(count || 0)
    }

    loadUnread()

    const channel = supabase
      .channel('unread-badge')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `recipient_id=eq.${user.id}` },
        loadUnread
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-background/95 px-3 pb-5 pt-2 backdrop-blur-md">
      <div className="mx-auto flex max-w-[393px] items-end justify-between">
        {TABS.map((tab) => {
          const isActive = location.pathname === tab.path
          const showBadge = tab.path === '/mesajlar' && unreadCount > 0
          return (
            <button
              key={tab.name}
              type="button"
              onClick={() => navigate(tab.path)}
              className={`flex min-w-[60px] flex-col items-center gap-1 ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <span
                className={`relative flex h-8 w-8 items-center justify-center rounded-lg ${
                  isActive ? 'bg-secondary' : ''
                }`}
              >
                <iconify-icon icon={tab.icon} class="text-[18px]"></iconify-icon>
                {showBadge && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </span>
              <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>
                {tab.name}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
