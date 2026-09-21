import { httpsCallable } from 'firebase/functions'
import { functions } from '@/core/data/firebase'
import { logActivity } from '@/features/activity/data/activity.service'

export type BroadcastAudience = 'all' | 'barcelona' | 'realmadrid'

export interface BroadcastInput {
  audience: BroadcastAudience
  title: string
  body: string
}

function topicFor(audience: BroadcastAudience): string {
  if (audience === 'barcelona') return 'barcelona_news'
  if (audience === 'realmadrid') return 'realmadrid_news'
  return 'all_news'
}

export async function sendBroadcastPush(input: BroadcastInput): Promise<void> {
  const fn = httpsCallable<{ topic: string; title: string; body: string }, { ok: boolean }>(
    functions,
    'sendTopicNotification',
  )
  await fn({ topic: topicFor(input.audience), title: input.title.trim(), body: input.body.trim() })

  logActivity({
    action: 'user.broadcast',
    targetId: topicFor(input.audience),
    targetLabel: input.title.trim(),
    details: { title: input.title.trim(), content: input.body.trim(), audience: input.audience },
  })
}
