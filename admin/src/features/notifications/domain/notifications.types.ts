export type NotificationTarget = 'all' | 'barcelona' | 'realmadrid'

export type NotificationStatus = 'scheduled' | 'sent' | 'failed'

export interface NotificationStats {
  sentCount: number
}

export interface PushNotification {
  id: string
  title: string
  body: string
  imageUrl: string
  target: NotificationTarget
  status: NotificationStatus
  scheduledAt: number | null
  sentAt: number | null
  deepLink: string
  stats: NotificationStats
  createdBy: string
  createdAt: number
}

export const NOTIFICATION_TARGETS: { value: NotificationTarget; label: string }[] = [
  { value: 'all', label: 'جميع المستخدمين' },
  { value: 'barcelona', label: 'مشجعو برشلونة' },
  { value: 'realmadrid', label: 'مشجعو ريال مدريد' },
]

export const NOTIFICATION_STATUS_LABELS: Record<NotificationStatus, string> = {
  scheduled: 'مجدول',
  sent: 'مرسل',
  failed: 'فشل',
}

export function targetLabel(target: NotificationTarget): string {
  return NOTIFICATION_TARGETS.find((t) => t.value === target)?.label ?? target
}

export function targetAccent(target: NotificationTarget): string {
  if (target === 'barcelona') return '#A50044'
  if (target === 'realmadrid') return '#FEBE10'
  return '#0057A8'
}

export function statusLabel(status: NotificationStatus): string {
  return NOTIFICATION_STATUS_LABELS[status]
}

export function statusColor(status: NotificationStatus): string {
  if (status === 'sent') return '#00E676'
  if (status === 'scheduled') return '#FFB300'
  return '#FF5252'
}

const KUWAIT_OFFSET_MS = 3 * 60 * 60 * 1000

const AR_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

function kuwaitShifted(ms: number): Date {
  return new Date(ms + KUWAIT_OFFSET_MS)
}

function formatKuwaitTime(ms: number): string {
  const d = kuwaitShifted(ms)
  const h12 = d.getUTCHours() % 12 || 12
  return `${h12}:${pad2(d.getUTCMinutes())} ${d.getUTCHours() < 12 ? 'ص' : 'م'}`
}

export function formatKuwaitDateTime(ms: number): string {
  const d = kuwaitShifted(ms)
  return `${d.getUTCDate()} ${AR_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()} — ${formatKuwaitTime(ms)}`
}
