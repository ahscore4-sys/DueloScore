import { Box, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Typography, Avatar, Chip, IconButton, Tooltip } from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import CloseIcon from '@mui/icons-material/Close'
import { useEffect, useMemo, useState } from 'react'
import type { Player } from '../types'

export interface AbsentSelection {
  injured: string[]
  suspended: string[]
}

interface AbsentPlayersDialogProps {
  open: boolean
  title: string
  subtitle: string
  players: Player[]
  injured: string[]
  suspended: string[]
  excluded: string[]
  belongsTo?: { label: string; ids: string[] }[]
  onClose: () => void
  onConfirm: (selection: AbsentSelection) => void
}

type AbsenceCategory = 'injured' | 'suspended'

const categoryMeta: Record<AbsenceCategory, { label: string; chipColor: string; dot: string }> = {
  injured: { label: 'مصاب', chipColor: '#FF8A80', dot: '#FF5252' },
  suspended: { label: 'موقوف', chipColor: '#FFB300', dot: '#FFB300' },
}

export default function AbsentPlayersDialog({
  open,
  title,
  subtitle,
  players,
  injured,
  suspended,
  excluded,
  belongsTo,
  onClose,
  onConfirm,
}: AbsentPlayersDialogProps) {
  const [draftInjured, setDraftInjured] = useState<string[]>(injured)
  const [draftSuspended, setDraftSuspended] = useState<string[]>(suspended)
  const [category, setCategory] = useState<AbsenceCategory>('injured')
  const [q, setQ] = useState('')

  useEffect(() => {
    if (open) {
      setDraftInjured(injured)
      setDraftSuspended(suspended)
      setQ('')
    }
  }, [open, injured, suspended])

  const excludedSet = useMemo(() => new Set(excluded), [excluded])
  const injuredSet = useMemo(() => new Set(draftInjured), [draftInjured])
  const suspendedSet = useMemo(() => new Set(draftSuspended), [draftSuspended])
  const belongsToMap = useMemo(() => {
    const map = new Map<string, string>()
    belongsTo?.forEach(({ label, ids }) => ids.forEach((id) => { if (!map.has(id)) map.set(id, label) }))
    return map
  }, [belongsTo])

  const activeSet = category === 'injured' ? injuredSet : suspendedSet

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const list = players.filter(
      (p) => !needle || p.name.toLowerCase().includes(needle) || p.position.toLowerCase().includes(needle) || String(p.number).includes(needle),
    )
    const tier = (p: Player) => {
      if (activeSet.has(p.id)) return 0
      if (excludedSet.has(p.id)) return 2
      return 1
    }
    return [...list].sort((a, b) => tier(a) - tier(b))
  }, [players, q, activeSet, excludedSet])

  const toggle = (p: Player) => {
    if (excludedSet.has(p.id)) return
    if (activeSet.has(p.id)) {
      const remove = (arr: string[]) => arr.filter((id) => id !== p.id)
      if (category === 'injured') setDraftInjured((d) => remove(d))
      else setDraftSuspended((d) => remove(d))
      return
    }
    const other = category === 'injured' ? suspendedSet : injuredSet
    if (other.has(p.id)) return
    const add = (arr: string[]) => [...arr, p.id]
    if (category === 'injured') setDraftInjured((d) => add(d))
    else setDraftSuspended((d) => add(d))
  }

  const confirm = () => {
    onConfirm({ injured: draftInjured, suspended: draftSuspended })
    onClose()
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
        <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
          {(Object.keys(categoryMeta) as AbsenceCategory[]).map((key) => {
            const meta = categoryMeta[key]
            const active = category === key
            const count = key === 'injured' ? draftInjured.length : draftSuspended.length
            return (
              <Button
                key={key}
                fullWidth
                onClick={() => setCategory(key)}
                sx={{
                  borderRadius: 2,
                  border: active ? `1.5px solid ${meta.dot}` : '1px solid rgba(255,255,255,0.12)',
                  bgcolor: active ? `${meta.dot}1A` : 'rgba(255,255,255,0.03)',
                  color: active ? meta.chipColor : 'text.secondary',
                  fontWeight: 800,
                  fontSize: 13,
                  py: 1,
                  '&:hover': { bgcolor: active ? `${meta.dot}26` : 'rgba(255,255,255,0.06)' },
                }}
              >
                {meta.label} {count > 0 && `(${count})`}
              </Button>
            )
          })}
        </Box>
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
            const isSelected = activeSet.has(p.id)
            const isOther = (category === 'injured' ? suspendedSet : injuredSet).has(p.id)
            const isExcluded = excludedSet.has(p.id)
            const otherCat = (category === 'injured' ? categoryMeta.suspended : categoryMeta.injured)
            const selectable = !isExcluded && !isOther
            return (
              <Tooltip key={p.id} title={isExcluded ? 'مُختار بالفعل في التشكيلة أو البدلاء' : isOther ? `مُحدد في قائمة ${otherCat.label}` : ''} arrow>
                <Box
                  onClick={() => toggle(p)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    p: 1,
                    borderRadius: 2,
                    border: isSelected ? `1px solid ${categoryMeta[category].dot}` : '1px solid rgba(255,255,255,0.08)',
                    bgcolor: isSelected ? `${categoryMeta[category].dot}14` : isOther ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.04)',
                    opacity: selectable ? 1 : 0.4,
                    cursor: selectable ? 'pointer' : 'not-allowed',
                    transition: 'all .15s ease',
                  }}
                >
                  <Avatar src={p.imageUrl} sx={{ width: 32, height: 32, fontSize: 13, fontWeight: 800, bgcolor: isSelected ? categoryMeta[category].dot : isOther ? otherCat.dot : 'rgba(0,87,168,0.5)', color: isSelected || isOther ? '#1A1400' : '#fff' }}>{p.number}</Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.name}
                      {belongsToMap.has(p.id) && (
                        <Box component="span" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: 12 }}> ({belongsToMap.get(p.id)})</Box>
                      )}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {p.position === 'حارس' && (
                        <Typography variant="caption" sx={{ color: '#FEBE10', fontWeight: 700 }}>حارس</Typography>
                      )}
                      {isOther && (
                        <Chip size="small" label={otherCat.label} sx={{ height: 18, fontSize: 10, fontWeight: 700, color: otherCat.chipColor, bgcolor: `${otherCat.dot}1A` }} />
                      )}
                    </Box>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: categoryMeta[category].chipColor, fontSize: 11 }}>
                      {isSelected ? categoryMeta[category].label : isOther ? otherCat.label : ''}
                    </Typography>
                  </Box>
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
        <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 700 }}>
          الغائبون: {draftInjured.length + draftSuspended.length} لاعب
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button onClick={onClose} sx={{ color: 'text.secondary' }}>إلغاء</Button>
          <Button variant="contained" onClick={confirm}>تأكيد</Button>
        </Box>
      </DialogActions>
    </Dialog>
  )
}