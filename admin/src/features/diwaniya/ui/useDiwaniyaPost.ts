import { useEffect, useState } from 'react'
import type { DiwaniyaPost } from '../domain/diwaniya.types'
import { subscribeDiwaniyaPost } from '../data/diwaniya.service'

export function useDiwaniyaPost(id: string | undefined): { post: DiwaniyaPost | null; loading: boolean } {
  const [post, setPost] = useState<DiwaniyaPost | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) {
      setPost(null)
      setLoading(false)
      return
    }
    setLoading(true)
    const unsub = subscribeDiwaniyaPost(id, (p) => {
      setPost(p)
      setLoading(false)
    })
    return unsub
  }, [id])

  return { post, loading }
}
