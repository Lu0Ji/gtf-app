import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useToast } from '../contexts/ToastContext.jsx'
import { supabase } from '../lib/supabase.js'
import { CATEGORY_META, GROUP_CATEGORIES as CATEGORIES } from '../lib/categories.js'

function CreateGroupModal({ onClose, onCreated }) {
  const { user } = useAuth()
  const coverInputRef = useRef(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('Genel')
  const [coverFile, setCoverFile] = useState(null)
  const [coverPreview, setCoverPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function handlePickCover(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  async function handleCreate() {
    if (!name.trim() || saving) return
    setSaving(true)
    setError('')
    try {
      const { data: group, error: insertError } = await supabase
        .from('groups')
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          category: category.toLowerCase(),
          created_by: user.id,
        })
        .select()
        .single()
      if (insertError) throw insertError

      const { error: memberError } = await supabase
        .from('group_members')
        .insert({ group_id: group.id, user_id: user.id, role: 'admin' })
      if (memberError) throw memberError

      let coverImageUrl = null
      if (coverFile) {
        const ext = coverFile.name.split('.').pop()
        const path = `group/${group.id}/cover.${ext}`
        const { error: uploadError } = await supabase.storage.from('covers').upload(path, coverFile)
        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage.from('covers').getPublicUrl(path)
          coverImageUrl = publicUrlData.publicUrl
          await supabase.from('groups').update({ cover_image_url: coverImageUrl }).eq('id', group.id)
        }
      }

      onCreated({ ...group, cover_image_url: coverImageUrl })
    } catch (err) {
      setError(err.message || 'Grup oluşturulamadı.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full rounded-t-theme bg-background p-5 pb-8"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold">Yeni grup kur</h2>
          <button onClick={onClose} aria-label="Kapat" className="text-muted-foreground">
            <iconify-icon icon="lucide:x" class="text-xl"></iconify-icon>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-bold text-foreground">Kapak fotoğrafı</label>
            <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handlePickCover} />
            <button
              onClick={() => coverInputRef.current?.click()}
              className="flex h-24 w-full items-center justify-center overflow-hidden rounded-theme border border-dashed border-border bg-muted"
            >
              {coverPreview ? (
                <img src={coverPreview} alt="Kapak önizleme" className="h-full w-full object-cover" />
              ) : (
                <span className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                  <iconify-icon icon="lucide:image-plus" class="text-base"></iconify-icon>
                  İsteğe bağlı kapak fotoğrafı ekle
                </span>
              )}
            </button>
            <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
              Kapak fotoğrafı eklersen grubun keşfet listesinde daha dikkat çekici görünür.
            </p>
          </div>
          <div>
            <label className="mb-2 block text-sm font-bold text-foreground">Grup adı</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Derbi Odası"
              className="w-full rounded-theme border border-border bg-input px-4 py-3 text-sm text-foreground shadow-sm outline-none"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-bold text-foreground">Açıklama</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Bu grup ne hakkında?"
              className="w-full resize-none rounded-theme border border-border bg-input px-4 py-3 text-sm leading-5 text-foreground shadow-sm outline-none"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-bold text-foreground">Kategori</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`rounded-full px-3.5 py-2 text-xs font-bold ${
                    c === category
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border bg-card text-card-foreground'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="rounded-theme bg-destructive/10 px-3 py-2.5 text-xs font-semibold text-destructive">
              {error}
            </p>
          )}

          <button
            onClick={handleCreate}
            disabled={!name.trim() || saving}
            className="flex w-full items-center justify-center gap-2 rounded-theme bg-primary px-4 py-3.5 text-sm font-extrabold text-primary-foreground shadow-sm disabled:opacity-50"
          >
            {saving ? 'Oluşturuluyor…' : 'Grubu oluştur'}
          </button>
        </div>
      </div>
    </div>
  )
}

function categoryTint(ink) {
  return `color-mix(in srgb, ${ink} 14%, white)`
}

function GroupCard({ group, isMember, onToggleMembership }) {
  const navigate = useNavigate()
  const meta = CATEGORY_META[group.category] || CATEGORY_META.genel
  const memberCount = group.memberCount ?? 0
  const predictionCount = group.predictionCount ?? 0
  const todayCount = group.todayCount ?? 0

  const JoinButton = (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onToggleMembership(group)
      }}
      className={`shrink-0 rounded-theme px-3 py-2 text-xs font-bold ${
        isMember ? 'bg-secondary text-secondary-foreground' : 'border border-border bg-card text-primary'
      }`}
    >
      {isMember ? 'Üyesin' : 'Katıl'}
    </button>
  )

  if (group.cover_image_url) {
    return (
      <article
        onClick={() => navigate(`/grup/${group.id}`)}
        className="mx-5 mt-3 cursor-pointer overflow-hidden rounded-theme border border-border bg-card shadow-sm"
      >
        <div className="relative h-32 w-full overflow-hidden">
          <img src={group.cover_image_url} alt={group.name} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          <div className="absolute bottom-3 left-4 flex items-center gap-2">
            <span
              className="rounded-full bg-background/90 px-2.5 py-1 text-[10px] font-bold backdrop-blur-sm"
              style={{ color: meta.ink }}
            >
              {group.category?.toUpperCase()}
            </span>
            <span className="flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
              <iconify-icon icon="lucide:users" class="text-xs"></iconify-icon>
              {memberCount}
            </span>
          </div>
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate font-heading text-[18px] font-bold tracking-tight">{group.name}</h3>
              {group.description && (
                <p className="mt-1 line-clamp-1 text-xs leading-5 text-muted-foreground">{group.description}</p>
              )}
            </div>
            {JoinButton}
          </div>
          {predictionCount > 0 && (
            <div className="mt-3 flex items-center justify-between rounded-theme bg-muted px-3 py-2.5">
              <div className="flex items-center gap-2">
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-card"
                  style={{ color: meta.ink }}
                >
                  <iconify-icon icon="lucide:lock-keyhole" class="text-sm"></iconify-icon>
                </div>
                <p className="text-xs font-semibold text-foreground">{predictionCount} mühürlü tahmin</p>
              </div>
              {todayCount > 0 && <span className="text-[11px] font-semibold text-success">+{todayCount} bugün</span>}
            </div>
          )}
        </div>
      </article>
    )
  }

  return (
    <article
      onClick={() => navigate(`/grup/${group.id}`)}
      className="mx-5 mt-3 flex cursor-pointer items-center gap-3 rounded-theme border border-border bg-card p-3.5 shadow-sm"
    >
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-theme"
        style={{ background: categoryTint(meta.ink), color: meta.ink }}
      >
        <iconify-icon icon={meta.icon} class="text-xl"></iconify-icon>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-sm font-bold">{group.name}</h3>
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold"
            style={{ background: categoryTint(meta.ink), color: meta.ink }}
          >
            {group.category?.toUpperCase()}
          </span>
        </div>
        {group.description && <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">{group.description}</p>}
        <p className="mt-1 text-[11px] text-muted-foreground">
          {memberCount} üye
          {predictionCount > 0 && ` · ${predictionCount} tahmin`}
          {todayCount > 0 && ` · +${todayCount} bugün`}
        </p>
      </div>
      {JoinButton}
    </article>
  )
}

export default function Gruplar() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [groups, setGroups] = useState([])
  const [myGroupIds, setMyGroupIds] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [query, setQuery] = useState('')

  async function load() {
    const [{ data: groupsData }, { data: membersData }, { data: predictionsData }] = await Promise.all([
      supabase.from('groups').select('*').order('created_at', { ascending: false }),
      supabase.from('group_members').select('group_id, user_id'),
      supabase.from('predictions').select('group_id, created_at').not('group_id', 'is', null),
    ])

    const memberCounts = new Map()
    const mine = new Set()
    for (const m of membersData || []) {
      memberCounts.set(m.group_id, (memberCounts.get(m.group_id) || 0) + 1)
      if (m.user_id === user.id) mine.add(m.group_id)
    }

    const todayKey = new Date().toDateString()
    const predictionCounts = new Map()
    const todayCounts = new Map()
    for (const p of predictionsData || []) {
      predictionCounts.set(p.group_id, (predictionCounts.get(p.group_id) || 0) + 1)
      if (new Date(p.created_at).toDateString() === todayKey) {
        todayCounts.set(p.group_id, (todayCounts.get(p.group_id) || 0) + 1)
      }
    }

    setGroups(
      (groupsData || []).map((g) => ({
        ...g,
        memberCount: memberCounts.get(g.id) || 0,
        predictionCount: predictionCounts.get(g.id) || 0,
        todayCount: todayCounts.get(g.id) || 0,
      }))
    )
    setMyGroupIds(mine)
    setLoading(false)
  }

  useEffect(() => {
    if (user) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  async function handleToggleMembership(group) {
    const isMember = myGroupIds.has(group.id)
    const { error } = isMember
      ? await supabase.from('group_members').delete().eq('group_id', group.id).eq('user_id', user.id)
      : await supabase.from('group_members').insert({ group_id: group.id, user_id: user.id })
    if (error) {
      showToast(isMember ? 'Gruptan ayrılamadın, tekrar dene.' : 'Gruba katılamadın, tekrar dene.')
      return
    }
    load()
  }

  const trimmedQuery = query.trim().toLowerCase()
  const matchesQuery = (g) => !trimmedQuery || g.name.toLowerCase().includes(trimmedQuery) || g.description?.toLowerCase().includes(trimmedQuery)

  const myGroups = groups.filter((g) => myGroupIds.has(g.id) && matchesQuery(g))
  const otherGroups = groups
    .filter((g) => !myGroupIds.has(g.id) && matchesQuery(g))
    // Most active first — real signal of "somewhere worth spending time",
    // not just newest-created.
    .sort((a, b) => b.predictionCount + b.memberCount - (a.predictionCount + a.memberCount))

  return (
    <div className="min-h-screen w-full bg-background pb-28 text-foreground font-body">
      <header className="px-5 pt-12">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Topluluklar</p>
            <h1 className="mt-1 font-heading text-[25px] font-extrabold tracking-[-0.055em] text-primary">
              Gruplar
            </h1>
          </div>
        </div>

        <div className="relative mt-5">
          <iconify-icon
            icon="lucide:search"
            class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-muted-foreground"
          ></iconify-icon>
          <input
            aria-label="Grup ara"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Grup ara"
            className="h-12 w-full rounded-theme border border-border bg-input pl-11 pr-4 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>

        <button
          onClick={() => setShowCreate(true)}
          className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-theme bg-primary text-sm font-bold text-primary-foreground shadow-sm"
        >
          <iconify-icon icon="lucide:plus" class="text-lg"></iconify-icon>
          Yeni grup kur
        </button>
      </header>

      <main className="pt-6">
        {loading ? (
          <p className="px-5 text-xs text-muted-foreground">Yükleniyor…</p>
        ) : (
          <>
            <section>
              <div className="flex items-end justify-between px-5">
                <div>
                  <h2 className="font-heading text-lg font-bold tracking-tight">Gruplarım</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">Üyesi olduğun topluluklar</p>
                </div>
              </div>
              {myGroups.length === 0 ? (
                <p className="mx-5 mt-4 rounded-theme border border-dashed border-border bg-muted/60 p-4 text-center text-xs text-muted-foreground">
                  {trimmedQuery ? 'Eşleşen bir grubun yok.' : 'Henüz bir gruba katılmadın.'}
                </p>
              ) : (
                myGroups.map((g) => (
                  <GroupCard key={g.id} group={g} isMember onToggleMembership={handleToggleMembership} />
                ))
              )}
            </section>

            <section className="mt-8">
              <div className="flex items-end justify-between px-5">
                <div>
                  <h2 className="font-heading text-lg font-bold tracking-tight">Keşfet</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">En aktif topluluklar önce</p>
                </div>
              </div>
              {otherGroups.length === 0 ? (
                <p className="mx-5 mt-4 rounded-theme border border-dashed border-border bg-muted/60 p-4 text-center text-xs text-muted-foreground">
                  {trimmedQuery ? 'Eşleşen bir grup yok.' : 'Henüz keşfedilecek başka grup yok. İlk grubu sen kur.'}
                </p>
              ) : (
                otherGroups.map((g) => (
                  <GroupCard key={g.id} group={g} isMember={false} onToggleMembership={handleToggleMembership} />
                ))
              )}
            </section>
          </>
        )}
      </main>

      {showCreate && (
        <CreateGroupModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false)
            load()
          }}
        />
      )}
    </div>
  )
}
