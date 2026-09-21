const KUWAIT_UTC_OFFSET_HOURS = 3

export function formatKickoffTime(kickoff: string): string {
  return kickoff.replace(/(\d{1,2}):(\d{2})/, (_m, h: string, min: string) => {
    const utcHours = Number(h)
    const hours = (utcHours + KUWAIT_UTC_OFFSET_HOURS) % 24
    const period = hours >= 12 ? 'مساءً' : 'صباحاً'
    const h12 = hours % 12 || 12
    return `${h12}:${min} ${period}`
  })
}
