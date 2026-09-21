import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/ar'

dayjs.extend(relativeTime)
dayjs.locale('ar')

export function timeAgo(ms: number): string {
  return dayjs(ms).fromNow()
}

export function formatDateTime(ms: number): string {
  return dayjs(ms).format('DD MMMM YYYY · HH:mm')
}
