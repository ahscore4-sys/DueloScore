import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/ar'

dayjs.extend(relativeTime)
dayjs.locale('ar')

export function formatDateTime(ms: number): string {
  return dayjs(ms).format('DD MMMM YYYY · HH:mm')
}

export function formatDate(ms: number): string {
  return dayjs(ms).format('DD MMMM YYYY')
}
