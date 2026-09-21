import { useMemo, useState } from 'react'
import type { Match, MatchStatus } from '../types'
import { mainCompetitions, mainTeams } from '../mockData'

export interface MatchFilters {
  search: string
  competition: string
  status: MatchStatus | ''
  team: string
  date: string
}

const initialFilters: MatchFilters = { search: '', competition: '', status: '', team: '', date: '' }

export function useMatchesFilters(allMatches: Match[], statuses?: Map<string, MatchStatus>) {
  const [filters, setFilters] = useState<MatchFilters>(initialFilters)

  const competitions = mainCompetitions

  const teams = mainTeams

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase()
    return allMatches.filter((m) => {
      const status = statuses?.get(m.id) ?? m.status
      if (filters.competition && m.competition !== filters.competition) return false
      if (filters.status && status !== filters.status) return false
      if (filters.team && m.home.name !== filters.team && m.away.name !== filters.team) return false
      if (filters.date && m.date !== filters.date) return false
      if (q) {
        const haystack = [m.home.name, m.away.name, m.competition, m.round].join(' ').toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [allMatches, filters, statuses])

  const hasFilters = Boolean(filters.search || filters.competition || filters.status || filters.team || filters.date)

  const clear = () => setFilters(initialFilters)
  const set = (patch: Partial<MatchFilters>) => setFilters((f) => ({ ...f, ...patch }))

  return { filters, set, clear, hasFilters, competitions, teams, filtered }
}
