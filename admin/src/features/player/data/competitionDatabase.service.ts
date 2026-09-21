import { collection, collectionGroup, doc, setDoc, deleteDoc, getDocs, getDoc, onSnapshot, query, serverTimestamp, updateDoc, limit, where } from 'firebase/firestore'
import type { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { httpsCallable } from 'firebase/functions'
import { db, storage, functions } from '@/core/data/firebase'
import { logActivity } from '@/features/activity/data/activity.service'
import type { CompetitionDoc, CompetitionTeamCoach, CompetitionTeamDoc, CompetitionPlayerDoc } from '../domain/competition.types'

const COMPETITIONS = 'competitions'

function competitionRef(leagueId: number) {
  return doc(db, COMPETITIONS, String(leagueId))
}

function teamsCol(leagueId: number) {
  return collection(db, COMPETITIONS, String(leagueId), 'teams')
}

function teamRef(leagueId: number, teamId: number) {
  return doc(db, COMPETITIONS, String(leagueId), 'teams', String(teamId))
}

function playersCol(leagueId: number, teamId: number) {
  return collection(db, COMPETITIONS, String(leagueId), 'teams', String(teamId), 'players')
}

function playerRef(leagueId: number, teamId: number, playerId: string | number) {
  return doc(db, COMPETITIONS, String(leagueId), 'teams', String(teamId), 'players', String(playerId))
}

export function subscribeCompetition(leagueId: number, callback: (comp: CompetitionDoc | null) => void): () => void {
  return onSnapshot(competitionRef(leagueId), (snap) => {
    if (!snap.exists()) {
      callback(null)
      return
    }
    const d = snap.data() as Omit<CompetitionDoc, 'leagueId'>
    callback({ leagueId, ...d } as CompetitionDoc)
  })
}

export function subscribeTeams(leagueId: number, callback: (teams: CompetitionTeamDoc[]) => void): () => void {
  return onSnapshot(query(teamsCol(leagueId)), (snap) => {
    callback(
      snap.docs.map((d) => {
        const data = d.data() as CompetitionTeamDoc
        return { ...data, id: Number(d.id) }
      }),
    )
  })
}

export function subscribeTeamPlayers(leagueId: number, teamId: number, callback: (players: CompetitionPlayerDoc[]) => void): () => void {
  return onSnapshot(query(playersCol(leagueId, teamId)), (snap) => {
    callback(
      snap.docs.map((d) => {
        const data = d.data() as CompetitionPlayerDoc
        return { ...data, id: d.id }
      }),
    )
  })
}

export async function getTeamPlayers(leagueId: number, teamId: number): Promise<CompetitionPlayerDoc[]> {
  const snap = await getDocs(playersCol(leagueId, teamId))
  return snap.docs.map((d) => {
    const data = d.data() as CompetitionPlayerDoc
    return { ...data, id: d.id }
  })
}

export function subscribeTeamHasPlayers(leagueId: number, teamId: number, callback: (has: boolean) => void): () => void {
  return onSnapshot(query(playersCol(leagueId, teamId), limit(1)), (snap) => {
    callback(!snap.empty)
  })
}

// Best-effort lookup of squad metadata (nationality/flag) across all
// competitions by API player id — used to enrich per-fixture player stats
// cards. `apiIds` must contain at most 10 entries (Firestore `in` limit).
export function subscribeCompetitionPlayersMeta(apiIds: number[], callback: (players: CompetitionPlayerDoc[]) => void): () => void {
  return onSnapshot(
    query(collectionGroup(db, 'players'), where('id', 'in', apiIds)),
    (snap) => {
      callback(snap.docs.map((d) => ({ ...(d.data() as CompetitionPlayerDoc), id: Number(d.id) })))
    },
  )
}

export interface CompetitionTeamEntry {
  competitionId: number
  teamId: number
  team: CompetitionTeamDoc
}

export async function ensureCompetitionTeam(leagueId: number, team: { id: number; name: string; logo: string | null }): Promise<void> {
  const ref = teamRef(leagueId, team.id)
  const snap = await getDoc(ref)
  if (snap.exists()) return
  await setDoc(ref, { id: team.id, name: team.name, logo: team.logo ?? null, createdAt: serverTimestamp() }, { merge: true })
}

function pickCompetitionEntry(
  docs: QueryDocumentSnapshot<DocumentData, DocumentData>[],
  preferCompetitionId: number | undefined,
): CompetitionTeamEntry | null {
  if (docs.length === 0) return null
  let chosen = docs[0]
  if (preferCompetitionId) {
    const preferred = docs.find((d) => Number(d.ref.parent.parent?.id) === preferCompetitionId)
    if (preferred) chosen = preferred
  }
  const competitionId = Number(chosen.ref.parent.parent?.id)
  const teamId = Number(chosen.ref.id)
  return { competitionId, teamId, team: { ...(chosen.data() as CompetitionTeamDoc), id: teamId } }
}

function entryFromTeamSnapshot(competitionId: number, teamId: number, data: DocumentData): CompetitionTeamEntry {
  return { competitionId, teamId, team: { ...(data as CompetitionTeamDoc), id: teamId } }
}

export function subscribeCompetitionTeamByApiId(
  apiId: number,
  preferCompetitionId: number | undefined,
  callback: (entry: CompetitionTeamEntry | null) => void,
): () => void {
  let direct: CompetitionTeamEntry | null = null
  let group: CompetitionTeamEntry | null = null
  let directLive = false
  let groupLive = false

  const emit = () => {
    if (direct) { callback(direct); return }
    if (group) { callback(group); return }
    if (directLive && groupLive) callback(null)
  }

  const unsubs: (() => void)[] = []
  if (preferCompetitionId != null) {
    unsubs.push(
      onSnapshot(teamRef(preferCompetitionId, apiId), (snap) => {
        directLive = true
        direct = snap.exists() ? entryFromTeamSnapshot(preferCompetitionId, apiId, snap.data()) : null
        emit()
      }),
    )
  }
  unsubs.push(
    onSnapshot(query(collectionGroup(db, 'teams'), where('id', '==', apiId)), (snap) => {
      groupLive = true
      group = pickCompetitionEntry(snap.docs, preferCompetitionId)
      emit()
    }),
  )
  return () => { unsubs.forEach((u) => u()) }
}

export async function getCompetitionTeamByApiId(apiId: number, preferCompetitionId?: number): Promise<CompetitionTeamEntry | null> {
  if (preferCompetitionId != null) {
    const snap = await getDoc(teamRef(preferCompetitionId, apiId))
    if (snap.exists()) return entryFromTeamSnapshot(preferCompetitionId, apiId, snap.data())
  }
  const gsnap = await getDocs(query(collectionGroup(db, 'teams'), where('id', '==', apiId)))
  return pickCompetitionEntry(gsnap.docs, preferCompetitionId)
}

export function saveCompetition(comp: CompetitionDoc): Promise<void> {
  return setDoc(competitionRef(comp.leagueId), {
    leagueId: comp.leagueId,
    name: comp.name,
    logo: comp.logo,
    season: comp.season,
    updatedAt: serverTimestamp(),
  })
}

export async function saveTeams(leagueId: number, teams: CompetitionTeamDoc[]): Promise<void> {
  for (const t of teams) {
    await setDoc(
      teamRef(leagueId, t.id),
      {
        id: t.id,
        name: t.name,
        code: t.code ?? null,
        country: t.country ?? null,
        flag: t.flag ?? null,
        logo: t.logo ?? null,
        founded: t.founded ?? null,
        createdAt: serverTimestamp(),
      },
      { merge: true },
    )
  }
}

export async function setTeamCoach(leagueId: number, teamId: number, coach: CompetitionTeamCoach): Promise<void> {
  await updateDoc(teamRef(leagueId, teamId), {
    coach,
    updatedAt: serverTimestamp(),
  })
}

export interface TeamEditData {
  name: string
  code: string | null
  country: string | null
  founded: number | null
}

export async function updateCompetitionTeam(leagueId: number, teamId: number, data: TeamEditData): Promise<void> {
  await updateDoc(teamRef(leagueId, teamId), {
    name: data.name.trim(),
    code: data.code?.trim() ? data.code.trim() : null,
    country: data.country?.trim() ? data.country.trim() : null,
    founded: data.founded ?? null,
    updatedAt: serverTimestamp(),
  })

  logActivity({
    action: 'team.update',
    targetId: String(teamId),
    targetLabel: data.name.trim(),
    details: {
      name: data.name.trim(),
      code: data.code ?? null,
      country: data.country ?? null,
    },
  })
}

export async function savePlayers(leagueId: number, teamId: number, players: CompetitionPlayerDoc[]): Promise<void> {
  for (const p of players) {
    await setDoc(
      playerRef(leagueId, teamId, p.id),
      {
        id: p.id,
        name: p.name,
        age: p.age ?? null,
        number: p.number ?? null,
        position: p.position ?? '',
        nationality: p.nationality ?? null,
        flag: p.flag ?? null,
        photo: p.photo ?? '',
        createdAt: serverTimestamp(),
      },
      { merge: true },
    )
  }
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_')
}

async function uploadPlayerImage(leagueId: number, teamId: number, playerId: string | number, file: File): Promise<{ url: string; path: string }> {
  const path = `competition_players/${leagueId}/${teamId}/${playerId}_${Date.now()}_${sanitizeFileName(file.name)}`
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

export interface SavePlayerInput {
  leagueId: number
  teamId: number
  player: CompetitionPlayerDoc
  imageFile: File | null
}

export async function updateCompetitionPlayer(input: SavePlayerInput): Promise<void> {
  const { leagueId, teamId, player } = input
  let photo = player.photo
  let photoPath = player.photoPath ?? null
  let replacedPath: string | null = null

  if (input.imageFile) {
    const uploaded = await uploadPlayerImage(leagueId, teamId, player.id, input.imageFile)
    photo = uploaded.url
    photoPath = uploaded.path
    if (player.photoPath && player.photoPath !== uploaded.path) {
      replacedPath = player.photoPath
    }
  }

  const payload = {
    name: player.name.trim(),
    age: player.age ?? null,
    number: player.number ?? null,
    position: player.position ?? '',
    photo,
    photoPath,
    updatedAt: serverTimestamp(),
  }

  await setDoc(playerRef(leagueId, teamId, player.id), payload, { merge: true })

  if (replacedPath) await removeImage(replacedPath)

  logActivity({
    action: 'player.update',
    targetId: String(player.id),
    targetLabel: player.name.trim(),
    details: {
      name: player.name.trim(),
      position: payload.position,
      imageReplaced: replacedPath !== null,
    },
  })
}

export async function updatePlayerOverrides(
  leagueId: number,
  teamId: number,
  playerId: string | number,
  playerName: string,
  overrides: { specificPosition?: string | null; ratingOverrides?: Record<string, number> | null; ratingOverrideValue?: number | null }
): Promise<void> {
  const payload: Record<string, unknown> = { updatedAt: serverTimestamp() }
  if (overrides.specificPosition !== undefined) payload.specificPosition = overrides.specificPosition
  if (overrides.ratingOverrides !== undefined) payload.ratingOverrides = overrides.ratingOverrides

  const details: Record<string, string | number | boolean | null> = {
    name: playerName,
  }
  if (overrides.specificPosition !== undefined) details.specificPosition = overrides.specificPosition ?? ''
  if (overrides.ratingOverrideValue !== undefined) details.ratingOverride = overrides.ratingOverrideValue

  await updateDoc(playerRef(leagueId, teamId, playerId), payload)
  logActivity({
    action: 'player.update',
    targetId: String(playerId),
    targetLabel: playerName,
    details,
  })
}

export async function deletePlayerImage(leagueId: number, teamId: number, playerId: string | number, photoPath: string | null | undefined): Promise<void> {
  if (!photoPath) return
  await removeImage(photoPath)
  await updateDoc(playerRef(leagueId, teamId, playerId), {
    photo: '',
    photoPath: null,
    updatedAt: serverTimestamp(),
  })
}

async function uploadCoachImage(leagueId: number, teamId: number, file: File): Promise<{ url: string; path: string }> {
  const path = `competition_players/${leagueId}/${teamId}/coach_${Date.now()}_${sanitizeFileName(file.name)}`
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, file)
  const url = await getDownloadURL(storageRef)
  return { url, path }
}

export async function updateCompetitionCoach(leagueId: number, teamId: number, coach: CompetitionTeamCoach, imageFile: File | null): Promise<void> {
  let photo = coach.photo
  let photoPath = coach.photoPath ?? null
  let replacedPath: string | null = null

  if (imageFile) {
    const uploaded = await uploadCoachImage(leagueId, teamId, imageFile)
    photo = uploaded.url
    photoPath = uploaded.path
    if (coach.photoPath && coach.photoPath !== uploaded.path) {
      replacedPath = coach.photoPath
    }
  }

  await updateDoc(teamRef(leagueId, teamId), {
    coach: { ...coach, photo, photoPath },
    updatedAt: serverTimestamp(),
  })

  if (replacedPath) await removeImage(replacedPath)

  logActivity({
    action: 'player.update',
    targetId: String(coach.id),
    targetLabel: coach.name.trim(),
    details: {
      name: coach.name.trim(),
      coach: true,
      imageReplaced: replacedPath !== null,
    },
  })
}

export async function deleteCompetitionCoachImage(leagueId: number, teamId: number, photoPath: string | null | undefined): Promise<void> {
  if (!photoPath) return
  await removeImage(photoPath)
  await updateDoc(teamRef(leagueId, teamId), {
    'coach.photo': '',
    'coach.photoPath': null,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteCompetitionPlayer(leagueId: number, teamId: number, player: CompetitionPlayerDoc): Promise<void> {
  await removeImage(player.photoPath)
  await deleteDoc(playerRef(leagueId, teamId, player.id))
  logActivity({
    action: 'player.delete',
    targetId: String(player.id),
    targetLabel: player.name.trim(),
    details: {
      name: player.name.trim(),
      position: player.position ?? '',
    },
  })
}

export async function clearCompetitionTeams(leagueId: number): Promise<void> {
  const snap = await getDocs(teamsCol(leagueId))
  for (const d of snap.docs) {
    await deleteDoc(d.ref)
  }
}

export interface RefreshSeasonStatisticsResult {
  ok: boolean
  leagues: number[]
  teamLeagues: number[]
  playerLeagues: number[]
  players: number
  seasons: number[]
  season: number
  detail?: string
}

export async function refreshTeamSeasonStatistics(teamApiId: number, season?: number): Promise<RefreshSeasonStatisticsResult> {
  const fn = httpsCallable<{ teamApiId: number; season?: number }, RefreshSeasonStatisticsResult>(
    functions,
    'refreshTeamSeasonStatistics',
  )
  const result = await fn({ teamApiId, season: season ?? new Date().getFullYear() })
  return result.data
}