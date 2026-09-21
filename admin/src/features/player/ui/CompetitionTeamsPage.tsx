import { useState } from 'react'
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
} from '@mui/material'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import CloudDownloadIcon from '@mui/icons-material/CloudDownload'
import GroupsIcon from '@mui/icons-material/Groups'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { LEAGUE_NAMES, LEAGUE_NAMES_SHORT, LEAGUE_COLORS } from '@/features/match/domain/match.constants'
import { fetchTeamsByLeague, fetchUclLeaguePhaseTeams, type CompetitionTeam } from '@/features/match/data/apiFootball.service'
import { saveCompetition, saveTeams } from '../data/competitionDatabase.service'
import type { CompetitionTeamDoc } from '../domain/competition.types'
import { useCompetition, useCompetitionTeams, useTeamHasPlayers } from './useCompetitionDatabase'
import CountryFlag from '@/core/ui/components/CountryFlag'

function leagueLogo(leagueId: number): string {
  return `https://media.api-sports.io/football/leagues/${leagueId}.png`
}

function seasonLabel(season: number): string {
  const next = (season + 1) % 100
  return `${season}/${String(next).padStart(2, '0')}`
}

function fetchTeamsFor(leagueId: number): Promise<CompetitionTeam[]> {
  if (leagueId === 2) return fetchUclLeaguePhaseTeams()
  return fetchTeamsByLeague(leagueId)
}

export default function CompetitionTeamsPage() {
  const { leagueId: leagueIdParam } = useParams()
  const navigate = useNavigate()
  const leagueId = Number(leagueIdParam ?? 0)
  const comp = useCompetition(leagueId)
  const { teams, loading } = useCompetitionTeams(leagueId)

  const [fetching, setFetching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const color = LEAGUE_COLORS[leagueId] ?? '#0057A8'
  const season = comp?.season ?? new Date().getFullYear()

  const hasTeams = teams.length > 0

  const handleFetch = async () => {
    setFetching(true)
    setError(null)
    try {
      const fetched = await fetchTeamsFor(leagueId)
      if (fetched.length === 0) {
        setError('لم يتم العثور على فرق لهذه البطولة في الموسم الحالي من المصدر.')
        return
      }
      await saveCompetition({
        leagueId,
        name: LEAGUE_NAMES[leagueId] ?? `البطولة ${leagueId}`,
        logo: leagueLogo(leagueId),
        season,
      })
      const docs: CompetitionTeamDoc[] = fetched.map((t) => ({
        ...t,
        id: t.id,
        coach: null,
      }))
      await saveTeams(leagueId, docs)
    } catch {
      setError('حدث خطأ أثناء جلب الفرق. حاول مجدداً بعد قليل.')
    } finally {
      setFetching(false)
    }
  }

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
            width: 320,
            height: 320,
            borderRadius: '50%',
            top: -140,
            right: -100,
            background: `radial-gradient(circle, ${color}44, ${color}00 70%)`,
            pointerEvents: 'none',
          }}
        />
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2, position: 'relative' }}>
          <IconButton onClick={() => navigate('/players')} sx={{ color: 'text.secondary', '&:hover': { color, bgcolor: `${color}22` } }}>
            <ArrowForwardIcon />
          </IconButton>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
            العودة للوحة
          </Typography>
        </Stack>

        <Stack direction="row" alignItems="center" spacing={2.5} sx={{ position: 'relative' }}>
          <Box
            sx={{
              width: 96,
              height: 96,
              bgcolor: '#fff',
              borderRadius: 3,
              p: 1.4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 14px 34px -10px ${color}aa, 0 6px 12px rgba(0,0,0,0.45)`,
            }}
          >
            <Box component="img" src={leagueLogo(leagueId)} alt={LEAGUE_NAMES[leagueId] ?? ''} sx={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
          </Box>
          <Box sx={{ flexGrow: 1 }}>
            <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
              <Typography variant="h4" sx={{ fontSize: 24 }}>{LEAGUE_NAMES[leagueId] ?? `البطولة ${leagueId}`}</Typography>
              <Chip
                label={seasonLabel(season)}
                sx={{ bgcolor: `${color}22`, color, fontWeight: 800, border: `1px solid ${color}44` }}
              />
            </Stack>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
              {LEAGUE_NAMES_SHORT[leagueId] ?? ''} · {hasTeams ? `${teams.length} فريق في القاعدة` : 'لم تُجلب الفرق بعد'}
            </Typography>
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
              background: `linear-gradient(135deg, ${color} 0%, ${color}99 100%)`,
              boxShadow: `0 8px 24px -8px ${color}aa`,
              '& .MuiButton-startIcon': { m: 0 },
              '&:hover': { filter: 'brightness(1.15)' },
            }}
          >
            {fetching ? 'جارٍ الجلب…' : hasTeams ? 'تحديث الفرق' : 'جلب الفرق'}
          </Button>
        </Stack>

        {error && (
          <Paper sx={{ mt: 2, p: 2, bgcolor: 'rgba(255,82,82,0.08)', border: '1px solid rgba(255,82,82,0.4)', position: 'relative' }}>
            <Typography sx={{ color: '#FF8A80', fontWeight: 700, fontSize: 14 }}>{error}</Typography>
          </Paper>
        )}
      </Box>

      {loading ? (
        <GridSkeleton />
      ) : hasTeams ? (
        <Stack spacing={2}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <EmojiEventsIcon fontSize="small" sx={{ color }} />
            <Typography sx={{ fontWeight: 800 }}>فرق البطولة</Typography>
            <Chip size="small" label={teams.length} sx={{ bgcolor: `${color}22`, color, fontWeight: 800 }} />
          </Stack>
          <Box>
            <Grid container spacing={2}>
              {[...teams].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')).map((t) => (
                <Grid item xs={6} sm={4} md={3} lg={2.4} key={t.id}>
                  <TeamCard team={t} color={color} leagueId={leagueId} />
                </Grid>
              ))}
            </Grid>
          </Box>
        </Stack>
      ) : (
        <EmptyState color={color} onFetch={handleFetch} fetching={fetching} />
      )}
    </Stack>
  )
}

function GridSkeleton() {
  return (
    <Grid container spacing={2}>
      {Array.from({ length: 8 }).map((_, i) => (
        <Grid item xs={6} sm={4} md={3} key={i}>
          <Paper sx={{ p: 2, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <Stack spacing={1.5} alignItems="center">
              <Skeleton variant="circular" width={64} height={64} />
              <Skeleton width="70%" />
              <Skeleton width="45%" />
            </Stack>
          </Paper>
        </Grid>
      ))}
    </Grid>
  )
}

function TeamCard({ team, color, leagueId }: { team: CompetitionTeamDoc; color: string; leagueId: number }) {
  const navigate = useNavigate()
  const hasPlayers = useTeamHasPlayers(leagueId, team.id)
  return (
    <Box
      onClick={() => navigate(`/players/competition/${leagueId}/team/${team.id}`)}
      sx={{
        position: 'relative',
        borderRadius: 3,
        p: 2.5,
        height: '100%',
        cursor: 'pointer',
        overflow: 'hidden',
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
      <Box
        sx={{
          position: 'absolute',
          width: 160,
          height: 160,
          borderRadius: '50%',
          top: -90,
          right: -70,
          background: `radial-gradient(circle, ${color}2e, ${color}00 70%)`,
          pointerEvents: 'none',
        }}
      />
      <Stack spacing={1.5} alignItems="center" sx={{ position: 'relative' }}>
        <Box
          component="img"
          src={team.logo ?? ''}
          alt={team.name ?? 'فريق'}
          sx={{
            width: 68,
            height: 68,
            objectFit: 'contain',
            transition: 'transform 0.22s ease',
            filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.35))',
          }}
        />
        <Stack direction="row" spacing={0.7} alignItems="center" justifyContent="center" sx={{ maxWidth: '100%', minWidth: 0 }}>
          {team.flag && <CountryFlag src={team.flag} alt={team.country ?? team.name} size={13} />}
          <Typography noWrap sx={{ fontWeight: 800, fontSize: 14 }} title={team.name ?? ''}>
            {team.name ?? 'فريق'}
          </Typography>
        </Stack>
        <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap>
          {team.country ?? '—'}
        </Typography>
        {hasPlayers && (
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              px: 1,
              py: 0.4,
              borderRadius: 20,
              bgcolor: 'rgba(0,230,118,0.14)',
              border: '1px solid rgba(0,230,118,0.4)',
              color: '#00E676',
              width: 'fit-content',
              alignSelf: 'center',
            }}
          >
            <CheckCircleIcon sx={{ fontSize: 13 }} />
            <Box component="span" sx={{ fontSize: 10, fontWeight: 800, color: 'inherit', lineHeight: 1 }}>
              تم تحميل التشكيلة
            </Box>
          </Box>
        )}
      </Stack>
    </Box>
  )
}

function EmptyState({ color, onFetch, fetching }: { color: string; onFetch: () => void; fetching: boolean }) {
  return (
    <Paper
      sx={{
        p: 6,
        borderRadius: 4,
        bgcolor: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.12)',
        textAlign: 'center',
      }}
    >
      <Stack spacing={2} alignItems="center">
        <Box
          sx={{
            width: 96,
            height: 96,
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `1px dashed ${color}66`,
            background: `radial-gradient(circle, ${color}22, ${color}00 75%)`,
            color,
          }}
        >
          <GroupsIcon sx={{ fontSize: 48 }} />
        </Box>
        <Typography variant="h5">لا توجد فرق لهذه البطولة بعد</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 460 }}>
          لم يتم جلب بيانات الفرق من المصدر بعد. اضغط على زر «جلب الفرق» لتحميل قائمة فرق البطولة الحالية وحفظها في القاعدة.
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
          {fetching ? 'جارٍ الجلب…' : 'جلب الفرق'}
        </Button>
      </Stack>
    </Paper>
  )
}