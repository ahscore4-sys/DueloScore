import { Box, Button, Chip, CircularProgress, Paper, Skeleton, Stack, Typography } from '@mui/material'
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone'
import type { PushNotification } from '../../domain/notifications.types'
import { formatKuwaitDateTime, statusColor, statusLabel, targetAccent, targetLabel } from '../../domain/notifications.types'

interface NotificationHistoryListProps {
  notifications: PushNotification[]
  loading: boolean
  loadingMore: boolean
  hasMore: boolean
  onLoadMore: () => void
  onSelect: (notification: PushNotification) => void
}

export default function NotificationHistoryList({
  notifications,
  loading,
  loadingMore,
  hasMore,
  onLoadMore,
  onSelect,
}: NotificationHistoryListProps) {
  if (loading) {
    return (
      <Stack spacing={1.5}>
        {[0, 1, 2, 3].map((i) => (
          <Paper key={i} sx={{ p: 2, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Skeleton variant="circular" width={38} height={38} />
              <Box sx={{ flexGrow: 1 }}>
                <Skeleton width="45%" height={22} />
                <Skeleton width="30%" height={16} />
              </Box>
            </Stack>
          </Paper>
        ))}
      </Stack>
    )
  }

  if (notifications.length === 0) {
    return (
      <Paper sx={{ p: 6, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', textAlign: 'center' }}>
        <Stack spacing={2} alignItems="center">
          <Box
            sx={{
              width: 84,
              height: 84,
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'rgba(0, 87, 168, 0.15)',
              border: '1px solid rgba(0, 87, 168, 0.4)',
              color: '#FEBE10',
            }}
          >
            <NotificationsNoneIcon sx={{ fontSize: 44 }} />
          </Box>
          <Typography variant="h5">لا توجد إشعارات بعد</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 440 }}>
            أنشئ أول إشعار ليصل إلى المستخدمين عبر إشعار فوري.
          </Typography>
        </Stack>
      </Paper>
    )
  }

  return (
    <Stack spacing={1.5}>
      {notifications.map((n) => {
        const timeLabel = n.status === 'scheduled' && n.scheduledAt !== null ? formatKuwaitDateTime(n.scheduledAt) : formatKuwaitDateTime(n.createdAt)
        return (
          <Paper
            key={n.id}
            onClick={() => onSelect(n)}
            sx={{
              p: 2,
              borderRadius: 3,
              cursor: 'pointer',
              bgcolor: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              transition: 'border-color 0.2s',
              '&:hover': { borderColor: 'rgba(0,87,168,0.5)' },
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="flex-start">
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  mt: 0.25,
                  borderRadius: 2.5,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'rgba(0,87,168,0.15)',
                  border: '1px solid rgba(0,87,168,0.35)',
                  color: '#90CAF9',
                }}
              >
                <NotificationsNoneIcon sx={{ fontSize: 20 }} />
              </Box>
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
                  <Typography sx={{ fontWeight: 800, flexGrow: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {n.title}
                  </Typography>
                  <Chip
                    size="small"
                    label={statusLabel(n.status)}
                    sx={{ fontWeight: 800, fontSize: 11, height: 19, color: statusColor(n.status), bgcolor: `${statusColor(n.status)}18`, border: `1px solid ${statusColor(n.status)}44` }}
                  />
                </Stack>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
                  {n.status === 'scheduled' ? `مجدول: ${timeLabel}` : timeLabel}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {n.body}
                </Typography>
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mt: 1 }}>
                  <Chip
                    size="small"
                    label={targetLabel(n.target)}
                    sx={{ fontWeight: 800, fontSize: 11, height: 19, color: targetAccent(n.target), bgcolor: `${targetAccent(n.target)}18`, border: `1px solid ${targetAccent(n.target)}44` }}
                  />
                  {n.status === 'sent' && (
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                      أُرسل إلى {n.stats.sentCount} جهاز
                    </Typography>
                  )}
                </Stack>
              </Box>
            </Stack>
          </Paper>
        )
      })}

      {hasMore && (
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Button
            variant="outlined"
            onClick={onLoadMore}
            disabled={loadingMore}
            startIcon={loadingMore ? <CircularProgress size={16} /> : undefined}
            sx={{ px: 4, borderColor: 'rgba(254,190,16,0.5)', color: '#FEBE10', '&:hover': { borderColor: '#FEBE10', bgcolor: 'rgba(254,190,16,0.08)' } }}
          >
            {loadingMore ? 'جارٍ التحميل…' : 'تحميل المزيد'}
          </Button>
        </Box>
      )}
    </Stack>
  )
}
