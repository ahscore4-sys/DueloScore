import { useNavigate } from 'react-router-dom'
import { Typography, Stack, Button, Paper, Box, Skeleton, CircularProgress, Chip, IconButton } from '@mui/material'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import EmojiEventsOutlinedIcon from '@mui/icons-material/EmojiEventsOutlined'
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import { useChallengeHistory } from './useChallengeHistory'
import { CHALLENGE_STATUS_LABELS, deriveChallengeStatus, formatChallengeWindow, formatKuwaitDate, formatPoints } from '../domain/challenge.types'
import type { DailyChallenge } from '../domain/challenge.types'

const STATUS_COLORS: Record<string, string> = { scheduled: '#90CAF9', active: '#00E676', ended: '#9E9E9E' }

function HistoryCard({ challenge }: { challenge: DailyChallenge }) {
  const now = Date.now()
  const status = deriveChallengeStatus(challenge, now)
  const statusColor = STATUS_COLORS[status]
  const responded = challenge.stats.respondedCount
  const correct = challenge.stats.correctCount
  const participationRate = challenge.stats.assignedCount > 0 ? Math.round((responded / challenge.stats.assignedCount) * 100) : 0
  const accuracyRate = responded > 0 ? Math.round((correct / responded) * 100) : 0

  return (
    <Paper
      sx={{
        p: 3, borderRadius: 4,
        bgcolor: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
        transition: 'border-color 0.2s',
        '&:hover': { borderColor: 'rgba(255,255,255,0.2)' },
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap" useFlexGap>
        <Chip
          size="small"
          label={CHALLENGE_STATUS_LABELS[status]}
          icon={<FiberManualRecordIcon sx={{ fontSize: 10, color: `${statusColor} !important` }} />}
          sx={{ fontWeight: 800, fontSize: 12, color: statusColor, bgcolor: `${statusColor}14`, border: `1px solid ${statusColor}44` }}
        />
        <Typography sx={{ fontWeight: 800 }}>{formatKuwaitDate(challenge.startTime)}</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>{formatChallengeWindow(challenge.startTime, challenge.endTime)}</Typography>
      </Stack>

      {status === 'ended' ? (
        <Stack direction="row" spacing={2} sx={{ mt: 2.5 }} flexWrap="wrap" useFlexGap>
          <StatBadge icon={<PeopleOutlineIcon sx={{ fontSize: 16, color: '#90CAF9' }} />} value={formatPoints(responded)} label="مشارك" />
          <StatBadge icon={<CheckCircleOutlineIcon sx={{ fontSize: 16, color: '#00E676' }} />} value={formatPoints(correct)} label="صحيحة" />
          <StatBadge icon={<TrendingUpIcon sx={{ fontSize: 16, color: '#FEBE10' }} />} value={`${participationRate}%`} label="المشاركة" />
          <StatBadge icon={<EmojiEventsOutlinedIcon sx={{ fontSize: 16, color: '#FEBE10' }} />} value={`${accuracyRate}%`} label="الدقة" />
        </Stack>
      ) : (
        <Stack direction="row" spacing={2} sx={{ mt: 2.5 }} flexWrap="wrap" useFlexGap>
          <StatBadge icon={<PeopleOutlineIcon sx={{ fontSize: 16, color: '#90CAF9' }} />} value={formatPoints(challenge.stats.assignedCount)} label="مُسند" />
          <StatBadge icon={<PeopleOutlineIcon sx={{ fontSize: 16, color: '#90CAF9' }} />} value={formatPoints(responded)} label="مشارك" />
        </Stack>
      )}

      {status === 'ended' && challenge.topPerformers.length > 0 && (
        <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, display: 'block', mb: 0.75 }}>أسرع الإجابات الصحيحة</Typography>
          <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
            {challenge.topPerformers.slice(0, 3).map((p, i) => (
              <Stack key={p.userId} direction="row" alignItems="center" spacing={0.75}>
                <Typography sx={{ fontWeight: 800, fontSize: 13, color: i === 0 ? '#FEBE10' : 'text.secondary' }}>{i + 1}.</Typography>
                <Typography sx={{ fontWeight: 700, fontSize: 13 }}>{p.userName}</Typography>
              </Stack>
            ))}
          </Stack>
        </Box>
      )}
    </Paper>
  )
}

function StatBadge({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <Stack direction="row" alignItems="center" spacing={0.75} sx={{ px: 1.5, py: 1, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
      {icon}
      <Stack spacing={0}>
        <Typography sx={{ fontWeight: 800, fontSize: 14, lineHeight: 1.2 }}>{value}</Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 10, lineHeight: 1 }}>{label}</Typography>
      </Stack>
    </Stack>
  )
}

export default function ChallengeHistoryPage() {
  const navigate = useNavigate()
  const { challenges, loading, loadingMore, hasMore, loadMore } = useChallengeHistory()

  return (
    <Stack spacing={3}>
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <IconButton onClick={() => navigate(-1)} sx={{ color: 'text.secondary', border: '1px solid rgba(255,255,255,0.12)' }}>
          <ArrowForwardIcon />
        </IconButton>
        <Stack spacing={0.25}>
          <Typography variant="h4">سجل التحديات (Challenge History)</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            جميع التحديات السابقة مع النتائج والإحصائيات
          </Typography>
        </Stack>
      </Stack>

      {loading ? (
        <Stack spacing={2}>
          {[0, 1, 2].map((i) => (
            <Paper key={i} sx={{ p: 3, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Skeleton variant="circular" width={28} height={28} />
                <Skeleton width="30%" height={24} />
                <Skeleton width="20%" height={20} />
              </Stack>
              <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
                <Skeleton variant="rectangular" height={48} sx={{ width: 100, borderRadius: 2 }} />
                <Skeleton variant="rectangular" height={48} sx={{ width: 100, borderRadius: 2 }} />
                <Skeleton variant="rectangular" height={48} sx={{ width: 100, borderRadius: 2 }} />
              </Stack>
            </Paper>
          ))}
        </Stack>
      ) : challenges.length === 0 ? (
        <Paper sx={{ p: 6, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', textAlign: 'center' }}>
          <Stack spacing={2} alignItems="center">
            <Box sx={{ width: 84, height: 84, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,87,168,0.15)', border: '1px solid rgba(0,87,168,0.4)', color: '#FEBE10' }}>
              <EmojiEventsOutlinedIcon sx={{ fontSize: 44 }} />
            </Box>
            <Typography variant="h5">لا توجد تحديات سابقة</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 440 }}>
              ستظهر هنا التحديات بعد انتهائها وتصحيح إجابات المشاركين.
            </Typography>
          </Stack>
        </Paper>
      ) : (
        <Stack spacing={2}>
          {challenges.map((c) => (
            <HistoryCard key={c.id} challenge={c} />
          ))}

          {hasMore && (
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Button
                variant="outlined"
                onClick={loadMore}
                disabled={loadingMore}
                startIcon={loadingMore ? <CircularProgress size={16} /> : undefined}
                sx={{ px: 4, borderColor: 'rgba(254,190,16,0.5)', color: '#FEBE10', '&:hover': { borderColor: '#FEBE10', bgcolor: 'rgba(254,190,16,0.08)' } }}
              >
                {loadingMore ? 'جارٍ التحميل…' : 'تحميل المزيد'}
              </Button>
            </Box>
          )}
        </Stack>
      )}
    </Stack>
  )
}
