import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { App as CapacitorApp } from '@capacitor/app'

// On Android, Capacitor's WebView otherwise has no opinion on the hardware
// back button: with nothing listening for it, the OS falls through to its
// default behavior and closes the app instead of going back a screen. Since
// the app is a single-page HashRouter, each in-app navigation already pushes
// a browser history entry, so `canGoBack` (backed by the WebView's own nav
// history) tells us whether "back" means "pop to the previous screen" or
// "there's nothing left, exit." No-ops outside a native Android build.
export default function AndroidBackButton() {
  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') return

    const listenerPromise = CapacitorApp.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back()
      } else {
        CapacitorApp.exitApp()
      }
    })

    return () => {
      listenerPromise.then((handle) => handle.remove())
    }
  }, [])

  return null
}
