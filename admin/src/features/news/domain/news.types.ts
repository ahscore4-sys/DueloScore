export type NewsTeam = 'all' | 'barcelona' | 'realmadrid'

export type NewsTag = 'transfers' | 'injuries'

export interface NewsPost {
  id: string
  title: string
  content: string
  imageUrl: string
  imagePath: string
  team: NewsTeam
  tag: NewsTag | null
  author: string
  sourceUrl: string | null
  likedBy: string[]
  createdAt: number
  updatedAt: number | null
  notifiedAt: number | null
  summary: string
}

export const NEWS_TEAMS: { value: NewsTeam; label: string }[] = [
  { value: 'all', label: 'الكل' },
  { value: 'barcelona', label: 'برشلونة' },
  { value: 'realmadrid', label: 'ريال مدريد' },
]

export const NEWS_TEAM_FILTERS: { value: Exclude<NewsTeam, 'all'>; label: string }[] = [
  { value: 'barcelona', label: 'برشلونة' },
  { value: 'realmadrid', label: 'ريال مدريد' },
]

export const NEWS_TAGS: { value: NewsTag; label: string }[] = [
  { value: 'transfers', label: 'انتقالات' },
  { value: 'injuries', label: 'إصابات' },
]

export function teamLabel(team: NewsTeam): string {
  return NEWS_TEAMS.find((t) => t.value === team)?.label ?? 'الكل'
}

export function tagLabel(tag: NewsTag | null): string {
  if (!tag) return 'عام'
  return NEWS_TAGS.find((t) => t.value === tag)?.label ?? 'عام'
}

export function teamAccent(team: NewsTeam | null): string {
  if (team === 'barcelona') return '#A50044'
  if (team === 'realmadrid') return '#FEBE10'
  return '#0057A8'
}

export const SUMMARY_MIN_LENGTH = 40
export const SUMMARY_MAX_LENGTH = 320