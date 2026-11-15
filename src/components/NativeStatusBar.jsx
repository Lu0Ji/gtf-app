import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { useTheme } from '../contexts/ThemeContext.jsx'

// iOS only. The status bar is drawn over the WebView (see index.css's
// safe-area notes), so the OS can't infer its text color from the page —
// left alone it stays dark, i.e. invisible on the dark theme and on the
// auth screen's always-dark canvas. Mirrors the effective theme instead:
// Style.Dark is Capacitor's name for "dark content behind, so light text".
// Deliberately not applied on Android, where the status bar background
// comes from the native theme and already matches. No-op on the web.
export default function NativeStatusBar() {
  const { theme } = useTheme()
  const { pathname } = useLocation()

  useEffect(() => {
    if (Capacitor.getPlatform() !== 'ios') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const darkSurface = pathname === '/giris' || theme === 'dark' || (theme === 'system' && media.matches)
      StatusBar.setStyle({ style: darkSurface ? Style.Dark : Style.Light }).catch(() => {})
    }
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme, pathname])

  return null
}
