export const API_FOOTBALL_BASE = 'https://v3.football.api-sports.io'

export const API_FOOTBALL_LEAGUES = [140, 2, 143, 556] as const
export type ApiLeagueId = (typeof API_FOOTBALL_LEAGUES)[number]

export const API_FOOTBALL_TEAMS = { barcelona: 529, realmadrid: 541 } as const
export type ApiTeamId = (typeof API_FOOTBALL_TEAMS)[keyof typeof API_FOOTBALL_TEAMS]

export const LEAGUE_NAMES: Record<number, string> = {
  140: 'الدوري الإسباني (LaLiga)',
  2: 'دوري أبطال أوروبا (UCL)',
  143: 'كأس ملك إسبانيا (Copa del Rey)',
  556: 'كأس السوبر الإسباني (Supercopa)',
}

export const LEAGUE_NAMES_SHORT: Record<number, string> = {
  140: 'LaLiga',
  2: 'UCL',
  143: 'Copa del Rey',
  556: 'Supercopa',
}

export const LEAGUE_COLORS: Record<number, string> = {
  140: '#FF4B44',
  2: '#1A3C7E',
  143: '#E91E63',
  556: '#FF9800',
}

export const TEAM_API_MAP: Record<number, string> = {
  529: 'barca',
  541: 'madrid',
}

export const KNOWN_TEAM_FLAGS: Record<number, string> = {
  529: 'https://media.api-sports.io/flags/es.svg',
  541: 'https://media.api-sports.io/flags/es.svg',
}

export function knownTeamFlag(team: { id: string }): string | undefined {
  let apiId: number | undefined
  if (/^\d+$/.test(team.id)) {
    apiId = Number(team.id)
  } else if (team.id.startsWith('api_')) {
    apiId = Number(team.id.slice(4))
  } else {
    apiId = Number(Object.keys(TEAM_API_MAP).find((k) => TEAM_API_MAP[Number(k)] === team.id))
  }
  if (apiId != null && Number.isFinite(apiId)) return KNOWN_TEAM_FLAGS[apiId]
  return undefined
}

export const API_LEAGUE_TO_COMPETITION: Record<string, string> = {
  'La Liga': 'الدوري الإسباني',
  'UEFA Champions League': 'دوري أبطال أوروبا',
  'Copa del Rey': 'كأس ملك إسبانيا',
  'Super Cup': 'كأس السوبر الإسباني',
}

export function getCurrentSeason(): number {
  return new Date().getFullYear()
}
