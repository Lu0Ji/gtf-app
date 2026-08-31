import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useToast } from '../contexts/ToastContext.jsx'
import { useTheme } from '../contexts/ThemeContext.jsx'
import { useUserSettings } from '../hooks/useUserSettings.js'
import { supabase } from '../lib/supabase.js'

const THEME_OPTIONS = [
  { value: 'system', label: 'Sistem ayarı', desc: 'Cihazının temasını takip eder', icon: 'lucide:smartphone' },
  { value: 'light', label: 'Açık', desc: 'Her zaman açık tema', icon: 'lucide:sun' },
  { value: 'dark', label: 'Koyu', desc: 'Her zaman koyu tema', icon: 'lucide:moon' },
]

const FONT_SCALE_OPTIONS = [
  { value: 90, label: 'Küçük' },
  { value: 100, label: 'Varsayılan' },
  { value: 112, label: 'Büyük' },
  { value: 125, label: 'Çok büyük' },
]

const INTEREST_OPTIONS = ['Spor', 'Teknoloji', 'Bilim', 'Kültür', 'Ekonomi', 'Dünya']

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
      className={`flex w-full items-center gap-3 p-4 text-left ${last ? '' : 'border-b border-border'}`}
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

function buildAccountRows(email, onChangePassword, onOpenContact, onOpenMfa, onOpenFreeze, onOpenSessions) {
  return [
    { icon: 'lucide:mail', title: 'E-posta ve Telefon', subtitle: email || 'Yükleniyor…', chevron: true, onClick: onOpenContact },
    { icon: 'lucide:key-round', title: 'Şifre değiştir', subtitle: 'Hesap güvenliğini yönet', chevron: true, onClick: onChangePassword },
    { icon: 'lucide:badge-check', title: 'İki aşamalı doğrulama', subtitle: 'Doğrulayıcı uygulamayla koru', chevron: true, onClick: onOpenMfa },
    { icon: 'lucide:monitor-smartphone', title: 'Aktif oturumlar', subtitle: 'Diğer cihazlardan çıkış yap', chevron: true, onClick: onOpenSessions },
    { icon: 'lucide:pause-circle', iconTone: 'bg-muted text-muted-foreground', title: 'Hesabı geçici olarak dondur', subtitle: 'Profilini gizle, istediğinde geri dön', chevron: true, onClick: onOpenFreeze },
  ]
}

const LEGAL_URL = 'https://lu0ji.github.io/gtf-app/legal.html'

const SUPPORT_ROWS = [
  { icon: 'lucide:help-circle', title: 'Yardım merkezi', subtitle: 'Henüz kullanılamıyor' },
  { icon: 'lucide:scale', title: 'Topluluk kuralları', subtitle: 'Henüz kullanılamıyor' },
  { icon: 'lucide:shield', title: 'Gizlilik politikası', url: LEGAL_URL + '#g1' },
  { icon: 'lucide:file-text', title: 'Kullanım koşulları', url: LEGAL_URL + '#k1' },
]

function PickerSheet({ title, options, value, onSelect, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full rounded-t-theme bg-background p-5 pb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Kapat" className="text-muted-foreground">
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
                  <span className="block text-sm font-bold">{opt.label}</span>
                  {opt.desc && <span className="mt-0.5 block text-[11px] text-muted-foreground">{opt.desc}</span>}
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

function TagPickerSheet({ title, subtitle, options, values, onToggle, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full rounded-t-theme bg-background p-5 pb-8">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Kapat" className="text-muted-foreground">
            <iconify-icon icon="lucide:x" class="text-xl"></iconify-icon>
          </button>
        </div>
        {subtitle && <p className="mb-4 text-[11px] text-muted-foreground">{subtitle}</p>}
        <div className="flex flex-wrap gap-2">
          {options.map((opt) => {
            const selected = values.includes(opt)
            return (
              <button
                key={opt}
                onClick={() => onToggle(opt)}
                className={`rounded-full px-3.5 py-2 text-xs font-bold ${
                  selected ? 'bg-primary text-primary-foreground' : 'border border-border bg-card text-foreground'
                }`}
              >
                {opt}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function WordListSheet({ title, subtitle, words, onAdd, onRemove, onClose }) {
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
          <button onClick={onClose} aria-label="Kapat" className="text-muted-foreground">
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
            placeholder="Kelime ekle…"
            className="h-11 flex-1 rounded-theme border border-border bg-input px-3.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <button
            onClick={submit}
            aria-label="Kelime ekle"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-theme bg-primary text-primary-foreground"
          >
            <iconify-icon icon="lucide:plus" class="text-lg"></iconify-icon>
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {words.length === 0 && <p className="text-xs text-muted-foreground">Henüz kelime eklenmedi.</p>}
          {words.map((w) => (
            <span key={w} className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-semibold">
              {w}
              <button onClick={() => onRemove(w)} aria-label={`${w} kelimesini kaldır`}>
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
  const navigate = useNavigate()
  const { signOut, user, profile, refreshProfile } = useAuth()
  const { showToast } = useToast()
  const { theme, setTheme, fontScale, setFontScale, reduceMotion, setReduceMotion } = useTheme()
  const { settings, update: updateSettings } = useUserSettings()
  const accountRows = buildAccountRows(
    user?.email,
    () => navigate('/ayarlar/sifre-degistir'),
    () => navigate('/ayarlar/eposta-telefon'),
    () => navigate('/ayarlar/iki-asamali-dogrulama'),
    () => navigate('/ayarlar/hesabi-dondur'),
    () => navigate('/ayarlar/aktif-oturumlar')
  )
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [openPicker, setOpenPicker] = useState(null)
  const [privacyBusy, setPrivacyBusy] = useState(false)
  const [blockedCount, setBlockedCount] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)
  const [exporting, setExporting] = useState(false)
  const [cacheBytes, setCacheBytes] = useState(0)
  const [inviteCopied, setInviteCopied] = useState(false)

  async function handleCopyInvite() {
    const message = `GTF'e katıl, ikimiz de 100 puan kazanalım! Davet kodum: @${profile?.username}`
    try {
      await navigator.clipboard.writeText(message)
      setInviteCopied(true)
      showToast('Davet mesajı kopyalandı, dilediğin yere yapıştır.', 'success')
      setTimeout(() => setInviteCopied(false), 2000)
    } catch {
      showToast('Kopyalanamadı, tekrar dene.')
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

  const themeLabel = THEME_OPTIONS.find((o) => o.value === theme)?.label || 'Sistem ayarı'
  const fontScaleLabel = FONT_SCALE_OPTIONS.find((o) => o.value === fontScale)?.label || 'Varsayılan'

  async function handleSignOut() {
    await signOut()
    navigate('/giris', { replace: true })
  }

  async function handleDeleteAccount() {
    if (deleting) return
    setDeleting(true)
    const { error } = await supabase.functions.invoke('delete-account')
    if (error) {
      showToast('Hesap silinemedi, tekrar dene.')
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
      showToast('Değişiklik kaydedilemedi, tekrar dene.')
    } else {
      await refreshProfile()
    }
    setPrivacyBusy(false)
  }

  function toggleNotification(key) {
    updateSettings('notifications', { [key]: !settings.notifications[key] })
  }

  function toggleInterest(value) {
    const current = settings.content.interests
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
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
      showToast('Verilerin indirildi.', 'success')
    } catch {
      showToast('İndirme başlatılamadı, tekrar dene.')
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
      showToast('Önbellek temizlendi.', 'success')
    } catch {
      showToast('Önbellek temizlenemedi.')
    }
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
            <h1 className="font-heading text-xl font-extrabold tracking-[-0.05em]">Uygulama ayarları</h1>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Hesabın, deneyimin ve verilerin senin kontrolünde.</p>
          </div>
        </div>
      </header>

      <main className="px-5 pb-8 pt-6">
        <section className="rounded-theme border-2 border-accent bg-accent/10 p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-theme bg-accent text-accent-foreground">
              <iconify-icon icon="lucide:gift" class="text-base"></iconify-icon>
            </span>
            <div>
              <h2 className="text-sm font-bold text-foreground">Arkadaşını davet et</h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Katıldığında ikiniz de 100 puan kazanır.</p>
            </div>
          </div>
          <button
            onClick={handleCopyInvite}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-theme bg-accent py-2.5 text-xs font-bold text-accent-foreground"
          >
            <iconify-icon icon={inviteCopied ? 'lucide:check' : 'lucide:copy'} class="text-sm"></iconify-icon>
            {inviteCopied ? 'Kopyalandı' : 'Davet kodunu kopyala'}
          </button>
        </section>

        <section className="mt-8">
          <SectionHeader icon="lucide:shield-check" title="Hesap ve güvenlik" subtitle="Giriş bilgilerin ve hesabının güvenliği" />
          <RowList rows={accountRows} />
        </section>

        <section className="mt-8">
          <SectionHeader icon="lucide:lock-keyhole" title="Gizlilik" subtitle="Kimlerin seni ve kayıtlarını görebileceği" />
          <div className="overflow-hidden rounded-theme border border-border bg-card shadow-sm">
            <Row
              icon="lucide:user-round-lock"
              title="Gizli hesap"
              subtitle={profile?.is_private ? 'Yalnızca onayladığın kişiler tahminlerini görür' : 'Herkes tahminlerini görebilir'}
              onClick={handleTogglePrivate}
              right={<Toggle on={!!profile?.is_private} />}
            />
            <Row
              icon="lucide:eye"
              title="Tahmin görünürlüğü"
              subtitle="Kim görebilir, ne zaman görebilir"
              onClick={() => navigate('/ayarlar/tahmin-gorunurlugu')}
              right={<iconify-icon icon="lucide:chevron-right" class="text-lg text-muted-foreground"></iconify-icon>}
            />
            <Row
              icon="lucide:user-round-check"
              title="Takip istekleri"
              subtitle={pendingCount === 0 ? 'Bekleyen istek yok' : `${pendingCount} bekleyen istek`}
              badge={pendingCount > 0 ? String(pendingCount) : undefined}
              onClick={() => navigate('/ayarlar/takip-istekleri')}
              right={<iconify-icon icon="lucide:chevron-right" class="text-lg text-muted-foreground"></iconify-icon>}
            />
            <Row
              icon="lucide:mail-check"
              title="Mesaj istekleri"
              subtitle="Kim sana mesaj gönderebilir"
              onClick={() => navigate('/ayarlar/mesaj-istekleri')}
              right={<iconify-icon icon="lucide:chevron-right" class="text-lg text-muted-foreground"></iconify-icon>}
            />
            <Row
              icon="lucide:at-sign"
              title="Etiketleme ve Bahsetmeler"
              subtitle="Kim seni yorumlarda bahsedebilir"
              onClick={() => navigate('/ayarlar/etiketleme-bahsetmeler')}
              right={<iconify-icon icon="lucide:chevron-right" class="text-lg text-muted-foreground"></iconify-icon>}
            />
            <Row
              icon="lucide:radio"
              title="Çevrimiçi durumunu göster"
              subtitle="Mesajlarda aktif olduğun görünür"
              onClick={() => updateSettings('privacy', { showOnline: !settings.privacy.showOnline })}
              right={<Toggle on={settings.privacy.showOnline} />}
            />
            <Row
              icon="lucide:ban"
              title="Engellenen hesaplar"
              subtitle={blockedCount === 0 ? 'Kimseyi engellemedin' : `${blockedCount} hesap engellendi`}
              last
              onClick={() => navigate('/ayarlar/engellenenler')}
              right={<iconify-icon icon="lucide:chevron-right" class="text-lg text-muted-foreground"></iconify-icon>}
            />
          </div>
        </section>

        <section className="mt-8">
          <SectionHeader icon="lucide:bell-ring" title="Bildirimler" subtitle="Hareketler akışında neyi görmek istediğin" />
          <RowList
            rows={[
              { icon: 'lucide:heart', title: 'Beğeniler', subtitle: 'Tahmin ve yorum beğenileri', toggle: settings.notifications.likes, onClick: () => toggleNotification('likes') },
              { icon: 'lucide:message-circle', title: 'Yorumlar', subtitle: 'Kayıtlarına gelen yanıtlar', toggle: settings.notifications.comments, onClick: () => toggleNotification('comments') },
              { icon: 'lucide:user-plus', title: 'Yeni takipçiler', subtitle: 'Takip istekleri ve yeni bağlantılar', toggle: settings.notifications.newFollowers, onClick: () => toggleNotification('newFollowers') },
              { icon: 'lucide:users-round', title: 'Grup etkinlikleri', subtitle: 'Takip ettiğin gruplardaki hareketler', toggle: settings.notifications.groupActivity, onClick: () => toggleNotification('groupActivity') },
              { icon: 'lucide:send', title: 'Mesajlar', subtitle: 'Yeni mesajlar ve istekler', toggle: settings.notifications.messages, onClick: () => toggleNotification('messages') },
              { icon: 'lucide:stamp', iconTone: 'bg-secondary text-accent', title: 'Mühür açılmaları', subtitle: 'Tahminlerin sonuç zamanı geldiğinde', toggle: settings.notifications.sealOpenings, onClick: () => toggleNotification('sealOpenings') },
            ]}
          />
        </section>

        <section className="mt-8">
          <SectionHeader icon="lucide:sliders-horizontal" title="İçerik tercihleri" subtitle="Akışını ilgine göre şekillendir" />
          <div className="overflow-hidden rounded-theme border border-border bg-card shadow-sm">
            <Row
              icon="lucide:tags"
              title="İlgi alanların"
              subtitle={settings.content.interests.length === 0 ? 'Henüz seçmedin' : settings.content.interests.join(', ')}
              onClick={() => setOpenPicker('interests')}
              right={<iconify-icon icon="lucide:chevron-right" class="text-lg text-muted-foreground"></iconify-icon>}
            />
            <Row
              icon="lucide:volume-x"
              title="Sessize alınan kelimeler"
              subtitle={settings.content.mutedWords.length === 0 ? 'Kelime gizlenmiyor' : `${settings.content.mutedWords.length} kelime gizleniyor`}
              onClick={() => setOpenPicker('mutedWords')}
              right={<iconify-icon icon="lucide:chevron-right" class="text-lg text-muted-foreground"></iconify-icon>}
            />
            <Row
              icon="lucide:shield-check"
              title="Hassas içerik kontrolü"
              subtitle="Hassas işaretli kayıtları nasıl göreceğin"
              last
              onClick={() => navigate('/ayarlar/hassas-icerik')}
              right={<iconify-icon icon="lucide:chevron-right" class="text-lg text-muted-foreground"></iconify-icon>}
            />
          </div>
        </section>

        <section className="mt-8">
          <SectionHeader icon="lucide:languages" title="Dil ve bölge" subtitle="Uygulamayı tercih ettiğin dilde kullan" />
          <div className="overflow-hidden rounded-theme border border-border bg-card shadow-sm">
            <Row
              icon="lucide:globe-2"
              iconTone="bg-muted text-muted-foreground"
              title="Uygulama dili"
              subtitle="Şu an yalnızca Türkçe · diğer diller henüz yok"
            />
            <Row
              icon="lucide:calendar-clock"
              title="Bölge ve Tarih Biçimi"
              subtitle="Saat biçimi tercihin"
              last
              onClick={() => navigate('/ayarlar/bolge-tarih')}
              right={<iconify-icon icon="lucide:chevron-right" class="text-lg text-muted-foreground"></iconify-icon>}
            />
          </div>
        </section>

        <section className="mt-8">
          <SectionHeader icon="lucide:palette" title="Görünüm" subtitle="Ekranı kendine uygun hale getir" />
          <div className="overflow-hidden rounded-theme border border-border bg-card shadow-sm">
            <Row
              icon="lucide:sun-moon"
              title="Tema"
              subtitle={themeLabel}
              onClick={() => setOpenPicker('theme')}
              right={<iconify-icon icon="lucide:chevron-right" class="text-lg text-muted-foreground"></iconify-icon>}
            />
            <Row
              icon="lucide:align-left"
              title="Yazı boyutu"
              subtitle={fontScaleLabel}
              onClick={() => setOpenPicker('fontScale')}
              right={<iconify-icon icon="lucide:chevron-right" class="text-lg text-muted-foreground"></iconify-icon>}
            />
            <Row
              icon="lucide:circle-off"
              title="Hareketleri azalt"
              subtitle="Geçiş ve animasyonları sadeleştir"
              last
              onClick={() => setReduceMotion(!reduceMotion)}
              right={<Toggle on={reduceMotion} />}
            />
          </div>
        </section>

        <section className="mt-8">
          <SectionHeader icon="lucide:database" title="Veri kullanımı" subtitle="Verilerin ve cihaz depolaman" />
          <div className="overflow-hidden rounded-theme border border-border bg-card shadow-sm">
            <Row
              icon="lucide:download"
              title="Verilerini indir"
              subtitle={exporting ? 'Hazırlanıyor…' : 'Tahminlerin, yorumların ve bağlantıların (JSON)'}
              onClick={handleExportData}
              right={<iconify-icon icon="lucide:chevron-right" class="text-lg text-muted-foreground"></iconify-icon>}
            />
            <Row
              icon="lucide:trash-2"
              title="Önbelleği temizle"
              subtitle={`Cihazında ${bytesLabel(cacheBytes)} kullanılıyor`}
              last
              onClick={handleClearCache}
              right={<iconify-icon icon="lucide:chevron-right" class="text-lg text-muted-foreground"></iconify-icon>}
            />
          </div>
        </section>

        <section className="mt-8">
          <SectionHeader icon="lucide:circle-help" title="Destek ve yasal" subtitle="GTF hakkında daha fazlası" />
          <div className="overflow-hidden rounded-theme border border-border bg-card shadow-sm">
            {SUPPORT_ROWS.map((row, i) => {
              const Comp = row.url ? 'button' : 'div'
              return (
                <Comp
                  key={row.title}
                  onClick={row.url ? () => window.open(row.url, '_system') : undefined}
                  className={`flex w-full items-center gap-3 p-4 text-left ${i < SUPPORT_ROWS.length - 1 ? 'border-b border-border' : ''}`}
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-theme bg-muted text-primary">
                    <iconify-icon icon={row.icon} class="text-lg"></iconify-icon>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold">{row.title}</span>
                    {row.subtitle && <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{row.subtitle}</span>}
                  </span>
                  {row.url && <iconify-icon icon="lucide:chevron-right" class="text-lg text-muted-foreground"></iconify-icon>}
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
              <span className="block text-sm font-bold">Çıkış yap</span>
              <span className="mt-0.5 block text-[11px] text-muted-foreground">Bu cihazdaki oturumunu kapat</span>
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
              <h2 className="font-heading text-[15px] font-bold text-destructive">Tehlikeli bölge</h2>
              <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                Hesabını silmek tüm tahmin geçmişini, bağlantılarını ve verilerini kalıcı olarak kaldırır.
              </p>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="mt-4 flex items-center gap-2 rounded-theme border border-destructive/40 bg-card px-3 py-2.5 text-xs font-bold text-destructive"
              >
                <iconify-icon icon="lucide:trash-2" class="text-sm"></iconify-icon>
                Hesabımı sil
              </button>
            </div>
          </div>
        </section>

        <p className="mt-8 text-center text-[10px] font-medium text-muted-foreground">GTF · Sürüm 2.6.1</p>

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
              <h2 className="mt-3 font-heading text-base font-bold">Hesabını silmek üzeresin</h2>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Bu işlem geri alınamaz. Tüm tahminlerin, mesajların, grup üyeliklerin ve profil bilgilerin kalıcı
                olarak silinir.
              </p>
              <div className="mt-5 flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="flex-1 rounded-theme border border-border bg-card py-2.5 text-xs font-bold text-foreground disabled:opacity-60"
                >
                  Vazgeç
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="flex-1 rounded-theme bg-destructive py-2.5 text-xs font-bold text-destructive-foreground disabled:opacity-60"
                >
                  {deleting ? 'Siliniyor…' : 'Evet, sil'}
                </button>
              </div>
            </div>
          </div>
        )}

        {openPicker === 'theme' && (
          <PickerSheet
            title="Tema"
            options={THEME_OPTIONS}
            value={theme}
            onSelect={setTheme}
            onClose={() => setOpenPicker(null)}
          />
        )}
        {openPicker === 'fontScale' && (
          <PickerSheet
            title="Yazı boyutu"
            options={FONT_SCALE_OPTIONS}
            value={fontScale}
            onSelect={setFontScale}
            onClose={() => setOpenPicker(null)}
          />
        )}
        {openPicker === 'interests' && (
          <TagPickerSheet
            title="İlgi alanların"
            subtitle="Akışın seçtiğin kategoriye göre açılır"
            options={INTEREST_OPTIONS}
            values={settings.content.interests}
            onToggle={toggleInterest}
            onClose={() => setOpenPicker(null)}
          />
        )}
        {openPicker === 'mutedWords' && (
          <WordListSheet
            title="Sessize alınan kelimeler"
            subtitle="Bu kelimeleri içeren tahminler akışında gizlenir"
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
