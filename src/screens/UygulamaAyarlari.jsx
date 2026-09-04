import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useToast } from '../contexts/ToastContext.jsx'
import { useTheme } from '../contexts/ThemeContext.jsx'
import { useUserSettings } from '../hooks/useUserSettings.js'
import { supabase } from '../lib/supabase.js'
import { getPushSubscriptionState, subscribeToPush, unsubscribeFromPush } from '../lib/pushNotifications.js'
import { CATEGORY_META, CATEGORY_SLUGS } from '../lib/categories.js'
import { SUPPORTED_LANGUAGES } from '../i18n/index.js'
import DetailHeader from '../components/ui/DetailHeader.jsx'

// value stays the code ThemeContext/useTheme actually store ('system' /
// 'light' / 'dark') — language-independent already; labelKey/descKey are
// what render via t().
const THEME_OPTIONS = [
  { value: 'system', labelKey: 'appSettings.themeSystem', descKey: 'appSettings.themeSystemDesc', icon: 'lucide:smartphone' },
  { value: 'light', labelKey: 'appSettings.themeLight', descKey: 'appSettings.themeLightDesc', icon: 'lucide:sun' },
  { value: 'dark', labelKey: 'appSettings.themeDark', descKey: 'appSettings.themeDarkDesc', icon: 'lucide:moon' },
]

const FONT_SCALE_OPTIONS = [
  { value: 90, labelKey: 'appSettings.fontScaleSmall' },
  { value: 100, labelKey: 'appSettings.fontScaleDefault' },
  { value: 112, labelKey: 'appSettings.fontScaleLarge' },
  { value: 125, labelKey: 'appSettings.fontScaleExtraLarge' },
]

// Curated subset (not the full CATEGORY_SLUGS list) — matches the six
// real_world_events kinds actually live so far (see Kesfet.jsx's ranking
// comment). Stored as stable slugs in settings.content.interests, not
// display labels, same labelKey pattern as CATEGORY_META elsewhere.
const INTEREST_SLUGS = CATEGORY_SLUGS.slice(0, 6)

function Toggle({ on }) {
  return (
    <span
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ease-out ${
        on ? 'bg-primary' : 'bg-muted'
      }`}
    >
      <span
        className={`h-4 w-4 rounded-full shadow-sm transition-transform duration-200 ease-out ${
          on ? 'translate-x-6 bg-primary-foreground' : 'translate-x-1 bg-card'
        }`}
      />
    </span>
  )
}

function Row({ icon, iconTone = 'bg-muted text-primary', title, subtitle, right, last, badge, onClick }) {
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp
      onClick={onClick}
      className={`flex w-full items-center gap-3 p-4 text-left ${onClick ? 'transition-colors duration-150 active:bg-muted' : ''} ${last ? '' : 'border-b border-border'}`}
    >
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-theme ${iconTone}`}>
        <iconify-icon icon={icon} class="text-lg"></iconify-icon>
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-sm font-bold">
          {title}
          {badge && (
            <span className="rounded-full bg-success/10 px-2 py-0.5 text-[9px] font-bold text-success">{badge}</span>
          )}
        </span>
        {subtitle && <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{subtitle}</span>}
      </span>
      {right}
    </Comp>
  )
}

function buildAccountRows(t, email, onChangePassword, onOpenContact, onOpenMfa, onOpenFreeze, onOpenSessions) {
  return [
    { icon: 'lucide:mail', title: t('settings.emailPhone.title'), subtitle: email || t('common.loading'), chevron: true, onClick: onOpenContact },
    { icon: 'lucide:key-round', title: t('appSettings.changePasswordRowTitle'), subtitle: t('appSettings.changePasswordRowSubtitle'), chevron: true, onClick: onChangePassword },
    { icon: 'lucide:badge-check', title: t('settings.twoFactor.heading'), subtitle: t('appSettings.twoFactorRowSubtitle'), chevron: true, onClick: onOpenMfa },
    { icon: 'lucide:monitor-smartphone', title: t('settings.activeSessions.title'), subtitle: t('appSettings.activeSessionsRowSubtitle'), chevron: true, onClick: onOpenSessions },
    { icon: 'lucide:pause-circle', iconTone: 'bg-muted text-muted-foreground', title: t('appSettings.freezeRowTitle'), subtitle: t('appSettings.freezeRowSubtitle'), chevron: true, onClick: onOpenFreeze },
  ]
}

const LEGAL_URL = 'https://lu0ji.github.io/gtf-app/legal.html'

function buildSupportRows(t) {
  return [
    { icon: 'lucide:sparkles', title: t('appSettings.onboardingRowTitle'), route: '/rehber' },
    { icon: 'lucide:help-circle', title: t('help.title'), route: '/ayarlar/yardim-merkezi' },
    { icon: 'lucide:scale', title: t('community.title'), route: '/ayarlar/topluluk-kurallari' },
    { icon: 'lucide:shield', title: t('appSettings.privacyPolicyTitle'), url: LEGAL_URL + '#g1' },
    { icon: 'lucide:file-text', title: t('appSettings.termsTitle'), url: LEGAL_URL + '#k1' },
  ]
}

function PickerSheet({ title, options, value, onSelect, onClose }) {
  const { t } = useTranslation()
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full rounded-t-theme bg-background p-5 pb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold">{title}</h2>
          <button onClick={onClose} aria-label={t('common.close')} className="text-muted-foreground">
            <iconify-icon icon="lucide:x" class="text-xl"></iconify-icon>
          </button>
        </div>
        <div className="overflow-hidden rounded-theme border border-border bg-card shadow-sm">
          {options.map((opt, i) => {
            const isSelected = opt.value === value
            return (
              <button
                key={opt.value}
                onClick={() => {
                  onSelect(opt.value)
                  onClose()
                }}
                className={`flex w-full items-center gap-3 px-4 py-3.5 text-left ${
                  i < options.length - 1 ? 'border-b border-border' : ''
                }`}
              >
                {opt.icon && (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-theme bg-muted text-primary">
                    <iconify-icon icon={opt.icon} class="text-base"></iconify-icon>
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold">{t(opt.labelKey)}</span>
                  {opt.descKey && <span className="mt-0.5 block text-[11px] text-muted-foreground">{t(opt.descKey)}</span>}
                </span>
                {isSelected && <iconify-icon icon="lucide:check" class="text-lg text-primary"></iconify-icon>}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// options entries can be a plain string (rendered as-is) or a
// { value, label } pair (for slug-backed pickers like interests, where the
// stored value must stay a stable slug but the shown text is translated).
function TagPickerSheet({ title, subtitle, options, values, onToggle, onClose }) {
  const { t } = useTranslation()
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full rounded-t-theme bg-background p-5 pb-8">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold">{title}</h2>
          <button onClick={onClose} aria-label={t('common.close')} className="text-muted-foreground">
            <iconify-icon icon="lucide:x" class="text-xl"></iconify-icon>
          </button>
        </div>
        {subtitle && <p className="mb-4 text-[11px] text-muted-foreground">{subtitle}</p>}
        <div className="flex flex-wrap gap-2">
          {options.map((opt) => {
            const value = typeof opt === 'string' ? opt : opt.value
            const label = typeof opt === 'string' ? opt : opt.label
            const selected = values.some((v) => v.toLowerCase() === value.toLowerCase())
            return (
              <button
                key={value}
                onClick={() => onToggle(value)}
                className={`rounded-full px-3.5 py-2 text-xs font-bold ${
                  selected ? 'bg-primary text-primary-foreground' : 'border border-border bg-card text-foreground'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function WordListSheet({ title, subtitle, words, onAdd, onRemove, onClose }) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState('')

  function submit() {
    const value = draft.trim()
    if (!value) return
    onAdd(value)
    setDraft('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full rounded-t-theme bg-background p-5 pb-8">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold">{title}</h2>
          <button onClick={onClose} aria-label={t('common.close')} className="text-muted-foreground">
            <iconify-icon icon="lucide:x" class="text-xl"></iconify-icon>
          </button>
        </div>
        {subtitle && <p className="mb-4 text-[11px] text-muted-foreground">{subtitle}</p>}
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit()
            }}
            placeholder={t('appSettings.mutedWordPlaceholder')}
            className="h-11 flex-1 rounded-theme border border-border bg-input px-3.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <button
            onClick={submit}
            aria-label={t('appSettings.mutedWordAddAria')}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-theme bg-primary text-primary-foreground"
          >
            <iconify-icon icon="lucide:plus" class="text-lg"></iconify-icon>
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {words.length === 0 && <p className="text-xs text-muted-foreground">{t('appSettings.mutedWordsEmpty')}</p>}
          {words.map((w) => (
            <span key={w} className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-semibold">
              {w}
              <button onClick={() => onRemove(w)} aria-label={t('appSettings.mutedWordRemoveAria', { word: w })}>
                <iconify-icon icon="lucide:x" class="text-sm"></iconify-icon>
              </button>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function SectionHeader({ icon, title, subtitle }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <div className="flex h-7 w-7 items-center justify-center rounded-theme bg-secondary text-primary">
        <iconify-icon icon={icon} class="text-sm"></iconify-icon>
      </div>
      <div>
        <h2 className="font-heading text-[15px] font-bold tracking-tight">{title}</h2>
        <p className="text-[10px] text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  )
}

function RowList({ rows }) {
  return (
    <div className="overflow-hidden rounded-theme border border-border bg-card shadow-sm">
      {rows.map((row, i) => (
        <Row
          key={row.title}
          icon={row.icon}
          iconTone={row.iconTone}
          title={row.title}
          subtitle={row.subtitle}
          badge={row.badge}
          last={i === rows.length - 1}
          onClick={row.onClick}
          right={
            row.toggle !== undefined ? (
              <Toggle on={row.toggle} />
            ) : row.chevron ? (
              <iconify-icon icon="lucide:chevron-right" class="text-lg text-muted-foreground"></iconify-icon>
            ) : null
          }
        />
      ))}
    </div>
  )
}

function bytesLabel(bytes) {
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
}

function localCacheBytes() {
  let total = 0
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      total += (key?.length || 0) + (localStorage.getItem(key)?.length || 0)
    }
  } catch {
    return 0
  }
  return total
}

export default function UygulamaAyarlari() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { signOut, user, profile, refreshProfile } = useAuth()
  const { showToast } = useToast()
  const { theme, setTheme, fontScale, setFontScale, reduceMotion, setReduceMotion } = useTheme()
  const { settings, update: updateSettings } = useUserSettings()
  const accountRows = buildAccountRows(
    t,
    user?.email,
    () => navigate('/ayarlar/sifre-degistir'),
    () => navigate('/ayarlar/eposta-telefon'),
    () => navigate('/ayarlar/iki-asamali-dogrulama'),
    () => navigate('/ayarlar/hesabi-dondur'),
    () => navigate('/ayarlar/aktif-oturumlar')
  )
  const supportRows = buildSupportRows(t)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [openPicker, setOpenPicker] = useState(null)
  const [privacyBusy, setPrivacyBusy] = useState(false)
  const [blockedCount, setBlockedCount] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)
  const [exporting, setExporting] = useState(false)
  const [cacheBytes, setCacheBytes] = useState(0)
  const [inviteCopied, setInviteCopied] = useState(false)
  // 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed' | null (still checking)
  const [pushState, setPushState] = useState(null)
  const [pushBusy, setPushBusy] = useState(false)

  useEffect(() => {
    getPushSubscriptionState().then(setPushState)
  }, [])

  async function handleTogglePush() {
    if (pushBusy || !user) return
    setPushBusy(true)
    try {
      if (pushState === 'subscribed') {
        await unsubscribeFromPush()
        setPushState('unsubscribed')
      } else {
        await subscribeToPush(user.id)
        setPushState('subscribed')
        showToast(t('appSettings.pushEnabledToast'), 'success')
      }
    } catch (e) {
      showToast(e.message || t('appSettings.pushFailedToast'))
      setPushState(await getPushSubscriptionState())
    } finally {
      setPushBusy(false)
    }
  }

  async function handleCopyInvite() {
    const message = t('appSettings.inviteMessage', { username: profile?.username })
    try {
      await navigator.clipboard.writeText(message)
      setInviteCopied(true)
      showToast(t('appSettings.inviteCopiedToast'), 'success')
      setTimeout(() => setInviteCopied(false), 2000)
    } catch {
      showToast(t('appSettings.copyFailedToast'))
    }
  }

  useEffect(() => {
    setCacheBytes(localCacheBytes())
  }, [])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    Promise.all([
      supabase.from('blocks').select('*', { count: 'exact', head: true }).eq('blocker_id', user.id),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user.id).eq('status', 'pending'),
    ]).then(([blockedRes, pendingRes]) => {
      if (cancelled) return
      setBlockedCount(blockedRes.count ?? 0)
      setPendingCount(pendingRes.count ?? 0)
    })
    return () => {
      cancelled = true
    }
  }, [user])

  const themeLabel = t(THEME_OPTIONS.find((o) => o.value === theme)?.labelKey || 'appSettings.themeSystem')
  const fontScaleLabel = t(FONT_SCALE_OPTIONS.find((o) => o.value === fontScale)?.labelKey || 'appSettings.fontScaleDefault')
  const activeLanguage = i18n.resolvedLanguage || i18n.language
  const appLanguageLabel = SUPPORTED_LANGUAGES.find((l) => l.code === activeLanguage)?.nativeName || activeLanguage

  async function handleSignOut() {
    await signOut()
    navigate('/giris', { replace: true })
  }

  async function handleDeleteAccount() {
    if (deleting) return
    setDeleting(true)
    const { error } = await supabase.functions.invoke('delete-account')
    if (error) {
      showToast(t('appSettings.deleteAccountFailedToast'))
      setDeleting(false)
      return
    }
    await signOut()
    navigate('/giris', { replace: true })
  }

  async function handleTogglePrivate() {
    if (privacyBusy || !profile) return
    setPrivacyBusy(true)
    const next = !profile.is_private
    const { error } = await supabase.from('profiles').update({ is_private: next }).eq('id', user.id)
    if (error) {
      showToast(t('appSettings.changeSaveFailedToast'))
    } else {
      await refreshProfile()
    }
    setPrivacyBusy(false)
  }

  function toggleNotification(key) {
    updateSettings('notifications', { [key]: !settings.notifications[key] })
  }

  // Case-insensitive match: interests saved before this screen switched
  // from Turkish display labels ("Spor") to stable slugs ("spor") are still
  // sitting in some accounts' settings.content.interests — comparing
  // loosely here means toggling off an old capitalized entry actually
  // removes it instead of adding a second, differently-cased duplicate.
  function toggleInterest(value) {
    const current = settings.content.interests
    const isSelected = current.some((v) => v.toLowerCase() === value.toLowerCase())
    const next = isSelected ? current.filter((v) => v.toLowerCase() !== value.toLowerCase()) : [...current, value]
    updateSettings('content', { interests: next })
  }

  function addMutedWord(word) {
    const current = settings.content.mutedWords
    if (current.includes(word)) return
    updateSettings('content', { mutedWords: [...current, word] })
  }

  function removeMutedWord(word) {
    updateSettings('content', { mutedWords: settings.content.mutedWords.filter((w) => w !== word) })
  }

  async function handleExportData() {
    if (exporting || !user) return
    setExporting(true)
    const [predictionsRes, commentsRes, likesRes, savesRes, followsRes] = await Promise.all([
      supabase.from('predictions').select('*').eq('author_id', user.id),
      supabase.from('prediction_comments').select('*').eq('author_id', user.id),
      supabase.from('prediction_likes').select('*').eq('user_id', user.id),
      supabase.from('prediction_saves').select('*').eq('user_id', user.id),
      supabase.from('follows').select('following_id, status, created_at').eq('follower_id', user.id),
    ])
    const payload = {
      exported_at: new Date().toISOString(),
      profile,
      predictions: predictionsRes.data || [],
      comments: commentsRes.data || [],
      likes: likesRes.data || [],
      saves: savesRes.data || [],
      following: followsRes.data || [],
    }
    try {
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `gtf-verilerim-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      showToast(t('appSettings.exportSuccessToast'), 'success')
    } catch {
      showToast(t('appSettings.exportFailedToast'))
    }
    setExporting(false)
  }

  function handleClearCache() {
    try {
      const keep = new Set(['gtf-appearance'])
      const toRemove = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && !keep.has(key) && !key.startsWith('sb-')) toRemove.push(key)
      }
      toRemove.forEach((key) => localStorage.removeItem(key))
      setCacheBytes(localCacheBytes())
      showToast(t('appSettings.clearCacheSuccessToast'), 'success')
    } catch {
      showToast(t('appSettings.clearCacheFailedToast'))
    }
  }

  return (
    <div className="min-h-screen w-full bg-background pb-10 text-foreground font-body">
      <DetailHeader title={t('appSettings.title')} subtitle={t('appSettings.subtitle')} />

      <main className="px-5 pb-8 pt-6">
        <section className="rounded-theme border-2 border-accent bg-accent/10 p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-theme bg-accent text-accent-foreground">
              <iconify-icon icon="lucide:gift" class="text-base"></iconify-icon>
            </span>
            <div>
              <h2 className="text-sm font-bold text-foreground">{t('appSettings.inviteTitle')}</h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{t('appSettings.inviteSubtitle')}</p>
            </div>
          </div>
          <button
            onClick={handleCopyInvite}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-theme bg-accent py-2.5 text-xs font-bold text-accent-foreground"
          >
            <iconify-icon icon={inviteCopied ? 'lucide:check' : 'lucide:copy'} class="text-sm"></iconify-icon>
            {inviteCopied ? t('record.copiedLabel') : t('appSettings.inviteCopyCta')}
          </button>
        </section>

        <section className="mt-8">
          <SectionHeader icon="lucide:shield-check" title={t('appSettings.accountSecurityTitle')} subtitle={t('appSettings.accountSecuritySubtitle')} />
          <RowList rows={accountRows} />
        </section>

        <section className="mt-8">
          <SectionHeader icon="lucide:lock-keyhole" title={t('appSettings.privacyTitle')} subtitle={t('appSettings.privacySubtitle')} />
          <div className="overflow-hidden rounded-theme border border-border bg-card shadow-sm">
            <Row
              icon="lucide:user-round-lock"
              title={t('appSettings.privateAccountTitle')}
              subtitle={profile?.is_private ? t('appSettings.privateAccountOnSubtitle') : t('appSettings.privateAccountOffSubtitle')}
              onClick={handleTogglePrivate}
              right={<Toggle on={!!profile?.is_private} />}
            />
            <Row
              icon="lucide:eye"
              title={t('settings.predictionVisibility.heading')}
              subtitle={t('appSettings.predictionVisibilityRowSubtitle')}
              onClick={() => navigate('/ayarlar/tahmin-gorunurlugu')}
              right={<iconify-icon icon="lucide:chevron-right" class="text-lg text-muted-foreground"></iconify-icon>}
            />
            <Row
              icon="lucide:user-round-check"
              title={t('settings.followRequests.title')}
              subtitle={pendingCount === 0 ? t('settings.followRequests.noneSubtitle') : t('settings.followRequests.countSubtitle', { count: pendingCount })}
              badge={pendingCount > 0 ? String(pendingCount) : undefined}
              onClick={() => navigate('/ayarlar/takip-istekleri')}
              right={<iconify-icon icon="lucide:chevron-right" class="text-lg text-muted-foreground"></iconify-icon>}
            />
            <Row
              icon="lucide:mail-check"
              title={t('settings.messageRequests.title')}
              subtitle={t('appSettings.messageRequestsRowSubtitle')}
              onClick={() => navigate('/ayarlar/mesaj-istekleri')}
              right={<iconify-icon icon="lucide:chevron-right" class="text-lg text-muted-foreground"></iconify-icon>}
            />
            <Row
              icon="lucide:at-sign"
              title={t('settings.mentions.title')}
              subtitle={t('appSettings.mentionsRowSubtitle')}
              onClick={() => navigate('/ayarlar/etiketleme-bahsetmeler')}
              right={<iconify-icon icon="lucide:chevron-right" class="text-lg text-muted-foreground"></iconify-icon>}
            />
            <Row
              icon="lucide:radio"
              title={t('appSettings.showOnlineTitle')}
              subtitle={t('appSettings.showOnlineSubtitle')}
              onClick={() => updateSettings('privacy', { showOnline: !settings.privacy.showOnline })}
              right={<Toggle on={settings.privacy.showOnline} />}
            />
            <Row
              icon="lucide:ban"
              title={t('settings.blockedAccounts.title')}
              subtitle={blockedCount === 0 ? t('settings.blockedAccounts.noneSubtitle') : t('settings.blockedAccounts.countSubtitle', { count: blockedCount })}
              last
              onClick={() => navigate('/ayarlar/engellenenler')}
              right={<iconify-icon icon="lucide:chevron-right" class="text-lg text-muted-foreground"></iconify-icon>}
            />
          </div>
        </section>

        <section className="mt-8">
          <SectionHeader icon="lucide:bell-ring" title={t('appSettings.notificationsTitle')} subtitle={t('appSettings.notificationsSubtitle')} />
          <RowList
            rows={[
              {
                icon: 'lucide:bell',
                iconTone: pushState === 'subscribed' ? 'bg-success/10 text-success' : 'bg-muted text-primary',
                title: t('appSettings.pushTitle'),
                subtitle:
                  pushState === 'unsupported'
                    ? t('appSettings.pushUnsupported')
                    : pushState === 'denied'
                      ? t('appSettings.pushDenied')
                      : pushState === 'subscribed'
                        ? t('appSettings.pushOn')
                        : t('appSettings.pushOff'),
                toggle: pushState === 'subscribed',
                onClick: pushState === 'unsupported' || pushState === 'denied' || pushBusy ? undefined : handleTogglePush,
              },
              { icon: 'lucide:heart', title: t('appSettings.likesTitle'), subtitle: t('appSettings.likesSubtitle'), toggle: settings.notifications.likes, onClick: () => toggleNotification('likes') },
              { icon: 'lucide:message-circle', title: t('appSettings.commentsTitle'), subtitle: t('appSettings.commentsSubtitle'), toggle: settings.notifications.comments, onClick: () => toggleNotification('comments') },
              { icon: 'lucide:user-plus', title: t('appSettings.newFollowersTitle'), subtitle: t('appSettings.newFollowersSubtitle'), toggle: settings.notifications.newFollowers, onClick: () => toggleNotification('newFollowers') },
              { icon: 'lucide:users-round', title: t('appSettings.groupActivityTitle'), subtitle: t('appSettings.groupActivitySubtitle'), toggle: settings.notifications.groupActivity, onClick: () => toggleNotification('groupActivity') },
              { icon: 'lucide:send', title: t('nav.messages'), subtitle: t('appSettings.messagesNotifSubtitle'), toggle: settings.notifications.messages, onClick: () => toggleNotification('messages') },
              { icon: 'lucide:stamp', iconTone: 'bg-secondary text-accent', title: t('appSettings.sealOpeningsTitle'), subtitle: t('appSettings.sealOpeningsSubtitle'), toggle: settings.notifications.sealOpenings, onClick: () => toggleNotification('sealOpenings') },
            ]}
          />
        </section>

        <section className="mt-8">
          <SectionHeader icon="lucide:sliders-horizontal" title={t('appSettings.contentPrefsTitle')} subtitle={t('appSettings.contentPrefsSubtitle')} />
          <div className="overflow-hidden rounded-theme border border-border bg-card shadow-sm">
            <Row
              icon="lucide:tags"
              title={t('appSettings.interestsTitle')}
              subtitle={
                settings.content.interests.length === 0
                  ? t('appSettings.interestsEmptySubtitle')
                  : settings.content.interests
                      .map((v) => t(CATEGORY_META[v.toLowerCase()]?.labelKey) || v)
                      .join(', ')
              }
              onClick={() => setOpenPicker('interests')}
              right={<iconify-icon icon="lucide:chevron-right" class="text-lg text-muted-foreground"></iconify-icon>}
            />
            <Row
              icon="lucide:volume-x"
              title={t('appSettings.mutedWordsTitle')}
              subtitle={settings.content.mutedWords.length === 0 ? t('appSettings.mutedWordsEmptySubtitle') : t('appSettings.mutedWordsCountSubtitle', { count: settings.content.mutedWords.length })}
              onClick={() => setOpenPicker('mutedWords')}
              right={<iconify-icon icon="lucide:chevron-right" class="text-lg text-muted-foreground"></iconify-icon>}
            />
            <Row
              icon="lucide:shield-check"
              title={t('appSettings.sensitiveContentRowTitle')}
              subtitle={t('appSettings.sensitiveContentRowSubtitle')}
              last
              onClick={() => navigate('/ayarlar/hassas-icerik')}
              right={<iconify-icon icon="lucide:chevron-right" class="text-lg text-muted-foreground"></iconify-icon>}
            />
          </div>
        </section>

        <section className="mt-8">
          <SectionHeader icon="lucide:languages" title={t('appSettings.languageRegionTitle')} subtitle={t('appSettings.languageRegionSubtitle')} />
          <div className="overflow-hidden rounded-theme border border-border bg-card shadow-sm">
            <Row
              icon="lucide:globe-2"
              iconTone="bg-muted text-muted-foreground"
              title={t('appSettings.appLanguageTitle')}
              subtitle={appLanguageLabel}
              onClick={() => navigate('/ayarlar/bolge-tarih')}
              right={<iconify-icon icon="lucide:chevron-right" class="text-lg text-muted-foreground"></iconify-icon>}
            />
            <Row
              icon="lucide:calendar-clock"
              title={t('settings.regionTitle')}
              subtitle={t('appSettings.regionRowSubtitle')}
              last
              onClick={() => navigate('/ayarlar/bolge-tarih')}
              right={<iconify-icon icon="lucide:chevron-right" class="text-lg text-muted-foreground"></iconify-icon>}
            />
          </div>
        </section>

        <section className="mt-8">
          <SectionHeader icon="lucide:palette" title={t('appSettings.appearanceTitle')} subtitle={t('appSettings.appearanceSubtitle')} />
          <div className="overflow-hidden rounded-theme border border-border bg-card shadow-sm">
            <Row
              icon="lucide:sun-moon"
              title={t('appSettings.themeRowTitle')}
              subtitle={themeLabel}
              onClick={() => setOpenPicker('theme')}
              right={<iconify-icon icon="lucide:chevron-right" class="text-lg text-muted-foreground"></iconify-icon>}
            />
            <Row
              icon="lucide:align-left"
              title={t('appSettings.fontSizeRowTitle')}
              subtitle={fontScaleLabel}
              onClick={() => setOpenPicker('fontScale')}
              right={<iconify-icon icon="lucide:chevron-right" class="text-lg text-muted-foreground"></iconify-icon>}
            />
            <Row
              icon="lucide:circle-off"
              title={t('appSettings.reduceMotionTitle')}
              subtitle={t('appSettings.reduceMotionSubtitle')}
              last
              onClick={() => setReduceMotion(!reduceMotion)}
              right={<Toggle on={reduceMotion} />}
            />
          </div>
        </section>

        <section className="mt-8">
          <SectionHeader icon="lucide:database" title={t('appSettings.dataUsageTitle')} subtitle={t('appSettings.dataUsageSubtitle')} />
          <div className="overflow-hidden rounded-theme border border-border bg-card shadow-sm">
            <Row
              icon="lucide:download"
              title={t('appSettings.exportDataTitle')}
              subtitle={exporting ? t('appSettings.exportDataPreparing') : t('appSettings.exportDataSubtitle')}
              onClick={handleExportData}
              right={<iconify-icon icon="lucide:chevron-right" class="text-lg text-muted-foreground"></iconify-icon>}
            />
            <Row
              icon="lucide:trash-2"
              title={t('appSettings.clearCacheTitle')}
              subtitle={t('appSettings.clearCacheSubtitle', { size: bytesLabel(cacheBytes) })}
              onClick={handleClearCache}
              right={<iconify-icon icon="lucide:chevron-right" class="text-lg text-muted-foreground"></iconify-icon>}
            />
            <Row
              icon="lucide:history"
              title={t('settings.searchHistory.title')}
              subtitle={t('appSettings.searchHistoryRowSubtitle')}
              last
              onClick={() => navigate('/ayarlar/arama-gecmisi')}
              right={<iconify-icon icon="lucide:chevron-right" class="text-lg text-muted-foreground"></iconify-icon>}
            />
          </div>
        </section>

        <section className="mt-8">
          <SectionHeader icon="lucide:circle-help" title={t('appSettings.supportLegalTitle')} subtitle={t('appSettings.supportLegalSubtitle')} />
          <div className="overflow-hidden rounded-theme border border-border bg-card shadow-sm">
            {supportRows.map((row, i) => {
              const isInteractive = Boolean(row.url || row.route)
              const Comp = isInteractive ? 'button' : 'div'
              const onClick = row.route
                ? () => navigate(row.route)
                : row.url
                  ? () => window.open(row.url, '_system')
                  : undefined
              return (
                <Comp
                  key={row.title}
                  onClick={onClick}
                  className={`flex w-full items-center gap-3 p-4 text-left ${isInteractive ? 'transition-colors duration-150 active:bg-muted' : ''} ${i < supportRows.length - 1 ? 'border-b border-border' : ''}`}
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-theme bg-muted text-primary">
                    <iconify-icon icon={row.icon} class="text-lg"></iconify-icon>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold">{row.title}</span>
                    {row.subtitle && <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{row.subtitle}</span>}
                  </span>
                  {isInteractive && <iconify-icon icon="lucide:chevron-right" class="text-lg text-muted-foreground"></iconify-icon>}
                </Comp>
              )
            })}
          </div>
        </section>

        <section className="mt-8">
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-theme border border-border bg-card p-4 text-left shadow-sm"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-theme bg-secondary text-primary">
              <iconify-icon icon="lucide:log-out" class="text-lg"></iconify-icon>
            </span>
            <span className="flex-1">
              <span className="block text-sm font-bold">{t('appSettings.signOutTitle')}</span>
              <span className="mt-0.5 block text-[11px] text-muted-foreground">{t('appSettings.signOutSubtitle')}</span>
            </span>
            <iconify-icon icon="lucide:chevron-right" class="text-lg text-muted-foreground"></iconify-icon>
          </button>
        </section>

        <section className="mt-8 rounded-theme border border-destructive/30 bg-destructive/5 p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-theme bg-destructive/10 text-destructive">
              <iconify-icon icon="lucide:triangle-alert" class="text-lg"></iconify-icon>
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-heading text-[15px] font-bold text-destructive">{t('appSettings.dangerZoneTitle')}</h2>
              <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                {t('appSettings.dangerZoneBody')}
              </p>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="mt-4 flex items-center gap-2 rounded-theme border border-destructive/40 bg-card px-3 py-2.5 text-xs font-bold text-destructive"
              >
                <iconify-icon icon="lucide:trash-2" class="text-sm"></iconify-icon>
                {t('appSettings.deleteAccountCta')}
              </button>
            </div>
          </div>
        </section>

        <p className="mt-8 text-center text-[10px] font-medium text-muted-foreground">{t('appSettings.versionLabel', { version: '2.6.1' })}</p>

        {showDeleteConfirm && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6"
            onClick={() => !deleting && setShowDeleteConfirm(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[340px] rounded-theme bg-card p-5 shadow-lg"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-theme bg-destructive/10 text-destructive">
                <iconify-icon icon="lucide:triangle-alert" class="text-xl"></iconify-icon>
              </div>
              <h2 className="mt-3 font-heading text-base font-bold">{t('appSettings.deleteConfirmTitle')}</h2>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {t('appSettings.deleteConfirmBody')}
              </p>
              <div className="mt-5 flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="flex-1 rounded-theme border border-border bg-card py-2.5 text-xs font-bold text-foreground disabled:opacity-60"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="flex-1 rounded-theme bg-destructive py-2.5 text-xs font-bold text-destructive-foreground disabled:opacity-60"
                >
                  {deleting ? t('appSettings.deleting') : t('appSettings.confirmDelete')}
                </button>
              </div>
            </div>
          </div>
        )}

        {openPicker === 'theme' && (
          <PickerSheet
            title={t('appSettings.themeRowTitle')}
            options={THEME_OPTIONS}
            value={theme}
            onSelect={setTheme}
            onClose={() => setOpenPicker(null)}
          />
        )}
        {openPicker === 'fontScale' && (
          <PickerSheet
            title={t('appSettings.fontSizeRowTitle')}
            options={FONT_SCALE_OPTIONS}
            value={fontScale}
            onSelect={setFontScale}
            onClose={() => setOpenPicker(null)}
          />
        )}
        {openPicker === 'interests' && (
          <TagPickerSheet
            title={t('appSettings.interestsTitle')}
            subtitle={t('appSettings.interestsPickerSubtitle')}
            options={INTEREST_SLUGS.map((slug) => ({ value: slug, label: t(CATEGORY_META[slug].labelKey) }))}
            values={settings.content.interests}
            onToggle={toggleInterest}
            onClose={() => setOpenPicker(null)}
          />
        )}
        {openPicker === 'mutedWords' && (
          <WordListSheet
            title={t('appSettings.mutedWordsTitle')}
            subtitle={t('appSettings.mutedWordsPickerSubtitle')}
            words={settings.content.mutedWords}
            onAdd={addMutedWord}
            onRemove={removeMutedWord}
            onClose={() => setOpenPicker(null)}
          />
        )}
      </main>
    </div>
  )
}
