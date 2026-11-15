import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useToast } from '../contexts/ToastContext.jsx'
import { useOnlineUsers } from '../contexts/PresenceContext.jsx'
import { supabase } from '../lib/supabase.js'
import { formatTimeUntil } from '../lib/format.js'
import { CATEGORY_META, GROUP_CATEGORY_SLUGS } from '../lib/categories.js'
import ScreenHeader from '../components/ui/ScreenHeader.jsx'
import EmptyState from '../components/ui/EmptyState.jsx'

function CreateGroupModal({ onClose, onCreated }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const coverInputRef = useRef(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('genel')
  // Same "Diğer" escape hatch TahminOlustur.jsx already has for predictions
  // — the fixed catalog (now 19 incl. "Genel") still can't cover everything
  // someone might want to name a group after, see categories.js's own note
  // on why a few real-system colors have to repeat rather than keep growing
  // this list forever.
  const [customCategoryOpen, setCustomCategoryOpen] = useState(false)
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
          category: category.trim().toLowerCase(),
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
      setError(err.message || t('groups.createFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full flex-col overflow-y-auto rounded-t-theme bg-background p-5 pb-safe-8"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold">{t('groups.newGroup')}</h2>
          <button onClick={onClose} aria-label={t('common.close')} className="text-muted-foreground">
            <iconify-icon icon="lucide:x" class="text-xl"></iconify-icon>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-bold text-foreground">{t('groups.coverLabel')}</label>
            <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handlePickCover} />
            <button
              onClick={() => coverInputRef.current?.click()}
              className="flex h-24 w-full items-center justify-center overflow-hidden rounded-theme border border-dashed border-border bg-muted"
            >
              {coverPreview ? (
                <img src={coverPreview} alt={t('groups.coverPreviewAlt')} className="h-full w-full object-cover" />
              ) : (
                <span className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                  <iconify-icon icon="lucide:image-plus" class="text-base"></iconify-icon>
                  {t('groups.coverAddCta')}
                </span>
              )}
            </button>
            <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
              {t('groups.coverHint')}
            </p>
          </div>
          <div>
            <label className="mb-2 block text-sm font-bold text-foreground">{t('groups.nameLabel')}</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('groups.namePlaceholder')}
              className="w-full rounded-theme border border-border bg-input px-4 py-3 text-sm text-foreground shadow-sm outline-none"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-bold text-foreground">{t('groups.descriptionLabel')}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder={t('groups.descriptionPlaceholder')}
              className="w-full resize-none rounded-theme border border-border bg-input px-4 py-3 text-sm leading-5 text-foreground shadow-sm outline-none"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-bold text-foreground">{t('createPrediction.categoryTitle')}</label>
            <div className="flex flex-wrap gap-2">
              {GROUP_CATEGORY_SLUGS.map((slug) => {
                const isActive = !customCategoryOpen && slug === category
                return (
                  <button
                    key={slug}
                    onClick={() => {
                      setCustomCategoryOpen(false)
                      setCategory(slug)
                    }}
                    className={`rounded-full px-3.5 py-2 text-xs font-bold ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'border border-border bg-card text-card-foreground'
                    }`}
                  >
                    {t(CATEGORY_META[slug].labelKey)}
                  </button>
                )
              })}
              <button
                onClick={() => {
                  setCustomCategoryOpen(true)
                  setCategory('')
                }}
                className={`flex items-center gap-1 rounded-full px-3.5 py-2 text-xs font-bold ${
                  customCategoryOpen
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-dashed border-border bg-card text-muted-foreground'
                }`}
              >
                <iconify-icon icon="lucide:plus" class="text-sm"></iconify-icon>
                {t('createPrediction.customCategoryCta')}
              </button>
            </div>
            {customCategoryOpen && (
              <input
                autoFocus
                value={category}
                onChange={(e) => setCategory(e.target.value.slice(0, 24))}
                placeholder={t('createPrediction.customCategoryPlaceholder')}
                maxLength={24}
                className="mt-2.5 w-full rounded-theme border border-border bg-input px-4 py-3 text-sm text-foreground outline-none"
              />
            )}
          </div>

          {error && (
            <p className="rounded-theme bg-destructive/10 px-3 py-2.5 text-xs font-semibold text-destructive">
              {error}
            </p>
          )}

          <button
            onClick={handleCreate}
            disabled={!name.trim() || !category.trim() || saving}
            className="flex w-full items-center justify-center gap-2 rounded-theme bg-primary px-4 py-3.5 text-sm font-extrabold text-primary-foreground shadow-sm disabled:opacity-50"
          >
            {saving ? t('groups.creating') : t('groups.createCta')}
          </button>
        </div>
      </div>
    </div>
  )
}

// A flat line of muted text reads as "nothing here" rather than "come back
// once there's something" — an icon + a two-line pitch does more to make an
// empty list feel like an invitation instead of a dead end.
function categoryTint(ink) {
  return `color-mix(in srgb, ${ink} 14%, white)`
}

function GroupCard({ group, isMember, onToggleMembership }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const onlineIds = useOnlineUsers()
  const meta = CATEGORY_META[group.category] || CATEGORY_META.genel
  const memberCount = group.memberCount ?? 0
  const predictionCount = group.predictionCount ?? 0
  const todayCount = group.todayCount ?? 0
  const nextOpeningAt = group.nextOpeningAt ?? null
  // Cross-references the member list this screen already fetches with the
  // app-wide presence set — cheap (both are already in memory), and it's
  // what turns a static "42 members" line into something that actually
  // reflects a group being alive right now.
  const onlineCount = (group.memberIds || []).filter((id) => onlineIds.has(id)).length

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
      {isMember ? t('groups.memberBadge') : t('groups.joinCta')}
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
              {t(meta.labelKey).toUpperCase()}
            </span>
            <span className="flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
              <iconify-icon icon="lucide:users" class="text-xs"></iconify-icon>
              {memberCount}
            </span>
            {onlineCount > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-success/90 px-2.5 py-1 text-[10px] font-semibold text-success-foreground backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-success-foreground" />
                {t('groups.onlineNow', { count: onlineCount })}
              </span>
            )}
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
                <p className="text-xs font-semibold text-foreground">{t('groups.sealedPredictionCount', { count: predictionCount })}</p>
              </div>
              {nextOpeningAt ? (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-accent">
                  <iconify-icon icon="lucide:hourglass" class="text-xs"></iconify-icon>
                  {formatTimeUntil(nextOpeningAt)}
                </span>
              ) : (
                todayCount > 0 && <span className="text-[11px] font-semibold text-success">{t('groups.todayCountInline', { count: todayCount })}</span>
              )}
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
            {t(meta.labelKey).toUpperCase()}
          </span>
        </div>
        {group.description && <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">{group.description}</p>}
        <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
          <span className="truncate">
            {t('groups.memberCount', { count: memberCount })}
            {predictionCount > 0 && ` · ${t('groups.predictionCountInline', { count: predictionCount })}`}
            {!nextOpeningAt && todayCount > 0 && ` · ${t('groups.todayCountInline', { count: todayCount })}`}
          </span>
          {onlineCount > 0 && (
            <span className="flex shrink-0 items-center gap-1 font-semibold text-success">
              · <span className="h-1.5 w-1.5 rounded-full bg-success" />
              {t('groups.onlineNow', { count: onlineCount })}
            </span>
          )}
          {nextOpeningAt && (
            <span className="flex shrink-0 items-center gap-1 font-semibold text-accent">
              · <iconify-icon icon="lucide:hourglass" class="text-xs"></iconify-icon>
              {formatTimeUntil(nextOpeningAt)}
            </span>
          )}
        </p>
      </div>
      {JoinButton}
    </article>
  )
}

export default function Gruplar() {
  const { t } = useTranslation()
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
      supabase.from('predictions').select('group_id, created_at, status, event_date').not('group_id', 'is', null),
    ])

    const memberCounts = new Map()
    const memberIdsByGroup = new Map()
    const mine = new Set()
    for (const m of membersData || []) {
      memberCounts.set(m.group_id, (memberCounts.get(m.group_id) || 0) + 1)
      if (!memberIdsByGroup.has(m.group_id)) memberIdsByGroup.set(m.group_id, [])
      memberIdsByGroup.get(m.group_id).push(m.user_id)
      if (m.user_id === user.id) mine.add(m.group_id)
    }

    const todayKey = new Date().toDateString()
    const now = new Date()
    const predictionCounts = new Map()
    const todayCounts = new Map()
    // Earliest still-sealed opening per group — the one thing worth
    // dangling in front of someone deciding whether a group is worth
    // joining: a concrete "something's about to be revealed here."
    const nextOpenings = new Map()
    for (const p of predictionsData || []) {
      predictionCounts.set(p.group_id, (predictionCounts.get(p.group_id) || 0) + 1)
      if (new Date(p.created_at).toDateString() === todayKey) {
        todayCounts.set(p.group_id, (todayCounts.get(p.group_id) || 0) + 1)
      }
      if (p.status === 'sealed' && new Date(p.event_date) > now) {
        const current = nextOpenings.get(p.group_id)
        if (!current || new Date(p.event_date) < new Date(current)) {
          nextOpenings.set(p.group_id, p.event_date)
        }
      }
    }

    setGroups(
      (groupsData || []).map((g) => ({
        ...g,
        memberCount: memberCounts.get(g.id) || 0,
        memberIds: memberIdsByGroup.get(g.id) || [],
        predictionCount: predictionCounts.get(g.id) || 0,
        todayCount: todayCounts.get(g.id) || 0,
        nextOpeningAt: nextOpenings.get(g.id) || null,
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
      showToast(isMember ? t('groups.leaveFailedToast') : t('groups.joinFailedToast'))
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
      <ScreenHeader eyebrow={t('groups.eyebrow')} title={t('nav.groups')} className="pb-0" />
      <div className="px-5 pb-5 pt-5">
        <div className="relative">
          <iconify-icon
            icon="lucide:search"
            class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-muted-foreground"
          ></iconify-icon>
          <input
            aria-label={t('groups.searchAria')}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('groups.searchPlaceholder')}
            className="h-12 w-full rounded-theme border border-border bg-input pl-11 pr-4 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>

        <button
          onClick={() => setShowCreate(true)}
          className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-theme bg-primary text-sm font-bold text-primary-foreground shadow-sm"
        >
          <iconify-icon icon="lucide:plus" class="text-lg"></iconify-icon>
          {t('groups.newGroup')}
        </button>
      </div>

      <main className="pt-6">
        {loading ? (
          <p className="px-5 text-xs text-muted-foreground">{t('common.loading')}</p>
        ) : (
          <>
            <section>
              <div className="flex items-end justify-between px-5">
                <div>
                  <h2 className="font-heading text-lg font-bold tracking-tight">{t('groups.myGroupsTitle')}</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">{t('groups.myGroupsSubtitle')}</p>
                </div>
              </div>
              {myGroups.length === 0 ? (
                <EmptyState
                  className="mx-5 mt-4"
                  icon={trimmedQuery ? 'lucide:search-x' : 'lucide:users-round'}
                  title={trimmedQuery ? t('groups.myGroupsEmptySearchTitle') : t('groups.myGroupsEmptyTitle')}
                  description={
                    trimmedQuery
                      ? null
                      : otherGroups.length > 0
                        ? t('groups.myGroupsEmptyDescWithOthers')
                        : t('groups.myGroupsEmptyDescNoOthers')
                  }
                />
              ) : (
                myGroups.map((g) => (
                  <GroupCard key={g.id} group={g} isMember onToggleMembership={handleToggleMembership} />
                ))
              )}
            </section>

            <section className="mt-8">
              <div className="flex items-end justify-between px-5">
                <div>
                  <h2 className="font-heading text-lg font-bold tracking-tight">{t('nav.discover')}</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">{t('groups.discoverSubtitle')}</p>
                </div>
              </div>
              {otherGroups.length === 0 ? (
                <EmptyState
                  className="mx-5 mt-4"
                  icon={trimmedQuery ? 'lucide:search-x' : 'lucide:compass'}
                  title={trimmedQuery ? t('groups.discoverEmptySearchTitle') : t('groups.discoverEmptyTitle')}
                  description={trimmedQuery ? null : t('groups.discoverEmptyDesc')}
                />
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
