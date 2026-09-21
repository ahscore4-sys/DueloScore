import { useEffect, useState } from 'react'
import { Box, Stack, Typography } from '@mui/material'
import type { CoverageMatch } from '../../domain/coverageMatches.types'

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export default function CoverageMatchClock({ match, size = 'lg' }: { match: CoverageMatch; size?: 'lg' | 'sm' }) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const live = match.status === 'in_progress'
  const upcoming = match.status === 'not_started'
  const finished = match.status === 'finished'

  const elapsedMin =
    match.apiElapsed ?? (match.timestamp ? Math.max(0, Math.floor((now - match.timestamp) / 60000)) : 0)

  const big = size === 'lg'

  if (live) {
    return (
      <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.8}>
        <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: '#00E676', boxShadow: '0 0 12px rgba(0,230,118,0.9)', animation: 'livePulse 1.6s ease-in-out infinite' }} />
        <Typography
          sx={{
            fontFamily: '"Cairo", sans-serif',
            fontWeight: 900,
            fontSize: big ? 30 : 22,
            lineHeight: 1,
            color: '#00E676',
            textShadow: '0 0 22px rgba(0,230,118,0.5)',
          }}
        >
          {elapsedMin}′
        </Typography>
        {match.apiExtra != null && match.apiExtra > 0 && (
          <Typography sx={{ fontFamily: '"Cairo", sans-serif', fontWeight: 900, fontSize: big ? 17 : 13, color: '#FFEB3B' }}>
            +{match.apiExtra}
          </Typography>
        )}
        {big && (
          <Typography sx={{ fontSize: 11, color: 'rgba(244,247,255,0.75)', fontWeight: 800 }}>
            دقيقة من زمن المباراة
          </Typography>
        )}
      </Stack>
    )
  }

  if (upcoming && match.timestamp) {
    const diff = match.timestamp - now
    if (diff > 0) {
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      return (
        <Stack alignItems="center" spacing={0.2}>
          <Typography
            sx={{
              fontFamily: '"Cairo", sans-serif',
              fontWeight: 900,
              fontSize: big ? 24 : 17,
              lineHeight: 1,
              color: '#FEBE10',
              textShadow: '0 0 18px rgba(254,190,16,0.35)',
              letterSpacing: 1,
              direction: 'ltr',
            }}
          >
            {pad(h)}:{pad(m)}:{pad(s)}
          </Typography>
          {big && (
            <Typography sx={{ fontSize: 11, color: 'rgba(244,247,255,0.75)', fontWeight: 800 }}>
              حتى انطلاق المباراة
            </Typography>
          )}
        </Stack>
      )
    }
    return (
      <Typography sx={{ fontWeight: 900, fontSize: big ? 14 : 12, color: '#FEBE10' }}>
        تبدأ المباراة الآن
      </Typography>
    )
  }

  if (finished) {
    return (
      <Typography sx={{ fontFamily: '"Cairo", sans-serif', fontWeight: 900, fontSize: big ? 15 : 12.5, color: 'rgba(244,247,255,0.65)' }}>
        انتهت المباراة
      </Typography>
    )
  }

  return null
}