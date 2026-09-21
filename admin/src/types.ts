export interface Team {
  id: string
  name: string
  short: string
  color: string
  gkColor?: string
  logo?: string
  flag?: string
}

export interface Player {
  id: string
  name: string
  position: string
  number: number
  teamId: string
  status?: 'booked' | 'subbed' | 'off'
  imageUrl?: string
  age?: number
  height?: number
  weight?: number
  nationality?: string
  flag?: string
  foot?: 'right' | 'left' | 'both'
}

export type MatchStatus =
  | 'not_started'
  | 'first_half'
  | 'half_time'
  | 'second_half'
  | 'full_time'
  | 'extra_first_half'
  | 'extra_second_half'
  | 'penalties'
  | 'final'

export type ControlPhase =
  | 'not_started'
  | 'first_half'
  | 'half_time'
  | 'second_half'
  | 'full_time'
  | 'extra_first_half'
  | 'extra_break_1'
  | 'extra_second_half'
  | 'extra_break_2'
  | 'penalties'
  | 'final'

export interface PenaltyKick {
  id: string
  kickNo: number
  team: 'home' | 'away'
  player: string
  result: 'scored' | 'missed'
}

export interface RefereeAssignment {
  role: string
  name: string
}

export interface Match {
  id: string
  home: Team
  away: Team
  competition: string
  round: string
  season: string
  date: string
  kickoff: string
  stadium: string
  channels: string[]
  commentators: string[]
  referees?: RefereeAssignment[]
  status: MatchStatus
  score: { home: number; away: number }
  summaryVideoUrl?: string
  fixtureId?: number
  leagueId?: number
  ratings?: Record<string, number>
  ratingsUpdatedAt?: number
  controlPhase: ControlPhase
  clockBaseSeconds: number
  clockStartedAt: string | null
  clockRunning: boolean
  addedTime: Record<string, number>
  penalties: { home: number; away: number }
  penaltyKicks: PenaltyKick[]
  attendance?: number
  statistics?: MatchStatistics | null
  statisticsUpdatedAt?: number
  playerStatistics?: MatchPlayerStatistics | null
  playerStatisticsUpdatedAt?: number
  playersDistance?: Record<string, number>
}

export interface MatchStatItem {
  type: string
  value: string | null
}

export interface MatchStatistics {
  home: MatchStatItem[]
  away: MatchStatItem[]
}

export interface PlayerFixtureStatistics {
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

export interface PlayerFixtureEntry {
  playerId: string
  name: string
  photo?: string | null
  stats: PlayerFixtureStatistics
}

export type MatchPlayerStatistics = {
  home: Record<string, PlayerFixtureEntry>
  away: Record<string, PlayerFixtureEntry>
}

export type VarCancellationCause = 'offside' | 'foul' | 'handball' | 'ball_line'

export interface MatchEvent {
  id: string
  minute: string
  type: 'goal' | 'opp_goal' | 'og' | 'yellow' | 'red' | 'pen_scored' | 'pen_missed' | 'sub' | 'crossbar' | 'phase' | 'var'
  player: string
  playerOut?: string
  assistPlayer?: string
  team: 'home' | 'away'
  videoUrl?: string
  secondYellow?: boolean
  penaltyMissCause?: 'saved' | 'off_target'
  varAssigned?: boolean
  varCheckCause?: string
  varDecision?: 'error' | 'no_error'
  varDecisionCause?: VarCancellationCause
  phase?: string
  createdAt?: number
}

export interface OpponentPlayerData {
  id: string | number
  name: string
  nameAr?: string
  number: number
  pos: string
  grid?: string
}

export interface TeamPlan {
  formation: string
  lineup: string[]
  bench: string[]
  injured: string[]
  suspended: string[]
  captain?: string
  playerData?: Record<string, OpponentPlayerData>
}

export interface StandingRow {
  id: string
  team: Team
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  points: number
}

export interface LeagueStandings {
  id: string
  competition: string
  season: string
  table: StandingRow[]
}
