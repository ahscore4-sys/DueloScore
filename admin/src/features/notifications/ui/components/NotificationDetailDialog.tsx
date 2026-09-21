import { Alert, Box, Chip, Dialog, DialogContent, DialogTitle, Divider, Stack, Typography } from '@mui/material'
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive'
import type { PushNotification } from '../../domain/notifications.types'
import { formatKuwaitDateTime, statusColor, statusLabel, targetAccent, targetLabel } from '../../domain/notifications.types'

interface NotificationDetailDialogProps {
  notification: PushNotification | null
  onClose: () => void
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" justifyContent="space-between" spacing={2}>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'right' }}>{value}</Typography>
    </Stack>
  )
}

export default function NotificationDetailDialog({ notification, onClose }: NotificationDetailDialogProps) {
  const n = notification

  return (
    <Dialog open={n !== null} onClose={onClose} maxWidth="xs" fullWidth>
      {n && (
        <>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,87,168,0.2)', border: '1px solid rgba(0,87,168,0.4)', color: '#90CAF9', flexShrink: 0 }}>
              <NotificationsActiveIcon />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>تفاصيل الإشعار</Typography>
              <Chip
                size="small"
                label={statusLabel(n.status)}
                sx={{ fontWeight: 800, fontSize: 11, height: 19, color: statusColor(n.status), bgcolor: `${statusColor(n.status)}18`, border: `1px solid ${statusColor(n.status)}44` }}
              />
            </Box>
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2.5}>
              {n.imageUrl && (
                <Box
                  component="img"
                  src={n.imageUrl}
                  alt={n.title}
                  sx={{ width: '100%', borderRadius: 3, maxHeight: 180, objectFit: 'cover' }}
                />
              )}

              <Box>
                <Typography sx={{ fontWeight: 800, fontSize: 18 }}>{n.title}</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'pre-wrap', mt: 0.5 }}>
                  {n.body}
                </Typography>
              </Box>

              <Divider />

              <Stack spacing={1.5}>
                <InfoRow label="الجمهور المستهدف" value={targetLabel(n.target)} />
                {n.deepLink && <InfoRow label="الرابط العميق" value={n.deepLink} />}
                <InfoRow
                  label="وقت الإنشاء"
                  value={formatKuwaitDateTime(n.createdAt)}
                />
                {n.scheduledAt !== null && n.status === 'scheduled' && (
                  <InfoRow label="مجدول عند" value={formatKuwaitDateTime(n.scheduledAt)} />
                )}
                {n.sentAt !== null && (
                  <InfoRow label="وقت الإرسال" value={formatKuwaitDateTime(n.sentAt)} />
                )}
                <InfoRow label="تم إرساله" value={`${n.stats.sentCount}`} />
                {n.createdBy && <InfoRow label="أُنشئ بواسطة" value={n.createdBy} />}
              </Stack>

              {n.status === 'failed' && (
                <Alert severity="error" sx={{ borderRadius: 2 }}>فشل إرسال هذا الإشعار. حاول مرة أخرى.</Alert>
              )}

              <Chip
                label={targetLabel(n.target)}
                size="small"
                sx={{ alignSelf: 'flex-start', fontWeight: 800, fontSize: 11, height: 20, color: targetAccent(n.target), bgcolor: `${targetAccent(n.target)}18`, border: `1px solid ${targetAccent(n.target)}44` }}
              />
            </Stack>
          </DialogContent>
        </>
      )}
    </Dialog>
  )
}
