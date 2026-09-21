export type CoverageEntityType = 'stadium' | 'commentator' | 'referee' | 'channel'

export interface Stadium {
  id: string
  name: string
  city: string
  country: string
  createdAt: number
}

export interface Commentator {
  id: string
  name: string
  nationality: string
  language: string
  createdAt: number
}

export interface Referee {
  id: string
  name: string
  nationality: string
  createdAt: number
}

export interface Channel {
  id: string
  name: string
  country: string
  createdAt: number
}

export type CoverageRecord = Stadium | Commentator | Referee | Channel

export const COVERAGE_COLLECTIONS: Record<CoverageEntityType, string> = {
  stadium: 'coverage_stadiums',
  commentator: 'coverage_commentators',
  referee: 'coverage_referees',
  channel: 'coverage_channels',
}

export const COVERAGE_LABELS: Record<CoverageEntityType, { ar: string; en: string }> = {
  stadium: { ar: 'الملاعب', en: 'Stadiums' },
  commentator: { ar: 'المعلقون', en: 'Commentators' },
  referee: { ar: 'الحكام', en: 'Referees' },
  channel: { ar: 'القنوات الناقلة', en: 'Channels' },
}

export const STADIUM_FIELDS = [
  { key: 'name', label: 'اسم الملعب', placeholder: 'مثال: كامب نو', required: true },
  { key: 'city', label: 'المدينة', placeholder: 'مثال: برشلونة', required: true },
  { key: 'country', label: 'الدولة', placeholder: 'مثال: إسبانيا', required: true },
] as const

export const COMMENTATOR_FIELDS = [
  { key: 'name', label: 'الاسم', placeholder: 'مثال: عصام الشوالي', required: true },
  { key: 'nationality', label: 'الجنسية', placeholder: 'مثال: سعودي', required: true },
  { key: 'language', label: 'اللغة', placeholder: 'مثال: العربية', required: true },
] as const

export const REFEREE_FIELDS = [
  { key: 'name', label: 'الاسم', placeholder: 'مثال: دانييلي أورساتو', required: true },
  { key: 'nationality', label: 'الجنسية', placeholder: 'مثال: إيطالي', required: true },
] as const

export const REFEREE_ROLES = [
  { key: 'main', label: 'حكم الساحة' },
  { key: 'assistant1', label: 'حكم مساعد 1' },
  { key: 'assistant2', label: 'حكم مساعد 2' },
  { key: 'fourth', label: 'الحكم الرابع' },
  { key: 'var', label: 'حكم تقنية الفيديو' },
  { key: 'varAssistant', label: 'حكم VAR مساعد' },
] as const

export const CHANNEL_FIELDS = [
  { key: 'name', label: 'اسم القناة', placeholder: 'مثال: beIN Sports 1', required: true },
  { key: 'country', label: 'الدولة', placeholder: 'مثال: قطر', required: true },
] as const
