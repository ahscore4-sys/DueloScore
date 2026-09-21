import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Typography, Stack, Box, Paper, Skeleton, Chip } from '@mui/material'
import QuizOutlinedIcon from '@mui/icons-material/QuizOutlined'
import HistoryIcon from '@mui/icons-material/History'
import EmojiEventsOutlinedIcon from '@mui/icons-material/EmojiEventsOutlined'
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline'
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'
import { useLatestChallenge } from './useLatestChallenge'
import { useWeeklyLeaderboard } from './useWeeklyLeaderboard'
import { CHALLENGE_STATUS_LABELS, deriveChallengeStatus, formatChallengeWindow, formatKuwaitDate, formatPoints, teamAccent } from '../domain/challenge.types'
import type { DailyChallenge } from '../domain/challenge.types'

function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), intervalMs); return () => clearInterval(t) }, [intervalMs])
  return now
}

const STATUS_COLORS: Record<string, string> = { scheduled: '#90CAF9', active: '#00E676', ended: '#9E9E9E' }

function ActiveChallengeSection({ challenge, loading }: { challenge: DailyChallenge | null; loading: boolean }) {
  const now = useNow()

  if (loading) {
    return (
      <Paper sx={{ p: 3.5, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <Skeleton width="35%" height={30} />
        <Skeleton width="55%" height={20} sx={{ mt: 1 }} />
        <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
          <Skeleton variant="rectangular" height={84} sx={{ flex: 1, borderRadius: 3 }} />
          <Skeleton variant="rectangular" height={84} sx={{ flex: 1, borderRadius: 3 }} />
          <Skeleton variant="rectangular" height={84} sx={{ flex: 1, borderRadius: 3 }} />
        </Stack>
      </Paper>
    )
  }

  if (!challenge) {
    return (
      <Paper sx={{ p: 5, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', textAlign: 'center' }}>
        <Stack spacing={2} alignItems="center">
          <Box sx={{ width: 84, height: 84, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,87,168,0.15)', border: '1px solid rgba(0,87,168,0.4)', color: '#FEBE10' }}>
            <QuizOutlinedIcon sx={{ fontSize: 44 }} />
          </Box>
          <Typography variant="h5">لا يوجد تحدي منشور بعد</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 440 }}>
            التحدي يُنشر تلقائياً كل يوم. تأكد من تفعيل أسئلة في البنك ليتم سحبها.
          </Typography>
        </Stack>
      </Paper>
    )
  }

  const status = deriveChallengeStatus(challenge, now)
  const statusColor = STATUS_COLORS[status]
  const ended = status === 'ended'
  const responded = challenge.stats.respondedCount
  const correct = challenge.stats.correctCount
  const accuracy = responded > 0 ? Math.round((correct / responded) * 100) : 0

  return (
    <Paper
      sx={{
        p: 3.5,
        borderRadius: 4,
        background: ended
          ? 'rgba(255,255,255,0.04)'
          : 'linear-gradient(135deg, rgba(0,87,168,0.35), rgba(10,13,28,0.6))',
        border: ended ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,87,168,0.5)',
        backdropFilter: 'blur(14px)',
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
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {formatChallengeWindow(challenge.startTime, challenge.endTime)}
        </Typography>
        {!ended && (
          <Typography variant="caption" sx={{ color: 'text.secondary', ml: 'auto' }}>
            النتائج تظهر بعد الانتهاء
          </Typography>
        )}
      </Stack>

      <Stack direction="row" spacing={2} sx={{ mt: 2.5 }} flexWrap="wrap" useFlexGap>
        <StatMini icon={<PeopleOutlineIcon sx={{ fontSize: 16, color: '#90CAF9' }} />} value={formatPoints(responded)} label="مشارك" />
        {ended ? (
          <>
            <StatMini icon={<EmojiEventsOutlinedIcon sx={{ fontSize: 16, color: '#00E676' }} />} value={formatPoints(correct)} label="صحيحة" />
            <StatMini icon={<EmojiEventsOutlinedIcon sx={{ fontSize: 16, color: '#FEBE10' }} />} value={`${accuracy}%`} label="الدقة" />
          </>
        ) : (
          <StatMini icon={<PeopleOutlineIcon sx={{ fontSize: 16, color: '#FEBE10' }} />} value={formatPoints(challenge.stats.assignedCount)} label="مُسند" />
        )}
      </Stack>

      {ended && challenge.topPerformers.length > 0 && (
        <Box sx={{ mt: 2.5, pt: 2, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <Typography sx={{ fontWeight: 800, fontSize: 13, color: 'text.secondary', mb: 1 }}>أسرع الإجابات الصحيحة</Typography>
          <Stack spacing={0.75}>
            {challenge.topPerformers.slice(0, 5).map((p, i) => (
              <Stack key={p.userId} direction="row" alignItems="center" spacing={1.5}>
                <Typography sx={{ fontWeight: 800, fontSize: 13, color: i === 0 ? '#FEBE10' : 'text.secondary', width: 22 }}>{i + 1}</Typography>
                <Typography sx={{ fontWeight: 700, fontSize: 13, flexGrow: 1 }}>{p.userName}</Typography>
                {p.tierName && (
                  <Chip label={p.tierName} size="small" sx={{ fontWeight: 800, fontSize: 10, height: 19, color: p.tierColor, bgcolor: `${p.tierColor}18`, border: `1px solid ${p.tierColor}44` }} />
                )}
              </Stack>
            ))}
          </Stack>
        </Box>
      )}

      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 2 }}>
        نُشر بواسطة {challenge.publishedBy || '—'}
      </Typography>
    </Paper>
  )
}

function StatMini({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <Box sx={{ flex: 1, minWidth: 90, px: 2, py: 1.5, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
      <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.5}>
        {icon}
        <Typography sx={{ fontWeight: 800, fontSize: 18 }}>{value}</Typography>
      </Stack>
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}>{label}</Typography>
    </Box>
  )
}

function LeaderboardSection() {
  const { leaderboard, loading, weekLabel } = useWeeklyLeaderboard()

  return (
    <Paper sx={{ p: 3, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(14px)' }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
        <EmojiEventsOutlinedIcon sx={{ color: '#FEBE10', fontSize: 22 }} />
        <Typography sx={{ fontWeight: 800, fontSize: 16 }}>متصدرو الأسبوع</Typography>
      </Stack>
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 2 }}>{weekLabel}</Typography>

      {loading ? (
        <Stack spacing={1}>{[0, 1, 2].map((i) => <Skeleton key={i} variant="rectangular" height={40} sx={{ borderRadius: 2 }} />)}</Stack>
      ) : !leaderboard || leaderboard.entries.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 3 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>لا توجد نتائج لهذا الأسبوع بعد.</Typography>
        </Box>
      ) : (
        <Stack spacing={0.5}>
          {leaderboard.entries.slice(0, 7).map((entry, i) => {
            const rank = i + 1
            const rankColor = rank === 1 ? '#FEBE10' : rank === 2 ? '#90CAF9' : rank === 3 ? '#FF8A65' : 'text.secondary'
            return (
              <Stack key={entry.userId} direction="row" alignItems="center" spacing={1.5} sx={{ py: 0.75, px: 1.5, borderRadius: 2, bgcolor: i === 0 ? 'rgba(254,190,16,0.08)' : 'transparent' }}>
                <Typography sx={{ fontWeight: 800, fontSize: 14, color: rankColor, width: 24, textAlign: 'center' }}>{rank}</Typography>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: teamAccent(entry.userTeam), flexShrink: 0 }} />
                <Typography sx={{ fontWeight: 700, fontSize: 13, flexGrow: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.userName}</Typography>
                {entry.tierName && (
                  <Chip label={entry.tierName} size="small" sx={{ fontWeight: 800, fontSize: 10, height: 19, color: entry.tierColor, bgcolor: `${entry.tierColor}18`, border: `1px solid ${entry.tierColor}44` }} />
                )}
                <Typography sx={{ fontWeight: 800, fontSize: 13, color: '#FEBE10', whiteSpace: 'nowrap' }}>{formatPoints(entry.weekPoints)} نقطة</Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>{entry.daysPlayed}/7</Typography>
              </Stack>
            )
          })}
        </Stack>
      )}
    </Paper>
  )
}

export default function ChallengeDashboardPage() {
  const navigate = useNavigate()
  const { challenge, loading } = useLatestChallenge()

  return (
    <Stack spacing={3}>
      <Stack spacing={0.5}>
        <Typography variant="h4">تحدي اليوم (Today's Challenge)</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          التحدي يُنشر تلقائياً كل يوم. متابعة التحدي النشط ومتصدرين الأسبوع.
        </Typography>
      </Stack>

      <ActiveChallengeSection challenge={challenge} loading={loading} />

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
        <Paper
          onClick={() => navigate('/challenges/bank')}
          sx={{
            p: 3, borderRadius: 4, cursor: 'pointer',
            bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)',
            transition: 'border-color 0.2s, transform 0.15s',
            '&:hover': { borderColor: 'rgba(0,87,168,0.5)', transform: 'translateY(-2px)' },
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ width: 44, height: 44, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,87,168,0.2)', border: '1px solid rgba(0,87,168,0.4)', color: '#90CAF9' }}>
              <QuizOutlinedIcon />
            </Box>
            <Stack spacing={0.25}>
              <Typography sx={{ fontWeight: 800 }}>بنك الأسئلة</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>إضافة وتعديل وتفعيل الأسئلة</Typography>
            </Stack>
          </Stack>
        </Paper>

        <Paper
          onClick={() => navigate('/challenges/history')}
          sx={{
            p: 3, borderRadius: 4, cursor: 'pointer',
            bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)',
            transition: 'border-color 0.2s, transform 0.15s',
            '&:hover': { borderColor: 'rgba(254,190,16,0.5)', transform: 'translateY(-2px)' },
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ width: 44, height: 44, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(254,190,16,0.15)', border: '1px solid rgba(254,190,16,0.35)', color: '#FEBE10' }}>
              <HistoryIcon />
            </Box>
            <Stack spacing={0.25}>
              <Typography sx={{ fontWeight: 800 }}>سجل التحديات</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>التحديات السابقة مع النتائج</Typography>
            </Stack>
          </Stack>
        </Paper>
      </Box>

      <LeaderboardSection />
    </Stack>
  )
}
