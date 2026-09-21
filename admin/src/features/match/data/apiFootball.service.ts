import type { ApiFixtureResponse, ApiLineupResponse, ApiStandingsResponse, ApiStandingsRow, ApiTeamRow, ApiSquadsResponse, ApiCoachsResponse, ApiCoach, ApiInjuriesResponse, ApiInjuryPlayer, ApiPlayerProfileResponse, ApiFixturePlayersResponse, ApiFixturePlayersTeam, ApiFixtureStatisticsTeam, ApiFixtureStatisticsResponse, ApiFixtureEventsResponse } from '../domain/apiFootball.types'
import type { UpcomingFixture } from '../domain/match.types'
import { API_FOOTBALL_BASE, API_FOOTBALL_LEAGUES, API_FOOTBALL_TEAMS, getCurrentSeason } from '../domain/match.constants'

function headers(): Record<string, string> {
  const key = import.meta.env.VITE_API_FOOTBALL_KEY
  if (!key) throw new Error('VITE_API_FOOTBALL_KEY is not set')
  return { 'x-apisports-key': key }
}

async function apiGet<T>(path: string, params: Record<string, string>): Promise<T | null> {
  try {
    const url = new URL(path, API_FOOTBALL_BASE)
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
    const res = await fetch(url.toString(), { headers: headers() })
    if (!res.ok) return null
    const data = await res.json()
    return (data as { response?: T }).response ?? null
  } catch {
    return null
  }
}

export async function fetchUpcomingFixtures(
  leagueId: number,
  teamId: number,
  season?: number,
): Promise<ApiFixtureResponse[]> {
  const result = await apiGet<ApiFixtureResponse[]>('/fixtures', {
    team: String(teamId),
    league: String(leagueId),
    season: String(season ?? getCurrentSeason()),
    next: '10',
  })
  return result ?? []
}

export async function fetchLineups(fixtureId: number): Promise<ApiLineupResponse | null> {
  const url = new URL('/fixtures/lineups', API_FOOTBALL_BASE)
  url.searchParams.set('fixture', String(fixtureId))
  try {
    const res = await fetch(url.toString(), { headers: headers() })
    if (!res.ok) return null
    const data = await res.json()
    return data as ApiLineupResponse
  } catch {
    return null
  }
}

export async function fetchMatchById(fixtureId: number): Promise<{ response: ApiFixtureResponse[] } | null> {
  const url = new URL('/fixtures', API_FOOTBALL_BASE)
  url.searchParams.set('id', String(fixtureId))
  try {
    const res = await fetch(url.toString(), { headers: headers() })
    if (!res.ok) return null
    const data = await res.json()
    return data as { response: ApiFixtureResponse[] }
  } catch {
    return null
  }
}

export async function fetchAllUpcoming(): Promise<UpcomingFixture[]> {
  const all: UpcomingFixture[] = []
  const seen = new Set<number>()
  const season = getCurrentSeason()

  const teamEntries = Object.entries(API_FOOTBALL_TEAMS) as [string, number][]

  for (const leagueId of API_FOOTBALL_LEAGUES) {
    for (const [, teamId] of teamEntries) {
      const fixtures = await fetchUpcomingFixtures(leagueId, teamId, season)
      for (const f of fixtures) {
        if (seen.has(f.fixture.id)) continue
        seen.add(f.fixture.id)
        all.push({
          fixtureId: f.fixture.id,
          date: f.fixture.date,
          timestamp: f.fixture.timestamp,
          league: { id: f.league.id, name: f.league.name, logo: f.league.logo },
          home: { id: f.teams.home.id, name: f.teams.home.name, logo: f.teams.home.logo },
          away: { id: f.teams.away.id, name: f.teams.away.name, logo: f.teams.away.logo },
          status: { short: f.fixture.status.short, elapsed: f.fixture.status.elapsed },
          round: f.league.round || '',
          venue: null,
        })
      }
    }
  }

  all.sort((a, b) => a.timestamp - b.timestamp)
  return all
}

export interface ApiStandingsTeam {
  id: string
  name: string
  logo: string
  short: string
  rank: number
  points: number
  goalsDiff: number
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  form: string | null
}

export interface ApiStandingsTable {
  leagueId: number
  name: string
  logo: string
  season: number
  rows: ApiStandingsTeam[]
}

export async function fetchStandings(leagueId: number, season?: number): Promise<ApiStandingsTable | null> {
  const url = new URL('/standings', API_FOOTBALL_BASE)
  url.searchParams.set('league', String(leagueId))
  url.searchParams.set('season', String(season ?? getCurrentSeason()))
  try {
    const res = await fetch(url.toString(), { headers: headers() })
    if (!res.ok) return null
    const data = (await res.json()) as ApiStandingsResponse
    const entry = data.response?.[0]
    const groups = entry?.league?.standings ?? []
    const rows = groups.flat()
    if (!rows || rows.length === 0) return null
    return {
      leagueId,
      name: entry.league.name,
      logo: entry.league.logo,
      season: entry.league.season,
      rows: rows.map((r: ApiStandingsRow) => ({
        id: String(r.team.id),
        name: r.team.name,
        logo: r.team.logo,
        short: (r.team.name || '').slice(0, 3).toUpperCase(),
        rank: r.rank,
        points: r.points,
        goalsDiff: r.goalsDiff,
        played: r.all.played,
        won: r.all.win,
        drawn: r.all.draw,
        lost: r.all.lose,
        goalsFor: r.all.goals.for,
        goalsAgainst: r.all.goals.against,
        form: r.form,
      })),
    }
  } catch {
    return null
  }
}

export async function fetchAllStandings(
  season?: number,
  leagueIds: readonly number[] = API_FOOTBALL_LEAGUES,
): Promise<ApiStandingsTable[]> {
  const results = await Promise.allSettled(
    leagueIds.map((lid) => fetchStandings(lid, season)),
  )
  return results
    .filter((r): r is PromiseFulfilledResult<ApiStandingsTable | null> => r.status === 'fulfilled')
    .map((r) => r.value)
    .filter((t): t is ApiStandingsTable => t !== null)
}

export interface CompetitionTeam {
  id: number
  name: string
  code: string | null
  country: string | null
  logo: string | null
  founded: number | null
}

export async function fetchTeamsByLeague(leagueId: number, season?: number): Promise<CompetitionTeam[]> {
  const result = await apiGet<ApiTeamRow[]>('/teams', {
    league: String(leagueId),
    season: String(season ?? getCurrentSeason()),
  })
  return (result ?? []).map((row) => ({
    id: row.team.id,
    name: row.team.name,
    code: row.team.code ?? null,
    country: row.team.country ?? null,
    logo: row.team.logo ?? null,
    founded: row.team.founded ?? null,
  }))
}

export async function fetchUclLeaguePhaseTeams(season?: number): Promise<CompetitionTeam[]> {
  const table = await fetchStandings(2, season)
  if (!table) return []
  return table.rows.map((r) => ({
    id: Number(r.id),
    name: r.name,
    code: null,
    country: null,
    logo: r.logo,
    founded: null,
  }))
}

export interface SquadPlayer {
  id: number
  name: string
  age: number | null
  number: number | null
  position: string
  photo: string
}

export async function fetchSquad(teamId: number): Promise<SquadPlayer[]> {
  const url = new URL('/players/squads', API_FOOTBALL_BASE)
  url.searchParams.set('team', String(teamId))
  try {
    const res = await fetch(url.toString(), { headers: headers() })
    if (!res.ok) return []
    const data = (await res.json()) as ApiSquadsResponse
    const entry = data.response?.[0]
    return entry?.players ?? []
  } catch {
    return []
  }
}

export interface CoachData {
  id: number
  name: string
  age: number | null
  nationality: string | null
  photo: string
}

function careerStart(coach: ApiCoach, teamId: number): { start: number; active: boolean } | null {
  const entries = (coach.career ?? []).filter((e) => e.team?.id === teamId)
  if (entries.length === 0) return null
  const latest = entries.reduce((best, e) => {
    const s = e.start ? new Date(e.start).getTime() : 0
    const b = best.start ? new Date(best.start).getTime() : 0
    return s >= b ? e : best
  })
  return { start: new Date(latest.start ?? '').getTime(), active: !latest.end }
}

function pickCurrentCoach(coaches: ApiCoach[], teamId: number): ApiCoach | null {
  if (coaches.length === 0) return null
  const scored = coaches
    .map((c) => ({ coach: c, career: careerStart(c, teamId) }))
    .filter((s): s is { coach: ApiCoach; career: { start: number; active: boolean } } => s.career !== null)
  if (scored.length === 0) return coaches[0]
  const active = scored.filter((s) => s.career.active)
  const pool = active.length > 0 ? active : scored
  pool.sort((a, b) => b.career.start - a.career.start)
  return pool[0].coach
}

export async function fetchCoach(teamId: number): Promise<CoachData | null> {
  const url = new URL('/coachs', API_FOOTBALL_BASE)
  url.searchParams.set('team', String(teamId))
  try {
    const res = await fetch(url.toString(), { headers: headers() })
    if (!res.ok) return null
    const data = (await res.json()) as ApiCoachsResponse
    const coach = pickCurrentCoach(data.response ?? [], teamId)
    if (!coach) return null
    return {
      id: coach.id,
      name: coach.name,
      age: coach.age,
      nationality: coach.nationality,
      photo: coach.photo,
    }
  } catch {
    return null
  }
}

export async function fetchInjuries(teamId: number, season: number, fixtureId?: number): Promise<ApiInjuryPlayer[]> {
  const params: Record<string, string> = fixtureId != null
    ? { fixture: String(fixtureId) }
    : { team: String(teamId), season: String(season) }
  const result = await apiGet<ApiInjuriesResponse['response']>('/injuries', params)
  const seen = new Set<number>()
  const players: ApiInjuryPlayer[] = []
  for (const entry of result ?? []) {
    if (entry.team?.id != null && entry.team.id !== teamId) continue
    const p = entry.player
    if (!p || seen.has(p.id)) continue
    seen.add(p.id)
    players.push({ id: p.id, name: p.name ?? '', type: p.type ?? '', reason: p.reason ?? '', photo: p.photo ?? '' })
  }
  return players
}

export async function fetchPlayerProfile(playerId: number): Promise<SquadPlayer | null> {
  const url = new URL('/players/profiles', API_FOOTBALL_BASE)
  url.searchParams.set('player', String(playerId))
  try {
    const res = await fetch(url.toString(), { headers: headers() })
    if (!res.ok) return null
    const data = (await res.json()) as ApiPlayerProfileResponse
    const p = data.response?.[0]?.player
    if (!p?.id) return null
    return {
      id: p.id,
      name: p.name ?? '',
      age: p.age ?? null,
      number: p.number ?? null,
      position: p.position ?? '',
      photo: p.photo ?? '',
    }
  } catch {
    return null
  }
}

export async function fetchTeamRoster(teamId: number, season: number): Promise<SquadPlayer[]> {
  const [squad, injuries] = await Promise.all([fetchSquad(teamId), fetchInjuries(teamId, season)])
  const byId = new Map<number, SquadPlayer>()
  for (const p of squad) byId.set(p.id, p)
  for (const inj of injuries) {
    if (byId.has(inj.id)) continue
    const profile = await fetchPlayerProfile(inj.id)
    byId.set(inj.id, profile ?? { id: inj.id, name: inj.name, age: null, number: null, position: '', photo: inj.photo ?? '' })
  }
  return [...byId.values()]
}

export async function fetchFixturePlayerRatings(fixtureId: number): Promise<Record<number, number>> {
  const players = await fetchFixturePlayerStatistics(fixtureId)
  const ratings: Record<number, number> = {}
  for (const team of players) {
    for (const entry of team.players) {
      const games = entry.statistics?.[0]?.games
      const minutes = games?.minutes ?? 0
      const raw = games?.rating
      if (minutes > 0 && raw != null && raw !== '') {
        const rating = Number.parseFloat(raw)
        if (Number.isFinite(rating)) ratings[entry.player.id] = rating
      }
    }
  }
  return ratings
}

export async function fetchFixturePlayerStatistics(fixtureId: number): Promise<ApiFixturePlayersTeam[]> {
  const url = new URL('/fixtures/players', API_FOOTBALL_BASE)
  url.searchParams.set('fixture', String(fixtureId))
  try {
    const res = await fetch(url.toString(), { headers: headers() })
    if (!res.ok) return []
    const data = (await res.json()) as ApiFixturePlayersResponse
    return data.response ?? []
  } catch {
    return []
  }
}

export async function fetchFixtureStatistics(fixtureId: number): Promise<ApiFixtureStatisticsTeam[]> {
  const url = new URL('/fixtures/statistics', API_FOOTBALL_BASE)
  url.searchParams.set('fixture', String(fixtureId))
  try {
    const res = await fetch(url.toString(), { headers: headers() })
    if (!res.ok) return []
    const data = (await res.json()) as ApiFixtureStatisticsResponse
    return data.response ?? []
  } catch {
    return []
  }
}

export async function fetchFixtureEvents(fixtureId: number): Promise<ApiFixtureEventsResponse['response']> {
  const url = new URL('/fixtures/events', API_FOOTBALL_BASE)
  url.searchParams.set('fixture', String(fixtureId))
  try {
    const res = await fetch(url.toString(), { headers: headers() })
    if (!res.ok) return []
    const data = (await res.json()) as ApiFixtureEventsResponse
    return data.response ?? []
  } catch {
    return []
  }
}
