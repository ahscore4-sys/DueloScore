import { useEffect, useReducer, useCallback } from 'react'
import type { MatchEvent } from '../domain/match.types'
import { subscribeMatchEvents, addEvent as fsAddEvent, updateEvent as fsUpdateEvent, deleteEvent as fsDeleteEvent, type EventPatch } from '../data/match.service'

export type { EventPatch }

export function useMatchEvents(matchId?: string | null) {
  const [events, setEvents] = useReducer((_: MatchEvent[], next: MatchEvent[]) => next, [])

  useEffect(() => {
    if (!matchId) return
    return subscribeMatchEvents(matchId, setEvents)
  }, [matchId])

  const addGoal = useCallback((team: 'home' | 'away', minute: string, player = '', videoUrl?: string, assistPlayer?: string) => {
    if (!matchId) return
    fsAddEvent(matchId, { minute, type: 'goal', player, team, ...(videoUrl ? { videoUrl } : {}), ...(assistPlayer ? { assistPlayer } : {}) })
  }, [matchId])

  const addOG = useCallback((benefitingTeam: 'home' | 'away', minute: string, player = '', videoUrl?: string) => {
    if (!matchId) return
    fsAddEvent(matchId, { minute, type: 'og', player, team: benefitingTeam, ...(videoUrl ? { videoUrl } : {}) })
  }, [matchId])

  const addEvent = useCallback((team: 'home' | 'away', type: MatchEvent['type'], player: string, minute: string, playerOut?: string, videoUrl?: string, secondYellow?: boolean, penaltyMissCause?: 'saved' | 'off_target') => {
    if (!matchId) return
    fsAddEvent(matchId, { minute, type, player, team, ...(playerOut ? { playerOut } : {}), ...(videoUrl ? { videoUrl } : {}), ...(secondYellow ? { secondYellow } : {}), ...(penaltyMissCause ? { penaltyMissCause } : {}) })
  }, [matchId])

  const addPhaseMarker = useCallback((phase: string, minute: string) => {
    if (!matchId) return
    fsAddEvent(matchId, { minute, type: 'phase', player: '', team: 'home', phase })
  }, [matchId])

  const addVarCheck = useCallback((minute: string, cause?: string) => {
    if (!matchId) return
    fsAddEvent(matchId, { minute, type: 'var', player: '', team: 'home', ...(cause ? { varCheckCause: cause } : {}) })
  }, [matchId])

  const updateEvent = useCallback((eventId: string, patch: EventPatch) => {
    if (!matchId) return
    fsUpdateEvent(matchId, eventId, patch)
  }, [matchId])

  const deleteEvent = useCallback((eventId: string) => {
    if (!matchId) return
    fsDeleteEvent(matchId, eventId)
  }, [matchId])

  if (!matchId) {
    return { events: [] as MatchEvent[], addGoal: () => {}, addOG: () => {}, addEvent: () => {}, addPhaseMarker: () => {}, addVarCheck: () => {}, updateEvent: () => {}, deleteEvent: () => {} }  }

  return { events, addGoal, addOG, addEvent, addPhaseMarker, addVarCheck, updateEvent, deleteEvent }
}
