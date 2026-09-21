import { Box, Chip, Typography } from '@mui/material'
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'
import type { MatchStatus } from '../types'
import { matchStatusLabel } from '../lib/matchStatus'

interface Props {
  status: MatchStatus
  minute?: string
  fixedWidth?: number
}

const style: Record<MatchStatus, { color: string; bg: string; live?: boolean }> = {
  not_started: { color: '#B0BEC5', bg: 'rgba(176, 190, 197, 0.12)' },
  first_half: { color: '#00E676', bg: 'rgba(0, 230, 118, 0.12)', live: true },
  half_time: { color: '#FEBE10', bg: 'rgba(254, 190, 16, 0.12)' },
  second_half: { color: '#00E676', bg: 'rgba(0, 230, 118, 0.12)', live: true },
  full_time: { color: '#90A4AE', bg: 'rgba(144, 164, 174, 0.12)' },
  extra_first_half: { color: '#00E676', bg: 'rgba(0, 230, 118, 0.12)', live: true },
  extra_second_half: { color: '#00E676', bg: 'rgba(0, 230, 118, 0.12)', live: true },
  penalties: { color: '#FEBE10', bg: 'rgba(254, 190, 16, 0.12)', live: true },
  final: { color: '#90A4AE', bg: 'rgba(144, 164, 174, 0.12)' },
}

export default function MatchStatusBadge({ status, minute, fixedWidth }: Props) {
  const s = style[status]
  const label = matchStatusLabel[status] + (minute && s.live ? ` — ${minute}'` : '')
  return (
    <Chip
      size="small"
      label={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          {s.live && <FiberManualRecordIcon sx={{ fontSize: 12, color: s.color, display: 'flex' }} />}
          <Typography component="span" sx={{ fontSize: 12, fontWeight: 700, color: s.color }}>
            {label}
          </Typography>
        </Box>
      }
      sx={{
        bgcolor: s.bg,
        color: s.color,
        fontWeight: 700,
        border: `1px solid ${s.color}33`,
        ...(fixedWidth ? { width: fixedWidth, justifyContent: 'center' } : {}),
      }}
    />
  )
}
