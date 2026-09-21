import { Box, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer'
import AutorenewIcon from '@mui/icons-material/Autorenew'
import type { PlayerMatchStats } from '@/features/match/domain/matchDerivation'
import { emptyPlayerStats } from '@/features/match/domain/matchDerivation'

const RED = '#FF5252'

const BADGE_BG = '#FFFFFF'
const BADGE_BORDER = '1px solid rgba(0,0,0,0.18)'
const BADGE_SHADOW = '0 1px 3px rgba(0,0,0,0.35)'
const DARK_TEXT = '#1A1A2E'

function ratingColor(rating: number): string {
  if (rating >= 8) return '#2E7D32'
  if (rating >= 7) return '#8BC34A'
  if (rating >= 6) return '#F9A825'
  return '#E53935'
}

function SneakerIcon({ size = 13, color = '#000' }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable={false}
    >
      <path d="M4 6h5.426a1 1 0 0 1 .863.496l1.064 1.823a3 3 0 0 0 1.896 1.407l4.677 1.114A4 4 0 0 1 21 14.73V17a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1m10 7l1-2" />
      <path d="M8 18v-1a4 4 0 0 0-4-4H3m7-1l1.5-3" />
    </svg>
  )
}

interface CountChipProps {
  icon: ReactNode
  count: number
  title: string
}

export function CountChip({ icon, count, title }: CountChipProps) {
  return (
    <Box
      component="span"
      title={title}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.35,
        borderRadius: 999,
        px: 0.5,
        py: 0.15,
        bgcolor: BADGE_BG,
        border: BADGE_BORDER,
        boxShadow: BADGE_SHADOW,
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      {count > 1 && (
        <Typography sx={{ fontSize: 10.5, fontWeight: 900, color: DARK_TEXT, lineHeight: 1 }}>{count}</Typography>
      )}
      {icon}
    </Box>
  )
}

export function GoalChips({ goals, og }: { goals: number; og: number }) {
  return (
    <>
      {goals > 0 && (
        <CountChip
          icon={<SportsSoccerIcon sx={{ fontSize: 13, color: '#000' }} />}
          count={goals}
          title={`أهداف: ${goals}`}
        />
      )}
      {og > 0 && (
        <CountChip
          icon={<SportsSoccerIcon sx={{ fontSize: 13, color: '#C62828' }} />}
          count={og}
          title={`هدف عكسي: ${og}`}
        />
      )}
    </>
  )
}

export function AssistChip({ count }: { count: number }) {
  return (
    <CountChip
      icon={<SneakerIcon />}
      count={count}
      title={`صناعة أهداف: ${count}`}
    />
  )
}

export function CardIcon({ fill }: { fill: string }) {
  return (
    <Box
      sx={{
        width: 7,
        height: 10,
        borderRadius: 0.5,
        bgcolor: fill,
        border: '1px solid rgba(0,0,0,0.25)',
        boxShadow: '0 1px 2px rgba(0,0,0,0.35)',
      }}
    />
  )
}

export function CardsBadge({ yellows, reds }: { yellows: number; reds: number }) {
  const showYellow = yellows > 0
  const showRed = reds > 0
  if (!showYellow && !showRed) return null
  const title = showYellow && showRed
    ? 'بطاقة صفراء ثم حمراء'
    : (showYellow ? 'بطاقة صفراء' : 'بطاقة حمراء')
  return (
    <Box
      component="span"
      title={title}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 22,
        height: 22,
        borderRadius: 999,
        bgcolor: BADGE_BG,
        border: BADGE_BORDER,
        boxShadow: BADGE_SHADOW,
      }}
    >
      {showRed && showYellow ? (
        <Box sx={{ position: 'relative', width: 13, height: 10, display: 'inline-block' }}>
          <Box sx={{ position: 'absolute', left: 0, top: 1, zIndex: 1 }}>
            <CardIcon fill="#FDD835" />
          </Box>
          <Box sx={{ position: 'absolute', left: 6, top: 0, zIndex: 2, transform: 'rotate(14deg)' }}>
            <CardIcon fill={RED} />
          </Box>
        </Box>
      ) : (
        <CardIcon fill={showRed ? RED : '#FDD835'} />
      )}
    </Box>
  )
}

export function RatingSegment({ rating }: { rating: number }) {
  const color = ratingColor(rating)
  return (
    <Box
      component="span"
      title={`تقييم اللاعب: ${rating.toFixed(1)}`}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        px: 0.5,
        py: 0.15,
        borderRadius: 999,
        bgcolor: color,
        border: '1px solid rgba(0,0,0,0.25)',
        boxShadow: BADGE_SHADOW,
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      <Typography sx={{ fontSize: 10.5, fontWeight: 900, color: '#FFFFFF', lineHeight: 1 }}>{rating.toFixed(1)}</Typography>
    </Box>
  )
}

export function SubSegment({ kind, tone }: { kind: 'in' | 'out'; tone: 'red' | 'green' }) {
  const color = tone === 'red' ? '#D32F2F' : '#00897B'
  return (
    <Box
      component="span"
      title={kind === 'in' ? 'دخل كبديل' : 'خرج من المباراة'}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 999,
        width: 22,
        height: 22,
        justifyContent: 'center',
        bgcolor: BADGE_BG,
        border: BADGE_BORDER,
        boxShadow: BADGE_SHADOW,
        lineHeight: 1,
      }}
    >
      <AutorenewIcon sx={{ fontSize: 17, color, stroke: color, strokeWidth: 2.4, strokeLinecap: 'round' }} />
    </Box>
  )
}

export function NumberSegment({ number, accent }: { number: number; accent: string }) {
  return (
    <Box
      component="span"
      title={`الرقم: ${number}`}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 999,
        minWidth: 21,
        height: 21,
        px: 0.3,
        justifyContent: 'center',
        bgcolor: accent,
        color: '#fff',
        fontSize: 11,
        fontWeight: 900,
        lineHeight: 1,
        border: '1px solid rgba(0,0,0,0.25)',
        boxShadow: BADGE_SHADOW,
      }}
    >
      {number}
    </Box>
  )
}

export interface PlayerStatsBadgesProps {
  stats?: PlayerMatchStats
  rating?: number | null
  number?: number
  accent?: string
  variant?: 'circle' | 'row'
  subMarker?: 'in' | 'out' | null
  subTone?: 'red' | 'green'
}

export default function PlayerStatsBadges({
  stats,
  rating,
  number,
  accent = '#0057A8',
  variant = 'circle',
  subMarker,
  subTone,
}: PlayerStatsBadgesProps) {
  const s = stats ?? emptyPlayerStats()
  const hasGoals = s.goals > 0 || s.og > 0
  const hasCards = s.yellows > 0 || s.reds > 0
  const hasAssists = s.assists > 0
  const hasRating = typeof rating === 'number' && Number.isFinite(rating)
  const resolvedSub: 'in' | 'out' | null =
    subMarker ?? (s.subbedOut ? 'out' : s.cameOn ? 'in' : null)

  if (variant === 'row') {
    return (
      <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.45 }}>
        {typeof number === 'number' && <NumberSegment number={number} accent={accent} />}
        {hasGoals && (
          <Box component="span" sx={{ display: 'inline-flex', flexDirection: 'column', gap: 0.2, alignItems: 'flex-start' }}>
            <GoalChips goals={s.goals} og={s.og} />
          </Box>
        )}
        {resolvedSub && <SubSegment kind={resolvedSub} tone={subTone ?? 'green'} />}
        {hasAssists && <AssistChip count={s.assists} />}
        {hasRating && <RatingSegment rating={rating as number} />}
        {hasCards && <CardsBadge yellows={s.yellows} reds={s.reds} />}
      </Box>
    )
  }

  return (
    <Box component="span" sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2 }}>
      {s.goals > 0 && (
        <Box component="span" sx={{ position: 'absolute', top: -13, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
          <CountChip
            icon={<SportsSoccerIcon sx={{ fontSize: 13, color: '#000' }} />}
            count={s.goals}
            title={`أهداف: ${s.goals}`}
          />
        </Box>
      )}
      {s.og > 0 && (
        <Box component="span" sx={{ position: 'absolute', top: -7, left: 58 }}>
          <CountChip
            icon={<SportsSoccerIcon sx={{ fontSize: 13, color: '#C62828' }} />}
            count={s.og}
            title={`هدف عكسي: ${s.og}`}
          />
        </Box>
      )}
      {resolvedSub && (
        <Box component="span" sx={{ position: 'absolute', top: '50%', left: -8, transform: 'translateY(-50%)' }}>
          <SubSegment kind={resolvedSub} tone={subTone ?? 'red'} />
        </Box>
      )}
      {hasAssists && (
        <Box component="span" sx={{ position: 'absolute', top: '50%', left: 70, transform: 'translateY(-50%)' }}>
          <AssistChip count={s.assists} />
        </Box>
      )}
      {hasRating && (
        <Box component="span" sx={{ position: 'absolute', bottom: -3, left: -1 }}>
          <RatingSegment rating={rating as number} />
        </Box>
      )}
      {hasCards && (
        <Box component="span" sx={{ position: 'absolute', bottom: -3, left: 58 }}>
          <CardsBadge yellows={s.yellows} reds={s.reds} />
        </Box>
      )}
    </Box>
  )
}