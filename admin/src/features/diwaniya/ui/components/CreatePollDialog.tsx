import { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  TextField,
  Typography,
  IconButton,
  CircularProgress,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import type { Dayjs } from 'dayjs'
import { LocalizationProvider } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import 'dayjs/locale/ar'
import { saveDiwaniyaPoll } from '../../data/diwaniya.service'
import { useAuth } from '@/features/auth/ui/useAuth'

interface CreatePollDialogProps {
  open: boolean
  onClose: () => void
  onCreated: (postId: string) => void
}

const MIN_OPTIONS = 2
const MAX_OPTIONS = 4

export default function CreatePollDialog({ open, onClose, onCreated }: CreatePollDialogProps) {
  const { user, adminDoc } = useAuth()
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState<string[]>(['', ''])
  const [endsAt, setEndsAt] = useState<Dayjs | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const filledOptions = options.map((o) => o.trim()).filter(Boolean)
  const questionError = question.trim() ? '' : 'اكتب نص المنشور'
  const optionsError =
    options.some((o) => o.trim().length > 0) && filledOptions.length < MIN_OPTIONS ? `أدخل ${MIN_OPTIONS} خيارات على الأقل` : ''
  const endsInPast = endsAt !== null && endsAt.valueOf() <= Date.now()
  const canSubmit = Boolean(question.trim()) && filledOptions.length >= MIN_OPTIONS && !endsInPast && !saving

  const reset = () => {
    setQuestion('')
    setOptions(['', ''])
    setEndsAt(null)
    setPickerOpen(false)
    setSaving(false)
  }

  const handleClose = () => {
    if (saving) return
    reset()
    onClose()
  }

  const setOption = (index: number, value: string) => {
    setOptions((prev) => prev.map((o, i) => (i === index ? value : o)))
  }

  const moveOption = (index: number, direction: -1 | 1) => {
    setOptions((prev) => {
      const next = [...prev]
      const target = index + direction
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  const addOption = () => {
    setOptions((prev) => (prev.length < MAX_OPTIONS ? [...prev, ''] : prev))
  }

  const removeOption = (index: number) => {
    setOptions((prev) => (prev.length > MIN_OPTIONS ? prev.filter((_, i) => i !== index) : prev))
  }

  const submit = async () => {
    if (!canSubmit || !user || !adminDoc) return
    setSaving(true)
    try {
      const postId = await saveDiwaniyaPoll({
        question: question.trim(),
        options: filledOptions,
        endsAtMs: endsAt ? endsAt.valueOf() : null,
        admin: { uid: user.uid, name: adminDoc.name },
      })
      reset()
      onCreated(postId)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>إنشاء منشور جدلي (Create Post)</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <TextField
            label="المنشور"
            placeholder="اكتب السؤال أو النقاش الذي تريد طرحه على المشجعين…"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            error={Boolean(questionError)}
            helperText={questionError}
            fullWidth
            multiline
            minRows={2}
          />

          <Stack spacing={1}>
            <Typography sx={{ fontWeight: 800, fontSize: 13, color: 'text.secondary' }}>
              الخيارات ({filledOptions.length}/{MAX_OPTIONS})
            </Typography>
            {options.map((opt, i) => (
              <Stack key={i} direction="row" alignItems="center" spacing={0.5}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder={`الخيار ${i + 1}`}
                  value={opt}
                  onChange={(e) => setOption(i, e.target.value)}
                />
                <IconButton size="small" onClick={() => moveOption(i, -1)} disabled={i === 0} sx={{ color: '#90CAF9' }}>
                  <ArrowUpwardIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={() => moveOption(i, 1)} disabled={i === options.length - 1} sx={{ color: '#90CAF9' }}>
                  <ArrowDownwardIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={() => removeOption(i)} disabled={options.length <= MIN_OPTIONS} sx={{ color: '#FF1744' }}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Stack>
            ))}
            {optionsError && (
              <Typography variant="caption" sx={{ color: '#FF8A80', fontWeight: 700 }}>
                {optionsError}
              </Typography>
            )}
            {options.length < MAX_OPTIONS && (
              <Button startIcon={<AddIcon />} onClick={addOption} sx={{ alignSelf: 'flex-start', color: '#FEBE10' }}>
                إضافة خيار
              </Button>
            )}
          </Stack>

          <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ar">
            <Stack direction="row" alignItems="center" spacing={1}>
              <DateTimePicker
                open={pickerOpen}
                onOpen={() => setPickerOpen(true)}
                onClose={() => setPickerOpen(false)}
                value={endsAt}
                onChange={(v) => {
                  setEndsAt(v)
                  if (v) setPickerOpen(false)
                }}
                slotProps={{
                  textField: {
                    size: 'small',
                    fullWidth: true,
                    placeholder: 'موعد انتهاء التصويت (اختياري)',
                    onClick: () => setPickerOpen(true),
                  },
                  actionBar: { actions: ['cancel', 'clear', 'accept'] },
                  desktopPaper: { sx: { bgcolor: '#0B1020', backgroundImage: 'none', border: '1px solid rgba(255,255,255,0.14)' } },
                  dialog: { sx: { '& .MuiPaper-root': { bgcolor: '#0B1020', backgroundImage: 'none' } } },
                }}
              />
              {endsAt && (
                <Button size="small" onClick={() => setEndsAt(null)} sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                  مسح
                </Button>
              )}
            </Stack>
          </LocalizationProvider>
          {endsInPast && (
            <Typography variant="caption" sx={{ color: '#FF8A80', fontWeight: 700, mt: -1.5 }}>
              موعد الانتهاء يجب أن يكون في المستقبل
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={saving} sx={{ color: 'text.secondary' }}>
          إلغاء
        </Button>
        <Button variant="contained" onClick={submit} disabled={!canSubmit} startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}>
          نشر المنشور
        </Button>
      </DialogActions>
    </Dialog>
  )
}
