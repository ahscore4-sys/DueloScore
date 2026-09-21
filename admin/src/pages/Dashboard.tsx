import { Typography, Stack, Grid, Button, Chip, Divider, Avatar, Box, Skeleton } from '@mui/material'
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'
import LiveTvIcon from '@mui/icons-material/LiveTv'
import SportsIcon from '@mui/icons-material/Sports'
import ArticleIcon from '@mui/icons-material/Article'
import QuizIcon from '@mui/icons-material/Quiz'
import ForumIcon from '@mui/icons-material/Forum'
import InsightsIcon from '@mui/icons-material/Insights'
import EventNoteIcon from '@mui/icons-material/EventNote'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import { useMemo } from 'react'
import GlassCard from '../core/ui/components/GlassCard'
import { useMatches } from '@/features/match/ui/useMatches'
import { useMatchEvents } from '@/features/match/ui/useMatchEvents'
import { isInPlay, isFinished, matchPeriodLabel } from '../lib/matchStatus'
import { formatKickoffTime } from '../lib/kickoff'
import { useLiveClocks } from '../hooks/useLiveClocks'
import { useMatchFlow, useFlowStatuses } from '../hooks/useMatchFlow'
import { useNavigate } from 'react-router-dom'
import type { MatchEvent } from '@/features/match/domain/match.types'

function todayIso(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

const eventLabels: Record<string, string> = {
  goal: '⚽ هدف',
  og: 'هدف في مرماه',
  opp_goal: 'هدف الخصم',
  yellow: '🟨 بطاقة صفراء',
  red: '🟥 بطاقة حمراء',
  pen_scored: 'ركلة جزاء مسجلة',
  pen_missed: 'ركلة جزاء ضائعة',
  sub: '🔁 تبديل',
  crossbar: 'العارضة',
  var: '📹 فحص VAR',
}

function minutesFromEvent(value: string): number {
  const m = value.replace(/[^\d+]/g, '')
  const parts = m.split('+')
  const base = parseInt(parts[0] ?? '0', 10) || 0
  const added = parts[1] ? parseInt(parts[1], 10) || 0 : 0
  return base * 100 + added
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { matches, loading } = useMatches()
  const minutes = useLiveClocks(matches)
  const statuses = useFlowStatuses(matches)
  const live = useMemo(() => matches.find((m) => isInPlay(statuses.get(m.id) ?? m.status)) ?? null, [matches, statuses])
  const flow = useMatchFlow(live)
  const { events } = useMatchEvents(live?.id)

  const today = todayIso()
  const todays = useMemo(
    () =>
      matches
        .filter((m) => m.date === today)
        .sort((a, b) => (a.kickoff < b.kickoff ? -1 : a.kickoff > b.kickoff ? 1 : 0)),
    [matches, today],
  )

  const latestEvents = useMemo(() => {
    const visible = events.filter((e) => e.type !== 'phase' && e.varDecision !== 'error')
    return [...visible].sort((a, b) => minutesFromEvent(b.minute) - minutesFromEvent(a.minute)).slice(0, 6)
  }, [events])

  const finishedCount = matches.filter((m) => isFinished(m.status)).length
  const liveCount = matches.filter((m) => isInPlay(statuses.get(m.id) ?? m.status)).length

  if (loading) {
    return (
      <Stack spacing={3}>
        <Stack spacing={0.5}>
          <Skeleton width={240} height={40} />
          <Skeleton width={180} height={18} />
        </Stack>
        <Skeleton variant="rounded" height={150} sx={{ borderRadius: 4 }} />
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Skeleton variant="rounded" height={220} sx={{ borderRadius: 4 }} />
          </Grid>
          <Grid item xs={12} md={4}>
            <Skeleton variant="rounded" height={220} sx={{ borderRadius: 4 }} />
          </Grid>
        </Grid>
      </Stack>
    )
  }

  return (
    <Stack spacing={3}>
      <Stack spacing={0.5}>
        <Typography variant="h4">الرئيسية (Dashboard)</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          نظرة عامة على المباريات والأنشطة في لوحة التحكم.
        </Typography>
      </Stack>

      {live ? (
        <GlassCard
          sx={{
            background: 'linear-gradient(135deg, rgba(0,87,168,0.45), rgba(10,13,28,0.6))',
            border: '1px solid rgba(0, 87, 168, 0.5)',
          }}
        >
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="center" justifyContent="space-between">
            <Stack spacing={0.5}>
              <Chip
                size="small"
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <FiberManualRecordIcon sx={{ fontSize: 13, color: '#00E676' }} />
                    <Typography component="span" sx={{ fontWeight: 700, color: '#00E676' }}>مباشر الآن</Typography>
                  </Box>
                }
                sx={{ bgcolor: 'rgba(0, 230, 118, 0.12)', width: 'fit-content' }}
              />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {live.competition} — {live.round} · {matchPeriodLabel(flow.status)} {minutes.get(live.id) ?? 0}'
              </Typography>
            </Stack>

            <Stack direction="row" spacing={4} alignItems="center">
              <Stack alignItems="center" spacing={0.5}>
                <Avatar sx={{ bgcolor: live.home.color, width: 56, height: 56, fontSize: 18, fontWeight: 800 }}>{live.home.short}</Avatar>
                <Typography sx={{ fontWeight: 700 }}>{live.home.name}</Typography>
              </Stack>
              <Typography variant="h2" sx={{ color: '#FEBE10' }}>
                {live.score.home + flow.penalties.home} — {live.score.away + flow.penalties.away}
              </Typography>
              <Stack alignItems="center" spacing={0.5}>
                <Avatar sx={{ bgcolor: live.away.color, width: 56, height: 56, fontSize: 18, fontWeight: 800, color: '#1A1400' }}>{live.away.short}</Avatar>
                <Typography sx={{ fontWeight: 700 }}>{live.away.name}</Typography>
              </Stack>
            </Stack>

            <Button
              variant="contained"
              startIcon={<LiveTvIcon />}
              onClick={() => navigate(`/matches/${live.id}`)}
              sx={{ gap: 1, background: 'linear-gradient(135deg, #00E676, #00C853)', color: '#062A16', '&:hover': { background: 'linear-gradient(135deg, #00E676, #00A84C)' } }}
            >
              التحكم بالمباراة
            </Button>
          </Stack>
        </GlassCard>
      ) : todays.length > 0 ? (
        <GlassCard
          sx={{
            background: 'linear-gradient(135deg, rgba(20,46,61,0.55), rgba(10,13,28,0.6))',
            border: '1px solid rgba(20, 46, 61, 0.6)',
          }}
        >
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="center" justifyContent="space-between">
            <Stack spacing={0.5}>
              <Chip
                size="small"
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <CalendarMonthIcon sx={{ fontSize: 13, color: '#FEBE10' }} />
                    <Typography component="span" sx={{ fontWeight: 700, color: '#FEBE10' }}>مباريات اليوم</Typography>
                  </Box>
                }
                sx={{ bgcolor: 'rgba(254, 190, 16, 0.12)', width: 'fit-content' }}
              />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                لا توجد مباراة مباشرة الآن — {todays.length} مباراة مجدولة اليوم.
              </Typography>
            </Stack>
          </Stack>
        </GlassCard>
      ) : (
        <GlassCard
          sx={{
            background: 'linear-gradient(135deg, rgba(20,46,61,0.55), rgba(10,13,28,0.6))',
            border: '1px solid rgba(20, 46, 61, 0.6)',
          }}
        >
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="center" justifyContent="space-between">
            <Stack spacing={0.5}>
              <Chip
                size="small"
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <EventNoteIcon sx={{ fontSize: 13, color: '#FEBE10' }} />
                    <Typography component="span" sx={{ fontWeight: 700, color: '#FEBE10' }}>لا توجد مباريات اليوم</Typography>
                  </Box>
                }
                sx={{ bgcolor: 'rgba(254, 190, 16, 0.12)', width: 'fit-content' }}
              />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                لا توجد مباراة مباشرة ولا مباريات مجدولة اليوم.
              </Typography>
            </Stack>
          </Stack>
        </GlassCard>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Stack spacing={3}>
            <GlassCard title="مباريات اليوم (Fixtures)" action={<Button size="small" onClick={() => navigate('/matches')}>عرض الكل</Button>}>
              {todays.length === 0 ? (
                <Typography variant="body2" sx={{ color: 'text.secondary', py: 3, textAlign: 'center' }}>
                  لا توجد مباريات مجدولة اليوم.
                </Typography>
              ) : (
                <Stack divider={<Divider />} spacing={1.5}>
                  {todays.map((m) => {
                    const started = isInPlay(statuses.get(m.id) ?? m.status)
                    return (
                      <Stack key={m.id} direction="row" spacing={2} alignItems="center" justifyContent="space-between" sx={{ py: 0.5 }}>
                        <Stack direction="row" spacing={2} alignItems="center">
                          <Typography variant="caption" sx={{ color: 'text.secondary', minWidth: 40 }}>
                            {started ? matchPeriodLabel(statuses.get(m.id) ?? m.status) : formatKickoffTime(m.kickoff)}
                          </Typography>
                          <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{m.home.name}</Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>×</Typography>
                          <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{m.away.name}</Typography>
                        </Stack>
                        <Stack direction="row" spacing={1} alignItems="center">
                          {started && (
                            <Typography sx={{ fontSize: 15, fontWeight: 900, color: '#FEBE10' }}>
                              {m.score.home} — {m.score.away}
                            </Typography>
                          )}
                          <Chip size="small" label={m.competition.split(' (')[0]} sx={{ bgcolor: 'rgba(255,255,255,0.06)' }} />
                        </Stack>
                      </Stack>
                    )
                  })}
                </Stack>
              )}
            </GlassCard>

            <GlassCard title="آخر الأحداث (Latest Events)">
              {live ? (
                latestEvents.length === 0 ? (
                  <Typography variant="body2" sx={{ color: 'text.secondary', py: 3, textAlign: 'center' }}>
                    لا توجد أحداث مسجلة بعد في مباراة «{live.home.name} × {live.away.name}».
                  </Typography>
                ) : (
                  <Stack divider={<Divider />} spacing={1}>
                    {latestEvents.map((e: MatchEvent) => (
                      <Stack key={e.id} direction="row" spacing={2} alignItems="center">
                        <Typography variant="caption" sx={{ color: '#FEBE10', fontWeight: 700, minWidth: 40 }}>{e.minute}</Typography>
                        <Typography sx={{ fontSize: 14 }}>{eventLabels[e.type] ?? e.type}</Typography>
                        <Typography sx={{ fontSize: 14, fontWeight: 700 }}>— {e.player || '—'}</Typography>
                        <Chip size="small" label={e.team === 'home' ? live.home.short : live.away.short} sx={{ bgcolor: 'rgba(255,255,255,0.06)', fontSize: 11 }} />
                      </Stack>
                    ))}
                  </Stack>
                )
              ) : (
                <Typography variant="body2" sx={{ color: 'text.secondary', py: 3, textAlign: 'center' }}>
                  الأحداث مباشرة تظهر هنا أثناء سير مباراة مباشرة.
                </Typography>
              )}
            </GlassCard>
          </Stack>
        </Grid>

        <Grid item xs={12} md={4}>
          <Stack spacing={3}>
            <GlassCard title="لمحة سريعة (Overview)">
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.5 }}>
                <Stack alignItems="center" spacing={0.5} sx={{ p: 1.5, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <SportsIcon sx={{ color: '#0057A8' }} />
                  <Typography variant="h5" sx={{ fontWeight: 900 }}>{todays.length}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>مباريات اليوم</Typography>
                </Stack>
                <Stack alignItems="center" spacing={0.5} sx={{ p: 1.5, borderRadius: 3, bgcolor: 'rgba(0,230,118,0.06)', border: '1px solid rgba(0,230,118,0.2)' }}>
                  <FiberManualRecordIcon sx={{ color: '#00E676', fontSize: 20 }} />
                  <Typography variant="h5" sx={{ fontWeight: 900, color: '#00E676' }}>{liveCount}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>مباشرة الآن</Typography>
                </Stack>
                <Stack alignItems="center" spacing={0.5} sx={{ p: 1.5, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <EventNoteIcon sx={{ color: '#FEBE10' }} />
                  <Typography variant="h5" sx={{ fontWeight: 900 }}>{matches.length}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>إجمالي المباريات</Typography>
                </Stack>
                <Stack alignItems="center" spacing={0.5} sx={{ p: 1.5, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <InsightsIcon sx={{ color: '#B0BEC5' }} />
                  <Typography variant="h5" sx={{ fontWeight: 900 }}>{finishedCount}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>مكتملة</Typography>
                </Stack>
              </Box>
            </GlassCard>

            <GlassCard title="إجراءات سريعة (Quick Actions)">
              <Grid container spacing={1.5}>
                {[
                  { icon: <ArticleIcon fontSize="large" />, label: 'خبر جديد', to: '/news/new' },
                  { icon: <QuizIcon fontSize="large" />, label: 'سؤال تحدي اليوم', to: '/challenges/bank' },
                  { icon: <ForumIcon fontSize="large" />, label: 'منشور الديوانية', to: '/diwaniya' },
                ].map(({ icon, label, to }) => (
                  <Grid key={to} item xs={6}>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => navigate(to)}
                      sx={{
                        width: '100%',
                        height: '100%',
                        flexDirection: 'column',
                        gap: 1,
                        py: 2.5,
                        borderRadius: 3,
                      }}
                    >
                      {icon}
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {label}
                      </Typography>
                    </Button>
                  </Grid>
                ))}
              </Grid>
            </GlassCard>
          </Stack>
        </Grid>
      </Grid>
    </Stack>
  )
}