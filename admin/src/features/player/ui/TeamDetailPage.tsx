import { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box,
  Stack,
  Typography,
  Button,
  Chip,
  IconButton,
  CircularProgress,
  Paper,
  Skeleton,
  Grid,
  Tooltip,
} from '@mui/material'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import CloudDownloadIcon from '@mui/icons-material/CloudDownload'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import BarChartIcon from '@mui/icons-material/BarChart'
import ShieldIcon from '@mui/icons-material/Shield'
import CakeIcon from '@mui/icons-material/Cake'
import PublicIcon from '@mui/icons-material/Public'
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer'
import { LEAGUE_COLORS, LEAGUE_NAMES, getCurrentSeason } from '@/features/match/domain/match.constants'
import { fetchTeamRoster, fetchCoach } from '@/features/match/data/apiFootball.service'
import { savePlayers, setTeamCoach, deleteCompetitionPlayer } from '../data/competitionDatabase.service'
import type { CompetitionPlayerDoc, CompetitionTeamCoach, CompetitionTeamDoc } from '../domain/competition.types'
import { positionLabel, positionGroup } from '../domain/competition.types'
import { useTeamPlayers, useCompetitionTeams } from './useCompetitionDatabase'
import ConfirmDialog from '@/core/ui/components/ConfirmDialog'
import PlayerEditDialog from './PlayerEditDialog'
import CoachEditDialog from './CoachEditDialog'
import TeamEditDialog from './TeamEditDialog'
import TeamStatisticsDialog from './TeamStatisticsDialog'
import PlayerStatisticsDialog from './PlayerStatisticsDialog'
import CountryFlag from '@/core/ui/components/CountryFlag'

const GROUP_ORDER = ['goalkeepers', 'defenders', 'midfielders', 'attackers', 'others']

export default function TeamDetailPage() {
  const { leagueId: leagueIdParam, teamId: teamIdParam } = useParams()
  const navigate = useNavigate()
  const leagueId = Number(leagueIdParam ?? 0)
  const teamId = Number(teamIdParam ?? 0)

  const { teams } = useCompetitionTeams(leagueId)
  const team = teams.find((t) => t.id === teamId)
  const { players, loading } = useTeamPlayers(leagueId, teamId)

  const [fetching, setFetching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<CompetitionPlayerDoc | null>(null)
  const [editingCoach, setEditingCoach] = useState<CompetitionTeamCoach | null>(null)
  const [editingTeam, setEditingTeam] = useState<CompetitionTeamDoc | null>(null)
  const [deleting, setDeleting] = useState<CompetitionPlayerDoc | null>(null)
  const [deletingBusy, setDeletingBusy] = useState(false)
  const [statsOpen, setStatsOpen] = useState(false)
  const [statsPlayerId, setStatsPlayerId] = useState<string | null>(null)
  const statsPlayer = useMemo(
    () => (statsPlayerId != null ? players.find((p) => String(p.id) === statsPlayerId) ?? null : null),
    [players, statsPlayerId],
  )

  const color = LEAGUE_COLORS[leagueId] ?? '#0057A8'

  const hasPlayers = players.length > 0

  const handleFetch = async () => {
    setFetching(true)
    setError(null)
    try {
      const [squad, coach] = await Promise.all([fetchTeamRoster(teamId, getCurrentSeason()), fetchCoach(teamId)])
      if (squad.length === 0 && !coach) {
        setError('لم يتم العثور على بيانات تشكيلة أو مدرب لهذا الفريق من المصدر.')
        return
      }
      if (squad.length > 0) {
        const docs: CompetitionPlayerDoc[] = squad.map((p) => ({
          id: p.id,
          name: p.name,
          age: p.age,
          number: p.number,
          position: p.position || 'Defender',
          photo: p.photo ?? '',
        }))
        await savePlayers(leagueId, teamId, docs)
      }
      if (coach) {
        await setTeamCoach(leagueId, teamId, coach)
      }
    } catch {
      setError('حدث خطأ أثناء جلب البيانات. حاول مجدداً بعد قليل.')
    } finally {
      setFetching(false)
    }
  }

  const grouped = GROUP_ORDER.map((key) => ({
    group: { key, label: GROUP_LABELS[key] },
    list: players.filter((p) => positionGroup(p.position).key === key),
  })).filter((g) => g.list.length > 0)

  return (
    <Stack spacing={3}>
      <Box
        sx={{
          position: 'relative',
          borderRadius: 5,
          p: 4,
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.12)',
          background: `linear-gradient(135deg, ${color}22 0%, rgba(10,14,28,0.9) 55%, rgba(10,14,28,0.95) 100%)`,
          backdropFilter: 'blur(14px)',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            width: 360,
            height: 360,
            borderRadius: '50%',
            top: -150,
            right: -120,
            background: `radial-gradient(circle, ${color}44, ${color}00 70%)`,
            pointerEvents: 'none',
          }}
        />
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2, position: 'relative' }}>
          <IconButton onClick={() => navigate(`/players/competition/${leagueId}`)} sx={{ color: 'text.secondary', '&:hover': { color, bgcolor: `${color}22` } }}>
            <ArrowForwardIcon />
          </IconButton>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
            {LEAGUE_NAMES[leagueId] ?? 'البطولة'} · العودة للفرق
          </Typography>
        </Stack>

        <Stack direction="row" alignItems="center" spacing={2.5} sx={{ position: 'relative', flexWrap: 'wrap', gap: 2 }}>
          {team?.logo ? (
            <Box
              component="img"
              src={team.logo}
              alt={team.name}
              sx={{
                width: 96,
                height: 96,
                objectFit: 'contain',
                filter: 'drop-shadow(0 14px 26px rgba(0,0,0,0.45))',
              }}
            />
          ) : (
            <Box
              sx={{
                width: 96,
                height: 96,
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: `rgba(${color}22)`,
                border: `1px solid ${color}55`,
              }}
            >
              <SportsSoccerIcon sx={{ fontSize: 48, color }} />
            </Box>
          )}
          <Box sx={{ flexGrow: 1 }}>
            <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
              <Typography variant="h4" sx={{ fontSize: 24 }}>{team?.name ?? 'الفريق'}</Typography>
              {team?.flag && <CountryFlag src={team.flag} alt={team.country ?? team.name} size={18} />}
              {team?.code && <Chip size="small" label={team.code} sx={{ bgcolor: `${color}22`, color, fontWeight: 800, border: `1px solid ${color}44` }} />}
            </Stack>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
              {team?.country ?? '—'} · {hasPlayers ? `${players.length} لاعب في القاعدة` : 'لم تُجلب التشكيلة بعد'}
            </Typography>
            {team && (
              <Button
                size="small"
                variant="outlined"
                onClick={() => setEditingTeam(team)}
                startIcon={<EditIcon sx={{ fontSize: 14 }} />}
                sx={{
                  mt: 1,
                  gap: 0.75,
                  '& .MuiButton-startIcon': { m: 0 },
                  color,
                  borderColor: `${color}66`,
                  fontWeight: 800,
                  '&:hover': { bgcolor: `${color}22`, borderColor: color },
                }}
              >
                تعديل بيانات الفريق
              </Button>
            )}
            {team && (
              <Button
                size="small"
                variant="outlined"
                onClick={() => setStatsOpen(true)}
                startIcon={<BarChartIcon sx={{ fontSize: 14 }} />}
                sx={{
                  mt: 1,
                  mr: 1,
                  gap: 0.75,
                  '& .MuiButton-startIcon': { m: 0 },
                  color: '#FEBE10',
                  borderColor: 'rgba(254,190,16,0.45)',
                  fontWeight: 800,
                  '&:hover': { bgcolor: 'rgba(254,190,16,0.14)', borderColor: '#FEBE10' },
                }}
              >
                إحصائيات الموسم
              </Button>
            )}
          </Box>
          <Button
            variant="contained"
            onClick={handleFetch}
            disabled={fetching}
            startIcon={fetching ? <CircularProgress size={16} color="inherit" /> : <CloudDownloadIcon />}
            sx={{
              px: 3,
              py: 1.2,
              gap: 1.5,
              '& .MuiButton-startIcon': { m: 0 },
              background: `linear-gradient(135deg, ${color} 0%, ${color}99 100%)`,
              boxShadow: `0 8px 24px -8px ${color}aa`,
              '&:hover': { filter: 'brightness(1.15)' },
            }}
          >
            {fetching ? 'جارٍ الجلب…' : hasPlayers ? 'تحديث التشكيلة' : 'جلب اللاعبين والمدرب'}
          </Button>
        </Stack>

        {error && (
          <Paper sx={{ mt: 2, p: 2, bgcolor: 'rgba(255,82,82,0.08)', border: '1px solid rgba(255,82,82,0.4)', position: 'relative' }}>
            <Typography sx={{ color: '#FF8A80', fontWeight: 700, fontSize: 14 }}>{error}</Typography>
          </Paper>
        )}
      </Box>

      {team?.coach && (
        <CoachCard coach={team.coach} logo={team.logo} color={color} onEdit={() => setEditingCoach(team.coach ?? null)} />
      )}

      {loading ? (
        <Grid container spacing={2}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Grid item xs={6} sm={4} md={3} key={i}>
              <Paper sx={{ p: 2, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <Stack spacing={1.5} alignItems="center">
                  <Skeleton variant="rounded" width={64} height={64} />
                  <Skeleton width="70%" />
                  <Skeleton width="45%" />
                </Stack>
              </Paper>
            </Grid>
          ))}
        </Grid>
      ) : hasPlayers ? (
        grouped.map((section) => (
          <Stack spacing={1.5} key={section.group.key}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box sx={{ width: 34, height: 34, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: `${color}22`, border: `1px solid ${color}44`, color }}>
                <ShieldIcon sx={{ fontSize: 18 }} />
              </Box>
              <Typography sx={{ fontWeight: 800, fontSize: 17 }}>{section.group.label}</Typography>
              <Chip size="small" label={section.list.length} sx={{ bgcolor: `${color}22`, color, fontWeight: 800 }} />
              <Box sx={{ flexGrow: 1, height: 1, bgcolor: 'divider' }} />
            </Stack>
            <Grid container spacing={2}>
              {section.list.map((p) => (
                <Grid item xs={6} sm={4} md={3} lg={2.4} key={p.id}>
                  <PlayerCard player={p} color={color} onEdit={() => setEditing(p)} onDelete={() => setDeleting(p)} onStats={() => setStatsPlayerId(String(p.id))} />
                </Grid>
              ))}
            </Grid>
          </Stack>
        ))
      ) : (
        <EmptySquad state={error ?? undefined} color={color} onFetch={handleFetch} fetching={fetching} />
      )}

      <PlayerEditDialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        onDelete={() => {
          const current = editing
          setEditing(null)
          if (current) setDeleting(current)
        }}
        leagueId={leagueId}
        teamId={teamId}
        player={editing}
      />
      <CoachEditDialog open={editingCoach !== null} onClose={() => setEditingCoach(null)} leagueId={leagueId} teamId={teamId} coach={editingCoach} />
      <TeamEditDialog open={editingTeam !== null} onClose={() => setEditingTeam(null)} leagueId={leagueId} team={editingTeam} />
      <TeamStatisticsDialog open={statsOpen} onClose={() => setStatsOpen(false)} team={team ?? null} players={players} leagueId={leagueId} color={color} />
      <PlayerStatisticsDialog open={statsPlayerId !== null} onClose={() => setStatsPlayerId(null)} player={statsPlayer} team={team ?? null} leagueId={leagueId} color={color} />
      <ConfirmDialog
        open={deleting !== null}
        title="حذف اللاعب"
        message={`هل تريد حذف اللاعب «${deleting?.name ?? ''}» بشكل نهائي من قائمة الفريق؟ سيتم حذف صورته أيضاً.`}
        confirmLabel="حذف"
        danger
        loading={deletingBusy}
        onConfirm={async () => {
          if (!deleting) return
          setDeletingBusy(true)
          try {
            await deleteCompetitionPlayer(leagueId, teamId, deleting)
          } finally {
            setDeletingBusy(false)
            setDeleting(null)
          }
        }}
        onClose={() => !deletingBusy && setDeleting(null)}
      />
    </Stack>
  )
}

const GROUP_LABELS: Record<string, string> = {
  goalkeepers: 'حراس المرمى',
  defenders: 'المدافعون',
  midfielders: 'لاعبو الوسط',
  attackers: 'المهاجمون',
  others: 'مراكز أخرى',
}

function CoachCard({ coach, logo, color, onEdit }: { coach: CompetitionTeamCoach; logo: string | null; color: string; onEdit: () => void }) {
  return (
    <Paper
      sx={{
        borderRadius: 4,
        p: 3,
        border: '1px solid rgba(255,255,255,0.12)',
        background: 'linear-gradient(120deg, rgba(254,190,16,0.10) 0%, rgba(255,255,255,0.04) 55%, rgba(255,255,255,0.03) 100%)',
        backdropFilter: 'blur(14px)',
      }}
    >
      <Stack direction="row" alignItems="center" spacing={2.5} flexWrap="wrap" useFlexGap>
        <Tooltip title="اضغط لتعديل بيانات المدرب" placement="top">
          <Box onClick={onEdit} sx={{ position: 'relative', width: 84, height: 84, flexShrink: 0, cursor: 'pointer', transition: 'transform 0.22s ease', '&:hover': { transform: 'scale(1.05)' } }}>
            <Box sx={{ position: 'absolute', inset: 0, borderRadius: '50%', background: `conic-gradient(from 0deg, #FEBE10, ${color}, #FEBE10)` }} />
            <Box
              component="img"
              src={coach.photo || undefined}
              alt={coach.name}
              sx={{
                position: 'absolute',
                inset: 3,
                width: 78,
                height: 78,
                borderRadius: '50%',
                objectFit: 'cover',
                bgcolor: '#0E1428',
                border: '3px solid #0E1428',
              }}
            />
            {logo && (
              <Box component="img" src={logo} alt="" sx={{ position: 'absolute', bottom: -4, left: -4, width: 30, height: 30, borderRadius: '50%', objectFit: 'contain', bgcolor: '#0E1428', border: '2px solid #FEBE10', p: 0.4 }} />
            )}
          </Box>
        </Tooltip>
        <Box sx={{ flexGrow: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.6,
                px: 1.1,
                py: 0.45,
                borderRadius: 20,
                bgcolor: 'rgba(254,190,16,0.14)',
                border: '1px solid rgba(254,190,16,0.4)',
                color: '#FEBE10',
                width: 'fit-content',
              }}
            >
              <ShieldIcon sx={{ fontSize: 13 }} />
              <Box component="span" sx={{ fontSize: 11, fontWeight: 800, color: 'inherit', lineHeight: 1 }}>
                المدرب الرئيسي
              </Box>
            </Box>
          </Stack>
          <Typography sx={{ fontWeight: 900, fontSize: 20, mt: 0.5 }}>{coach.name}</Typography>
          <Stack direction="row" spacing={2} sx={{ mt: 0.5, flexWrap: 'wrap', gap: 1 }}>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <PublicIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>{coach.nationality ?? '—'}</Typography>
            </Stack>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <CakeIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>{coach.age != null ? `${coach.age} سنة` : '—'}</Typography>
            </Stack>
          </Stack>
        </Box>
        <Button
          variant="outlined"
          onClick={onEdit}
          startIcon={<EditIcon sx={{ fontSize: 16 }} />}
          sx={{
            gap: 1,
            px: 2.5,
            '& .MuiButton-startIcon': { m: 0 },
            color: '#FEBE10',
            borderColor: 'rgba(254,190,16,0.45)',
            bgcolor: 'rgba(254,190,16,0.08)',
            fontWeight: 800,
            flexShrink: 0,
            '&:hover': { bgcolor: 'rgba(254,190,16,0.18)', borderColor: '#FEBE10' },
          }}
        >
          تعديل المدرب
        </Button>
      </Stack>
    </Paper>
  )
}

function PlayerCard({ player, color, onEdit, onDelete, onStats }: { player: CompetitionPlayerDoc; color: string; onEdit: () => void; onDelete: () => void; onStats: () => void }) {
  return (
    <Box
      onClick={onEdit}
      sx={{
        position: 'relative',
        borderRadius: 3,
        p: 2,
        height: '100%',
        overflow: 'hidden',
        cursor: 'pointer',
        border: '1px solid rgba(255,255,255,0.12)',
        bgcolor: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(12px)',
        transition: 'all 0.22s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          borderColor: color,
          boxShadow: `0 14px 40px -12px ${color}55`,
        },
      }}
    >
      <Box sx={{ position: 'absolute', top: 10, right: 10, zIndex: 2 }}>
        <Chip size="small" label={player.number ?? '—'} sx={{ bgcolor: `${color}33`, color: '#fff', fontWeight: 900, minWidth: 30, border: `1px solid ${color}66` }} />
      </Box>
      <Stack direction="row" spacing={0.4} sx={{ position: 'absolute', top: 8, left: 8, zIndex: 2 }}>
        <Tooltip title="إحصائيات الموسم" placement="top">
          <IconButton size="small" component="span" onClick={(e) => { e.stopPropagation(); onStats() }} sx={{ bgcolor: 'rgba(6,8,17,0.7)', color: '#FEBE10', '&:hover': { bgcolor: 'rgba(254,190,16,0.2)', color: '#FEBE10' } }}>
            <BarChartIcon sx={{ fontSize: 15 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="تعديل اللاعب" placement="top">
          <IconButton size="small" component="span" onClick={(e) => { e.stopPropagation(); onEdit() }} sx={{ bgcolor: 'rgba(6,8,17,0.7)', color: 'text.secondary', '&:hover': { bgcolor: 'rgba(6,8,17,0.9)', color: '#FEBE10' } }}>
            <EditIcon sx={{ fontSize: 15 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="حذف اللاعب" placement="top">
          <IconButton size="small" component="span" onClick={(e) => { e.stopPropagation(); onDelete() }} sx={{ bgcolor: 'rgba(6,8,17,0.7)', color: 'text.secondary', '&:hover': { bgcolor: 'rgba(255,23,68,0.2)', color: '#FF1744' } }}>
            <DeleteIcon sx={{ fontSize: 15 }} />
          </IconButton>
        </Tooltip>
      </Stack>
      <Stack spacing={1} alignItems="center">
        <Box
          component="img"
          src={player.photo || undefined}
          alt={player.name}
          sx={{
            width: 88,
            height: 88,
            borderRadius: 2.5,
            objectFit: 'cover',
            bgcolor: 'rgba(255,255,255,0.05)',
            border: `1px solid ${color}44`,
            boxShadow: `0 10px 24px -10px ${color}66`,
            mt: 0.5,
          }}
        />
        <Stack direction="row" spacing={0.6} alignItems="center" justifyContent="center" sx={{ width: '100%', minWidth: 0 }}>
          {player.flag && <CountryFlag src={player.flag} alt={player.nationality ?? player.name} size={13} />}
          <Typography noWrap sx={{ fontWeight: 800, fontSize: 14, minWidth: 0 }} title={player.name}>
            {player.name}
          </Typography>
        </Stack>
        <Chip
          size="small"
          label={positionLabel(player.position)}
          sx={{
            bgcolor: 'rgba(255,255,255,0.05)',
            color: 'text.secondary',
            fontWeight: 700,
            fontSize: 11,
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        />
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {player.age != null ? `${player.age} سنة` : 'العمر غير محدد'}
        </Typography>
        {player.nationality && (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>{player.nationality}</Typography>
        )}
      </Stack>
    </Box>
  )
}

function EmptySquad({ state, color, onFetch, fetching }: { state?: string; color: string; onFetch: () => void; fetching: boolean }) {
  return (
    <Paper sx={{ p: 6, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', textAlign: 'center' }}>
      <Stack spacing={2} alignItems="center">
        <Box sx={{ width: 96, height: 96, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px dashed ${color}66`, background: `radial-gradient(circle, ${color}22, ${color}00 75%)`, color }}>
          <SportsSoccerIcon sx={{ fontSize: 48 }} />
        </Box>
        <Typography variant="h5">{state ? 'تعذر جلب بيانات التشكيلة' : 'لم يتم جلب التشكيلة بعد'}</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 460 }}>
          {state ?? 'اضغط على زر «جلب اللاعبين والمدرب» لتحميل قائمة اللاعبين والمدرب الرئيسي من المصدر وحفظها في القاعدة.'}
        </Typography>
        <Button
          variant="contained"
          onClick={onFetch}
          disabled={fetching}
          startIcon={fetching ? <CircularProgress size={18} color="inherit" /> : <CloudDownloadIcon />}
          sx={{
            gap: 1.5,
            mt: 1,
            '& .MuiButton-startIcon': { m: 0 },
            background: `linear-gradient(135deg, ${color} 0%, ${color}99 100%)`,
            boxShadow: `0 8px 24px -8px ${color}aa`,
            '&:hover': { filter: 'brightness(1.15)' },
          }}
        >
          {fetching ? 'جارٍ الجلب…' : 'جلب اللاعبين والمدرب'}
        </Button>
      </Stack>
    </Paper>
  )
}