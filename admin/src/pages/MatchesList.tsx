import { Box, Typography, Stack, Button, Chip, Accordion, AccordionSummary, AccordionDetails, Divider, Paper, TextField, MenuItem, IconButton, Tooltip, InputAdornment, Popover, CircularProgress } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import SportsIcon from '@mui/icons-material/Sports'
import SearchIcon from '@mui/icons-material/Search'
import SearchOffIcon from '@mui/icons-material/SearchOff'
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff'
import EditIcon from '@mui/icons-material/Edit'
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'
import ScheduleIcon from '@mui/icons-material/Schedule'
import CloseIcon from '@mui/icons-material/Close'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import TableChartIcon from '@mui/icons-material/TableChart'
import RefreshIcon from '@mui/icons-material/Refresh'
import BoltIcon from '@mui/icons-material/Bolt'
import LiveTvIcon from '@mui/icons-material/LiveTv'
import FlagIcon from '@mui/icons-material/Flag'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import type { PickersCalendarHeaderProps } from '@mui/x-date-pickers/PickersCalendarHeader'
import dayjs from 'dayjs'
import 'dayjs/locale/ar'
import { useState } from 'react'
import MatchStatusBadge from '../components/MatchStatusBadge'
import StandingsTab from '../components/StandingsTab'
import { useMatches } from '@/features/match/ui/useMatches'
import { useStandings } from '@/features/match/ui/useStandings'
import { isFinished, matchStatusLabel } from '../lib/matchStatus'
import { formatKickoffTime } from '../lib/kickoff'
import { useMatchesFilters } from '../hooks/useMatchesFilters'
import { useLiveScores } from '../hooks/useLiveScores'
import { useMatchTimers } from '../hooks/useMatchTimers'
import { useFlowStatuses } from '../hooks/useMatchFlow'
import type { Match, MatchStatus, Team } from '../types'
import { useNavigate } from 'react-router-dom'

const statusOptions = Object.keys(matchStatusLabel) as MatchStatus[]

const weekdays = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const arabicMonths = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']

function parseDate(iso: string) {
  const [y, mo, d] = iso.split('-').map(Number)
  const dt = new Date(y, mo - 1, d)
  return { weekday: weekdays[dt.getDay()], date: `${d} ${arabicMonths[mo - 1]} ${y}` }
}

function timeSortKey(kickoff: string): number {
  const m = kickoff.match(/(\d{1,2}):(\d{2})/)
  return m ? Number(m[1]) * 60 + Number(m[2]) : 24 * 60 + 1
}

function todayIso(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function compareMatches(a: Match, b: Match, today: string): number {
  const aToday = a.date === today
  const bToday = b.date === today
  if (aToday !== bToday) return aToday ? -1 : 1
  if (a.date !== b.date) return a.date > b.date ? -1 : 1
  const ta = timeSortKey(a.kickoff)
  const tb = timeSortKey(b.kickoff)
  if (ta !== tb) return tb - ta
  return 0
}

function CalendarHeader(props: PickersCalendarHeaderProps<dayjs.Dayjs>) {
  const { currentMonth, onMonthChange, view, onViewChange } = props
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1.5, py: 1 }}>
      <IconButton
        size="small"
        onClick={() => onMonthChange(currentMonth.subtract(1, 'month'), 'left')}
        sx={{ color: 'text.secondary' }}
      >
        <ChevronRightIcon sx={{ fontSize: 22 }} />
      </IconButton>
      <Button
        size="small"
        onClick={() => onViewChange?.(view === 'year' ? 'day' : 'year')}
        sx={{ color: '#FEBE10', fontWeight: 800, fontSize: 14, textTransform: 'none', minWidth: 130 }}
      >
        {view === 'year' ? currentMonth.format('YYYY') : currentMonth.format('MMMM YYYY')}
      </Button>
      <IconButton
        size="small"
        onClick={() => onMonthChange(currentMonth.add(1, 'month'), 'right')}
        sx={{ color: 'text.secondary' }}
      >
        <ChevronLeftIcon sx={{ fontSize: 22 }} />
      </IconButton>
    </Box>
  )
}

function TeamBadge({ team, right }: { team: Team; right?: boolean }) {
  return (
    <Stack alignItems="center" spacing={0.75} sx={{ flex: 1, minWidth: 0, order: right ? 2 : 0 }}>
      {team.logo ? (
        <Box
          component="img"
          src={team.logo}
          alt={team.name}
          sx={{
            height: { xs: 44, md: 52 },
            width: 'auto',
            maxWidth: { xs: 44, md: 52 },
            objectFit: 'contain',
          }}
        />
      ) : (
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: team.color,
            color: team.id === 'madrid' ? '#1A1400' : '#fff',
            fontWeight: 900,
            fontSize: 12,
            border: '2px solid rgba(255,255,255,0.14)',
            boxShadow: '0 6px 18px rgba(0,0,0,0.35)',
          }}
        >
          {team.short}
        </Box>
      )}
      <Typography noWrap sx={{ fontWeight: 800, fontSize: 13, textAlign: 'center', maxWidth: '100%' }}>{team.name}</Typography>
    </Stack>
  )
}

function StatPill({ icon, value, label, color }: { icon: React.ReactNode; value: string; label: string; color: string }) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1}
      sx={{
        px: 1.5,
        py: 1,
        borderRadius: 2.5,
        bgcolor: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <Box sx={{ color }}>{icon}</Box>
      <Stack spacing={0}>
        <Typography sx={{ fontWeight: 900, fontSize: 14, color: '#F4F7FF', lineHeight: 1.1 }}>{value}</Typography>
        <Typography sx={{ fontSize: 10, color: 'text.secondary', fontWeight: 700 }}>{label}</Typography>
      </Stack>
    </Stack>
  )
}

export default function MatchesList() {
  const navigate = useNavigate()
  const { matches, loading } = useMatches()
  const statuses = useFlowStatuses(matches)
  const { filters, set, clear, hasFilters, competitions, teams, filtered } = useMatchesFilters(matches, statuses)
  const minutes = useMatchTimers(matches)
  const scores = useLiveScores(matches)
  const standings = useStandings()
  const today = todayIso()
  const sorted = [...filtered].sort((a, b) => compareMatches(a, b, today))
  const dates = [...new Set(sorted.map((m) => m.date))]
  const [calAnchor, setCalAnchor] = useState<HTMLElement | null>(null)
  const [tab, setTab] = useState(0)

  const liveMatches = matches.filter((m) => minutes.get(m.id)?.live)
  const upcomingCount = matches.filter((m) => !isFinished(statuses.get(m.id) ?? m.status)).length
  const finishedCount = matches.filter((m) => isFinished(statuses.get(m.id) ?? m.status)).length
  const leader = standings.leagues[0]?.rows.find((r) => r.rank === 1)?.name ?? '—'

  return (
    <Stack spacing={3}>
      <Paper
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          overflow: 'hidden',
          borderRadius: 4,
          p: { xs: 2.5, md: 3 },
          background: 'linear-gradient(135deg, #060811 0%, #0A1E3D 55%, #0A0E1C 100%)',
          border: '1px solid rgba(0,87,168,0.35)',
          boxShadow: '0 8px 30px rgba(0,0,0,0.45)',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: -120,
            left: -80,
            width: 320,
            height: 320,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0,87,168,0.4), transparent 70%)',
            filter: 'blur(20px)',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: -140,
            right: -60,
            width: 340,
            height: 340,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(254,190,16,0.22), transparent 70%)',
            filter: 'blur(24px)',
          }}
        />
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          alignItems={{ xs: 'flex-start', md: 'center' }}
          spacing={2.5}
          sx={{ position: 'relative', zIndex: 1 }}
        >
          <Box sx={{ flex: 1 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
              <BoltIcon sx={{ fontSize: 20, color: '#FEBE10' }} />
              <Typography sx={{ color: '#FEBE10', fontWeight: 900, fontSize: 13, letterSpacing: 0.5 }}>
                {tab === 0 ? 'مركز المباريات' : 'جداول الترتيب'}
              </Typography>
            </Stack>
            <Typography variant="h4" sx={{ fontWeight: 900, color: '#F4F7FF' }}>
              {tab === 0 ? (
                <>المباريات <Box component="span" sx={{ color: '#8EC5FF' }}>(Matches)</Box></>
              ) : (
                <>جداول الترتيب <Box component="span" sx={{ color: '#8EC5FF' }}>(Standings)</Box></>
              )}
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(244,247,255,0.65)', mt: 0.5 }}>
              {tab === 0
                ? 'إدارة مباريات برشلونة وريال مدريد — جدولة، نتائج مباشرة، وترشيحات حية'
                : 'ترتيب حديث مباشر من مزوّد البيانات — البطولات الأربع'}
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            {tab === 0 ? (
              <>
                <StatPill icon={<SportsIcon sx={{ fontSize: 16 }} />} value={String(matches.length)} label="إجمالي" color="#8EC5FF" />
                <StatPill icon={<LiveTvIcon sx={{ fontSize: 16 }} />} value={String(liveMatches.length)} label="مباشر" color="#00E676" />
                <StatPill icon={<ScheduleIcon sx={{ fontSize: 16 }} />} value={String(upcomingCount)} label="قادمة" color="#FEBE10" />
                <StatPill icon={<FlagIcon sx={{ fontSize: 16 }} />} value={String(finishedCount)} label="منتهية" color="#90A4AE" />
              </>
            ) : (
              <>
                <StatPill icon={<TableChartIcon sx={{ fontSize: 16 }} />} value={String(standings.leagues.length)} label="بطولات" color="#8EC5FF" />
                <StatPill icon={<EmojiEventsIcon sx={{ fontSize: 16 }} />} value={leader} label="المتصدّر" color="#FEBE10" />
              </>
            )}
            {tab === 0 ? (
              <Button
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={() => navigate('/matches/upcoming')}
                sx={{ fontWeight: 900, borderRadius: 2.5, px: 2.5, py: 1, ml: 0.5, background: 'linear-gradient(135deg,#8EC5FF,#5AA9F6)', color: '#06223A', boxShadow: '0 8px 26px rgba(142,197,255,0.4)', '&:hover': { background: 'linear-gradient(135deg,#A5D3FF,#4E9BEC)' } }}
              >
                تحديث قائمة المباريات
              </Button>
            ) : (
              <Button
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={() => standings.refresh()}
                disabled={standings.refreshing}
                sx={{ fontWeight: 900, borderRadius: 2.5, px: 2.5, py: 1, ml: 0.5, background: 'linear-gradient(135deg,#8EC5FF,#5AA9F6)', color: '#06223A', boxShadow: '0 8px 26px rgba(142,197,255,0.4)', '&:hover': { background: 'linear-gradient(135deg,#A5D3FF,#4E9BEC)' } }}
              >
                تحديث الترتيب
              </Button>
            )}
          </Stack>
        </Stack>
      </Paper>

      <Box sx={{ display: 'flex', gap: 1, p: 0.75, width: 'fit-content', bgcolor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3 }}>
        {[
          { value: 0, icon: <SportsIcon sx={{ fontSize: 20 }} />, label: 'المباريات (Matches)' },
          { value: 1, icon: <TableChartIcon sx={{ fontSize: 20 }} />, label: 'جداول الترتيب (Standings)' },
        ].map((t) => {
          const active = tab === t.value
          return (
            <Button
              key={t.value}
              onClick={() => setTab(t.value)}
              sx={{
                px: 2.5,
                py: 1,
                borderRadius: 2,
                gap: 1,
                fontWeight: 800,
                fontSize: 14,
                bgcolor: active ? 'rgba(0,87,168,0.55)' : 'transparent',
                color: active ? '#fff' : 'text.secondary',
                boxShadow: active ? '0 4px 16px rgba(0,0,0,0.35)' : 'none',
                transition: 'all .2s ease',
                '&:hover': { bgcolor: active ? 'rgba(0,87,168,0.55)' : 'rgba(255,255,255,0.08)' },
              }}
            >
              {t.icon}
              {t.label}
            </Button>
          )
        })}
      </Box>

      {tab === 0 ? (
        <Stack spacing={3}>
      <Paper sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(14px)' }}>
        <Stack spacing={1.5}>
          <TextField
            size="small"
            placeholder="بحث بالفريق، البطولة أو الجولة…"
            value={filters.search}
            onChange={(e) => set({ search: e.target.value })}
            slotProps={{ input: { startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} /> } }}
            sx={{ width: '100%' }}
          />
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} flexWrap="wrap" useFlexGap>
          <TextField select size="small" label="البطولة" value={filters.competition} onChange={(e) => set({ competition: e.target.value })} sx={{ minWidth: 200 }}>
            <MenuItem value="">الكل</MenuItem>
            {competitions.map((c) => (
              <MenuItem key={c} value={c}>{c}</MenuItem>
            ))}
          </TextField>
          <TextField select size="small" label="الحالة" value={filters.status} onChange={(e) => set({ status: e.target.value as MatchStatus | '' })} sx={{ minWidth: 180 }}>
            <MenuItem value="">الكل</MenuItem>
            {statusOptions.map((s) => (
              <MenuItem key={s} value={s}>{matchStatusLabel[s]}</MenuItem>
            ))}
          </TextField>
          <TextField select size="small" label="الفريق" value={filters.team} onChange={(e) => set({ team: e.target.value })} sx={{ minWidth: 160 }}>
            <MenuItem value="">الكل</MenuItem>
            {teams.map((t) => (
              <MenuItem key={t} value={t}>{t}</MenuItem>
            ))}
          </TextField>
          <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ar">
            <TextField
              size="small"
              label="التاريخ"
              placeholder="اختر التاريخ"
              value={filters.date ? dayjs(filters.date).format('DD/MM/YYYY') : ''}
              onClick={(e) => setCalAnchor(e.currentTarget)}
              slotProps={{
                input: {
                  readOnly: true,
                  startAdornment: (
                    <InputAdornment position="start">
                      <CalendarMonthIcon sx={{ fontSize: 18, color: '#F4F7FF' }} />
                    </InputAdornment>
                  ),
                  endAdornment: filters.date ? (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => set({ date: '' })} sx={{ color: 'text.secondary' }}>
                        <CloseIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </InputAdornment>
                  ) : undefined,
                },
              }}
              sx={{
                minWidth: 160,
                cursor: 'pointer',
                '& .MuiInputBase-input': { cursor: 'pointer' },
                '& .MuiInputBase-adornedStart': { cursor: 'pointer' },
              }}
            />
            <Popover
              open={Boolean(calAnchor)}
              anchorEl={calAnchor}
              onClose={() => setCalAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              PaperProps={{
                sx: {
                  bgcolor: '#0E1428',
                  backgroundImage: 'none',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: 3,
                  boxShadow: '0 12px 40px rgba(0, 0, 0, 0.55)',
                  overflow: 'hidden',
                },
              }}
            >
              <DateCalendar
                value={filters.date ? dayjs(filters.date) : null}
                onChange={(d, _state, view) => {
                  if (view !== 'day') return
                  set({ date: d ? d.format('YYYY-MM-DD') : '' })
                  setCalAnchor(null)
                }}
                slots={{ calendarHeader: CalendarHeader }}
                sx={{ '& .MuiDayCalendar-weekDayLabel': { fontWeight: 700 } }}
              />
            </Popover>
          </LocalizationProvider>
          {hasFilters && (
            <Button variant="outlined" startIcon={<FilterAltOffIcon />} onClick={clear} sx={{ gap: 1 }}>
              مسح الفلاتر
            </Button>
          )}
          </Stack>
        </Stack>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress sx={{ color: '#0057A8' }} />
        </Box>
      ) : matches.length === 0 ? (
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
                bgcolor: 'rgba(0, 87, 168, 0.15)',
                border: '1px solid rgba(0, 87, 168, 0.4)',
                color: '#FEBE10',
              }}
            >
              <SportsIcon sx={{ fontSize: 44 }} />
            </Box>
            <Typography variant="h5">لا توجد مباريات بعد (No Matches)</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 440 }}>
              لا توجد مباريات بعد. يمكنك إضافة المباريات القادمة من المباريات المقررة عبر زر «إضافة مباراة».
            </Typography>
            <Button variant="contained" sx={{ gap: 1 }} onClick={() => navigate('/matches/upcoming')}>
              <AddIcon />
              إضافة مباراة
            </Button>
          </Stack>
        </Paper>
      ) : filtered.length === 0 ? (
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
                bgcolor: 'rgba(0, 87, 168, 0.15)',
                border: '1px solid rgba(0, 87, 168, 0.4)',
                color: '#FEBE10',
              }}
            >
              <SearchOffIcon sx={{ fontSize: 44 }} />
            </Box>
            <Typography variant="h5">لا توجد نتائج مطابقة</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 440 }}>
              لا توجد مباريات تطابق الفلاتر الحالية. جرّب تعديل البحث أو مسح الفلاتر.
            </Typography>
            <Button variant="outlined" startIcon={<FilterAltOffIcon />} onClick={clear} sx={{ gap: 1 }}>
              مسح الفلاتر
            </Button>
          </Stack>
        </Paper>
      ) : (
        dates.map((date) => {
          const parsed = parseDate(date)
          const dayMatches = sorted.filter((m) => m.date === date)
          const liveCount = dayMatches.filter((m) => minutes.get(m.id)?.live).length
          return (
            <Accordion
              key={date}
              defaultExpanded
              disableGutters
              sx={{
                borderRadius: '24px',
                border: date === today ? '1px solid rgba(254,190,16,0.5)' : '1px solid rgba(255, 255, 255, 0.12)',
                bgcolor: date === today ? 'rgba(254,190,16,0.05)' : 'rgba(255, 255, 255, 0.04)',
                backdropFilter: 'blur(12px)',
                boxShadow: date === today ? '0 0 26px rgba(254,190,16,0.14)' : 'none',
                overflow: 'hidden',
                '&:before': { display: 'none' },
                '&:first-of-type': { borderRadius: '24px' },
                '&:last-of-type': { borderRadius: '24px' },
                '&.Mui-expanded': { my: 0 },
                '& .MuiAccordionSummary-root': { borderRadius: '24px' },
                '& .MuiAccordionSummary-root.Mui-expanded': {
                  borderRadius: '24px',
                  borderBottomLeftRadius: 0,
                  borderBottomRightRadius: 0,
                },
                '& .MuiAccordionDetails-root': { borderRadius: '0 0 24px 24px' },
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon sx={{ color: 'text.secondary' }} />}
                sx={{
                  px: 3,
                  py: 1,
                  borderRadius: 4,
                  '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.05)' },
                  '& .MuiAccordionSummary-content': { alignItems: 'center', gap: 2 },
                }}
              >
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 3,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: date === today ? 'linear-gradient(135deg, rgba(254,190,16,0.55), rgba(166,113,0,0.4))' : 'linear-gradient(135deg, rgba(0, 87, 168, 0.5), rgba(10, 61, 107, 0.5))',
                    border: date === today ? '1px solid rgba(254,190,16,0.7)' : '1px solid rgba(0, 87, 168, 0.5)',
                    color: date === today ? '#1A1400' : '#FEBE10',
                  }}
                >
                  <CalendarMonthIcon sx={{ fontSize: 24 }} />
                </Box>
                <Stack spacing={0.25}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography sx={{ fontWeight: 900, fontSize: 16 }}>{parsed.weekday}</Typography>
                    {date === today && (
                      <Chip
                        size="small"
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <FiberManualRecordIcon sx={{ fontSize: 9, color: '#1A1400' }} />
                            <Typography component="span" sx={{ fontSize: 12, fontWeight: 900, color: '#1A1400' }}>اليوم</Typography>
                          </Box>
                        }
                        sx={{ bgcolor: '#FEBE10', borderRadius: 999, boxShadow: '0 0 12px rgba(254,190,16,0.5)' }}
                      />
                    )}
                  </Stack>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>{parsed.date}</Typography>
                </Stack>
                <Chip
                  size="small"
                  label={`${dayMatches.length} مباراة`}
                  sx={{ bgcolor: 'rgba(255, 255, 255, 0.06)', color: 'text.secondary', fontWeight: 700 }}
                />
                {liveCount > 0 && (
                  <Chip
                    size="small"
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <FiberManualRecordIcon sx={{ fontSize: 10, color: '#00E676' }} />
                        <Typography component="span" sx={{ fontSize: 12, fontWeight: 700, color: '#00E676' }}>{`${liveCount} مباشر`}</Typography>
                      </Box>
                    }
                    sx={{ bgcolor: 'rgba(0, 230, 118, 0.1)', color: '#00E676', fontWeight: 700 }}
                  />
                )}
              </AccordionSummary>

              <AccordionDetails sx={{ p: 0 }}>
                <Stack divider={<Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.08)' }} />}>
                  {dayMatches.map((m) => {
                    const status = statuses.get(m.id) ?? m.status
                    const sc = scores.get(m.id)
                    const mins = minutes.get(m.id)
                    const isLive = Boolean(mins?.live)
                    return (
                      <Box
                        key={m.id}
                        onClick={() => navigate(`/matches/${m.id}`)}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: { xs: 1.5, md: 2 },
                          px: { xs: 2, md: 3 },
                          py: 2,
                          cursor: 'pointer',
                          position: 'relative',
                          '&:hover': { bgcolor: 'rgba(0, 87, 168, 0.15)' },
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexGrow: 1, minWidth: 0, flexWrap: { xs: 'wrap', md: 'nowrap' }, justifyContent: 'center' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: { xs: 96, md: 118 }, flexShrink: 0 }}>
                            <Stack
                              direction="row"
                              alignItems="center"
                              spacing={0.6}
                              sx={{
                                px: 1.25,
                                py: 0.5,
                                borderRadius: 2,
                                bgcolor: isLive ? 'rgba(0,230,118,0.14)' : 'rgba(254,190,16,0.1)',
                                border: `1px solid ${isLive ? 'rgba(0,230,118,0.45)' : 'rgba(254,190,16,0.35)'}`,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <ScheduleIcon sx={{ fontSize: 13, color: isLive ? '#00E676' : '#FEBE10' }} />
                              <Typography sx={{ fontWeight: 900, fontSize: 13, color: isLive ? '#00E676' : '#FEBE10' }}>{formatKickoffTime(m.kickoff)}</Typography>
                            </Stack>
                          </Box>

                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: { xs: '100%', md: 230 }, order: { xs: 2, md: 1 }, justifyContent: { xs: 'flex-start', md: 'flex-start' } }}>
                            <TeamBadge team={m.home} />
                          </Box>

                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, px: { xs: 1, md: 2.5 }, order: { xs: 3, md: 2 } }}>
                            <Box
                              sx={{
                                width: { xs: 44, md: 54 },
                                height: { xs: 44, md: 54 },
                                borderRadius: '50%',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'linear-gradient(135deg, rgba(0,87,168,0.35), rgba(10,14,28,0.5))',
                                border: '1.5px solid rgba(254,190,16,0.35)',
                                boxShadow: 'inset 0 0 18px rgba(0,87,168,0.4)',
                              }}
                            >
                              {status === 'not_started' ? (
                                <Typography sx={{ fontWeight: 900, fontSize: 13, color: '#8EC5FF', fontFamily: '"Cairo", sans-serif' }}>VS</Typography>
                              ) : (
                                <Stack alignItems="center" spacing={0}>
                                  <Typography sx={{ color: '#FEBE10', fontWeight: 900, fontSize: { xs: 15, md: 17 }, lineHeight: 1, fontFamily: '"Cairo", sans-serif' }}>
                                    {sc ? `${sc.goals.home}` : `${m.score.home}`}<Box component="span" sx={{ mx: 0.5, color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>:</Box>{sc ? `${sc.goals.away}` : `${m.score.away}`}
                                  </Typography>
                                  {sc && (sc.penalties.home + sc.penalties.away) > 0 && (
                                    <Typography sx={{ color: '#FF8A80', fontWeight: 700, fontSize: 9, lineHeight: 1 }}>{sc.penalties.home}-{sc.penalties.away}</Typography>
                                  )}
                                </Stack>
                              )}
                            </Box>
                          </Box>

                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: { xs: '100%', md: 230 }, order: { xs: 4, md: 3 }, justifyContent: 'flex-start' }}>
                            <TeamBadge team={m.away} right />
                          </Box>
                        </Box>

                        <Box sx={{ display: 'flex', justifyContent: 'center', minWidth: 0, order: 4, flexDirection: 'column', alignItems: 'center', px: 0.5 }}>
                          <Chip
                            size="small"
                            label={m.competition}
                            sx={{
                              bgcolor: 'rgba(0, 87, 168, 0.22)',
                              color: '#90CAF9',
                              fontWeight: 800,
                              fontSize: 11,
                              border: '1px solid rgba(0, 87, 168, 0.45)',
                              maxWidth: 180,
                              '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
                            }}
                          />
                          {isLive && (
                            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.5 }}>
                              <FiberManualRecordIcon sx={{ fontSize: 10, color: '#00E676' }} />
                              <Typography sx={{ color: '#00E676', fontWeight: 800, fontSize: 12, fontFamily: 'Cairo, sans-serif' }}>{mins?.text ?? ''}</Typography>
                            </Stack>
                          )}
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, flexShrink: 0, order: 5, flexDirection: { xs: 'row', md: 'row' }, flexBasis: { md: 170 } }}>
                          {!mins?.live && status !== 'not_started' && (
                            <Typography sx={{ color: 'text.secondary', fontWeight: 600, fontSize: 13, fontFamily: 'Cairo, sans-serif', whiteSpace: 'nowrap' }}>
                              {mins?.text ?? '—'}
                            </Typography>
                          )}
                          <MatchStatusBadge status={status} fixedWidth={150} />
                          <Tooltip title="تعديل معلومات المباراة" placement="top">
                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); navigate(`/matches/${m.id}/info`) }} sx={{ color: 'text.secondary' }}>
                              <EditIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                    )
                  })}
                </Stack>
              </AccordionDetails>
            </Accordion>
          )
        })
      )}
        </Stack>
      ) : (
        <StandingsTab
          leagues={standings.leagues}
          loading={standings.loading}
          error={standings.error}
          refresh={standings.refresh}
        />
      )}
    </Stack>
  )
}
