import { Box, Dialog, DialogContent, DialogTitle, IconButton } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import LeaderboardIcon from '@mui/icons-material/Leaderboard'
import type { CoverageMatch } from '../../domain/coverageMatches.types'
import { displayTeamName } from '../../domain/coverageMatches.types'
import CoverageMatchStatsSection from './CoverageMatchStatsSection'

export default function CoverageStatsDialog({ open, match, onClose }: {
  open: boolean
  match: CoverageMatch | null
  onClose: () => void
}) {
  if (!match) return null

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" dir="rtl">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontSize: 16, fontWeight: 900, pr: 1 }}>
        <Box sx={{ width: 38, height: 38, borderRadius: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,87,168,0.14)', border: '1px solid rgba(0,87,168,0.4)', color: '#FEBE10', flexShrink: 0 }}>
          <LeaderboardIcon sx={{ fontSize: 20 }} />
        </Box>
        إحصائيات المباراة — {displayTeamName(match, 'home')} ضد {displayTeamName(match, 'away')}
        <Box sx={{ flexGrow: 1 }} />
        <IconButton size="small" onClick={onClose} aria-label="إغلاق">
          <CloseIcon sx={{ fontSize: 19 }} />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 2.5 }}>
        <CoverageMatchStatsSection match={match} />
      </DialogContent>
    </Dialog>
  )
}