import { useEffect, useState } from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Stack, CircularProgress } from '@mui/material'
import type { CoverageEntityType, CoverageRecord } from '../../domain/coverage.types'
import {
  STADIUM_FIELDS,
  COMMENTATOR_FIELDS,
  REFEREE_FIELDS,
  CHANNEL_FIELDS,
  COVERAGE_LABELS,
} from '../../domain/coverage.types'
import { addCoverageRecord, updateCoverageRecord } from '../../data/coverage.service'

interface RecordDialogProps {
  open: boolean
  type: CoverageEntityType
  record: CoverageRecord | null
  onClose: () => void
}

const FIELDS: Record<CoverageEntityType, readonly { key: string; label: string; placeholder: string; required: boolean }[]> = {
  stadium: STADIUM_FIELDS,
  commentator: COMMENTATOR_FIELDS,
  referee: REFEREE_FIELDS,
  channel: CHANNEL_FIELDS,
}

export default function RecordDialog({ open, type, record, onClose }: RecordDialogProps) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const fields = FIELDS[type]
  const isEdit = record !== null

  useEffect(() => {
    if (!open) return
    if (record) {
      const r = record as unknown as Record<string, string>
      const initial: Record<string, string> = {}
      fields.forEach((f) => (initial[f.key] = r[f.key] ?? ''))
      setValues(initial)
    } else {
      const empty: Record<string, string> = {}
      fields.forEach((f) => (empty[f.key] = ''))
      setValues(empty)
    }
  }, [open, record, type]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleClose = () => {
    if (saving) return
    onClose()
  }

  const handleSave = async () => {
    const clean: Record<string, string> = {}
    for (const f of fields) {
      const v = (values[f.key] ?? '').trim()
      if (f.required && !v) return
      clean[f.key] = v
    }
    setSaving(true)
    try {
      if (isEdit && record) {
        await updateCoverageRecord(type, record.id, clean)
      } else {
        await addCoverageRecord(type, clean)
      }
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const singular = COVERAGE_LABELS[type].ar.replace(/^ال/, '')
  const title = isEdit
    ? `تعديل ${singular} (Edit ${COVERAGE_LABELS[type].en.replace(/s$/, '')})`
    : `إضافة ${singular} (Add ${COVERAGE_LABELS[type].en.replace(/s$/, '')})`

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {fields.map((f) => (
            <TextField
              key={f.key}
              label={`${f.label}${f.required ? ' *' : ''}`}
              placeholder={f.placeholder}
              fullWidth
              value={values[f.key] ?? ''}
              onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
              required={f.required}
            />
          ))}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={saving} sx={{ color: 'text.secondary' }}>
          إلغاء
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {saving ? 'جارٍ الحفظ…' : isEdit ? 'حفظ' : 'إضافة'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
