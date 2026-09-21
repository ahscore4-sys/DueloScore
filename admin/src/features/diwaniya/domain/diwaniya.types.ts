export type DiwaniyaPostType = 'text' | 'poll'

export type PollStatus = 'open' | 'closed'

export type FanTeam = 'barcelona' | 'realmadrid'

export interface PollOption {
  id: string
  text: string
}

export type VotesByTeam = Record<FanTeam, Record<string, number>>

export interface DiwaniyaPost {
  id: string
  authorId: string
  authorName: string
  authorTier: string | null
  text: string
  type: DiwaniyaPostType
  createdAt: number
  hidden: boolean
  hiddenAt: number | null
  hiddenBy: string | null
  reportCount: number
  reportedBy: string[]
  question: string | null
  options: PollOption[]
  endsAt: number | null
  pollStatus: PollStatus
  totalVotes: number
  votesByTeam: VotesByTeam
  winningOptionId: string | null
}

export interface DiwaniyaComment {
  id: string
  postId: string
  parentId: string | null
  rootId: string | null
  depth: number
  repliesCount: number
  authorId: string
  authorName: string
  authorTier: string | null
  text: string
  createdAt: number
  hidden: boolean
  hiddenAt: number | null
  hiddenBy: string | null
  reportCount: number
}

export type ReportTargetType = 'post' | 'comment'

export interface Report {
  id: string
  targetType: ReportTargetType
  targetId: string
  reporterId: string
  reason: string
  createdAt: number
}

export interface ModerationSettings {
  autoHideThreshold: number
}

export const MAX_COMMENT_DEPTH = 5

export function pollStatusLabel(status: PollStatus): string {
  return status === 'open' ? 'مفتوحة' : 'مغلقة'
}

export function teamLabel(team: FanTeam): string {
  return team === 'barcelona' ? 'برشلونة' : 'ريال مدريد'
}

export function teamAccent(team: FanTeam): string {
  return team === 'barcelona' ? '#A50044' : '#FEBE10'
}

export function tierAccent(tier: string | null): string {
  if (tier === 'ذهبي') return '#FEBE10'
  if (tier === 'فضي') return '#B0BEC5'
  if (tier === 'برونزي') return '#CD7F32'
  return 'rgba(255,255,255,0.25)'
}
