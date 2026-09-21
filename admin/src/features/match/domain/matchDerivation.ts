import type { MatchEvent, MatchPlayerStatistics } from './match.types'

export interface DerivedMatchState {
  score: { home: number; away: number }
  playerStatuses: Record<string, 'booked' | 'off'>
  substitutions: Array<{ in: string; out: string; minute: string; team: 'home' | 'away' }>
}

export interface LiveRatings {
  home: Record<string, number>
  away: Record<string, number>
}

export function liveRatingsFromPlayerStats(stats: MatchPlayerStatistics | null | undefined): LiveRatings {
  const home: Record<string, number> = {}
  const away: Record<string, number> = {}
  const collect = (side: 'home' | 'away', target: Record<string, number>) => {
    if (!stats?.[side]) return
    for (const [id, entry] of Object.entries(stats[side])) {
      const rating = entry.stats.rating
      if (rating != null && Number.isFinite(rating)) target[id] = rating
    }
  }
  collect('home', home)
  collect('away', away)
  return { home, away }
}

export function deriveMatchState(events: MatchEvent[]): DerivedMatchState {
  let homeScore = 0
  let awayScore = 0
  const playerStatuses: Record<string, 'booked' | 'off'> = {}
  const substitutions: DerivedMatchState['substitutions'] = []

  const keyFor = (team: 'home' | 'away', player: string) => `${team}:${player}`

  for (const event of events) {
    if (event.varDecision === 'error') continue
    if (event.type === 'goal' && event.team === 'home') homeScore++
    if (event.type === 'goal' && event.team === 'away') awayScore++
    if (event.type === 'og') {
      if (event.team === 'home') awayScore++
      else homeScore++
    }
    if (event.type === 'opp_goal') {
      if (event.team === 'home') awayScore++
      else homeScore++
    }

    if (event.type === 'red' && event.player) {
      playerStatuses[keyFor(event.team, event.player)] = 'off'
    } else if (event.type === 'yellow' && event.player) {
      const key = keyFor(event.team, event.player)
      if (playerStatuses[key] !== 'off') playerStatuses[key] = 'booked'
    }

    if (event.type === 'sub' && event.player && event.playerOut) {
      substitutions.push({ in: event.player, out: event.playerOut, minute: event.minute, team: event.team })
      playerStatuses[keyFor(event.team, event.playerOut)] = 'off'
    }
  }

  return { score: { home: homeScore, away: awayScore }, playerStatuses, substitutions }
}

export function shouldConvertToRed(events: MatchEvent[], team: 'home' | 'away', player: string): boolean {
  return events.some((e) => e.type === 'yellow' && e.team === team && e.player === player)
}

export interface PlayerMatchStats {
  goals: number
  og: number
  assists: number
  yellows: number
  reds: number
  subbedOut: boolean
  cameOn: boolean
}

export function emptyPlayerStats(): PlayerMatchStats {
  return { goals: 0, og: 0, assists: 0, yellows: 0, reds: 0, subbedOut: false, cameOn: false }
}

export function derivePlayerStats(events: MatchEvent[]): Record<string, PlayerMatchStats> {
  const stats: Record<string, PlayerMatchStats> = {}

  const ensure = (id: string): PlayerMatchStats => (stats[id] ??= emptyPlayerStats())

  for (const event of events) {
    if (event.varDecision === 'error') continue

    if (event.player) {
      const s = ensure(event.player)
      if (event.type === 'goal' || event.type === 'pen_scored') s.goals++
      else if (event.type === 'og') s.og++
      else if (event.type === 'yellow') s.yellows++
      else if (event.type === 'red') s.reds++
      else if (event.type === 'sub') s.cameOn = true
    }

    if (event.assistPlayer) {
      ensure(event.assistPlayer).assists++
    }

    if (event.type === 'sub' && event.playerOut) {
      ensure(event.playerOut).subbedOut = true
    }
  }

  return stats
}

export interface SubstitutionPair {
  in: string
  out: string
  minute: string
  team: 'home' | 'away'
}

export function deriveSubstitutions(events: MatchEvent[]): SubstitutionPair[] {
  const pairs: SubstitutionPair[] = []
  for (const event of events) {
    if (event.type === 'sub' && event.player && event.playerOut) {
      pairs.push({ in: event.player, out: event.playerOut, minute: event.minute, team: event.team })
    }
  }
  return pairs
}