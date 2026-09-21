import { collection, doc, getDoc, getDocs } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '@/core/data/firebase'
import type { AdminPermission, UserRole } from '@/core/domain/types'
import { logActivity } from '@/features/activity/data/activity.service'

const ADMINS = 'admins'

export interface AdminRecord {
  uid: string
  name: string
  email: string
  role: UserRole
  permissions: AdminPermission[]
  createdAt: number | null
}

function mapAdmin(id: string, data: Record<string, unknown>): AdminRecord {
  const rawRole = (data.role as string) ?? undefined
  const role: UserRole = rawRole === 'super_admin' || data.super_admin === true ? 'super_admin' : 'admin'
  const permissions = Array.isArray(data.permissions) ? (data.permissions as AdminPermission[]) : []
  const createdAtRaw = data.createdAt
  return {
    uid: id,
    name: (data.name as string) ?? '',
    email: (data.email as string) ?? '',
    role,
    permissions,
    createdAt:
      createdAtRaw && typeof createdAtRaw === 'object' && 'toMillis' in (createdAtRaw as object)
        ? (createdAtRaw as { toMillis(): number }).toMillis()
        : null,
  }
}

export async function fetchAdmins(): Promise<AdminRecord[]> {
  const snap = await getDocs(collection(db, ADMINS))
  return snap.docs.map((d) => mapAdmin(d.id, d.data()))
}

export async function fetchAdminByUid(uid: string): Promise<AdminRecord | null> {
  const snap = await getDoc(doc(db, ADMINS, uid))
  if (!snap.exists()) return null
  return mapAdmin(snap.id, snap.data())
}

export interface SetAdminRoleInput {
  uid: string
  name: string
  email: string
  role: UserRole
  permissions: AdminPermission[]
}

export async function setAdminRole(input: SetAdminRoleInput): Promise<void> {
  const existing = await fetchAdminByUid(input.uid)
  const fn = httpsCallable<SetAdminRoleInput, { ok: boolean }>(functions, 'setAdminRole')
  await fn(input)

  logActivity({
    action: existing ? 'admin.edit' : 'admin.grant',
    targetId: input.uid,
    targetLabel: input.name || input.email,
    details: { email: input.email, role: input.role, permissions: input.permissions.join(', ') },
  })
}

export async function revokeAdmin(uid: string): Promise<void> {
  const existing = await fetchAdminByUid(uid)
  const fn = httpsCallable<{ uid: string }, { ok: boolean }>(functions, 'revokeAdmin')
  await fn({ uid })

  logActivity({
    action: 'admin.revoke',
    targetId: uid,
    targetLabel: existing?.name ?? existing?.email ?? uid,
    details: { email: existing?.email ?? '' },
  })
}
