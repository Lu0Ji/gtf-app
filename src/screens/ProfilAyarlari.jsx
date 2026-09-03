import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fallbackAvatarFor } from '../lib/images.js'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import DetailHeader from '../components/ui/DetailHeader.jsx'

const CUSTOM_THEME_NAME = 'Özel renk'

const THEME_COLORS = [
  { name: 'Uygulama varsayılanı', hex: null },
  { name: 'Gece Mürekkebi', hex: '#183B5B' },
  { name: 'Kehribar Bakır', hex: '#A76522' },
  { name: 'Orman Yeşili', hex: '#267050' },
  { name: 'Sis Mavisi', hex: '#167C80' },
  { name: 'Erik Moru', hex: '#6B5A97' },
  { name: 'Koyu Bordo', hex: '#9D3B51' },
]

function normalizeHex(input) {
  let v = (input || '').trim()
  if (!v) return ''
  if (!v.startsWith('#')) v = `#${v}`
  if (/^#[0-9A-Fa-f]{3}$/.test(v)) {
    v = `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`
  }
  return v
}

function isValidHex(v) {
  return /^#[0-9A-Fa-f]{6}$/.test(v)
}

// A saved color that isn't one of the fixed presets means the person
// already had a custom hex applied (from a previous visit here, or in
// principle set some other way) — land them back in "Özel renk" mode with
// their actual value prefilled instead of silently mislabeling it "varsayılan".
function initialSelection(hex) {
  if (!hex) return { theme: THEME_COLORS[0].name, customHex: '' }
  const preset = THEME_COLORS.find((c) => c.hex && c.hex.toLowerCase() === hex.toLowerCase())
  if (preset) return { theme: preset.name, customHex: '' }
  return { theme: CUSTOM_THEME_NAME, customHex: hex }
}

export default function ProfilAyarlari() {
  const navigate = useNavigate()
  const { user, profile, refreshProfile } = useAuth()
  const fileInputRef = useRef(null)
  const coverInputRef = useRef(null)

  const initialColor = initialSelection(profile?.profile_color)
  const [selectedTheme, setSelectedTheme] = useState(initialColor.theme)
  const [customHex, setCustomHex] = useState(initialColor.customHex || '#356A8A')
  const customHexNormalized = normalizeHex(customHex)
  const customHexValid = isValidHex(customHexNormalized)
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [username, setUsername] = useState(profile?.username || '')
  const [bio, setBio] = useState(profile?.bio || '')
  const avatarUrl = profile?.avatar_url || ''
  const coverUrl = profile?.cover_photo_url || ''
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [coverFile, setCoverFile] = useState(null)
  const [coverPreview, setCoverPreview] = useState(null)
  const [coverRemoved, setCoverRemoved] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Live preview: reflect whatever's currently selected app-wide as you
  // pick, before "Değişiklikleri kaydet" — same override AccentColor.jsx
  // applies from the persisted profile, just anticipating the save. Every
  // change (and unmount, e.g. hitting "Vazgeç") restores the real saved
  // color first, so nothing lingers if the picks are never committed.
  //
  // The restore-on-cleanup step reads `profile.profile_color` through a
  // ref, not the closure directly — this effect's own deps don't include
  // `profile`, so a closure value would go stale the moment handleSave's
  // refreshProfile() resolves (new color, same deps → effect doesn't
  // re-run, but React still unmounts this screen a beat later on
  // navigate(-1) and would run the OLD cleanup, clobbering the just-saved
  // color with whatever it was before saving).
  const profileColorRef = useRef(profile?.profile_color)
  useEffect(() => {
    profileColorRef.current = profile?.profile_color
  }, [profile?.profile_color])

  useEffect(() => {
    const root = document.documentElement
    const preset = THEME_COLORS.find((c) => c.name === selectedTheme)
    const previewHex = selectedTheme === CUSTOM_THEME_NAME ? (customHexValid ? customHexNormalized : null) : preset?.hex ?? null
    if (previewHex) root.style.setProperty('--color-primary', previewHex)
    else root.style.removeProperty('--color-primary')
    return () => {
      if (profileColorRef.current) root.style.setProperty('--color-primary', profileColorRef.current)
      else root.style.removeProperty('--color-primary')
    }
  }, [selectedTheme, customHexNormalized, customHexValid])

  function handlePickAvatar(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  function handlePickCover(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
    setCoverRemoved(false)
  }

  function handleRemoveCover() {
    setCoverFile(null)
    setCoverPreview(null)
    setCoverRemoved(true)
  }

  async function handleSave() {
    if (!user) return
    if (selectedTheme === CUSTOM_THEME_NAME && !customHexValid) {
      setError('Geçerli bir hex renk kodu gir (örn. #356A8A).')
      return
    }
    setSaving(true)
    setError('')
    try {
      let finalAvatarUrl = avatarUrl
      let finalCoverUrl = coverUrl

      if (avatarFile) {
        setUploading(true)
        const ext = avatarFile.name.split('.').pop()
        const path = `${user.id}/avatar.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, avatarFile, { upsert: true })
        if (uploadError) throw uploadError
        const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(path)
        finalAvatarUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`
      }

      if (coverFile) {
        setUploading(true)
        const ext = coverFile.name.split('.').pop()
        const path = `profile/${user.id}/cover.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('covers')
          .upload(path, coverFile, { upsert: true })
        if (uploadError) throw uploadError
        const { data: publicUrlData } = supabase.storage.from('covers').getPublicUrl(path)
        finalCoverUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`
      } else if (coverRemoved) {
        finalCoverUrl = null
      }
      setUploading(false)

      const finalColorHex =
        selectedTheme === CUSTOM_THEME_NAME
          ? customHexNormalized.toUpperCase()
          : THEME_COLORS.find((c) => c.name === selectedTheme)?.hex ?? null

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim(),
          username: username.trim(),
          bio: bio.trim(),
          avatar_url: finalAvatarUrl,
          cover_photo_url: finalCoverUrl,
          profile_color: finalColorHex,
        })
        .eq('id', user.id)
      if (updateError) throw updateError

      await refreshProfile()
      navigate(-1)
    } catch (err) {
      setError(err.message || 'Kaydedilemedi, tekrar deneyin.')
    } finally {
      setSaving(false)
      setUploading(false)
    }
  }

  const previewAvatar = avatarPreview || avatarUrl || fallbackAvatarFor(user?.id)
  const previewCover = coverRemoved ? null : coverPreview || coverUrl || null

  return (
    <div className="min-h-screen w-full bg-background pb-28 text-foreground font-body">
      <DetailHeader title="Profil ayarları" subtitle="Görünümünü kişiselleştir" />

      <main className="pt-6">
        <section className="px-5">
          <h2 className="font-heading text-lg font-bold tracking-[-0.04em]">Temel bilgiler</h2>
          <p className="mt-1 text-xs text-muted-foreground">Adın, kullanıcı adın ve biyografin</p>

          <div className="mt-4 space-y-4 rounded-theme border border-border bg-card p-4 shadow-sm">
            <div>
              <label className="mb-2 block text-sm font-bold text-foreground">Görünen ad</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-theme border border-border bg-input px-4 py-3 text-sm text-foreground shadow-sm outline-none"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-bold text-foreground">Kullanıcı adı</label>
              <div className="flex items-center rounded-theme border border-border bg-input shadow-sm">
                <span className="pl-4 text-sm text-muted-foreground">@</span>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/\s+/g, '').toLowerCase())}
                  className="w-full bg-transparent px-2 py-3 text-sm text-foreground outline-none"
                />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-bold text-foreground">Biyografi</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                placeholder="Kendinden kısaca bahset…"
                className="w-full resize-none rounded-theme border border-border bg-input px-4 py-3 text-sm leading-5 text-foreground shadow-sm outline-none"
              />
            </div>
          </div>
        </section>

        <section className="mt-7 px-5">
          <h2 className="font-heading text-lg font-bold tracking-[-0.04em]">Kapak fotoğrafı</h2>
          <p className="mt-1 text-xs text-muted-foreground">Profilinin üst kısmında görünür, isteğe bağlı</p>

          <div className="mt-4 overflow-hidden rounded-theme border border-border bg-card shadow-sm">
            <div className="relative h-32 w-full bg-muted">
              {previewCover ? (
                <img src={previewCover} alt="Kapak fotoğrafı" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <iconify-icon icon="lucide:image" class="text-2xl"></iconify-icon>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 p-3">
              <p className="text-[11px] text-muted-foreground">JPG veya PNG · En fazla 10 MB</p>
              <div className="flex gap-2">
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePickCover}
                />
                <button
                  onClick={() => coverInputRef.current?.click()}
                  className="flex items-center gap-1.5 rounded-theme bg-secondary px-3 py-2 text-xs font-bold text-secondary-foreground"
                >
                  <iconify-icon icon="lucide:replace" class="text-sm"></iconify-icon>
                  {previewCover ? 'Değiştir' : 'Ekle'}
                </button>
                {previewCover && (
                  <button
                    onClick={handleRemoveCover}
                    className="flex items-center gap-1.5 rounded-theme border border-border px-3 py-2 text-xs font-bold text-destructive"
                  >
                    <iconify-icon icon="lucide:trash-2" class="text-sm"></iconify-icon>
                    Kaldır
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-7 px-5">
          <h2 className="font-heading text-lg font-bold tracking-[-0.04em]">Profil fotoğrafı</h2>
          <p className="mt-1 text-xs text-muted-foreground">Tanıdıkların seni daha kolay bulsun</p>

          <div className="mt-4 flex items-center gap-4 rounded-theme border border-border bg-card p-4 shadow-sm">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-secondary">
              <img src={previewAvatar} alt={displayName || 'Profil fotoğrafı'} className="h-full w-full object-cover" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">{displayName || 'İsimsiz'}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {uploading ? 'Yükleniyor…' : 'JPG, PNG veya HEIC · En fazla 10 MB'}
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePickAvatar}
            />
            <button
              aria-label="Profil fotoğrafını değiştir"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-10 w-10 items-center justify-center rounded-theme bg-secondary text-primary"
            >
              <iconify-icon icon="lucide:camera" class="text-lg"></iconify-icon>
            </button>
          </div>
        </section>

        <section className="mt-7 px-5">
          <div>
            <h2 className="font-heading text-lg font-bold tracking-[-0.04em]">Profil tema rengi</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Seçimin uygulama genelinde ana vurgu rengini (butonlar, aktif sekmeler, rozetler) değiştirir.
            </p>
          </div>

          <div className="mt-4 overflow-hidden rounded-theme border border-border bg-card shadow-sm">
            {THEME_COLORS.map((color) => {
              const isSelected = color.name === selectedTheme
              const swatchStyle = color.hex
                ? isSelected
                  ? { backgroundColor: color.hex, boxShadow: `0 0 0 2px var(--color-card), 0 0 0 4px ${color.hex}` }
                  : { backgroundColor: color.hex }
                : isSelected
                  ? { boxShadow: `0 0 0 2px var(--color-card), 0 0 0 4px var(--color-primary)` }
                  : {}
              return (
                <button
                  key={color.name}
                  onClick={() => setSelectedTheme(color.name)}
                  className="flex w-full items-center gap-3 border-b border-border px-4 py-3.5 text-left"
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                      color.hex ? 'text-white' : 'bg-muted text-primary'
                    }`}
                    style={swatchStyle}
                  >
                    <iconify-icon
                      icon={isSelected ? 'lucide:check' : color.hex ? 'lucide:contrast' : 'lucide:rotate-ccw'}
                      class={isSelected ? 'text-lg' : 'text-sm'}
                    ></iconify-icon>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold">{color.name}</span>
                    <span className="mt-0.5 block text-[10px] text-muted-foreground">
                      {color.hex ? 'Yüksek kontrast · AA' : 'Yerleşik tema rengine döner'}
                    </span>
                  </span>
                  {isSelected ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-primary">
                      <iconify-icon icon="lucide:circle-check" class="text-sm"></iconify-icon>
                      Seçili
                    </span>
                  ) : (
                    <iconify-icon icon="lucide:chevron-right" class="text-lg text-muted-foreground"></iconify-icon>
                  )}
                </button>
              )
            })}

            {/* Özel renk — same row pattern as the presets above, but tapping it
                also expands an inline hex field instead of just selecting. The
                swatch previews a conic "color wheel" until a color is actually
                picked, then shows the live hex itself (or red once invalid). */}
            <button
              onClick={() => setSelectedTheme(CUSTOM_THEME_NAME)}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white"
                style={
                  selectedTheme === CUSTOM_THEME_NAME
                    ? {
                        backgroundColor: customHexValid ? customHexNormalized : 'var(--color-destructive)',
                        boxShadow: `0 0 0 2px var(--color-card), 0 0 0 4px ${customHexValid ? customHexNormalized : 'var(--color-destructive)'}`,
                      }
                    : { backgroundImage: 'conic-gradient(from 0deg, #e0554e, #e0a13f, #d8d94a, #4fae6c, #3f8fd6, #7a63c9, #c95aa8, #e0554e)' }
                }
              >
                <iconify-icon
                  icon={selectedTheme === CUSTOM_THEME_NAME ? (customHexValid ? 'lucide:check' : 'lucide:alert-triangle') : 'lucide:pipette'}
                  class={selectedTheme === CUSTOM_THEME_NAME ? 'text-lg' : 'text-sm'}
                ></iconify-icon>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold">{CUSTOM_THEME_NAME}</span>
                <span className="mt-0.5 block text-[10px] text-muted-foreground">Kendi hex kodunu gir</span>
              </span>
              {selectedTheme === CUSTOM_THEME_NAME ? (
                <span className="flex items-center gap-1 text-[10px] font-bold text-primary">
                  <iconify-icon icon="lucide:circle-check" class="text-sm"></iconify-icon>
                  Seçili
                </span>
              ) : (
                <iconify-icon icon="lucide:chevron-right" class="text-lg text-muted-foreground"></iconify-icon>
              )}
            </button>
            {selectedTheme === CUSTOM_THEME_NAME && (
              <div className="border-t border-border bg-muted/50 px-4 py-4">
                <label className="mb-2 block text-xs font-bold text-foreground">Hex renk kodu</label>
                <div className="flex items-center gap-2.5">
                  <input
                    type="color"
                    aria-label="Renk seç"
                    value={customHexValid ? customHexNormalized : '#356A8A'}
                    onChange={(e) => setCustomHex(e.target.value)}
                    className="h-11 w-11 shrink-0 cursor-pointer rounded-theme border border-border bg-input p-1"
                  />
                  <input
                    value={customHex}
                    onChange={(e) => setCustomHex(e.target.value)}
                    placeholder="#356A8A"
                    maxLength={7}
                    className={`h-11 min-w-0 flex-1 rounded-theme border bg-input px-3.5 font-heading text-sm font-bold uppercase tracking-wide text-foreground shadow-sm outline-none ${
                      customHexValid ? 'border-border' : 'border-destructive'
                    }`}
                  />
                </div>
                <p className={`mt-2 text-[11px] ${customHexValid ? 'text-muted-foreground' : 'font-semibold text-destructive'}`}>
                  {customHexValid
                    ? 'Renk çarkına dokun ya da 6 haneli hex kodunu elle yaz.'
                    : 'Geçerli bir hex kod gir — örn. #356A8A ya da #35A.'}
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="mx-5 mt-6 rounded-theme bg-muted px-4 py-3">
          <div className="flex items-start gap-2.5">
            <iconify-icon icon="lucide:info" class="mt-0.5 text-base text-primary"></iconify-icon>
            <p className="text-[11px] leading-5 text-muted-foreground">
              "Değişiklikleri kaydet"e bastığında rengin bu cihazda ve diğer cihazlarında hemen uygulanır.
            </p>
          </div>
        </section>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-background/95 px-5 pb-6 pt-3 backdrop-blur-md">
        <div className="mx-auto max-w-[393px]">
          {error && (
            <p className="mb-2 rounded-theme bg-destructive/10 px-3 py-2.5 text-xs font-semibold text-destructive">
              {error}
            </p>
          )}
          <div className="flex gap-3">
            <button
              onClick={() => navigate(-1)}
              className="flex h-12 flex-1 items-center justify-center rounded-theme border border-border bg-card text-sm font-bold text-secondary-foreground"
            >
              Vazgeç
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex h-12 flex-[1.45] items-center justify-center gap-2 rounded-theme bg-primary text-sm font-bold text-primary-foreground shadow-sm disabled:opacity-60"
            >
              <iconify-icon icon="lucide:check" class="text-lg"></iconify-icon>
              {saving ? 'Kaydediliyor…' : 'Değişiklikleri kaydet'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
