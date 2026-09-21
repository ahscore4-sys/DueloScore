import { useEffect, useState } from 'react'
import { subscribeCompetition, subscribeTeamPlayers, subscribeTeamHasPlayers, subscribeTeams } from '../data/competitionDatabase.service'
import type { CompetitionDoc, CompetitionPlayerDoc, CompetitionTeamDoc } from '../domain/competition.types'

export function useCompetition(leagueId: number): CompetitionDoc | null {
  const [comp, setComp] = useState<CompetitionDoc | null>(null)

  useEffect(() => {
    const off = subscribeCompetition(leagueId, setComp)
    return off
  }, [leagueId])

  return comp
}

export function useCompetitionTeams(leagueId: number): { teams: CompetitionTeamDoc[]; loading: boolean } {
  const [teams, setTeams] = useState<CompetitionTeamDoc[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const off = subscribeTeams(leagueId, (t) => {
      setTeams(t)
      setLoading(false)
    })
    return () => {
      off()
      setLoading(false)
    }
  }, [leagueId])

  return { teams, loading }
}

export function useTeamPlayers(leagueId: number, teamId: number): { players: CompetitionPlayerDoc[]; loading: boolean } {
  const [players, setPlayers] = useState<CompetitionPlayerDoc[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const off = subscribeTeamPlayers(leagueId, teamId, (p) => {
      setPlayers(p)
      setLoading(false)
    })
    return () => {
      off()
      setLoading(false)
    }
  }, [leagueId, teamId])

  return { players, loading }
}

export function useTeamHasPlayers(leagueId: number, teamId: number): boolean {
  const [has, setHas] = useState(false)

  useEffect(() => {
    let active = true
    const off = subscribeTeamHasPlayers(leagueId, teamId, (v) => {
      if (active) setHas(v)
    })
    return () => {
      active = false
      off()
    }
  }, [leagueId, teamId])

  return has
}