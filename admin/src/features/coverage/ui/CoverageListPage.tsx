import { useState } from 'react'
import type { ReactNode } from 'react'
import { Box, Typography, Stack, Paper, Button, Skeleton, IconButton, Tooltip, Fab, Chip } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver'
import StadiumIcon from '@mui/icons-material/Stadium'
import TvIcon from '@mui/icons-material/Tv'
import LocalPoliceIcon from '@mui/icons-material/LocalPolice'
import type { CoverageEntityType, CoverageRecord } from '../domain/coverage.types'
import {
  COVERAGE_LABELS,
  STADIUM_FIELDS,
  COMMENTATOR_FIELDS,
  REFEREE_FIELDS,
  CHANNEL_FIELDS,
} from '../domain/coverage.types'
import { useCoverageRecords } from './useCoverageRecords'
import { deleteCoverageRecord } from '../data/coverage.service'
import RecordDialog from './components/RecordDialog'
import ConfirmDialog from '@/core/ui/components/ConfirmDialog'

const TYPE_META: Record<CoverageEntityType, { color: string; icon: ReactNode }> = {
  stadium: { color: '#00E676', icon: <StadiumIcon /> },
  commentator: { color: '#FEBE10', icon: <RecordVoiceOverIcon /> },
  referee: { color: '#FF5252', icon: <LocalPoliceIcon /> },
  channel: { color: '#4DD0E1', icon: <TvIcon /> },
}

const DISPLAY_FIELDS: Record<CoverageEntityType, readonly { key: string; label: string }[]> = {
  stadium: STADIUM_FIELDS,
  commentator: COMMENTATOR_FIELDS,
  referee: REFEREE_FIELDS,
  channel: CHANNEL_FIELDS,
}

interface RecordRow {
  key: string
  label: string
  value: string
}

function recordRows(type: CoverageEntityType, record: CoverageRecord): RecordRow[] {
  const r = record as unknown as Record<string, string>
  return DISPLAY_FIELDS[type].map((f) => ({ key: f.key, label: f.label, value: r[f.key] ?? '' }))
}

function recordName(record: CoverageRecord): string {
  return (record as unknown as { name: string }).name ?? ''
}

interface CoverageListPageProps {
  type: CoverageEntityType
  title: string
  subtitle: string
}

export default function CoverageListPage({ type, title, subtitle }: CoverageListPageProps) {
  const { records, loading } = useCoverageRecords(type)
  const [addOpen, setAddOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<CoverageRecord | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CoverageRecord | null>(null)
  const [deleting, setDeleting] = useState(false)

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteCoverageRecord(type, deleteTarget.id, recordName(deleteTarget))
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  const accent = TYPE_META[type].color
  const icon = TYPE_META[type].icon
  const singularLabel = COVERAGE_LABELS[type].ar.replace(/^ال/, '')

  return (
    <Stack spacing={3}>
      <Stack direction="row" alignItems="center" spacing={2}>
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: `${accent}22`,
            border: `1px solid ${accent}66`,
            color: accent,
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
        <Stack spacing={0.5}>
          <Typography variant="h4">{title}</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {subtitle}
          </Typography>
        </Stack>
      </Stack>

      {loading ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
          {[0, 1, 2, 3].map((i) => (
            <Paper key={i} sx={{ p: 2.5, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Skeleton variant="circular" width={46} height={46} />
                <Box sx={{ flexGrow: 1 }}>
                  <Skeleton width="40%" height={24} />
                  <Skeleton width="30%" height={18} />
                </Box>
              </Stack>
            </Paper>
          ))}
        </Box>
      ) : records.length === 0 ? (
        <Paper sx={{ p: 6, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', textAlign: 'center' }}>
          <Stack spacing={2} alignItems="center">
            <Box
              sx={{
                width: 84,
                height: 84,
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: `${accent}22`,
                border: `1px solid ${accent}66`,
                color: accent,
              }}
            >
              {icon}
            </Box>
            <Typography variant="h5">لا توجد {COVERAGE_LABELS[type].ar} بعد</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 440 }}>
              أضف أول سجل ليكون متاحاً عند إعداد المباريات والتغطية.
            </Typography>
            <Button variant="contained" onClick={() => setAddOpen(true)} sx={{ gap: 1 }}>
              <AddIcon />
              إضافة {singularLabel}
            </Button>
          </Stack>
        </Paper>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
          {records.map((record) => {
            const name = recordName(record)
            const rows = recordRows(type, record).filter((r) => r.key !== 'name')
            return (
              <Paper
                key={record.id}
                onClick={() => setEditTarget(record)}
                sx={{
                  p: 2.5,
                  borderRadius: 4,
                  bgcolor: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  backdropFilter: 'blur(14px)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease, border-color 0.15s ease',
                  '&:hover': { transform: 'translateY(-2px)', borderColor: `${accent}66` },
                }}
              >
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 3,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: `${accent}22`,
                    border: `1px solid ${accent}55`,
                    color: accent,
                    flexShrink: 0,
                  }}
                >
                  {icon}
                </Box>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 800, fontSize: 16 }} noWrap>
                    {name}
                  </Typography>
                  <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                    {rows.map((row) =>
                      row.value ? (
                        <Chip
                          key={row.key}
                          size="small"
                          label={`${row.label}: ${row.value}`}
                          sx={{ bgcolor: 'rgba(255,255,255,0.06)', color: 'text.secondary', fontSize: 11, fontWeight: 600 }}
                        />
                      ) : null,
                    )}
                  </Stack>
                </Box>
                <Tooltip title="حذف" placement="top">
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeleteTarget(record)
                    }}
                    size="small"
                    sx={{ color: 'text.secondary', '&:hover': { color: '#FF5252' } }}
                  >
                    <DeleteOutlineIcon />
                  </IconButton>
                </Tooltip>
              </Paper>
            )
          })}
        </Box>
      )}

      <Tooltip title={`إضافة ${singularLabel}`} placement="top">
        <Fab
          color="primary"
          aria-label="add"
          onClick={() => setAddOpen(true)}
          sx={{ position: 'fixed', bottom: 24, left: 24, background: 'linear-gradient(135deg, #00E676, #00C853)', color: '#062A16', '&:hover': { background: 'linear-gradient(135deg, #00E676, #00A84C)' } }}
        >
          <AddIcon />
        </Fab>
      </Tooltip>

      <RecordDialog
        open={addOpen || editTarget !== null}
        type={type}
        record={editTarget}
        onClose={() => {
          setAddOpen(false)
          setEditTarget(null)
        }}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title={`حذف ${singularLabel} (Delete)`}
        message={`هل تريد حذف «${deleteTarget ? recordName(deleteTarget) : ''}» نهائياً؟ سيختفي من التطبيق فوراً.`}
        confirmLabel="حذف"
        danger
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </Stack>
  )
}
