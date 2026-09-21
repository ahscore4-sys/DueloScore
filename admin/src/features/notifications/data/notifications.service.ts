import {
  collection,
  doc,
  getDocs,
  setDoc,
  orderBy,
  limit as fsLimit,
  query,
  startAfter,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import type { QueryConstraint, QueryDocumentSnapshot } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '@/core/data/firebase'
import type { NotificationTarget, NotificationStatus, PushNotification } from '../domain/notifications.types'
import { logActivity } from '@/features/activity/data/activity.service'

const NOTIFICATIONS = 'push_notifications'

export const PAGE_SIZE = 10

export interface NotificationsPage {
  notifications: PushNotification[]
  cursor: QueryDocumentSnapshot | null
}

function toMillis(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis()
  if (typeof value === 'number') return value
  return Date.now()
}

function toMillisOrNull(value: unknown): number | null {
  if (value instanceof Timestamp) return value.toMillis()
  if (typeof value === 'number') return value
  return null
}

function mapNotification(id: string, data: Record<string, unknown>): PushNotification {
  const statsRaw = (data.stats as Record<string, unknown> | undefined) ?? {}
  return {
    id,
    title: (data.title as string) ?? '',
    body: (data.body as string) ?? '',
    imageUrl: (data.imageUrl as string) ?? '',
    target: (data.target as NotificationTarget) ?? 'all',
    status: (data.status as NotificationStatus) ?? 'scheduled',
    scheduledAt: toMillisOrNull(data.scheduledAt),
    sentAt: toMillisOrNull(data.sentAt),
    deepLink: (data.deepLink as string) ?? '',
    stats: {
      sentCount: (statsRaw.sentCount as number) ?? 0,
    },
    createdBy: (data.createdBy as string) ?? '',
    createdAt: toMillis(data.createdAt),
  }
}

export async function fetchNotifications(cursor?: QueryDocumentSnapshot | null): Promise<NotificationsPage> {
  const clauses: QueryConstraint[] = [orderBy('createdAt', 'desc')]
  if (cursor) clauses.push(startAfter(cursor))
  clauses.push(fsLimit(PAGE_SIZE))

  const snap = await getDocs(query(collection(db, NOTIFICATIONS), ...clauses))
  const notifications = snap.docs.map((d) => mapNotification(d.id, d.data()))
  const last = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null
  return { notifications, cursor: last }
}

export interface CreateNotificationInput {
  title: string
  body: string
  imageUrl: string
  target: NotificationTarget
  deepLink: string
  scheduleAt: number | null
  createdBy: string
}

export interface CreateNotificationResult {
  notificationId: string
  status: NotificationStatus
}

async function persistNotification(input: CreateNotificationInput): Promise<string> {
  const id = doc(collection(db, NOTIFICATIONS)).id
  await setDoc(doc(db, NOTIFICATIONS, id), {
    id,
    title: input.title.trim(),
    body: input.body.trim(),
    imageUrl: input.imageUrl.trim(),
    target: input.target,
    deepLink: input.deepLink.trim(),
    status: input.scheduleAt ? 'scheduled' : 'scheduled',
    scheduledAt: input.scheduleAt ?? null,
    sentAt: null,
    stats: { sentCount: 0 },
    createdBy: input.createdBy,
    createdAt: serverTimestamp(),
  })
  return id
}

export async function createNotification(input: CreateNotificationInput): Promise<CreateNotificationResult> {
  const notificationId = await persistNotification(input)

  logActivity({
    action: 'notification.create',
    targetId: notificationId,
    targetLabel: input.title.trim(),
    details: { title: input.title.trim(), target: input.target, scheduled: input.scheduleAt ? true : false },
  })

  const sendNow = !input.scheduleAt
  if (sendNow) {
    const fn = httpsCallable<{ notificationId: string }, { ok: boolean; error?: string }>(
      functions,
      'sendPushNotification',
    )
    const res = await fn({ notificationId })
    if (!res.data.ok) {
      return { notificationId, status: 'failed' }
    }
  }
  return { notificationId, status: sendNow ? 'sent' : 'scheduled' }
}
