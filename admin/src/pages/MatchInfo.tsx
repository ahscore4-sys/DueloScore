import { Box, Typography, Stack, Grid, TextField, Chip, Paper, Button, InputAdornment, IconButton, Popover, Tooltip, Autocomplete, CircularProgress } from '@mui/material'
import SaveIcon from '@mui/icons-material/Save'
import StadiumIcon from '@mui/icons-material/Stadium'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver'
import TvIcon from '@mui/icons-material/Tv'
import VideocamIcon from '@mui/icons-material/Videocam'
import DeleteIcon from '@mui/icons-material/Delete'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import CloseIcon from '@mui/icons-material/Close'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import RefreshIcon from '@mui/icons-material/Refresh'
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar'
import { TimeClock } from '@mui/x-date-pickers/TimeClock'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import type { PickersCalendarHeaderProps } from '@mui/x-date-pickers/PickersCalendarHeader'
import dayjs from 'dayjs'
import 'dayjs/locale/ar'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMatch } from '@/features/match/ui/useMatch'
import { updateMatchFields } from '@/features/match/data/match.service'
import { mainCompetitions } from '../mockData'
import SearchPickDialog from '../components/SearchPickDialog'
import ConfirmDialog from '@/core/ui/components/ConfirmDialog'
import { fetchMatchById } from '@/features/match/data/apiFootball.service'
import { API_LEAGUE_TO_COMPETITION, knownTeamFlag } from '@/features/match/domain/match.constants'
import CountryFlag from '@/core/ui/components/CountryFlag'
import { useCoverageData } from '@/features/coverage/ui/useCoverageData'
import RefereePickDialog from '@/features/coverage/ui/components/RefereePickDialog'
import type { RefereeAssignment } from '@/types'
import LocalPoliceIcon from '@mui/icons-material/LocalPolice'

const KUWAIT_OFFSET = 3

// Stored kickoff is UTC "HH:mm"; Kuwait is fixed UTC+3 (no DST).
function shiftTime(hhmm: string, hours: number): string {
  const m = hhmm.match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return hhmm
  const H = Number(m[1])
  const M = Number(m[2])
  const total = (((H + hours) % 24) + 24) % 24
  return `${String(total).padStart(2, '0')}:${String(M).padStart(2, '0')}`
}

function kuwaitFromUtc(utc: string): string {
  return shiftTime(utc, KUWAIT_OFFSET)
}

function utcFromKuwait(kuwait: string): string {
  return shiftTime(kuwait, -KUWAIT_OFFSET)
}

function format12(hhmm: string): string {
  const m = hhmm.match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return hhmm
  const H = Number(m[1])
  const period = H >= 12 ? 'مساءً' : 'صباحاً'
  const h12 = H % 12 || 12
  return `${h12}:${m[2]} ${period}`
}

function toSeasonText(v: string): string {
  if (/^\d{4}$/.test(v)) return `${v}/${String(Number(v) + 1).slice(2)}`
  return v
}

function splitKickoff(k: string): { prefix: string; time: string } {
  const m = k.match(/(\d{1,2}:\d{2})/)
  if (!m) return { prefix: k, time: '' }
  const prefix = k.replace(m[1], '').replace(/\s*—\s*$/, '').trim()
  return { prefix, time: m[1] }
}

function joinKickoff(prefix: string, time: string): string {
  return prefix ? `${prefix} — ${time}` : time
}

const popoverPaper = {
  bgcolor: '#0E1428',
  backgroundImage: 'none',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  borderRadius: 3,
  boxShadow: '0 12px 40px rgba(0, 0, 0, 0.55)',
  overflow: 'hidden',
}

const arabicMonths = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
const arabicDays = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

function CalendarHeader(props: PickersCalendarHeaderProps<dayjs.Dayjs>) {
  const { currentMonth, onMonthChange, view, onViewChange } = props
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1.5, py: 1 }}>
      <IconButton size="small" onClick={() => onMonthChange(currentMonth.subtract(1, 'month'), 'left')} sx={{ color: 'text.secondary' }}>
        <ChevronRightIcon sx={{ fontSize: 22 }} />
      </IconButton>
      <Button
        size="small"
        onClick={() => onViewChange?.(view === 'year' ? 'day' : 'year')}
        sx={{ color: '#FEBE10', fontWeight: 800, fontSize: 14, textTransform: 'none', minWidth: 130 }}
      >
        {view === 'year' ? currentMonth.format('YYYY') : `${arabicMonths[currentMonth.month()]} ${currentMonth.format('YYYY')}`}
      </Button>
      <IconButton size="small" onClick={() => onMonthChange(currentMonth.add(1, 'month'), 'right')} sx={{ color: 'text.secondary' }}>
        <ChevronLeftIcon sx={{ fontSize: 22 }} />
      </IconButton>
    </Box>
  )
}

export default function MatchInfo() {
  const navigate = useNavigate()
  const { id: matchId } = useParams<{ id: string }>()
  const { match } = useMatch(matchId)
  const { stadiums: stadiumOptions, commentators: commentatorOptions, referees: refereeOptions, channels: channelOptions } = useCoverageData()
  const [competition, setCompetition] = useState('')
  const [stadium, setStadium] = useState('')
  const [round, setRound] = useState('')
  const [season, setSeason] = useState('')
  const [date, setDate] = useState('')
  const [kickoff, setKickoff] = useState('')
  const [commentators, setCommentators] = useState<string[]>([])
  const [channels, setChannels] = useState<string[]>([])
  const [referees, setReferees] = useState<RefereeAssignment[]>([])
  const [summaryVideoUrl, setSummaryVideoUrl] = useState('')
  const [saved, setSaved] = useState(false)
  const [savedLeaving, setSavedLeaving] = useState(false)
  const [saving, setSaving] = useState(false)
  const [calAnchor, setCalAnchor] = useState<HTMLElement | null>(null)
  const [timeAnchor, setTimeAnchor] = useState<HTMLElement | null>(null)
  const [commentatorOpen, setCommentatorOpen] = useState(false)
  const [channelOpen, setChannelOpen] = useState(false)
  const [refereeOpen, setRefereeOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const prevId = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (!match || prevId.current === matchId) return
    prevId.current = matchId
    setCompetition(API_LEAGUE_TO_COMPETITION[match.competition] ?? match.competition)
    setStadium(match.stadium)
    setRound(match.round)
    setSeason(toSeasonText(match.season))
    setDate(match.date)
    setKickoff(match.kickoff)
    setCommentators(match.commentators)
    setChannels(match.channels)
    setReferees(match.referees ?? [])
    setSummaryVideoUrl(match.summaryVideoUrl ?? '')
    setSaved(false)
  }, [match, matchId])

  const kickoffTime = splitKickoff(kickoff).time
  const kuwaitKickoff = kickoffTime ? kuwaitFromUtc(kickoffTime) : ''
  const pickerValue = kuwaitKickoff ? dayjs(`2000-01-01T${kuwaitKickoff}:00`) : null

  const summaryVideoUrlError = summaryVideoUrl.trim().length > 0 && !/^https?:\/\/.+/.test(summaryVideoUrl.trim())

  const save = async () => {
    if (!match || saving) return
    setSaving(true)
    try {
      await updateMatchFields(match.id, { competition, stadium, round, season, date, kickoff, commentators, channels, referees, summaryVideoUrl: summaryVideoUrl.trim() })
      setSaved(true)
      setSavedLeaving(false)
    } finally {
      setSaving(false)
    }
  }

  const refreshFromApi = async () => {
    if (!match?.fixtureId) return
    setRefreshing(true)
    try {
      const data = await fetchMatchById(match.fixtureId)
      if (!data) return
      const fixture = data.response?.[0]?.fixture
      const league = data.response?.[0]?.league
      if (fixture) {
        if (league?.name) setCompetition(API_LEAGUE_TO_COMPETITION[league.name] ?? league.name)
        if (league?.round) setRound(league.round.replace(/\D/g, ''))
        if (league?.season) setSeason(toSeasonText(String(league.season)))
        if (fixture.date) {
          setDate(fixture.date.slice(0, 10))
          const t = fixture.date.slice(11, 16)
          if (t) setKickoff((k) => joinKickoff(splitKickoff(k).prefix, t))
        }
      }
      if (data.response?.[0]?.venue?.name) setStadium(data.response[0].venue.name)
    } finally {
      setRefreshing(false)
    }
  }

  const handleDelete = async () => {
    if (!match || deleting) return
    setDeleting(true)
    try {
      const { deleteMatch } = await import('@/features/match/data/match.service')
      await deleteMatch(match.id)
      navigate('/matches', { replace: true })
    } finally {
      setDeleting(false)
    }
  }

  useEffect(() => {
    if (!saved) return
    const hide = setTimeout(() => setSavedLeaving(true), 2000)
    const done = setTimeout(() => setSaved(false), 2400)
    return () => {
      clearTimeout(hide)
      clearTimeout(done)
    }
  }, [saved])

  if (!match) return null

  const dateLabel = date ? (() => {
    const d = dayjs(date)
    return `${arabicDays[d.day()]} ${d.date()} ${arabicMonths[d.month()]} ${d.year()}`
  })() : ''

  return (
    <Stack spacing={2.5}>
      {/* Hero header */}
      <Paper
        sx={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 4,
          p: { xs: 2.5, md: 3 },
          background: 'linear-gradient(135deg, #0A1E3D 0%, #060811 60%, #0A0E1C 100%)',
          border: '1px solid rgba(0,87,168,0.35)',
          boxShadow: '0 8px 30px rgba(0,0,0,0.45)',
          '::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(900px 220px at 85% -30%, rgba(0,87,168,0.35), transparent 60%), radial-gradient(700px 200px at 10% 120%, rgba(254,190,16,0.18), transparent 60%)',
            pointerEvents: 'none',
          },
        }}
      >
        <Stack
          direction={{ xs: 'row', md: 'row' }}
          alignItems="center"
          justifyContent="space-between"
          spacing={1.5}
          sx={{ position: 'relative', zIndex: 1 }}
        >
          <Stack direction="row" alignItems="center" spacing={2} sx={{ flex: 1, minWidth: 0 }}>
            <Box
              component="img"
              src={match.home.logo}
              alt={match.home.name}
              sx={{ height: { xs: 56, md: 72 }, width: 'auto', maxWidth: { xs: 56, md: 72 }, objectFit: 'contain', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.5))' }}
            />
            <Stack spacing={0.25} sx={{ minWidth: 0 }}>
              <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
                {knownTeamFlag(match.home) && <CountryFlag src={knownTeamFlag(match.home)} alt="Spain" size={15} />}
                <Typography noWrap sx={{ fontWeight: 900, fontSize: { xs: 16, md: 20 } }}>{match.home.name}</Typography>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                <EmojiEventsIcon sx={{ fontSize: 15, color: '#FEBE10' }} />
                <Typography sx={{ fontSize: 12, color: 'text.secondary', fontWeight: 700 }}>{competition || '—'}</Typography>
              </Stack>
            </Stack>
          </Stack>

          <Box sx={{ textAlign: 'center', flexShrink: 0, px: { xs: 1, md: 2 } }}>
            <Typography sx={{ fontWeight: 900, fontSize: { xs: 20, md: 26 }, color: '#FEBE10', fontFamily: '"Cairo", sans-serif', lineHeight: 1.1 }}>VS</Typography>
            <Typography sx={{ fontSize: { xs: 12, md: 14 }, fontWeight: 800, color: '#8EC5FF', mt: 0.5, whiteSpace: 'nowrap' }}>
              {kuwaitKickoff ? format12(kuwaitKickoff) : '—'}
            </Typography>
          </Box>

          <Stack direction="row" alignItems="center" spacing={2} sx={{ flex: 1, minWidth: 0, justifyContent: 'flex-end' }}>
            <Stack spacing={0.25} sx={{ minWidth: 0, alignItems: 'flex-end' }}>
              <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
                {knownTeamFlag(match.away) && <CountryFlag src={knownTeamFlag(match.away)} alt="Spain" size={15} />}
                <Typography noWrap sx={{ fontWeight: 900, fontSize: { xs: 16, md: 20 } }}>{match.away.name}</Typography>
              </Stack>
              <Typography sx={{ fontSize: 12, color: 'text.secondary', fontWeight: 700 }}>{dateLabel || '—'}</Typography>
            </Stack>
            <Box
              component="img"
              src={match.away.logo}
              alt={match.away.name}
              sx={{ height: { xs: 56, md: 72 }, width: 'auto', maxWidth: { xs: 56, md: 72 }, objectFit: 'contain', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.5))' }}
            />
          </Stack>
        </Stack>

        <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="center" sx={{ position: 'relative', zIndex: 1, mt: 2, gap: 0.75 }}>
          <Chip size="small" label={`الجولة: ${round || '—'}`} sx={{ bgcolor: 'rgba(0,87,168,0.3)', color: '#8EC5FF', fontWeight: 700, border: '1px solid rgba(0,87,168,0.5)' }} />
          <Chip size="small" label={`الموسم: ${season ? toSeasonText(season) : '—'}`} sx={{ bgcolor: 'rgba(254,190,16,0.12)', color: '#FEBE10', fontWeight: 700, border: '1px solid rgba(254,190,16,0.4)' }} />
          <Chip size="small" label={dateLabel || '—'} sx={{ bgcolor: 'rgba(255,255,255,0.06)', color: 'text.secondary', fontWeight: 700 }} />
          <Chip size="small" label={kuwaitKickoff ? format12(kuwaitKickoff) : '—'} sx={{ bgcolor: 'rgba(255,255,255,0.06)', color: 'text.secondary', fontWeight: 700 }} />
        </Stack>
      </Paper>

      <Paper sx={{ p: 3, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(14px)' }}>
        <Stack spacing={3}>
          <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ar">
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Autocomplete
                  freeSolo
                  options={mainCompetitions}
                  value={competition}
                  onChange={(_, v) => setCompetition(v ?? '')}
                  renderInput={(params) => <TextField {...params} label="البطولة (Competition)" fullWidth />}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      height: 56,
                      '& input': { py: '14px' },
                    },
                  }}
                  slotProps={{
                    paper: {
                      sx: {
                        bgcolor: '#0E1428',
                        border: '1px solid rgba(255,255,255,0.12)',
                        boxShadow: '0 12px 40px rgba(0,0,0,0.55)',
                        '& .MuiAutocomplete-option': {
                          color: '#F4F7FF',
                          '&:hover': { bgcolor: 'rgba(0,87,168,0.35)' },
                          '&[aria-selected="true"]': { bgcolor: 'rgba(0,87,168,0.55)' },
                        },
                      },
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Autocomplete
                  freeSolo
                  options={stadiumOptions}
                  value={stadium}
                  onChange={(_, v) => setStadium(v ?? '')}
                  renderInput={(params) => <TextField {...params} label="الملعب (Stadium)" placeholder="اختر من الملاعب المخزنة أو اكتب اسماً جديداً" fullWidth />}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      height: 56,
                      '& input': { py: '14px' },
                    },
                  }}
                  slotProps={{
                    paper: {
                      sx: {
                        bgcolor: '#0E1428',
                        border: '1px solid rgba(255,255,255,0.12)',
                        boxShadow: '0 12px 40px rgba(0,0,0,0.55)',
                        '& .MuiAutocomplete-option': {
                          color: '#F4F7FF',
                          '&:hover': { bgcolor: 'rgba(0,87,168,0.35)' },
                          '&[aria-selected="true"]': { bgcolor: 'rgba(0,87,168,0.55)' },
                        },
                      },
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="رقم الجولة (Round)"
                  type="text"
                  inputMode="numeric"
                  value={round}
                  onChange={(e) => setRound(e.target.value.replace(/\D/g, ''))}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="الموسم (Season)"
                  value={season}
                  onChange={(e) => setSeason(toSeasonText(e.target.value))}
                  fullWidth
                  placeholder="مثال: 2026/27"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="تاريخ المباراة (Date)"
                  placeholder="اختر التاريخ"
                  value={dateLabel}
                  onClick={(e) => setCalAnchor(e.currentTarget)}
                  fullWidth
                  slotProps={{
                    input: {
                      readOnly: true,
                      startAdornment: (
                        <InputAdornment position="start">
                          <CalendarMonthIcon sx={{ fontSize: 18, color: '#F4F7FF' }} />
                        </InputAdornment>
                      ),
                    },
                  }}
                  sx={{
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
                  PaperProps={{ sx: popoverPaper }}
                >
                  <DateCalendar
                    value={date ? dayjs(date) : null}
                    onChange={(d, _state, view) => {
                      if (view !== 'day') return
                      setDate(d ? d.format('YYYY-MM-DD') : '')
                      setCalAnchor(null)
                    }}
                    slots={{ calendarHeader: CalendarHeader }}
                    sx={{ '& .MuiDayCalendar-weekDayLabel': { fontWeight: 700 } }}
                  />
                </Popover>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="وقت الانطلاق (Kickoff - توقيت الكويت)"
                  placeholder="اختر الوقت"
                  value={kuwaitKickoff ? format12(kuwaitKickoff) : ''}
                  onClick={(e) => setTimeAnchor(e.currentTarget)}
                  fullWidth
                  slotProps={{
                    input: {
                      readOnly: true,
                      startAdornment: (
                        <InputAdornment position="start">
                          <AccessTimeIcon sx={{ fontSize: 18, color: '#F4F7FF' }} />
                        </InputAdornment>
                      ),
                    },
                  }}
                  sx={{
                    cursor: 'pointer',
                    '& .MuiInputBase-input': { cursor: 'pointer' },
                    '& .MuiInputBase-adornedStart': { cursor: 'pointer' },
                  }}
                />
                <Popover
                  open={Boolean(timeAnchor)}
                  anchorEl={timeAnchor}
                  onClose={() => setTimeAnchor(null)}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                  PaperProps={{ sx: popoverPaper }}
                >
                  <Box sx={{ px: 2, pt: 1.5, pb: 0.5 }}>
                    <Typography sx={{ fontWeight: 800, fontSize: 13, color: '#8EC5FF' }}>وقت الانطلاق — توقيت الكويت (12 ساعة)</Typography>
                  </Box>
                  <TimeClock
                    value={pickerValue}
                    ampm
                    autoFocus
                    onChange={(d) => {
                      if (!d) return
                      const kuwait = d.format('HH:mm')
                      setKickoff((k) => joinKickoff(splitKickoff(k).prefix, utcFromKuwait(kuwait)))
                    }}
                  />
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2.5, pb: 2 }}>
                    <Typography sx={{ color: '#FEBE10', fontWeight: 800, fontSize: 18, fontFamily: 'Cairo, sans-serif' }}>
                      {kuwaitKickoff ? format12(kuwaitKickoff) : '—'}
                    </Typography>
                    <Button size="small" variant="contained" onClick={() => setTimeAnchor(null)}>تم</Button>
                  </Stack>
                </Popover>
              </Grid>
            </Grid>
          </LocalizationProvider>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems="stretch">
            <Box
              onClick={() => setCommentatorOpen(true)}
              sx={{ flex: 1, border: '1px dashed rgba(254,190,16,0.45)', borderRadius: 2, p: 1.5, cursor: 'pointer', bgcolor: 'rgba(254,190,16,0.04)', transition: 'background .15s ease', '&:hover': { bgcolor: 'rgba(254,190,16,0.08)' } }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: commentators.length ? 1 : 0 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <RecordVoiceOverIcon sx={{ fontSize: 18, color: '#FEBE10' }} />
                  <Typography sx={{ fontWeight: 800, fontSize: 14, color: '#FEBE10' }}>المعلقون (Commentators)</Typography>
                </Stack>
                <KeyboardArrowDownIcon sx={{ color: 'text.secondary' }} />
              </Stack>
              {commentators.length === 0 ? (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>اضغط لاختيار المعلقين — البحث مدعوم</Typography>
              ) : (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                  {commentators.map((c) => (
                    <Chip
                      key={c}
                      label={c}
                      size="small"
                      onDelete={(e) => {
                        e.stopPropagation()
                        setCommentators((l) => l.filter((v) => v !== c))
                      }}
                      deleteIcon={<CloseIcon fontSize="small" sx={{ color: '#FEBE10' }} />}
                      sx={{ bgcolor: 'rgba(254,190,16,0.15)', color: '#FEBE10', fontWeight: 700, border: '1px solid rgba(254,190,16,0.4)', '& .MuiChip-deleteIcon': { margin: '0', marginInlineStart: '2px', marginInlineEnd: '6px', width: 16, height: 16, bgcolor: 'rgba(254,190,16,0.18)', borderRadius: '50%' } }}
                    />
                  ))}
                </Box>
              )}
            </Box>

            <Box
              onClick={() => setChannelOpen(true)}
              sx={{ flex: 1, border: '1px dashed rgba(0,87,168,0.6)', borderRadius: 2, p: 1.5, cursor: 'pointer', bgcolor: 'rgba(0,87,168,0.05)', transition: 'background .15s ease', '&:hover': { bgcolor: 'rgba(0,87,168,0.1)' } }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: channels.length ? 1 : 0 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <TvIcon sx={{ fontSize: 18, color: '#8EC5FF' }} />
                  <Typography sx={{ fontWeight: 800, fontSize: 14, color: '#8EC5FF' }}>القنوات الناقلة (Broadcasting Channels)</Typography>
                </Stack>
                <KeyboardArrowDownIcon sx={{ color: 'text.secondary' }} />
              </Stack>
              {channels.length === 0 ? (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>اضغط لاختيار القنوات — البحث مدعوم</Typography>
              ) : (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                  {channels.map((ch) => (
                    <Chip
                      key={ch}
                      label={ch}
                      size="small"
                      onDelete={(e) => {
                        e.stopPropagation()
                        setChannels((l) => l.filter((v) => v !== ch))
                      }}
                      deleteIcon={<CloseIcon fontSize="small" sx={{ color: '#8EC5FF' }} />}
                      sx={{ bgcolor: 'rgba(0,87,168,0.4)', color: '#8EC5FF', fontWeight: 700, border: '1px solid rgba(0,87,168,0.7)', '& .MuiChip-deleteIcon': { margin: '0', marginInlineStart: '2px', marginInlineEnd: '6px', width: 16, height: 16, bgcolor: 'rgba(0,87,168,0.55)', borderRadius: '50%' } }}
                    />
                  ))}
                </Box>
              )}
            </Box>
          </Stack>

          <Box
            onClick={() => setRefereeOpen(true)}
            sx={{ border: '1px dashed rgba(255,82,82,0.5)', borderRadius: 2, p: 1.5, cursor: 'pointer', bgcolor: 'rgba(255,82,82,0.04)', transition: 'background .15s ease', '&:hover': { bgcolor: 'rgba(255,82,82,0.08)' } }}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: referees.length ? 1 : 0 }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <LocalPoliceIcon sx={{ fontSize: 18, color: '#FF5252' }} />
                <Typography sx={{ fontWeight: 800, fontSize: 14, color: '#FF5252' }}>الحكام (Referees)</Typography>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={1}>
                {referees.length > 0 && (
                  <Chip
                    size="small"
                    label={referees.length === 6 ? '6/6' : `${referees.length}/6`}
                    sx={{
                      bgcolor: referees.length === 6 ? 'rgba(0,230,118,0.15)' : 'rgba(255,82,82,0.15)',
                      color: referees.length === 6 ? '#00E676' : '#FF5252',
                      fontWeight: 800,
                      border: `1px solid ${referees.length === 6 ? 'rgba(0,230,118,0.4)' : 'rgba(255,82,82,0.4)'}`,
                    }}
                  />
                )}
                <KeyboardArrowDownIcon sx={{ color: 'text.secondary' }} />
              </Stack>
            </Stack>
            {referees.length === 0 ? (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                اضغط لتعيين حكام المباراة — 6 أدوار (حكم ساحة، مساعدين، رابع، VAR ومساعد VAR)
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                {referees.map((ref) => (
                  <Chip
                    key={ref.role}
                    label={ref.name ? `${ref.role}: ${ref.name}` : `${ref.role}: —`}
                    size="small"
                    sx={{
                      bgcolor: ref.name ? 'rgba(255,82,82,0.15)' : 'rgba(255,255,255,0.05)',
                      color: ref.name ? '#FF8A80' : 'text.secondary',
                      fontWeight: 700,
                      border: `1px solid ${ref.name ? 'rgba(255,82,82,0.4)' : 'rgba(255,255,255,0.12)'}`,
                    }}
                  />
                ))}
              </Box>
            )}
          </Box>

          <TextField
            label="رابط فيديو الملخص (Summary Video URL)"
            placeholder="https://…"
            value={summaryVideoUrl}
            onChange={(e) => setSummaryVideoUrl(e.target.value)}
            fullWidth
            error={summaryVideoUrlError}
            helperText={summaryVideoUrlError ? 'أدخل رابطاً صحيحاً يبدأ بـ https:// أو اتركه فارغاً' : 'اختياري — يُضاف لاحقاً عند توفره'}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <VideocamIcon sx={{ fontSize: 18, color: '#F4F7FF' }} />
                  </InputAdornment>
                ),
              },
            }}
          />
        </Stack>
      </Paper>

      <SearchPickDialog
        open={commentatorOpen}
        title="المعلقون (Commentators)"
        subtitle="ابحث واختر معلقي هذه المباراة"
        accentColor="#FEBE10"
        options={commentatorOptions}
        selected={commentators}
        onClose={() => setCommentatorOpen(false)}
        onConfirm={(s) => {
          setCommentators(s)
          setCommentatorOpen(false)
        }}
      />
      <SearchPickDialog
        open={channelOpen}
        title="القنوات الناقلة (Channels)"
        subtitle="ابحث واختر القنوات الناقلة لهذه المباراة"
        accentColor="#0057A8"
        options={channelOptions}
        selected={channels}
        onClose={() => setChannelOpen(false)}
        onConfirm={(s) => {
          setChannels(s)
          setChannelOpen(false)
        }}
      />
      <RefereePickDialog
        open={refereeOpen}
        referees={referees}
        refereeOptions={refereeOptions}
        onClose={() => setRefereeOpen(false)}
        onConfirm={(assignments) => {
          setReferees(assignments)
          setRefereeOpen(false)
        }}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="حذف المباراة"
        message={`هل أنت متأكد من حذف "${match.home.name} ضد ${match.away.name}"؟ سيتم حذف جميع الأحداث والتخطيطات المرتبطة. لا يمكن التراجع عن هذا الإجراء.`}
        confirmLabel="حذف نهائي"
        danger
        loading={deleting}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
      />

      <Paper
        sx={{
          position: 'sticky',
          bottom: 16,
          zIndex: 50,
          p: 2,
          borderRadius: 3,
          bgcolor: 'rgba(10, 14, 28, 0.92)',
          border: '1px solid rgba(255,255,255,0.12)',
          backdropFilter: 'blur(14px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ flexWrap: 'wrap', gap: 1.5 }}>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexWrap: 'wrap', gap: 0.75 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <EmojiEventsIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>{competition || 'لم تُحدد البطولة'}</Typography>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={1}>
              <StadiumIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>{stadium || 'لم يُحدد الملعب'}</Typography>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={1}>
              <AccessTimeIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {kuwaitKickoff ? `${dateLabel} — ${format12(kuwaitKickoff)}` : 'الوقت غير محدد'}
              </Typography>
            </Stack>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            {match?.fixtureId && (
              <Tooltip title="تحديث البيانات من المصدر">
                <IconButton onClick={refreshFromApi} disabled={refreshing} size="small" sx={{ color: 'text.secondary' }}>
                  <RefreshIcon sx={{ animation: refreshing ? 'spin 1s linear infinite' : 'none', '@keyframes spin': { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } } }} />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="حذف المباراة نهائياً">
              <IconButton onClick={() => setDeleteOpen(true)} size="small" sx={{ color: '#FF1744', '&:hover': { bgcolor: 'rgba(255,23,68,0.16)' } }}>
                <DeleteIcon sx={{ fontSize: 20 }} />
              </IconButton>
            </Tooltip>
            {saved && (
              <Chip
                icon={<CheckCircleIcon sx={{ fontSize: 18, color: '#00E676' }} />}
                label="تم الحفظ"
                sx={{
                  bgcolor: 'rgba(0,230,118,0.12)',
                  color: '#00E676',
                  fontWeight: 800,
                  opacity: savedLeaving ? 0 : 1,
                  transition: 'opacity 400ms ease',
                  '& .MuiChip-label': { paddingInline: 1.5 },
                  '& .MuiChip-icon': {
                    margin: 0,
                    marginInlineStart: 0,
                    marginInlineEnd: 0,
                    width: 16,
                    height: 16,
                    padding: 0.75,
                    boxSizing: 'content-box',
                    bgcolor: 'rgba(0,230,118,0.2)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  },
                }}
              />
            )}
            <Button
              variant="contained"
              startIcon={saving ? undefined : <SaveIcon />}
              onClick={save}
              disabled={saving}
              sx={{
                gap: 1,
                px: 3,
                py: 1.25,
                fontSize: 15,
                fontWeight: 800,
                background: 'linear-gradient(135deg, #00E676, #00C853)',
                color: '#062A16',
                boxShadow: '0 6px 20px rgba(0, 230, 118, 0.35)',
                '&:hover': { background: 'linear-gradient(135deg, #00E676, #00A84C)' },
                '&:disabled': { bgcolor: 'rgba(255,255,255,0.08)', color: 'text.secondary', boxShadow: 'none' },
              }}
            >
              {saving ? <CircularProgress size={20} sx={{ color: 'text.secondary' }} /> : 'حفظ المعلومات'}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  )
}
