export interface CompetitionDoc {
  leagueId: number
  name: string
  logo: string
  season: number
  updatedAt?: { _seconds: number; _nanoseconds: number } | Date
}

export interface CompetitionTeamCoach {
  id: number
  name: string
  age: number | null
  nationality: string | null
  photo: string
  photoPath?: string | null
}

export interface LeaderboardEntry {
  playerId: number | string
  name: string
  photo: string
  value: number
}

export interface TeamSeasonStatisticsDoc {
  form: string | null
  played: number
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  goalsDiff: number
  cleanSheets: number
  failedToScore: number
  penaltyScored: number
  penaltyMissed: number
  penaltyTotal: number
  yellowCards: number
  redCards: number
  topScorers?: LeaderboardEntry[]
  topAssists?: LeaderboardEntry[]
  topRated?: LeaderboardEntry[]
  updatedAt?: number
}

export type TeamSeasonStatisticsMap = Record<string, TeamSeasonStatisticsDoc>

export interface PlayerSeasonStatisticsDoc {
  appearances: number | null
  lineups: number | null
  minutes: number | null
  rating: number | null
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
  updatedAt?: number
}

export type PlayerSeasonStatisticsMap = Record<string, PlayerSeasonStatisticsDoc>

// Picks the storage key to display: the current season when present, otherwise
// the latest stored season (mirrors the previous-season fallback on the backend).
export function preferredSeasonKey(statistics: Record<string, unknown> | undefined, currentSeason: number): string | undefined {
  if (!statistics) return undefined
  const keys = Object.keys(statistics)
  if (keys.length === 0) return undefined
  if (keys.includes(String(currentSeason))) return String(currentSeason)
  const numeric = keys.map(Number).filter((n) => Number.isFinite(n)).sort((a, b) => b - a)
  return numeric.length > 0 ? String(numeric[0]) : keys[0]
}

export function playerStatisticsForSeason(
  statistics: PlayerSeasonStatisticsMap | undefined,
  currentSeason: number,
): PlayerSeasonStatisticsDoc | undefined {
  if (!statistics) return undefined
  const key = preferredSeasonKey(statistics, currentSeason)
  return key ? statistics[key] : undefined
}

export interface CompetitionTeamDoc {
  id: number
  name: string
  code: string | null
  country: string | null
  flag?: string | null
  logo: string | null
  founded: number | null
  coach?: CompetitionTeamCoach | null
  statistics?: TeamSeasonStatisticsMap
  statisticsUpdatedAt?: number
  updatedAt?: { _seconds: number; _nanoseconds: number } | Date
}

export interface CompetitionPlayerDoc {
  id: number | string
  name: string
  age: number | null
  number: number | null
  position: string
  specificPosition?: string
  nationality?: string | null
  flag?: string | null
  photo: string
  photoPath?: string | null
  statistics?: PlayerSeasonStatisticsMap
  statisticsUpdatedAt?: number
  ratingOverrides?: Record<string, number>
  updatedAt?: { _seconds: number; _nanoseconds: number } | Date
}

export const PLAYER_POSITIONS = ['Goalkeeper', 'Defender', 'Midfielder', 'Attacker'] as const
export type PlayerPosition = (typeof PLAYER_POSITIONS)[number]

export const POSITION_LABELS: Record<string, string> = {
  Goalkeeper: 'حارس مرمى',
  Defender: 'مدافع',
  Midfielder: 'وسط',
  Attacker: 'مهاجم',
}

export function positionLabel(position: string): string {
  return POSITION_LABELS[position] ?? (position || 'لاعب')
}

export interface PositionGroup {
  key: string
  label: string
}

export function positionGroup(position: string): PositionGroup {
  switch (position) {
    case 'Goalkeeper':
      return { key: 'goalkeepers', label: 'حراس المرمى' }
    case 'Defender':
      return { key: 'defenders', label: 'المدافعون' }
    case 'Midfielder':
      return { key: 'midfielders', label: 'لاعبو الوسط' }
    case 'Attacker':
      return { key: 'attackers', label: 'المهاجمون' }
    default:
      return { key: 'others', label: 'أخرى' }
  }
}
