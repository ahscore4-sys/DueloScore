import { Navigate, Outlet } from 'react-router-dom'
import type { AdminPermission } from '@/core/domain/types'
import { useAuth } from './useAuth'
import LoadingOverlay from '@/core/ui/components/LoadingOverlay'

interface PermissionRouteProps {
  permission: AdminPermission
}

export default function PermissionRoute({ permission }: PermissionRouteProps) {
  const { user, loading, hasPermission } = useAuth()

  if (loading) return <LoadingOverlay />
  if (!user) return <Navigate to="/login" replace />
  if (!hasPermission(permission)) return <Navigate to="/" replace />

  return <Outlet />
}
