import { Avatar, Box, Divider, Popover, TextField, Typography } from '@mui/material'
import { useEffect, useMemo, useRef, useState } from 'react'
import SearchIcon from '@mui/icons-material/Search'
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline'
import type { Player } from '../types'
import { readableOn } from '../lib/colorUtils'

interface SlotPlayerMenuProps {
  open: boolean
  anchorEl: HTMLElement | null
  index: number
  players: Player[]
  lineup: string[]
  bench: string[]
  injured: string[]
  suspended: string[]
  gkOnly: boolean
  color: string
  gkColor: string
  onClose: () => void
  onSelect: (id: string | null) => void
}

export default function SlotPlayerMenu({
  open,
  anchorEl,
  index,
  players,
  lineup,
  bench,
  injured,
  suspended,
  gkOnly,
  color,
  gkColor,
  onClose,
  onSelect,
}: SlotPlayerMenuProps) {
  const [q, setQ] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setQ('')
      const t = window.setTimeout(() => inputRef.current?.focus(), 60)
      return () => window.clearTimeout(t)
    }
  }, [open])

  const benchSet = useMemo(() => new Set(bench), [bench])
  const injuredSet = useMemo(() => new Set(injured), [injured])
  const suspendedSet = useMemo(() => new Set(suspended), [suspended])
  const currentId = lineup[index]

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const candidates = players.filter(
      (p) =>
        p.id !== currentId &&
        (!needle || p.name.toLowerCase().includes(needle) || p.position.toLowerCase().includes(needle) || String(p.number).includes(needle)) &&
        (!gkOnly || p.position === 'حارس'),
    )
    const place = (p: Player) => {
      const slot = lineup.indexOf(p.id)
      if (slot >= 0) return { rank: 0, label: `في المركز ${slot + 1}` }
      if (benchSet.has(p.id)) return { rank: 1, label: 'بديل' }
      if (injuredSet.has(p.id)) return { rank: 2, label: 'مصاب' }
      if (suspendedSet.has(p.id)) return { rank: 2, label: 'موقوف' }
      return { rank: 3, label: 'متاح' }
    }
    return candidates
      .map((p) => ({ p, place: place(p) }))
      .sort((a, b) => a.place.rank - b.place.rank || a.p.number - b.p.number)
  }, [players, lineup, currentId, benchSet, injuredSet, suspendedSet, gkOnly, q])

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'center', horizontal: 'left' }}
      transformOrigin={{ vertical: 'center', horizontal: 'right' }}
      slotProps={{
        paper: {
          sx: {
            width: 320,
            maxHeight: 460,
            ml: 1,
            p: 1,
            bgcolor: '#0E1428',
            backgroundImage: 'none',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 2.5,
            boxShadow: '0 18px 50px rgba(0,0,0,0.6)',
          },
        },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 0.5, pt: 0.25 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 800 }}>
            المركز {index + 1}
            {gkOnly && (
              <Box component="span" sx={{ color: '#FEBE10', fontWeight: 700, fontSize: 11, mr: 0.75 }}>حارس</Box>
            )}
          </Typography>
          {currentId && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>{currentId ? 'اختر بديلاً' : ''}</Typography>
          )}
        </Box>

        <TextField
          inputRef={inputRef}
          size="small"
          placeholder="بحث بالاسم أو الرقم أو المركز…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          slotProps={{ input: { startAdornment: <SearchIcon sx={{ ml: 1, color: 'text.secondary' }} /> } }}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
        />

        {currentId && (
          <>
            <Box
              onClick={() => onSelect(null)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                p: 1,
                borderRadius: 2,
                cursor: 'pointer',
                color: '#FF5252',
                border: '1px dashed rgba(255,23,68,0.45)',
                '&:hover': { bgcolor: 'rgba(255,23,68,0.1)' },
              }}
            >
              <RemoveCircleOutlineIcon sx={{ fontSize: 18 }} />
              <Typography sx={{ fontSize: 13, fontWeight: 700 }}>إزالة من التشكيلة (يُعاد إلى المتاحين)</Typography>
            </Box>
            <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />
          </>
        )}

        <Box sx={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0.5, pr: 0.25, pt: 0.25 }}>
          {list.map(({ p }) => {
            const chipColor = p.position === 'حارس' ? gkColor : color
            return (
              <Box
                key={p.id}
                onClick={() => onSelect(p.id)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.25,
                  p: 0.9,
                  borderRadius: 2,
                  cursor: 'pointer',
                  bgcolor: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  transition: 'all .15s ease',
                  '&:hover': { bgcolor: 'rgba(254,190,16,0.08)', borderColor: 'rgba(254,190,16,0.4)' },
                }}
              >
                <Avatar
                  src={p.imageUrl}
                  sx={{ width: 30, height: 30, fontSize: 12, fontWeight: 800, bgcolor: chipColor, color: readableOn(chipColor) }}
                >
                  {p.number}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.name}
                  </Typography>
                </Box>
              </Box>
            )
          })}
          {list.length === 0 && (
            <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 3 }}>لا توجد نتائج مطابقة</Typography>
          )}
        </Box>
      </Box>
    </Popover>
  )
}