import { useEffect, useReducer, useRef, useCallback } from 'react'
import type { Match, MatchStatus, ControlPhase, PenaltyKick } from '../types'
import { advancePhase, effectiveStatus, flowPhaseStatus, getFlow, initFlowFromFirestore, recordKick as libRecordKick, undoKick as libUndoKick, subscribeFlow } from '../lib/matchFlow'
import { updateMatchControl } from '@/features/match/data/match.service'
import { PERIOD_START_SECONDS, phaseIsRunning } from '../lib/matchFlow'

export function useMatchFlow(match?: Match | null) {
  const [, force] = useReducer((x: number) => x + 1, 0)
  const lastSyncedRef = useRef<string>('')

  useEffect(() => subscribeFlow(force), [])

  useEffect(() => {
    if (!match) return
    const controlPhase = match.controlPhase || match.status
    initFlowFromFirestore(match.id, controlPhase, match.penalties || { home: 0, away: 0 }, match.penaltyKicks || [])
    lastSyncedRef.current = JSON.stringify({ controlPhase, penalties: match.penalties, penaltyKicks: match.penaltyKicks })
  }, [match])

  const go = useCallback((next: ControlPhase) => {
    if (!match) return
    advancePhase(match.id, next)
    const patch = {
      controlPhase: next,
      status: flowPhaseStatus(next) as MatchStatus,
      clockBaseSeconds: PERIOD_START_SECONDS[next],
      clockStartedAt: phaseIsRunning(next) ? new Date().toISOString() : null,
      clockRunning: phaseIsRunning(next),
    }
    updateMatchControl(match.id, patch)
  }, [match])

  const onRecordKick = useCallback((team: 'home' | 'away', player: string, result: 'scored' | 'missed') => {
    if (!match) return
    libRecordKick(match.id, team, player, result)
    const flow = getFlow(match.id)
    if (flow) {
      updateMatchControl(match.id, {
        penalties: { ...flow.penalties },
        penaltyKicks: [...flow.kicks],
      })
    }
  }, [match])

  const startPenalties = useCallback(() => {
    if (!match) return
    advancePhase(match.id, 'penalties')
    updateMatchControl(match.id, {
      controlPhase: 'penalties',
      status: 'penalties' as MatchStatus,
      clockBaseSeconds: PERIOD_START_SECONDS.penalties,
      clockStartedAt: null,
      clockRunning: false,
    })
  }, [match])

  const onUndoKick = useCallback((team: 'home' | 'away', player: string, result: 'scored' | 'missed') => {
    if (!match) return
    libUndoKick(match.id, team, player, result)
    const flow = getFlow(match.id)
    if (flow) {
      updateMatchControl(match.id, {
        penalties: { ...flow.penalties },
        penaltyKicks: [...flow.kicks],
      })
    }
  }, [match])

  const finishMatch = useCallback(() => {
    if (!match) return
    advancePhase(match.id, 'final')
    updateMatchControl(match.id, {
      controlPhase: 'final',
      status: 'final' as MatchStatus,
      clockRunning: false,
    })
  }, [match])

  if (!match) {
    return {
      phase: 'not_started' as ControlPhase,
      status: 'not_started' as MatchStatus,
      penalties: { home: 0, away: 0 },
      kicks: [] as PenaltyKick[],
      go: (_next: ControlPhase) => {},
      recordKick: (_team: 'home' | 'away', _player: string, _result: 'scored' | 'missed') => {},
      undoKick: (_team: 'home' | 'away', _player: string, _result: 'scored' | 'missed') => {},
      startPenalties: () => {},
      finishMatch: () => {},
    }
  }

  const flow = getFlow(match.id)
  if (!flow) {
    return {
      phase: match.controlPhase || (match.status as ControlPhase),
      status: match.status,
      penalties: match.penalties || { home: 0, away: 0 },
      kicks: match.penaltyKicks || [],
      go: (_next: ControlPhase) => {},
      recordKick: (_team: 'home' | 'away', _player: string, _result: 'scored' | 'missed') => {},
      undoKick: (_team: 'home' | 'away', _player: string, _result: 'scored' | 'missed') => {},
      startPenalties: () => {},
      finishMatch: () => {},
    }
  }

  return {
    phase: flow.phase,
    status: flowPhaseStatus(flow.phase),
    penalties: flow.penalties,
    kicks: flow.kicks,
    go,
    recordKick: onRecordKick,
    undoKick: onUndoKick,
    startPenalties,
    finishMatch,
  }
}

export function useFlowStatuses(matches: Match[]): Map<string, MatchStatus> {
  const [, force] = useReducer((x: number) => x + 1, 0)
  useEffect(() => subscribeFlow(force), [])

  const map = new Map<string, MatchStatus>()
  matches.forEach((m) => {
    const flow = getFlow(m.id)
    map.set(m.id, flow ? flowPhaseStatus(flow.phase) : m.status)
  })
  return map
}

export function effectiveStatusOf(match: Match): MatchStatus {
  return effectiveStatus(match)
}
