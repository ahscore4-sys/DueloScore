import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  TextField,
  MenuItem,
  Typography,
  Box,
  Chip,
} from '@mui/material'
import { updateCompetitionPlayer, deletePlayerImage } from '../data/competitionDatabase.service'
import type { CompetitionPlayerDoc } from '../domain/competition.types'
import { PLAYER_POSITIONS, positionLabel } from '../domain/competition.types'
import ImageDropZone from '@/core/ui/components/ImageDropZone'
import DeleteIcon from '@mui/icons-material/Delete'

interface PlayerEditDialogProps {
  open: boolean
  onClose: () => void
  onDelete: () => void
  leagueId: number
  teamId: number
  player: CompetitionPlayerDoc | null
}

export default function PlayerEditDialog({ open, onClose, onDelete, leagueId, teamId, player }: PlayerEditDialogProps) {
  const [name, setName] = useState('')
  const [number, setNumber] = useState('')
  const [age, setAge] = useState('')
  const [position, setPosition] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [removePhoto, setRemovePhoto] = useState(false)
  const [touched, setTouched] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open || !player) return
    setName(player.name ?? '')
    setNumber(player.number != null ? String(player.number) : '')
    setAge(player.age != null ? String(player.age) : '')
    setPosition(player.position ?? '')
    setFile(null)
    setPreview(player.photo || null)
    setRemovePhoto(false)
    setTouched(false)
  }, [open, player])

  const numberError = touched && number.trim() !== '' && !/^\d+$/.test(number.trim())
  const ageError = touched && age.trim() !== '' && !/^\d+$/.test(age.trim())
  const canSave = name.trim() !== '' && !numberError && !ageError && !busy

  const handleFile = (f: File) => {
    setFile(f)
    setPreview((prev) => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev)
      return URL.createObjectURL(f)
    })
    setRemovePhoto(false)
  }

  const handleClear = () => {
    if (file) {
      const oldUrl = preview
      setFile(null)
      setPreview(player?.photo || null)
      if (oldUrl?.startsWith('blob:')) URL.revokeObjectURL(oldUrl)
      setRemovePhoto(false)
    } else {
      setPreview(null)
      setRemovePhoto(true)
    }
  }

  const handleSave = async () => {
    if (!player || !canSave) return
    setBusy(true)
    try {
      if (removePhoto) {
        await deletePlayerImage(leagueId, teamId, player.id, player.photoPath)
      } else {
        const merged: CompetitionPlayerDoc = {
          ...player,
          name: name.trim(),
          number: number.trim() !== '' ? Number(number.trim()) : null,
          age: age.trim() !== '' ? Number(age.trim()) : null,
          position: position || 'Goalkeeper',
          photo: preview ?? player.photo ?? '',
          photoPath: removePhoto ? null : player.photoPath ?? null,
        }
        await updateCompetitionPlayer({ leagueId, teamId, player: merged, imageFile: file })
      }
    } finally {
      setBusy(false)
      onClose()
    }
  }

  return (
    <Dialog open={open} onClose={() => !busy && onClose()} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
          <Stack spacing={0.5}>
            <Typography variant="h6">تعديل اللاعب</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {player?.name}
            </Typography>
          </Stack>
          <Button
            variant="outlined"
            color="error"
            size="small"
            onClick={onDelete}
            disabled={busy}
            startIcon={<DeleteIcon sx={{ fontSize: 16 }} />}
            sx={{ gap: 0.75, '& .MuiButton-startIcon': { m: 0 }, flexShrink: 0, mt: 0.5 }}
          >
            حذف
          </Button>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Box
            sx={{
              background: 'radial-gradient(circle at 50% 0%, rgba(0,87,168,0.22), rgba(0,87,168,0) 70%)',
              borderRadius: 3,
              p: 2,
              border: '1px dashed rgba(255,255,255,0.14)',
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', display: 'block', mb: 1 }}>
              صورة اللاعب (اختياري)
            </Typography>
            <ImageDropZone
              previewUrl={preview}
              uploading={busy}
              disabled={busy}
              maxWidth={240}
              aspectRatio="1 / 1"
              ratioLabel="1:1"
              outputWidth={512}
              outputHeight={512}
              filePrefix="player"
              onFileSelected={handleFile}
              onClear={handleClear}
            />
            {removePhoto && <Chip size="small" label="سيتم إزالة الصورة الحالية" color="error" sx={{ mt: 1 }} />}
          </Box>

          <TextField
            label="الاسم (Name)"
            fullWidth
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={touched && !name.trim()}
            helperText={touched && !name.trim() ? 'الاسم مطلوب' : ' '}
          />
          <Stack direction="row" spacing={2}>
            <TextField
              label="الرقم (Number)"
              fullWidth
              type="number"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              onBlur={() => setTouched(true)}
              error={numberError}
              helperText={numberError ? 'رقم صحيح مطلوب' : ' '}
              slotProps={{ htmlInput: { min: 1, step: 1, inputMode: 'numeric', style: { MozAppearance: 'textfield' } } }}
              sx={{ '& input[type="number"]::-webkit-outer-spin-button, & input[type="number"]::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 } }}
            />
            <TextField
              label="العمر (Age)"
              fullWidth
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              onBlur={() => setTouched(true)}
              error={ageError}
              helperText={ageError ? 'عمر صحيح مطلوب' : ' '}
              slotProps={{ htmlInput: { min: 15, max: 50, step: 1, inputMode: 'numeric', style: { MozAppearance: 'textfield' } } }}
              sx={{ '& input[type="number"]::-webkit-outer-spin-button, & input[type="number"]::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 } }}
            />
          </Stack>
          <TextField select label="المركز (Position)" fullWidth value={position} onChange={(e) => setPosition(e.target.value)}>
            {PLAYER_POSITIONS.map((p) => (
              <MenuItem key={p} value={p}>
                {positionLabel(p)}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy} sx={{ color: 'text.secondary' }}>
          إلغاء
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={!canSave}>
          {busy ? 'جارٍ الحفظ…' : 'حفظ التعديلات'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}