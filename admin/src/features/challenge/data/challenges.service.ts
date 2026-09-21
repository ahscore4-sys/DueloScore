import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  limit as fsLimit,
  query,
  startAfter,
  Timestamp,
} from 'firebase/firestore'
import type { QueryConstraint, QueryDocumentSnapshot } from 'firebase/firestore'
import { db } from '@/core/data/firebase'
import type {
  DailyChallenge,
  TopPerformer,
  WeeklyLeaderboard,
  WeeklyLeaderboardEntry,
} from '../domain/challenge.types'

const CHALLENGES = 'challenges'
const LEADERBOARD = 'weekly_leaderboard'

export const CHALLENGES_PAGE_SIZE = 10

function toMillis(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis()
  if (typeof value === 'number') return value
  return Date.now()
}

function mapStats(data: Record<string, unknown>): DailyChallenge['stats'] {
  const raw = (data.stats as Record<string, unknown> | undefined) ?? {}
  return {
    assignedCount: (raw.assignedCount as number) ?? 0,
    respondedCount: (raw.respondedCount as number) ?? 0,
    correctCount: (raw.correctCount as number) ?? 0,
  }
}

function mapTeam(value: unknown): 'barcelona' | 'realmadrid' | null {
  return value === 'barcelona' || value === 'realmadrid' ? value : null
}

function mapTopPerformers(value: unknown): TopPerformer[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((t): t is Record<string, unknown> => typeof t === 'object' && t !== null)
    .map((t) => ({
      userId: (t.userId as string) ?? '',
      userName: (t.userName as string) ?? '',
      userTeam: mapTeam(t.userTeam),
      tierName: (t.tierName as string) ?? '',
      tierColor: (t.tierColor as string) ?? '#9E9E9E',
      respondedAt: toMillis(t.respondedAt),
    }))
}

export function mapChallenge(id: string, data: Record<string, unknown>): DailyChallenge {
  const status = data.status === 'ended' ? 'ended' : data.status === 'active' ? 'active' : 'scheduled'
  return {
    id,
    questionIds: Array.isArray(data.questionIds) ? data.questionIds.filter((q): q is string => typeof q === 'string') : [],
    scheduledDate: (data.scheduledDate as string) ?? '',
    startTime: toMillis(data.startTime),
    endTime: toMillis(data.endTime),
    status,
    stats: mapStats(data),
    topPerformers: mapTopPerformers(data.topPerformers),
    publishedBy: (data.publishedBy as string) ?? '',
    createdAt: toMillis(data.createdAt),
  }
}

export function subscribeLatestChallenge(
  callback: (challenge: DailyChallenge | null) => void,
  onError?: (error: unknown) => void,
): () => void {
  return onSnapshot(
    query(collection(db, CHALLENGES), orderBy('startTime', 'desc'), fsLimit(1)),
    (snap) => {
      if (snap.empty) {
        callback(null)
        return
      }
      const d = snap.docs[0]
      callback(mapChallenge(d.id, d.data()))
    },
    onError,
  )
}

export interface ChallengesPage {
  challenges: DailyChallenge[]
  cursor: QueryDocumentSnapshot | null
}

export async function fetchChallenges(cursor?: QueryDocumentSnapshot | null): Promise<ChallengesPage> {
  const clauses: QueryConstraint[] = [orderBy('startTime', 'desc')]
  if (cursor) clauses.push(startAfter(cursor))
  clauses.push(fsLimit(CHALLENGES_PAGE_SIZE))

  const snap = await getDocs(query(collection(db, CHALLENGES), ...clauses))
  const challenges = snap.docs.map((d) => mapChallenge(d.id, d.data()))
  const last = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null
  return { challenges, cursor: last }
}

function mapEntry(e: Record<string, unknown>): WeeklyLeaderboardEntry {
  return {
    userId: (e.userId as string) ?? '',
    userName: (e.userName as string) ?? '',
    userTeam: mapTeam(e.userTeam),
    tierName: (e.tierName as string) ?? '',
    tierColor: (e.tierColor as string) ?? '#9E9E9E',
    daysPlayed: (e.daysPlayed as number) ?? 0,
    weekPoints: (e.weekPoints as number) ?? 0,
  }
}

export function subscribeWeeklyLeaderboard(weekId: string, callback: (leaderboard: WeeklyLeaderboard | null) => void): () => void {
  return onSnapshot(doc(db, LEADERBOARD, weekId), (snap) => {
    if (!snap.exists()) {
      callback(null)
      return
    }
    const data = snap.data() as Record<string, unknown>
    const entries = Array.isArray(data.entries)
      ? data.entries.filter((e): e is Record<string, unknown> => typeof e === 'object' && e !== null).map(mapEntry)
      : []
    entries.sort((a, b) => b.weekPoints - a.weekPoints || b.daysPlayed - a.daysPlayed)
    callback({ weekId, entries, updatedAt: toMillis(data.updatedAt) })
  })
}
