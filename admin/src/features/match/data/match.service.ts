import { collection, doc, getDocs, onSnapshot, setDoc, deleteDoc, updateDoc, query, orderBy, writeBatch, deleteField } from 'firebase/firestore'
import { db } from '@/core/data/firebase'
import type { Match, MatchEvent, MatchStatus, TeamPlan, VarCancellationCause, MatchStatistics, MatchStatItem, MatchPlayerStatistics, PlayerFixtureStatistics } from '../domain/match.types'
import type { ControlPhase, PenaltyKick } from '@/types'
import { logActivity } from '@/features/activity/data/activity.service'
import { fetchFixturePlayerRatings, fetchFixtureStatistics, fetchFixturePlayerStatistics } from './apiFootball.service'

const MATCHES = 'matches'

function matchRef(id: string) {
  return doc(db, MATCHES, id)
}

function eventsCol(matchId: string) {
  return collection(db, MATCHES, matchId, 'events')
}

type LogDetails = Record<string, string | number | boolean | null>

function toLogDetails(obj: Record<string, unknown>): LogDetails {
  const out: LogDetails = {}
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' || v === null) {
      out[k] = v
    } else {
      out[k] = JSON.stringify(v)
    }
  }
  return out
}

export function subscribeMatches(callback: (matches: Match[]) => void): () => void {
  return onSnapshot(query(collection(db, MATCHES), orderBy('date', 'desc')), (snap) => {
    const matches = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Match))
    callback(matches)
  })
}

export function subscribeMatch(id: string, callback: (match: Match | null) => void): () => void {
  return onSnapshot(matchRef(id), (snap) => {
    if (!snap.exists()) { callback(null); return }
    callback({ id: snap.id, ...snap.data() } as Match)
  })
}

export async function saveMatch(match: Omit<Match, 'id'> & { id?: string }): Promise<string> {
  const id = match.id || doc(collection(db, MATCHES)).id
  const data = { ...match, id }
  await setDoc(matchRef(id), data)

  logActivity({
    action: match.id ? 'match.update' : 'match.create',
    targetId: id,
    targetLabel: `${match.home.name} ضد ${match.away.name}`,
    details: {
      home: match.home.name,
      away: match.away.name,
      competition: match.competition,
      round: match.round,
      score: `${match.score.home}-${match.score.away}`,
    },
  })
  return id
}

export async function deleteMatch(id: string): Promise<void> {
  const eventsSnap = await getDocs(eventsCol(id))
  const batch = writeBatch(db)
  eventsSnap.docs.forEach((d) => batch.delete(d.ref))
  batch.delete(matchRef(id))
  await batch.commit()

  logActivity({ action: 'match.delete', targetId: id, targetLabel: id })
}

export async function updateMatchFields(id: string, patch: Partial<Match>): Promise<void> {
  await updateDoc(matchRef(id), patch as Record<string, unknown>)

  logActivity({
    action: 'match.update',
    targetId: id,
    targetLabel: id,
    details: toLogDetails(patch as unknown as Record<string, unknown>),
  })
}

export async function saveMatchPlan(matchId: string, teamId: string, plan: TeamPlan): Promise<void> {
  await updateDoc(matchRef(matchId), { [`plans.${teamId}`]: plan } as Record<string, unknown>)

  logActivity({
    action: 'match.save_plan',
    targetId: matchId,
    targetLabel: matchId,
    details: { teamId, formation: plan.formation, lineup: plan.lineup.length, bench: plan.bench.length, injured: plan.injured.length, suspended: plan.suspended.length },
  })
}

export async function getMatchEvents(matchId: string): Promise<MatchEvent[]> {
  const snap = await getDocs(query(eventsCol(matchId), orderBy('minute')))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as MatchEvent))
}

export interface EventPatch {
  team?: 'home' | 'away'
  type?: MatchEvent['type']
  player?: string
  playerOut?: string | null
  assistPlayer?: string | null
  videoUrl?: string | null
  minute?: string
  secondYellow?: boolean
  penaltyMissCause?: 'saved' | 'off_target' | null
  varAssigned?: boolean
  varDecision?: 'error' | 'no_error'
  varDecisionCause?: VarCancellationCause | null
  varCheckCause?: string | null
}

export function subscribeMatchEvents(matchId: string, callback: (events: MatchEvent[]) => void): () => void {
  return onSnapshot(query(eventsCol(matchId), orderBy('minute')), (snap) => {
    const events = snap.docs.map((d) => ({ id: d.id, ...d.data() } as MatchEvent))
    callback(events)
  })
}

export async function addEvent(matchId: string, event: Omit<MatchEvent, 'id'>): Promise<string> {
  const ref = doc(eventsCol(matchId))
  await setDoc(ref, { ...event, id: ref.id, createdAt: Date.now(), ...(event.secondYellow ? { secondYellow: true } : { secondYellow: false }) })

  logActivity({
    action: 'event.create',
    targetId: ref.id,
    targetLabel: `${event.player} ${event.minute}`,
    details: { type: event.type, player: event.player, team: event.team, minute: event.minute },
  })
  return ref.id
}

export async function updateEvent(matchId: string, eventId: string, patch: EventPatch): Promise<void> {
  const data: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(patch)) {
    data[key] = value === null ? deleteField() : value
  }
  await updateDoc(doc(db, MATCHES, matchId, 'events', eventId), data)

  logActivity({
    action: 'event.update',
    targetId: eventId,
    targetLabel: eventId,
    details: toLogDetails(patch as Record<string, unknown>),
  })
}

export async function deleteEvent(matchId: string, eventId: string): Promise<void> {
  await deleteDoc(doc(db, MATCHES, matchId, 'events', eventId))

  logActivity({ action: 'event.delete', targetId: eventId, targetLabel: eventId })
}

export interface MatchControlPatch {
  controlPhase?: ControlPhase
  status?: MatchStatus
  clockBaseSeconds?: number
  clockStartedAt?: string | null
  clockRunning?: boolean
  addedTime?: Record<string, number>
  penalties?: { home: number; away: number }
  penaltyKicks?: PenaltyKick[]
}

export async function updateMatchControl(id: string, patch: MatchControlPatch): Promise<void> {
  await updateDoc(matchRef(id), patch as Record<string, unknown>)

  logActivity({
    action: 'match.control',
    targetId: id,
    targetLabel: id,
    details: toLogDetails({ status: patch.status ?? null, controlPhase: patch.controlPhase ?? null } as Record<string, unknown>),
  })
}

export async function saveMatchRatings(id: string, ratings: Record<string, number>): Promise<void> {
  await updateDoc(matchRef(id), { ratings, ratingsUpdatedAt: Date.now() } as Record<string, unknown>)
}

export async function fetchAndSaveMatchRatings(match: Match): Promise<number> {
  if (!match.fixtureId) return 0
  const source = await fetchFixturePlayerRatings(match.fixtureId)
  const normalized: Record<string, number> = {}
  for (const [id, rating] of Object.entries(source)) normalized[id] = rating
  if (Object.keys(normalized).length === 0) return 0
  await saveMatchRatings(match.id, normalized)
  return Object.keys(normalized).length
}

export async function saveMatchStatistics(id: string, stats: MatchStatistics, opts: { silent?: boolean } = {}): Promise<void> {
  await updateDoc(matchRef(id), { statistics: stats, statisticsUpdatedAt: Date.now() } as Record<string, unknown>)

  if (opts.silent) return
  logActivity({
    action: 'match.update',
    targetId: id,
    targetLabel: id,
    details: { statistics: 'saved' },
  })
}

export async function fetchAndSaveMatchStatistics(match: Match, opts: { silent?: boolean } = {}): Promise<number> {
  if (!match.fixtureId) return 0
  const response = await fetchFixtureStatistics(match.fixtureId)
  if (response.length < 2) return 0

  const home = response[0]
  const away = response[1]
  const toItems = (stats: { type: string; value: string | number | null }[]): MatchStatItem[] =>
    stats.map((s) => ({ type: s.type ?? '', value: s.value == null ? null : String(s.value) }))

  await saveMatchStatistics(match.id, { home: toItems(home.statistics), away: toItems(away.statistics) }, opts)
  return home.statistics.length
}

type RawPlayerGroup = { games?: { minutes: number | null; rating: string | null; number?: number | null; position?: string | null; captain?: boolean; substitute?: boolean }; substitutes?: { in?: number | null; out?: number | null; bench?: number | null }; shots?: { total: number | null; on: number | null }; goals?: { total: number | null; conceded: number | null; assists: number | null; saves: number | null }; passes?: { total: number | null; key: number | null; accuracy: number | null }; tackles?: { total: number | null; blocks: number | null; interceptions: number | null }; duels?: { total: number | null; won: number | null }; dribbles?: { attempts: number | null; success: number | null; past: number | null }; fouls?: { drawn: number | null; committed: number | null }; cards?: { yellow: number | null; red: number | null }; penalty?: { won: number | null; committed: number | null; scored: number | null; missed: number | null; saved: number | null } }

function nothing(): PlayerFixtureStatistics {
  return { minutes: null, rating: null, number: null, position: null, shotsTotal: null, shotsOn: null, goals: null, conceded: null, assists: null, saves: null, passesTotal: null, passesKey: null, passesAccuracy: null, tacklesTotal: null, tacklesBlocks: null, tacklesInterceptions: null, duelsTotal: null, duelsWon: null, dribbleAttempts: null, dribbleSuccess: null, dribblePast: null, foulsDrawn: null, foulsCommitted: null, cardsYellow: null, cardsRed: null, penaltyWon: null, penaltyCommitted: null, penaltyScored: null, penaltyMissed: null, penaltySaved: null, subsIn: null, subsOut: null, subsBench: null, captain: false, substitute: false }
}

function mapPlayerStats(groups: RawPlayerGroup[]): PlayerFixtureStatistics {
  const g = groups[0] ?? {}
  const base = nothing() as unknown as PlayerFixtureStatistics
  const card = (v: number | null | undefined): number | null => (v == null ? null : v)
  base.minutes = card(g.games?.minutes)
  base.rating = g.games?.rating != null && g.games.rating !== '' ? Number.parseFloat(g.games.rating) : null
  base.number = card(g.games?.number)
  base.position = g.games?.position ?? null
  base.captain = Boolean(g.games?.captain)
  base.substitute = Boolean(g.games?.substitute)
  base.shotsTotal = card(g.shots?.total)
  base.shotsOn = card(g.shots?.on)
  base.goals = card(g.goals?.total)
  base.conceded = card(g.goals?.conceded)
  base.assists = card(g.goals?.assists)
  base.saves = card(g.goals?.saves)
  base.passesTotal = card(g.passes?.total)
  base.passesKey = card(g.passes?.key)
  base.passesAccuracy = card(g.passes?.accuracy)
  base.tacklesTotal = card(g.tackles?.total)
  base.tacklesBlocks = card(g.tackles?.blocks)
  base.tacklesInterceptions = card(g.tackles?.interceptions)
  base.duelsTotal = card(g.duels?.total)
  base.duelsWon = card(g.duels?.won)
  base.dribbleAttempts = card(g.dribbles?.attempts)
  base.dribbleSuccess = card(g.dribbles?.success)
  base.dribblePast = card(g.dribbles?.past)
  base.foulsDrawn = card(g.fouls?.drawn)
  base.foulsCommitted = card(g.fouls?.committed)
  base.cardsYellow = card(g.cards?.yellow)
  base.cardsRed = card(g.cards?.red)
  base.penaltyWon = card(g.penalty?.won)
  base.penaltyCommitted = card(g.penalty?.committed)
  base.penaltyScored = card(g.penalty?.scored)
  base.penaltyMissed = card(g.penalty?.missed)
  base.penaltySaved = card(g.penalty?.saved)
  base.subsIn = card(g.substitutes?.in)
  base.subsOut = card(g.substitutes?.out)
  base.subsBench = card(g.substitutes?.bench)
  return base
}

export async function saveMatchPlayerStatistics(id: string, stats: MatchPlayerStatistics): Promise<void> {
  await updateDoc(matchRef(id), { playerStatistics: stats, playerStatisticsUpdatedAt: Date.now() } as Record<string, unknown>)
}

export async function savePlayerDistance(matchId: string, playerId: string, distanceKm: number): Promise<void> {
  await updateDoc(matchRef(matchId), { [`playersDistance.${playerId}`]: distanceKm } as Record<string, unknown>)
}

export async function fetchAndSaveMatchPlayerStatistics(match: Match): Promise<number> {
  if (!match.fixtureId) return 0
  const teams = await fetchFixturePlayerStatistics(match.fixtureId)
  if (!teams || teams.length === 0) return 0

  const homeTeam = teams[0]
  const awayTeam = teams[1] ?? teams[0]
  const toEntries = (group: { team: { id?: number; name: string }; players: { player: { id: number; name: string; photo?: string | null }; statistics: RawPlayerGroup[] }[] }): Record<string, { playerId: string; name: string; photo?: string | null; stats: PlayerFixtureStatistics }> => {
    const out: Record<string, { playerId: string; name: string; photo?: string | null; stats: PlayerFixtureStatistics }> = {}
    for (const entry of group.players ?? []) {
      out[String(entry.player.id)] = {
        playerId: String(entry.player.id),
        name: entry.player.name ?? '—',
        photo: entry.player.photo ?? null,
        stats: mapPlayerStats(entry.statistics),
      }
    }
    return out
  }

  const stats: MatchPlayerStatistics = {
    home: toEntries(homeTeam),
    away: toEntries(awayTeam),
  }
  await saveMatchPlayerStatistics(match.id, stats)
  return Object.keys(stats.home).length + Object.keys(stats.away).length
}

export type { Match, MatchEvent, MatchStatus }
