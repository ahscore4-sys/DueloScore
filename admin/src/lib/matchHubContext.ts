import { createContext, useContext } from 'react'
import type { MatchStatsPollingState } from '@/features/match/ui/useMatchStatsPolling'

export interface MatchHubValue {
  setTabsStuck: (v: boolean) => void
  statsPolling: MatchStatsPollingState
  activeTab: string
}

export const MatchHubContext = createContext<MatchHubValue>({
  setTabsStuck: () => {},
  statsPolling: { refreshing: false, lastFetchedAt: null, refresh: () => {} },
  activeTab: 'info',
})

export function useMatchHub() {
  return useContext(MatchHubContext)
}