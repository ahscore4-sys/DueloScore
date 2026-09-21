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
} from '@mui/material'
import { updateCompetitionTeam } from '../data/competitionDatabase.service'
import type { CompetitionTeamDoc } from '../domain/competition.types'

interface TeamEditDialogProps {
  open: boolean
  onClose: () => void
  leagueId: number
  team: CompetitionTeamDoc | null
}

export default function TeamEditDialog({ open, onClose, leagueId, team }: TeamEditDialogProps) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [country, setCountry] = useState('')
  const [founded, setFounded] = useState('')
  const [touched, setTouched] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open || !team) return
    setName(team.name ?? '')
    setCode(team.code ?? '')
    setCountry(team.country ?? '')
    setFounded(team.founded != null ? String(team.founded) : '')
    setTouched(false)
  }, [open, team])

  const foundedError = touched && founded.trim() !== '' && !/^\d+$/.test(founded.trim())
  const canSave = name.trim() !== '' && !foundedError && !busy

  const handleSave = async () => {
    if (!team || !canSave) return
    setBusy(true)
    try {
      await updateCompetitionTeam(leagueId, team.id, {
        name: name.trim(),
        code: code.trim() || null,
        country: country.trim() || null,
        founded: founded.trim() !== '' ? Number(founded.trim()) : null,
      })
    } finally {
      setBusy(false)
      onClose()
    }
  }

  return (
    <Dialog open={open} onClose={() => !busy && onClose()} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack spacing={0.5}>
          <Typography variant="h6">تعديل بيانات الفريق</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {team?.name}
          </Typography>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="اسم الفريق (Name)"
            fullWidth
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={touched && !name.trim()}
            helperText={touched && !name.trim() ? 'الاسم مطلوب' : ' '}
          />
          <Stack direction="row" spacing={2}>
            <TextField
              label="الرمز (Code)"
              fullWidth
              value={code}
              onChange={(e) => setCode(e.target.value)}
              helperText="مثال: FCB, RMA"
            />
            <TextField
              label="الدولة (Country)"
              fullWidth
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              helperText=" "
            />
          </Stack>
          <TextField
            label="سنة التأسيس (Founded)"
            fullWidth
            type="number"
            value={founded}
            onChange={(e) => setFounded(e.target.value)}
            onBlur={() => setTouched(true)}
            error={foundedError}
            helperText={foundedError ? 'سنة صحيحة مطلوبة' : ' '}
            slotProps={{ htmlInput: { min: 1800, max: 2100, step: 1, inputMode: 'numeric', style: { MozAppearance: 'textfield' } } }}
            sx={{ '& input[type="number"]::-webkit-outer-spin-button, & input[type="number"]::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 } }}
          />
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