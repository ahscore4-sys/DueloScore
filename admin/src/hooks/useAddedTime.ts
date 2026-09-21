import { useEffect, useReducer, useCallback } from 'react'
import type { Match } from '../types'
import { getDeclaredExtra, setDeclaredExtra, initAddedTimeFromFirestore, subscribeAddedTime } from '../lib/addedTime'
import { useMatchFlow } from './useMatchFlow'
import { updateMatchControl } from '@/features/match/data/match.service'

export function useAddedTime(match?: Match | null) {
  const [, force] = useReducer((x: number) => x + 1, 0)
  useEffect(() => subscribeAddedTime(force), [])
  const flow = useMatchFlow(match)

  useEffect(() => {
    if (match?.addedTime) {
      initAddedTimeFromFirestore(match.id, match.addedTime)
    }
  }, [match])

  const setDeclared = useCallback((minutes: number) => {
    if (!match || !flow) return
    setDeclaredExtra(match.id, flow.phase, minutes)
    const updated: Record<string, number> = { ...(match.addedTime || {}), [flow.phase]: minutes }
    updateMatchControl(match.id, { addedTime: updated })
  }, [match, flow])

  if (!match || !flow) {
    return { declared: 0, setDeclared: () => {} }
  }

  const declared = getDeclaredExtra(match.id, flow.phase)
  return { declared, setDeclared }
}
