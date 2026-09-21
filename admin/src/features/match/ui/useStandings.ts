import { useCallback, useEffect, useState } from 'react'
import {
  fetchAllStandings,
  type ApiStandingsTable,
  type ApiStandingsTeam,
} from '../data/apiFootball.service'

export type CachedStandingsTeam = ApiStandingsTeam

export interface StandingsLeague {
  id: string
  leagueId: number
  competition: string
  logo: string
  season: string
  rows: CachedStandingsTeam[]
  groups: Record<string, CachedStandingsTeam[]>
}

const STANDINGS_LEAGUES = [140, 2] as const

function toSeasonString(year: number): string {
  return `${String(year - 1).slice(2)}/${String(year).slice(2)}`
}

function toLeague(table: ApiStandingsTable): StandingsLeague {
  return {
    id: `${table.leagueId}-${table.season}`,
    leagueId: table.leagueId,
    competition: table.name,
    logo: table.logo,
    season: toSeasonString(table.season),
    rows: table.rows,
    groups: { [table.name]: table.rows },
  }
}

export function useStandings() {
  const [leagues, setLeagues] = useState<StandingsLeague[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const tables = await fetchAllStandings(undefined, STANDINGS_LEAGUES)
      setLeagues(tables.map(toLeague))
    } catch {
      setError('فشل جلب جداول الترتيب من مزوّد البيانات')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  return { leagues, loading, refreshing, error, refresh }
}
