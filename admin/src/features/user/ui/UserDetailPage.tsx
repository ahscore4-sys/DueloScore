import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import TuneIcon from '@mui/icons-material/Tune'
import CampaignIcon from '@mui/icons-material/Campaign'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import PersonOffIcon from '@mui/icons-material/PersonOff'
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1'
import AndroidIcon from '@mui/icons-material/Android'
import AppleIcon from '@mui/icons-material/Apple'
import SmartphoneIcon from '@mui/icons-material/Smartphone'
import HistoryIcon from '@mui/icons-material/History'
import GlassCard from '@/core/ui/components/GlassCard'
import LoadingOverlay from '@/core/ui/components/LoadingOverlay'
import type { AdminPermission } from '@/core/domain/types'
import { ADMIN_PERMISSIONS, permissionLabel } from '@/core/domain/types'
import { useAuth } from '@/features/auth/ui/useAuth'
import { computeTierInfo, DEFAULT_TIER_THRESHOLDS, formatPoints, teamColor, teamLabel } from '../domain/user.types'
import { revokeAdmin } from '../data/admins.service'
import { useUser, usePointsLog, useTierThresholds } from './useUser'
import { useAdminsMap } from './useAdminsMap'
import { formatDate, formatDateTime } from './formatDate'
import TierBadge from './components/TierBadge'
import TierProgressBar from './components/TierProgressBar'
import PointsAdjustmentDialog from './components/PointsAdjustmentDialog'
import AdminPermissionsDialog from './components/AdminPermissionsDialog'
import BroadcastPushDialog from './components/BroadcastPushDialog'

export default function UserDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isSuperAdmin } = useAuth()
  const { user, loading, notFound } = useUser(id)
  const { log, reload: reloadLog } = usePointsLog(id)
  const thresholdsLoaded = useTierThresholds()
  const { adminsMap, reload: reloadAdmins } = useAdminsMap()

  const [pointsOpen, setPointsOpen] = useState(false)
  const [pushOpen, setPushOpen] = useState(false)
  const [permissionsOpen, setPermissionsOpen] = useState(false)
  const [revokeOpen, setRevokeOpen] = useState(false)
  const [revoking, setRevoking] = useState(false)
  const [revokeError, setRevokeError] = useState<string | null>(null)

  if (loading) return <LoadingOverlay />

  if (!user || notFound) {
    return (
      <Paper sx={{ p: 6, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', textAlign: 'center' }}>
        <Stack spacing={2} alignItems="center">
          <Typography variant="h5">المستخدم غير موجود</Typography>
          <Button variant="outlined" onClick={() => navigate('/users')} startIcon={<ArrowBackIcon sx={{ transform: 'scaleX(-1)' }} />}>
            العودة لقائمة المستخدمين
          </Button>
        </Stack>
      </Paper>
    )
  }

  const thresholds = thresholdsLoaded.length > 0 ? thresholdsLoaded : DEFAULT_TIER_THRESHOLDS
  const tier = computeTierInfo(user.points, thresholds)
  const adminRecord = adminsMap.get(user.id)
  const targetIsSuperAdmin = adminRecord?.role === 'super_admin'

  const confirmRevoke = async () => {
    if (!user) return
    setRevoking(true)
    setRevokeError(null)
    try {
      await revokeAdmin(user.id)
      setRevokeOpen(false)
      reloadAdmins()
    } catch (err) {
      setRevokeError(err instanceof Error ? err.message : 'تعذر إبطال الإشراف — تأكد من نشر Cloud Function (revokeAdmin)')
    } finally {
      setRevoking(false)
    }
  }

  return (
    <Stack spacing={3}>
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <IconButton onClick={() => navigate('/users')} sx={{ border: '1px solid rgba(255,255,255,0.15)' }} aria-label="عودة">
          <ArrowBackIcon sx={{ transform: 'scaleX(-1)' }} />
        </IconButton>
        <Typography variant="h4">ملف المستخدم</Typography>
      </Stack>

      <Paper
        sx={{
          p: 3,
          borderRadius: 4,
          bgcolor: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.12)',
          backdropFilter: 'blur(14px)',
        }}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5} alignItems={{ xs: 'flex-start', md: 'center' }}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ flexGrow: 1, minWidth: 0 }}>
            <Avatar
              src={user.profilePicture || undefined}
              sx={{
                width: 76,
                height: 76,
                fontSize: 32,
                fontWeight: 800,
                color: '#fff',
                bgcolor: teamColor(user.favoriteTeam),
                border: `3px solid ${teamColor(user.favoriteTeam)}88`,
              }}
            >
              {user.name.trim().charAt(0) || '؟'}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Typography variant="h5">{user.name}</Typography>
                {adminRecord && (
                  <Chip
                    icon={<AdminPanelSettingsIcon />}
                    label={targetIsSuperAdmin ? 'مدير النظام العام' : 'مشرف'}
                    size="small"
                    sx={{
                      fontWeight: 800,
                      fontSize: 11,
                      bgcolor: targetIsSuperAdmin ? 'rgba(254,190,16,0.14)' : 'rgba(0,230,118,0.12)',
                      color: targetIsSuperAdmin ? '#FEBE10' : '#00E676',
                      border: `1px solid ${targetIsSuperAdmin ? 'rgba(254,190,16,0.5)' : 'rgba(0,230,118,0.4)'}`,
                    }}
                  />
                )}
              </Stack>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
                {user.email ?? 'بدون بريد إلكتروني'}
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.25 }} alignItems="center">
                <Chip
                  label={`${teamLabel(user.favoriteTeam)} · انضم ${formatDate(user.createdAt)}`}
                  size="small"
                  sx={{
                    fontWeight: 700,
                    fontSize: 11,
                    bgcolor: `${teamColor(user.favoriteTeam)}1f`,
                    color: teamColor(user.favoriteTeam),
                    border: `1px solid ${teamColor(user.favoriteTeam)}55`,
                  }}
                />
                <TierBadge tier={tier} />
                <Chip
                  label={`${formatPoints(user.points)} نقطة`}
                  size="small"
                  sx={{
                    fontWeight: 800,
                    fontSize: 11,
                    bgcolor: 'rgba(0, 230, 118, 0.12)',
                    color: '#00E676',
                    border: '1px solid rgba(0, 230, 118, 0.4)',
                  }}
                />
              </Stack>
            </Box>
          </Stack>

          <Stack direction={{ xs: 'row', md: 'column' }} spacing={1} flexWrap={{ xs: 'wrap' }} useFlexGap>
            <Button variant="outlined" size="small" startIcon={<TuneIcon />} onClick={() => setPointsOpen(true)}>
              تعديل النقاط
            </Button>
            <Button variant="outlined" size="small" startIcon={<CampaignIcon />} onClick={() => setPushOpen(true)}>
              بث إشعار
            </Button>
            {isSuperAdmin && !adminRecord && (
              <Button variant="contained" size="small" color="success" startIcon={<PersonAddAlt1Icon />} onClick={() => setPermissionsOpen(true)}>
                ترقية إلى مشرف
              </Button>
            )}
            {isSuperAdmin && adminRecord && !targetIsSuperAdmin && (
              <>
                <Button variant="contained" size="small" startIcon={<AdminPanelSettingsIcon />} onClick={() => setPermissionsOpen(true)}>
                  تعديل الصلاحيات
                </Button>
                <Button variant="outlined" size="small" color="error" startIcon={<PersonOffIcon />} onClick={() => setRevokeOpen(true)}>
                  إبطال الإشراف
                </Button>
              </>
            )}
          </Stack>
        </Stack>

        {adminRecord && adminRecord.role === 'admin' && (
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 2.5, pt: 2.5, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            {(adminRecord.permissions.length > 0 ? adminRecord.permissions : ([...ADMIN_PERMISSIONS.map((p) => p.value)] as AdminPermission[])).map((perm) => (
              <Chip
                key={perm}
                label={permissionLabel(perm)}
                size="small"
                sx={{
                  fontWeight: 700,
                  fontSize: 10,
                  height: 22,
                  bgcolor: 'rgba(0, 87, 168, 0.18)',
                  color: 'text.primary',
                  border: '1px solid rgba(0, 87, 168, 0.45)',
                }}
              />
            ))}
          </Stack>
        )}
      </Paper>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
        <GlassCard title="المرتبة والتقدم">
          <TierProgressBar tier={tier} points={user.points} thresholds={thresholds} />
        </GlassCard>

        <GlassCard
          title={`الأجهزة المسجلة (${user.devices.length})`}
          action={<SmartphoneIcon sx={{ color: 'text.secondary', fontSize: 20 }} />}
        >
          {user.devices.length === 0 ? (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              لا توجد أجهزة مسجلة لهذا المستخدم.
            </Typography>
          ) : (
            <Stack spacing={1.25}>
              {user.devices.map((device, i) => (
                <Stack key={`${device.token}-${i}`} direction="row" spacing={1.5} alignItems="center">
                  {device.platform === 'ios' ? (
                    <AppleIcon sx={{ fontSize: 22, color: 'text.primary' }} />
                  ) : (
                    <AndroidIcon sx={{ fontSize: 22, color: '#00E676' }} />
                  )}
                  <Typography
                    variant="caption"
                    sx={{
                      fontFamily: 'monospace',
                      direction: 'ltr',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flexGrow: 1,
                      color: 'text.secondary',
                    }}
                  >
                    {device.token.slice(0, 28)}…
                  </Typography>
                  <Chip label={device.platform === 'ios' ? 'iOS' : 'Android'} size="small" sx={{ fontWeight: 800, fontSize: 10, height: 22 }} />
                </Stack>
              ))}
            </Stack>
          )}
        </GlassCard>
      </Box>

      <GlassCard title="سجل النقاط" action={<HistoryIcon sx={{ color: 'text.secondary', fontSize: 20 }} />}>
        {log.length === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            لا توجد حركات نقاط بعد.
          </Typography>
        ) : (
          <Stack divider={<Box sx={{ height: 1, bgcolor: 'rgba(255,255,255,0.06)' }} />} spacing={1.5}>
            {log.map((entry) => (
              <Stack key={entry.id} direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{entry.reason || 'بدون سبب'}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {formatDateTime(entry.createdAt)}
                  </Typography>
                </Box>
                <Typography
                  sx={{
                    fontWeight: 800,
                    fontSize: 16,
                    color: entry.points >= 0 ? '#00E676' : '#FF5252',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {entry.points >= 0 ? '+' : '−'}
                  {formatPoints(Math.abs(entry.points))}
                </Typography>
              </Stack>
            ))}
          </Stack>
        )}
      </GlassCard>

      <PointsAdjustmentDialog
        open={pointsOpen}
        userId={user.id}
        userName={user.name}
        onClose={() => setPointsOpen(false)}
        onAdjusted={() => {
          setPointsOpen(false)
          reloadLog()
        }}
      />

      <BroadcastPushDialog open={pushOpen} onClose={() => setPushOpen(false)} />

      {isSuperAdmin && user && (
        <AdminPermissionsDialog
          open={permissionsOpen}
          targetUser={{ uid: user.id, name: user.name, email: user.email ?? '' }}
          existing={adminRecord ?? null}
          onClose={() => setPermissionsOpen(false)}
          onSaved={() => {
            setPermissionsOpen(false)
            reloadAdmins()
          }}
        />
      )}

      <Dialog open={revokeOpen} onClose={revoking ? undefined : () => setRevokeOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>إبطال الإشراف</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontWeight: 700, lineHeight: 1.8 }}>
            هل تريد إبطال صلاحيات «{user.name}»؟ سيفقد الوصول إلى لوحة التحكم فوراً.
          </Typography>
          {revokeError && (
            <Alert severity="error" sx={{ borderRadius: 2, mt: 2 }}>
              {revokeError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRevokeOpen(false)} disabled={revoking} sx={{ color: 'text.secondary' }}>
            إلغاء
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={confirmRevoke}
            disabled={revoking}
            startIcon={revoking ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            إبطال
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
