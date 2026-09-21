import { useEffect, useState } from 'react'
import type { NewsPost } from '../domain/news.types'
import { subscribeNewsPost } from '../data/news.service'

export function useNewsPost(id?: string): { post: NewsPost | null; loading: boolean } {
  const [post, setPost] = useState<NewsPost | null>(null)
  const [loading, setLoading] = useState(Boolean(id))

  useEffect(() => {
    if (!id) {
      setPost(null)
      setLoading(false)
      return
    }
    setLoading(true)
    return subscribeNewsPost(id, (data) => {
      setPost(data)
      setLoading(false)
    })
  }, [id])

  return { post, loading }
}
