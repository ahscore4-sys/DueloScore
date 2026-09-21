import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  TextField,
  Typography,
  Box,
  Chip,
} from '@mui/material'
import { updateCompetitionCoach, deleteCompetitionCoachImage } from '../data/competitionDatabase.service'
import type { CompetitionTeamCoach } from '../domain/competition.types'
import ImageDropZone from '@/core/ui/components/ImageDropZone'

interface CoachEditDialogProps {
  open: boolean
  onClose: () => void
  leagueId: number
  teamId: number
  coach: CompetitionTeamCoach | null
}

export default function CoachEditDialog({ open, onClose, leagueId, teamId, coach }: CoachEditDialogProps) {
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [nationality, setNationality] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [removePhoto, setRemovePhoto] = useState(false)
  const [touched, setTouched] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open || !coach) return
    setName(coach.name ?? '')
    setAge(coach.age != null ? String(coach.age) : '')
    setNationality(coach.nationality ?? '')
    setFile(null)
    setPreview(coach.photo || null)
    setRemovePhoto(false)
    setTouched(false)
  }, [open, coach])

  const ageError = touched && age.trim() !== '' && !/^\d+$/.test(age.trim())
  const canSave = name.trim() !== '' && !ageError && !busy

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
      setPreview(coach?.photo || null)
      if (oldUrl?.startsWith('blob:')) URL.revokeObjectURL(oldUrl)
      setRemovePhoto(false)
    } else {
      setPreview(null)
      setRemovePhoto(true)
    }
  }

  const handleSave = async () => {
    if (!coach || !canSave) return
    setBusy(true)
    try {
      if (removePhoto) {
        await deleteCompetitionCoachImage(leagueId, teamId, coach.photoPath)
      } else {
        const merged: CompetitionTeamCoach = {
          ...coach,
          name: name.trim(),
          age: age.trim() !== '' ? Number(age.trim()) : null,
          nationality: nationality.trim() !== '' ? nationality.trim() : null,
          photo: preview ?? coach.photo ?? '',
          photoPath: removePhoto ? null : coach.photoPath ?? null,
        }
        await updateCompetitionCoach(leagueId, teamId, merged, file)
      }
    } finally {
      setBusy(false)
      onClose()
    }
  }

  return (
    <Dialog open={open} onClose={() => !busy && onClose()} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack spacing={0.5}>
          <Typography variant="h6">تعديل المدرب</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {coach?.name}
          </Typography>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Box
            sx={{
              background: 'radial-gradient(circle at 50% 0%, rgba(254,190,16,0.16), rgba(254,190,16,0) 70%)',
              borderRadius: 3,
              p: 2,
              border: '1px dashed rgba(255,255,255,0.14)',
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', display: 'block', mb: 1 }}>
              صورة المدرب (اختياري)
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
              filePrefix="coach"
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
              label="العمر (Age)"
              fullWidth
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              onBlur={() => setTouched(true)}
              error={ageError}
              helperText={ageError ? 'عمر صحيح مطلوب' : ' '}
              slotProps={{ htmlInput: { min: 25, max: 80, step: 1, inputMode: 'numeric', style: { MozAppearance: 'textfield' } } }}
              sx={{ '& input[type="number"]::-webkit-outer-spin-button, & input[type="number"]::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 } }}
            />
            <TextField
              label="الجنسية (Nationality)"
              fullWidth
              value={nationality}
              onChange={(e) => setNationality(e.target.value)}
              helperText=" "
            />
          </Stack>
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