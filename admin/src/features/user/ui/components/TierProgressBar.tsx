import { Box, LinearProgress, Stack, Typography } from '@mui/material'
import type { TierInfo } from '../../domain/user.types'
import { formatPoints } from '../../domain/user.types'

interface TierProgressBarProps {
  tier: TierInfo
  points: number
  thresholds: number[]
}

export default function TierProgressBar({ tier, points, thresholds }: TierProgressBarProps) {
  const nextThreshold = tier.nextThreshold

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" alignItems="baseline" justifyContent="space-between">
        <Typography sx={{ fontWeight: 800, fontSize: 15, color: tier.color }}>
          {tier.name}
        </Typography>
        <Typography sx={{ fontWeight: 800, fontSize: 18 }}>
          {formatPoints(points)} <span style={{ fontSize: 12, fontWeight: 400, opacity: 0.7 }}>نقطة</span>
        </Typography>
      </Stack>

      <Box sx={{ position: 'relative' }}>
        <LinearProgress
          variant="determinate"
          value={tier.progress}
          sx={{
            height: 10,
            borderRadius: 5,
            bgcolor: 'rgba(255,255,255,0.08)',
            '& .MuiLinearProgress-bar': {
              borderRadius: 5,
              background: `linear-gradient(90deg, ${tier.color}88, ${tier.color})`,
            },
          }}
        />
      </Box>

      <Stack direction="row" justifyContent="space-between">
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          الحد الأدنى: {formatPoints(tier.currentThreshold)}
        </Typography>
        {nextThreshold !== null ? (
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
            متبقٍ {formatPoints(nextThreshold - points)} نقطة للمرتبة التالية ({tier.progress}%)
          </Typography>
        ) : (
          <Typography variant="caption" sx={{ color: '#00E676', fontWeight: 800 }}>
            أعلى مرتبة تم تحقيقها
          </Typography>
        )}
      </Stack>

      <Stack direction="row" spacing={0.5}>
        {thresholds.map((t, i) => (
          <Box
            key={i}
            title={`${t}`}
            sx={{
              flexGrow: 1,
              height: 4,
              borderRadius: 2,
              bgcolor: i <= tier.index ? tier.color : 'rgba(255,255,255,0.12)',
              transition: 'background-color 0.3s ease',
            }}
          />
        ))}
      </Stack>
    </Stack>
  )
}
