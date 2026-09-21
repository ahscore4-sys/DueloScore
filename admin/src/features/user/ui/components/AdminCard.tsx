import { Avatar, Box, Chip, Stack, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import { permissionLabel } from '@/core/domain/types'
import type { AdminRecord } from '../../data/admins.service'

interface AdminCardProps {
  admin: AdminRecord
}

export default function AdminCard({ admin }: AdminCardProps) {
  const navigate = useNavigate()
  const initials = admin.name.trim().charAt(0) || '؟'
  const isSuperAdmin = admin.role === 'super_admin'

  return (
    <Box
      onClick={() => navigate(`/users/${admin.uid}`)}
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
          sx={{
            width: 52,
            height: 52,
            fontSize: 22,
            fontWeight: 800,
            color: '#fff',
            bgcolor: isSuperAdmin ? '#FEBE10' : '#00E676',
            border: `2px solid ${isSuperAdmin ? '#FEBE10' : '#00E676'}88`,
          }}
        >
          {initials}
        </Avatar>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Typography sx={{ fontWeight: 800, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {admin.name}
            </Typography>
            <AdminPanelSettingsIcon
              sx={{ fontSize: 16, flexShrink: 0, color: isSuperAdmin ? '#FEBE10' : '#00E676' }}
            />
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
          </Stack>
          <Typography variant="caption" noWrap sx={{ color: 'text.secondary', display: 'block' }}>
            {admin.email || 'بدون بريد إلكتروني'}
          </Typography>
        </Box>
      </Stack>

      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
        {admin.permissions.length > 0 ? (
          admin.permissions.slice(0, 4).map((p) => (
            <Chip
              key={p}
              label={permissionLabel(p)}
              size="small"
              sx={{
                fontWeight: 700,
                fontSize: 11,
                height: 24,
                bgcolor: 'rgba(0,87,168,0.15)',
                color: '#7CB7FF',
                border: '1px solid rgba(0,87,168,0.45)',
              }}
            />
          ))
        ) : (
          <Chip
            label="بدون صلاحيات"
            size="small"
            sx={{ fontWeight: 700, fontSize: 11, height: 24, bgcolor: 'rgba(255,82,82,0.12)', color: '#FF5252', border: '1px solid rgba(255,82,82,0.4)' }}
          />
        )}
        {admin.permissions.length > 4 && (
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
            +{admin.permissions.length - 4}
          </Typography>
        )}
      </Stack>
    </Box>
  )
}
