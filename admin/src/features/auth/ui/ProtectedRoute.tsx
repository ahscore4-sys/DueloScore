import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './useAuth'
import LoadingOverlay from '@/core/ui/components/LoadingOverlay'

export default function ProtectedRoute() {
  const { user, loading } = useAuth()

  if (loading) return <LoadingOverlay />
  if (!user) return <Navigate to="/login" replace />

  return <Outlet />
}
