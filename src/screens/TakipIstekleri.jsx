import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { fallbackAvatarFor } from '../lib/images.js'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useToast } from '../contexts/ToastContext.jsx'
import DetailHeader from '../components/ui/DetailHeader.jsx'


export default function TakipIstekleri() {
  const { t } = useTranslation()
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
      showToast(t('settings.followRequests.acceptFailed'))
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
      showToast(t('settings.followRequests.declineFailed'))
      setBusyId(null)
      return
    }
    setRequests((prev) => prev.filter((row) => row.follower_id !== followerId))
    setBusyId(null)
  }

  return (
    <div className="min-h-screen w-full bg-background pb-10 text-foreground font-body">
      <DetailHeader
        title={t('settings.followRequests.title')}
        subtitle={requests.length === 0 ? t('settings.followRequests.noneSubtitle') : t('settings.followRequests.countSubtitle', { count: requests.length })}
      />

      <main className="px-5 pt-6">
        {loading ? (
          <p className="text-center text-xs text-muted-foreground">{t('common.loading')}</p>
        ) : requests.length === 0 ? (
          <div className="mx-auto mt-8 max-w-[280px] text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-theme bg-muted text-muted-foreground">
              <iconify-icon icon="lucide:user-round-check" class="text-2xl"></iconify-icon>
            </div>
            <p className="mt-4 text-sm font-bold">{t('settings.followRequests.emptyTitle')}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{t('settings.followRequests.emptyBody')}</p>
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
                    src={row.profiles.avatar_url || fallbackAvatarFor(row.follower_id)}
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
                    className="rounded-theme border border-border bg-card px-3 py-2 text-xs font-bold text-foreground transition-transform duration-150 active:scale-95 disabled:opacity-60 disabled:active:scale-100"
                  >
                    {t('settings.followRequests.decline')}
                  </button>
                  <button
                    onClick={() => handleAccept(row.follower_id)}
                    disabled={busyId === row.follower_id}
                    className="rounded-theme bg-primary px-3 py-2 text-xs font-bold text-primary-foreground transition-transform duration-150 active:scale-95 disabled:opacity-60 disabled:active:scale-100"
                  >
                    {t('settings.followRequests.approve')}
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
