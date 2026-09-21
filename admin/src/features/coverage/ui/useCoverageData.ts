import { useEffect, useState } from 'react'
import { fetchCoverageRecords } from '../data/coverage.service'

export interface CoverageData {
  stadiums: string[]
  commentators: string[]
  referees: string[]
  channels: string[]
  loading: boolean
}

const EMPTY: CoverageData = { stadiums: [], commentators: [], referees: [], channels: [], loading: true }

export function useCoverageData(): CoverageData {
  const [data, setData] = useState<CoverageData>(EMPTY)

  useEffect(() => {
    let active = true
    Promise.all([
      fetchCoverageRecords('stadium'),
      fetchCoverageRecords('commentator'),
      fetchCoverageRecords('referee'),
      fetchCoverageRecords('channel'),
    ])
      .then(([stadiums, commentators, referees, channels]) => {
        if (!active) return
        setData({
          stadiums: stadiums.map((r) => r.name),
          commentators: commentators.map((r) => r.name),
          referees: referees.map((r) => r.name),
          channels: channels.map((r) => r.name),
          loading: false,
        })
      })
      .catch(() => {
        if (!active) return
        setData({ stadiums: [], commentators: [], referees: [], channels: [], loading: false })
      })
    return () => {
      active = false
    }
  }, [])

  return data
}