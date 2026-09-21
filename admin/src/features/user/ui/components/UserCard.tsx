import { Avatar, Box, Chip, Stack, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import type { AdminRecord } from '../../data/admins.service'
import type { AppUser } from '../../domain/user.types'
import { computeTierInfo, formatPoints, teamColor, teamLabel } from '../../domain/user.types'
import TierBadge from './TierBadge'

interface UserCardProps {
  user: AppUser
  thresholds: number[]
  adminRecord?: AdminRecord | null
}

export default function UserCard({ user, thresholds, adminRecord = null }: UserCardProps) {
  const navigate = useNavigate()
  const tier = computeTierInfo(user.points, thresholds)
  const initials = user.name.trim().charAt(0) || '؟'
  const isAdmin = adminRecord !== null
  const isSuperAdmin = adminRecord?.role === 'super_admin'

  return (
    <Box
      onClick={() => navigate(`/users/${user.id}`)}
      sx={{
        p: 2.5,
        borderRadius: 4,
        bgcolor: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
        cursor: 'pointer',
        transition: 'border-color 0.15s ease, transform 0.15s ease',
        '&:hover': { borderColor: 'rgba(254,190,16,0.45)', transform: 'translateY(-2px)' },
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Avatar
          src={user.profilePicture || undefined}
          sx={{
            width: 52,
            height: 52,
            fontSize: 22,
            fontWeight: 800,
            color: '#fff',
            bgcolor: teamColor(user.favoriteTeam),
            border: `2px solid ${teamColor(user.favoriteTeam)}88`,
          }}
        >
          {initials}
        </Avatar>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Typography sx={{ fontWeight: 800, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.name}
            </Typography>
            {isAdmin && (
              <AdminPanelSettingsIcon
                sx={{ fontSize: 16, flexShrink: 0, color: isSuperAdmin ? '#FEBE10' : '#00E676' }}
              />
            )}
            {isAdmin && (
              <Chip
                label={isSuperAdmin ? 'مدير النظام' : 'مدير'}
                size="small"
                sx={{
                  height: 20,
                  fontWeight: 800,
                  fontSize: 10,
                  flexShrink: 0,
                  bgcolor: isSuperAdmin ? 'rgba(254,190,16,0.15)' : 'rgba(0,230,118,0.12)',
                  color: isSuperAdmin ? '#FEBE10' : '#00E676',
                  border: `1px solid ${isSuperAdmin ? 'rgba(254,190,16,0.5)' : 'rgba(0,230,118,0.4)'}`,
                  '& .MuiChip-label': { px: 1 },
                }}
              />
            )}
          </Stack>
          <Typography variant="caption" noWrap sx={{ color: 'text.secondary', display: 'block' }}>
            {user.email ?? 'بدون بريد إلكتروني'}
          </Typography>
        </Box>
        <TierBadge tier={tier} />
      </Stack>

      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
        <Chip
          label={teamLabel(user.favoriteTeam)}
          size="small"
          sx={{
            fontWeight: 700,
            fontSize: 11,
            height: 24,
            bgcolor: `${teamColor(user.favoriteTeam)}1f`,
            color: teamColor(user.favoriteTeam),
            border: `1px solid ${teamColor(user.favoriteTeam)}55`,
          }}
        />
        <Chip
          label={`${formatPoints(user.points)} نقطة`}
          size="small"
          sx={{
            fontWeight: 800,
            fontSize: 11,
            height: 24,
            bgcolor: 'rgba(0, 230, 118, 0.12)',
            color: '#00E676',
            border: '1px solid rgba(0, 230, 118, 0.4)',
          }}
        />
      </Stack>
    </Box>
  )
}
