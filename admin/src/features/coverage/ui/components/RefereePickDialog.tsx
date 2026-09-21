import { useEffect, useState } from 'react'
import {
  Box,
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  IconButton,
  Autocomplete,
  TextField,
  Stack,
  CircularProgress,
  Chip,
  LinearProgress,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import LocalPoliceIcon from '@mui/icons-material/LocalPolice'
import SportsIcon from '@mui/icons-material/Sports'
import MonitorIcon from '@mui/icons-material/Monitor'
import type { RefereeAssignment } from '@/types'
import { REFEREE_ROLES } from '../../domain/coverage.types'

interface RefereePickDialogProps {
  open: boolean
  referees: RefereeAssignment[]
  refereeOptions: string[]
  onClose: () => void
  onConfirm: (assignments: RefereeAssignment[]) => void
}

const ACCENT = '#FF5252'
const TOTAL = REFEREE_ROLES.length

const FIELD_ROLES = REFEREE_ROLES.slice(0, 4)
const VAR_ROLES = REFEREE_ROLES.slice(4)

export default function RefereePickDialog({ open, referees, refereeOptions, onClose, onConfirm }: RefereePickDialogProps) {
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    const initial: Record<string, string> = {}
    REFEREE_ROLES.forEach((role) => {
      const found = referees.find((r) => r.role === role.label)
      initial[role.key] = found?.name ?? ''
    })
    setDraft(initial)
  }, [open, referees])

  const assignedCount = REFEREE_ROLES.filter((role) => (draft[role.key] ?? '').trim() !== '').length
  const incomplete = assignedCount < TOTAL
  const complete = assignedCount === TOTAL

  const usedNames = REFEREE_ROLES.flatMap((role) => {
    const v = (draft[role.key] ?? '').trim()
    return v ? [v] : []
  })

  const confirm = async () => {
    setSaving(true)
    try {
      const assignments: RefereeAssignment[] = REFEREE_ROLES.map((role) => ({
        role: role.label,
        name: (draft[role.key] ?? '').trim(),
      }))
      onConfirm(assignments)
    } finally {
      setSaving(false)
    }
  }

  const renderRole = (role: (typeof REFEREE_ROLES)[number], index: number) => {
    const value = (draft[role.key] ?? '').trim()
    const filled = value !== ''
    const available = refereeOptions.filter((name) => {
      if (usedNames.includes(name)) return value === name
      return true
    })
    return (
      <Box
        key={role.key}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          p: 1,
          borderRadius: 3,
          bgcolor: filled ? 'rgba(0,230,118,0.055)' : 'rgba(255,255,255,0.035)',
          border: filled ? '1px solid rgba(0,230,118,0.38)' : '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)',
          boxShadow: filled ? '0 4px 18px rgba(0,230,118,0.08)' : 'none',
          transition: 'all .18s ease',
          '&:hover': {
            borderColor: filled ? 'rgba(0,230,118,0.55)' : 'rgba(255,255,255,0.22)',
            bgcolor: filled ? 'rgba(0,230,118,0.08)' : 'rgba(255,255,255,0.05)',
          },
        }}
      >
        <Box
          sx={{
            width: 30,
            height: 30,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            fontFamily: '"Cairo", sans-serif',
            fontWeight: 800,
            fontSize: 13,
            bgcolor: filled ? 'rgba(0,230,118,0.16)' : 'rgba(255,82,82,0.14)',
            border: filled ? '1px solid rgba(0,230,118,0.5)' : '1px solid rgba(255,82,82,0.35)',
            color: filled ? '#00E676' : '#FF8A80',
          }}
        >
          {index + 1}
        </Box>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Autocomplete
            freeSolo
            options={available}
            value={value || null}
            onChange={(_, v) => setDraft((d) => ({ ...d, [role.key]: (v as string) ?? '' }))}
            onInputChange={(_, v) => setDraft((d) => ({ ...d, [role.key]: v ?? '' }))}
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                label={role.label}
                placeholder={available.length === 0 ? 'أضف حكاماً من صفحة الحكام' : 'ابحث أو اكتب اسم الحكم…'}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2.5,
                    backgroundColor: filled ? 'rgba(0,230,118,0.06)' : 'rgba(0,0,0,0.18)',
                    '& fieldset': {
                      borderColor: filled ? 'rgba(0,230,118,0.45)' : 'rgba(255,255,255,0.14)',
                    },
                    '&:hover fieldset': {
                      borderColor: filled ? 'rgba(0,230,118,0.7)' : 'rgba(255,255,255,0.3)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: filled ? '#00E676' : ACCENT,
                      borderWidth: 1.5,
                    },
                    '& .MuiAutocomplete-endAdornment': { visibility: filled ? 'hidden' : 'visible' },
                  },
                }}
                slotProps={{
                  inputLabel: {
                    sx: {
                      color: filled ? '#00E676' : 'rgba(244,247,255,0.7)',
                      fontWeight: 700,
                      '&.Mui-focused': { color: filled ? '#00E676' : ACCENT },
                    },
                  },
                }}
              />
            )}
            slotProps={{
              paper: {
                sx: {
                  bgcolor: '#0E1428',
                  border: '1px solid rgba(255,255,255,0.12)',
                  boxShadow: '0 16px 48px rgba(0,0,0,0.55)',
                  borderRadius: 2.5,
                  '& .MuiAutocomplete-option': {
                    color: '#F4F7FF',
                    borderRadius: 1.5,
                    mx: 0.5,
                    '&:hover': { bgcolor: 'rgba(255,82,82,0.16)' },
                    '&[aria-selected="true"]': { bgcolor: 'rgba(255,82,82,0.28)' },
                  },
                },
              },
            }}
          />
        </Box>
        {filled && <CheckCircleIcon sx={{ color: '#00E676', fontSize: 20, flexShrink: 0, filter: 'drop-shadow(0 0 8px rgba(0,230,118,0.45))' }} />}
      </Box>
    )
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          bgcolor: 'rgba(14,20,40,0.92)',
          backgroundImage: 'linear-gradient(180deg, #0A0E1C 0%, #0E1428 100%)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,82,82,0.22)',
          borderRadius: '24px',
          boxShadow: '0 24px 80px rgba(0,0,0,0.65), 0 0 40px rgba(255,82,82,0.08)',
          overflow: 'hidden',
        },
      }}
    >
      <Box
        sx={{
          px: 3,
          pt: 2.5,
          pb: 2,
          position: 'relative',
          background: 'linear-gradient(135deg, rgba(255,82,82,0.16) 0%, rgba(255,82,82,0.02) 55%, rgba(10,14,28,0) 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <Stack direction="row" alignItems="center" spacing={2}>
          <Box
            sx={{
              width: 50,
              height: 50,
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              background: 'linear-gradient(135deg, #FF5252, #FF1744)',
              boxShadow: '0 6px 22px rgba(255,23,68,0.45)',
              color: '#fff',
            }}
          >
            <LocalPoliceIcon sx={{ fontSize: 28 }} />
          </Box>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontFamily: '"Cairo", sans-serif', fontWeight: 800 }}>
              طاقم تحكيم المباراة
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              حكم واحد لكل دور من أدوار الطاقم الستة
            </Typography>
          </Box>
          <Chip
            size="small"
            label={`${assignedCount}/${TOTAL}`}
            sx={{
              bgcolor: complete ? 'rgba(0,230,118,0.14)' : 'rgba(255,82,82,0.16)',
              color: complete ? '#00E676' : '#FF8A80',
              fontWeight: 800,
              fontFamily: '"Cairo", sans-serif',
              border: `1px solid ${complete ? 'rgba(0,230,118,0.45)' : 'rgba(255,82,82,0.4)'}`,
            }}
          />
          <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>

        <LinearProgress
          variant="determinate"
          value={(assignedCount / TOTAL) * 100}
          sx={{
            mt: 2,
            height: 6,
            borderRadius: 3,
            bgcolor: 'rgba(255,255,255,0.08)',
            '& .MuiLinearProgress-bar': {
              borderRadius: 3,
              background: 'linear-gradient(90deg, #FF5252, #FFB300 55%, #00E676)',
              transition: 'width .35s ease',
            },
          }}
        />
      </Box>

      <DialogContent sx={{ pt: 2, pb: 1 }}>
        {refereeOptions.length === 0 && (
          <Box
            sx={{
              mb: 1.5,
              px: 1.5,
              py: 1,
              borderRadius: 2,
              fontSize: 12,
              bgcolor: 'rgba(255,82,82,0.1)',
              border: '1px dashed rgba(255,82,82,0.45)',
              color: '#FF8A80',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <LocalPoliceIcon sx={{ fontSize: 16, flexShrink: 0 }} />
            لا يوجد حكام مخزنة — أضفهم أولاً من صفحة الحكام لتتمكن من اختيارهم هنا.
          </Box>
        )}

        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.75, px: 0.5 }}>
          <SportsIcon sx={{ fontSize: 16, color: '#8EC5FF' }} />
          <Typography sx={{ fontSize: 12, fontWeight: 800, color: '#8EC5FF', letterSpacing: '0.5px' }}>
            ON-FIELD · حكام الميدان
          </Typography>
          <Box sx={{ flexGrow: 1, height: 1, bgcolor: 'rgba(255,255,255,0.1)' }} />
        </Stack>
        <Stack spacing={1}>
          {FIELD_ROLES.map((role, i) => renderRole(role, i))}
        </Stack>

        <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1.75, mb: 0.75, px: 0.5 }}>
          <MonitorIcon sx={{ fontSize: 16, color: '#4DD0E1' }} />
          <Typography sx={{ fontSize: 12, fontWeight: 800, color: '#4DD0E1', letterSpacing: '0.5px' }}>
            VAR ROOM · غرفة الفيديو
          </Typography>
          <Box sx={{ flexGrow: 1, height: 1, bgcolor: 'rgba(255,255,255,0.1)' }} />
        </Stack>
        <Stack spacing={1}>
          {VAR_ROLES.map((role, i) => renderRole(role, FIELD_ROLES.length + i))}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, gap: 1.5, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <Button onClick={onClose} sx={{ color: 'text.secondary' }} disabled={saving}>
          إلغاء
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={confirm}
          disabled={incomplete || saving}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : complete ? <CheckCircleIcon /> : undefined}
          sx={{
            minWidth: 160,
            '&.Mui-disabled': {
              background: 'rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.4)',
            },
          }}
        >
          {saving ? 'جارٍ الحفظ…' : incomplete ? `أكمل ${TOTAL - assignedCount} ${TOTAL - assignedCount === 1 ? 'دور' : 'أدوار'} متبقية` : 'تأكيد الطاقم (6/6)'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}