import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { IMG } from '../lib/images.js'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useToast } from '../contexts/ToastContext.jsx'
import { formatDateLong, timeAgo } from '../lib/format.js'
import { GROUP_CATEGORIES } from '../lib/categories.js'

const DEFAULT_AVATAR = IMG('fc4eb4df-87ce-4cd9-bdd3-80a434cd8ddd')

function EditGroupModal({ group, onClose, onSaved }) {
  const { showToast } = useToast()
  const [name, setName] = useState(group.name || '')
  const [description, setDescription] = useState(group.description || '')
  const [category, setCategory] = useState(group.category || 'genel')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim() || saving) return
    setSaving(true)
    const { error } = await supabase
      .from('groups')
      .update({ name: name.trim(), description: description.trim() || null, category: category.toLowerCase() })
      .eq('id', group.id)
    setSaving(false)
    if (error) {
      showToast('Grup güncellenemedi, tekrar dene.')
      return
    }
    onSaved({ name: name.trim(), description: description.trim() || null, category: category.toLowerCase() })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full rounded-t-theme bg-background p-5 pb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold">Grubu düzenle</h2>
          <button onClick={onClose} aria-label="Kapat" className="text-muted-foreground">
            <iconify-icon icon="lucide:x" class="text-xl"></iconify-icon>
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-bold text-foreground">Grup adı</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-theme border border-border bg-input px-4 py-3 text-sm text-foreground shadow-sm outline-none"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-bold text-foreground">Açıklama</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full resize-none rounded-theme border border-border bg-input px-4 py-3 text-sm leading-5 text-foreground shadow-sm outline-none"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-bold text-foreground">Kategori</label>
            <div className="flex flex-wrap gap-2">
              {GROUP_CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`rounded-full px-3.5 py-2 text-xs font-bold ${
                    c.toLowerCase() === category.toLowerCase()
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border bg-card text-card-foreground'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className="flex w-full items-center justify-center gap-2 rounded-theme bg-primary px-4 py-3.5 text-sm font-extrabold text-primary-foreground shadow-sm disabled:opacity-50"
          >
            {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  )
}

function GroupPredictionCard({ prediction, onOpen }) {
  const author = prediction.profiles
  const isVerified = prediction.status === 'verified_correct' || prediction.status === 'verified_incorrect'
  const isCorrect = prediction.status === 'verified_correct'

  return (
    <button
      onClick={onOpen}
      className="flex w-full flex-col gap-2.5 rounded-theme border border-border bg-card p-3.5 text-left shadow-sm"
    >
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full">
          <img src={author?.avatar_url || DEFAULT_AVATAR} alt={author?.display_name} className="h-full w-full object-cover" />
        </div>
        <p className="min-w-0 flex-1 truncate text-xs font-semibold text-muted-foreground">
          {author?.display_name || 'Kullanıcı'} · {timeAgo(prediction.created_at)}
        </p>
      </div>
      <p className="text-sm font-bold leading-5">{prediction.title}</p>
      {isVerified ? (
        <div
          className={`flex items-center justify-between rounded-theme px-3 py-2 text-[11px] font-bold ${
            isCorrect ? 'bg-success text-success-foreground' : 'bg-destructive text-destructive-foreground'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <iconify-icon icon={isCorrect ? 'lucide:badge-check' : 'lucide:x-circle'} class="text-sm"></iconify-icon>
            {isCorrect ? 'Doğrulandı' : 'Gerçekleşmedi'}
          </span>
          <span>{formatDateLong(prediction.verified_at)}</span>
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-theme bg-muted px-3 py-2 text-[11px] font-semibold text-muted-foreground">
          <span className="rounded-full bg-card px-2 py-0.5 text-[10px] font-bold text-primary">
            {prediction.category?.toUpperCase()}
          </span>
          <span>{formatDateLong(prediction.event_date)}'da açılacak</span>
        </div>
      )}
    </button>
  )
}

export default function GrupDetayi() {
  const { groupId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useToast()
  const [group, setGroup] = useState(null)
  const [members, setMembers] = useState([])
  const [predictions, setPredictions] = useState([])
  const [loading, setLoading] = useState(true)
  const [membershipBusy, setMembershipBusy] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [openMemberMenu, setOpenMemberMenu] = useState(null)
  const [memberActionBusy, setMemberActionBusy] = useState(false)

  async function load() {
    const [groupRes, membersRes, predictionsRes] = await Promise.all([
      supabase.from('groups').select('*').eq('id', groupId).single(),
      supabase
        .from('group_members')
        .select('user_id, role, joined_at, profiles:user_id(id, display_name, username, avatar_url)')
        .eq('group_id', groupId)
        .order('joined_at', { ascending: true }),
      supabase
        .from('predictions')
        .select('*, profiles:author_id(display_name, username, avatar_url)')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false }),
    ])
    setGroup(groupRes.data || null)
    setMembers((membersRes.data || []).filter((m) => m.profiles))
    setPredictions(predictionsRes.data || [])
    setLoading(false)
  }

  useEffect(() => {
    if (groupId) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId])

  const isMember = members.some((m) => m.user_id === user?.id)
  const isAdmin = members.some((m) => m.user_id === user?.id && m.role === 'admin')

  async function handleToggleAdmin(member) {
    if (memberActionBusy) return
    setMemberActionBusy(true)
    const nextRole = member.role === 'admin' ? 'member' : 'admin'
    const { error } = await supabase
      .from('group_members')
      .update({ role: nextRole })
      .eq('group_id', groupId)
      .eq('user_id', member.user_id)
    if (error) {
      showToast('Rol güncellenemedi, tekrar dene.')
    } else {
      setOpenMemberMenu(null)
      await load()
    }
    setMemberActionBusy(false)
  }

  async function handleKickMember(member) {
    if (memberActionBusy) return
    setMemberActionBusy(true)
    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', member.user_id)
    if (error) {
      showToast('Üye çıkarılamadı, tekrar dene.')
    } else {
      setOpenMemberMenu(null)
      await load()
    }
    setMemberActionBusy(false)
  }

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
        {isAdmin && (
          <button
            aria-label="Grubu düzenle"
            onClick={() => setShowEdit(true)}
            className="flex h-10 w-10 items-center justify-center rounded-theme border border-border bg-card/90 text-foreground shadow-sm backdrop-blur-sm"
          >
            <iconify-icon icon="lucide:pencil" class="text-[17px]"></iconify-icon>
          </button>
        )}
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
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-base font-bold tracking-tight">Tahminler ({predictions.length})</h2>
            {isMember && (
              <button
                onClick={() => navigate('/tahmin-olustur', { state: { groupId: group.id, groupName: group.name } })}
                className="flex items-center gap-1.5 rounded-theme bg-primary px-3 py-2 text-[11px] font-bold text-primary-foreground"
              >
                <iconify-icon icon="lucide:plus" class="text-sm"></iconify-icon>
                Tahmin oluştur
              </button>
            )}
          </div>
          {predictions.length === 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">
              {isMember
                ? 'Henüz bir tahmin veya zaman kapsülü yok. İlkini sen oluştur.'
                : 'Tahminleri görmek ve oluşturmak için gruba katıl.'}
            </p>
          ) : (
            <div className="mt-3 space-y-2.5">
              {predictions.map((prediction) => (
                <GroupPredictionCard
                  key={prediction.id}
                  prediction={prediction}
                  onOpen={() => navigate('/tahmin-kaydi', { state: { prediction } })}
                />
              ))}
            </div>
          )}
        </section>

        <section className="mt-7">
          <h2 className="font-heading text-base font-bold tracking-tight">Üyeler ({members.length})</h2>
          {members.length === 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">Henüz üye yok.</p>
          ) : (
            <div className="mt-3 divide-y divide-border rounded-theme border border-border bg-card shadow-sm">
              {members.map((m) => (
                <div key={m.user_id}>
                  <div className="flex w-full items-center gap-3 p-3.5 text-left">
                    <button
                      onClick={() => navigate(`/kullanici/${m.user_id}`)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
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
                    </button>
                    {m.role === 'admin' && (
                      <span className="shrink-0 rounded-full bg-secondary px-2 py-1 text-[9px] font-bold text-secondary-foreground">
                        YÖNETİCİ
                      </span>
                    )}
                    {isAdmin && m.user_id !== user?.id && (
                      <button
                        aria-label="Üye seçenekleri"
                        onClick={() => setOpenMemberMenu((prev) => (prev === m.user_id ? null : m.user_id))}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground"
                      >
                        <iconify-icon icon="lucide:more-vertical" class="text-base"></iconify-icon>
                      </button>
                    )}
                  </div>
                  {openMemberMenu === m.user_id && (
                    <div className="flex gap-2 border-t border-border bg-muted/60 px-3.5 py-3">
                      <button
                        onClick={() => handleToggleAdmin(m)}
                        disabled={memberActionBusy}
                        className="flex-1 rounded-theme bg-card px-3 py-2 text-[11px] font-bold text-foreground shadow-sm disabled:opacity-60"
                      >
                        {m.role === 'admin' ? 'Yöneticilikten çıkar' : 'Yönetici yap'}
                      </button>
                      <button
                        onClick={() => handleKickMember(m)}
                        disabled={memberActionBusy}
                        className="flex-1 rounded-theme bg-destructive/10 px-3 py-2 text-[11px] font-bold text-destructive disabled:opacity-60"
                      >
                        Gruptan çıkar
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {showEdit && (
        <EditGroupModal
          group={group}
          onClose={() => setShowEdit(false)}
          onSaved={(updates) => {
            setGroup((prev) => ({ ...prev, ...updates }))
            setShowEdit(false)
          }}
        />
      )}
    </div>
  )
}
