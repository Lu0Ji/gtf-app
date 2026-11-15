import { Capacitor } from '@capacitor/core'

// iOS WebKit auto-zooms the page when a focused input's font-size is under
// 16px — with the in-app font scale setting (ThemeContext's fontScale) that
// can happen to any field, and in a WKWebView the zoom never fully undoes
// itself afterwards. `maximum-scale=1` is the only switch WebKit reliably
// honors. iOS-only on purpose: on Android Chrome the same attribute
// disables pinch zoom for everyone, and on the web it's a plain
// accessibility regression.
export function applyIosViewport() {
  if (Capacitor.getPlatform() !== 'ios') return
  const meta = document.querySelector('meta[name="viewport"]')
  if (meta && !meta.content.includes('maximum-scale')) meta.content += ', maximum-scale=1.0'
}
