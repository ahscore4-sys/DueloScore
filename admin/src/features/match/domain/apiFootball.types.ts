export interface ApiTeam {
  id: number
  name: string
  logo: string
  code?: string | null
  country?: string | null
  founded?: number | null
  national?: boolean
}

export interface ApiLeague {
  id: number
  name: string
  country: string
  logo: string
  flag: string | null
  season: number
  round: string
}

export interface ApiGoals {
  home: number | null
  away: number | null
}

export interface ApiScore {
  halftime: ApiGoals
  fulltime: ApiGoals
  extratime: ApiGoals | null
  penalty: ApiGoals | null
}

export interface ApiFixtureStatus {
  id: number
  short: string
  elapsed: number | null
}

export interface ApiFixture {
  id: number
  referee: string | null
  timezone: string
  date: string
  timestamp: number
  status: ApiFixtureStatus
}

export interface ApiFixtureVenue {
  id: number | null
  name: string | null
  city: string | null
}

export interface ApiFixtureResponse {
  fixture: ApiFixture
  league: ApiLeague
  teams: { home: ApiTeam; away: ApiTeam }
  goals: ApiGoals
  score: ApiScore
  venue?: ApiFixtureVenue
}

export interface ApiLineupPlayer {
  id: number
  name: string
  number: number
  pos: string
  grid?: string
}

export interface ApiCoach {
  id: number
  name: string
  photo: string
}

export interface ApiLineupTeam {
  team: ApiTeam
  formation: string
  startXI: { player: ApiLineupPlayer }[]
  substitutes: { player: ApiLineupPlayer }[]
  coach: ApiCoach
}

export interface ApiLineupResponse {
  response: ApiLineupTeam[]
}

export interface ApiStandingsStats {
  played: number
  win: number
  draw: number
  lose: number
  goals: { for: number; against: number }
}

export interface ApiStandingsRow {
  rank: number
  team: ApiTeam
  points: number
  goalsDiff: number
  group: string
  form: string | null
  status: string | null
  description: string | null
  all: ApiStandingsStats
  home: ApiStandingsStats
  away: ApiStandingsStats
}

export interface ApiStandingsEntry {
  league: ApiLeague & { standings: ApiStandingsRow[][] }
}

export interface ApiStandingsResponse {
  response: ApiStandingsEntry[]
}

export interface ApiTeamRow {
  team: ApiTeam
  venue?: ApiFixtureVenue | null
}

export interface ApiTeamsResponse {
  response: ApiTeamRow[]
}

export interface ApiSquadPlayer {
  id: number
  name: string
  age: number | null
  number: number | null
  position: string
  photo: string
}

export interface ApiSquadEntry {
  team: ApiTeam
  players: ApiSquadPlayer[]
}

export interface ApiSquadsResponse {
  response: ApiSquadEntry[]
}

export interface ApiCoachCareer {
  team?: { id: number; name: string; logo: string } | null
  start?: string | null
  end?: string | null
}

export interface ApiCoach {
  id: number
  name: string
  firstname: string
  lastname: string
  age: number | null
  nationality: string | null
  photo: string
  career: ApiCoachCareer[]
}

export interface ApiCoachsResponse {
  response: ApiCoach[]
}

export interface ApiInjuryPlayer {
  id: number
  name: string
  type: string
  reason: string
  photo?: string
}

export interface ApiInjuryEntry {
  player: ApiInjuryPlayer & { photo?: string }
  team: ApiTeam
  fixture?: { id: number; timezone?: string; date?: string; timestamp?: number }
  league?: ApiLeague
}

export interface ApiInjuriesResponse {
  response: ApiInjuryEntry[]
}

export interface ApiPlayerProfileResponse {
  response?: { player?: { id?: number; name?: string; age?: number | null; number?: number | null; position?: string | null; photo?: string } }[]
}

export interface ApiFixturePlayerGames {
  appearances?: number | null
  lineups?: number | null
  minutes: number | null
  number?: number | null
  position?: string | null
  rating: string | null
  captain?: boolean
  substitute?: boolean
}

export interface ApiFixturePlayerSubstitutes {
  in?: number | null
  out?: number | null
  bench?: number | null
}

export interface ApiFixturePlayerShots {
  total: number | null
  on: number | null
}

export interface ApiFixturePlayerGoals {
  total: number | null
  conceded: number | null
  assists: number | null
  saves: number | null
}

export interface ApiFixturePlayerPasses {
  total: number | null
  key: number | null
  accuracy: number | null
}

export interface ApiFixturePlayerTackles {
  total: number | null
  blocks: number | null
  interceptions: number | null
}

export interface ApiFixturePlayerDuels {
  total: number | null
  won: number | null
}

export interface ApiFixturePlayerDribbles {
  attempts: number | null
  success: number | null
  past: number | null
}

export interface ApiFixturePlayerFouls {
  drawn: number | null
  committed: number | null
}

export interface ApiFixturePlayerCards {
  yellow: number | null
  red: number | null
}

export interface ApiFixturePlayerPenalty {
  won: number | null
  committed: number | null
  scored: number | null
  missed: number | null
  saved: number | null
}

export interface ApiFixturePlayerStatGroups {
  games: ApiFixturePlayerGames
  substitutes?: ApiFixturePlayerSubstitutes
  shots?: ApiFixturePlayerShots
  goals?: ApiFixturePlayerGoals
  passes?: ApiFixturePlayerPasses
  tackles?: ApiFixturePlayerTackles
  duels?: ApiFixturePlayerDuels
  dribbles?: ApiFixturePlayerDribbles
  fouls?: ApiFixturePlayerFouls
  cards?: ApiFixturePlayerCards
  penalty?: ApiFixturePlayerPenalty
}

export interface ApiFixturePlayerEntry {
  player: { id: number; name: string; photo?: string | null; number?: number | null; position?: string | null }
  statistics: ApiFixturePlayerStatGroups[]
}

export interface ApiFixturePlayersTeam {
  team: ApiTeam
  players: ApiFixturePlayerEntry[]
}

export interface ApiFixturePlayersResponse {
  response: ApiFixturePlayersTeam[]
}

export interface ApiFixtureStatItem {
  type: string
  value: string | number | null
}

export interface ApiFixtureStatisticsTeam {
  team: ApiTeam
  statistics: ApiFixtureStatItem[]
}

export interface ApiFixtureStatisticsResponse {
  response: ApiFixtureStatisticsTeam[]
}

export interface ApiFixtureEventTime {
  elapsed: number | null
  extra: number | null
}

export interface ApiFixtureEventEntry {
  time: ApiFixtureEventTime
  team: { id: number; name: string; logo: string }
  player: { id: number; name: string }
  assist: { id: number; name: string }
  type: string
  detail: string
  comments: string | null
}

export interface ApiFixtureEventsResponse {
  response: ApiFixtureEventEntry[]
}
