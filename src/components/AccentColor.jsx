import { useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext.jsx'

// Applies the signed-in user's chosen profile accent color (Profil ayarları
// > Profil tema rengi) app-wide by overriding the --color-primary token.
// Inline style on :root beats the theme stylesheet's light/dark values, so
// the accent stays consistent across both themes; no color set (null)
// leaves the app's default theme primary untouched.
export default function AccentColor() {
  const { profile } = useAuth()

  useEffect(() => {
    const root = document.documentElement
    if (profile?.profile_color) {
      root.style.setProperty('--color-primary', profile.profile_color)
    } else {
      root.style.removeProperty('--color-primary')
    }
  }, [profile?.profile_color])

  return null
}
