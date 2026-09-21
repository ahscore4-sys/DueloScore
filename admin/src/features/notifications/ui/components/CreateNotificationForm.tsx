import { useState } from 'react'
import { Alert, Box, Button, Chip, CircularProgress, Paper, Stack, TextField, Typography } from '@mui/material'
import type { NotificationTarget } from '../../domain/notifications.types'
import { NOTIFICATION_TARGETS, targetAccent } from '../../domain/notifications.types'
import { createNotification } from '../../data/notifications.service'
import { useAuth } from '@/features/auth/ui/useAuth'
import ConfirmDialog from '@/core/ui/components/ConfirmDialog'

interface CreateNotificationFormProps {
  onCreated: () => void
}

export default function CreateNotificationForm({ onCreated }: CreateNotificationFormProps) {
  const { adminDoc } = useAuth()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [deepLink, setDeepLink] = useState('')
  const [target, setTarget] = useState<NotificationTarget>('all')
  const [sendNow, setSendNow] = useState(true)
  const [scheduleValue, setScheduleValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const reset = () => {
    setTitle('')
    setBody('')
    setImageUrl('')
    setDeepLink('')
    setTarget('all')
    setSendNow(true)
    setScheduleValue('')
  }

  const validate = (): string | null => {
    if (!title.trim()) return 'العنوان مطلوب'
    if (!body.trim()) return 'النص مطلوب'
    if (!sendNow && !scheduleValue) return 'يرجى اختيار موعد الإرسال'
    if (!sendNow && new Date(scheduleValue).getTime() <= Date.now()) return 'وقت الإرسال يجب أن يكون في المستقبل'
    return null
  }

  const handleSubmitClick = () => {
    const err = validate()
    if (err) {
      setError(err)
      return
    }
    setError(null)
    setConfirmOpen(true)
  }

  const confirmSend = async () => {
    setSubmitting(true)
    setConfirmOpen(false)
    try {
      await createNotification({
        title,
        body,
        imageUrl,
        target,
        deepLink,
        scheduleAt: sendNow ? null : new Date(scheduleValue).getTime(),
        createdBy: adminDoc?.name ?? '',
      })
      reset()
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر حفظ الإشعار — تأكد من نشر Cloud Function (sendPushNotification)')
    } finally {
      setSubmitting(false)
    }
  }

  const confirmMessage = sendNow
    ? `سيتم إرسال هذا الإشعار فوراً إلى ${NOTIFICATION_TARGETS.find((t) => t.value === target)?.label}. هل تريد المتابعة؟`
    : `سيتم جدولة هذا الإشعار وإرساله إلى ${NOTIFICATION_TARGETS.find((t) => t.value === target)?.label} في الموعد المحدد.`

  return (
    <Stack spacing={2.5}>
      <Paper sx={{ p: 3, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(14px)' }}>
        <Stack spacing={2.5}>
          <Stack spacing={1}>
            <Typography sx={{ fontWeight: 800, fontSize: 13, color: 'text.secondary' }}>الجمهور المستهدف (Target)</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {NOTIFICATION_TARGETS.map((opt) => {
                const active = target === opt.value
                const color = targetAccent(opt.value)
                return (
                  <Chip
                    key={opt.value}
                    label={opt.label}
                    clickable
                    onClick={() => setTarget(opt.value)}
                    sx={{
                      fontWeight: 800,
                      bgcolor: active ? `${color}55` : 'rgba(255,255,255,0.06)',
                      color: active ? '#fff' : 'text.secondary',
                      border: active ? `1px solid ${color}` : '1px solid rgba(255,255,255,0.12)',
                    }}
                  />
                )
              })}
            </Stack>
          </Stack>

          <TextField
            size="small"
            label="العنوان"
            placeholder="عنوان الإشعار…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
            required
          />

          <TextField
            size="small"
            label="النص"
            placeholder="نص الإشعار…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            fullWidth
            multiline
            minRows={4}
            required
          />

          <TextField
            size="small"
            label="رابط الصورة (اختياري)"
            placeholder="https://…"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            fullWidth
            dir="ltr"
          />

          <TextField
            size="small"
            label="الرابط العميق (اختياري)"
            placeholder="https://… أو deep-link://…"
            value={deepLink}
            onChange={(e) => setDeepLink(e.target.value)}
            fullWidth
            dir="ltr"
          />

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip
              label="إرسال الآن"
              clickable
              onClick={() => setSendNow(true)}
              sx={{
                fontWeight: 800,
                bgcolor: sendNow ? 'rgba(0,87,168,0.35)' : 'rgba(255,255,255,0.06)',
                color: sendNow ? '#fff' : 'text.secondary',
                border: sendNow ? '1px solid rgba(0,87,168,0.7)' : '1px solid rgba(255,255,255,0.12)',
              }}
            />
            <Chip
              label="جدولة لاحقاً"
              clickable
              onClick={() => setSendNow(false)}
              sx={{
                fontWeight: 800,
                bgcolor: !sendNow ? 'rgba(254,190,16,0.2)' : 'rgba(255,255,255,0.06)',
                color: !sendNow ? '#fff' : 'text.secondary',
                border: !sendNow ? '1px solid rgba(254,190,16,0.6)' : '1px solid rgba(255,255,255,0.12)',
              }}
            />
          </Stack>

          {!sendNow && (
            <TextField
              size="small"
              type="datetime-local"
              label="موعد الإرسال"
              value={scheduleValue}
              onChange={(e) => setScheduleValue(e.target.value)}
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
          )}

          {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}

          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              onClick={handleSubmitClick}
              disabled={submitting}
              startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : undefined}
              sx={{ px: 4, background: 'linear-gradient(135deg, #00E676, #00C853)', color: '#062A16', '&:hover': { background: 'linear-gradient(135deg, #00E676, #00A84C)' } }}
            >
              {sendNow ? 'إرسال' : 'حفظ وجدولة'}
            </Button>
          </Box>
        </Stack>
      </Paper>

      <ConfirmDialog
        open={confirmOpen}
        title={sendNow ? 'تأكيد الإرسال (Send Confirmation)' : 'تأكيد الجدولة'}
        message={confirmMessage}
        confirmLabel={sendNow ? 'إرسال' : 'جدولة'}
        loading={submitting}
        onConfirm={confirmSend}
        onClose={() => {
          if (!submitting) setConfirmOpen(false)
        }}
      />
    </Stack>
  )
}
