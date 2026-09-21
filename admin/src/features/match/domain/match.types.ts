import type { Match, MatchEvent, MatchStatus, Player, Team, TeamPlan, OpponentPlayerData, VarCancellationCause, RefereeAssignment, MatchStatistics, MatchStatItem, PlayerFixtureStatistics, PlayerFixtureEntry, MatchPlayerStatistics } from '@/types'

export type { Match, MatchEvent, MatchStatus, Player, Team, TeamPlan, OpponentPlayerData, VarCancellationCause, RefereeAssignment, MatchStatistics, MatchStatItem, PlayerFixtureStatistics, PlayerFixtureEntry, MatchPlayerStatistics }

export interface MatchWithPlans extends Match {
  fixtureId?: number
  plans?: Record<string, TeamPlan>
}

export interface UpcomingFixture {
  fixtureId: number
  date: string
  timestamp: number
  league: { id: number; name: string; logo: string }
  home: { id: number; name: string; logo: string }
  away: { id: number; name: string; logo: string }
  status: { short: string; elapsed: number | null }
  round: string
  venue: string | null
  alreadyImported?: boolean
}

export interface DerivedMatchState {
  playerStatuses: Record<string, 'booked' | 'off'>
  substitutions: Array<{ in: string; out: string; minute: string }>
}
