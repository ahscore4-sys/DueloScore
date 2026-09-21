import { Box, Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, IconButton, TextField, InputAdornment, Chip } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import SearchIcon from '@mui/icons-material/Search'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { useEffect, useMemo, useState } from 'react'

interface SearchPickDialogProps {
  open: boolean
  title: string
  subtitle?: string
  accentColor: string
  options: string[]
  selected: string[]
  onClose: () => void
  onConfirm: (selected: string[]) => void
}

export default function SearchPickDialog({ open, title, subtitle, accentColor, options, selected, onClose, onConfirm }: SearchPickDialogProps) {
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState<string[]>(selected)

  useEffect(() => {
    if (open) {
      setQuery('')
      setDraft(selected)
    }
  }, [open, selected])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => o.toLowerCase().includes(q))
  }, [options, query])

  const toggle = (value: string) => setDraft((list) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]))

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" PaperProps={{ sx: { bgcolor: '#0E1428', backgroundImage: 'none', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 3 } }}>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h6">{title}</Typography>
            {subtitle && <Typography variant="caption" sx={{ color: 'text.secondary' }}>{subtitle}</Typography>}
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}><CloseIcon fontSize="small" /></IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ pt: 1.5, pb: 1 }}>
        <TextField
          fullWidth
          size="small"
          autoFocus
          placeholder="بحث…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                </InputAdornment>
              ),
            },
          }}
          sx={{ mb: 1.5 }}
        />
        {draft.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1.5 }}>
            {draft.map((d) => (
              <Chip
                key={d}
                label={d}
                size="small"
                onDelete={() => toggle(d)}
                deleteIcon={<CloseIcon fontSize="small" sx={{ color: '#F4F7FF' }} />}
                sx={{ bgcolor: `${accentColor}22`, color: '#F4F7FF', fontWeight: 700, border: `1px solid ${accentColor}66`, '& .MuiChip-deleteIcon': { margin: '0', marginInlineStart: '2px', marginInlineEnd: '6px', width: 16, height: 16, bgcolor: `${accentColor}44`, borderRadius: '50%' } }}
              />
            ))}
          </Box>
        )}
        <Box sx={{ maxHeight: 320, overflowY: 'auto', pr: 0.5, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          {filtered.length === 0 && (
            <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 3 }}>لا توجد نتائج مطابقة</Typography>
          )}
          {filtered.map((o) => {
            const on = draft.includes(o)
            return (
              <Box
                key={o}
                onClick={() => toggle(o)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1,
                  px: 1.5,
                  py: 1,
                  borderRadius: 2,
                  cursor: 'pointer',
                  border: on ? `1px solid ${accentColor}` : '1px solid rgba(255,255,255,0.1)',
                  bgcolor: on ? `${accentColor}1A` : 'rgba(255,255,255,0.03)',
                  transition: 'all .15s ease',
                  '&:hover': { borderColor: accentColor },
                }}
              >
                <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{o}</Typography>
                {on && <CheckCircleIcon sx={{ color: accentColor, fontSize: 20 }} />}
              </Box>
            )
          })}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
        <Button onClick={onClose} sx={{ color: 'text.secondary' }}>إلغاء</Button>
        <Button variant="contained" onClick={() => onConfirm(draft)} disabled={draft.length === 0}>
          تأكيد ({draft.length})
        </Button>
      </DialogActions>
    </Dialog>
  )
}
