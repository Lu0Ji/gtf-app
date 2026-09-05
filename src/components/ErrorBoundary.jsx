import { Component } from 'react'
import i18n from '../i18n/index.js'

// No error-tracking service (Sentry etc.) is wired into this app yet — the
// only place a render crash currently goes is the browser console, same as
// before this component existed. If one gets added later, this is the one
// spot that needs to also forward `error`/`info` to it.
function logCrash(error, info) {
  console.error('[ErrorBoundary] caught a render error:', error, info?.componentStack)
}

// Plain class component — React only supports catching render errors via
// getDerivedStateFromError/componentDidCatch, no hook equivalent exists.
// Uses the i18next instance directly (see lib/format.js for the same
// pattern) rather than useTranslation(), since a class component can't
// call hooks.
//
// Sits above <Suspense>/<Routes> in App.jsx, so a crash anywhere in the
// routed screen tree (including the nav chrome inside AppShell) replaces
// the whole thing with this fallback — there's no partial-app state left
// to navigate around it with, which is why both actions below force a
// real reload rather than trying to recover in place: a plain in-app
// navigate() would leave this component's own `hasError` state set (nothing
// unmounts it) and land right back on the same fallback.
export default class ErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    logCrash(error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children
    const t = i18n.t.bind(i18n)
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-background px-8 text-center font-body text-foreground">
        <div className="flex h-14 w-14 items-center justify-center rounded-theme bg-destructive/10 text-destructive">
          <iconify-icon icon="lucide:triangle-alert" class="text-2xl"></iconify-icon>
        </div>
        <div>
          <h1 className="font-heading text-lg font-bold">{t('errorBoundary.title')}</h1>
          <p className="mt-2 text-sm leading-5 text-muted-foreground">{t('errorBoundary.body')}</p>
        </div>
        <div className="mt-2 flex w-full max-w-[280px] flex-col gap-2.5">
          <button
            onClick={() => window.location.reload()}
            className="flex h-12 w-full items-center justify-center rounded-theme bg-primary text-sm font-bold text-primary-foreground shadow-sm"
          >
            {t('errorBoundary.reloadCta')}
          </button>
          <button
            onClick={() => {
              // Hash-only assignment doesn't reliably fire a popstate that
              // react-router's HashRouter picks up (confirmed by hand:
              // clicking a plain #/ link changed window.location.hash but
              // left <Routes> unmounted under this same crashed instance),
              // so land on the real route the hard way — a full navigation
              // clears this component's state along with everything else.
              window.location.href = window.location.pathname + window.location.search + '#/'
              window.location.reload()
            }}
            className="flex h-12 w-full items-center justify-center rounded-theme border border-border bg-card text-sm font-bold text-foreground"
          >
            {t('errorBoundary.goHomeCta')}
          </button>
        </div>
      </div>
    )
  }
}
