import { useState } from 'react'
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { adjustPoints } from '../../data/users.service'

interface PointsAdjustmentDialogProps {
  open: boolean
  userId: string
  userName: string
  onClose: () => void
  onAdjusted: () => void
}

export default function PointsAdjustmentDialog({ open, userId, userName, onClose, onAdjusted }: PointsAdjustmentDialogProps) {
  const [mode, setMode] = useState<'add' | 'deduct'>('add')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const reset = () => {
    setMode('add')
    setAmount('')
    setReason('')
    setError(null)
  }

  const handleClose = () => {
    if (saving) return
    reset()
    onClose()
  }

  const submit = async () => {
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0 || !Number.isInteger(value)) {
      setError('أدخل عدداً صحيحاً أكبر من صفر')
      return
    }
    if (!reason.trim()) {
      setError('السبب مطلوب')
      return
    }
    setError(null)
    setSaving(true)
    try {
      await adjustPoints({ userId, delta: mode === 'add' ? value : -value, reason })
      reset()
      onAdjusted()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر حفظ التعديل')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>تعديل النقاط — {userName}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <RadioGroup row value={mode} onChange={(e) => setMode(e.target.value as 'add' | 'deduct')}>
            <FormControlLabel value="add" control={<Radio size="small" />} label="إضافة" sx={{ '& .MuiTypography-root': { fontSize: 14 } }} />
            <FormControlLabel
              value="deduct"
              control={<Radio size="small" color="error" />}
              label="خصم"
              sx={{ '& .MuiTypography-root': { fontSize: 14 } }}
            />
          </RadioGroup>

          <TextField
            autoFocus
            type="number"
            size="small"
            label={`عدد النقاط (${mode === 'add' ? '+' : '-'})`}
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            fullWidth
          />

          <TextField
            size="small"
            label="السبب"
            placeholder="مثال: جائزة مسابقة، تصحيح رصيد…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />

          {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}

          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            يُسجل التعديل في سجل النقاط ويُعاد احتساب المرتبة تلقائياً.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={saving} sx={{ color: 'text.secondary' }}>
          إلغاء
        </Button>
        <Button
          variant="contained"
          color={mode === 'add' ? 'primary' : 'error'}
          onClick={submit}
          disabled={saving}
        >
          {mode === 'add' ? 'إضافة النقاط' : 'خصم النقاط'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
