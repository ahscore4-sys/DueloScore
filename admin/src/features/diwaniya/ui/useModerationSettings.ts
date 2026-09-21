import { useEffect, useState } from 'react'
import { subscribeModerationSettings } from '../data/diwaniya.service'

export function useModerationSettings(): {
  autoHideThreshold: number
  loading: boolean
} {
  const [autoHideThreshold, setAutoHideThreshold] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = subscribeModerationSettings((s) => {
      setAutoHideThreshold(s.autoHideThreshold)
      setLoading(false)
    })
    return unsub
  }, [])

  return { autoHideThreshold, loading }
}
