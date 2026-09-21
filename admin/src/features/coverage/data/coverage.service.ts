import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/core/data/firebase'
import type { ActivityAction } from '@/features/activity/domain/activity.types'
import type {
  CoverageEntityType,
  Stadium,
  Commentator,
  Referee,
  Channel,
  CoverageRecord,
} from '../domain/coverage.types'
import { COVERAGE_COLLECTIONS } from '../domain/coverage.types'
import { logActivity } from '@/features/activity/data/activity.service'

const CREATE_ACTION: Record<CoverageEntityType, ActivityAction> = {
  stadium: 'stadium.create',
  commentator: 'commentator.create',
  referee: 'referee.create',
  channel: 'channel.create',
}

const DELETE_ACTION: Record<CoverageEntityType, ActivityAction> = {
  stadium: 'stadium.delete',
  commentator: 'commentator.delete',
  referee: 'referee.delete',
  channel: 'channel.delete',
}

const UPDATE_ACTION: Record<CoverageEntityType, ActivityAction> = {
  stadium: 'stadium.update',
  commentator: 'commentator.update',
  referee: 'referee.update',
  channel: 'channel.update',
}

function toMillis(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis()
  if (typeof value === 'number') return value
  return Date.now()
}

function mapStadium(id: string, data: Record<string, unknown>): Stadium {
  return {
    id,
    name: (data.name as string) ?? '',
    city: (data.city as string) ?? '',
    country: (data.country as string) ?? '',
    createdAt: toMillis(data.createdAt),
  }
}

function mapCommentator(id: string, data: Record<string, unknown>): Commentator {
  return {
    id,
    name: (data.name as string) ?? '',
    nationality: (data.nationality as string) ?? '',
    language: (data.language as string) ?? '',
    createdAt: toMillis(data.createdAt),
  }
}

function mapReferee(id: string, data: Record<string, unknown>): Referee {
  return {
    id,
    name: (data.name as string) ?? '',
    nationality: (data.nationality as string) ?? '',
    createdAt: toMillis(data.createdAt),
  }
}

function mapChannel(id: string, data: Record<string, unknown>): Channel {
  return {
    id,
    name: (data.name as string) ?? '',
    country: (data.country as string) ?? '',
    createdAt: toMillis(data.createdAt),
  }
}

function mapRecord(type: CoverageEntityType, id: string, data: Record<string, unknown>): CoverageRecord {
  switch (type) {
    case 'stadium':
      return mapStadium(id, data)
    case 'commentator':
      return mapCommentator(id, data)
    case 'referee':
      return mapReferee(id, data)
    case 'channel':
      return mapChannel(id, data)
  }
}

export function subscribeCoverageList(
  type: CoverageEntityType,
  callback: (items: CoverageRecord[]) => void,
): () => void {
  const colName = COVERAGE_COLLECTIONS[type]
  const q = query(collection(db, colName), orderBy('createdAt', 'desc'))
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => mapRecord(type, d.id, d.data()))
    callback(items)
  })
}

export async function fetchCoverageRecords(type: CoverageEntityType): Promise<CoverageRecord[]> {
  const colName = COVERAGE_COLLECTIONS[type]
  const snap = await getDocs(query(collection(db, colName), orderBy('createdAt', 'desc')))
  return snap.docs.map((d) => mapRecord(type, d.id, d.data()))
}

export async function addCoverageRecord(
  type: CoverageEntityType,
  fields: Record<string, string>,
): Promise<string> {
  const colName = COVERAGE_COLLECTIONS[type]
  const ref = doc(collection(db, colName))
  const payload: Record<string, unknown> = {
    ...fields,
    createdAt: serverTimestamp(),
  }
  await setDoc(ref, payload)

  const label = Object.values(fields).filter(Boolean).join(' — ')
  logActivity({
    action: CREATE_ACTION[type],
    targetType: 'coverage',
    targetId: ref.id,
    targetLabel: label,
    details: { type, ...fields },
  })

  return ref.id
}

export async function updateCoverageRecord(
  type: CoverageEntityType,
  id: string,
  fields: Record<string, string>,
): Promise<void> {
  const colName = COVERAGE_COLLECTIONS[type]
  await updateDoc(doc(db, colName, id), fields)

  const label = Object.values(fields).filter(Boolean).join(' — ')
  logActivity({
    action: UPDATE_ACTION[type],
    targetType: 'coverage',
    targetId: id,
    targetLabel: label,
    details: { type, ...fields },
  })
}

export async function deleteCoverageRecord(
  type: CoverageEntityType,
  id: string,
  label: string,
): Promise<void> {
  const colName = COVERAGE_COLLECTIONS[type]
  await deleteDoc(doc(db, colName, id))

  logActivity({
    action: DELETE_ACTION[type],
    targetType: 'coverage',
    targetId: id,
    targetLabel: label,
    details: { type },
  })
}
