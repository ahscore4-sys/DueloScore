import { Chip } from '@mui/material'
import type { TierInfo, TierDefinition } from '../../domain/user.types'

interface TierBadgeProps {
  tier: Pick<TierDefinition, 'name' | 'color'> & Partial<Pick<TierInfo, 'progress'>>
  size?: 'small' | 'medium'
}

export default function TierBadge({ tier, size = 'small' }: TierBadgeProps) {
  return (
    <Chip
      label={tier.name}
      size={size}
      sx={{
        fontWeight: 800,
        fontSize: size === 'small' ? 11 : 13,
        bgcolor: `${tier.color}22`,
        color: tier.color,
        border: `1px solid ${tier.color}66`,
        height: size === 'small' ? 24 : 30,
      }}
    />
  )
}
