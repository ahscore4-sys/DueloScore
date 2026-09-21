import { useEffect, useState } from 'react'
import type { DiwaniyaComment } from '../domain/diwaniya.types'
import { subscribePostComments } from '../data/diwaniya.service'

export function usePostComments(postId: string | undefined): { comments: DiwaniyaComment[]; loading: boolean } {
  const [comments, setComments] = useState<DiwaniyaComment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!postId) {
      setComments([])
      setLoading(false)
      return
    }
    setLoading(true)
    const unsub = subscribePostComments(postId, (list) => {
      setComments(list)
      setLoading(false)
    })
    return unsub
  }, [postId])

  return { comments, loading }
}
