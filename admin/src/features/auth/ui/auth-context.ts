import { createContext } from 'react'
import type { AdminPermission, UserRole } from '@/core/domain/types'
import type { AuthUser } from '../domain/auth.types'

export interface AdminSessionInfo {
  name: string
  role: UserRole
  permissions: string[]
}

export interface AuthContextValue {
  user: AuthUser | null
  adminDoc: AdminSessionInfo | null
  loading: boolean
  isAdmin: boolean
  isSuperAdmin: boolean
  hasPermission: (permission: AdminPermission) => boolean
}

export const AuthContext = createContext<AuthContextValue | null>(null)
