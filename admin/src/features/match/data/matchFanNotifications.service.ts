import { httpsCallable } from 'firebase/functions'
import { functions } from '@/core/data/firebase'
import { logActivity } from '@/features/activity/data/activity.service'

export type MatchFanNotificationKind = 'var' | 'penalty_awarded' | 'var_decision'

export type VarDecision = 'error' | 'no_error'

export interface SendMatchFanNotificationInput {
  matchId: string
  matchLabel: string
  kind: MatchFanNotificationKind
  eventType?: string
  team?: 'home' | 'away'
  minute?: string
  decision?: VarDecision
  cause?: string
}

interface SendMatchFanResult {
  ok: boolean
  skipped?: boolean
  sentCount?: number
  error?: string
}

interface FanTeamLike {
  id?: string
  name?: string
}

export interface MatchLikeForFans {
  home?: FanTeamLike
  away?: FanTeamLike
}

export interface MatchFanTopics {
  barcelona: boolean
  realmadrid: boolean
}

const isBarca = (t?: FanTeamLike): boolean =>
  t?.id === 'barca' || (t?.name != null && /برشلونة|barcelona/i.test(t.name))

const isMadrid = (t?: FanTeamLike): boolean =>
  t?.id === 'madrid' || (t?.name != null && /ريال مدريد|real\s*madrid/i.test(t.name))

export function matchFanTopics(match: MatchLikeForFans): MatchFanTopics {
  return {
    barcelona: isBarca(match.home) || isBarca(match.away),
    realmadrid: isMadrid(match.home) || isMadrid(match.away),
  }
}

export async function sendMatchFanNotification(input: SendMatchFanNotificationInput): Promise<SendMatchFanResult> {
  const fn = httpsCallable<{
    matchId: string
    kind: MatchFanNotificationKind
    eventType?: string
    team?: 'home' | 'away'
    minute?: string
    decision?: VarDecision
    cause?: string
  }, SendMatchFanResult>(functions, 'sendMatchFanNotification')

  const res = await fn({
    matchId: input.matchId,
    kind: input.kind,
    eventType: input.eventType,
    team: input.team,
    minute: input.minute,
    decision: input.decision,
    cause: input.cause,
  })

  logActivity({
    action: 'notification.create',
    targetType: 'match',
    targetId: input.matchId,
    targetLabel: input.matchLabel,
    details: {
      kind: input.kind,
      eventType: input.eventType ?? null,
      team: input.team ?? null,
      minute: input.minute ?? null,
      decision: input.decision ?? null,
      cause: input.cause ?? null,
      sentCount: res.data.sentCount ?? null,
    },
  })

  if (!res.data.ok) {
    throw new Error(res.data.error || 'فشل إرسال الإشعار')
  }

  return res.data
}