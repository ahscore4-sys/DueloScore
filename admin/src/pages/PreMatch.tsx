import { Box, Typography, Stack, Button, Avatar, Chip, Paper, Grid, TextField, CircularProgress, Tooltip } from '@mui/material'
import type { ReactNode } from 'react'
import SaveIcon from '@mui/icons-material/Save'
import SportsIcon from '@mui/icons-material/Sports'
import GroupsIcon from '@mui/icons-material/Groups'
import EventSeatIcon from '@mui/icons-material/EventSeat'
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety'
import EditIcon from '@mui/icons-material/Edit'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import RefreshIcon from '@mui/icons-material/Refresh'
import TranslateIcon from '@mui/icons-material/Translate'
import CloudDownloadIcon from '@mui/icons-material/CloudDownload'
import MedicalServicesIcon from '@mui/icons-material/MedicalServices'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { barca, madrid } from '../mockData'
import type { Player, OpponentPlayerData } from '../types'
import { useMatch } from '@/features/match/ui/useMatch'
import { useMatchPlan } from '@/features/match/ui/useMatchPlan'
import { saveMatchPlan } from '@/features/match/data/match.service'
import { fitLineup } from '../lib/matchPlans'
import { isUnspecifiedFormation } from '../lib/formations'
import PitchPreview from '../components/PitchPreview'
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer'
import {
  CountChip,
  RatingSegment,
  SubSegment,
  AssistChip,
  CardsBadge,
  CardIcon,
} from '../components/PlayerStatsBadges'
import { useMatchEvents } from '@/features/match/ui/useMatchEvents'
import { derivePlayerStats, emptyPlayerStats, type PlayerMatchStats } from '@/features/match/domain/matchDerivation'
import SlotPlayerMenu from '../components/SlotPlayerMenu'
import FormationDialog from '../components/FormationDialog'
import PlayerPickerDialog from '../components/PlayerPickerDialog'
import AbsentPlayersDialog from '../components/AbsentPlayersDialog'
import { useMatchHub } from '../lib/matchHubContext'
import { fetchLineups, fetchTeamRoster, fetchCoach, fetchInjuries } from '@/features/match/data/apiFootball.service'
import type { ApiLineupPlayer } from '@/features/match/domain/apiFootball.types'
import { getCurrentSeason } from '@/features/match/domain/match.constants'
import type { Team } from '../types'
import { usePreMatchTeam } from '@/features/player/ui/usePreMatchTeam'
import { apiSquadPlayerToCompetition, leagueIdForCompetition } from '@/features/player/domain/competition.mappers'
import { savePlayers, setTeamCoach, ensureCompetitionTeam } from '@/features/player/data/competitionDatabase.service'
import CountryFlag from '@/core/ui/components/CountryFlag'

function resolve(squad: Player[], ids: string[]): Player[] {
  return ids.map((id) => squad.find((p) => p.id === id)).filter((p): p is Player => Boolean(p))
}

interface OpponentSetupCardProps {
  fixtureId: number
  plan: { formation: string; lineup: string[]; bench: string[]; injured: string[]; suspended: string[]; playerData?: Record<string, OpponentPlayerData> }
  update: (patch: Partial<{ formation: string; lineup: string[]; bench: string[]; injured: string[]; suspended: string[]; playerData: Record<string, OpponentPlayerData> }>) => void
}

function OpponentSetupCard({ fixtureId, plan, update }: OpponentSetupCardProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const hasData = Boolean(plan.playerData && Object.keys(plan.playerData).length > 0)

  const fetchAndSave = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchLineups(fixtureId)
      const teamData = res?.response?.[0]
      if (!teamData) { setError('لا توجد بيانات تشكيلة متاحة'); setLoading(false); return }
      const pd: Record<string, OpponentPlayerData> = {}
      const allPlayers: ApiLineupPlayer[] = [...teamData.startXI.map((s) => s.player), ...teamData.substitutes.map((s) => s.player)]
      for (const p of allPlayers) {
        const existing = plan.playerData?.[String(p.id)]
        pd[String(p.id)] = {
          id: p.id,
          name: p.name,
          nameAr: existing?.nameAr,
          number: p.number,
          pos: p.pos,
          grid: p.grid,
        }
      }
      const lineup = teamData.startXI.map((s) => String(s.player.id))
      const bench = teamData.substitutes.map((s) => String(s.player.id))
      update({ formation: teamData.formation || plan.formation, lineup, bench, injured: [], suspended: [], playerData: pd })
    } catch {
      setError('فشل جلب التشكيلة')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Paper sx={{ p: 2.5, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)' }}>
      <Stack spacing={1.5}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Avatar sx={{ width: 36, height: 36, bgcolor: 'rgba(255,82,82,0.35)', color: '#FF8A80', fontSize: 18 }}>
              <GroupsIcon />
            </Avatar>
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: 15 }}>تشكيلة الفريق</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>تُجلب من مزوّد البيانات</Typography>
            </Box>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button size="small" startIcon={<RefreshIcon />} onClick={fetchAndSave} disabled={loading} sx={{ color: 'text.secondary' }}>
              {hasData ? 'تحديث' : 'جلب التشكيلة'}
            </Button>
            {hasData && (
              <Button size="small" startIcon={<TranslateIcon />} onClick={() => setEditOpen(true)} sx={{ color: '#FEBE10' }}>
                تعديل الأسماء
              </Button>
            )}
          </Stack>
        </Box>

        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={24} sx={{ color: '#FEBE10' }} />
            <Typography variant="body2" sx={{ color: 'text.secondary', mr: 1 }}>جارٍ جلب التشكيلة...</Typography>
          </Box>
        )}

        {error && (
          <Box sx={{ p: 2, bgcolor: 'rgba(255,179,0,0.06)', borderRadius: 2, border: '1px solid rgba(255,179,0,0.2)' }}>
            <Typography variant="body2" sx={{ color: '#FFB300', fontWeight: 700 }}>{error}</Typography>
          </Box>
        )}

        {hasData && (
          <>
            <Chip label={`التشكيلة: ${plan.formation}`} size="small" sx={{ bgcolor: 'rgba(0,87,168,0.4)', color: '#8EC5FF', fontWeight: 800, border: '1px solid rgba(0,87,168,0.5)', width: 'fit-content' }} />
            <Box>
              <Typography variant="caption" sx={{ color: '#FEBE10', fontWeight: 800 }}>اللاعبون الأساسيون ({plan.lineup.length})</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 0.75, mt: 0.5 }}>
                {plan.lineup.map((id) => {
                  const p = plan.playerData?.[id]
                  return (
                    <Chip key={id} label={`#${p?.number || '?'} ${p?.nameAr || p?.name || id}`} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', fontWeight: 700, fontSize: 11, height: 28 }} />
                  )
                })}
              </Box>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800 }}>البدلاء ({plan.bench.length})</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                {plan.bench.map((id) => {
                  const p = plan.playerData?.[id]
                  return (
                    <Chip key={id} label={`#${p?.number || '?'} ${p?.nameAr || p?.name || id}`} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', fontWeight: 600, fontSize: 10, height: 24, color: 'text.secondary' }} />
                  )
                })}
              </Box>
            </Box>
          </>
        )}

        <OpponentNameEditorDialog open={editOpen} onClose={() => setEditOpen(false)} playerData={plan.playerData || {}} onUpdate={(pd) => update({ playerData: pd })} />
      </Stack>
    </Paper>
  )
}

interface OpponentNameEditorDialogProps {
  open: boolean
  onClose: () => void
  playerData: Record<string, OpponentPlayerData>
  onUpdate: (pd: Record<string, OpponentPlayerData>) => void
}

function OpponentNameEditorDialog({ open, onClose, playerData, onUpdate }: OpponentNameEditorDialogProps) {
  const [draft, setDraft] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      const d: Record<string, string> = {}
      for (const [id, p] of Object.entries(playerData)) {
        d[id] = p.nameAr ?? ''
      }
      setDraft(d)
    }
  }, [open, playerData])

  const handleSave = () => {
    const updated = { ...playerData }
    for (const [id, nameAr] of Object.entries(draft)) {
      if (updated[id]) {
        updated[id] = { ...updated[id], nameAr: nameAr.trim() || undefined }
      }
    }
    onUpdate(updated)
    onClose()
  }

  const entries = Object.entries(playerData)

  return (
    <Paper
      component="div"
      sx={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1300,
        display: open ? 'flex' : 'none', alignItems: 'center', justifyContent: 'center',
        bgcolor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <Paper
        sx={{ width: 500, maxHeight: '80vh', overflow: 'auto', p: 3, borderRadius: 3, bgcolor: '#0E1428', border: '1px solid rgba(255,255,255,0.12)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <Stack spacing={2}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>تعديل أسماء اللاعبين بالعربية</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>اترك الحقل فارغاً للاحتفاظ بالاسم الأصلي</Typography>
          <Stack spacing={1.5}>
            {entries.map(([id, p]) => (
              <TextField
                key={id}
                size="small"
                label={`#${p.number} ${p.name}`}
                value={draft[id] ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, [id]: e.target.value }))}
                placeholder={p.name}
                fullWidth
              />
            ))}
          </Stack>
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button onClick={onClose} sx={{ color: 'text.secondary' }}>إلغاء</Button>
            <Button variant="contained" onClick={handleSave}>حفظ</Button>
          </Stack>
        </Stack>
      </Paper>
    </Paper>
  )
}

interface DragState {
  id: string
  isGK: boolean
  from: number
}

interface PlanCardProps {
  icon: ReactNode
  title: string
  count: string
  countColor: string
  children: ReactNode
  action: ReactNode
  bgcolor?: string
}

function PlanCard({ icon, title, count, countColor, children, action, bgcolor = 'rgba(255,255,255,0.02)' }: PlanCardProps) {
  return (
    <Paper
      sx={{
        p: 2.5,
        borderRadius: 2,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        bgcolor,
        border: '1px solid rgba(255,255,255,0.12)',
        backdropFilter: 'blur(14px)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Avatar sx={{ width: 36, height: 36, bgcolor: 'rgba(0,87,168,0.35)', color: '#FEBE10', fontSize: 18 }}>{icon}</Avatar>
          <Typography sx={{ fontWeight: 800, fontSize: 15 }}>{title}</Typography>
        </Box>
        <Chip label={count} size="small" sx={{ fontWeight: 800, color: '#fff', height: 24, bgcolor: countColor }} />
      </Box>
      <Box sx={{ flex: 1 }}>{children}</Box>
      {action}
    </Paper>
  )
}

interface PlayerRowProps {
  player: Player
  accent: string | undefined
  stats?: PlayerMatchStats
  rating?: number | null
  subbedOffName?: string
  status?: 'injured' | 'suspended'
  subTone?: 'red' | 'green'
}

const BENCH_CIRCLE = '78px'

function PlayerRow({ player, accent, stats, rating, subbedOffName, status, subTone }: PlayerRowProps) {
  const s = stats ?? emptyPlayerStats()
  const hasCards = s.yellows > 0 || s.reds > 0
  const hasAssists = s.assists > 0
  const hasRating = typeof rating === 'number' && Number.isFinite(rating)
  const hasSub = s.cameOn || s.subbedOut
  const subColor = subTone ?? (s.cameOn ? 'green' : 'red')
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.4, width: BENCH_CIRCLE, minWidth: 0 }}>
      <Box sx={{ position: 'relative', width: '100%', aspectRatio: '1' }}>
        {status && (
          <Box sx={{ position: 'absolute', top: -5, right: -1, zIndex: 2 }}>
            <StatusPill status={status} />
          </Box>
        )}
        {s.goals > 0 && (
          <Box sx={{ position: 'absolute', top: -13, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 2 }}>
            <CountChip icon={<SportsSoccerIcon sx={{ fontSize: 13, color: '#000' }} />} count={s.goals} title={`أهداف: ${s.goals}`} />
          </Box>
        )}
        {s.og > 0 && (
          <Box sx={{ position: 'absolute', top: -7, left: 58, zIndex: 2 }}>
            <CountChip icon={<SportsSoccerIcon sx={{ fontSize: 13, color: '#C62828' }} />} count={s.og} title={`هدف عكسي: ${s.og}`} />
          </Box>
        )}
        {hasSub && (
          <Box sx={{ position: 'absolute', top: '50%', left: -8, transform: 'translateY(-50%)', zIndex: 2 }}>
            <SubSegment kind={s.cameOn ? 'in' : 'out'} tone={subColor} />
          </Box>
        )}
        {hasAssists && (
          <Box sx={{ position: 'absolute', top: '50%', left: 70, transform: 'translateY(-50%)', zIndex: 2 }}>
            <AssistChip count={s.assists} />
          </Box>
        )}
        {hasRating && (
          <Box sx={{ position: 'absolute', bottom: -3, left: -1, zIndex: 2 }}>
            <RatingSegment rating={rating as number} />
          </Box>
        )}
        {hasCards && (
          <Box sx={{ position: 'absolute', bottom: -3, left: 58, zIndex: 2 }}>
            <CardsBadge yellows={s.yellows} reds={s.reds} />
          </Box>
        )}
        <Avatar
          src={player.imageUrl}
          sx={{
            width: '100%',
            height: '100%',
            fontSize: 22,
            fontWeight: 800,
            bgcolor: accent,
            color: '#fff',
            border: '2px solid #fff',
            boxShadow: '0 4px 10px rgba(0,0,0,0.4)',
          }}
        >
          {player.number}
        </Avatar>
        <Box sx={{ position: 'absolute', top: -5, left: -1, zIndex: 3, width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#FFFFFF', color: '#1A1A2E', border: '1px solid rgba(0,0,0,0.18)', boxShadow: '0 1px 3px rgba(0,0,0,0.35)', fontSize: 10, fontWeight: 800, lineHeight: 1, pointerEvents: 'none' }}>
          {player.number}
        </Box>
      </Box>
      <Stack direction="row" spacing={0.4} alignItems="center" justifyContent="center" sx={{ maxWidth: '100%' }}>
        {player.flag && <CountryFlag src={player.flag} alt={player.nationality ?? player.name} size={11} />}
        <Typography
          variant="caption"
          sx={{ fontSize: 11, fontWeight: 800, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center', minWidth: 0 }}
        >
          {player.name}
        </Typography>
      </Stack>
      {subbedOffName && (
        <Typography
          variant="caption"
          sx={{ fontSize: 9, fontWeight: 600, color: '#FF8A80', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center', mt: -0.6 }}
        >
          {subbedOffName}
        </Typography>
      )}
    </Box>
  )
}

function StatusPill({ status }: { status: 'injured' | 'suspended' }) {
  const label = status === 'suspended' ? 'موقوف' : 'مصاب'
  return (
    <Box
      component="span"
      title={label}
      aria-label={label}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 22,
        height: 22,
        borderRadius: 999,
        bgcolor: BADGE_BG,
        border: BADGE_BORDER,
        boxShadow: BADGE_SHADOW,
      }}
    >
      {status === 'suspended' ? (
        <CardIcon fill="#E53935" />
      ) : (
        <MedicalServicesIcon sx={{ fontSize: 13, color: '#E53935' }} />
      )}
    </Box>
  )
}

const BADGE_BG = '#FFFFFF'
const BADGE_BORDER = '1px solid rgba(0,0,0,0.18)'
const BADGE_SHADOW = '0 1px 3px rgba(0,0,0,0.35)'

export default function PreMatch() {
  const { id: matchId } = useParams<{ id: string }>()
  const { match } = useMatch(matchId)
  const [team, setTeam] = useState<'home' | 'away'>('home')
  const [formDlg, setFormDlg] = useState(false)
  const [benchDlg, setBenchDlg] = useState(false)
  const [absentDlg, setAbsentDlg] = useState(false)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [hover, setHover] = useState<number | null>(null)
  const [slotMenu, setSlotMenu] = useState<{ index: number; anchor: HTMLElement } | null>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const [headerCorner, setHeaderCorner] = useState(12)
  const { setTabsStuck, activeTab } = useMatchHub()
  const [saved, setSaved] = useState(false)
  const [savedLeaving, setSavedLeaving] = useState(false)
  const [saving, setSaving] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [fetchChip, setFetchChip] = useState<'ok' | 'err' | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const eventsHook = useMatchEvents(match?.id)

  useEffect(() => {
    const update = () => {
      const el = headerRef.current
      if (!el) {
        setTabsStuck(false)
        return
      }
      if (activeTab !== 'pre-match') return
      const top = el.getBoundingClientRect().top
      const progress = Math.min(1, Math.max(0, (top - 48) / 60))
      const corner = Math.round(12 * progress)
      setHeaderCorner(corner)
      setTabsStuck(corner === 0)
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      if (activeTab === 'pre-match') setTabsStuck(false)
    }
  }, [setTabsStuck, activeTab])

  useEffect(() => {
    if (!saved) return
    const hide = setTimeout(() => setSavedLeaving(true), 2000)
    const done = setTimeout(() => setSaved(false), 2400)
    return () => {
      clearTimeout(hide)
      clearTimeout(done)
    }
  }, [saved])

  useEffect(() => {
    if (!fetchChip) return
    const done = setTimeout(() => setFetchChip(null), 2600)
    return () => clearTimeout(done)
  }, [fetchChip])

  const currentTeamId = team === 'home' ? match?.home.id : match?.away.id
  const currentTeamData: Team = currentTeamId === barca.id ? barca : currentTeamId === madrid.id ? madrid : {
    id: currentTeamId ?? '',
    name: team === 'home' ? match?.home.name ?? '' : match?.away.name ?? '',
    short: team === 'home' ? match?.home.short ?? '' : match?.away.short ?? '',
    color: team === 'home' ? match?.home.color ?? '#666' : match?.away.color ?? '#666',
    gkColor: team === 'home' ? match?.home.gkColor : match?.away.gkColor,
    logo: team === 'home' ? match?.home.logo : match?.away.logo,
  }

  const homeTeamData = usePreMatchTeam(match?.home, match?.competition)
  const awayTeamData = usePreMatchTeam(match?.away, match?.competition)
  const teamData = team === 'home' ? homeTeamData : awayTeamData
  const fullPlanUI = Boolean(teamData.apiId)

  const planApi = useMatchPlan(match, currentTeamId)
  const plan = planApi.plan
  const update = planApi.update

  const squad = useMemo(() => (fullPlanUI ? teamData.players : []), [fullPlanUI, teamData.players])
  const slotPlayers = plan.lineup.map((id) => fullPlanUI ? squad.find((p) => p.id === id) : undefined)
  const benchPlayers = fullPlanUI ? resolve(squad, plan.bench) : []
  const injuredPlayers = fullPlanUI ? resolve(squad, plan.injured) : []
  const suspendedPlayers = fullPlanUI ? resolve(squad, plan.suspended) : []
  const absentPlayers = fullPlanUI ? [...injuredPlayers, ...suspendedPlayers] : []

  const playerNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of squad) map.set(p.id, p.name)
    return map
  }, [squad])

  const stats = useMemo(() => derivePlayerStats(eventsHook.events), [eventsHook.events])

  const statsFor = (id: string, name: string): PlayerMatchStats | undefined =>
    stats[id] ?? stats[name]

  const pitchStats = useMemo(() => {
    const m: Record<string, PlayerMatchStats> = {}
    for (const p of squad) {
      const s = stats[p.id] ?? stats[p.name]
      if (s) m[p.id] = s
    }
    return m
  }, [squad, stats])

  const liveRatings = useMemo(() => {
    const base = { ...(match?.ratings ?? {}) }
    const ps = match?.playerStatistics
    if (ps) {
      for (const entry of Object.values(ps.home ?? {})) {
        if (entry.stats.rating != null) base[entry.playerId] = entry.stats.rating
      }
      for (const entry of Object.values(ps.away ?? {})) {
        if (entry.stats.rating != null) base[entry.playerId] = entry.stats.rating
      }
    }
    return base
  }, [match?.ratings, match?.playerStatistics])

  const subNameFor = (id: string, name: string): string | undefined => {
    const ev = eventsHook.events.find(
      (e) => e.type === 'sub' && (e.player === id || e.player === name || e.playerOut === id || e.playerOut === name),
    )
    if (!ev) return undefined
    const otherId = ev.player === id || ev.player === name ? ev.playerOut : ev.player
    if (!otherId) return undefined
    return playerNameById.get(otherId) ?? otherId
  }

  if (!match) return null

  const allTeams: Team[] = [
    { id: match.home.id, name: match.home.name, short: match.home.short, color: match.home.color, gkColor: match.home.gkColor, logo: homeTeamData.logo ?? undefined },
    { id: match.away.id, name: match.away.name, short: match.away.short, color: match.away.color, gkColor: match.away.gkColor, logo: awayTeamData.logo ?? undefined },
  ]

  const startSlotDrag = (i: number) => {
    const p = slotPlayers[i]
    if (p) setDrag({ id: p.id, isGK: p.position === 'حارس', from: i })
  }
  const enterSlot = (i: number) => setHover((h) => (h === i ? h : i))
  const leaveSlot = (i: number) => setHover((h) => (h === i ? null : h))
  const clearDrag = () => {
    setDrag(null)
    setHover(null)
  }

  const clickSlot = (i: number, el: HTMLElement) => {
    setSlotMenu({ index: i, anchor: el })
  }

  const commitSlot = (id: string | null) => {
    const m = slotMenu
    setSlotMenu(null)
    if (!m) return
    const i = m.index
    const next = [...plan.lineup]
    if (id) {
      const occupied = next.indexOf(id)
      if (occupied >= 0 && occupied !== i) next[occupied] = ''
      next[i] = id
      update({ lineup: next, bench: plan.bench.filter((p) => p !== id), injured: plan.injured.filter((p) => p !== id), suspended: plan.suspended.filter((p) => p !== id) })
    } else {
      if (!next[i]) return
      next[i] = ''
      update({ lineup: next })
    }
  }

  const dropSlot = (i: number) => {
    if (!drag) return
    const id = drag.id
    const next = [...plan.lineup]
    if (drag.from !== i) {
      const prev = next[i]
      next[i] = id
      next[drag.from] = prev
    }
    update({
      lineup: next,
      bench: plan.bench.filter((p) => p !== id),
      injured: plan.injured.filter((p) => p !== id),
      suspended: plan.suspended.filter((p) => p !== id),
    })
    clearDrag()
  }

  const handleSave = async () => {
    if (!match || saving || !currentTeamId) return
    setSaving(true)
    try {
      await saveMatchPlan(match.id, currentTeamId, plan)
      setSaved(true)
      setSavedLeaving(false)
    } finally {
      setSaving(false)
    }
  }

  const handleFetchTeam = async () => {
    if (fetching || !teamData.apiId || !currentTeamId) return
    setFetching(true)
    setFetchChip(null)
    setFetchError(null)
    try {
      const apiId = teamData.apiId
      const leagueId = teamData.competitionId ?? leagueIdForCompetition(match?.competition) ?? 140
      const [squad, injuries, coach] = await Promise.all([
        fetchTeamRoster(apiId, getCurrentSeason()),
        fetchInjuries(apiId, getCurrentSeason(), match?.fixtureId),
        fetchCoach(apiId),
      ])

      await ensureCompetitionTeam(leagueId, { id: apiId, name: currentTeamData.name, logo: currentTeamData.logo ?? null })
      if (squad.length > 0) await savePlayers(leagueId, apiId, squad.map((p) => apiSquadPlayerToCompetition(p)))
      if (coach) {
        await setTeamCoach(leagueId, apiId, { id: coach.id, name: coach.name, age: coach.age, nationality: coach.nationality, photo: coach.photo })
      }

      await teamData.refresh()

      const isSuspendedEntry = (i: { type?: string; reason?: string }) => /suspend|red card|\bban\b|doping/i.test(`${i.type ?? ''} ${i.reason ?? ''}`)
      const injuredIds = injuries.filter((i) => !isSuspendedEntry(i)).map((i) => String(i.id))
      const suspendedIds = injuries.filter((i) => isSuspendedEntry(i)).map((i) => String(i.id))
      const nextInjured = injuredIds
      const nextSuspended = suspendedIds
      const absent = new Set([...nextInjured, ...nextSuspended])

      if (match?.fixtureId) {
        const res = await fetchLineups(match.fixtureId)
        const side = res?.response?.find((t) => t.team.id === apiId)
        if (side && side.startXI.length > 0) {
          await update({
            formation: side.formation || plan.formation,
            lineup: side.startXI.map((s) => String(s.player.id)).filter((id) => !absent.has(id)),
            bench: side.substitutes.map((s) => String(s.player.id)).filter((id) => !absent.has(id)),
            injured: nextInjured,
            suspended: nextSuspended,
          })
        } else if (injuredIds.length > 0 || suspendedIds.length > 0) {
          await update({ lineup: plan.lineup.filter((id) => !absent.has(id)), bench: plan.bench.filter((id) => !absent.has(id)), injured: nextInjured, suspended: nextSuspended })
        }
      } else if (injuredIds.length > 0 || suspendedIds.length > 0) {
        await update({ lineup: plan.lineup.filter((id) => !absent.has(id)), bench: plan.bench.filter((id) => !absent.has(id)), injured: nextInjured, suspended: nextSuspended })
      }

      setFetchChip('ok')
    } catch (err) {
      console.error('Team fetch failed', err)
      setFetchChip('err')
      setFetchError(err instanceof Error ? err.message : String(err))
    } finally {
      setFetching(false)
    }
  }

  return (
    <Stack spacing={3}>
      <Paper
        elevation={0}
        ref={headerRef}
        sx={{
          p: 2,
          borderRadius: `${headerCorner}px ${headerCorner}px 12px 12px`,
          position: 'sticky',
          top: 48,
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          flexWrap: 'wrap',
          bgcolor: 'rgba(10, 14, 28, 0.85)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderTop: headerCorner === 0 ? 'none' : '1px solid rgba(255,255,255,0.12)',
          backdropFilter: 'blur(14px)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
          <Box sx={{ display: 'flex', gap: 1, p: 0.75, width: 'fit-content', bgcolor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3 }}>
            {allTeams.map((t) => {
              const active = (team === 'home' ? match.home.id : match.away.id) === t.id
              return (
                <Button
                  key={t.id}
                  onClick={() => setTeam(t.id === match.home.id ? 'home' : 'away')}
                  sx={{
                    px: 2.5,
                    py: 1,
                    borderRadius: 2,
                    gap: 1,
                    fontWeight: 800,
                    fontSize: 14,
                    bgcolor: active ? t.color : 'transparent',
                    color: active ? (t.id === 'barca' ? '#fff' : t.id === 'madrid' ? '#1A1400' : '#fff') : 'text.secondary',
                    boxShadow: active ? '0 4px 16px rgba(0,0,0,0.35)' : 'none',
                    transition: 'all .2s ease',
                    '&:hover': { bgcolor: active ? t.color : 'rgba(255,255,255,0.08)' },
                  }}
                >
                  <Avatar
                    src={t.logo}
                    sx={{
                      width: 24,
                      height: 24,
                      fontSize: 9,
                      fontWeight: 900,
                      bgcolor: active ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
                      color: t.color,
                      objectFit: 'contain',
                    }}
                  >
                    {!t.logo && t.short}
                  </Avatar>
                  {t.name}
                </Button>
              )
            })}
          </Box>

          <Tooltip
            title={fullPlanUI ? 'جلب التشكيلة والمدرب والغائبين (المصابين والموقوفين) وتحديث قواعد بيانات البطولات' : 'لا يمكن جلب بيانات هذا الفريق'}
            arrow
          >
            <span>
              <Button
                variant="outlined"
                size="small"
                onClick={handleFetchTeam}
                disabled={!fullPlanUI || fetching}
                startIcon={fetching ? <CircularProgress size={16} sx={{ color: 'inherit' }} /> : fetchChip === 'ok' ? <CheckCircleIcon /> : <CloudDownloadIcon />}
                sx={{
                  gap: 1.25,
                  whiteSpace: 'nowrap',
                  borderRadius: 2,
                  px: 2,
                  py: 0.9,
                  fontWeight: 800,
                  fontSize: 13,
                  borderColor: fetchChip === 'err' ? 'rgba(255,82,82,0.55)' : fetchChip === 'ok' ? 'rgba(0,230,118,0.5)' : 'rgba(0,87,168,0.5)',
                  color: fetchChip === 'err' ? '#FF8A80' : fetchChip === 'ok' ? '#00E676' : '#8EC5FF',
                  '& .MuiButton-startIcon': { m: 0 },
                }}
              >
                {fetching ? 'جارٍ الجلب...' : fetchChip === 'ok' ? 'تم التحديث' : fetchChip === 'err' ? 'فشل الجلب' : 'جلب بيانات الفريق'}
              </Button>
            </span>
          </Tooltip>
        </Stack>

        {fetchError && (
          <Typography variant="caption" sx={{ color: '#FF8A80', fontWeight: 700, display: 'block', mt: 0.5 }}>
            {fetchError}
          </Typography>
        )}

        <Stack spacing={0.75} alignItems={{ xs: 'flex-start', sm: 'flex-end' }}>
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
                  margin: 0, marginInlineStart: 0, marginInlineEnd: 0,
                  width: 16, height: 16, padding: 0.75, boxSizing: 'content-box',
                  bgcolor: 'rgba(0,230,118,0.2)', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                },
              }}
            />
          )}
          <Button
            variant="contained"
            startIcon={saving ? undefined : <SaveIcon />}
            onClick={handleSave}
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
      </Paper>

      {fullPlanUI ? (
        <Grid container spacing={2}>
          <Grid item xs={12} sx={{ mx: 'auto' }}>
            <PlanCard
              icon={<SportsIcon />}
              title="الخطة التكتيكية"
              count={plan.formation}
              countColor="rgba(0,87,168,0.55)"
              action={
                <Button fullWidth variant="outlined" startIcon={<EditIcon />} onClick={() => setFormDlg(true)} sx={{ gap: 1, borderColor: 'rgba(0,87,168,0.5)', color: '#8EC5FF' }}>
                  تغيير الخطة
                </Button>
              }
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {isUnspecifiedFormation(plan.formation) ? (
                  <Box sx={{ py: 4, textAlign: 'center' }}>
                    <SportsIcon sx={{ fontSize: 48, color: 'rgba(255,255,255,0.15)', mb: 1 }} />
                    <Typography sx={{ color: 'text.secondary', fontWeight: 700, fontSize: 14 }}>اختر التشكيلة أولاً</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>اضغط على "تغيير الخطة" لاختيار تكتيك الفريق</Typography>
                  </Box>
                ) : (
                  <>
                    <PitchPreview
                      formation={plan.formation}
                      color={currentTeamData.color}
                      gkColor={currentTeamData.gkColor}
                      players={slotPlayers}
                      stats={pitchStats}
                      ratings={liveRatings}
                      dragging={drag ? { isGK: drag.isGK, from: drag.from } : null}
                      hover={hover}
                      onSlotClick={clickSlot}
                      onSlotDragStart={startSlotDrag}
                      onSlotDragEnter={enterSlot}
                      onSlotDragLeave={leaveSlot}
                      onSlotDrop={dropSlot}
                      onSlotDragEnd={clearDrag}
                      captainId={plan.captain}
                      onCaptainChange={(id) => update({ captain: id ?? undefined })}
                    />
                  </>
                )}
              </Box>
            </PlanCard>
          </Grid>

          <Grid item xs={12} md={6}>
            <PlanCard
              icon={<EventSeatIcon />}
              title="البدلاء"
              count={`${benchPlayers.length}`}
              countColor={benchPlayers.length > 0 ? 'rgba(0,87,168,0.55)' : 'rgba(255,179,0,0.35)'}
              action={
                <Button fullWidth variant="outlined" startIcon={<PersonAddIcon />} onClick={() => setBenchDlg(true)} sx={{ gap: 1, borderColor: 'rgba(0,87,168,0.5)', color: '#8EC5FF' }}>
                  إدارة البدلاء
                </Button>
              }
            >
              {benchPlayers.length === 0 ? (
                <Typography variant="body2" sx={{ color: '#FFB300', fontWeight: 700 }}>لا يوجد بدلاء بعد — اضغط «إدارة البدلاء» لإضافتهم لاحقاً.</Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
{(() => {
                    const hasSubFor = (p: Player) => Boolean(statsFor(p.id, p.name)?.cameOn || statsFor(p.id, p.name)?.subbedOut)
                    const subbedIn = benchPlayers.filter(hasSubFor)
                    const plain = benchPlayers.filter((p) => !hasSubFor(p))
                    return (
                      <>
                        {subbedIn.length > 0 && (
                          <Box>
                            <Typography variant="caption" sx={{ color: '#8BC34A', fontWeight: 800, mb: 0.75, display: 'block' }}>التبديلات</Typography>
                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 1.5 }}>
                              {subbedIn.map((p) => (
                                <Box key={p.id} sx={{ display: 'flex', justifyContent: 'center' }}>
                                  <PlayerRow
                                    player={p}
                                    accent={p.number === 1 ? currentTeamData.gkColor : currentTeamData.color}
                                    stats={statsFor(p.id, p.name)}
                                    rating={liveRatings[p.id] ?? null}
                                    subbedOffName={subNameFor(p.id, p.name)}
                                    subTone="green"
                                  />
                                </Box>
                              ))}
                            </Box>
                          </Box>
                        )}
                        {plain.length > 0 && (
                          <Box>
                            <Typography variant="caption" sx={{ color: '#8EC5FF', fontWeight: 800, mb: 0.75, display: 'block' }}>البدلاء</Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'flex-start' }}>
                              {plain.map((p) => (
                                <PlayerRow
                                  key={p.id}
                                  player={p}
                                  accent={p.number === 1 ? currentTeamData.gkColor : currentTeamData.color}
                                  stats={statsFor(p.id, p.name)}
                                  rating={liveRatings[p.id] ?? null}
                                  subbedOffName={subNameFor(p.id, p.name)}
                                  subTone="green"
                                />
                              ))}
                            </Box>
                          </Box>
                        )}
                      </>
                    )
                  })()}
                </Box>
              )}
              </PlanCard>
          </Grid>

          <Grid item xs={12} md={6}>
            <PlanCard
              icon={<HealthAndSafetyIcon />}
              title="الغائبون"
              count={absentPlayers.length > 0 ? `${absentPlayers.length}` : '—'}
              countColor="rgba(255,179,0,0.35)"
              action={
                <Button fullWidth variant="outlined" startIcon={<PersonAddIcon />} onClick={() => setAbsentDlg(true)} sx={{ gap: 1, borderColor: 'rgba(255,179,0,0.4)', color: '#FFB300' }}>
                  إدارة الغائبين
                </Button>
              }
            >
              {absentPlayers.length === 0 ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'rgba(255,179,0,0.06)', borderRadius: 2, p: 1.5, border: '1px solid rgba(255,179,0,0.15)' }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>لا يوجد غائبون في القائمة.</Typography>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {injuredPlayers.length > 0 && (
                    <Box>
                      <Typography variant="caption" sx={{ color: '#FF5252', fontWeight: 800, mb: 0.75, display: 'block' }}>المصابون</Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'flex-start' }}>
                        {injuredPlayers.map((p) => (
                          <PlayerRow
                            key={`inj-${p.id}`}
                            player={p}
                            accent={p.number === 1 ? currentTeamData.gkColor : currentTeamData.color}
                            status="injured"
                          />
                        ))}
                      </Box>
                    </Box>
                  )}
                  {suspendedPlayers.length > 0 && (
                    <Box>
                      <Typography variant="caption" sx={{ color: '#FFB300', fontWeight: 800, mb: 0.75, display: 'block' }}>الموقوفون</Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'flex-start' }}>
                        {suspendedPlayers.map((p) => (
                          <PlayerRow
                            key={`sus-${p.id}`}
                            player={p}
                            accent={p.number === 1 ? currentTeamData.gkColor : currentTeamData.color}
                            status="suspended"
                          />
                        ))}
                      </Box>
                    </Box>
                  )}
                </Box>
              )}
            </PlanCard>
          </Grid>
        </Grid>
      ) : (
        <Stack spacing={2}>
          {match.fixtureId && currentTeamId && (
            <OpponentSetupCard
              fixtureId={match.fixtureId}
              plan={{ formation: plan.formation, lineup: plan.lineup, bench: plan.bench, injured: plan.injured, suspended: plan.suspended, playerData: plan.playerData }}
              update={update}
            />
          )}
        </Stack>
      )}

      <FormationDialog open={formDlg} value={plan.formation} onClose={() => setFormDlg(false)} onConfirm={(code) => { update({ formation: code, lineup: fullPlanUI ? fitLineup(squad, plan.lineup, code) : plan.lineup }); setFormDlg(false) }} />

      <SlotPlayerMenu
        open={Boolean(slotMenu)}
        anchorEl={slotMenu?.anchor ?? null}
        index={slotMenu?.index ?? 0}
        players={squad}
        lineup={plan.lineup}
        bench={plan.bench}
        injured={plan.injured}
        suspended={plan.suspended}
        gkOnly={slotMenu?.index === 0}
        color={currentTeamData.color}
        gkColor={currentTeamData.gkColor ?? currentTeamData.color}
        onClose={() => setSlotMenu(null)}
        onSelect={commitSlot}
      />

      <PlayerPickerDialog
        open={benchDlg}
        title="البدلاء"
        subtitle="أضف البدلاء المقررين للقائمة (اختياري — يمكنك الإضافة لاحقاً)"
        players={squad}
        selected={plan.bench}
        excluded={[...plan.lineup, ...plan.injured, ...plan.suspended]}
        selectedLast
        belongsTo={[{ label: 'التشكيلة الأساسية', ids: plan.lineup }, { label: 'المصابون', ids: plan.injured }, { label: 'الموقوفون', ids: plan.suspended }]}
        onClose={() => setBenchDlg(false)}
        onConfirm={(ids) => { update({ bench: ids }); setBenchDlg(false) }}
      />

      <AbsentPlayersDialog
        open={absentDlg}
        title="الغائبون"
        subtitle="اللاعبون غير الجاهزين للمشاركة في المباراة (إصابة أو إيقاف)"
        players={squad}
        injured={plan.injured}
        suspended={plan.suspended}
        excluded={[...plan.lineup, ...plan.bench]}
        belongsTo={[{ label: 'التشكيلة الأساسية', ids: plan.lineup }, { label: 'البدلاء', ids: plan.bench }]}
        onClose={() => setAbsentDlg(false)}
        onConfirm={(selection) => { update({ injured: selection.injured, suspended: selection.suspended }) }}
      />
    </Stack>
  )
}
