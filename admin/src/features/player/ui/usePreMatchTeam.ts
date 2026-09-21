import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Team, Player } from '@/types'
import { getCompetitionTeamByApiId, getTeamPlayers, subscribeCompetitionTeamByApiId, subscribeTeamPlayers } from '../data/competitionDatabase.service'
import type { CompetitionPlayerDoc, CompetitionTeamDoc } from '../domain/competition.types'
import { apiIdOfTeam, competitionPlayerToLegacy, leagueIdForCompetition } from '../domain/competition.mappers'

export interface PreMatchTeamData {
  apiId: number | null
  competitionId: number | null
  teamId: number | null
  teamDoc: CompetitionTeamDoc | null
  logo: string | null
  players: Player[]
  loading: boolean
  refresh: () => Promise<void>
}

export function usePreMatchTeam(team: Team | undefined | null, competitionName?: string): PreMatchTeamData {
  const apiId = useMemo(() => (team ? apiIdOfTeam(team) : null), [team])
  const preferCompetitionId = useMemo(
    () => (competitionName ? leagueIdForCompetition(competitionName) : undefined),
    [competitionName],
  )

  const [competitionId, setCompetitionId] = useState<number | null>(null)
  const [teamId, setTeamId] = useState<number | null>(null)
  const [teamDoc, setTeamDoc] = useState<CompetitionTeamDoc | null>(null)
  const [players, setPlayers] = useState<CompetitionPlayerDoc[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!apiId) {
      setCompetitionId(null)
      setTeamId(null)
      setTeamDoc(null)
      setPlayers([])
      setLoading(false)
      return
    }
    setLoading(true)
    return subscribeCompetitionTeamByApiId(apiId, preferCompetitionId, (entry) => {
      setCompetitionId(entry?.competitionId ?? null)
      setTeamId(entry?.teamId ?? null)
      setTeamDoc(entry?.team ?? null)
    })
  }, [apiId, preferCompetitionId])

  useEffect(() => {
    if (!competitionId || !teamId) {
      setPlayers([])
      setLoading(false)
      return
    }
    setLoading(true)
    return subscribeTeamPlayers(competitionId, teamId, (p) => {
      setPlayers(p)
      setLoading(false)
    })
  }, [competitionId, teamId])

  const refresh = useCallback(async () => {
    if (!apiId) return
    const entry = await getCompetitionTeamByApiId(apiId, preferCompetitionId)
    setCompetitionId(entry?.competitionId ?? null)
    setTeamId(entry?.teamId ?? null)
    setTeamDoc(entry?.team ?? null)
    if (entry) {
      const nextPlayers = await getTeamPlayers(entry.competitionId, entry.teamId)
      setPlayers(nextPlayers)
    }
    setLoading(false)
  }, [apiId, preferCompetitionId])

  const legacyPlayers = useMemo(
    () => players.map((p) => competitionPlayerToLegacy(p, team?.id ?? '')),
    [players, team?.id],
  )

  return {
    apiId,
    competitionId,
    teamId,
    teamDoc,
    logo: teamDoc?.logo ?? team?.logo ?? null,
    players: legacyPlayers,
    loading,
    refresh,
  }
}