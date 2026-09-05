import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

// Catch-all for any hash route that doesn't match a real screen — a stale
// bookmark, a mistyped deep link, a push notification pointing at a
// prediction that got deleted. Sits at the very top level of <Routes> in
// App.jsx (a sibling of /giris, not nested under ProtectedRoute), so it
// renders the same regardless of auth state instead of bouncing through a
// redirect first.
export default function NotFound() {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-background px-8 text-center font-body text-foreground">
      <div className="flex h-14 w-14 items-center justify-center rounded-theme bg-muted text-muted-foreground">
        <iconify-icon icon="lucide:map-pinned" class="text-2xl"></iconify-icon>
      </div>
      <div>
        <h1 className="font-heading text-lg font-bold">{t('notFound.title')}</h1>
        <p className="mt-2 text-sm leading-5 text-muted-foreground">{t('notFound.body')}</p>
      </div>
      <Link
        to="/"
        className="mt-2 flex h-12 w-full max-w-[280px] items-center justify-center rounded-theme bg-primary text-sm font-bold text-primary-foreground shadow-sm"
      >
        {t('errorBoundary.goHomeCta')}
      </Link>
    </div>
  )
}
