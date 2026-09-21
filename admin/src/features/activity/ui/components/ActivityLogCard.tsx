import { useState } from 'react'
import { Avatar, Box, Chip, Collapse, IconButton, Paper, Stack, Typography } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import type { ActivityLogEntry } from '../../domain/activity.types'
import {
  activityActionLabel,
  detailsKeyLabel,
  formatKuwaitDateTime,
  groupColor,
  groupLabel,
} from '../../domain/activity.types'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length > 1) return `${parts[0].charAt(0)}${parts[1].charAt(0)}`
  return name.charAt(0) || 'م'
}

export default function ActivityLogCard({ entry }: { entry: ActivityLogEntry }) {
  const [expanded, setExpanded] = useState(false)
  const color = groupColor(entry.targetType)
  const hasDetails = entry.details !== null && Object.keys(entry.details).length > 0

  return (
    <Paper
      sx={{
        p: 2,
        borderRadius: 3,
        bgcolor: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
        transition: 'border-color 0.2s',
        '&:hover': { borderColor: 'rgba(0,87,168,0.5)' },
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <Avatar sx={{ bgcolor: color, width: 38, height: 38, fontSize: 14, fontWeight: 900, flexShrink: 0 }}>
          {initials(entry.adminName)}
        </Avatar>

        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
            <Typography sx={{ fontWeight: 800, fontSize: 14 }}>{entry.adminName}</Typography>
            <Chip
              size="small"
              label={activityActionLabel(entry.action)}
              sx={{ fontWeight: 800, fontSize: 11, height: 19, color, bgcolor: `${color}18`, border: `1px solid ${color}44` }}
            />
            <Chip
              size="small"
              label={groupLabel(entry.targetType)}
              sx={{ fontWeight: 800, fontSize: 11, height: 19, color: 'text.secondary', bgcolor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
            />
          </Stack>

          {entry.targetLabel && (
            <Typography sx={{ mt: 0.75, fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {entry.targetLabel}
            </Typography>
          )}

          <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.5 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              {formatKuwaitDateTime(entry.timestamp)}
            </Typography>
            {hasDetails && (
              <IconButton size="small" onClick={() => setExpanded((v) => !v)} sx={{ p: 0.25, color: 'text.secondary' }}>
                <ExpandMoreIcon sx={{ fontSize: 18, transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </IconButton>
            )}
          </Stack>

          <Collapse in={expanded}>
            {hasDetails && (
              <Box
                sx={{
                  mt: 1,
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <Stack spacing={0.75}>
                  {Object.entries(entry.details ?? {}).map(([k, v]) => (
                    <Stack key={k} direction="row" spacing={1.5}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, minWidth: 90, flexShrink: 0 }}>
                        {detailsKeyLabel(k)}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#fff', fontWeight: 600, wordBreak: 'break-word' }}>
                        {v === null ? '—' : String(v)}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </Box>
            )}
          </Collapse>
        </Box>
      </Stack>
    </Paper>
  )
}