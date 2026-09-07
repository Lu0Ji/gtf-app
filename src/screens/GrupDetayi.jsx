import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { fallbackAvatarFor } from '../lib/images.js'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useToast } from '../contexts/ToastContext.jsx'
import { useOnlineUsers } from '../contexts/PresenceContext.jsx'
import { formatDateLong, formatTimeUntil, sealLabel, timeAgo } from '../lib/format.js'
import { CATEGORY_META, GROUP_CATEGORY_SLUGS } from '../lib/categories.js'
import DifficultyChip from '../components/DifficultyChip.jsx'
import GroupChatFab from '../components/GroupChatFab.jsx'


// Fixed set an admin can pick from — null means "no limit" (today's
// behavior), the rest are minutes. Kept as a plain array (not derived from
// translations) since the persisted value is this number, not the label.
const RETENTION_OPTIONS = [
  { value: null, labelKey: 'groups.retentionAll' },
  { value: 60, labelKey: 'groups.retentionLastHour' },
  { value: 30, labelKey: 'groups.retentionLast30Min' },
  { value: 15, labelKey: 'groups.retentionLast15Min' },
]

function EditGroupModal({ group, onClose, onSaved }) {
  const { t } = useTranslation()
  const { showToast } = useToast()
  const [name, setName] = useState(group.name || '')
  const [description, setDescription] = useState(group.description || '')
  const [category, setCategory] = useState(group.category || 'genel')
  // Same "Diğer" escape hatch as the create-group form (Gruplar.jsx) and
  // TahminOlustur.jsx — opens pre-filled if the group's current category
  // isn't one of the fixed slugs (an existing custom value, or one from
  // before this option existed) so editing doesn't silently blank it out.
  const [customCategoryOpen, setCustomCategoryOpen] = useState(
    Boolean(group.category) && !GROUP_CATEGORY_SLUGS.includes(group.category)
  )
  const [retention, setRetention] = useState(group.message_retention_minutes ?? null)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim() || !category.trim() || saving) return
    setSaving(true)
    const basePayload = { name: name.trim(), description: description.trim() || null, category: category.trim().toLowerCase() }
    let { error } = await supabase
      .from('groups')
      .update({ ...basePayload, message_retention_minutes: retention })
      .eq('id', group.id)
    let retentionSaved = true
    // message_retention_minutes is a newer column (see supabase/schema.sql)
    // that may not have been migrated to the live DB yet — same
    // base-payload-plus-optional-key retry pattern as TahminOlustur.jsx's
    // media fields, so the rest of the edit still goes through.
    if (error?.code === 'PGRST204') {
      retentionSaved = false
      ;({ error } = await supabase.from('groups').update(basePayload).eq('id', group.id))
    }
    setSaving(false)
    if (error) {
      showToast(t('groups.updateFailedToast'))
      return
    }
    if (!retentionSaved) showToast(t('common.featureNotEnabledYet'))
    onSaved({ ...basePayload, message_retention_minutes: retentionSaved ? retention : group.message_retention_minutes })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full rounded-t-theme bg-background p-5 pb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold">{t('groups.editTitle')}</h2>
          <button onClick={onClose} aria-label={t('common.close')} className="text-muted-foreground">
            <iconify-icon icon="lucide:x" class="text-xl"></iconify-icon>
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-bold text-foreground">{t('groups.nameLabel')}</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-theme border border-border bg-input px-4 py-3 text-sm text-foreground shadow-sm outline-none"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-bold text-foreground">{t('groups.descriptionLabel')}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
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
          <div>
            <label className="mb-2 block text-sm font-bold text-foreground">{t('groups.messageRetentionTitle')}</label>
            <p className="mb-2 text-[11px] leading-4 text-muted-foreground">{t('groups.messageRetentionSubtitle')}</p>
            <div className="flex flex-wrap gap-2">
              {RETENTION_OPTIONS.map((opt) => (
                <button
                  key={opt.value ?? 'all'}
                  onClick={() => setRetention(opt.value)}
                  className={`rounded-full px-3.5 py-2 text-xs font-bold ${
                    opt.value === retention
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border bg-card text-card-foreground'
                  }`}
                >
                  {t(opt.labelKey)}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={!name.trim() || !category.trim() || saving}
            className="flex w-full items-center justify-center gap-2 rounded-theme bg-primary px-4 py-3.5 text-sm font-extrabold text-primary-foreground shadow-sm disabled:opacity-50"
          >
            {saving ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </div>
    </div>
  )
}

function GroupPredictionCard({ prediction, onOpen }) {
  const { t } = useTranslation()
  const author = prediction.profiles
  const isVerified = prediction.status === 'verified_correct' || prediction.status === 'verified_incorrect'
  const isCorrect = prediction.status === 'verified_correct'
  const categoryMeta = CATEGORY_META[prediction.category] || CATEGORY_META.genel

  return (
    <button
      onClick={onOpen}
      className="flex w-full flex-col gap-2.5 rounded-theme border border-border bg-card p-3.5 text-left shadow-sm"
    >
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full">
          <img src={author?.avatar_url || fallbackAvatarFor(prediction.author_id)} alt={author?.display_name} className="h-full w-full object-cover" />
        </div>
        <p className="min-w-0 flex-1 truncate text-xs font-semibold text-muted-foreground">
          {author?.display_name || t('common.unknownUser')} · {timeAgo(prediction.created_at)}
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
            {isCorrect ? t('home.verified') : t('home.notRealized')}
          </span>
          <span>{formatDateLong(prediction.verified_at)}</span>
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-theme bg-muted px-3 py-2 text-[11px] font-semibold text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="rounded-full bg-card px-2 py-0.5 text-[10px] font-bold text-primary">
              {t(categoryMeta.labelKey).toUpperCase()}
            </span>
            <DifficultyChip tier={prediction.difficulty_tier} />
          </div>
          <span>{sealLabel(prediction.event_date)}</span>
        </div>
      )}
    </button>
  )
}

export default function GrupDetayi() {
  const { t } = useTranslation()
  const { groupId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useToast()
  const onlineIds = useOnlineUsers()
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
  const onlineCount = members.filter((m) => onlineIds.has(m.user_id)).length

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
      showToast(t('groups.roleUpdateFailedToast'))
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
      showToast(t('groups.memberRemoveFailedToast'))
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
      showToast(isMember ? t('groups.leaveFailedToast') : t('groups.joinFailedToast'))
    } else {
      await load()
    }
    setMembershipBusy(false)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background font-body text-foreground">
        <p className="text-xs text-muted-foreground">{t('common.loading')}</p>
      </div>
    )
  }

  if (!group) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center gap-3 bg-background px-8 text-center font-body text-foreground">
        <p className="text-sm font-bold">{t('groups.notFoundTitle')}</p>
        <button onClick={() => navigate(-1)} className="rounded-theme bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">
          {t('common.backAria')}
        </button>
      </div>
    )
  }

  const categoryMeta = CATEGORY_META[group.category] || CATEGORY_META.genel
  const groupResolved = predictions.filter((p) => p.status === 'verified_correct' || p.status === 'verified_incorrect')
  const groupVerifiedCount = groupResolved.length
  const groupAccuracyPct =
    groupVerifiedCount > 0
      ? Math.round((groupResolved.filter((p) => p.status === 'verified_correct').length / groupVerifiedCount) * 100)
      : null
  const nextOpening = predictions
    .filter((p) => p.status === 'sealed' && new Date(p.event_date) > new Date())
    .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))[0]
  // Countdown framing ("3 gün sonra"), not a bare date — the point of
  // surfacing this at all is to make someone curious enough to come back,
  // and a date on its own doesn't do that the way a ticking countdown does.
  const nextOpeningLabel = nextOpening ? formatTimeUntil(nextOpening.event_date) : '—'

  return (
    <div className="min-h-screen w-full bg-background pb-28 text-foreground font-body">
      <header className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between px-5 pt-12">
        <button
          aria-label={t('common.backAria')}
          onClick={() => navigate(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-theme border border-border bg-card/90 text-foreground shadow-sm backdrop-blur-sm"
        >
          <iconify-icon icon="lucide:arrow-left" class="text-[19px]"></iconify-icon>
        </button>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              aria-label={t('groups.editTitle')}
              onClick={() => setShowEdit(true)}
              className="flex h-10 w-10 items-center justify-center rounded-theme border border-border bg-card/90 text-foreground shadow-sm backdrop-blur-sm"
            >
              <iconify-icon icon="lucide:pencil" class="text-[17px]"></iconify-icon>
            </button>
          )}
        </div>
      </header>

      {group.cover_image_url ? (
        <div className="relative h-48 w-full overflow-hidden bg-muted">
          <img src={group.cover_image_url} alt={group.name} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
          <div className="absolute bottom-4 left-5 flex items-center gap-2">
            <span
              className="rounded-full bg-background/90 px-2.5 py-1 text-[10px] font-bold backdrop-blur-sm"
              style={{ color: categoryMeta.ink }}
            >
              {t(categoryMeta.labelKey).toUpperCase()}
            </span>
            <span className="flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
              <iconify-icon icon="lucide:users" class="text-xs"></iconify-icon>
              {members.length}
            </span>
          </div>
        </div>
      ) : (
        <div
          className="flex h-48 w-full items-center justify-center"
          style={{ background: `color-mix(in srgb, ${categoryMeta.ink} 16%, white)`, color: categoryMeta.ink }}
        >
          <iconify-icon icon={categoryMeta.icon} class="text-5xl"></iconify-icon>
        </div>
      )}

      <main className="px-5 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {!group.cover_image_url && (
              <span
                className="rounded-full px-2.5 py-1 text-[10px] font-bold"
                style={{ background: `color-mix(in srgb, ${categoryMeta.ink} 14%, white)`, color: categoryMeta.ink }}
              >
                {t(categoryMeta.labelKey).toUpperCase()}
              </span>
            )}
            <h1 className="mt-2 font-heading text-[22px] font-extrabold tracking-[-0.04em]">{group.name}</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              {t('groups.memberCount', { count: members.length })} · {t('groups.foundedOn', { date: formatDateLong(group.created_at) })}
            </p>
          </div>
          <button
            onClick={handleToggleMembership}
            disabled={membershipBusy}
            className={`shrink-0 rounded-theme px-4 py-2.5 text-xs font-bold disabled:opacity-60 ${
              isMember ? 'bg-secondary text-secondary-foreground' : 'bg-primary text-primary-foreground'
            }`}
          >
            {isMember ? t('groups.memberBadge') : t('groups.joinCta')}
          </button>
        </div>

        {group.description && (
          <p className="mt-4 text-sm leading-6 text-foreground">{group.description}</p>
        )}

        {members.length > 0 && (
          <button
            onClick={() => document.getElementById('grup-uyeler')?.scrollIntoView({ behavior: 'smooth' })}
            className="mt-4 flex items-center gap-2"
          >
            <div className="flex -space-x-2">
              {members.slice(0, 5).map((m) => (
                <div key={m.user_id} className="relative h-8 w-8 overflow-hidden rounded-full border-2 border-background bg-muted">
                  <img
                    src={m.profiles.avatar_url || fallbackAvatarFor(m.user_id)}
                    alt={m.profiles.display_name}
                    className="h-full w-full object-cover"
                  />
                  {onlineIds.has(m.user_id) && (
                    <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full border border-background bg-success" />
                  )}
                </div>
              ))}
            </div>
            <span className="text-xs font-semibold text-muted-foreground">
              {members.length > 5
                ? t('groups.moreMembers', { count: members.length - 5 })
                : members.length === 1
                  ? t('groups.firstMemberYou')
                  : t('groups.memberCount', { count: members.length })}
              {onlineCount > 0 && (
                <span className="ml-1.5 text-success">· {t('groups.onlineNow', { count: onlineCount })}</span>
              )}
            </span>
          </button>
        )}

        {predictions.length > 0 && (
          <section className="mt-6 overflow-hidden rounded-theme bg-primary text-primary-foreground shadow-sm">
            <div className="flex items-start justify-between px-5 pt-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-primary-foreground/75">
                  {t('groups.communityPerformance')}
                </p>
                <div className="mt-1 flex items-end gap-2">
                  <span className="font-heading text-[36px] font-extrabold leading-none tracking-[-0.08em]">
                    {groupAccuracyPct !== null ? `%${groupAccuracyPct}` : '—'}
                  </span>
                  <span className="mb-1 text-xs font-semibold text-primary-foreground/80">{t('groups.accuracyRateLabel')}</span>
                </div>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-primary-foreground/25 bg-primary-foreground/10">
                <iconify-icon icon="lucide:chart-no-axes-combined" class="text-xl"></iconify-icon>
              </div>
            </div>
            <div className="mx-5 mt-4 h-px bg-primary-foreground/20" />
            <div className="grid grid-cols-3 gap-2 px-5 py-4">
              <div>
                <p className="text-[10px] font-medium text-primary-foreground/70">{t('groups.totalPredictionsLabel')}</p>
                <p className="mt-1 text-sm font-bold">{predictions.length}</p>
              </div>
              <div>
                <p className="text-[10px] font-medium text-primary-foreground/70">{t('groups.verifiedLabel')}</p>
                <p className="mt-1 text-sm font-bold">{groupVerifiedCount}</p>
              </div>
              <div>
                <p className="text-[10px] font-medium text-primary-foreground/70">{t('groups.upcomingLabel')}</p>
                <p className="mt-1 text-sm font-bold">{nextOpeningLabel}</p>
              </div>
            </div>
          </section>
        )}

        <section className="mt-7">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-base font-bold tracking-tight">{t('groups.predictionsCount', { count: predictions.length })}</h2>
            {isMember && (
              <button
                onClick={() => navigate('/tahmin-olustur', { state: { groupId: group.id, groupName: group.name } })}
                className="flex items-center gap-1.5 rounded-theme bg-primary px-3 py-2 text-[11px] font-bold text-primary-foreground"
              >
                <iconify-icon icon="lucide:plus" class="text-sm"></iconify-icon>
                {t('nav.createPrediction')}
              </button>
            )}
          </div>
          {predictions.length === 0 ? (
            <div className="mt-3 flex flex-col items-center gap-2 rounded-theme border border-dashed border-border bg-muted/60 p-6 text-center">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-full bg-card shadow-sm"
                style={{ color: categoryMeta.ink }}
              >
                <iconify-icon icon="lucide:lock-keyhole" class="text-xl"></iconify-icon>
              </div>
              <p className="text-sm font-bold text-foreground">
                {isMember ? t('groups.noSealedRecordYet') : t('groups.predictionsLocked')}
              </p>
              <p className="text-xs leading-5 text-muted-foreground">
                {isMember ? t('groups.noSealedRecordDescMember') : t('groups.noSealedRecordDescNonMember')}
              </p>
            </div>
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

        <section id="grup-uyeler" className="mt-7 scroll-mt-5">
          <h2 className="font-heading text-base font-bold tracking-tight">{t('groups.membersCount', { count: members.length })}</h2>
          {members.length === 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">{t('groups.noMembersYet')}</p>
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
                          src={m.profiles.avatar_url || fallbackAvatarFor(m.user_id)}
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
                        {t('groups.adminBadge')}
                      </span>
                    )}
                    {isAdmin && m.user_id !== user?.id && (
                      <button
                        aria-label={t('groups.memberOptionsAria')}
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
                        {m.role === 'admin' ? t('groups.demoteFromAdmin') : t('groups.promoteToAdmin')}
                      </button>
                      <button
                        onClick={() => handleKickMember(m)}
                        disabled={memberActionBusy}
                        className="flex-1 rounded-theme bg-destructive/10 px-3 py-2 text-[11px] font-bold text-destructive disabled:opacity-60"
                      >
                        {t('groups.removeFromGroup')}
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

      {isMember && <GroupChatFab groupId={group.id} groupName={group.name} />}
    </div>
  )
}
