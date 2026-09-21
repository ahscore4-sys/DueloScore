import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import type { QueryConstraint, QueryDocumentSnapshot } from 'firebase/firestore'
import { db } from '@/core/data/firebase'
import type {
  DiwaniyaComment,
  DiwaniyaPost,
  DiwaniyaPostType,
  ModerationSettings,
  PollOption,
  PollStatus,
  Report,
  ReportTargetType,
  VotesByTeam,
} from '../domain/diwaniya.types'
import { logActivity } from '@/features/activity/data/activity.service'

const POSTS = 'diwaniya'
const COMMENTS = 'comments'
const REPORTS = 'reports'

export const PAGE_SIZE = 10

export interface DiwaniyaFeedPage {
  posts: DiwaniyaPost[]
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

function mapVotesByTeam(value: unknown): VotesByTeam {
  const raw = (value ?? {}) as Record<string, unknown>
  return {
    barcelona: (raw.barcelona as Record<string, number>) ?? {},
    realmadrid: (raw.realmadrid as Record<string, number>) ?? {},
  }
}

function mapPost(id: string, data: Record<string, unknown>): DiwaniyaPost {
  return {
    id,
    authorId: (data.authorId as string) ?? '',
    authorName: (data.authorName as string) ?? '',
    authorTier: (data.authorTier as string | null) ?? null,
    text: (data.text as string) ?? '',
    type: ((data.type as DiwaniyaPostType) ?? 'text'),
    createdAt: toMillis(data.createdAt),
    hidden: (data.hidden as boolean) ?? false,
    hiddenAt: toMillisOrNull(data.hiddenAt),
    hiddenBy: (data.hiddenBy as string | null) ?? null,
    reportCount: (data.reportCount as number) ?? 0,
    reportedBy: (data.reportedBy as string[]) ?? [],
    question: (data.question as string | null) ?? null,
    options: (data.options as PollOption[]) ?? [],
    endsAt: toMillisOrNull(data.endsAt),
    pollStatus: ((data.pollStatus as PollStatus) ?? 'open'),
    totalVotes: (data.totalVotes as number) ?? 0,
    votesByTeam: mapVotesByTeam(data.votesByTeam),
    winningOptionId: (data.winningOptionId as string | null) ?? null,
  }
}

function mapComment(id: string, data: Record<string, unknown>): DiwaniyaComment {
  return {
    id,
    postId: (data.postId as string) ?? '',
    parentId: (data.parentId as string | null) ?? null,
    rootId: (data.rootId as string | null) ?? null,
    depth: (data.depth as number) ?? 1,
    repliesCount: (data.repliesCount as number) ?? 0,
    authorId: (data.authorId as string) ?? '',
    authorName: (data.authorName as string) ?? '',
    authorTier: (data.authorTier as string | null) ?? null,
    text: (data.text as string) ?? '',
    createdAt: toMillis(data.createdAt),
    hidden: (data.hidden as boolean) ?? false,
    hiddenAt: toMillisOrNull(data.hiddenAt),
    hiddenBy: (data.hiddenBy as string | null) ?? null,
    reportCount: (data.reportCount as number) ?? 0,
  }
}

function mapReport(id: string, data: Record<string, unknown>): Report {
  return {
    id,
    targetType: ((data.targetType as ReportTargetType) ?? 'post'),
    targetId: (data.targetId as string) ?? '',
    reporterId: (data.reporterId as string) ?? '',
    reason: (data.reason as string) ?? '',
    createdAt: toMillis(data.createdAt),
  }
}

export async function fetchDiwaniyaPosts(cursor?: QueryDocumentSnapshot | null): Promise<DiwaniyaFeedPage> {
  const clauses: QueryConstraint[] = [orderBy('createdAt', 'desc')]
  if (cursor) clauses.push(startAfter(cursor))
  clauses.push(limit(PAGE_SIZE))

  const snap = await getDocs(query(collection(db, POSTS), ...clauses))
  const posts = snap.docs.map((d) => mapPost(d.id, d.data()))
  const last = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null
  return { posts, cursor: last }
}

export function subscribeLatestPosts(count: number, callback: (posts: DiwaniyaPost[]) => void): () => void {
  return onSnapshot(query(collection(db, POSTS), orderBy('createdAt', 'desc'), limit(count)), (snap) => {
    callback(snap.docs.map((d) => mapPost(d.id, d.data())))
  })
}

export function subscribeDiwaniyaPost(id: string, callback: (post: DiwaniyaPost | null) => void): () => void {
  return onSnapshot(doc(db, POSTS, id), (snap) => {
    if (!snap.exists()) {
      callback(null)
      return
    }
    callback(mapPost(snap.id, snap.data()))
  })
}

export interface SavePollInput {
  question: string
  options: string[]
  endsAtMs: number | null
  admin: { uid: string; name: string }
}

export async function saveDiwaniyaPoll(input: SavePollInput): Promise<string> {
  const options: PollOption[] = input.options.map((text) => ({ id: Math.random().toString(36).slice(2, 10), text }))
  const postId = doc(collection(db, POSTS)).id

  await setDoc(doc(db, POSTS, postId), {
    id: postId,
    authorId: input.admin.uid,
    authorName: input.admin.name,
    authorTier: null,
    text: input.question.trim(),
    type: 'poll',
    question: input.question.trim(),
    options,
    endsAt: input.endsAtMs ? Timestamp.fromMillis(input.endsAtMs) : null,
    pollStatus: 'open',
    totalVotes: 0,
    votesByTeam: { barcelona: {}, realmadrid: {} },
    winningOptionId: null,
    hidden: false,
    hiddenAt: null,
    hiddenBy: null,
    reportCount: 0,
    reportedBy: [],
    createdAt: serverTimestamp(),
  })

  logActivity({
    action: 'diwaniya.create',
    targetId: postId,
    targetLabel: input.question.trim(),
    details: { question: input.question.trim(), options: input.options.length },
  })
  return postId
}

export async function setPostHidden(postId: string, hidden: boolean, adminName: string): Promise<void> {
  await updateDoc(doc(db, POSTS, postId), {
    hidden,
    hiddenAt: hidden ? serverTimestamp() : null,
    hiddenBy: hidden ? adminName : null,
  })

  logActivity({
    action: hidden ? 'diwaniya.hide' : 'diwaniya.restore',
    targetId: postId,
    targetLabel: postId,
    details: { hidden },
  })
}

export async function setPostPollStatus(postId: string, status: PollStatus): Promise<void> {
  await updateDoc(doc(db, POSTS, postId), { pollStatus: status })
}

export function subscribePostComments(postId: string, callback: (comments: DiwaniyaComment[]) => void): () => void {
  return onSnapshot(query(collection(db, COMMENTS), where('postId', '==', postId), orderBy('createdAt', 'asc')), (snap) => {
    callback(snap.docs.map((d) => mapComment(d.id, d.data())))
  })
}

export interface AddAdminCommentInput {
  postId: string
  parentId: string | null
  parentRootId: string | null
  parentDepth: number
  text: string
  admin: { uid: string; name: string }
}

export async function addAdminComment(input: AddAdminCommentInput): Promise<void> {
  const depth = input.parentId ? input.parentDepth + 1 : 1
  const rootId = input.parentId ? input.parentRootId ?? input.parentId : null

  await setDoc(doc(collection(db, COMMENTS)), {
    postId: input.postId,
    parentId: input.parentId,
    rootId,
    depth,
    repliesCount: 0,
    authorId: input.admin.uid,
    authorName: input.admin.name,
    authorTier: null,
    text: input.text.trim(),
    hidden: false,
    hiddenAt: null,
    hiddenBy: null,
    reportCount: 0,
    createdAt: serverTimestamp(),
  })
}

export async function setCommentHidden(commentId: string, hidden: boolean, adminName: string): Promise<void> {
  await updateDoc(doc(db, COMMENTS, commentId), {
    hidden,
    hiddenAt: hidden ? serverTimestamp() : null,
    hiddenBy: hidden ? adminName : null,
  })

  logActivity({
    action: hidden ? 'comment.hide' : 'comment.restore',
    targetId: commentId,
    targetLabel: commentId,
    details: { hidden },
  })
}

export async function saveDiwaniyaReport(
  targetType: ReportTargetType,
  targetId: string,
  reporterId: string,
  reason: string,
): Promise<void> {
  await setDoc(doc(db, REPORTS, `${targetType}_${targetId}_${reporterId}`), {
    targetType,
    targetId,
    reporterId,
    reason: reason.trim(),
    createdAt: serverTimestamp(),
  })

  logActivity({
    action: 'report.create',
    targetId,
    targetLabel: reason.trim(),
    details: { reason: reason.trim(), kind: targetType },
  })
}

async function targetPreview(
  targetType: ReportTargetType,
  targetId: string,
): Promise<{ preview: string | null; hidden: boolean; postId: string | null }> {
  const snap = await getDoc(targetType === 'comment' ? doc(db, COMMENTS, targetId) : doc(db, POSTS, targetId))
  if (!snap.exists()) return { preview: null, hidden: false, postId: null }
  const data = snap.data() as Record<string, unknown>
  const text = targetType === 'comment' ? (data.text as string) : ((data.question as string) || (data.text as string))
  const postId = targetType === 'comment' ? ((data.postId as string) ?? null) : snap.id
  return {
    preview: typeof text === 'string' && text.trim() ? text.trim() : null,
    hidden: (data.hidden as boolean) ?? false,
    postId,
  }
}

export interface ReportQueueItem {
  targetType: ReportTargetType
  targetId: string
  count: number
  latestReason: string
  latestAt: number
  preview: string | null
  hidden: boolean
  postId: string | null
}

export async function fetchReportsQueue(): Promise<ReportQueueItem[]> {
  const snap = await getDocs(query(collection(db, REPORTS), orderBy('createdAt', 'desc'), limit(200)))

  const grouped = new Map<string, { targetType: ReportTargetType; targetId: string; count: number; latestReason: string; latestAt: number }>()
  for (const d of snap.docs) {
    const report = mapReport(d.id, d.data())
    const key = `${report.targetType}:${report.targetId}`
    const existing = grouped.get(key)
    if (existing) {
      existing.count += 1
    } else {
      grouped.set(key, {
        targetType: report.targetType,
        targetId: report.targetId,
        count: 1,
        latestReason: report.reason,
        latestAt: report.createdAt,
      })
    }
  }

  const items: ReportQueueItem[] = []
  for (const entry of grouped.values()) {
    const { preview, hidden, postId } = await targetPreview(entry.targetType, entry.targetId)
    items.push({ ...entry, preview, hidden, postId })
  }

  items.sort((a, b) => b.count - a.count || b.latestAt - a.latestAt)
  return items
}

export function subscribeModerationSettings(callback: (settings: ModerationSettings) => void): () => void {
  return onSnapshot(doc(db, 'settings', 'moderation'), (snap) => {
    const data = snap.data() as Record<string, unknown> | undefined
    callback({ autoHideThreshold: typeof data?.autoHideThreshold === 'number' ? data.autoHideThreshold : 0 })
  })
}

export async function saveModerationSettings(settings: ModerationSettings): Promise<void> {
  await setDoc(
    doc(db, 'settings', 'moderation'),
    { autoHideThreshold: Math.max(0, Math.round(settings.autoHideThreshold)) },
    { merge: true },
  )

  logActivity({
    action: 'settings.moderation',
    targetId: 'moderation',
    targetLabel: 'إعدادات الوساطة',
    details: { autoHide: settings.autoHideThreshold },
  })
}
