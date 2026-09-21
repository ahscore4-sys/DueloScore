import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '@/core/data/firebase'
import { logActivity } from '@/features/activity/data/activity.service'
import type {
  CoverageEvent,
  CoverageMatch,
  CoverageMatchStatus,
  CoverageMatchStatistics,
  CoverageMatchPlayerStatistics,
  CoveragePlans,
  CoveragePlayerFixtureEntry,
  CoveragePlayerFixtureStatistics,
  CoverageReferee,
  CoverageStatItem,
  CoverageTeamPlan,
} from '../domain/coverageMatches.types'

function toMillis(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis()
  if (typeof value === 'number') return value
  return Date.now()
}

function toStr(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function toNum(value: unknown): number {
  return typeof value === 'number' ? value : 0
}

function toNumOrNull(value: unknown): number | null {
  return typeof value === 'number' ? value : null
}

function toBool(value: unknown): boolean {
  return typeof value === 'boolean' ? value : false
}

function toStatItem(value: unknown): CoverageStatItem {
  const o = (value ?? {}) as { type?: unknown; value?: unknown }
  return {
    type: typeof o.type === 'string' ? o.type : '',
    value: typeof o.value === 'string' ? o.value : null,
  }
}

function toPlayerFixtureStats(value: unknown): CoveragePlayerFixtureStatistics {
  const s = ((value ?? {}) as Record<string, unknown>)
  const num = (k: string): number | null => (typeof s[k] === 'number' ? (s[k] as number) : null)
  return {
    minutes: num('minutes'),
    rating: num('rating'),
    number: num('number'),
    position: typeof s.position === 'string' ? s.position : null,
    captain: toBool(s.captain),
    substitute: toBool(s.substitute),
    shotsTotal: num('shotsTotal'),
    shotsOn: num('shotsOn'),
    goals: num('goals'),
    conceded: num('conceded'),
    assists: num('assists'),
    saves: num('saves'),
    passesTotal: num('passesTotal'),
    passesKey: num('passesKey'),
    passesAccuracy: num('passesAccuracy'),
    tacklesTotal: num('tacklesTotal'),
    tacklesBlocks: num('tacklesBlocks'),
    tacklesInterceptions: num('tacklesInterceptions'),
    duelsTotal: num('duelsTotal'),
    duelsWon: num('duelsWon'),
    dribbleAttempts: num('dribbleAttempts'),
    dribbleSuccess: num('dribbleSuccess'),
    dribblePast: num('dribblePast'),
    foulsDrawn: num('foulsDrawn'),
    foulsCommitted: num('foulsCommitted'),
    cardsYellow: num('cardsYellow'),
    cardsRed: num('cardsRed'),
    penaltyWon: num('penaltyWon'),
    penaltyCommitted: num('penaltyCommitted'),
    penaltyScored: num('penaltyScored'),
    penaltyMissed: num('penaltyMissed'),
    penaltySaved: num('penaltySaved'),
    subsIn: num('subsIn'),
    subsOut: num('subsOut'),
    subsBench: num('subsBench'),
  }
}

function toEntryMap(value: unknown): Record<string, CoveragePlayerFixtureEntry> {
  if (!value || typeof value !== 'object') return {}
  const out: Record<string, CoveragePlayerFixtureEntry> = {}
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const entry = (raw ?? {}) as { playerId?: unknown; name?: unknown; photo?: unknown; stats?: unknown }
    out[key] = {
      playerId: typeof entry.playerId === 'string' ? entry.playerId : key,
      name: typeof entry.name === 'string' ? entry.name : '—',
      photo: typeof entry.photo === 'string' ? entry.photo : null,
      stats: toPlayerFixtureStats((entry.stats ?? {}) as Record<string, unknown>),
    }
  }
  return out
}

function toMatchStatistics(value: unknown): CoverageMatchStatistics | undefined {
  if (!value || typeof value !== 'object') return undefined
  const v = value as { home?: unknown; away?: unknown }
  const home = Array.isArray(v.home) ? v.home : []
  const away = Array.isArray(v.away) ? v.away : []
  if (home.length === 0 && away.length === 0) return undefined
  return { home: home.map(toStatItem), away: away.map(toStatItem) }
}

function toPlayerStatistics(value: unknown): CoverageMatchPlayerStatistics | undefined {
  if (!value || typeof value !== 'object') return undefined
  const v = value as { home?: unknown; away?: unknown }
  const home = toEntryMap(v.home)
  const away = toEntryMap(v.away)
  if (Object.keys(home).length === 0 && Object.keys(away).length === 0) return undefined
  return { home, away }
}

function toPlanPlayerData(value: unknown): CoverageTeamPlan['playerData'] {
  if (!value || typeof value !== 'object') return {}
  const out: CoverageTeamPlan['playerData'] = {}
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const p = (raw ?? {}) as {
      id?: unknown
      name?: unknown
      nameAr?: unknown
      number?: unknown
      pos?: unknown
      grid?: unknown
      photo?: unknown
    }
    out[key] = {
      id: typeof p.id === 'string' ? p.id : key,
      name: typeof p.name === 'string' ? p.name : '—',
      nameAr: typeof p.nameAr === 'string' ? p.nameAr : null,
      number: typeof p.number === 'number' ? p.number : null,
      pos: typeof p.pos === 'string' ? p.pos : '',
      grid: typeof p.grid === 'string' ? p.grid : null,
      photo: typeof p.photo === 'string' ? p.photo : null,
    }
  }
  return out
}

function toPlan(value: unknown): CoverageTeamPlan | undefined {
  if (!value || typeof value !== 'object') return undefined
  const p = value as {
    formation?: unknown
    lineup?: unknown
    bench?: unknown
    injured?: unknown
    suspended?: unknown
    captain?: unknown
    playerData?: unknown
    coach?: unknown
  }
  const arr = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((i): i is string => typeof i === 'string') : []
  const coach = p.coach as { name?: unknown; photo?: unknown } | null | undefined
  const hasContent =
    (p.formation !== undefined && p.formation !== '') ||
    arr(p.lineup).length > 0 ||
    arr(p.bench).length > 0
  if (!hasContent) return undefined
  return {
    formation: typeof p.formation === 'string' ? p.formation : '',
    lineup: arr(p.lineup),
    bench: arr(p.bench),
    injured: arr(p.injured),
    suspended: arr(p.suspended),
    captain: typeof p.captain === 'string' ? p.captain : null,
    playerData: toPlanPlayerData(p.playerData),
    coach:
      coach && typeof coach.name === 'string'
        ? { name: coach.name, photo: typeof coach.photo === 'string' ? coach.photo : null }
        : null,
  }
}

function toPlans(value: unknown): CoveragePlans | undefined {
  if (!value || typeof value !== 'object') return undefined
  const out: CoveragePlans = {}
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const plan = toPlan(raw)
    if (plan) out[key] = plan
  }
  return Object.keys(out).length > 0 ? out : undefined
}

function toRatings(value: unknown): Record<string, number> | undefined {
  if (!value || typeof value !== 'object') return undefined
  const out: Record<string, number> = {}
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw === 'number' && Number.isFinite(raw)) out[key] = raw
  }
  return Object.keys(out).length > 0 ? out : undefined
}

function toCoverageEvent(id: string, data: Record<string, unknown>): CoverageEvent {
  return {
    id,
    minute: typeof data.minute === 'string' ? data.minute : '',
    elapsed: typeof data.elapsed === 'number' ? data.elapsed : 0,
    extra: typeof data.extra === 'number' ? data.extra : 0,
    type: (data.type as CoverageEvent['type']) ?? 'phase',
    detail: typeof data.detail === 'string' ? data.detail : null,
    team: data.team === 'home' || data.team === 'away' ? data.team : null,
    player: typeof data.player === 'string' ? data.player : '',
    playerName: typeof data.playerName === 'string' ? data.playerName : '',
    playerOut: typeof data.playerOut === 'string' ? data.playerOut : undefined,
    playerOutName: typeof data.playerOutName === 'string' ? data.playerOutName : undefined,
    assistPlayer: typeof data.assistPlayer === 'string' ? data.assistPlayer : undefined,
    assistName: typeof data.assistName === 'string' ? data.assistName : undefined,
    secondYellow: data.secondYellow === true,
    penaltyMissCause:
      data.penaltyMissCause === 'saved' || data.penaltyMissCause === 'off_target'
        ? data.penaltyMissCause
        : null,
  }
}

function toArr(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
}

function toReferees(value: unknown): CoverageReferee[] | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined
  const out: CoverageReferee[] = []
  for (const item of value) {
    if (typeof item === 'string') {
      out.push({ role: '', name: item })
    } else if (item && typeof item === 'object') {
      const o = item as { role?: unknown; name?: unknown }
      out.push({ role: typeof o.role === 'string' ? o.role : '', name: typeof o.name === 'string' ? o.name : '' })
    }
  }
  return out.length > 0 ? out : undefined
}

interface RawCoverageMatch {
  fixtureId: unknown
  competitionId: unknown
  competition: unknown
  competitionAr?: unknown
  round: unknown
  season: unknown
  date: unknown
  kickoff: unknown
  timestamp: unknown
  home: { id: unknown; name: unknown; logo: unknown } | undefined
  away: { id: unknown; name: unknown; logo: unknown } | undefined
  homeNameAr?: unknown
  awayNameAr?: unknown
  homeScore: unknown
  awayScore: unknown
  status: unknown
  apiStatus: unknown
  apiElapsed: unknown
  apiExtra: unknown
  stadium: unknown
  stadiumAr?: unknown
  channels: unknown
  commentators?: unknown
  referees?: unknown
  summaryVideoUrl?: unknown
  saved: unknown
  savedAt?: unknown
  editedAt?: unknown
  updatedAt?: unknown
  statistics?: unknown
  playerStatistics?: unknown
  statisticsUpdatedAt?: unknown
  playerStatisticsUpdatedAt?: unknown
  plans?: unknown
  ratings?: unknown
  lineupsUpdatedAt?: unknown
  eventsUpdatedAt?: unknown
}

function mapCoverageMatch(id: string, data: RawCoverageMatch): CoverageMatch {
  const home = data.home
  const away = data.away
  return {
    id,
    fixtureId: toNum(data.fixtureId),
    competitionId: toNum(data.competitionId),
    competition: toStr(data.competition),
    competitionAr: data.competitionAr !== undefined ? toStr(data.competitionAr) : undefined,
    round: toStr(data.round),
    season: toNum(data.season),
    date: toStr(data.date),
    kickoff: toStr(data.kickoff),
    timestamp: toNum(data.timestamp),
    home: {
      id: toNum(home?.id),
      name: toStr(home?.name),
      logo: toStr(home?.logo),
    },
    away: {
      id: toNum(away?.id),
      name: toStr(away?.name),
      logo: toStr(away?.logo),
    },
    homeNameAr: data.homeNameAr !== undefined ? toStr(data.homeNameAr) : undefined,
    awayNameAr: data.awayNameAr !== undefined ? toStr(data.awayNameAr) : undefined,
    homeScore: toNumOrNull(data.homeScore),
    awayScore: toNumOrNull(data.awayScore),
    status: (data.status as CoverageMatchStatus) ?? 'not_started',
    apiStatus: toStr(data.apiStatus),
    apiElapsed: toNumOrNull(data.apiElapsed),
    apiExtra: toNumOrNull(data.apiExtra),
    stadium: toStr(data.stadium),
    stadiumAr: data.stadiumAr !== undefined ? toStr(data.stadiumAr) : undefined,
    channels: toArr(data.channels),
    commentators: toArr(data.commentators),
    referees: toReferees(data.referees),
    summaryVideoUrl: data.summaryVideoUrl !== undefined ? toStr(data.summaryVideoUrl) : undefined,
    saved: data.saved === true,
    savedAt: data.savedAt !== undefined ? toMillis(data.savedAt) : undefined,
    editedAt: data.editedAt !== undefined ? toMillis(data.editedAt) : undefined,
    updatedAt: data.updatedAt !== undefined ? toMillis(data.updatedAt) : undefined,
    statistics: toMatchStatistics(data.statistics),
    playerStatistics: toPlayerStatistics(data.playerStatistics),
    statisticsUpdatedAt: data.statisticsUpdatedAt !== undefined ? toMillis(data.statisticsUpdatedAt) : undefined,
    playerStatisticsUpdatedAt: data.playerStatisticsUpdatedAt !== undefined ? toMillis(data.playerStatisticsUpdatedAt) : undefined,
    plans: toPlans(data.plans),
    ratings: toRatings(data.ratings),
    lineupsUpdatedAt: data.lineupsUpdatedAt !== undefined ? toMillis(data.lineupsUpdatedAt) : undefined,
    eventsUpdatedAt: data.eventsUpdatedAt !== undefined ? toMillis(data.eventsUpdatedAt) : undefined,
  }
}

export function subscribeCoverageMatches(callback: (matches: CoverageMatch[]) => void): () => void {
  const q = query(collection(db, 'coverage_matches'), orderBy('timestamp', 'asc'))
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => mapCoverageMatch(d.id, d.data() as RawCoverageMatch))
    callback(items)
  })
}

export interface CoverageMatchEditFields {
  homeNameAr?: string
  awayNameAr?: string
  competitionAr?: string
  stadium?: string
  stadiumAr?: string
  round?: string
  season?: number
  channels?: string[]
  commentators?: string[]
  referees?: CoverageReferee[]
  summaryVideoUrl?: string
}

export async function updateCoverageMatch(id: string, fields: CoverageMatchEditFields): Promise<void> {
  const payload: Record<string, unknown> = {
    editedAt: serverTimestamp(),
  }
  if (fields.homeNameAr !== undefined) payload.homeNameAr = fields.homeNameAr
  if (fields.awayNameAr !== undefined) payload.awayNameAr = fields.awayNameAr
  if (fields.competitionAr !== undefined) payload.competitionAr = fields.competitionAr
  if (fields.stadium !== undefined) payload.stadium = fields.stadium
  if (fields.stadiumAr !== undefined) payload.stadiumAr = fields.stadiumAr
  if (fields.round !== undefined) payload.round = fields.round
  if (fields.season !== undefined) payload.season = fields.season
  if (fields.channels !== undefined) payload.channels = fields.channels
  if (fields.commentators !== undefined) payload.commentators = fields.commentators
  if (fields.referees !== undefined) payload.referees = fields.referees
  if (fields.summaryVideoUrl !== undefined) payload.summaryVideoUrl = fields.summaryVideoUrl

  await updateDoc(doc(db, 'coverage_matches', id), payload)

  logActivity({
    action: 'coverage.match.update',
    targetType: 'coverage',
    targetId: id,
    targetLabel: `تغطية مباراة ${id}`,
    details: {
      competition: fields.competitionAr ?? null,
      home: fields.homeNameAr ?? null,
      away: fields.awayNameAr ?? null,
      stadium: fields.stadiumAr ?? null,
      status: 'edited',
    },
  })
}

export async function triggerCoverageRefresh(): Promise<{ ok: boolean; count?: number }> {
  const fn = httpsCallable<undefined, { ok: boolean; count?: number }>(functions, 'triggerCoverageRefresh')
  const res = await fn()
  return res.data
}

export function subscribeCoverageMatch(
  matchId: string,
  callback: (match: CoverageMatch | null) => void,
): () => void {
  return onSnapshot(doc(db, 'coverage_matches', matchId), (snap) => {
    if (!snap.exists()) return callback(null)
    callback(mapCoverageMatch(snap.id, snap.data() as RawCoverageMatch))
  })
}

export function subscribeCoverageEvents(
  matchId: string,
  callback: (events: CoverageEvent[]) => void,
): () => void {
  const q = query(
    collection(db, 'coverage_matches', matchId, 'events'),
    orderBy('elapsed', 'asc'),
  )
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => toCoverageEvent(d.id, d.data() as Record<string, unknown>)))
  })
}

export async function refreshCoverageMatchDetails(
  fixtureId: number,
): Promise<{ ok: boolean; events?: number; lineups?: boolean; stats?: boolean }> {
  const fn = httpsCallable<{ fixtureId: number }, { ok: boolean; events?: number; lineups?: boolean; stats?: boolean }>(
    functions,
    'refreshCoverageMatchDetails',
  )
  const res = await fn({ fixtureId })
  return res.data
}