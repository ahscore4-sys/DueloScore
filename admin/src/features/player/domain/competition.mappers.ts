import type { Team, Player } from '@/types'
import type { ApiSquadPlayer } from '@/features/match/domain/apiFootball.types'
import { TEAM_API_MAP, LEAGUE_NAMES } from '@/features/match/domain/match.constants'
import type { CompetitionPlayerDoc } from './competition.types'
import { POSITION_LABELS } from './competition.types'

const API_ID_BY_TEAM: Record<string, number> = Object.fromEntries(
  Object.entries(TEAM_API_MAP).map(([apiId, teamId]) => [teamId, Number(apiId)]),
)

export function apiIdOfTeam(team: Team | undefined | null): number | null {
  if (!team) return null
  if (typeof team.id === 'number') return Number.isFinite(team.id) ? team.id : null
  if (API_ID_BY_TEAM[team.id]) return Number(API_ID_BY_TEAM[team.id])
  if (team.id.startsWith('api_')) {
    const n = Number(team.id.slice(4))
    return Number.isFinite(n) ? n : null
  }
  if (/^\d+$/.test(team.id)) return Number(team.id)
  return null
}

export function leagueIdForCompetition(name: string | undefined): number | undefined {
  if (!name) return undefined
  const target = name.trim()
  for (const [id, label] of Object.entries(LEAGUE_NAMES)) {
    const plain = label.replace(/\s*\(.*\)$/, '').trim()
    if (plain === target) return Number(id)
  }
  return undefined
}

export function competitionPlayerToLegacy(p: CompetitionPlayerDoc, teamId: string): Player {
  const position = p.position === 'Goalkeeper'
    ? 'حارس'
    : (POSITION_LABELS[p.position] ?? p.position) || 'لاعب'
  return {
    id: String(p.id),
    name: p.name,
    position,
    number: p.number ?? 0,
    teamId,
    imageUrl: p.photo || undefined,
    age: p.age ?? undefined,
    nationality: p.nationality ?? undefined,
    flag: p.flag ?? undefined,
  }
}

export function apiSquadPlayerToCompetition(row: ApiSquadPlayer): CompetitionPlayerDoc {
  return {
    id: row.id,
    name: row.name,
    age: row.age,
    number: row.number,
    position: row.position ?? '',
    photo: row.photo,
  }
}