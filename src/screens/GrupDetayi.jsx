import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { IMG } from '../lib/images.js'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useToast } from '../contexts/ToastContext.jsx'
import { formatDateLong } from '../lib/format.js'

const DEFAULT_AVATAR = IMG('fc4eb4df-87ce-4cd9-bdd3-80a434cd8ddd')

export default function GrupDetayi() {
  const { groupId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useToast()
  const [group, setGroup] = useState(null)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [membershipBusy, setMembershipBusy] = useState(false)

  async function load() {
    const [groupRes, membersRes] = await Promise.all([
      supabase.from('groups').select('*').eq('id', groupId).single(),
      supabase
        .from('group_members')
        .select('user_id, role, joined_at, profiles:user_id(id, display_name, username, avatar_url)')
        .eq('group_id', groupId)
        .order('joined_at', { ascending: true }),
    ])
    setGroup(groupRes.data || null)
    setMembers((membersRes.data || []).filter((m) => m.profiles))
    setLoading(false)
  }

  useEffect(() => {
    if (groupId) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId])

  const isMember = members.some((m) => m.user_id === user?.id)

  async function handleToggleMembership() {
    if (membershipBusy) return
    setMembershipBusy(true)
    const { error } = isMember
      ? await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', user.id)
      : await supabase.from('group_members').insert({ group_id: groupId, user_id: user.id })
    if (error) {
      showToast(isMember ? 'Gruptan ayrılamadın, tekrar dene.' : 'Gruba katılamadın, tekrar dene.')
    } else {
      await load()
    }
    setMembershipBusy(false)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background font-body text-foreground">
        <p className="text-xs text-muted-foreground">Yükleniyor…</p>
      </div>
    )
  }

  if (!group) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center gap-3 bg-background px-8 text-center font-body text-foreground">
        <p className="text-sm font-bold">Grup bulunamadı</p>
        <button onClick={() => navigate(-1)} className="rounded-theme bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">
          Geri dön
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-background pb-28 text-foreground font-body">
      <header className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between px-5 pt-12">
        <button
          aria-label="Geri dön"
          onClick={() => navigate(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-theme border border-border bg-card/90 text-foreground shadow-sm backdrop-blur-sm"
        >
          <iconify-icon icon="lucide:arrow-left" class="text-[19px]"></iconify-icon>
        </button>
      </header>

      {group.cover_image_url ? (
        <div className="h-40 w-full overflow-hidden bg-muted">
          <img src={group.cover_image_url} alt={group.name} className="h-full w-full object-cover" />
        </div>
      ) : (
        <div className="flex h-40 w-full items-center justify-center bg-secondary text-primary">
          <iconify-icon icon="lucide:users-round" class="text-4xl"></iconify-icon>
        </div>
      )}

      <main className="px-5 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold text-secondary-foreground">
              {group.category?.toUpperCase()}
            </span>
            <h1 className="mt-2 font-heading text-[22px] font-extrabold tracking-[-0.04em]">{group.name}</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              {members.length} üye · {formatDateLong(group.created_at)} kuruldu
            </p>
          </div>
          <button
            onClick={handleToggleMembership}
            disabled={membershipBusy}
            className={`shrink-0 rounded-theme px-4 py-2.5 text-xs font-bold disabled:opacity-60 ${
              isMember ? 'bg-secondary text-secondary-foreground' : 'bg-primary text-primary-foreground'
            }`}
          >
            {isMember ? 'Üyesin' : 'Katıl'}
          </button>
        </div>

        {group.description && (
          <p className="mt-4 text-sm leading-6 text-foreground">{group.description}</p>
        )}

        <section className="mt-7">
          <h2 className="font-heading text-base font-bold tracking-tight">Üyeler ({members.length})</h2>
          {members.length === 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">Henüz üye yok.</p>
          ) : (
            <div className="mt-3 divide-y divide-border rounded-theme border border-border bg-card shadow-sm">
              {members.map((m) => (
                <button
                  key={m.user_id}
                  onClick={() => navigate(`/kullanici/${m.user_id}`)}
                  className="flex w-full items-center gap-3 p-3.5 text-left"
                >
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted">
                    <img
                      src={m.profiles.avatar_url || DEFAULT_AVATAR}
                      alt={m.profiles.display_name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{m.profiles.display_name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">@{m.profiles.username}</p>
                  </div>
                  {m.role === 'admin' && (
                    <span className="rounded-full bg-secondary px-2 py-1 text-[9px] font-bold text-secondary-foreground">
                      YÖNETİCİ
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
