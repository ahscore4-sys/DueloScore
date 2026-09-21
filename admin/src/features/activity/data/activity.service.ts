import { collection, collectionGroup, doc, getDocs, orderBy, query, startAfter, where, limit, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore'
import type { QueryConstraint, QueryDocumentSnapshot } from 'firebase/firestore'
import { db } from '@/core/data/firebase'
import type { ActivityAction, ActivityDetails, ActivityLogEntry, ActivityLogInput, ActivityTargetType } from '../domain/activity.types'
import { activityGroup } from '../domain/activity.types'

export const ACTIVITY_PAGE_SIZE = 20

interface ActivityActor {
  adminId: string
  adminName: string
}

let actor: ActivityActor | null = null

export function setActivityActor(next: ActivityActor | null): void {
  actor = next
}

export function getActivityActor(): ActivityActor | null {
  return actor
}

export function logActivity(input: ActivityLogInput): void {
  const a = actor
  if (!a) return

  const action = input.action as ActivityAction
  const ref = doc(collection(db, 'admins', a.adminId, 'log'))
  const payload: Record<string, unknown> = {
    id: ref.id,
    adminId: a.adminId,
    adminName: a.adminName,
    action,
    targetType: input.targetType ?? activityGroup(action),
    targetId: input.targetId ?? null,
    targetLabel: input.targetLabel ?? '',
    details: input.details ?? null,
    timestamp: serverTimestamp(),
  }

  setDoc(ref, payload).catch(() => {
    // logging must never break the parent admin action
  })
}

function toMillis(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis()
  if (typeof value === 'number') return value
  return Date.now()
}

function mapEntry(id: string, data: Record<string, unknown>): ActivityLogEntry {
  const rawDetails = data.details
  let details: ActivityDetails | null = null
  if (rawDetails && typeof rawDetails === 'object') {
    details = {}
    for (const [k, v] of Object.entries(rawDetails as Record<string, unknown>)) {
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' || v === null) {
        details[k] = v
      }
    }
  }
  return {
    id,
    adminId: (data.adminId as string) ?? '',
    adminName: (data.adminName as string) ?? '',
    targetType: (data.targetType as ActivityTargetType) ?? 'settings',
    action: (data.action as ActivityAction) ?? 'match.update',
    targetId: (data.targetId as string | null) ?? null,
    targetLabel: (data.targetLabel as string) ?? '',
    details,
    timestamp: toMillis(data.timestamp),
  }
}

export interface ActivityLogFilters {
  adminId?: string
  targetType?: ActivityTargetType
  from?: number
  to?: number
}

export interface ActivityLogPage {
  entries: ActivityLogEntry[]
  cursor: QueryDocumentSnapshot | null
}

export async function fetchActivityLogs(
  ownAdminId: string,
  isSuperAdmin: boolean,
  filters: ActivityLogFilters,
  cursor?: QueryDocumentSnapshot | null,
): Promise<ActivityLogPage> {
  const colRef = isSuperAdmin ? collectionGroup(db, 'log') : collection(db, 'admins', ownAdminId, 'log')

  const clauses: QueryConstraint[] = []
  if (filters.targetType) clauses.push(where('targetType', '==', filters.targetType))
  if (isSuperAdmin && filters.adminId) clauses.push(where('adminId', '==', filters.adminId))
  if (filters.from) clauses.push(where('timestamp', '>=', Timestamp.fromMillis(filters.from)))
  if (filters.to) clauses.push(where('timestamp', '<=', Timestamp.fromMillis(filters.to)))
  clauses.push(orderBy('timestamp', 'desc'))
  if (cursor) clauses.push(startAfter(cursor))
  clauses.push(limit(ACTIVITY_PAGE_SIZE))

  const snap = await getDocs(query(colRef, ...clauses))
  const entries = snap.docs.map((d) => mapEntry(d.id, d.data()))
  const last = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null
  return { entries, cursor: last }
}

export interface LogAdminRef {
  adminId: string
  adminName: string
}

export async function fetchLogAdmins(max = 500): Promise<LogAdminRef[]> {
  const snap = await getDocs(query(collectionGroup(db, 'log'), orderBy('timestamp', 'desc'), limit(max)))
  const seen = new Map<string, string>()
  for (const d of snap.docs) {
    const data = d.data() as Record<string, unknown>
    const id = (data.adminId as string) ?? ''
    const name = (data.adminName as string) ?? ''
    if (id && !seen.has(id)) seen.set(id, name)
  }
  return Array.from(seen, ([adminId, adminName]) => ({ adminId, adminName }))
}