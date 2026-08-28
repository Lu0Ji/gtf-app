import { useLocation, useNavigate } from 'react-router-dom'

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

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-background/95 px-3 pb-5 pt-2 backdrop-blur-md">
      <div className="mx-auto flex max-w-[393px] items-end justify-between">
        {TABS.map((tab) => {
          const isActive = location.pathname === tab.path
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
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                  isActive ? 'bg-secondary' : ''
                }`}
              >
                <iconify-icon icon={tab.icon} class="text-[18px]"></iconify-icon>
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
