export type ChallengeQuestionType = 'text' | 'image'

export type ChallengeDifficulty = 'easy' | 'medium' | 'hard'

export type DailyChallengeStatus = 'scheduled' | 'active' | 'ended'

export type ChallengeTeam = 'barcelona' | 'realmadrid'

export interface ChallengeQuestion {
  id: string
  type: ChallengeQuestionType
  question: string
  imageUrl: string
  imagePath: string
  options: string[]
  correctAnswer: number
  difficulty: ChallengeDifficulty
  active: boolean
  createdAt: number
  usedAt: number | null
}

export interface ChallengeStats {
  assignedCount: number
  respondedCount: number
  correctCount: number
}

export interface TopPerformer {
  userId: string
  userName: string
  userTeam: ChallengeTeam | null
  tierName: string
  tierColor: string
  respondedAt: number
}

export interface DailyChallenge {
  id: string
  questionIds: string[]
  scheduledDate: string
  startTime: number
  endTime: number
  status: DailyChallengeStatus
  stats: ChallengeStats
  topPerformers: TopPerformer[]
  publishedBy: string
  createdAt: number
}

export interface ChallengeResponse {
  id: string
  challengeId: string
  userId: string
  userName: string
  userTeam: ChallengeTeam | null
  tierName: string
  tierColor: string
  assignedQuestionId: string
  selectedAnswer: number | null
  isCorrect: boolean | null
  pointsAwarded: number | null
  respondedAt: number | null
}

export interface WeeklyLeaderboardEntry {
  userId: string
  userName: string
  userTeam: ChallengeTeam | null
  tierName: string
  tierColor: string
  daysPlayed: number
  weekPoints: number
}

export interface WeeklyLeaderboard {
  weekId: string
  entries: WeeklyLeaderboardEntry[]
  updatedAt: number
}

export const CHALLENGE_TYPES: { value: ChallengeQuestionType; label: string }[] = [
  { value: 'text', label: 'سؤال نصي' },
  { value: 'image', label: 'صورة مشوهة' },
]

export const CHALLENGE_DIFFICULTIES: { value: ChallengeDifficulty; label: string }[] = [
  { value: 'easy', label: 'سهل' },
  { value: 'medium', label: 'متوسط' },
  { value: 'hard', label: 'صعب' },
]

export const QUESTION_OPTIONS_COUNT = 4

export const CHALLENGE_STATUS_LABELS: Record<DailyChallengeStatus, string> = {
  scheduled: 'مجدول',
  active: 'نشط الآن',
  ended: 'منتهي',
}

export function difficultyLabel(difficulty: ChallengeDifficulty): string {
  return CHALLENGE_DIFFICULTIES.find((d) => d.value === difficulty)?.label ?? difficulty
}

export function difficultyAccent(difficulty: ChallengeDifficulty): string {
  if (difficulty === 'easy') return '#00E676'
  if (difficulty === 'medium') return '#FFB300'
  return '#FF5252'
}

export function typeLabel(type: ChallengeQuestionType): string {
  return CHALLENGE_TYPES.find((t) => t.value === type)?.label ?? type
}

export function teamLabel(team: ChallengeTeam | null): string {
  if (team === 'barcelona') return 'برشلونة'
  if (team === 'realmadrid') return 'ريال مدريد'
  return 'غير محدد'
}

export function teamAccent(team: ChallengeTeam | null): string {
  if (team === 'barcelona') return '#A50044'
  if (team === 'realmadrid') return '#FEBE10'
  return '#546E7A'
}

const KUWAIT_OFFSET_MS = 3 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000
const FRIDAY = 5

const AR_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

function formatKey(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`
}

function kuwaitShifted(ms: number): Date {
  return new Date(ms + KUWAIT_OFFSET_MS)
}

export function kuwaitDateKey(ms: number): string {
  return formatKey(kuwaitShifted(ms))
}

function challengeWeekStartUtcMs(ms: number): number {
  const d = kuwaitShifted(ms)
  const back = (d.getUTCDay() - FRIDAY + 7) % 7
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - back)
}

export function challengeWeekId(ms: number): string {
  return formatKey(new Date(challengeWeekStartUtcMs(ms)))
}

export function challengeWeekRange(weekId: string): { startMs: number; endMs: number } {
  const [y, m, d] = weekId.split('-').map(Number)
  const startMs = Date.UTC(y, (m ?? 1) - 1, d ?? 1) - KUWAIT_OFFSET_MS
  return { startMs, endMs: startMs + 7 * DAY_MS - 1 }
}

export function kuwaitMidnightMs(ms: number): number {
  const d = kuwaitShifted(ms)
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - KUWAIT_OFFSET_MS
}

export function challengeWeekLabel(weekId: string): string {
  const { startMs } = challengeWeekRange(weekId)
  const start = kuwaitShifted(startMs)
  const end = kuwaitShifted(startMs + 6 * DAY_MS)
  return `الجمعة ${start.getUTCDate()} ${AR_MONTHS[start.getUTCMonth()]} – الخميس ${end.getUTCDate()} ${AR_MONTHS[end.getUTCMonth()]}`
}

export function deriveChallengeStatus(
  challenge: Pick<DailyChallenge, 'status' | 'startTime' | 'endTime'>,
  now = Date.now(),
): DailyChallengeStatus {
  if (challenge.status === 'ended') return 'ended'
  if (now < challenge.startTime) return 'scheduled'
  if (now <= challenge.endTime) return 'active'
  return 'ended'
}

function formatKuwaitTime(ms: number): string {
  const d = kuwaitShifted(ms)
  const h12 = d.getUTCHours() % 12 || 12
  return `${h12}:${pad2(d.getUTCMinutes())} ${d.getUTCHours() < 12 ? 'ص' : 'م'}`
}

export function formatChallengeWindow(startTime: number, endTime: number): string {
  return `${formatKuwaitTime(startTime)} – ${formatKuwaitTime(endTime)}`
}

export function formatKuwaitDate(ms: number): string {
  const d = kuwaitShifted(ms)
  return `${d.getUTCDate()} ${AR_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

export function formatPoints(points: number): string {
  return new Intl.NumberFormat('ar-EG').format(points)
}
