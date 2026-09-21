import { collection, addDoc, updateDoc, deleteDoc, doc, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '@/core/data/firebase'
import type { Player } from '@/types'

const PLAYERS = 'players'

function playerRef(id: string) {
  return doc(db, PLAYERS, id)
}

export function subscribePlayersByTeam(teamId: string, callback: (players: Player[]) => void): () => void {
  return onSnapshot(query(collection(db, PLAYERS), where('teamId', '==', teamId)), (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Player)))
  })
}

export async function addPlayer(data: Omit<Player, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, PLAYERS), data)
  return ref.id
}

export async function updatePlayer(id: string, data: Partial<Player>): Promise<void> {
  await updateDoc(playerRef(id), data as Record<string, unknown>)
}

export async function deletePlayer(id: string): Promise<void> {
  await deleteDoc(playerRef(id))
}
