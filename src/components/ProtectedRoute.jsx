import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'

export default function ProtectedRoute() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background font-body text-foreground">
        <div className="flex h-10 w-10 items-center justify-center rounded-theme bg-primary font-heading text-xs font-extrabold text-primary-foreground">
          GTF
        </div>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/giris" replace />
  }

  return <Outlet />
}
