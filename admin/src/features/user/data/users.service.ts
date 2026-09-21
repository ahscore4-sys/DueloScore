import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  Timestamp,
  limit as fsLimit,
  orderBy,
  query,
  startAfter,
  where,
} from 'firebase/firestore'
import type { QueryConstraint, QueryDocumentSnapshot } from 'firebase/firestore'
import { db } from '@/core/data/firebase'
import type { AppUser, Device, FavoriteTeam, PointsLogEntry } from '../domain/user.types'
import { DEFAULT_TIER_THRESHOLDS } from '../domain/user.types'
import { logActivity } from '@/features/activity/data/activity.service'

const USERS = 'users'
const POINTS_LOG = 'points_log'
const SETTINGS_TIERS = 'settings/tiers'

export const USERS_PAGE_SIZE = 24

export function toMillis(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis()
  if (typeof value === 'number') return value
  return Date.now()
}

function mapDevices(value: unknown): Device[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((d): d is Record<string, unknown> => typeof d === 'object' && d !== null)
    .map((d): Device => ({
      token: (d.token as string) ?? '',
      platform: d.platform === 'ios' ? 'ios' : 'android',
    }))
    .filter((d) => d.token)
}

function mapUser(id: string, data: Record<string, unknown>): AppUser {
  const favoriteTeam = data.favoriteTeam as FavoriteTeam | null | undefined
  return {
    id,
    name: (data.name as string) ?? 'مستخدم',
    email: (data.email as string | null) ?? null,
    profilePicture: (data.profilePicture as string) ?? '',
    favoriteTeam: favoriteTeam === 'barcelona' || favoriteTeam === 'realmadrid' ? favoriteTeam : null,
    points: (data.points as number) ?? 0,
    tier: (data.tier as number | null) ?? null,
    tierProgress: (data.tierProgress as number) ?? 0,
    devices: mapDevices(data.devices),
    createdAt: toMillis(data.createdAt),
  }
}

function mapPointsLog(id: string, data: Record<string, unknown>): PointsLogEntry {
  return {
    id,
    userId: (data.userId as string) ?? '',
    points: (data.points as number) ?? 0,
    reason: (data.reason as string) ?? '',
    ref: (data.ref as string | null) ?? null,
    createdAt: toMillis(data.createdAt),
  }
}

export interface UsersPage {
  users: AppUser[]
  cursor: QueryDocumentSnapshot | null
}

export async function fetchUsers(cursor?: QueryDocumentSnapshot | null): Promise<UsersPage> {
  const clauses: QueryConstraint[] = [orderBy('createdAt', 'desc')]
  if (cursor) clauses.push(startAfter(cursor))
  clauses.push(fsLimit(USERS_PAGE_SIZE))

  const snap = await getDocs(query(collection(db, USERS), ...clauses))
  const users = snap.docs.map((d) => mapUser(d.id, d.data()))
  const last = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null
  return { users, cursor: last }
}

export async function fetchUserByUid(id: string): Promise<AppUser | null> {
  const snap = await getDoc(doc(db, USERS, id))
  if (!snap.exists()) return null
  return mapUser(snap.id, snap.data())
}

export function subscribeUser(id: string, callback: (user: AppUser | null) => void): () => void {
  return onSnapshot(doc(db, USERS, id), (snap) => {
    if (!snap.exists()) {
      callback(null)
      return
    }
    callback(mapUser(snap.id, snap.data()))
  })
}

export async function fetchPointsLog(userId: string, max = 50): Promise<PointsLogEntry[]> {
  const snap = await getDocs(
    query(collection(db, POINTS_LOG), where('userId', '==', userId), orderBy('createdAt', 'desc'), fsLimit(max)),
  )
  return snap.docs.map((d) => mapPointsLog(d.id, d.data()))
}

export interface AdjustPointsInput {
  userId: string
  delta: number
  reason: string
  ref?: string | null
}

export async function adjustPoints(input: AdjustPointsInput): Promise<void> {
  let newPoints = 0
  await runTransaction(db, async (tx) => {
    const userRef = doc(db, USERS, input.userId)
    const userSnap = await tx.get(userRef)
    if (!userSnap.exists()) throw new Error('المستخدم غير موجود')

    const currentPoints = (userSnap.get('points') as number | undefined) ?? 0
    newPoints = Math.max(0, currentPoints + input.delta)

    tx.update(userRef, { points: newPoints })

    const logRef = doc(collection(db, POINTS_LOG))
    tx.set(logRef, {
      userId: input.userId,
      points: input.delta,
      reason: input.reason.trim(),
      ref: input.ref ?? null,
      createdAt: serverTimestamp(),
    })
  })

  logActivity({
    action: 'user.points_adjust',
    targetId: input.userId,
    targetLabel: input.userId,
    details: { pointsDelta: input.delta, newPoints, reason: input.reason.trim() },
  })
}

export async function fetchTierThresholds(): Promise<number[]> {
  try {
    const snap = await getDoc(doc(db, SETTINGS_TIERS))
    if (!snap.exists()) return DEFAULT_TIER_THRESHOLDS
    const thresholds = snap.get('thresholds') as number[] | undefined
    if (!Array.isArray(thresholds) || thresholds.length < 2) return DEFAULT_TIER_THRESHOLDS
    return [...thresholds].sort((a, b) => a - b)
  } catch {
    return DEFAULT_TIER_THRESHOLDS
  }
}
