import type { ReactNode } from 'react'
import { Box, Stack, Typography } from '@mui/material'
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer'
import SquareIcon from '@mui/icons-material/Square'
import AdjustIcon from '@mui/icons-material/Adjust'
import TripOriginIcon from '@mui/icons-material/TripOrigin'
import PersonRemoveIcon from '@mui/icons-material/PersonRemove'
import type { CoverageEvent } from '../../domain/coverageMatches.types'
import { sortCoverageEvents } from '../../domain/coverageMatches.types'

const EVENT_META: Record<string, { label: string; secondary: string; color: string; icon: ReactNode }> = {
  goal: { label: 'هدف', secondary: 'هدف', color: '#00E676', icon: <SportsSoccerIcon sx={{ fontSize: 18 }} /> },
  og: { label: 'هدف في مرماه', secondary: 'هدف عكسي', color: '#FF7043', icon: <SportsSoccerIcon sx={{ fontSize: 18 }} /> },
  pen_scored: { label: 'ركلة جزاء مسجلة', secondary: 'جزاء', color: '#26C6DA', icon: <AdjustIcon sx={{ fontSize: 18 }} /> },
  pen_missed: { label: 'ركلة جزاء ضائعة', secondary: 'جزاء ضائعة', color: '#FF5252', icon: <TripOriginIcon sx={{ fontSize: 18 }} /> },
  yellow: { label: 'بطاقة صفراء', secondary: 'صفراء', color: '#FDD835', icon: <SquareIcon sx={{ fontSize: 15 }} /> },
  red: { label: 'بطاقة حمراء', secondary: 'حمراء', color: '#FF5252', icon: <SquareIcon sx={{ fontSize: 15 }} /> },
  sub: { label: 'تبديل', secondary: 'تبديل', color: '#29B6F6', icon: <PersonRemoveIcon sx={{ fontSize: 18 }} /> },
  phase: { label: 'مرحلة', secondary: '', color: '#FEBE10', icon: <SportsSoccerIcon sx={{ fontSize: 18 }} /> },
}

const PENALTY_MISS_LABELS: Record<'saved' | 'off_target', { text: string; color: string }> = {
  saved: { text: 'تصدّى لها الحارس', color: '#90CAF9' },
  off_target: { text: 'ضائعة', color: '#FF8A80' },
}

function EventIcon({ type, icon }: { type: string; icon: ReactNode }) {
  const color = EVENT_META[type]?.color ?? '#FEBE10'
  return (
    <Box
      sx={{
        width: 38,
        height: 38,
        flexShrink: 0,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: `${color}1F`,
        border: `1.5px solid ${color}66`,
        color,
        boxShadow: `0 0 16px ${color}33`,
        '& svg': { fontSize: 18 },
      }}
    >
      {icon}
    </Box>
  )
}

function MinutePill({ minute, reserved }: { minute: string; reserved: boolean }) {
  return (
    <Box
      sx={{
        position: 'relative',
        minWidth: 60,
        flexShrink: 0,
        textAlign: 'center',
        fontWeight: 900,
        fontSize: 13,
        color: '#FEBE10',
        bgcolor: '#0A0E1C',
        border: reserved ? '1.5px solid rgba(254,190,16,0.65)' : '1px solid rgba(254,190,16,0.4)',
        borderRadius: 999,
        px: 1.25,
        py: 0.45,
        fontFamily: '"Cairo", sans-serif',
        boxShadow: reserved ? '0 0 14px rgba(254,190,16,0.35)' : 'none',
        zIndex: 1,
      }}
    >
      {minute}
    </Box>
  )
}

function PlayerName({ text, secondary, align }: { text: string; secondary: { text: string; color: string } | null; align: 'right' | 'left' }) {
  return (
    <Stack spacing={0.15} sx={{ minWidth: 0, maxWidth: 200, flexShrink: 1 }}>
      <Typography noWrap sx={{ fontWeight: 800, fontSize: 13, color: 'text.primary', textAlign: align }}>
        {text || '—'}
      </Typography>
      {secondary && (
        <Typography noWrap sx={{ fontSize: 10.5, color: secondary.color, fontWeight: 700, textAlign: align }}>
          {secondary.text}
        </Typography>
      )}
    </Stack>
  )
}

export default function CoverageEventTimeline({ events }: { events: CoverageEvent[] }) {
  const sorted = sortCoverageEvents(events).filter((e) => e.team !== null)

  if (sorted.length === 0) {
    return (
      <Box sx={{ p: 3, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.16)', textAlign: 'center' }}>
        <Typography sx={{ color: 'text.secondary', fontSize: 13.5, fontWeight: 700 }}>
          لا توجد أحداث مسجلة لهذه المباراة بعد.
        </Typography>
      </Box>
    )
  }

  // Timeline flows from the bottom (kick-off) upward to the latest event.
  const bottomToTop = [...sorted].reverse()

  return (
    <Box sx={{ position: 'relative' }}>
      <Box
        sx={{
          width: 2,
          position: 'absolute',
          top: 10,
          bottom: 10,
          right: 'calc(50% - 1px)',
          background: 'linear-gradient(180deg, rgba(254,190,16,0.1), rgba(254,190,16,0.55))',
          borderRadius: 999,
          pointerEvents: 'none',
        }}
      />
      <Stack spacing={0.4}>
        {bottomToTop.map((e) => {
          const isHome = e.team === 'home'
          const meta = EVENT_META[e.type] ?? { label: e.type, secondary: '', color: '#FEBE10', icon: <SportsSoccerIcon /> }
          const secondary: { text: string; color: string } | null =
            e.type === 'pen_missed' && e.penaltyMissCause
              ? PENALTY_MISS_LABELS[e.penaltyMissCause]
              : e.type === 'sub' && e.playerOutName
                ? { text: `بدلاً من ${e.playerOutName}`, color: '#FF8A80' }
                : e.type === 'goal' && e.assistName
                  ? { text: `صناعة ${e.assistName}`, color: '#90CAF9' }
                  : null
          const reserved = e.type === 'goal' || e.type === 'pen_scored' || e.type === 'red'

          return (
            <Box
              key={e.id}
              sx={{
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr',
                alignItems: 'center',
                gap: 1.5,
                px: 1,
                py: 0.75,
                borderRadius: 3,
                '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' },
              }}
            >
              {isHome ? (
                <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0, justifyContent: 'flex-end' }}>
                  <PlayerName text={e.playerName} secondary={secondary} align="right" />
                  <EventIcon type={e.type} icon={meta.icon} />
                  {e.type === 'red' && e.secondYellow && <SquareIcon sx={{ fontSize: 12, color: '#FDD835' }} />}
                </Stack>
              ) : (
                <Box />
              )}

              <MinutePill minute={e.minute} reserved={reserved} />

              {!isHome ? (
                <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
                  {e.type === 'red' && e.secondYellow && <SquareIcon sx={{ fontSize: 12, color: '#FDD835' }} />}
                  <EventIcon type={e.type} icon={meta.icon} />
                  <PlayerName text={e.playerName} secondary={secondary} align="left" />
                </Stack>
              ) : (
                <Box />
              )}
            </Box>
          )
        })}
      </Stack>
    </Box>
  )
}