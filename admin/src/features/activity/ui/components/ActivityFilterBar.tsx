import { Box, IconButton, MenuItem, Paper, Stack, TextField, Tooltip } from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import PersonSearchIcon from '@mui/icons-material/PersonSearch'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import type { ActivityTargetType } from '../../domain/activity.types'
import { ACTIVITY_TARGET_TYPES, groupColor } from '../../domain/activity.types'
import type { LogAdminRef } from '../../data/activity.service'
import ChipSelector from '@/core/ui/components/ChipSelector'

export interface ActivityFilters {
  adminId: string | null
  targetType: ActivityTargetType | null
  from: number | null
  to: number | null
  search: string
}

interface ActivityFilterBarProps {
  isSuperAdmin: boolean
  admins: LogAdminRef[]
  filters: ActivityFilters
  onAdminChange: (adminId: string | null) => void
  onTargetTypeChange: (targetType: ActivityTargetType | null) => void
  onFromChange: (ms: number | null) => void
  onToChange: (ms: number | null) => void
  onSearchChange: (value: string) => void
  onReset: () => void
}

export default function ActivityFilterBar({
  isSuperAdmin,
  admins,
  filters,
  onAdminChange,
  onTargetTypeChange,
  onFromChange,
  onToChange,
  onSearchChange,
  onReset,
}: ActivityFilterBarProps) {
  return (
    <Paper sx={{ p: 2, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(14px)', position: 'sticky', top: 0, zIndex: 5 }}>
      <Stack spacing={2}>
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
          <TextField
            size="small"
            placeholder="بحث بالنص أو الهدف…"
            value={filters.search}
            onChange={(e) => onSearchChange(e.target.value)}
            sx={{ flexGrow: 1, minWidth: 220 }}
            slotProps={{ input: { startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} /> } }}
          />
          <Tooltip title="إعادة تعيين الفلاتر">
            <IconButton onClick={onReset} sx={{ color: 'text.secondary', border: '1px solid rgba(255,255,255,0.12)' }}>
              <RestartAltIcon />
            </IconButton>
          </Tooltip>
        </Stack>

        <Stack direction="row" spacing={2.5} alignItems="flex-end" flexWrap="wrap" useFlexGap>
          {isSuperAdmin && (
            <TextField
              select
              size="small"
              label="المدير"
              value={filters.adminId ?? ''}
              onChange={(e) => onAdminChange(e.target.value || null)}
              sx={{ minWidth: 200 }}
              slotProps={{
                select: {
                  startAdornment: <PersonSearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                },
              }}
            >
              <MenuItem value="">جميع المديرين</MenuItem>
              {admins.map((a) => (
                <MenuItem key={a.adminId} value={a.adminId}>
                  {a.adminName}
                </MenuItem>
              ))}
            </TextField>
          )}

          <Box sx={{ alignItems: 'flex-end' }}>
            <ChipSelector
              label="نوع السجل"
              options={ACTIVITY_TARGET_TYPES}
              value={filters.targetType}
              onChange={onTargetTypeChange}
              allowEmpty
              accent={(t) => groupColor(t ?? 'settings')}
            />
          </Box>

          <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ar">
            <DatePicker
              label="من تاريخ"
              value={filters.from ? dayjs(filters.from) : null}
              onChange={(v: Dayjs | null) => onFromChange(v ? v.startOf('day').valueOf() : null)}
              slotProps={{ textField: { size: 'small', sx: { minWidth: 160 } } }}
            />
            <DatePicker
              label="إلى تاريخ"
              value={filters.to ? dayjs(filters.to) : null}
              onChange={(v: Dayjs | null) => onToChange(v ? v.endOf('day').valueOf() : null)}
              slotProps={{ textField: { size: 'small', sx: { minWidth: 160 } } }}
            />
          </LocalizationProvider>
        </Stack>
      </Stack>
    </Paper>
  )
}