import type { MatchStatus } from '../types'

export function isFinished(status: MatchStatus): boolean {
  return status === 'full_time' || status === 'final'
}

export function isInPlay(status: MatchStatus): boolean {
  return status !== 'not_started' && !isFinished(status)
}

export const matchStatusLabel: Record<MatchStatus, string> = {
  not_started: 'لم تبدأ',
  first_half: 'الشوط الأول',
  half_time: 'استراحة',
  second_half: 'الشوط الثاني',
  full_time: 'انتهى الوقت الأصلي',
  extra_first_half: 'إضافي أول',
  extra_second_half: 'إضافي ثانٍ',
  penalties: 'ركلات الترجيح',
  final: 'انتهت نهائياً',
}

export function matchPeriodLabel(status: MatchStatus): string {
  return matchStatusLabel[status]
}
