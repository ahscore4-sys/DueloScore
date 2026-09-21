export type FavoriteTeam = 'barcelona' | 'realmadrid'

export interface Device {
  token: string
  platform: 'android' | 'ios'
}

export interface AppUser {
  id: string
  name: string
  email: string | null
  profilePicture: string
  favoriteTeam: FavoriteTeam | null
  points: number
  tier: number | null
  tierProgress: number
  devices: Device[]
  createdAt: number
}

export interface PointsLogEntry {
  id: string
  userId: string
  points: number
  reason: string
  ref: string | null
  createdAt: number
}

export interface TierDefinition {
  name: string
  color: string
  threshold: number
}

export const DEFAULT_TIER_THRESHOLDS = [0, 500, 1500, 3500, 7000]

export const TIER_NAMES = ['المشجع', 'متحمس المدرجات', 'نجم الديوانية', 'قائد الجماهير', 'أسطورة النادي']

export const TIER_COLORS = ['#9E9E9E', '#8D6E63', '#0057A8', '#FEBE10', '#00E676']

export function tiersFromThresholds(thresholds: number[]): TierDefinition[] {
  return TIER_NAMES.map((name, i) => ({
    name,
    color: TIER_COLORS[i],
    threshold: thresholds[i] ?? DEFAULT_TIER_THRESHOLDS[i],
  }))
}

export function defaultTiers(): TierDefinition[] {
  return tiersFromThresholds(DEFAULT_TIER_THRESHOLDS)
}

export interface TierInfo {
  index: number
  name: string
  color: string
  currentThreshold: number
  nextThreshold: number | null
  progress: number
}

export function computeTierInfo(points: number, thresholds: number[]): TierInfo {
  const tiers = tiersFromThresholds(thresholds)
  let index = 0
  for (let i = 0; i < tiers.length; i++) {
    if (points >= tiers[i].threshold) index = i
  }
  const current = tiers[index]
  const next = tiers[index + 1] ?? null

  if (!next || next.threshold <= current.threshold) {
    return { index, name: current.name, color: current.color, currentThreshold: current.threshold, nextThreshold: null, progress: 100 }
  }

  const span = next.threshold - current.threshold
  const progress = Math.min(100, Math.max(0, Math.round(((points - current.threshold) / span) * 100)))
  return { index, name: current.name, color: current.color, currentThreshold: current.threshold, nextThreshold: next.threshold, progress }
}

export function formatPoints(points: number): string {
  return new Intl.NumberFormat('ar-EG').format(points)
}

export function teamLabel(team: FavoriteTeam | null): string {
  if (team === 'barcelona') return 'برشلونة'
  if (team === 'realmadrid') return 'ريال مدريد'
  return 'غير محدد'
}

export function teamColor(team: FavoriteTeam | null): string {
  if (team === 'barcelona') return '#A50044'
  if (team === 'realmadrid') return '#FEBE10'
  return '#546E7A'
}
