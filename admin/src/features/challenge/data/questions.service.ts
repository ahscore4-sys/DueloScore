import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  orderBy,
  limit as fsLimit,
  query,
  startAfter,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import type { QueryConstraint, QueryDocumentSnapshot } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { db, storage } from '@/core/data/firebase'
import type { ChallengeDifficulty, ChallengeQuestion, ChallengeQuestionType } from '../domain/challenge.types'
import { QUESTION_OPTIONS_COUNT } from '../domain/challenge.types'
import { logActivity } from '@/features/activity/data/activity.service'

const QUESTIONS = 'challenge_questions'

export const QUESTIONS_PAGE_SIZE = 12

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

function mapQuestion(id: string, data: Record<string, unknown>): ChallengeQuestion {
  const type = data.type === 'image' ? 'image' : 'text'
  const options = Array.isArray(data.options)
    ? data.options.filter((o): o is string => typeof o === 'string')
    : []
  const correctAnswer = typeof data.correctAnswer === 'number' ? data.correctAnswer : 0
  return {
    id,
    type,
    question: (data.question as string) ?? '',
    imageUrl: (data.imageUrl as string) ?? '',
    imagePath: (data.imagePath as string) ?? '',
    options: options.length === QUESTION_OPTIONS_COUNT ? options : [...options, ...Array(QUESTION_OPTIONS_COUNT - options.length).fill('')],
    correctAnswer: Math.min(Math.max(correctAnswer, 0), QUESTION_OPTIONS_COUNT - 1),
    difficulty: ((data.difficulty as ChallengeDifficulty) ?? 'easy') as ChallengeDifficulty,
    active: (data.active as boolean) ?? true,
    createdAt: toMillis(data.createdAt),
    usedAt: toMillisOrNull(data.usedAt),
  }
}

export interface QuestionsPage {
  questions: ChallengeQuestion[]
  cursor: QueryDocumentSnapshot | null
}

export async function fetchQuestions(cursor?: QueryDocumentSnapshot | null): Promise<QuestionsPage> {
  const clauses: QueryConstraint[] = [orderBy('createdAt', 'desc')]
  if (cursor) clauses.push(startAfter(cursor))
  clauses.push(fsLimit(QUESTIONS_PAGE_SIZE))

  const snap = await getDocs(query(collection(db, QUESTIONS), ...clauses))
  const questions = snap.docs.map((d) => mapQuestion(d.id, d.data()))
  const last = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null
  return { questions, cursor: last }
}

export async function fetchQuestion(id: string): Promise<ChallengeQuestion | null> {
  const snap = await getDoc(doc(db, QUESTIONS, id))
  if (!snap.exists()) return null
  return mapQuestion(snap.id, snap.data())
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_')
}

async function uploadQuestionImage(file: File): Promise<{ url: string; path: string }> {
  const path = `challenge_images/${Date.now()}_${sanitizeFileName(file.name)}`
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

export interface SaveQuestionInput {
  id?: string
  type: ChallengeQuestionType
  question: string
  options: string[]
  correctAnswer: number
  difficulty: ChallengeDifficulty
  active: boolean
  imageFile: File | null
  existingImageUrl?: string | null
  existingImagePath?: string | null
  removeExistingImage?: boolean
}

export async function saveQuestion(input: SaveQuestionInput): Promise<string> {
  let imageUrl = input.existingImageUrl ?? ''
  let imagePath = input.existingImagePath ?? ''
  let replacedPath: string | null = null

  if (input.type === 'text') {
    if (!input.imageFile && imagePath) {
      replacedPath = imagePath
      imageUrl = ''
      imagePath = ''
    }
  }

  if (input.imageFile) {
    const uploaded = await uploadQuestionImage(input.imageFile)
    imageUrl = uploaded.url
    imagePath = uploaded.path
    if (input.existingImagePath && input.existingImagePath !== uploaded.path) {
      replacedPath = input.existingImagePath
    }
  }

  const base = {
    type: input.type,
    question: input.question.trim(),
    options: input.options.map((o) => o.trim()),
    correctAnswer: input.correctAnswer,
    difficulty: input.difficulty,
    active: input.active,
    imageUrl,
    imagePath,
  }

  let questionId = input.id
  if (questionId) {
    await updateDoc(doc(db, QUESTIONS, questionId), base)
  } else {
    questionId = doc(collection(db, QUESTIONS)).id
    await setDoc(doc(db, QUESTIONS, questionId), {
      id: questionId,
      ...base,
      usedAt: null,
      createdAt: serverTimestamp(),
    })
  }

  if (replacedPath) await removeImage(replacedPath)

  logActivity({
    action: questionId === input.id ? 'question.update' : 'question.create',
    targetId: questionId,
    targetLabel: input.question.trim(),
    details: { question: input.question.trim(), type: input.type, active: input.active },
  })
  return questionId
}

export async function deleteQuestion(question: ChallengeQuestion): Promise<void> {
  await deleteDoc(doc(db, QUESTIONS, question.id))
  await removeImage(question.imagePath)

  logActivity({
    action: 'question.delete',
    targetId: question.id,
    targetLabel: question.question,
    details: { question: question.question },
  })
}

export async function setQuestionActive(id: string, active: boolean): Promise<void> {
  await updateDoc(doc(db, QUESTIONS, id), { active })

  logActivity({
    action: 'question.toggle',
    targetId: id,
    targetLabel: active ? 'تفعيل سؤال' : 'إيقاف سؤال',
    details: { active },
  })
}
