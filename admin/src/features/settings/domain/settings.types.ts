export interface AdConfig {
  enabled: boolean
  adUnitIdAndroid: string
  adUnitIdIos: string
  frequencyCap: number
  bannerPosition: 'top' | 'bottom'
  testMode: boolean
}

export type MembershipTier = 'free' | 'bronze' | 'silver' | 'gold'

export interface MembershipPlan {
  id: string
  name: string
  tier: MembershipTier
  price: number
  currency: string
  durationDays: number
  benefits: string[]
  active: boolean
  createdAt: number
}

export type SubscriptionStatus = 'active' | 'expired' | 'cancelled'

export interface MembershipSubscription {
  id: string
  userId: string
  userName: string
  userTeam: 'barcelona' | 'realmadrid' | null
  planId: string
  planName: string
  status: SubscriptionStatus
  startedAt: number
  expiresAt: number
}

export const DEFAULT_AD_CONFIG: AdConfig = {
  enabled: false,
  adUnitIdAndroid: '',
  adUnitIdIos: '',
  frequencyCap: 0,
  bannerPosition: 'bottom',
  testMode: true,
}

export const BANNER_POSITIONS: { value: 'top' | 'bottom'; label: string }[] = [
  { value: 'bottom', label: 'أسفل الشاشة' },
  { value: 'top', label: 'أعلى الشاشة' },
]

export const MEMBERSHIP_TIERS: { value: MembershipTier; label: string }[] = [
  { value: 'free', label: 'مجاني' },
  { value: 'bronze', label: 'برونزي' },
  { value: 'silver', label: 'فضي' },
  { value: 'gold', label: 'ذهبي' },
]

export const MEMBERSHIP_TIER_COLORS: Record<MembershipTier, string> = {
  free: '#9E9E9E',
  bronze: '#8D6E63',
  silver: '#B0BEC5',
  gold: '#FEBE10',
}

export const SUBSCRIPTION_STATUS: { value: SubscriptionStatus; label: string }[] = [
  { value: 'active', label: 'مفعّلة' },
  { value: 'expired', label: 'منتهية' },
  { value: 'cancelled', label: 'ملغاة' },
]