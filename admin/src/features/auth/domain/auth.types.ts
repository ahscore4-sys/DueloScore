import type { UserRole } from '@/core/domain/types'

export interface AuthCredentials {
  email: string
  password: string
}

export interface AuthUser {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
}

export interface AuthState {
  user: AuthUser | null
  adminDoc: {
    name: string
    role: UserRole
    permissions: string[]
  } | null
  loading: boolean
  error: string | null
}
