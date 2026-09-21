import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import type { QueryDocumentSnapshot } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { httpsCallable } from 'firebase/functions'
import { db, storage, functions } from '@/core/data/firebase'
import type { NewsPost, NewsTag, NewsTeam } from '../domain/news.types'

import { logActivity } from '@/features/activity/data/activity.service'

const NEWS = 'news'

export const PAGE_SIZE = 10

export interface NewsFeedFilters {
  team?: NewsTeam
  tag?: NewsTag
}

export interface NewsFeedPage {
  posts: NewsPost[]
  cursor: QueryDocumentSnapshot | null
}

function postRef(id: string) {
  return doc(db, NEWS, id)
}

function toMillis(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis()
  if (typeof value === 'number') return value
  return Date.now()
}

function toMillisOrNull(value: unknown): number | null {
  if (value instanceof Timestamp) return value.toMillis()
  if (typeof value === 'number') return value
  return null
}

function mapPost(id: string, data: Record<string, unknown>): NewsPost {
  return {
    id,
    title: (data.title as string) ?? '',
    content: (data.content as string) ?? '',
    imageUrl: (data.imageUrl as string) ?? '',
    imagePath: (data.imagePath as string) ?? '',
    team: (data.team as NewsTeam) ?? 'all',
    tag: (data.tag as NewsTag | null) ?? null,
    author: (data.author as string) ?? '',
    sourceUrl: (data.sourceUrl as string | null) ?? null,
    likedBy: (data.likedBy as string[]) ?? [],
    createdAt: toMillis(data.createdAt),
    updatedAt: toMillisOrNull(data.updatedAt),
    notifiedAt: toMillisOrNull(data.notifiedAt),
    summary: (data.summary as string) ?? '',
  }
}

export async function fetchNewsPosts(filters: NewsFeedFilters, cursor?: QueryDocumentSnapshot | null): Promise<NewsFeedPage> {
  const clauses = []
  if (filters.team) clauses.push(where('team', '==', filters.team))
  if (filters.tag) clauses.push(where('tag', '==', filters.tag))
  clauses.push(orderBy('createdAt', 'desc'))
  if (cursor) clauses.push(startAfter(cursor))
  clauses.push(limit(PAGE_SIZE))

  const snap = await getDocs(query(collection(db, NEWS), ...clauses))
  const posts = snap.docs.map((d) => mapPost(d.id, d.data()))
  const last = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null
  return { posts, cursor: last }
}

export function subscribeNewsPost(id: string, callback: (post: NewsPost | null) => void): () => void {
  return onSnapshot(postRef(id), (snap) => {
    if (!snap.exists()) {
      callback(null)
      return
    }
    callback(mapPost(snap.id, snap.data()))
  })
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_')
}

async function uploadNewsImage(file: File): Promise<{ url: string; path: string }> {
  const path = `news_images/${Date.now()}_${sanitizeFileName(file.name)}`
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, file)
  const url = await getDownloadURL(storageRef)
  return { url, path }
}

async function removeImage(path: string | null | undefined): Promise<void> {
  if (!path) return
  try {
    await deleteObject(ref(storage, path))
  } catch {
    // ignore missing objects during cleanup
  }
}

export interface SaveNewsPostInput {
  id?: string
  title: string
  content: string
  team: NewsTeam
  tag: NewsTag | null
  author: string
  sourceUrl: string | null
  imageFile: File | null
  existingImageUrl?: string | null
  existingImagePath?: string | null
  summary: string
}

export async function saveNewsPost(input: SaveNewsPostInput): Promise<string> {
  let imageUrl = input.existingImageUrl ?? ''
  let imagePath = input.existingImagePath ?? ''
  let replacedPath: string | null = null

  if (input.imageFile) {
    const uploaded = await uploadNewsImage(input.imageFile)
    imageUrl = uploaded.url
    imagePath = uploaded.path
    if (input.id && input.existingImagePath && input.existingImagePath !== uploaded.path) {
      replacedPath = input.existingImagePath
    }
  }

  const base = {
    title: input.title.trim(),
    content: input.content.trim(),
    team: input.team,
    tag: input.tag,
    author: input.author.trim(),
    sourceUrl: input.sourceUrl?.trim() || null,
    imageUrl,
    imagePath,
    summary: input.summary.trim(),
  }

  let postId = input.id
  if (postId) {
    await updateDoc(postRef(postId), { ...base, updatedAt: serverTimestamp() })
  } else {
    postId = doc(collection(db, NEWS)).id
    await setDoc(postRef(postId), {
      ...base,
      id: postId,
      likedBy: [],
      createdAt: serverTimestamp(),
      updatedAt: null,
      notifiedAt: null,
    })
  }

  if (replacedPath) await removeImage(replacedPath)
  logActivity({
    action: postId === input.id ? 'news.update' : 'news.create',
    targetId: postId,
    targetLabel: input.title.trim(),
    details: { title: input.title.trim(), team: input.team, tag: input.tag ?? null, author: input.author.trim() },
  })
  return postId
}

export async function deleteNewsPost(post: NewsPost): Promise<void> {
  await deleteDoc(postRef(post.id))
  await removeImage(post.imagePath)

  logActivity({
    action: 'news.delete',
    targetId: post.id,
    targetLabel: post.title,
    details: { title: post.title },
  })
}

export async function renotifyNewsPost(postId: string): Promise<{ ok: boolean; error?: string }> {
  const fn = httpsCallable<{ postId: string }, { ok: boolean; error?: string }>(functions, 'renotifyNewsPost')
  const res = await fn({ postId })
  logActivity({ action: 'news.renotify', targetId: postId, targetLabel: postId, details: { ok: res.data.ok } })
  return res.data
}

export async function generateNewsSummary(title: string, content: string): Promise<{ summary: string; source: 'ai' | 'fallback' }> {
  const fn = httpsCallable<{ title: string; content: string }, { summary: string; source: 'ai' | 'fallback' }>(functions, 'generateNewsSummary')
  return fn({ title, content }).then(res => res.data)
}