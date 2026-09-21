import { useEffect, useReducer } from 'react'
import { useParams } from 'react-router-dom'
import type { Match } from '../types'
import { getMatch, subscribeMatchStore } from '../lib/matchStore'

export function useMatch(): Match | undefined {
  const { id } = useParams<{ id: string }>()
  const [, force] = useReducer((x: number) => x + 1, 0)
  useEffect(() => subscribeMatchStore(force), [])
  return id ? getMatch(id) : undefined
}
