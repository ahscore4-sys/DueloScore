export type CoverageMatchStatus = 'not_started' | 'in_progress' | 'finished' | 'postponed'

export interface CoverageReferee {
  role: string
  name: string
}

export interface CoverageMatchTeam {
  id: number
  name: string
  logo: string
}

export interface CoverageStatItem {
  type: string
  value: string | null
}

export interface CoverageMatchStatistics {
  home: CoverageStatItem[]
  away: CoverageStatItem[]
}

export interface CoveragePlayerFixtureStatistics {
  minutes: number | null
  rating: number | null
  number: number | null
  position: string | null
  captain: boolean
  substitute: boolean
  shotsTotal: number | null
  shotsOn: number | null
  goals: number | null
  conceded: number | null
  assists: number | null
  saves: number | null
  passesTotal: number | null
  passesKey: number | null
  passesAccuracy: number | null
  tacklesTotal: number | null
  tacklesBlocks: number | null
  tacklesInterceptions: number | null
  duelsTotal: number | null
  duelsWon: number | null
  dribbleAttempts: number | null
  dribbleSuccess: number | null
  dribblePast: number | null
  foulsDrawn: number | null
  foulsCommitted: number | null
  cardsYellow: number | null
  cardsRed: number | null
  penaltyWon: number | null
  penaltyCommitted: number | null
  penaltyScored: number | null
  penaltyMissed: number | null
  penaltySaved: number | null
  subsIn: number | null
  subsOut: number | null
  subsBench: number | null
}

export interface CoveragePlayerFixtureEntry {
  playerId: string
  name: string
  photo?: string | null
  stats: CoveragePlayerFixtureStatistics
}

export type CoverageMatchPlayerStatistics = {
  home: Record<string, CoveragePlayerFixtureEntry>
  away: Record<string, CoveragePlayerFixtureEntry>
}

export interface CoveragePlanPlayerData {
  id: string
  name: string
  nameAr?: string | null
  number: number | null
  pos: string
  grid?: string | null
  photo?: string | null
}

export interface CoveragePlanCoach {
  name: string | null
  photo?: string | null
}

export interface CoverageTeamPlan {
  formation: string
  lineup: string[]
  bench: string[]
  injured: string[]
  suspended: string[]
  captain: string | null
  playerData: Record<string, CoveragePlanPlayerData>
  coach: CoveragePlanCoach | null
}

export type CoveragePlans = Record<string, CoverageTeamPlan>

export type CoverageEventType =
  | 'goal'
  | 'og'
  | 'pen_scored'
  | 'pen_missed'
  | 'yellow'
  | 'red'
  | 'sub'
  | 'phase'

export interface CoverageEvent {
  id: string
  minute: string
  elapsed: number
  extra: number
  type: CoverageEventType
  detail: string | null
  team: 'home' | 'away' | null
  player: string
  playerName: string
  playerOut?: string
  playerOutName?: string
  assistPlayer?: string
  assistName?: string
  secondYellow?: boolean
  penaltyMissCause?: 'saved' | 'off_target' | null
}

export interface CoverageMatch {
  id: string
  fixtureId: number
  competitionId: number
  competition: string
  competitionAr?: string
  round: string
  season: number
  date: string
  kickoff: string
  timestamp: number
  home: CoverageMatchTeam
  away: CoverageMatchTeam
  homeNameAr?: string
  awayNameAr?: string
  homeScore: number | null
  awayScore: number | null
  status: CoverageMatchStatus
  apiStatus: string
  apiElapsed: number | null
  apiExtra: number | null
  stadium: string
  stadiumAr?: string
  channels: string[]
  commentators?: string[]
  referees?: CoverageReferee[]
  summaryVideoUrl?: string
  saved: boolean
  savedAt?: number
  editedAt?: number
  updatedAt?: number
  statistics?: CoverageMatchStatistics
  playerStatistics?: CoverageMatchPlayerStatistics
  statisticsUpdatedAt?: number
  playerStatisticsUpdatedAt?: number
  plans?: CoveragePlans
  ratings?: Record<string, number>
  lineupsUpdatedAt?: number
  eventsUpdatedAt?: number
}

export const COVERAGE_MATCH_STATUS_OPTIONS: { value: CoverageMatchStatus; label: string }[] = [
  { value: 'not_started', label: 'قادمة' },
  { value: 'in_progress', label: 'مباشرة الآن' },
  { value: 'finished', label: 'منتهية' },
  { value: 'postponed', label: 'مؤجلة' },
]

export const COVERAGE_MATCH_STATUS_LABELS: Record<CoverageMatchStatus, string> = {
  not_started: 'قادمة',
  in_progress: 'مباشرة الآن',
  finished: 'منتهية',
  postponed: 'مؤجلة',
}

export const COVERAGE_MATCH_STATUS_COLORS: Record<CoverageMatchStatus, string> = {
  not_started: '#B0BEC5',
  in_progress: '#00E676',
  finished: '#90A4AE',
  postponed: '#FFB300',
}

export function displayTeamName(match: CoverageMatch, side: 'home' | 'away'): string {
  const fallback = side === 'home' ? match.home.name : match.away.name
  const override = side === 'home' ? match.homeNameAr : match.awayNameAr
  return (override ?? '').trim() || fallback
}

export function displayCompetition(match: CoverageMatch): string {
  return (match.competitionAr ?? '').trim() || match.competition
}

export function displayStadium(match: CoverageMatch): string {
  return (match.stadiumAr ?? '').trim() || match.stadium
}

const ARABIC_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']

export function formatKickoff12(hhmm: string): string {
  const m = hhmm.match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return hhmm
  let h = Number(m[1])
  const period = h >= 12 ? 'مساءً' : 'صباحاً'
  h = h % 12 || 12
  return `${h}:${m[2]} ${period}`
}

export function formatDateAr(date: string): string {
  const [y, mo, d] = date.split('-').map(Number)
  if (!y || !mo || !d) return date
  return `${d} ${ARABIC_MONTHS[mo - 1]} ${y}`
}

export function formatSeason(value: number | undefined | null): string {
  if (!value || !Number.isFinite(value) || value <= 0) return ''
  const y = Math.floor(value)
  return `${y}/${String((y % 100) + 1).padStart(2, '0')}`
}

export function parseSeason(text: string): number | undefined {
  const m = text.match(/\d{4}/)
  if (!m) return undefined
  const y = Number(m[0])
  return y >= 1900 && y <= 2100 ? y : undefined
}

export function coverageEventSortKey(event: CoverageEvent): number {
  const m = (event.minute || '').replace(/[^\d+]/g, '')
  const parts = m.split('+')
  const base = Number(parts[0]) || 0
  const added = parts.length > 1 ? Number(parts[1]) || 0 : 0
  return base * 100 + added
}

export function sortCoverageEvents(events: CoverageEvent[]): CoverageEvent[] {
  return [...events].sort((a, b) => coverageEventSortKey(a) - coverageEventSortKey(b))
}