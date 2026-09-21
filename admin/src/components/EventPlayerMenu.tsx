import { Avatar, Box, Popover, TextField, Typography } from '@mui/material'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import SearchIcon from '@mui/icons-material/Search'
import type { Player } from '../types'
import { readableOn } from '../lib/colorUtils'

interface EventPlayerMenuProps {
  open: boolean
  anchorEl: HTMLElement | null
  label: string
  players: Player[]
  value: string
  exclude?: string[]
  color: string
  onSelect: (player: Player) => void
  onClose: () => void
  trigger?: ReactNode
}

export default function EventPlayerMenu({
  open,
  anchorEl,
  label,
  players,
  value,
  exclude,
  color,
  onSelect,
  onClose,
  trigger,
}: EventPlayerMenuProps) {
  const [q, setQ] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setQ('')
      const t = window.setTimeout(() => inputRef.current?.focus(), 60)
      return () => window.clearTimeout(t)
    }
  }, [open])

  const excludedSet = useMemo(() => new Set(exclude), [exclude])

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return players.filter(
      (p) =>
        p.id !== value &&
        !excludedSet.has(p.id) &&
        (!needle ||
          p.name.toLowerCase().includes(needle) ||
          p.position.toLowerCase().includes(needle) ||
          String(p.number).includes(needle)),
    )
  }, [players, value, excludedSet, q])

  const selectedName = value === '' ? '— غير محدد —' : players.find((p) => p.id === value)?.name ?? value

  return (
    <Box>
      {trigger}
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={onClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              width: 320,
              maxHeight: 460,
              mt: 0.5,
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
            <Typography sx={{ fontSize: 14, fontWeight: 800 }}>{label}</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>{selectedName}</Typography>
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

          <Box sx={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0.5, pr: 0.25, pt: 0.25 }}>
            {list.map((p) => (
              <Box
                key={p.id}
                onClick={() => onSelect(p)}
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
                  sx={{ width: 30, height: 30, fontSize: 12, fontWeight: 800, bgcolor: color, color: readableOn(color) }}
                >
                  {p.number}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.number} — {p.name}
                  </Typography>
                </Box>
              </Box>
            ))}
            {list.length === 0 && (
              <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 3 }}>لا توجد نتائج مطابقة</Typography>
            )}
          </Box>
        </Box>
      </Popover>
    </Box>
  )
}