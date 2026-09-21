import { useState } from 'react'
import {
  Alert,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material'
import type { BroadcastAudience } from '../../data/broadcast.service'
import { sendBroadcastPush } from '../../data/broadcast.service'

const AUDIENCES: { value: BroadcastAudience; label: string; color: string }[] = [
  { value: 'all', label: 'جميع المستخدمين', color: '#0057A8' },
  { value: 'barcelona', label: 'مشجعو برشلونة', color: '#A50044' },
  { value: 'realmadrid', label: 'مشجعو ريال مدريد', color: '#FEBE10' },
]

interface BroadcastPushDialogProps {
  open: boolean
  onClose: () => void
}

export default function BroadcastPushDialog({ open, onClose }: BroadcastPushDialogProps) {
  const [audience, setAudience] = useState<BroadcastAudience>('all')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  const handleClose = () => {
    if (sending) return
    setTitle('')
    setBody('')
    setError(null)
    setAudience('all')
    onClose()
  }

  const submit = async () => {
    if (!title.trim() || !body.trim()) {
      setError('العنوان والنص مطلوبان')
      return
    }
    setError(null)
    setSending(true)
    try {
      await sendBroadcastPush({ audience, title, body })
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر إرسال الإشعار — تأكد من نشر Cloud Function (sendTopicNotification)')
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>بث إشعار (Broadcast Push)</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {AUDIENCES.map((opt) => {
              const active = audience === opt.value
              return (
                <Chip
                  key={opt.value}
                  label={opt.label}
                  clickable
                  onClick={() => setAudience(opt.value)}
                  sx={{
                    fontWeight: 800,
                    fontSize: 12,
                    bgcolor: active ? `${opt.color}55` : 'rgba(255,255,255,0.06)',
                    color: active ? '#fff' : 'text.secondary',
                    border: `1px solid ${active ? opt.color : 'rgba(255,255,255,0.12)'}`,
                  }}
                />
              )
            })}
          </Stack>

          <TextField
            autoFocus
            size="small"
            label="العنوان"
            placeholder="عنوان الإشعار…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
          />

          <TextField
            size="small"
            label="النص"
            placeholder="نص الإشعار…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            fullWidth
            multiline
            minRows={3}
          />

          {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={sending} sx={{ color: 'text.secondary' }}>
          إلغاء
        </Button>
        <Button variant="contained" onClick={submit} disabled={sending} startIcon={sending ? <CircularProgress size={16} color="inherit" /> : undefined}>
          إرسال
        </Button>
      </DialogActions>
    </Dialog>
  )
}
