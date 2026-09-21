export type UserRole = 'admin' | 'super_admin'

export type AdminPermission =
  | 'matches'
  | 'players'
  | 'coverage'
  | 'news'
  | 'diwaniya'
  | 'users'
  | 'challenges'
  | 'notifications'
  | 'activity_log'

export const ADMIN_PERMISSIONS: { value: AdminPermission; label: string }[] = [
  { value: 'matches', label: 'المباريات' },
  { value: 'players', label: 'اللاعبون' },
  { value: 'coverage', label: 'التغطية' },
  { value: 'news', label: 'الأخبار' },
  { value: 'diwaniya', label: 'الديوانية' },
  { value: 'users', label: 'المستخدمون' },
  { value: 'challenges', label: 'تحدي اليوم' },
  { value: 'notifications', label: 'الإشعارات' },
  { value: 'activity_log', label: 'سجل الأنشطة' },
]

export function permissionLabel(permission: AdminPermission): string {
  return ADMIN_PERMISSIONS.find((p) => p.value === permission)?.label ?? permission
}

export interface AdminUser {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
}

export interface AdminDoc {
  firebaseUid: string
  name: string
  email: string
  super_admin: boolean
}
