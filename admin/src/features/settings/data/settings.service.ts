import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, orderBy, serverTimestamp } from 'firebase/firestore'
import { db } from '@/core/data/firebase'
import type { AdConfig, MembershipPlan, MembershipSubscription } from '../domain/settings.types'
import { DEFAULT_AD_CONFIG } from '../domain/settings.types'
import { logActivity } from '@/features/activity/data/activity.service'

const SETTINGS_ADS = 'settings/ads'
const SETTINGS_TIERS = 'settings/tiers'
const MEMBERSHIP_PLANS = 'membership_plans'
const MEMBERSHIP_SUBSCRIPTIONS = 'membership_subscriptions'

function toMillis(value: unknown): number {
  if (value && typeof value === 'object' && 'toMillis' in (value as object)) {
    return (value as { toMillis(): number }).toMillis()
  }
  if (typeof value === 'number') return value
  return Date.now()
}

export async function fetchAdConfig(): Promise<AdConfig> {
  try {
    const snap = await getDoc(doc(db, SETTINGS_ADS))
    if (!snap.exists()) return DEFAULT_AD_CONFIG
    const data = snap.data()
    return {
      enabled: (data.enabled as boolean) ?? DEFAULT_AD_CONFIG.enabled,
      adUnitIdAndroid: (data.adUnitIdAndroid as string) ?? '',
      adUnitIdIos: (data.adUnitIdIos as string) ?? '',
      frequencyCap: (data.frequencyCap as number) ?? 0,
      bannerPosition: data.bannerPosition === 'top' ? 'top' : 'bottom',
      testMode: (data.testMode as boolean) ?? true,
    }
  } catch {
    return DEFAULT_AD_CONFIG
  }
}

export async function saveAdConfig(config: AdConfig): Promise<void> {
  await setDoc(doc(db, SETTINGS_ADS), { ...config, updatedAt: serverTimestamp() })

  logActivity({
    action: 'settings.ads',
    targetId: 'settings/ads',
    targetLabel: 'إعدادات الإعلانات',
    details: { enabled: config.enabled, testMode: config.testMode, bannerPosition: config.bannerPosition },
  })
}

export async function saveTierThresholds(thresholds: number[]): Promise<void> {
  await setDoc(doc(db, SETTINGS_TIERS), { thresholds, updatedAt: serverTimestamp() })

  logActivity({
    action: 'settings.tiers',
    targetId: 'settings/tiers',
    targetLabel: 'حدود المراتب',
    details: { thresholds: thresholds.join(', ') },
  })
}

function mapPlan(id: string, data: Record<string, unknown>): MembershipPlan {
  const tierRaw = data.tier as string
  const tier = tierRaw === 'free' || tierRaw === 'bronze' || tierRaw === 'silver' || tierRaw === 'gold' ? tierRaw : 'free'
  return {
    id,
    name: (data.name as string) ?? 'خطة عضوية',
    tier,
    price: (data.price as number) ?? 0,
    currency: (data.currency as string) ?? 'KWD',
    durationDays: (data.durationDays as number) ?? 30,
    benefits: Array.isArray(data.benefits) ? (data.benefits as string[]) : [],
    active: (data.active as boolean) ?? true,
    createdAt: toMillis(data.createdAt),
  }
}

export async function fetchMembershipPlans(): Promise<MembershipPlan[]> {
  try {
    const snap = await getDocs(query(collection(db, MEMBERSHIP_PLANS), orderBy('createdAt', 'asc')))
    return snap.docs.map((d) => mapPlan(d.id, d.data()))
  } catch {
    return []
  }
}

export async function saveMembershipPlan(plan: Omit<MembershipPlan, 'id' | 'createdAt'> & { id?: string }): Promise<string> {
  const id = plan.id || doc(collection(db, MEMBERSHIP_PLANS)).id
  await setDoc(doc(db, MEMBERSHIP_PLANS, id), { ...plan, id, createdAt: serverTimestamp() })

  logActivity({
    action: 'settings.membership',
    targetId: id,
    targetLabel: plan.name,
    details: { name: plan.name, tier: plan.tier, price: plan.price, active: plan.active },
  })
  return id
}

export async function deleteMembershipPlan(id: string): Promise<void> {
  await deleteDoc(doc(db, MEMBERSHIP_PLANS, id))

  logActivity({
    action: 'settings.membership',
    targetId: id,
    targetLabel: 'حذف خطة عضوية',
  })
}

function mapSubscription(id: string, data: Record<string, unknown>): MembershipSubscription {
  const userTeamRaw = data.userTeam as string | null | undefined
  const userTeam = userTeamRaw === 'barcelona' || userTeamRaw === 'realmadrid' ? userTeamRaw : null
  const statusRaw = data.status as string
  const status = statusRaw === 'active' || statusRaw === 'expired' || statusRaw === 'cancelled' ? statusRaw : 'active'
  return {
    id,
    userId: (data.userId as string) ?? '',
    userName: (data.userName as string) ?? 'مستخدم',
    userTeam,
    planId: (data.planId as string) ?? '',
    planName: (data.planName as string) ?? 'خطة عضوية',
    status,
    startedAt: toMillis(data.startedAt),
    expiresAt: toMillis(data.expiresAt),
  }
}

export async function fetchMembershipSubscribers(): Promise<MembershipSubscription[]> {
  try {
    const snap = await getDocs(query(collection(db, MEMBERSHIP_SUBSCRIPTIONS), orderBy('expiresAt', 'desc')))
    return snap.docs.map((d) => mapSubscription(d.id, d.data()))
  } catch {
    return []
  }
}