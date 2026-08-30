import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IMG } from '../lib/images.js'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useToast } from '../contexts/ToastContext.jsx'

const DEFAULT_AVATAR = IMG('a97f3f05-c665-4b5c-94c7-c83149118bc9')

export default function TakipIstekleri() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useToast()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    supabase
      .from('follows')
      .select('follower_id, created_at, profiles:follower_id(id, display_name, username, avatar_url)')
      .eq('following_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (!cancelled) {
          setRequests((data || []).filter((row) => row.profiles))
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [user])

  async function handleAccept(followerId) {
    if (busyId) return
    setBusyId(followerId)
    const { error } = await supabase
      .from('follows')
      .update({ status: 'accepted' })
      .eq('follower_id', followerId)
      .eq('following_id', user.id)
    if (error) {
      showToast('İstek kabul edilemedi, tekrar dene.')
      setBusyId(null)
      return
    }
    setRequests((prev) => prev.filter((row) => row.follower_id !== followerId))
    setBusyId(null)
  }

  async function handleDecline(followerId) {
    if (busyId) return
    setBusyId(followerId)
    const { error } = await supabase.from('follows').delete().eq('follower_id', followerId).eq('following_id', user.id)
    if (error) {
      showToast('İstek reddedilemedi, tekrar dene.')
      setBusyId(null)
      return
    }
    setRequests((prev) => prev.filter((row) => row.follower_id !== followerId))
    setBusyId(null)
  }

  return (
    <div className="min-h-screen w-full bg-background pb-10 text-foreground font-body">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 px-5 pb-4 pt-12 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            aria-label="Geri dön"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-theme border border-border bg-card text-foreground shadow-sm"
          >
            <iconify-icon icon="lucide:arrow-left" class="text-[19px]"></iconify-icon>
          </button>
          <div className="min-w-0">
            <h1 className="font-heading text-xl font-extrabold tracking-[-0.05em]">Takip istekleri</h1>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {requests.length === 0 ? 'Bekleyen istek yok' : `${requests.length} bekleyen istek`}
            </p>
          </div>
        </div>
      </header>

      <main className="px-5 pt-6">
        {loading ? (
          <p className="text-center text-xs text-muted-foreground">Yükleniyor…</p>
        ) : requests.length === 0 ? (
          <div className="mx-auto mt-8 max-w-[280px] text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-theme bg-muted text-muted-foreground">
              <iconify-icon icon="lucide:user-round-check" class="text-2xl"></iconify-icon>
            </div>
            <p className="mt-4 text-sm font-bold">Bekleyen istek yok</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Hesabın gizliyken seni takip etmek isteyenler burada listelenir.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-theme border border-border bg-card shadow-sm">
            {requests.map((row, i) => (
              <div
                key={row.follower_id}
                className={`flex items-center gap-3 p-4 ${i < requests.length - 1 ? 'border-b border-border' : ''}`}
              >
                <button
                  onClick={() => navigate(`/kullanici/${row.follower_id}`)}
                  className="h-11 w-11 shrink-0 overflow-hidden rounded-full"
                >
                  <img
                    src={row.profiles.avatar_url || DEFAULT_AVATAR}
                    alt={row.profiles.display_name}
                    className="h-full w-full object-cover"
                  />
                </button>
                <button onClick={() => navigate(`/kullanici/${row.follower_id}`)} className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-bold">{row.profiles.display_name}</p>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">@{row.profiles.username}</p>
                </button>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => handleDecline(row.follower_id)}
                    disabled={busyId === row.follower_id}
                    className="rounded-theme border border-border bg-card px-3 py-2 text-xs font-bold text-foreground disabled:opacity-60"
                  >
                    Reddet
                  </button>
                  <button
                    onClick={() => handleAccept(row.follower_id)}
                    disabled={busyId === row.follower_id}
                    className="rounded-theme bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-60"
                  >
                    Onayla
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
