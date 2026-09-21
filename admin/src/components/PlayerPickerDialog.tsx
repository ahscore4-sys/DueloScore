import { Box, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Typography, Avatar, Chip, IconButton, Tooltip } from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CloseIcon from '@mui/icons-material/Close'
import { useEffect, useMemo, useState } from 'react'
import type { Player } from '../types'

const statusLabel: Record<string, string> = { booked: 'إنذار', subbed: 'مستبدل', off: 'خارج الملعب' }

interface PlayerPickerDialogProps {
  open: boolean
  title: string
  subtitle: string
  players: Player[]
  selected: string[]
  excluded: string[]
  limit?: number
  requireGK?: boolean
  selectedLast?: boolean
  belongsTo?: { label: string; ids: string[] }[]
  onClose: () => void
  onConfirm: (ids: string[]) => void
}

export default function PlayerPickerDialog({ open, title, subtitle, players, selected, excluded, limit, requireGK, selectedLast, belongsTo, onClose, onConfirm }: PlayerPickerDialogProps) {
  const [draft, setDraft] = useState<string[]>(selected)
  const [q, setQ] = useState('')

  useEffect(() => {
    if (open) {
      setDraft(selected)
      setQ('')
    }
  }, [open, selected])

  const excludedSet = useMemo(() => new Set(excluded), [excluded])
  const draftSet = new Set(draft)

  const listOf = useMemo(() => {
    const map = new Map<string, string>()
    belongsTo?.forEach(({ label, ids }) => ids.forEach((id) => { if (!map.has(id)) map.set(id, label) }))
    return map
  }, [belongsTo])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const list = players.filter(
      (p) => !needle || p.name.toLowerCase().includes(needle) || p.position.toLowerCase().includes(needle) || String(p.number).includes(needle),
    )
    if (!selectedLast) return list
    const sel = new Set(draft)
    const tier = (p: Player) => (sel.has(p.id) ? 0 : excludedSet.has(p.id) ? 2 : 1)
    return [...list].sort((a, b) => tier(a) - tier(b))
  }, [players, q, draft, selectedLast, excludedSet])

  const gkCount = draft.filter((id) => players.find((p) => p.id === id)?.position === 'حارس').length
  const limitReached = limit ? draft.length === limit : false
  const valid = (!requireGK || gkCount === 1) && (!limit || limitReached)

  const toggle = (p: Player) => {
    if (excludedSet.has(p.id)) return
    if (draftSet.has(p.id)) {
      setDraft((d) => d.filter((id) => id !== p.id))
      return
    }
    if (limit && draft.length >= limit) return
    setDraft((d) => [...d, p.id])
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" PaperProps={{ sx: { bgcolor: '#0E1428', backgroundImage: 'none', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 3 } }}>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Box>
            <Typography variant="h6">{title}</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>{subtitle}</Typography>
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}><CloseIcon fontSize="small" /></IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ pt: 1.5 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="بحث بالاسم أو الرقم…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          slotProps={{ input: { startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} /> } }}
          sx={{ mb: 1.5 }}
        />
        <Box sx={{ maxHeight: 360, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0.75, pr: 0.25 }}>
          {filtered.map((p) => {
            const isSelected = draftSet.has(p.id)
            const isExcluded = excludedSet.has(p.id)
            return (
              <Tooltip key={p.id} title={isExcluded ? 'مُختار بالفعل في قائمة أخرى' : ''} arrow>
                <Box
                  onClick={() => toggle(p)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    p: 1,
                    borderRadius: 2,
                    border: isSelected ? '1px solid #FEBE10' : '1px solid rgba(255,255,255,0.08)',
                    bgcolor: isSelected ? 'rgba(254,190,16,0.08)' : 'rgba(255,255,255,0.04)',
                    opacity: isExcluded ? 0.35 : 1,
                    cursor: isExcluded ? 'not-allowed' : 'pointer',
                    transition: 'all .15s ease',
                  }}
                >
                  <Avatar src={p.imageUrl} sx={{ width: 32, height: 32, fontSize: 13, fontWeight: 800, bgcolor: isSelected ? '#FEBE10' : 'rgba(0,87,168,0.5)', color: isSelected ? '#1A1400' : '#fff' }}>{p.number}</Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.name}
                      {listOf.has(p.id) && (
                        <Box component="span" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: 12 }}> ({listOf.get(p.id)})</Box>
                      )}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {p.position === 'حارس' && (
                        <Typography variant="caption" sx={{ color: '#FEBE10', fontWeight: 700 }}>حارس</Typography>
                      )}
                      {p.status && <Chip size="small" label={statusLabel[p.status]} sx={{ height: 18, fontSize: 10, color: 'text.secondary', bgcolor: 'rgba(255,255,255,0.08)' }} />}
                    </Box>
                  </Box>
                  <CheckCircleIcon sx={{ color: isSelected ? '#00E676' : 'rgba(255,255,255,0.2)', fontSize: 22 }} />
                </Box>
              </Tooltip>
            )
          })}
          {filtered.length === 0 && (
            <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>لا توجد نتائج مطابقة</Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, pt: 1, justifyContent: 'space-between' }}>
        <Typography variant="body2" sx={{ color: requireGK && gkCount !== 1 ? '#FF5252' : 'text.secondary', fontWeight: 700 }}>
          {requireGK && gkCount !== 1 ? 'يجب اختيار حارس مرمى واحد' : limit ? `${draft.length}/${limit}` : `${draft.length} لاعب`}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button onClick={onClose} sx={{ color: 'text.secondary' }}>إلغاء</Button>
          <Button variant="contained" disabled={!valid} onClick={() => onConfirm(draft)}>تأكيد</Button>
        </Box>
      </DialogActions>
    </Dialog>
  )
}
