export type ActivityTargetType =
  | 'match'
  | 'event'
  | 'news'
  | 'diwaniya'
  | 'user'
  | 'notification'
  | 'challenge'
  | 'settings'
  | 'session'
  | 'player'
  | 'coverage'

export type ActivityAction =
  | 'match.create'
  | 'match.update'
  | 'match.delete'
  | 'match.save_plan'
  | 'match.control'
  | 'event.create'
  | 'event.update'
  | 'event.delete'
  | 'news.create'
  | 'news.update'
  | 'news.delete'
  | 'news.renotify'
  | 'diwaniya.create'
  | 'diwaniya.hide'
  | 'diwaniya.restore'
  | 'comment.hide'
  | 'comment.restore'
  | 'report.create'
  | 'user.points_adjust'
  | 'user.broadcast'
  | 'admin.grant'
  | 'admin.edit'
  | 'admin.revoke'
  | 'notification.create'
  | 'notification.resend'
  | 'question.create'
  | 'question.update'
  | 'question.delete'
  | 'question.toggle'
  | 'settings.moderation'
  | 'settings.tiers'
  | 'settings.ads'
  | 'settings.membership'
  | 'session.login'
  | 'session.logout'
  | 'player.update'
  | 'player.delete'
  | 'team.update'
  | 'stadium.create'
  | 'stadium.update'
  | 'stadium.delete'
  | 'commentator.create'
  | 'commentator.update'
  | 'commentator.delete'
  | 'referee.create'
  | 'referee.update'
  | 'referee.delete'
  | 'channel.create'
  | 'channel.update'
  | 'channel.delete'
  | 'coverage.match.update'

export interface ActivityLogEntry {
  id: string
  adminId: string
  adminName: string
  targetType: ActivityTargetType
  action: ActivityAction
  targetId: string | null
  targetLabel: string
  details: Record<string, string | number | boolean | null> | null
  timestamp: number
}

export type ActivityDetails = Record<string, string | number | boolean | null>

export interface ActivityLogInput {
  action: ActivityAction
  targetType?: ActivityTargetType
  targetId?: string | null
  targetLabel?: string
  details?: ActivityDetails
}

export const ACTIVITY_TARGET_TYPES: { value: ActivityTargetType; label: string }[] = [
  { value: 'match', label: 'المباريات' },
  { value: 'event', label: 'الأحداث' },
  { value: 'news', label: 'الأخبار' },
  { value: 'diwaniya', label: 'الديوانية' },
  { value: 'user', label: 'المستخدمون' },
  { value: 'notification', label: 'الإشعارات' },
  { value: 'challenge', label: 'تحدي اليوم' },
  { value: 'settings', label: 'الإعدادات' },
  { value: 'session', label: 'الجلسات' },
  { value: 'coverage', label: 'التغطية' },
]

export const ACTIVITY_ACTIONS: { value: ActivityAction; label: string; group: ActivityTargetType }[] = [
  { value: 'match.create', label: 'إنشاء مباراة', group: 'match' },
  { value: 'match.update', label: 'تعديل مباراة', group: 'match' },
  { value: 'match.delete', label: 'حذف مباراة', group: 'match' },
  { value: 'match.save_plan', label: 'حفظ التشكيلة', group: 'match' },
  { value: 'match.control', label: 'تحكم مباشر', group: 'match' },
  { value: 'event.create', label: 'تسجيل حدث', group: 'event' },
  { value: 'event.update', label: 'تعديل حدث', group: 'event' },
  { value: 'event.delete', label: 'حذف حدث', group: 'event' },
  { value: 'news.create', label: 'إنشاء خبر', group: 'news' },
  { value: 'news.update', label: 'تعديل خبر', group: 'news' },
  { value: 'news.delete', label: 'حذف خبر', group: 'news' },
  { value: 'news.renotify', label: 'إعادة إرسال إشعار', group: 'news' },
  { value: 'diwaniya.create', label: 'إنشاء منشور', group: 'diwaniya' },
  { value: 'diwaniya.hide', label: 'إخفاء منشور', group: 'diwaniya' },
  { value: 'diwaniya.restore', label: 'استعادة منشور', group: 'diwaniya' },
  { value: 'comment.hide', label: 'إخفاء تعليق', group: 'diwaniya' },
  { value: 'comment.restore', label: 'استعادة تعليق', group: 'diwaniya' },
  { value: 'report.create', label: 'إبلاغ عن محتوى', group: 'diwaniya' },
  { value: 'user.points_adjust', label: 'تعديل نقاط', group: 'user' },
  { value: 'user.broadcast', label: 'إشعار جماعي', group: 'user' },
  { value: 'admin.grant', label: 'ترقية إلى مدير', group: 'user' },
  { value: 'admin.edit', label: 'تعديل صلاحيات مدير', group: 'user' },
  { value: 'admin.revoke', label: 'إلغاء صلاحية مدير', group: 'user' },
  { value: 'notification.create', label: 'إنشاء إشعار', group: 'notification' },
  { value: 'notification.resend', label: 'إعادة إرسال', group: 'notification' },
  { value: 'question.create', label: 'إنشاء سؤال', group: 'challenge' },
  { value: 'question.update', label: 'تعديل سؤال', group: 'challenge' },
  { value: 'question.delete', label: 'حذف سؤال', group: 'challenge' },
  { value: 'question.toggle', label: 'تفعيل/إيقاف سؤال', group: 'challenge' },
  { value: 'settings.moderation', label: 'إعدادات الوساطة', group: 'settings' },
  { value: 'settings.tiers', label: 'حدود المراتب', group: 'settings' },
  { value: 'settings.ads', label: 'إعدادات الإعلانات', group: 'settings' },
  { value: 'settings.membership', label: 'خطط العضوية', group: 'settings' },
  { value: 'session.login', label: 'تسجيل الدخول', group: 'session' },
  { value: 'session.logout', label: 'تسجيل الخروج', group: 'session' },
  { value: 'player.update', label: 'تعديل لاعب', group: 'player' },
  { value: 'player.delete', label: 'حذف لاعب', group: 'player' },
  { value: 'team.update', label: 'تعديل بيانات فريق', group: 'player' },
  { value: 'stadium.create', label: 'إضافة ملعب', group: 'coverage' },
  { value: 'stadium.update', label: 'تعديل ملعب', group: 'coverage' },
  { value: 'stadium.delete', label: 'حذف ملعب', group: 'coverage' },
  { value: 'commentator.create', label: 'إضافة معلق', group: 'coverage' },
  { value: 'commentator.update', label: 'تعديل معلق', group: 'coverage' },
  { value: 'commentator.delete', label: 'حذف معلق', group: 'coverage' },
  { value: 'referee.create', label: 'إضافة حكم', group: 'coverage' },
  { value: 'referee.update', label: 'تعديل حكم', group: 'coverage' },
  { value: 'referee.delete', label: 'حذف حكم', group: 'coverage' },
  { value: 'channel.create', label: 'إضافة قناة', group: 'coverage' },
  { value: 'channel.update', label: 'تعديل قناة', group: 'coverage' },
  { value: 'channel.delete', label: 'حذف قناة', group: 'coverage' },
  { value: 'coverage.match.update', label: 'تعديل مباراة مغطاة', group: 'coverage' },
]

export const ACTIVITY_GROUP_COLORS: Record<ActivityTargetType, string> = {
  match: '#0057A8',
  event: '#00E676',
  news: '#B388FF',
  diwaniya: '#FF9800',
  user: '#4DD0E1',
  notification: '#F06292',
  challenge: '#FEBE10',
  settings: '#9E9E9E',
  session: '#80CBC4',
  player: '#4DB6AC',
  coverage: '#FEBE10',
}

export const ACTIVITY_GROUP_LABELS: Record<ActivityTargetType, string> = {
  match: 'مباراة',
  event: 'حدث',
  news: 'خبر',
  diwaniya: 'ديوانية',
  user: 'مستخدم',
  notification: 'إشعار',
  challenge: 'تحدي',
  settings: 'إعدادات',
  session: 'جلسة',
  player: 'لاعب',
  coverage: 'تغطية',
}

export function activityGroup(action: ActivityAction): ActivityTargetType {
  return ACTIVITY_ACTIONS.find((a) => a.value === action)?.group ?? 'settings'
}

export function activityActionLabel(action: ActivityAction): string {
  return ACTIVITY_ACTIONS.find((a) => a.value === action)?.label ?? action
}

export function groupLabel(targetType: ActivityTargetType): string {
  return ACTIVITY_GROUP_LABELS[targetType]
}

export function groupColor(targetType: ActivityTargetType): string {
  return ACTIVITY_GROUP_COLORS[targetType] ?? '#9E9E9E'
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

export function detailsKeyLabel(key: string): string {
  const map: Record<string, string> = {
    title: 'العنوان',
    content: 'المحتوى',
    team: 'الفريق',
    tag: 'التصنيف',
    author: 'الكاتب',
    sourceUrl: 'المصدر',
    text: 'النص',
    question: 'السؤال',
    options: 'الخيارات',
    hidden: 'مخفي',
    pointsDelta: 'النقاط',
    reason: 'السبب',
    userId: 'المستخدم',
    permissions: 'الصلاحيات',
    audience: 'الجمهور',
    target: 'الهدف',
    deepLink: 'الرابط',
    competition: 'البطولة',
    round: 'الجولة',
    season: 'الموسم',
    stadium: 'الملعب',
    score: 'النتيجة',
    status: 'الحالة',
    from: 'من',
    to: 'إلى',
    active: 'مفعل',
    type: 'النوع',
    player: 'اللاعب',
    minute: 'الدقيقة',
    autoHide: 'الحد التلقائي',
  }
  return map[key] ?? key
}