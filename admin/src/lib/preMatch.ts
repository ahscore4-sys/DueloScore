import type { Match, Team } from '../types'
import { barca, madrid } from '../mockData'

export function editableTeams(match: Match): Team[] {
  const teams: Team[] = []
  if (match.home.id === barca.id || match.away.id === barca.id) teams.push(barca)
  if (match.home.id === madrid.id || match.away.id === madrid.id) teams.push(madrid)
  return teams
}
