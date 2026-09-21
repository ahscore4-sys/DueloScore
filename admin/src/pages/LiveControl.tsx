import { Box, Typography, Stack, Grid, Button, Avatar, Chip, Paper, Divider, TextField, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Tooltip, CircularProgress, Snackbar, Alert, RadioGroup, FormControlLabel, Radio } from '@mui/material'
import PlayCircleIcon from '@mui/icons-material/PlayCircle'
import StopCircleIcon from '@mui/icons-material/StopCircle'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer'
import SquareIcon from '@mui/icons-material/Square'
import PersonRemoveIcon from '@mui/icons-material/PersonRemove'
import UndoIcon from '@mui/icons-material/Undo'
import AdjustIcon from '@mui/icons-material/Adjust'
import TripOriginIcon from '@mui/icons-material/TripOrigin'
import VideocamIcon from '@mui/icons-material/Videocam'
import EventNoteIcon from '@mui/icons-material/EventNote'
import CloudDownloadIcon from '@mui/icons-material/CloudDownload'
import SaveIcon from '@mui/icons-material/Save'
import TimerIcon from '@mui/icons-material/Timer'
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import { useState, type ReactNode, type ReactElement } from 'react'
import varIcon from '@/shared/assets/branding/ic_var.png'
import varIconPlain from '@/shared/assets/branding/ic_var.png'
import { useParams } from 'react-router-dom'
import MatchStatusBadge from '../components/MatchStatusBadge'
import { useMatch } from '@/features/match/ui/useMatch'
import { useLiveClock } from '../hooks/useLiveClocks'
import { useMatchEvents, type EventPatch } from '@/features/match/ui/useMatchEvents'
import { useMatchFlow } from '../hooks/useMatchFlow'
import EventPlayerMenu from '../components/EventPlayerMenu'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import EditIcon from '@mui/icons-material/Edit'
import { phaseIsRunning, clockParts, formatEventMinute, minuteToEventMinute, parseEventMinute, eventMinuteRange, eventSortKey, eventMinuteParts, phaseLabel, type ControlPhase } from '../lib/matchFlow'
import type { VarCancellationCause } from '@/types'
import { useAddedTime } from '../hooks/useAddedTime'
import { usePreMatchTeam } from '@/features/player/ui/usePreMatchTeam'
import type { MatchEvent, Player, OpponentPlayerData } from '../types'
import { deriveMatchState, shouldConvertToRed } from '@/features/match/domain/matchDerivation'
import { sendMatchFanNotification, matchFanTopics, type MatchFanTopics } from '@/features/match/data/matchFanNotifications.service'
import { fetchAndSaveMatchRatings, fetchAndSaveMatchStatistics, fetchAndSaveMatchPlayerStatistics, updateMatchFields, updateMatchControl, addEvent as createMatchEvent } from '@/features/match/data/match.service'
import { fetchMatchById, fetchFixtureEvents } from '@/features/match/data/apiFootball.service'

function fmt(sec: number) {
  const m = String(Math.floor(sec / 60)).padStart(2, '0')
  const s = String(sec % 60).padStart(2, '0')
  return `${m}:${s}`
}

function oppositeTeam(team: 'home' | 'away'): 'home' | 'away' {
  return team === 'home' ? 'away' : 'home'
}

function derivePhaseEvents(events: MatchEvent[], statusShort: string): MatchEvent[] {
  if (events.length === 0) return []
  const bases = events.map((e) => eventMinuteParts(e.minute).base)
  const any = (pred: (n: number) => boolean) => bases.some(pred)
  const firstHalf = any((n) => n <= 45)
  const secondHalf = any((n) => n >= 46 && n <= 90)
  const extraFirst = any((n) => n >= 91 && n <= 105)
  const extraSecond = any((n) => n >= 106)
  const finished = ['FT', 'AET', 'PEN'].includes(statusShort)

  const phases: { phase: string; minute: string }[] = []

  if (firstHalf || secondHalf || extraFirst || extraSecond) phases.push({ phase: 'first_half', minute: "1'" })
  if (secondHalf || extraFirst || extraSecond) phases.push({ phase: 'half_time', minute: "45'" })
  if (secondHalf || extraFirst || extraSecond) phases.push({ phase: 'second_half', minute: "46'" })
  if ((extraFirst || extraSecond)) phases.push({ phase: 'full_time', minute: "90'" })
  if (extraFirst) phases.push({ phase: 'extra_first_half', minute: "91'" })
  if (extraSecond) phases.push({ phase: 'extra_break_1', minute: "105'" })
  if (extraSecond) phases.push({ phase: 'extra_second_half', minute: "106'" })
  if ((statusShort === 'AET' || statusShort === 'PEN') && extraSecond) phases.push({ phase: 'extra_break_2', minute: "120'" })
  if (statusShort === 'PEN') phases.push({ phase: 'penalties', minute: "120'" })
  if (finished && !extraFirst && !extraSecond) phases.push({ phase: 'final', minute: "90'" })

  return phases.map((p) => ({ id: '', minute: p.minute, type: 'phase', phase: p.phase, player: '', team: 'home' } as MatchEvent))
}

function OgIcon({ sx }: { sx?: Record<string, unknown> }) {
  return (
    <Box sx={{ position: 'relative', display: 'inline-flex', lineHeight: 0, ...sx }}>
      <SportsSoccerIcon sx={{ fontSize: '1em' }} />
      <Box component="span" sx={{ position: 'absolute', top: '-0.22em', right: '-0.22em', fontSize: '0.6em', fontWeight: 900, color: '#FF5252', lineHeight: 1 }}>×</Box>
    </Box>
  )
}

const eventMeta: Record<string, { label: string; icon: ReactNode }> = {
  goal: { label: 'هدف', icon: <SportsSoccerIcon sx={{ fontSize: 16, color: '#00E676' }} /> },
  og: { label: 'هدف في مرماه (OG)', icon: <OgIcon sx={{ fontSize: 16, color: '#FF7043' }} /> },
  opp_goal: { label: 'هدف الخصم', icon: <SportsSoccerIcon sx={{ fontSize: 16, color: '#FF5252' }} /> },
  yellow: { label: 'بطاقة صفراء', icon: <SquareIcon sx={{ fontSize: 14, color: '#FDD835' }} /> },
  red: { label: 'بطاقة حمراء', icon: <SquareIcon sx={{ fontSize: 14, color: '#FF5252' }} /> },
  pen_scored: { label: 'ركلة جزاء مسجلة', icon: <AdjustIcon sx={{ fontSize: 16, color: '#26C6DA' }} /> },
  pen_missed: { label: 'ركلة جزاء ضائعة', icon: <TripOriginIcon sx={{ fontSize: 16, color: '#FF5252' }} /> },
  sub: { label: 'تبديل', icon: <PersonRemoveIcon sx={{ fontSize: 16, color: '#29B6F6' }} /> },
  crossbar: { label: 'العارضة', icon: <SportsSoccerIcon sx={{ fontSize: 16, color: '#CE93D8' }} /> },
  phase: { label: 'مرحلة', icon: <TimerIcon sx={{ fontSize: 16, color: '#FEBE10' }} /> },
  var: { label: 'فحص VAR', icon: <Box component="img" src={varIcon} alt="VAR" sx={{ width: 18, height: 18, objectFit: 'contain' }} /> },
}

const PHASE_MARKER_LABELS: Record<string, string> = {
  first_half: 'انطلاق المباراة',
  half_time: 'استراحة بين الشوطين',
  second_half: 'بداية الشوط الثاني',
  full_time: 'نهاية الوقت الأصلي',
  extra_first_half: 'بداية الشوط الإضافي الأول',
  extra_break_1: 'استراحة إضافية أولى',
  extra_second_half: 'بداية الشوط الإضافي الثاني',
  extra_break_2: 'نهاية الأشواط الإضافية',
  penalties: 'ركلات الترجيح',
  final: 'نهاية المباراة',
}

function phaseMarkerLabel(e: MatchEvent): string {
  return PHASE_MARKER_LABELS[e.phase ?? ''] ?? 'مرحلة'
}

function eventText(e: MatchEvent, resolve: (id: string) => string = (id) => id): string {
  switch (e.type) {
    case 'goal':
      return e.player ? `${resolve(e.player)} يسجّل هدفاً` : 'هدف'
    case 'og':
      return e.player ? `${resolve(e.player)} يسجّل في مرماه` : 'هدف في مرماه'
    case 'yellow':
      return e.player ? `بطاقة صفراء لـ ${resolve(e.player)}` : 'بطاقة صفراء'
    case 'red':
      return e.player ? `بطاقة حمراء لـ ${resolve(e.player)}` : 'بطاقة حمراء'
    case 'pen_scored':
      return e.player ? `${resolve(e.player)} يسجّل ركلة الجزاء` : 'ركلة جزاء مسجلة'
    case 'pen_missed': {
      const cause = e.penaltyMissCause === 'saved' ? 'تصدّى لها الحارس' : e.penaltyMissCause === 'off_target' ? 'ضائعة' : ''
      const base = e.player ? `${resolve(e.player)} يهدر ركلة الجزاء` : 'ركلة جزاء ضائعة'
      return cause ? `${base} — ${cause}` : base
    }
    case 'sub':
      return e.player && e.playerOut ? `دخول ${resolve(e.player)} بدلاً من ${resolve(e.playerOut)}` : (e.player ? `تبديل ${resolve(e.player)}` : 'تبديل')
    case 'crossbar':
      return e.player ? `قذيفة على العارضة — ${resolve(e.player)}` : 'قذيفة على العارضة'
    case 'phase':
      return phaseMarkerLabel(e)
    case 'var':
      return e.varCheckCause || 'مراجعة حكم الفيديو'
    default:
      return e.player ? resolve(e.player) : '—'
  }
}

type EventType = 'goal' | 'og' | 'yellow' | 'red' | 'pen_scored' | 'pen_missed' | 'sub' | 'crossbar'

const eventActions: { key: EventType; label: string; short: string; icon: ReactNode; color: string }[] = [
  { key: 'goal', label: 'هدف', short: 'هدف', icon: <SportsSoccerIcon />, color: '#00E676' },
  { key: 'pen_scored', label: 'ركلة جزاء مسجلة', short: 'جزاء', icon: <AdjustIcon />, color: '#26C6DA' },
  { key: 'yellow', label: 'بطاقة صفراء', short: 'صفراء', icon: <SquareIcon sx={{ color: '#FDD835' }} />, color: '#FDD835' },
  { key: 'sub', label: 'تبديل', short: 'تبديل', icon: <PersonRemoveIcon />, color: '#42A5F5' },
  { key: 'crossbar', label: 'العارضة', short: 'عارضة', icon: <SportsSoccerIcon />, color: '#AB47BC' },
  { key: 'pen_missed', label: 'ركلة جزاء ضائعة', short: 'ضائعة', icon: <TripOriginIcon />, color: '#FF5252' },
  { key: 'red', label: 'بطاقة حمراء', short: 'حمراء', icon: <SquareIcon sx={{ color: '#FF5252' }} />, color: '#FF1744' },
  { key: 'og', label: 'هدف في مرماه', short: 'OG', icon: <OgIcon sx={{ fontSize: 20 }} />, color: '#FF9800' },
]

const EVENT_COLORS: Record<string, string> = {
  opp_goal: '#FF5252',
  var: '#7FD8FF',
  ...Object.fromEntries(eventActions.map((a) => [a.key, a.color])),
}

const PENALTY_MISS_LABELS: Record<'saved' | 'off_target', { text: string; color: string }> = {
  saved: { text: 'تصدّى لها الحارس', color: '#90CAF9' },
  off_target: { text: 'ضائعة', color: '#FF8A80' },
}

interface FlowAction {
  label: string
  kind: 'advance' | 'penalties' | 'shootout' | 'final'
  next?: ControlPhase
  icon: ReactNode
  danger?: boolean
}

export default function LiveControl() {
  const { id: matchId } = useParams<{ id: string }>()
  const { match } = useMatch(matchId)
  const clock = useLiveClock(match)
  const eventsHook = useMatchEvents(match?.id)
  const flow = useMatchFlow(match)
  const added = useAddedTime(match)
  const [eventDlg, setEventDlg] = useState<{ type: EventType; team: 'home' | 'away' } | null>(null)
  const [eventForm, setEventForm] = useState<{ team: 'home' | 'away'; player: string; playerOut: string; assistPlayer: string; videoUrl: string; eventMinute: string; penaltyMissCause: string }>({ team: 'home', player: '', playerOut: '', assistPlayer: '', videoUrl: '', eventMinute: '', penaltyMissCause: '' })
  const [eventTouched, setEventTouched] = useState<{ videoUrl: boolean; eventMinute: boolean }>({ videoUrl: false, eventMinute: false })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [undoTarget, setUndoTarget] = useState<MatchEvent | null>(null)
  const [penaltiesOpen, setPenaltiesOpen] = useState(false)
  const [goalTeam, setGoalTeam] = useState<'home' | 'away' | null>(null)
  const [confirm, setConfirm] = useState<{ label: string; danger?: boolean; note?: string; onConfirm: () => void } | null>(null)
  const [shootPlayers, setShootPlayers] = useState<{ home: string; away: string }>({ home: '', away: '' })
  const [shootAnchor, setShootAnchor] = useState<{ home: HTMLElement | null; away: HTMLElement | null }>({ home: null, away: null })
  const [eventPlayerAnchor, setEventPlayerAnchor] = useState<HTMLElement | null>(null)
  const [eventPlayerOutAnchor, setEventPlayerOutAnchor] = useState<HTMLElement | null>(null)
  const [eventAssistAnchor, setEventAssistAnchor] = useState<HTMLElement | null>(null)
  const [fanSending, setFanSending] = useState<'var' | 'var_decision' | 'penalty_awarded' | null>(null)
  const [varDecisionDialog, setVarDecisionDialog] = useState<{ type: EventType; eventId?: string; decidedError?: boolean } | null>(null)
  const [varCheckOpen, setVarCheckOpen] = useState(false)
  const [varCheckCause, setVarCheckCause] = useState('')
  const [varCauseStep, setVarCauseStep] = useState(false)
  const [ringHover, setRingHover] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error' | 'info'; message: string } | null>(null)
  const [varReviewId, setVarReviewId] = useState<string | null>(null)
  const [varReviewCause, setVarReviewCause] = useState('')
  const [apiFetching, setApiFetching] = useState(false)
  const [apiEvents, setApiEvents] = useState<MatchEvent[]>([])
  const [apiScore, setApiScore] = useState<{ home: number | null; away: number | null } | null>(null)
  const [apiPens, setApiPens] = useState<{ home: number; away: number } | null>(null)
  const [apiStatus, setApiStatus] = useState<string>('')
  const [apiSaving, setApiSaving] = useState(false)
  const [apiPanel, setApiPanel] = useState(false)

  const homeTeamData = usePreMatchTeam(match?.home, match?.competition)
  const awayTeamData = usePreMatchTeam(match?.away, match?.competition)

  if (!match) return null

  const seconds = clock?.seconds ?? 0
  const minute = formatEventMinute(flow.phase, seconds)
  const { base: baseSeconds, extra: extraSeconds } = clockParts(flow.phase, seconds)
  const declared = added.declared
  const setDeclared = added.setDeclared
  const passedDeclared = extraSeconds > 0 && declared > 0 && extraSeconds >= declared * 60
  const badgeMinute = extraSeconds >= 60 ? `${Math.round(baseSeconds / 60)}+${Math.floor(extraSeconds / 60)}` : `${Math.floor(baseSeconds / 60)}`
  const goalTarget = goalTeam ? (goalTeam === 'home' ? match.home : match.away) : null

  const toDropdownPlayers = (pd: Record<string, OpponentPlayerData> | undefined): Player[] =>
    pd ? Object.values(pd).map((p) => ({ id: String(p.id), name: p.nameAr || p.name, position: p.pos, number: p.number, teamId: '' })) : []

  const homePlayers: Player[] = homeTeamData.players.length > 0
    ? homeTeamData.players
    : toDropdownPlayers(match.plans?.[match.home.id]?.playerData)
  const awayPlayers: Player[] = awayTeamData.players.length > 0
    ? awayTeamData.players
    : toDropdownPlayers(match.plans?.[match.away.id]?.playerData)
  const playerName = (id: string | null | undefined): string => {
    if (!id) return ''
    return (
      homePlayers.find((p) => p.id === id)?.name ??
      awayPlayers.find((p) => p.id === id)?.name ??
      id
    )
  }
  const homeKicks = flow.kicks.filter((k) => k.team === 'home').slice().reverse()
  const awayKicks = flow.kicks.filter((k) => k.team === 'away').slice().reverse()
  const timeline = eventsHook.events.slice().sort((a, b) => {
    const ta = a.createdAt ?? 0
    const tb = b.createdAt ?? 0
    if (ta !== tb) return tb - ta
    return eventSortKey(b.minute, b.phase) - eventSortKey(a.minute, a.phase)
  })
  const derived = deriveMatchState(eventsHook.events)
  const liveHomeScore = derived.score.home
  const liveAwayScore = derived.score.away
  const isDraw = liveHomeScore === liveAwayScore
  const eventLabel = eventDlg ? (eventActions.find((a) => a.key === eventDlg.type)?.label ?? eventDlg.type) : ''
  const editingEvent = editingId ? timeline.find((x) => x.id === editingId) : undefined
  const playerTeam: 'home' | 'away' = eventForm.team
  const playerValid = eventDlg?.type === 'sub' ? Boolean(eventForm.player || eventForm.playerOut) : true
  const videoUrlValid = !eventForm.videoUrl || /^https?:\/\/.+/.test(eventForm.videoUrl)
  const { min: minuteMin, max: clockMinuteMax } = eventMinuteRange(seconds)
  const editingOrigMinute = editingEvent ? parseEventMinute(editingEvent.minute) : undefined
  const minuteMax = editingId && editingOrigMinute !== undefined ? Math.max(clockMinuteMax, editingOrigMinute) : clockMinuteMax
  const eventMinuteText = eventForm.eventMinute.trim()
  const eventMinuteNum = eventMinuteText === '' ? undefined : Number(eventMinuteText)
  const eventMinuteValid = eventMinuteText === '' || (Number.isInteger(eventMinuteNum) && eventMinuteNum! >= minuteMin && eventMinuteNum! <= minuteMax)
  const eventMinuteError = eventTouched.eventMinute && !eventMinuteValid
  const finalMinute = eventMinuteText !== '' && eventMinuteValid && eventMinuteNum !== undefined
    ? (editingId && editingOrigMinute === eventMinuteNum ? editingEvent?.minute : minuteToEventMinute(flow.phase, eventMinuteNum))
    : undefined
  const canSaveEvent = playerValid && videoUrlValid && eventMinuteValid && (eventDlg?.type !== 'pen_missed' || Boolean(eventForm.penaltyMissCause))
  const videoUrlError = eventTouched.videoUrl && !videoUrlValid
  const markTouched = (field: keyof typeof eventTouched) => setEventTouched((t) => ({ ...t, [field]: true }))
  const resetTouched = () => setEventTouched({ videoUrl: false, eventMinute: false })

  const fanTopics: MatchFanTopics = matchFanTopics(match)
  const fanTargetLabel = [fanTopics.barcelona && 'مشجعو برشلونة', fanTopics.realmadrid && 'مشجعو ريال مدريد'].filter(Boolean).join(' و ') || 'لا يوجد جمهور مستهدف'
  const VAR_EVENT_TYPES: EventType[] = ['goal', 'og', 'red', 'pen_scored', 'pen_missed']

  const VAR_CANCELLATION_CAUSES: Array<{ key: VarCancellationCause; label: string }> = [
    { key: 'offside', label: 'تسلل' },
    { key: 'foul', label: 'مخالفة' },
    { key: 'handball', label: 'لمسة يد' },
    { key: 'ball_line', label: 'الكرة لم تتجاوز الخط' },
  ]

  const varCauseLabel = (key?: VarCancellationCause) => VAR_CANCELLATION_CAUSES.find((c) => c.key === key)?.label

  const sendFanNotification = (kind: 'var' | 'penalty_awarded', eventType?: EventType, team?: 'home' | 'away', cause?: string) => {
    setFanSending(kind)
    const prom = sendMatchFanNotification({
      matchId: match.id,
      matchLabel: `${match.home.name} × ${match.away.name}`,
      kind,
      eventType,
      team,
      minute,
      cause,
    })
    prom
      .catch((err) => console.error('Match fan notification failed', err))
      .finally(() => setFanSending(null))
    return prom
  }

  const sendVarNotification = (eventType: EventType, eventId?: string) => {
    setConfirm({
      label: `إرسال إشعار فحص VAR (${eventMeta[eventType].label}) — سيتلقاه ${fanTargetLabel}`,
      note: 'سيتم إرسال الإشعار فوراً إلى مشجعي التطبيق — وسيظهر شعار VAR على الحدث في السجل.',
      onConfirm: () => {
        sendFanNotification('var', eventType)
          .then(() => { if (eventId) eventsHook.updateEvent(eventId, { varAssigned: true }) })
          .catch(() => {})
      },
    })
  }

  const openVarDecision = (eventType: EventType, eventId?: string, decidedError?: boolean) => {
    setVarCauseStep(false)
    setVarDecisionDialog({ type: eventType, eventId, decidedError })
  }

  const onVarButton = (eventType: EventType, eventId?: string, alreadyAssigned?: boolean, decidedError?: boolean) => {
    if (alreadyAssigned) openVarDecision(eventType, eventId, decidedError)
    else sendVarNotification(eventType, eventId)
  }

  const sendVarDecision = (decision: 'error' | 'no_error', cause?: VarCancellationCause) => {
    const target = varDecisionDialog
    if (!target) return
    setFanSending('var_decision')
    sendMatchFanNotification({
      matchId: match.id,
      matchLabel: `${match.home.name} × ${match.away.name}`,
      kind: 'var_decision',
      eventType: target.type,
      minute,
      decision,
      ...(decision === 'error' && cause ? { cause } : {}),
    })
      .then(() => {
        if (target.eventId) {
          eventsHook.updateEvent(
            target.eventId,
            decision === 'error'
              ? { varDecision: 'error', ...(cause ? { varDecisionCause: cause } : {}) }
              : { varDecision: 'no_error', varDecisionCause: null },
          )
        }
      })
      .catch((err) => {
        console.error('VAR decision notification failed', err)
        setFeedback({ kind: 'error', message: 'فشل إرسال إشعار القرار — لم يتم تسجيل القرار. تأكد من نشر دوال Firebase (functions) ثم حاول مرة أخرى.' })
      })
      .finally(() => { setFanSending(null); setVarDecisionDialog(null); setVarCauseStep(false) })
  }

  const varReview = varReviewId ? timeline.find((x) => x.id === varReviewId) : undefined

  const openVarReview = (id: string) => {
    setVarReviewCause(timeline.find((x) => x.id === id)?.varCheckCause ?? '')
    setVarReviewId(id)
  }

  const sendVarReviewDecision = (decision: 'error' | 'no_error') => {
    if (!varReviewId) return
    setFanSending('var_decision')
    const cause = varReviewCause.trim() || undefined
    sendMatchFanNotification({
      matchId: match.id,
      matchLabel: `${match.home.name} × ${match.away.name}`,
      kind: 'var_decision',
      eventType: 'var',
      minute,
      decision,
      ...(decision === 'error' && cause ? { cause } : {}),
    })
      .then(() => {
        eventsHook.updateEvent(varReviewId, { varDecision: decision, varCheckCause: cause ?? null })
      })
      .catch((err) => {
        console.error('VAR review decision notification failed', err)
        setFeedback({ kind: 'error', message: 'فشل إرسال إشعار نتيجة المراجعة — لم يتم تسجيل القرار. تأكد من نشر دوال Firebase (functions) ثم حاول مرة أخرى.' })
      })
      .finally(() => { setFanSending(null); setVarReviewId(null) })
  }

  const sendPenaltyAwarded = (team: 'home' | 'away') => {
    const teamName = team === 'away' ? match.away.name : match.home.name
    setConfirm({
      label: `إرسال إشعار (احتسبت ركلة جزاء لصالح ${teamName}) — سيتلقاه ${fanTargetLabel}`,
      note: 'سيتم إرسال الإشعار فوراً إلى مشجعي التطبيق — لا يضيف أي حدث لسجل المباراة.',
      onConfirm: () => sendFanNotification('penalty_awarded', undefined, team),
    })
  }

  const onVarCheck = () => {
    setVarCheckCause('')
    setVarCheckOpen(true)
  }

  const sendVarCheck = () => {
    setFanSending('var')
    eventsHook.addVarCheck(minute, varCheckCause.trim() || undefined)
    const prom = sendMatchFanNotification({
      matchId: match.id,
      matchLabel: `${match.home.name} × ${match.away.name}`,
      kind: 'var',
      minute,
      cause: varCheckCause.trim() || undefined,
    })
    prom
      .catch((err) => {
        console.error('Match fan notification failed', err)
        setFeedback({ kind: 'error', message: 'فشل إرسال إشعار فحص VAR — المراجعة مسجّلة في السجل لكن لم يصل الإشعار.' })
      })
      .finally(() => { setFanSending(null); setVarCheckOpen(false) })
  }

  const confirmGoal = () => {
    if (goalTeam) {
      eventsHook.addGoal(goalTeam, minute)
      setGoalTeam(null)
    }
  }

  const kick = (team: 'home' | 'away', result: 'scored' | 'missed') => {
    const player = shootPlayers[team]
    if (!player) return
    flow.recordKick(team, player, result)
    eventsHook.addEvent(team, result === 'scored' ? 'pen_scored' : 'pen_missed', player, minute)
    setShootPlayers((s) => ({ ...s, [team]: '' }))
  }

  const saveEvent = () => {
    if (!eventDlg || !canSaveEvent) return
    const { team, player, playerOut, assistPlayer, videoUrl } = eventForm
    const eventTeam = eventDlg.type === 'og' ? oppositeTeam(team) : team
    if (editingId) {
      const patch: EventPatch = { team: eventTeam }
      const originalType = editingEvent?.type
      if (eventDlg.type !== originalType) patch.type = eventDlg.type
      patch.player = player
      patch.playerOut = eventDlg.type === 'sub' ? (playerOut || null) : null
      patch.assistPlayer = eventDlg.type === 'goal' ? (assistPlayer || null) : null
      patch.penaltyMissCause = eventDlg.type === 'pen_missed' ? ((eventForm.penaltyMissCause as 'saved' | 'off_target') || null) : null
      patch.videoUrl = videoUrl || null
      if (finalMinute !== undefined) patch.minute = finalMinute
      if (eventDlg.type === 'red') {
        patch.secondYellow = shouldConvertToRed(eventsHook.events, eventTeam, player)
      } else if (originalType === 'red') {
        patch.secondYellow = false
      }
      eventsHook.updateEvent(editingId, patch)
    } else if (eventDlg.type === 'og') {
      eventsHook.addOG(team, finalMinute ?? minute, player, videoUrl || undefined)
    } else if (eventDlg.type === 'goal') {
      eventsHook.addGoal(team, finalMinute ?? minute, player, videoUrl || undefined, assistPlayer || undefined)
    } else if (eventDlg.type === 'yellow') {
      const isSecondYellow = shouldConvertToRed(eventsHook.events, eventTeam, player)
      if (isSecondYellow) {
        eventsHook.addEvent(eventTeam, 'red', player, finalMinute ?? minute, undefined, videoUrl || undefined, true)
      } else {
        eventsHook.addEvent(eventTeam, 'yellow', player, finalMinute ?? minute, undefined, videoUrl || undefined)
      }
    } else {
      eventsHook.addEvent(eventTeam, eventDlg.type, player, finalMinute ?? minute, eventDlg.type === 'sub' ? (playerOut || undefined) : undefined, videoUrl || undefined, undefined, eventDlg.type === 'pen_missed' ? ((eventForm.penaltyMissCause as 'saved' | 'off_target') || undefined) : undefined)
    }
    setEventForm({ team: 'home', player: '', playerOut: '', assistPlayer: '', videoUrl: '', eventMinute: '', penaltyMissCause: '' })
    resetTouched()
    setEditingId(null)
    setEventDlg(null)
  }

  const startEdit = (e: MatchEvent) => {
    setEditingId(e.id)
    setEventDlg({ type: e.type as EventType, team: e.team })
    setEventForm({ team: e.type === 'og' ? oppositeTeam(e.team) : e.team, player: e.player, playerOut: e.playerOut ?? '', assistPlayer: e.assistPlayer ?? '', videoUrl: e.videoUrl ?? '', eventMinute: parseEventMinute(e.minute)?.toString() ?? '', penaltyMissCause: e.penaltyMissCause ?? '' })
    resetTouched()
  }

  const removeEvent = (e: MatchEvent) => {
    if (e.type === 'pen_scored' || e.type === 'pen_missed') {
      flow.undoKick(e.team, e.player, e.type === 'pen_scored' ? 'scored' : 'missed')
    }
    eventsHook.deleteEvent(e.id)
    setUndoTarget(null)
  }

  const closeEventDialog = () => {
    setEditingId(null)
    setEventDlg(null)
    setEventForm({ team: 'home', player: '', playerOut: '', assistPlayer: '', videoUrl: '', eventMinute: '', penaltyMissCause: '' })
    setEventPlayerAnchor(null)
    setEventPlayerOutAnchor(null)
    setEventAssistAnchor(null)
    resetTouched()
  }

  const fetchApiMatchData = async () => {
    if (!match?.fixtureId || apiFetching) return
    setApiFetching(true)
    try {
      const [fixtureData, fixtureEvents] = await Promise.all([
        fetchMatchById(match.fixtureId),
        fetchFixtureEvents(match.fixtureId),
      ])
      const f = fixtureData?.response?.[0]
      if (!f) {
        setFeedback({ kind: 'error', message: 'تعذّر جلب بيانات المباراة من المصدر — تحقق من معرف المباراة الخارجي.' })
        return
      }
      const homeId = f.teams.home.id
      const awayId = f.teams.away.id
      const mapped: MatchEvent[] = fixtureEvents
        .map((e) => {
          const apiTeam = e.team?.id === homeId ? 'home' : e.team?.id === awayId ? 'away' : null
          if (!apiTeam || e.time?.elapsed == null) return null
          const elapsed = e.time.elapsed
          const extra = e.time.extra ?? 0
          const minute = extra > 0 ? `${elapsed}+${extra}'` : `${elapsed}'`
          const apiPlayerId = e.player?.id != null ? String(e.player.id) : ''
          const apiPlayer = e.player?.name ?? ''
          const apiAssistId = e.assist?.id != null ? String(e.assist.id) : ''
          const apiAssist = e.assist?.name ?? ''
          let type: MatchEvent['type'] | null = null
          let secondYellow = false
          let team: 'home' | 'away' = apiTeam
          if (e.type === 'Goal' && e.detail === 'Normal Goal') type = 'goal'
          else if (e.type === 'Goal' && e.detail === 'Own Goal') { type = 'og'; team = oppositeTeam(apiTeam) }
          else if (e.type === 'Goal' && e.detail === 'Penalty') type = 'pen_scored'
          else if (e.type === 'Goal' && e.detail === 'Missed Penalty') type = 'pen_missed'
          else if (e.type === 'Card' && e.detail === 'Yellow Card') type = 'yellow'
          else if (e.type === 'Card' && e.detail === 'Red Card') type = 'red'
          else if (e.type === 'Card' && e.detail === 'Second Yellow card') { type = 'red'; secondYellow = true }
          else if (e.type === 'subst') type = 'sub'
          if (!type) return null
          const isSub = type === 'sub'
          const player = isSub ? (apiAssistId || apiAssist || apiPlayerId || apiPlayer) : (apiPlayerId || apiPlayer)
          const playerOut = isSub ? (apiPlayerId || apiPlayer) : undefined
          const assistPlayer = type === 'goal' ? (apiAssistId || apiAssist || undefined) : undefined
          return {
            id: '',
            minute,
            type,
            player,
            team,
            ...(isSub && playerOut ? { playerOut } : {}),
            ...(assistPlayer ? { assistPlayer } : {}),
            ...(secondYellow ? { secondYellow: true } : {}),
          } as MatchEvent
        })
        .filter((e): e is MatchEvent => e !== null)
      const statusShort = f.fixture?.status?.short ?? ''
      const allEvents = [...mapped, ...derivePhaseEvents(mapped, statusShort)]
        .sort((a, b) => eventSortKey(a.minute, a.type === 'phase' ? a.phase : undefined) - eventSortKey(b.minute, b.type === 'phase' ? b.phase : undefined))
      setApiEvents(allEvents)
      setApiScore({ home: f.goals?.home ?? null, away: f.goals?.away ?? null })
      const pen = f.score?.penalty
      setApiPens(pen && pen.home != null && pen.away != null ? { home: pen.home, away: pen.away } : null)
      setApiStatus(statusShort)
      setApiPanel(true)
    } catch {
      setFeedback({ kind: 'error', message: 'تعذّر جلب بيانات المباراة من المصدر.' })
    } finally {
      setApiFetching(false)
    }
  }

  const saveApiMatchData = async () => {
    if (!match || apiEvents.length === 0) return
    setApiSaving(true)
    try {
      // Update score
      if (apiScore && apiScore.home != null && apiScore.away != null) {
        await updateMatchFields(match.id, { score: { home: apiScore.home, away: apiScore.away } })
      }

      // Determine match state from API status and score
      const statusShort = apiStatus
      const finished = ['FT', 'AET', 'PEN'].includes(statusShort)
      const hasExtra = finished && (apiEvents.some(e => e.type === 'phase' && ['extra_first_half', 'extra_break_1', 'extra_second_half', 'extra_break_2'].includes(e.phase!)))
      const hasPens = finished && (apiEvents.some(e => e.type === 'phase' && e.phase === 'penalties'))

      // Update match control
      if (finished) {
        const clockBaseSeconds = hasExtra ? 120 * 60 : 90 * 60
        await updateMatchControl(match.id, {
          controlPhase: 'final',
          status: 'final',
          clockBaseSeconds,
          clockStartedAt: null,
          clockRunning: false,
          addedTime: {},
          penalties: { home: hasPens ? (apiPens?.home ?? 0) : 0, away: hasPens ? (apiPens?.away ?? 0) : 0 },
        })
      }

      // Save events
      for (const ev of apiEvents) {
        await createMatchEvent(match.id, {
          minute: ev.minute,
          type: ev.type,
          player: ev.player,
          team: ev.team,
          ...(ev.playerOut ? { playerOut: ev.playerOut } : {}),
          ...(ev.assistPlayer ? { assistPlayer: ev.assistPlayer } : {}),
          ...(ev.secondYellow ? { secondYellow: true } : {}),
          ...(ev.phase ? { phase: ev.phase } : {}),
        })
      }

      // Auto-fetch post-match data once the match is finished
      if (finished && match.fixtureId) {
        fetchAndSaveMatchRatings(match)
          .then((count) => {
            if (count > 0) setFeedback({ kind: 'success', message: `تم جلب تقييمات ${count} لاعب تلقائياً.` })
          })
          .catch(() => {
            setFeedback({ kind: 'error', message: 'تعذّر جلب التقييمات تلقائياً — يمكنك المحاولة من تبويب التشكيلة.' })
          })
        fetchAndSaveMatchStatistics(match)
          .then((count) => {
            if (count > 0) setFeedback({ kind: 'success', message: `تم جلب ${count} مؤشر إحصائي — راجع تبويب الإحصائيات.` })
          })
          .catch(() => {
            setFeedback({ kind: 'error', message: 'تعذّر جلب الإحصائيات تلقائياً — يمكنك المحاولة من تبويب الإحصائيات.' })
          })
        fetchAndSaveMatchPlayerStatistics(match)
          .then((count) => {
            if (count > 0) setFeedback({ kind: 'success', message: `تم جلب إحصائيات ${count} لاعب — راجع تبويب «إحصائيات اللاعبين».` })
          })
          .catch(() => {
            setFeedback({ kind: 'error', message: 'تعذّر جلب إحصائيات اللاعبين تلقائياً — جاهزة بعد قليل.' })
          })
      }

      setFeedback({ kind: 'success', message: `تم حفظ النتيجة (${apiScore?.home ?? 0} - ${apiScore?.away ?? 0}) و ${apiEvents.length} حدث في قاعدة البيانات.` })
      setApiPanel(false)
      setApiEvents([])
      setApiScore(null)
      setApiPens(null)
      setApiStatus('')
    } catch {
      setFeedback({ kind: 'error', message: 'فشل حفظ البيانات — تحقق من الاتصال ثم حاول مرة أخرى.' })
    } finally {
      setApiSaving(false)
    }
  }

  const onAction = (a: FlowAction) => {
    if (a.kind === 'advance' && a.next) {
      const next = a.next
      setConfirm({ label: a.label, danger: a.danger, onConfirm: () => { flow.go(next); eventsHook.addPhaseMarker(next, minute) } })
    } else if (a.kind === 'penalties') {
      flow.startPenalties()
      eventsHook.addPhaseMarker('penalties', minute)
      setPenaltiesOpen(true)
    } else if (a.kind === 'shootout') {
      setPenaltiesOpen(true)
    } else if (a.kind === 'final') {
      setConfirm({
        label: 'إنهاء المباراة',
        danger: true,
        note: match.fixtureId ? 'سيتم جلب تقييمات اللاعبين وإحصائيات المباراة واللاعبين تلقائياً بعد الانتهاء.' : undefined,
        onConfirm: () => {
          flow.finishMatch()
          eventsHook.addPhaseMarker('final', minute)
          if (match.fixtureId) {
            setFeedback({ kind: 'info', message: 'المباراة انتهت — جارٍ جلب التقييمات والإحصائيات...' })
            fetchAndSaveMatchRatings(match)
              .then((count) => {
                setFeedback({ kind: count > 0 ? 'success' : 'info', message: count > 0 ? `تم جلب تقييمات ${count} لاعب.` : 'لا توجد تقييمات متاحة لهذه المباراة.' })
              })
              .catch(() => {
                setFeedback({ kind: 'error', message: 'فشل جلب التقييمات — يمكنك المحاولة من تبويب التشكيلة.' })
              })
            fetchAndSaveMatchStatistics(match)
              .then((count) => {
                setFeedback({ kind: count > 0 ? 'success' : 'info', message: count > 0 ? `تم جلب ${count} مؤشر إحصائي — راجع تبويب الإحصائيات.` : 'لا توجد إحصائيات متاحة لهذه المباراة بعد.' })
              })
              .catch(() => {
                setFeedback({ kind: 'error', message: 'فشل جلب الإحصائيات — يمكنك المحاولة من تبويب الإحصائيات.' })
              })
            fetchAndSaveMatchPlayerStatistics(match)
              .then((count) => {
                setFeedback({ kind: count > 0 ? 'success' : 'info', message: count > 0 ? `تم جلب إحصائيات ${count} لاعب — راجع تبويب «إحصائيات اللاعبين».` : 'لا توجد إحصائيات لاعبين متاحة لهذه المباراة بعد.' })
              })
              .catch(() => {
                setFeedback({ kind: 'error', message: 'فشل جلب إحصائيات اللاعبين — يمكنك المحاولة من تبويب الإحصائيات.' })
              })
          }
        },
      })
    }
  }

  const actions: FlowAction[] = (() => {
    const start = <PlayCircleIcon fontSize="small" />
    const stop = <StopCircleIcon fontSize="small" />
    const pen = <SportsSoccerIcon fontSize="small" />
    switch (flow.phase) {
      case 'not_started':
        return [{ label: 'بدء المباراة', kind: 'advance', next: 'first_half', icon: start }]
      case 'first_half':
        return [{ label: 'إنهاء الشوط الأول', kind: 'advance', next: 'half_time', icon: stop, danger: true }]
      case 'half_time':
        return [{ label: 'بدء الشوط الثاني', kind: 'advance', next: 'second_half', icon: start }]
      case 'second_half':
        return [
          { label: 'إنهاء الشوط الثاني', kind: 'advance', next: 'full_time', icon: stop, danger: true },
          { label: 'إنهاء المباراة', kind: 'final', icon: stop, danger: true },
        ]
      case 'full_time':
        return isDraw
          ? [
              { label: 'بدء الشوط الإضافي الأول', kind: 'advance', next: 'extra_first_half', icon: start },
              { label: 'بدء ركلات الترجيح', kind: 'penalties', icon: pen },
            ]
          : [{ label: 'إنهاء المباراة', kind: 'final', icon: stop, danger: true }]
      case 'extra_first_half':
        return [{ label: 'إنهاء الشوط الإضافي الأول', kind: 'advance', next: 'extra_break_1', icon: stop, danger: true }]
      case 'extra_break_1':
        return [{ label: 'بدء الشوط الإضافي الثاني', kind: 'advance', next: 'extra_second_half', icon: start }]
      case 'extra_second_half':
        return isDraw
          ? [{ label: 'إنهاء الشوط الإضافي الثاني', kind: 'advance', next: 'extra_break_2', icon: stop, danger: true }]
          : [{ label: 'إنهاء المباراة', kind: 'final', icon: stop, danger: true }]
      case 'extra_break_2':
        return isDraw
          ? [{ label: 'بدء ركلات الترجيح', kind: 'penalties', icon: pen }]
          : [{ label: 'إنهاء المباراة', kind: 'final', icon: stop, danger: true }]
      case 'penalties':
        return [
          { label: 'سجل ركلات الترجيح', kind: 'shootout', icon: pen },
          { label: 'إنهاء المباراة', kind: 'final', icon: stop, danger: true },
        ]
      case 'final':
        return []
    }
  })()

  return (
    <Stack spacing={3}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Stack spacing={0.5}>
          <Typography variant="h4">التحكم بالمباراة (Live Control)</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {match.competition} — {match.round} · {match.stadium}
          </Typography>
        </Stack>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <MatchStatusBadge status={flow.status} minute={badgeMinute} />
          {match?.fixtureId && (
            <Button
              variant="contained"
              size="small"
              onClick={fetchApiMatchData}
              disabled={apiFetching || apiSaving}
              startIcon={apiFetching ? <CircularProgress size={16} sx={{ color: '#062A16' }} /> : <CloudDownloadIcon sx={{ fontSize: 18 }} />}
              sx={{
                whiteSpace: 'nowrap',
                fontWeight: 800,
                px: 2.5,
                borderRadius: 2.5,
                columnGap: 1.5,
                color: '#04304D',
                background: 'linear-gradient(135deg, #7FD8FF, #0E7CE8)',
                boxShadow: '0 6px 18px rgba(14,124,232,0.35)',
                '& .MuiButton-startIcon': { marginInline: 0 },
                '&:hover': { background: 'linear-gradient(135deg, #9BE0FF, #1098FF)', boxShadow: '0 8px 24px rgba(14,124,232,0.55)' },
                '&.Mui-disabled': { background: 'rgba(14,124,232,0.22)', color: 'rgba(255,255,255,0.55)' },
              }}
            >
              جلب النتيجة والأحداث
            </Button>
          )}
        </Stack>
      </Stack>

      {apiPanel && (
        <Paper sx={{ p: 3, borderRadius: 4, border: '1px solid rgba(127,216,255,0.4)', background: 'linear-gradient(160deg, rgba(127,216,255,0.1), rgba(10,13,28,0.85))', backdropFilter: 'blur(14px)' }}>
          <Stack spacing={2.5}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ flexWrap: 'wrap', gap: 1.5 }}>
              <Stack direction="row" alignItems="center" spacing={1.25}>
                <CloudDownloadIcon sx={{ fontSize: 20, color: '#7FD8FF' }} />
                <Typography sx={{ fontWeight: 800, fontSize: 16 }}>بيانات المباراة من المصدر (معاينة قبل الحفظ)</Typography>
              </Stack>
              {apiStatus && (
                <Chip
                  size="small"
                  label={`الحالة من المصدر: ${apiStatus}`}
                  sx={{ bgcolor: 'rgba(127,216,255,0.12)', color: '#7FD8FF', fontWeight: 700, border: '1px solid rgba(127,216,255,0.4)' }}
                />
              )}
            </Stack>

            <Grid container spacing={3} alignItems="center">
              <Grid item xs={3}>
                <Box
                  component="img"
                  src={match.home.logo}
                  alt={match.home.name}
                  sx={{ height: 44, width: 'auto', maxWidth: 100, objectFit: 'contain', mx: 'auto', display: 'block' }}
                />
              </Grid>
              <Grid item xs={6}>
                <Stack alignItems="center" spacing={0.5}>
                  <Typography sx={{ fontWeight: 900, fontSize: { xs: 34, md: 44 }, fontFamily: '"Cairo", sans-serif', lineHeight: 1, color: '#7FD8FF' }}>
                    {apiScore?.home ?? '—'} : {apiScore?.away ?? '—'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>النتيجة الحقيقية من المصدر</Typography>
                </Stack>
              </Grid>
              <Grid item xs={3}>
                <Box
                  component="img"
                  src={match.away.logo}
                  alt={match.away.name}
                  sx={{ height: 44, width: 'auto', maxWidth: 100, objectFit: 'contain', mx: 'auto', display: 'block' }}
                />
              </Grid>
            </Grid>

            <Stack spacing={1}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <EventNoteIcon sx={{ fontSize: 18, color: '#FEBE10' }} />
                <Typography sx={{ fontWeight: 800, fontSize: 14 }}>أحداث المباراة ({apiEvents.length})</Typography>
              </Stack>
              <Box sx={{ maxHeight: 280, overflowY: 'auto', pr: 1 }}>
                {apiEvents.length === 0 ? (
                  <Stack alignItems="center" justifyContent="center" spacing={1} sx={{ py: 4, border: '1px dashed rgba(127,216,255,0.25)', borderRadius: 3 }}>
                    <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>لا توجد أحداث مستوردة من المصدر</Typography>
                  </Stack>
                ) : (
                  <Stack spacing={0.75}>
                    {apiEvents.map((e, idx) => {
                      const color = EVENT_COLORS[e.type] ?? '#FEBE10'
                      const isHome = e.team === 'home'
                      const label = e.type === 'phase' ? phaseMarkerLabel(e) : e.type === 'sub' ? (playerName(e.player) || playerName(e.playerOut) || '—') : playerName(e.player) || '(بدون لاعب)'
                      const secondaryLabel = e.type === 'sub' && e.playerOut ? playerName(e.playerOut) : undefined
                      return (
                        <Box
                          key={`${idx}-${e.minute}`}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.25,
                            px: 1.5,
                            py: 0.75,
                            borderRadius: 2,
                            bgcolor: 'rgba(255,255,255,0.03)',
                          }}
                        >
                          <Box sx={{ minWidth: 58, textAlign: 'center', fontWeight: 900, fontSize: 13, color: '#FEBE10', bgcolor: '#0A0E1C', border: '1px solid rgba(254,190,16,0.4)', borderRadius: 999, px: 1, py: 0.35 }}>
                            {e.minute}
                          </Box>
                          <Box sx={{ width: 30, height: 30, flexShrink: 0, borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: `${color}1A`, border: `1px solid ${color}45`, color }}>
                            {eventMeta[e.type].icon}
                          </Box>
                          <Stack spacing={0.1} sx={{ minWidth: 0, flex: 1, alignItems: isHome ? 'flex-end' : 'flex-start' }}>
                            <Typography noWrap sx={{ fontWeight: 700, fontSize: 13, textAlign: isHome ? 'right' : 'left' }}>{label}</Typography>
                            {secondaryLabel && <Typography noWrap sx={{ fontSize: 10.5, color: '#FF8A80', fontWeight: 600 }}>{secondaryLabel}</Typography>}
                          </Stack>
                          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ flexShrink: 0 }}>
                            {match[isHome ? 'home' : 'away'].logo ? (
                              <Box component="img" src={match[isHome ? 'home' : 'away'].logo} alt="" sx={{ height: 18, width: 'auto', maxWidth: 18, objectFit: 'contain' }} />
                            ) : (
                              <Avatar sx={{ width: 18, height: 18, fontSize: 9, fontWeight: 800, bgcolor: match[isHome ? 'home' : 'away'].color + '33' }}>{match[isHome ? 'home' : 'away'].short}</Avatar>
                            )}
                          </Stack>
                        </Box>
                      )
                    })}
                  </Stack>
                )}
              </Box>
            </Stack>

            <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="flex-start">
              <Button
                variant="contained"
                onClick={saveApiMatchData}
                disabled={apiSaving || apiEvents.length === 0}
                startIcon={apiSaving ? <CircularProgress size={16} sx={{ color: 'text.secondary' }} /> : <SaveIcon />}
                sx={{
                  color: '#062A16',
                  fontWeight: 800,
                  background: 'linear-gradient(135deg, #00E676, #00C853)',
                  boxShadow: '0 6px 20px rgba(0, 230, 118, 0.35)',
                  '&:hover': { background: 'linear-gradient(135deg, #00E676, #00A84C)' },
                  '&:disabled': { bgcolor: 'rgba(255,255,255,0.08)', color: 'text.secondary', boxShadow: 'none' },
                }}
              >
                {apiSaving ? 'جارٍ الحفظ...' : 'حفظ النتيجة والأحداث في القاعدة'}
              </Button>
              <Button onClick={() => setApiPanel(false)} disabled={apiSaving} sx={{ color: 'text.secondary', fontWeight: 700 }}>
                إلغاء
              </Button>
            </Stack>
          </Stack>
        </Paper>
      )}

      <Paper sx={{ p: 3, borderRadius: 4, background: 'linear-gradient(160deg, rgba(0,87,168,0.55) 0%, rgba(10,13,28,0.7) 55%, rgba(10,13,28,0.8) 100%)', border: '1px solid rgba(0, 87, 168, 0.5)', backdropFilter: 'blur(14px)', overflow: 'hidden' }}>
        <Stack spacing={2.5}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ flexWrap: 'wrap', gap: 1 }}>
            <Stack direction="row" alignItems="center" spacing={1.25}>
              <TimerIcon sx={{ fontSize: 18, color: '#FEBE10' }} />
              <Typography sx={{ fontWeight: 800, fontSize: 15 }}>لوحة المباراة المباشرة (Live Scoreboard)</Typography>
            </Stack>
            {extraSeconds > 0 && declared > 0 && (
              <Chip
                size="small"
                label={`الوقت البدل الضائع المعلن: ${Math.round(baseSeconds / 60)}+${declared}`}
                sx={{
                  bgcolor: passedDeclared ? 'rgba(255,82,82,0.14)' : 'rgba(254,190,16,0.12)',
                  color: passedDeclared ? '#FF8A80' : '#FEBE10',
                  fontWeight: 700,
                  border: `1px solid ${passedDeclared ? 'rgba(255,82,82,0.5)' : 'rgba(254,190,16,0.4)'}`,
                }}
              />
            )}
          </Stack>

          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={3}>
              <Stack alignItems="center" spacing={1.5} sx={{ height: '100%', justifyContent: 'center' }}>
                <Chip
                  label={
                    <Stack direction="row" alignItems="center" spacing={0.75}>
                      {phaseIsRunning(flow.phase) && <FiberManualRecordIcon sx={{ fontSize: 12, color: '#00E676' }} />}
                      <Typography component="span" sx={{ fontWeight: 800 }}>{phaseLabel[flow.phase]}</Typography>
                    </Stack>
                  }
                  sx={{
                    bgcolor: phaseIsRunning(flow.phase) ? 'rgba(0,230,118,0.1)' : 'rgba(254,190,16,0.1)',
                    color: phaseIsRunning(flow.phase) ? '#00E676' : '#FEBE10',
                    border: `1px solid ${phaseIsRunning(flow.phase) ? 'rgba(0,230,118,0.35)' : 'rgba(254,190,16,0.35)'}`,
                  }}
                />
                <Stack direction="row" alignItems="baseline" spacing={1}>
                  <Typography variant="h2" sx={{ fontFamily: '"Cairo", sans-serif', letterSpacing: 2, fontSize: { xs: 44, md: 52 }, lineHeight: 1 }}>
                    {fmt(baseSeconds)}
                  </Typography>
                  {extraSeconds > 0 && (
                    <Typography sx={{ color: passedDeclared ? '#FF5252' : '#FEBE10', fontWeight: 800, fontFamily: '"Cairo", sans-serif', fontSize: { xs: 22, md: 28 } }}>
                      +{fmt(extraSeconds)}
                    </Typography>
                  )}
                </Stack>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                  {phaseIsRunning(flow.phase) ? 'ساعة المباراة — مباشر' : 'ساعة المباراة — متوقفة'}
                </Typography>
              </Stack>
            </Grid>

            <Grid item xs={12} md={6}>
              <Stack spacing={1.75} alignItems="center">
                <Stack direction="row" alignItems="center" justifyContent="space-evenly" sx={{ width: '100%' }}>
                  <Stack alignItems="center" spacing={1} sx={{ minWidth: 0, flex: 1 }}>
                    <Tooltip title={`تسجيل هدف سريع لـ${match.home.name}`} placement="top">
                      <IconButton
                        size="small"
                        aria-label={`هدف سريع لـ${match.home.name}`}
                        onClick={() => setGoalTeam('home')}
                        sx={{ color: '#00E676', border: '1px solid rgba(0,230,118,0.4)', bgcolor: 'rgba(0,230,118,0.1)', '&:hover': { bgcolor: 'rgba(0,230,118,0.22)' } }}
                      >
                        <AddIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {match.home.logo ? (
                      <Box
                        component="img"
                        src={match.home.logo}
                        alt={match.home.name}
                        sx={{ height: { xs: 48, md: 60 }, width: 'auto', maxWidth: { xs: 48, md: 60 }, objectFit: 'contain', filter: 'drop-shadow(0 6px 18px rgba(0,0,0,0.35))' }}
                      />
                    ) : (
                      <Avatar
                        sx={{
                          bgcolor: match.home.color,
                          width: 60,
                          height: 60,
                          fontSize: 20,
                          fontWeight: 900,
                          border: '2px solid rgba(0,230,118,0.4)',
                          boxShadow: '0 6px 18px rgba(0,0,0,0.35)',
                        }}
                      >
                        {match.home.short}
                      </Avatar>
                    )}
                    <Typography noWrap sx={{ fontWeight: 800, fontSize: 14, maxWidth: '100%', px: 0.5, textAlign: 'center' }}>{match.home.name}</Typography>
                    <Tooltip title={`إرسال إشعار ركلة جزاء لـ${match.home.name} — للمشجعين`} placement="bottom">
                      <IconButton
                        size="small"
                        aria-label={`إشعار ركلة جزاء لـ${match.home.name}`}
                        disabled={fanSending !== null}
                        onClick={() => sendPenaltyAwarded('home')}
                        sx={{ color: '#FEBE10', border: '1px solid rgba(254,190,16,0.4)', bgcolor: 'rgba(254,190,16,0.1)', '&:hover': { bgcolor: 'rgba(254,190,16,0.22)' } }}
                      >
                        {fanSending === 'penalty_awarded' ? <CircularProgress size={15} sx={{ color: '#FEBE10' }} /> : <AdjustIcon fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                  </Stack>
                  <Stack alignItems="center" spacing={0.5} sx={{ flexShrink: 0, px: { xs: 1, md: 2.5 } }}>
                    <Typography sx={{ color: '#FEBE10', fontWeight: 900, fontSize: { xs: 34, md: 44 }, fontFamily: '"Cairo", sans-serif', lineHeight: 1 }}>
                      {derived.score.home} : {derived.score.away}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>النتيجة الأساسية</Typography>
                  </Stack>
                  <Stack alignItems="center" spacing={1} sx={{ minWidth: 0, flex: 1 }}>
                    <Tooltip title={`تسجيل هدف سريع لـ${match.away.name}`} placement="top">
                      <IconButton
                        size="small"
                        aria-label={`هدف سريع لـ${match.away.name}`}
                        onClick={() => setGoalTeam('away')}
                        sx={{ color: '#00E676', border: '1px solid rgba(0,230,118,0.4)', bgcolor: 'rgba(0,230,118,0.1)', '&:hover': { bgcolor: 'rgba(0,230,118,0.22)' } }}
                      >
                        <AddIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {match.away.logo ? (
                      <Box
                        component="img"
                        src={match.away.logo}
                        alt={match.away.name}
                        sx={{ height: { xs: 48, md: 60 }, width: 'auto', maxWidth: { xs: 48, md: 60 }, objectFit: 'contain', filter: 'drop-shadow(0 6px 18px rgba(0,0,0,0.35))' }}
                      />
                    ) : (
                      <Avatar
                        sx={{
                          bgcolor: match.away.color,
                          width: 60,
                          height: 60,
                          fontSize: 20,
                          fontWeight: 900,
                          color: '#1A1400',
                          border: '2px solid rgba(255,82,82,0.4)',
                          boxShadow: '0 6px 18px rgba(0,0,0,0.35)',
                        }}
                      >
                        {match.away.short}
                      </Avatar>
                    )}
                    <Typography noWrap sx={{ fontWeight: 800, fontSize: 14, maxWidth: '100%', px: 0.5, textAlign: 'center' }}>{match.away.name}</Typography>
                    <Tooltip title={`إرسال إشعار ركلة جزاء لـ${match.away.name} — للمشجعين`} placement="bottom">
                      <IconButton
                        size="small"
                        aria-label={`إشعار ركلة جزاء لـ${match.away.name}`}
                        disabled={fanSending !== null}
                        onClick={() => sendPenaltyAwarded('away')}
                        sx={{ color: '#FEBE10', border: '1px solid rgba(254,190,16,0.4)', bgcolor: 'rgba(254,190,16,0.1)', '&:hover': { bgcolor: 'rgba(254,190,16,0.22)' } }}
                      >
                        {fanSending === 'penalty_awarded' ? <CircularProgress size={15} sx={{ color: '#FEBE10' }} /> : <AdjustIcon fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Stack>
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flexWrap: 'wrap', justifyContent: 'center' }}>
                  {flow.penalties.home + flow.penalties.away > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'rgba(255,82,82,0.1)', border: '1px solid rgba(255,82,82,0.35)', borderRadius: 2.5, px: 1.75, py: 0.6 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>ركلات الترجيح</Typography>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Chip size="small" label={match.home.short} sx={{ bgcolor: match.home.color + '66', color: '#fff', fontSize: 10, fontWeight: 800 }} />
                        <Typography sx={{ fontWeight: 900, fontSize: 16, color: '#FF8A80' }}>{flow.penalties.home} : {flow.penalties.away}</Typography>
                        <Chip size="small" label={match.away.short} sx={{ bgcolor: match.away.color + '66', color: '#1A1400', fontSize: 10, fontWeight: 800 }} />
                      </Stack>
                    </Box>
                  )}
                  {phaseIsRunning(flow.phase) && extraSeconds > 0 && (
                    <Stack direction="row" alignItems="center" spacing={0.75} sx={{ bgcolor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2.5, px: 1.25, py: 0.5 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>الوقت البدل الضائع</Typography>
                      <IconButton
                        size="small"
                        aria-label="تقليل الوقت البدل الضائع"
                        onClick={() => setDeclared(declared - 1)}
                        sx={{ border: '1px solid rgba(255,255,255,0.15)', color: 'text.secondary', '&:hover': { borderColor: '#FEBE10', color: '#FEBE10' } }}
                      >
                        <RemoveIcon fontSize="small" />
                      </IconButton>
                      <Typography sx={{ fontWeight: 800, color: '#FEBE10', minWidth: 28, textAlign: 'center' }}>{declared > 0 ? `+${declared}` : '0'}</Typography>
                      <IconButton
                        size="small"
                        aria-label="زيادة الوقت البدل الضائع"
                        onClick={() => setDeclared(declared + 1)}
                        sx={{ border: '1px solid rgba(255,255,255,0.15)', color: 'text.secondary', '&:hover': { borderColor: '#FEBE10', color: '#FEBE10' } }}
                      >
                        <AddIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  )}
                </Stack>
              </Stack>
            </Grid>

            <Grid item xs={12} md={3}>
              <Stack spacing={1.25} sx={{ bgcolor: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, p: 1.75, height: '100%', justifyContent: 'center' }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Box sx={{ width: 34, height: 34, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,87,168,0.4)', color: '#FEBE10', flexShrink: 0 }}>
                    <TimerIcon sx={{ fontSize: 18 }} />
                  </Box>
                  <Stack spacing={0.25}>
                    <Typography sx={{ fontWeight: 800, fontSize: 14 }}>التحكم بالمباراة</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11 }}>Match Flow</Typography>
                  </Stack>
                </Stack>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>الحالة الحالية</Typography>
                  <MatchStatusBadge status={flow.status} minute={badgeMinute} />
                </Stack>
                <Grid container spacing={1}>
                  {actions.map((a, i) => (
                    <Grid item xs={actions.length > 2 ? 6 : 12} key={a.label}>
                      <Button
                        fullWidth
                        size="small"
                        variant={i === 0 ? 'contained' : 'outlined'}
                        color={a.danger ? 'error' : 'primary'}
                        startIcon={a.icon}
                        onClick={() => onAction(a)}
                        sx={{
                          gap: 1,
                          justifyContent: 'center',
                          ...(a.kind === 'penalties' && i === 1
                            ? { color: '#FEBE10', borderColor: 'rgba(254, 190, 16, 0.5)' }
                            : {}),
                        }}
                      >
                        {a.label}
                      </Button>
                    </Grid>
                  ))}
                </Grid>
                {flow.phase === 'final' && (
                  <Chip label="انتهت المباراة نهائياً" sx={{ bgcolor: 'rgba(255, 82, 82, 0.12)', color: '#FF8A80', fontWeight: 700 }} />
                )}
              </Stack>
            </Grid>
          </Grid>
        </Stack>
      </Paper>

      <Paper sx={{ p: 3, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(14px)' }}>
        <Stack spacing={3}>
          <Typography variant="h6">الأحداث (Events)</Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={5}>
              <Box sx={{ position: 'relative', width: { xs: 340, sm: 400 }, height: { xs: 340, sm: 400 }, mx: 'auto', mt: 1 }}>
                <Box sx={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(circle at 50% 42%, #1A2333 0%, #131722 62%, #0D1220 100%)', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 0 50px rgba(0,0,0,0.5), inset 0 0 70px rgba(0,0,0,0.55)' }} />
                <Box sx={{ position: 'absolute', inset: 14, borderRadius: '50%', border: '1px dashed rgba(255,255,255,0.08)', animation: 'dsElSpin 26s linear infinite', '@keyframes dsElSpin': { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } } }} />
                <svg viewBox="0 0 400 400" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                  <circle cx="200" cy="200" r="188" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                  <g
                    onMouseEnter={() => setRingHover('hub')}
                    onMouseLeave={() => setRingHover(null)}
                    onClick={onVarCheck}
                    style={{ cursor: 'pointer' }}
                  >
                    <circle cx="200" cy="200" r="54" fill={ringHover === 'hub' ? 'rgba(38,52,75,0.95)' : 'rgba(27,37,54,0.9)'} stroke="rgba(255,255,255,0.14)" strokeWidth="1.5" style={{ transition: 'fill 0.3s ease' }} />
                  </g>
                  {eventActions.map((a, i) => {
                    const a0 = i * 45 - 20.2
                    const a1 = i * 45 + 20.2
                    const rOut = 172
                    const rIn = 66
                    const xy = (r: number, deg: number) => {
                      const rad = (deg * Math.PI) / 180
                      return `${200 + r * Math.sin(rad)},${200 - r * Math.cos(rad)}`
                    }
                    const d = `M ${xy(rOut, a0)} A ${rOut} ${rOut} 0 0 1 ${xy(rOut, a1)} L ${xy(rIn, a1)} A ${rIn} ${rIn} 0 0 0 ${xy(rIn, a0)} Z`
                    const active = ringHover === a.key
                    return (
                      <g
                        key={a.key}
                        onMouseEnter={() => setRingHover(a.key)}
                        onMouseLeave={() => setRingHover(null)}
                        onClick={() => {
                          setEventDlg({ type: a.key, team: 'home' })
                          setEventForm({ team: 'home', player: '', playerOut: '', assistPlayer: '', videoUrl: '', eventMinute: '', penaltyMissCause: '' })
                          resetTouched()
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <path d={d} fill={a.color} fillOpacity={active ? 0.18 : 0.08} stroke={active ? a.color : 'rgba(255,255,255,0.12)'} strokeWidth={active ? 2.5 : 1.5} strokeLinejoin="round" style={{ transition: 'fill-opacity 0.3s ease, stroke 0.3s ease, stroke-width 0.3s ease', filter: `drop-shadow(0 0 ${active ? 16 : 8}px ${a.color}${active ? 'AA' : '55'})` }} />
                      </g>
                    )
                  })}
                </svg>
                {eventActions.map((a, i) => {
                  const ang = (i * 45 * Math.PI) / 180
                  const active = ringHover === a.key
                  return (
                    <Box
                      key={a.key}
                      onClick={() => {
                        setEventDlg({ type: a.key, team: 'home' })
                        setEventForm({ team: 'home', player: '', playerOut: '', assistPlayer: '', videoUrl: '', eventMinute: '', penaltyMissCause: '' })
                        resetTouched()
                      }}
                      onMouseEnter={() => setRingHover(a.key)}
                      onMouseLeave={() => setRingHover(null)}
                      sx={{
                        position: 'absolute',
                        left: `${50 + 30 * Math.sin(ang)}%`,
                        top: `${50 - 30 * Math.cos(ang)}%`,
                        transform: 'translate(-50%, -50%)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 0.5,
                        cursor: 'pointer',
                        zIndex: 2,
                        color: a.color,
                        transition: 'all 0.18s ease',
                        ...(active ? { transform: 'translate(-50%, -50%) scale(1.12)' } : {}),
                      }}
                    >
                      <Box sx={{ display: 'flex', fontSize: 30, filter: active ? `drop-shadow(0 0 8px ${a.color})` : 'none', transition: 'filter 0.18s ease' }}>{a.icon}</Box>
                      <Typography sx={{ fontWeight: 800, fontSize: 10.5, lineHeight: 1.15, textAlign: 'center', color: active ? a.color : 'rgba(255,255,255,0.92)', textShadow: active ? `0 0 12px ${a.color}AA` : 'none', maxWidth: 110, transition: 'color 0.18s ease, text-shadow 0.18s ease' }}>{a.label}</Typography>
                    </Box>
                  )
                })}
                <Box
                  onClick={onVarCheck}
                  onMouseEnter={() => setRingHover('hub')}
                  onMouseLeave={() => setRingHover(null)}
                  sx={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 108,
                    height: 108,
                    borderRadius: '50%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 0.6,
                    cursor: 'pointer',
                    zIndex: 2,
                    transition: 'all 0.3s ease',
                    ...(ringHover === 'hub' ? { transform: 'translate(-50%, -50%) scale(1.05)' } : {}),
                  }}
                >
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 0 }}>
                    <Box sx={{ width: 38, height: 27, borderRadius: 1.5, border: '1.5px solid #7FD8FF', background: 'linear-gradient(180deg, #16263B, #0E1926)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: ringHover === 'hub' ? '0 0 20px rgba(127,216,255,0.55)' : '0 0 12px rgba(127,216,255,0.25)', transition: 'all 0.3s ease' }}>
                      <Typography sx={{ fontSize: 10, fontWeight: 900, color: '#7FD8FF', letterSpacing: 0.5 }}>VAR</Typography>
                    </Box>
                    <Box sx={{ width: 7, height: 3, bgcolor: '#7FD8FF', opacity: 0.7 }} />
                    <Box sx={{ width: 16, height: 2, bgcolor: 'rgba(127,216,255,0.5)', borderRadius: 1 }} />
                  </Box>
                  <Typography sx={{ fontWeight: 800, fontSize: 9.5, textAlign: 'center', lineHeight: 1.3, color: 'rgba(255,255,255,0.85)' }}>مراجعة حكم الفيديو</Typography>
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12} md={7}>
              <Box sx={{ display: 'flex', flexDirection: 'column', height: { xs: 340, sm: 400 } }}>                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.25, flexShrink: 0 }}>
                <Stack direction="row" alignItems="center" spacing={0.75}>
                  <EventNoteIcon sx={{ fontSize: 18, color: '#FEBE10' }} />
                  <Typography sx={{ fontWeight: 800, fontSize: 13.5 }}>الخط الزمني (Timeline)</Typography>
                </Stack>
              </Stack>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 1.5, mb: 1, flexShrink: 0 }}>
                <Stack direction="row" alignItems="center" spacing={0.75} sx={{ minWidth: 0, justifyContent: 'flex-end' }}>
                  <Typography noWrap sx={{ fontWeight: 800, fontSize: 13 }}>{match.home.name}</Typography>
                  {match.home.logo ? (
                    <Box component="img" src={match.home.logo} alt={match.home.name} sx={{ height: 34, width: 'auto', maxWidth: 34, objectFit: 'contain', flexShrink: 0 }} />
                  ) : (
                    <Avatar sx={{ width: 34, height: 34, fontSize: 13, fontWeight: 800, bgcolor: match.home.color + '33' }}>{match.home.short}</Avatar>
                  )}
                </Stack>
                <Box sx={{ minWidth: 64 }} />
                <Stack direction="row" alignItems="center" spacing={0.75} sx={{ minWidth: 0 }}>
                  {match.away.logo ? (
                    <Box component="img" src={match.away.logo} alt={match.away.name} sx={{ height: 34, width: 'auto', maxWidth: 34, objectFit: 'contain', flexShrink: 0 }} />
                  ) : (
                    <Avatar sx={{ width: 34, height: 34, fontSize: 13, fontWeight: 800, bgcolor: match.away.color + '33' }}>{match.away.short}</Avatar>
                  )}
                  <Typography noWrap sx={{ fontWeight: 800, fontSize: 13 }}>{match.away.name}</Typography>
                </Stack>
              </Box>
              <Box sx={{ position: 'relative', flex: 1, overflowY: 'auto', minHeight: 0 }}>                {timeline.length === 0 ? (
                  <Stack alignItems="center" justifyContent="center" spacing={1.5} sx={{ py: 7, textAlign: 'center', border: '1px dashed rgba(254,190,16,0.25)', borderRadius: 3, bgcolor: 'rgba(254,190,16,0.02)' }}>
                    <Box
                      sx={{
                        width: 64,
                        height: 64,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'rgba(254,190,16,0.08)',
                        border: '1px dashed rgba(254,190,16,0.4)',
                        color: '#FEBE10',
                      }}
                    >
                      <EventNoteIcon sx={{ fontSize: 32 }} />
                    </Box>
                    <Typography sx={{ fontWeight: 800, fontSize: 15, color: 'text.secondary' }}>لا أحداث مسجلة بعد</Typography>
                    <Typography sx={{ fontSize: 13, color: 'text.secondary', opacity: 0.7 }}>ستظهر هنا الأحداث التي تسجلها من الأزرار الجانبية</Typography>
                  </Stack>
                ) : (
                  <Stack spacing={1.25} sx={{ position: 'relative' }}>
                    <Box sx={{ position: 'absolute', top: 10, bottom: 10, left: 'calc(50% - 1px)', width: 2, bgcolor: 'rgba(255,255,255,0.07)' }} />
                    {timeline.map((e) => {
                      if (e.type === 'phase') {
                        return (
                          <Stack key={e.id} direction="row" alignItems="center" spacing={1.25} sx={{ position: 'relative', '&:hover .row-actions': { opacity: 1 } }}>
                            <Divider sx={{ flex: 1, borderColor: 'rgba(255,255,255,0.06)' }} />
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ position: 'relative', width: 'fit-content', flexShrink: 0, whiteSpace: 'nowrap', bgcolor: '#0A0E1C', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 999, px: 2.5, py: 0.75 }}>
                              <TimerIcon sx={{ fontSize: 16, color: '#FEBE10', flexShrink: 0 }} />
                              <Typography sx={{ fontWeight: 800, fontSize: 13, color: 'text.secondary', lineHeight: 1.1 }}>{phaseMarkerLabel(e)}</Typography>
                              {(['half_time', 'full_time', 'extra_break_1', 'extra_break_2'] as const).includes(e.phase as never) && (
                                <Typography sx={{ fontWeight: 900, fontSize: 12.5, color: '#FEBE10', lineHeight: 1.1, flexShrink: 0 }}>{e.minute}</Typography>
                              )}
<Box className="row-actions" sx={{ position: 'absolute', top: '50%', right: '100%', transform: 'translateY(-50%)', display: 'flex', opacity: 0, transition: 'opacity .15s ease' }}>
                                <Tooltip title="حذف العلامة">
                                  <IconButton size="small" onClick={() => setUndoTarget(e)} sx={{ color: 'text.secondary', p: 0.5, '&:hover': { color: '#FF8A80' } }}>
                                    <UndoIcon sx={{ fontSize: 17 }} />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </Stack>
                            <Divider sx={{ flex: 1, borderColor: 'rgba(255,255,255,0.06)' }} />
                          </Stack>
                        )
                      }
                      if (e.type === 'var') {
                        const resolved = e.varDecision === 'error' ? 'error' : e.varDecision === 'no_error' ? 'no_error' : null
                        const statusColor = resolved === 'error' ? '#FF5252' : resolved === 'no_error' ? '#00E676' : '#7FD8FF'
                        const statusText = resolved === 'error'
                          ? 'نتيجة المراجعة: يوجد خطأ'
                          : resolved === 'no_error'
                            ? 'نتيجة المراجعة: لا يوجد خطأ'
                            : 'اضغط لتسجيل نتيجة المراجعة'
                        return (
                          <Box
                            key={e.id}
                            onClick={() => openVarReview(e.id)}
                            sx={{
                              display: 'grid',
                              gridTemplateColumns: '1fr auto 1fr',
                              alignItems: 'center',
                              gap: 1.5,
                              position: 'relative',
                              width: '100%',
                              px: 1.5,
                              py: 1,
                              borderRadius: 2,
                              cursor: 'pointer',
                              border: `1px solid ${resolved === 'error' ? 'rgba(255,82,82,0.28)' : 'rgba(127,216,255,0.22)'}`,
                              bgcolor: '#0A0D18',
                              backgroundImage: resolved === 'error'
                                ? 'linear-gradient(90deg, rgba(255,82,82,0.14), rgba(255,82,82,0.05) 55%, rgba(255,82,82,0))'
                                : 'linear-gradient(90deg, rgba(127,216,255,0.14), rgba(127,216,255,0.05) 55%, rgba(127,216,255,0))',
                              transition: 'all 0.15s ease',
                              '&:hover': { borderColor: resolved === 'error' ? 'rgba(255,82,82,0.5)' : 'rgba(127,216,255,0.5)' },
                              '&:hover .row-actions': { opacity: 1 },
                            }}
                          >
                            <Stack direction="row" alignItems="center" spacing={0.75} sx={{ minWidth: 0, justifyContent: 'flex-end' }}>
                              <Box className="row-actions" sx={{ display: 'flex', flexShrink: 0, opacity: 0, transition: 'opacity .15s ease', flexDirection: 'row-reverse' }}>
                                <Tooltip title="حذف المراجعة">
                                  <IconButton size="small" onClick={(ev) => { ev.stopPropagation(); setUndoTarget(e) }} sx={{ color: 'text.secondary', p: 0.5, '&:hover': { color: '#FF8A80' } }}>
                                    <UndoIcon sx={{ fontSize: 17 }} />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                              <Stack spacing={0.25} sx={{ minWidth: 0, alignItems: 'flex-end' }}>
                                <Stack direction="row" alignItems="center" spacing={0.5}>
                                  <Typography sx={{ fontWeight: 800, fontSize: 13.5, lineHeight: 1.2 }}>مراجعة VAR</Typography>
                                  {!resolved && <FiberManualRecordIcon sx={{ fontSize: 9, color: '#7FD8FF' }} />}
                                </Stack>
                                <Typography noWrap sx={{ fontSize: 11, color: 'text.secondary', lineHeight: 1.2, maxWidth: 260 }}>
                                  {e.varCheckCause || 'مراجعة حكم الفيديو'}
                                </Typography>
                              </Stack>
                              <Box sx={{ width: 38, height: 38, flexShrink: 0, borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(127,216,255,0.10)', border: '1px solid rgba(127,216,255,0.35)' }}>
                                <Box component="img" src={varIcon} alt="VAR" sx={{ width: 20, height: 20, objectFit: 'contain' }} />
                              </Box>
                            </Stack>
                            <Box sx={{ position: 'relative', minWidth: 64, flexShrink: 0, textAlign: 'center', fontWeight: 900, fontSize: 14, color: '#FEBE10', bgcolor: '#0A0E1C', border: '1px solid rgba(254,190,16,0.4)', borderRadius: 999, px: 1.25, py: 0.5 }}>
                              {e.minute}
                            </Box>
                            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ minWidth: 0, justifyContent: 'flex-start' }}>
                              <Typography noWrap sx={{ fontSize: 11, fontWeight: 700, color: statusColor, lineHeight: 1.2 }}>{statusText}</Typography>
                            </Stack>
                          </Box>
                        )
                      }
                      const cancelled = e.varDecision === 'error'
                      const varChecked = Boolean(e.varAssigned || e.varDecision)
                      const color = cancelled ? '#FF5252' : (EVENT_COLORS[e.type] ?? '#FEBE10')
                      const isHome = e.team === 'home'
                      const showAssist = e.type === 'goal' && e.assistPlayer
                      const label = e.type === 'sub'
                        ? (playerName(e.player) || playerName(e.playerOut) || '—')
                        : (playerName(e.player) || '—')
const secondaryLabel = (e.type === 'pen_missed' && e.penaltyMissCause
  ? PENALTY_MISS_LABELS[e.penaltyMissCause]
  : showAssist
    ? { text: playerName(e.assistPlayer), color: '#90CAF9' }
    : (e.type === 'sub' && e.playerOut ? { text: playerName(e.playerOut), color: '#FF8A80' } : null))
                      const varBtn = VAR_EVENT_TYPES.includes(e.type as EventType)
  ? (
      <Tooltip title={e.varAssigned ? 'قرار الحكم بعد مراجعة VAR' : 'إرسال إشعار فحص VAR للجماهير'}>
        <IconButton size="small" disabled={fanSending !== null} onClick={(ev) => { ev.stopPropagation(); onVarButton(e.type as EventType, e.id, e.varAssigned, e.varDecision === 'error') }} sx={{ color: e.varDecision === 'error' ? '#FF5252' : '#FEBE10', p: 0.5, '&:hover': { bgcolor: e.varDecision === 'error' ? 'rgba(255,82,82,0.12)' : 'rgba(254,190,16,0.12)' } }}>
          <Box component="img" src={varIcon} alt="VAR" sx={{ width: 20, height: 20, objectFit: 'contain' }} />
        </IconButton>
      </Tooltip>
    )
  : null
                      const editBtn = (
                        <Tooltip title="تحرير الحدث">
                          <IconButton size="small" onClick={(ev) => { ev.stopPropagation(); startEdit(e) }} sx={{ color: 'text.secondary', p: 0.5, '&:hover': { color: '#8EC5FF', bgcolor: 'rgba(142,197,255,0.08)' } }}>
                            <EditIcon sx={{ fontSize: 17 }} />
                          </IconButton>
                        </Tooltip>
                      )
                      const undoBtn = (
                        <Tooltip title="تراجع / حذف الحدث">
                          <IconButton size="small" onClick={(ev) => { ev.stopPropagation(); setUndoTarget(e) }} sx={{ color: 'text.secondary', p: 0.5, '&:hover': { color: '#FF8A80', bgcolor: 'rgba(255,138,128,0.08)' } }}>
                            <UndoIcon sx={{ fontSize: 17 }} />
                          </IconButton>
                        </Tooltip>
                      )
                      const actions = (reversed?: boolean) => {
                        return (
                          <Box className="row-actions" sx={{ display: 'flex', flexShrink: 0, opacity: 0, transition: 'opacity .15s ease', ...(reversed ? { flexDirection: 'row-reverse' } : {}) }}>
                            {[varBtn, editBtn, undoBtn].filter(Boolean) as ReactElement[]}
                          </Box>
                        )
                      }
                      const video = e.videoUrl && (
                        <Tooltip title="مشاهدة الفيديو">
                          <IconButton size="small" component="a" href={e.videoUrl} target="_blank" rel="noreferrer" onClick={(ev) => ev.stopPropagation()} sx={{ color: '#FEBE10', p: 0.5, flexShrink: 0 }}>
                            <VideocamIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                      )
                      const secondYellowMark = e.type === 'red' && e.secondYellow && <SquareIcon sx={{ fontSize: 13, color: '#FDD835' }} />
                      const varBadge = varChecked && (
                        <Tooltip title={cancelled ? (e.varDecisionCause ? `الحدث مُلغى بقرار VAR — السبب: ${varCauseLabel(e.varDecisionCause)}` : 'الحدث مُلغى بقرار VAR') : 'تم فحص الحدث عبر VAR — القرار: لا يوجد خطأ'}>
                          <Box component="img" src={varIconPlain} alt="VAR" sx={{ position: 'absolute', top: -1, right: -1, width: 20, height: 20, objectFit: 'contain', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.6))' }} />
                        </Tooltip>
                      )
                      const eventIconBox = (
                        <Box sx={{ position: 'relative' }}>
                          <Box sx={{ width: 38, height: 38, flexShrink: 0, borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: `${color}1A`, border: `1px solid ${color}45`, color, '& svg': { fontSize: 19, ...(cancelled ? { color: '#FF5252' } : {}) } }}>
                            {eventMeta[e.type].icon}
                          </Box>
                          {varBadge}
                        </Box>
                      )
                      const nameStyle = { fontWeight: 700, fontSize: 14, ...(e.player === '' && e.type !== 'sub' ? { color: 'text.secondary', fontStyle: 'italic' } : {}) }
                      return (
                        <Box
                          key={e.id}
                          onClick={() => startEdit(e)}
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: '1fr auto 1fr',
                            alignItems: 'center',
                            gap: 1.5,
                            position: 'relative',
                            borderRadius: 2,
                            cursor: 'pointer',
                            transition: 'background 0.15s ease',
                            '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' },
                            '&:hover .row-actions': { opacity: 1 },
                          }}
                        >
                          {isHome ? (
                            <Stack direction="row" alignItems="center" spacing={0.75} sx={{ minWidth: 0, justifyContent: 'flex-end' }}>
                              {actions(true)}
                              {video}
                              <Stack direction="row" alignItems="center" spacing={0.5} sx={{ minWidth: 0, justifyContent: 'flex-end' }}>
                                <Stack spacing={0.25} sx={{ minWidth: 0, alignItems: 'flex-end' }}>
                                  <Stack direction="row" alignItems="center" spacing={0.5} sx={{ minWidth: 0 }}>
                                    <Typography noWrap sx={nameStyle}>{label}</Typography>
                                    {secondYellowMark}
                                  </Stack>
                                  {secondaryLabel && <Typography noWrap sx={{ ...nameStyle, fontSize: 10, color: secondaryLabel.color, fontWeight: 600, paddingInlineStart: 0.75 }}>{secondaryLabel.text}</Typography>}
                                </Stack>
                              </Stack>
                              {eventIconBox}
                            </Stack>
                          ) : (
                            <Box />
                          )}
                          <Box sx={{ position: 'relative', minWidth: 64, flexShrink: 0, textAlign: 'center', fontWeight: 900, fontSize: 14, color: '#FEBE10', bgcolor: '#0A0E1C', border: '1px solid rgba(254,190,16,0.4)', borderRadius: 999, px: 1.25, py: 0.5 }}>
                            {e.minute}
                          </Box>
                          {!isHome ? (
                            <Stack direction="row" alignItems="center" spacing={0.75} sx={{ minWidth: 0 }}>
                              {eventIconBox}
                              <Stack direction="row" alignItems="center" spacing={0.5} sx={{ minWidth: 0 }}>
                                <Stack spacing={0.25} sx={{ minWidth: 0, alignItems: 'flex-start' }}>
                                  <Stack direction="row" alignItems="center" spacing={0.5} sx={{ minWidth: 0 }}>
                                    <Typography noWrap sx={nameStyle}>{label}</Typography>
                                    {secondYellowMark}
                                  </Stack>
                                  {secondaryLabel && <Typography noWrap sx={{ ...nameStyle, fontSize: 10, color: secondaryLabel.color, fontWeight: 600, paddingInlineStart: 0.75 }}>{secondaryLabel.text}</Typography>}
                                </Stack>
                              </Stack>
                              {video}
                              {actions()} 
                            </Stack>
                          ) : (
                            <Box />
                          )}
                        </Box>
                      )
                    })}
                  </Stack>
                )}
              </Box>
              </Box>
            </Grid>
          </Grid>
        </Stack>
      </Paper>

      <Dialog open={eventDlg !== null} onClose={closeEventDialog} maxWidth="xs" fullWidth>
        <DialogTitle>
          {editingId ? `تعديل ${eventLabel} (Edit)` : `تسجيل ${eventLabel} (Event)`}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {editingId && (
              <TextField
                select
                label="نوع الحدث (Event Type)"
                fullWidth
                value={eventDlg?.type ?? 'goal'}
                onChange={(e) => setEventDlg((d) => d ? { ...d, type: e.target.value as EventType } : d)}
              >
                {eventActions.map((a) => (
                  <MenuItem key={a.key} value={a.key}>{a.label}</MenuItem>
                ))}
              </TextField>
            )}
            <TextField
              select
              label={eventDlg?.type === 'og' ? 'الفريق الذي سجّل لاعبُه في مرماه' : 'الفريق'}
              fullWidth
              value={eventForm.team}
              onChange={(e) => { setEventForm((f) => ({ ...f, team: e.target.value as 'home' | 'away', player: '', playerOut: '', assistPlayer: '' })) }}
            >
              <MenuItem value="home">{match.home.name}</MenuItem>
              <MenuItem value="away">{match.away.name}</MenuItem>
            </TextField>
            <TextField
              fullWidth
              label={eventDlg?.type === 'goal' || eventDlg?.type === 'og' ? `المسجل (من ${playerTeam === 'home' ? match.home.name : match.away.name})` : eventDlg?.type === 'sub' ? 'اللاعب الداخل (In)' : 'اللاعب (Player)'}
              value={playerName(eventForm.player)}
              placeholder="— غير محدد —"
              slotProps={{
                htmlInput: { readOnly: true },
                input: { endAdornment: <ExpandMoreIcon sx={{ color: 'text.secondary' }} /> },
              }}
              helperText={eventDlg?.type === 'sub' ? 'اختياري — يجب تحديد الداخل أو الخارج واحداً على الأقل' : 'اختياري — يمكنك تحديد اللاعب لاحقاً'}
              onClick={(e) => setEventPlayerAnchor(e.currentTarget)}
              sx={{ cursor: 'pointer' }}
            />
            <EventPlayerMenu
              open={Boolean(eventPlayerAnchor)}
              anchorEl={eventPlayerAnchor}
              label={eventDlg?.type === 'goal' || eventDlg?.type === 'og' ? 'اختر المسجل' : eventDlg?.type === 'sub' ? 'اختر اللاعب الداخل (In)' : 'اختر اللاعب'}
              players={playerTeam === 'home' ? homePlayers : awayPlayers}
              value={eventForm.player}
              exclude={eventDlg?.type === 'sub' ? [eventForm.playerOut].filter(Boolean) : undefined}
              color={(playerTeam === 'home' ? match.home : match.away).color}
              onSelect={(player) => {
                setEventForm((f) => ({ ...f, player: player.id, ...(player.id === f.playerOut ? { playerOut: '' } : {}) }))
                setEventPlayerAnchor(null)
              }}
              onClose={() => setEventPlayerAnchor(null)}
            />
            {eventDlg?.type === 'pen_missed' && (
              <Box sx={{ bgcolor: 'rgba(254,190,16,0.06)', border: '1px solid rgba(254,190,16,0.28)', borderRadius: 2, p: 1.5 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800, display: 'block', mb: 0.75 }}>
                  سبب إهدار ركلة الجزاء
                </Typography>
                <RadioGroup
                  row
                  value={eventForm.penaltyMissCause}
                  onChange={(e) => setEventForm((f) => ({ ...f, penaltyMissCause: e.target.value }))}
                >
                  <FormControlLabel value="saved" control={<Radio size="small" sx={{ color: 'rgba(254,190,16,0.6)', '&.Mui-checked': { color: '#FEBE10' } }} />} label="تصدّى لها الحارس" />
                  <FormControlLabel value="off_target" control={<Radio size="small" sx={{ color: 'rgba(254,190,16,0.6)', '&.Mui-checked': { color: '#FEBE10' } }} />} label="ضائعة" />
                </RadioGroup>
                <Typography variant="caption" sx={{ color: 'rgba(254,190,16,0.8)', display: 'block', mt: 0.5 }}>
                  يُرسل إشعار مختلف حسب السبب المختار.
                </Typography>
              </Box>
            )}
            {(eventDlg?.type === 'goal') && (
              <>
                <TextField
                  fullWidth
                  size="small"
                  label="صانع الهدف (Assist)"
                  value={playerName(eventForm.assistPlayer)}
                  placeholder="— غير محدد —"
                  slotProps={{
                    htmlInput: { readOnly: true },
                    input: { endAdornment: <ExpandMoreIcon sx={{ color: 'text.secondary' }} /> },
                  }}
                  helperText="اختياري — صانع الهدف"
                  onClick={(e) => setEventAssistAnchor(e.currentTarget)}
                  sx={{ cursor: 'pointer' }}
                />
                <EventPlayerMenu
                  open={Boolean(eventAssistAnchor)}
                  anchorEl={eventAssistAnchor}
                  label="اختر صانع الهدف"
                  players={playerTeam === 'home' ? homePlayers : awayPlayers}
                  value={eventForm.assistPlayer}
                  exclude={[eventForm.player].filter(Boolean)}
                  color={(playerTeam === 'home' ? match.home : match.away).color}
                  onSelect={(player) => {
                    setEventForm((f) => ({ ...f, assistPlayer: player.id }))
                    setEventAssistAnchor(null)
                  }}
                  onClose={() => setEventAssistAnchor(null)}
                />
              </>
            )}
            {eventDlg?.type === 'sub' && (
              <>
                <TextField
                  fullWidth
                  size="small"
                  label="اللاعب الخارج (Out)"
                  value={playerName(eventForm.playerOut)}
                  placeholder="— غير محدد —"
                  slotProps={{
                    htmlInput: { readOnly: true },
                    input: { endAdornment: <ExpandMoreIcon sx={{ color: 'text.secondary' }} /> },
                  }}
                  helperText="اختياري — يمكنك تحديده لاحقاً"
                  onClick={(e) => setEventPlayerOutAnchor(e.currentTarget)}
                  sx={{ cursor: 'pointer' }}
                />
                <EventPlayerMenu
                  open={Boolean(eventPlayerOutAnchor)}
                  anchorEl={eventPlayerOutAnchor}
                  label="اختر اللاعب الخارج (Out)"
                  players={eventForm.team === 'home' ? homePlayers : awayPlayers}
                  value={eventForm.playerOut}
                  exclude={[eventForm.player].filter(Boolean)}
                  color={(eventForm.team === 'home' ? match.home : match.away).color}
                  onSelect={(player) => {
                    setEventForm((f) => ({ ...f, playerOut: player.id, ...(player.id === f.player ? { player: '' } : {}) }))
                    setEventPlayerOutAnchor(null)
                  }}
                  onClose={() => setEventPlayerOutAnchor(null)}
                />
              </>
            )}
            <TextField
              label="دقيقة الحدث (Event Minute) — اختياري"
              fullWidth
              type="number"
              value={eventForm.eventMinute}
              onChange={(e) => setEventForm((f) => ({ ...f, eventMinute: e.target.value }))}
              onBlur={() => markTouched('eventMinute')}
              error={eventMinuteError}
              helperText={eventMinuteError ? `أدخل دقيقة صحيحة بين ${minuteMin} و ${minuteMax}` : `اختياري — من ${minuteMin} إلى ${minuteMax}، اتركه فارغاً لاستخدام الوقت الحالي (${minute})`}
              slotProps={{ htmlInput: { min: minuteMin, max: minuteMax, step: 1, inputMode: 'numeric', style: { MozAppearance: 'textfield' } } }}
              sx={{
                '& input[type="number"]::-webkit-outer-spin-button, & input[type="number"]::-webkit-inner-spin-button': {
                  WebkitAppearance: 'none',
                  margin: 0,
                },
              }}
            />
            <TextField label="رابط الفيديو (Video URL)" fullWidth value={eventForm.videoUrl} onChange={(e) => setEventForm((f) => ({ ...f, videoUrl: e.target.value }))} onBlur={() => markTouched('videoUrl')} placeholder="https://…" error={videoUrlError} helperText={videoUrlError ? 'أدخل رابطاً صحيحاً يبدأ بـ https://' : ' '} />
            {editingEvent ? (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                الدقيقة {editingEvent.minute} — تعديل الحدث.
              </Typography>
            ) : eventDlg?.type === 'og' ? (
              <Box sx={{ bgcolor: 'rgba(255, 112, 67, 0.08)', border: '1px solid rgba(255, 112, 67, 0.3)', borderRadius: 2, p: 2 }}>
                <Typography variant="body2" sx={{ color: '#FF7043', fontWeight: 700 }}>
                  هدف في مرماه — تُحتسب النتيجة لـ{playerTeam === 'home' ? match.away.name : match.home.name}.
                </Typography>
              </Box>
            ) : (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                الدقيقة {minute} — تُحسب تلقائياً حسب المؤقت.
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          {eventDlg && editingEvent && VAR_EVENT_TYPES.includes(eventDlg.type) && (
            <Button
              size="small"
              variant="contained"
              disabled={fanSending !== null}
              startIcon={fanSending === 'var' ? <CircularProgress size={15} color="inherit" /> : <Box component="img" src={varIcon} alt="VAR" sx={{ width: 22, height: 22, objectFit: 'contain' }} />}
              sx={{ background: 'linear-gradient(135deg, #FEBE10, #F57F17)', color: '#1A1400', gap: 1, marginInlineEnd: 'auto', '&:hover': { background: 'linear-gradient(135deg, #FFE082, #F57F17)' } }}
              onClick={() => onVarButton(eventDlg.type, editingId ?? undefined, editingEvent?.varAssigned, editingEvent?.varDecision === 'error')}
            >
              {fanSending === 'var' ? 'جارٍ الإرسال…' : 'إرسال إشعار VAR'}
            </Button>
          )}
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Button onClick={closeEventDialog} sx={{ color: 'text.secondary' }}>إلغاء</Button>
            <Button
              variant="contained"
              disabled={!canSaveEvent}
              onClick={saveEvent}
            >
              {editingId ? 'حفظ' : 'تسجيل'}
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>

      <Dialog open={goalTeam !== null} onClose={() => setGoalTeam(null)} maxWidth="xs" fullWidth>
        <DialogTitle>تسجيل هدف سريع (Quick Goal)</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              {goalTarget?.logo ? (
              <Box component="img" src={goalTarget.logo} alt={goalTarget.name} sx={{ height: 44, width: 'auto', maxWidth: 44, objectFit: 'contain' }} />
            ) : (
              <Avatar sx={{ bgcolor: goalTarget?.color, width: 44, height: 44, fontSize: 15, fontWeight: 800, color: goalTeam === 'away' ? '#1A1400' : '#fff' }}>{goalTarget?.short}</Avatar>
            )}
              <Stack spacing={0.25}>
                <Typography sx={{ fontWeight: 700 }}>{goalTarget?.name}</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>الدقيقة {minute}</Typography>
              </Stack>
            </Stack>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              سيُسجَّل الهدف في سجل الأحداث دون تحديد المسجل، ويمكنك إسناده لاحقاً عبر زر «تحرير» على الحدث.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGoalTeam(null)} sx={{ color: 'text.secondary' }}>إلغاء</Button>
          <Button variant="contained" onClick={confirmGoal} sx={{ gap: 1, background: 'linear-gradient(135deg, #00E676, #00C853)', color: '#062A16', '&:hover': { background: 'linear-gradient(135deg, #00E676, #00A84C)' } }}>
            تسجيل الهدف
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={penaltiesOpen} onClose={() => setPenaltiesOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>ركلات الترجيح (Penalty Shootout)</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="center">
              <Typography variant="h5" sx={{ color: '#FEBE10' }}>{match.home.short}</Typography>
              <Typography variant="h5" sx={{ color: '#FEBE10' }}>{flow.penalties.home} : {flow.penalties.away}</Typography>
              <Typography variant="h5" sx={{ color: '#FEBE10' }}>{match.away.short}</Typography>
            </Stack>
            <Grid container spacing={2}>
              {([
                { key: 'home', team: match.home, color: '#fff', players: homePlayers },
                { key: 'away', team: match.away, color: '#1A1400', players: awayPlayers },
              ] as const).map(({ key, team, color, players: teamPlayers }) => (
                <Grid item xs={6} key={key}>
                  <Paper sx={{ p: 2, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)' }}>
                    <Stack spacing={1.5}>
                      <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                          {team.logo ? <Box component="img" src={team.logo} alt={team.name} sx={{ height: 30, width: 'auto', maxWidth: 30, objectFit: 'contain', flexShrink: 0 }} /> : <Avatar sx={{ bgcolor: team.color, width: 30, height: 30, fontSize: 11, fontWeight: 800, color, flexShrink: 0 }}>{team.short}</Avatar>}
                          <Typography noWrap sx={{ fontWeight: 700, fontSize: 13 }}>{team.name}</Typography>
                        </Stack>
                        <Typography variant="h6" sx={{ color: '#FEBE10', flexShrink: 0 }}>{flow.penalties[key]}</Typography>
                      </Stack>
                      <TextField
                        size="small"
                        fullWidth
                        label="المسدد (Shooter)"
                        value={playerName(shootPlayers[key])}
                        placeholder="— غير محدد —"
                        slotProps={{
                          htmlInput: { readOnly: true },
                          input: { endAdornment: <ExpandMoreIcon sx={{ color: 'text.secondary' }} /> },
                        }}
                        helperText={teamPlayers.length === 0 ? 'لا توجد تشكيلة' : undefined}
                        onClick={(e) => setShootAnchor((s) => ({ ...s, [key]: e.currentTarget }))}
                        disabled={teamPlayers.length === 0}
                        sx={{ cursor: 'pointer' }}
                      />
                      <EventPlayerMenu
                        open={Boolean(shootAnchor[key])}
                        anchorEl={shootAnchor[key]}
                        label="اختر المسدد"
                        players={teamPlayers}
                        value={shootPlayers[key]}
                        color={team.color}
                        onSelect={(player) => {
                          setShootPlayers((s) => ({ ...s, [key]: player.id }))
                          setShootAnchor((s) => ({ ...s, [key]: null }))
                        }}
                        onClose={() => setShootAnchor((s) => ({ ...s, [key]: null }))}
                      />
                      <Stack direction="row" spacing={1}>
                        <Button size="small" variant="contained" color="success" disabled={!shootPlayers[key]} onClick={() => kick(key, 'scored')} sx={{ flexGrow: 1, gap: 0.5 }}>
                          سجّلت
                        </Button>
                        <Button size="small" variant="outlined" color="error" disabled={!shootPlayers[key]} onClick={() => kick(key, 'missed')} sx={{ flexGrow: 1, gap: 0.5 }}>
                          ضاعت
                        </Button>
                      </Stack>
                    </Stack>
                  </Paper>
                </Grid>
              ))}
            </Grid>
            <Paper sx={{ p: 2, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>السجل (Kick Log)</Typography>
              <Grid container spacing={1.5}>
                {(
                  [
                    { key: 'home', team: match.home, color: match.home.color, players: homePlayers, kicks: homeKicks },
                    { key: 'away', team: match.away, color: match.away.color, players: awayPlayers, kicks: awayKicks },
                  ] as const
                ).map(({ key, team, color, players, kicks }) => (
                  <Grid item xs={6} key={key}>
                    <Paper sx={{ p: 1.5, borderRadius: 2.5, bgcolor: 'rgba(255,255,255,0.03)', border: `1px solid ${color}33`, height: '100%' }}>
                      <Stack spacing={1}>
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
                          {team.logo ? (
                            <Box component="img" src={team.logo} alt={team.name} sx={{ height: 24, width: 'auto', maxWidth: 24, objectFit: 'contain', flexShrink: 0 }} />
                          ) : (
                            <Avatar sx={{ bgcolor: color, width: 24, height: 24, fontSize: 10, fontWeight: 800, color: '#fff', flexShrink: 0 }}>{team.short}</Avatar>
                          )}
                          <Typography noWrap sx={{ fontWeight: 700, fontSize: 13 }}>{team.name}</Typography>
                          <Typography sx={{ color: '#FEBE10', fontWeight: 900, fontSize: 13, flexShrink: 0, marginInlineStart: 'auto' }}>{flow.penalties[key]}</Typography>
                        </Stack>
                        <Stack spacing={0.5} sx={{ minHeight: 56, maxHeight: 170, overflowY: 'auto' }}>
                          {kicks.length === 0 ? (
                            <Typography variant="caption" sx={{ color: 'text.secondary', alignSelf: 'center', mt: 1 }}>لا ركلات بعد</Typography>
                          ) : (
                            kicks.map((k) => {
                              const p = players.find((pl) => pl.id === k.player)
                              return (
                                <Stack key={k.id} direction="row" alignItems="center" spacing={1} sx={{ p: 0.5, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.03)' }}>
                                  <Avatar src={p?.imageUrl} sx={{ width: 26, height: 26, fontSize: 11, fontWeight: 800, bgcolor: p ? `${color}66` : 'rgba(255,255,255,0.08)', flexShrink: 0 }}>
                                    {p?.number ?? '?'}
                                  </Avatar>
                                  <Typography sx={{ fontSize: 13, fontWeight: 600, flexGrow: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {p?.name ?? k.player}
                                  </Typography>
                                  <Box sx={{ width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: k.result === 'scored' ? 'rgba(0,230,118,0.15)' : 'rgba(255,82,82,0.15)', flexShrink: 0 }}>
                                    {k.result === 'scored' ? (
                                      <CheckIcon sx={{ fontSize: 15, color: '#00E676' }} />
                                    ) : (
                                      <CloseIcon sx={{ fontSize: 15, color: '#FF5252' }} />
                                    )}
                                  </Box>
                                </Stack>
                              )
                            })
                          )}
                        </Stack>
                      </Stack>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setPenaltiesOpen(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={undoTarget !== null} onClose={() => setUndoTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>حذف الحدث (Undo / Delete)</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            {undoTarget && undoTarget.type !== 'phase' && undoTarget.type !== 'var' && (
              <Box sx={{ bgcolor: 'rgba(255, 82, 82, 0.08)', border: '1px solid rgba(255, 82, 82, 0.3)', borderRadius: 2, p: 2 }}>
                <Typography variant="body2" sx={{ color: '#FF8A80' }}>
                  تحذير بنمط VAR: سيتم إعادة حساب النتيجة والبطاقات والتبديلات وجميع الحالات المشتقة تلقائياً.
                </Typography>
              </Box>
            )}
            {undoTarget && (
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box sx={{ width: 36, height: 36, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(255,255,255,0.06)', fontSize: 18 }}>
                  {eventMeta[undoTarget.type].icon}
                </Box>
                <Stack spacing={0.25}>
                  <Typography sx={{ fontWeight: 700, fontSize: 14 }}>
                    {eventText(undoTarget, playerName)} — الدقيقة {undoTarget.minute}
                  </Typography>
                  {undoTarget.type !== 'phase' && undoTarget.type !== 'var' && (
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {undoTarget.team === 'home' ? match.home.name : match.away.name}
                    </Typography>
                  )}
                </Stack>
              </Stack>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUndoTarget(null)} sx={{ color: 'text.secondary' }}>إلغاء</Button>
          <Button variant="contained" color="error" onClick={() => undoTarget && removeEvent(undoTarget)}>
            حذف الحدث
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={varCheckOpen} onClose={() => setVarCheckOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>فحص VAR (Checking VAR)</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            <Typography sx={{ fontWeight: 700 }}>
              إرسال إشعار فحص VAR — سيتلقاه {fanTargetLabel}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              سيتم إرسال الإشعار فوراً إلى مشجعي التطبيق بأن الحكم يراجع تقنية الفيديو (VAR).
            </Typography>
            <TextField
              label="سبب الفحص (Cause)"
              fullWidth
              value={varCheckCause}
              onChange={(e) => setVarCheckCause(e.target.value)}
              placeholder="مثال: لمسة يد داخل منطقة الجزاء…"
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVarCheckOpen(false)} sx={{ color: 'text.secondary' }} disabled={fanSending === 'var'}>إلغاء</Button>
          <Button
            variant="contained"
            color="primary"
            disabled={fanSending === 'var'}
            startIcon={fanSending === 'var' ? <CircularProgress size={15} color="inherit" /> : undefined}
            onClick={sendVarCheck}
          >
            {fanSending === 'var' ? 'جارٍ الإرسال…' : 'إرسال إشعار فحص VAR'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirm !== null} onClose={() => setConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle>تأكيد الخطوة (Confirm)</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            <Typography sx={{ fontWeight: 700 }}>{confirm?.label}</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {confirm?.note ?? 'هذه الخطوة نهائية وتُطبَّق على حالة المباراة في جميع الشاشات.'}
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirm(null)} sx={{ color: 'text.secondary' }}>إلغاء</Button>
          <Button variant="contained" color={confirm?.danger ? 'error' : 'primary'} onClick={() => { confirm?.onConfirm(); setConfirm(null) }}>
            تأكيد
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={varDecisionDialog !== null} onClose={() => { setVarDecisionDialog(null); setVarCauseStep(false) }} maxWidth="xs" fullWidth>
        <DialogTitle>قرار الحكم بعد مراجعة VAR (Referee Decision)</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            {varCauseStep ? (
              <>
                <Typography sx={{ fontWeight: 700 }}>
                  اختر سبب إلغاء {varDecisionDialog ? eventMeta[varDecisionDialog.type].label : 'الحدث'} — الدقيقة {minute}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  سيتلقى {fanTargetLabel} الإشعار مع السبب المختار — وسيتم إلغاء الحدث وتعديل نتيجة المباراة تلقائياً.
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mt: 0.5 }}>
                  {VAR_CANCELLATION_CAUSES.map((c) => (
                    <Button
                      key={c.key}
                      variant="outlined"
                      color="error"
                      disabled={fanSending !== null}
                      onClick={() => sendVarDecision('error', c.key)}
                      sx={{ py: 1.5, fontWeight: 700 }}
                    >
                      {fanSending === 'var_decision' ? <CircularProgress size={16} color="inherit" /> : c.label}
                    </Button>
                  ))}
                </Box>
              </>
            ) : (
              <>
                <Typography sx={{ fontWeight: 700 }}>
                  هل يوجد خطأ في {varDecisionDialog ? eventMeta[varDecisionDialog.type].label : 'الحدث'} — الدقيقة {minute}؟
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {varDecisionDialog?.decidedError
                    ? 'الحدث مُلغى حالياً بقرار VAR. إذا كان الإلغاء خطأً يمكنك اعتماده من جديد — سيُعاد احتسابه في نتيجة المباراة وسيصل الإشعار للمشجعين.'
                    : `سيتلقى ${fanTargetLabel} النتيجة فوراً. إذا اخترت (يوجد خطأ)، ستحدد سبب الإلغاء وسيتم تعديل نتيجة المباراة تلقائياً.`}
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'row-reverse', gap: 1.5, mt: 0.5 }}>
                  <Button
                    variant="contained"
                    color="success"
                    fullWidth
                    disabled={fanSending !== null}
                    onClick={() => sendVarDecision('no_error')}
                    sx={{ py: 1, justifyContent: 'flex-start' }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      {fanSending === 'var_decision' ? <CircularProgress size={15} color="inherit" /> : <CheckIcon fontSize="small" />}
                      <Stack spacing={0}>
                        <Typography sx={{ fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>لا يوجد خطأ</Typography>
                        <Typography sx={{ fontSize: 11, opacity: 0.85, lineHeight: 1.2 }}>الحدث صحيح</Typography>
                      </Stack>
                    </Stack>
                  </Button>
                  {!varDecisionDialog?.decidedError && (
                    <Button
                      variant="contained"
                      color="error"
                      fullWidth
                      disabled={fanSending !== null}
                      onClick={() => setVarCauseStep(true)}
                      sx={{ py: 1, justifyContent: 'flex-start' }}
                    >
                      <Stack direction="row" spacing={1} alignItems="center">
                        <CloseIcon fontSize="small" />
                        <Stack spacing={0}>
                          <Typography sx={{ fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>يوجد خطأ</Typography>
                          <Typography sx={{ fontSize: 11, opacity: 0.85, lineHeight: 1.2 }}>إلغاء الحدث</Typography>
                        </Stack>
                      </Stack>
                    </Button>
                  )}
                </Box>
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => { if (varCauseStep) setVarCauseStep(false); else { setVarDecisionDialog(null); setVarCauseStep(false) } }}
            sx={{ color: 'text.secondary' }}
          >
            {varCauseStep ? 'رجوع' : 'إلغاء'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={varReviewId !== null} onClose={() => setVarReviewId(null)} maxWidth="xs" fullWidth>
        <DialogTitle>نتيجة مراجعة VAR (Review Result)</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            <Typography sx={{ fontWeight: 700 }}>
              هل يوجد خطأ في الحالة — الدقيقة {minute}؟
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {varReview?.varDecision === 'error'
                ? `الحالة مُسجّلة كخطأ حالياً. يمكنك اعتمادها من جديد — وسيصل الإشعار إلى ${fanTargetLabel}.`
                : `سيتلقى ${fanTargetLabel} نتيجة المراجعة فوراً بعد اختيار القرار.`}
            </Typography>
            <TextField
              label="سبب الفحص (Cause)"
              fullWidth
              multiline
              minRows={2}
              value={varReviewCause}
              onChange={(ev) => setVarReviewCause(ev.target.value)}
              placeholder="مثال: لمسة يد داخل منطقة الجزاء…"
              disabled={fanSending !== null}
            />
            <Box sx={{ display: 'flex', flexDirection: 'row-reverse', gap: 1.5, mt: 0.5 }}>
              <Button
                variant="contained"
                color="success"
                fullWidth
                disabled={fanSending !== null}
                onClick={() => sendVarReviewDecision('no_error')}
                sx={{ py: 1, justifyContent: 'flex-start' }}
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  {fanSending === 'var_decision' ? <CircularProgress size={15} color="inherit" /> : <CheckIcon fontSize="small" />}
                  <Stack spacing={0}>
                    <Typography sx={{ fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>لا يوجد خطأ</Typography>
                    <Typography sx={{ fontSize: 11, opacity: 0.85, lineHeight: 1.2 }}>القرار صحيح</Typography>
                  </Stack>
                </Stack>
              </Button>
              {varReview?.varDecision !== 'error' && (
                <Button
                  variant="contained"
                  color="error"
                  fullWidth
                  disabled={fanSending !== null}
                  onClick={() => sendVarReviewDecision('error')}
                  sx={{ py: 1, justifyContent: 'flex-start' }}
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CloseIcon fontSize="small" />
                    <Stack spacing={0}>
                      <Typography sx={{ fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>يوجد خطأ</Typography>
                      <Typography sx={{ fontSize: 11, opacity: 0.85, lineHeight: 1.2 }}>تسجيل الخطأ</Typography>
                    </Stack>
                  </Stack>
                </Button>
              )}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVarReviewId(null)} sx={{ color: 'text.secondary' }} disabled={fanSending !== null}>إلغاء</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={feedback !== null} autoHideDuration={5000} onClose={() => setFeedback(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}>
        <Alert variant="filled" severity={feedback?.kind ?? 'info'} onClose={() => setFeedback(null)} sx={{ width: '100%', borderRadius: 2 }}>
          {feedback?.message}
        </Alert>
      </Snackbar>
    </Stack>
  )
}
