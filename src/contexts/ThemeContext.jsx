import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(null)

const STORAGE_KEY = 'gtf-appearance'

function loadStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

function applyToDocument({ theme, fontScale, reduceMotion }) {
  const root = document.documentElement
  if (theme === 'light' || theme === 'dark') {
    root.dataset.theme = theme
  } else {
    delete root.dataset.theme
  }
  root.style.fontSize = `${fontScale}%`
  root.dataset.reduceMotion = reduceMotion ? 'true' : 'false'
}

// Apply synchronously on module load (before first paint) so there's no
// flash of the wrong theme/size on cold start.
applyToDocument({
  theme: loadStored().theme || 'system',
  fontScale: loadStored().fontScale || 100,
  reduceMotion: loadStored().reduceMotion || false,
})

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => loadStored().theme || 'system')
  const [fontScale, setFontScaleState] = useState(() => loadStored().fontScale || 100)
  const [reduceMotion, setReduceMotionState] = useState(() => loadStored().reduceMotion || false)

  useEffect(() => {
    applyToDocument({ theme, fontScale, reduceMotion })
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme, fontScale, reduceMotion }))
    } catch {
      // localStorage unavailable — theme just won't persist across launches
    }
  }, [theme, fontScale, reduceMotion])

  const value = {
    theme,
    setTheme: setThemeState,
    fontScale,
    setFontScale: setFontScaleState,
    reduceMotion,
    setReduceMotion: setReduceMotionState,
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
