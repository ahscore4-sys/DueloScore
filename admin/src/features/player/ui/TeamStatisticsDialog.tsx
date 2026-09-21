import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Box, Stack, Typography, Chip, Avatar, Dialog, DialogContent, IconButton, Paper, Button, Alert, CircularProgress, Divider } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import BarChartIcon from '@mui/icons-material/BarChart'
import RefreshIcon from '@mui/icons-material/Refresh'
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import StarIcon from '@mui/icons-material/Star'
import PersonIcon from '@mui/icons-material/Person'
import { LEAGUE_NAMES, getCurrentSeason } from '@/features/match/domain/match.constants'
import { refreshTeamSeasonStatistics } from '../data/competitionDatabase.service'
import { playerStatisticsForSeason, preferredSeasonKey } from '../domain/competition.types'
import type { CompetitionPlayerDoc, CompetitionTeamDoc, LeaderboardEntry, TeamSeasonStatisticsDoc } from '../domain/competition.types'
import CountryFlag from '@/core/ui/components/CountryFlag'

function formChip(letter: string): { label: string; color: string; bg: string } {
  switch (letter) {
    case 'W':
      return { label: 'فوز', color: '#00E676', bg: 'rgba(0,230,118,0.14)' }
    case 'D':
      return { label: 'تعادل', color: '#F9A825', bg: 'rgba(249,168,37,0.14)' }
    case 'L':
      return { label: 'خسارة', color: '#FF5252', bg: 'rgba(255,82,82,0.14)' }
    default:
      return { label: letter, color: 'text.secondary', bg: 'rgba(255,255,255,0.08)' }
  }
}

function statsTiles(s: TeamSeasonStatisticsDoc): Array<{ label: string; value: string; color: string }> {
  const sign = (n: number) => (n > 0 ? `+${n}` : String(n))
  return [
    { label: 'المباريات', value: String(s.played), color: '#FFF' },
    { label: 'فوز', value: String(s.wins), color: '#00E676' },
    { label: 'تعادل', value: String(s.draws), color: '#F9A825' },
    { label: 'خسارة', value: String(s.losses), color: '#FF5252' },
    { label: 'أهداف لصالح', value: String(s.goalsFor), color: '#00E676' },
    { label: 'أهداف ضد', value: String(s.goalsAgainst), color: '#FF5252' },
    { label: 'فارق الأهداف', value: sign(s.goalsDiff), color: s.goalsDiff >= 0 ? '#00E676' : '#FF5252' },
    { label: 'شباك نظيفة', value: String(s.cleanSheets), color: '#4FC3F7' },
    { label: 'فشل في التسجيل', value: String(s.failedToScore), color: 'text.secondary' },
    { label: 'ركلات جزاء سُجلت', value: String(s.penaltyScored), color: '#FEBE10' },
    { label: 'ركلات جزاء ضائعة', value: String(s.penaltyMissed), color: '#FF5252' },
    { label: 'بطاقات صفراء', value: String(s.yellowCards), color: '#F9A825' },
    { label: 'بطاقات حمراء', value: String(s.redCards), color: '#FF5252' },
  ]
}

type Leaderboards = { scorers: LeaderboardEntry[]; assisters: LeaderboardEntry[]; rated: LeaderboardEntry[] }

// Live fallback used until the persisted leaderboards are written by the next
// sync — derived from the squad's per-player season stats (already subscribed).
function deriveLeaderboards(players: CompetitionPlayerDoc[], currentSeason: number): Leaderboards {
  const scorers: LeaderboardEntry[] = []
  const assisters: LeaderboardEntry[] = []
  const rated: LeaderboardEntry[] = []

  for (const player of players) {
    const stats = playerStatisticsForSeason(player.statistics, currentSeason)
    if (!stats) continue
    const base = { playerId: player.id, name: player.name, photo: player.photo }
    if ((stats.goals ?? 0) > 0) scorers.push({ ...base, value: stats.goals ?? 0 })
    if ((stats.assists ?? 0) > 0) assisters.push({ ...base, value: stats.assists ?? 0 })
    const seasonKey = preferredSeasonKey(player.statistics, currentSeason)
    const rating = seasonKey != null && player.ratingOverrides?.[seasonKey] != null
      ? player.ratingOverrides[seasonKey]
      : stats.rating
    if (rating != null && rating > 0) rated.push({ ...base, value: rating })
  }

  const byValue = (a: LeaderboardEntry, b: LeaderboardEntry) => b.value - a.value
  return { scorers: scorers.sort(byValue), assisters: assisters.sort(byValue), rated: rated.sort(byValue) }
}

function Leaderboard({ title, icon, rows, color, mode }: {
  title: string
  icon: ReactNode
  rows: LeaderboardEntry[]
  color: string
  mode: 'count' | 'rating'
}) {
  if (rows.length === 0) return null

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 1 }}>
        {icon}
        <Typography variant="caption" sx={{ fontWeight: 900, color: '#8EC5FF', fontSize: 12, flex: 1 }}>{title}</Typography>
        <Divider sx={{ flex: 2, borderColor: 'rgba(255,255,255,0.07)' }} />
      </Stack>
      <Stack spacing={0.75}>
        {rows.map((row, i) => (
          <Stack
            key={String(row.playerId)}
            direction="row"
            alignItems="center"
            spacing={1.25}
            sx={{ borderRadius: 2, border: '1px solid rgba(255,255,255,0.08)', bgcolor: 'rgba(255,255,255,0.025)', px: 1.25, py: 0.85 }}
          >
            <Box sx={{ width: 20, textAlign: 'center', fontWeight: 900, fontSize: 12, color: i < 3 ? '#FEBE10' : 'text.secondary' }}>
              {i + 1}
            </Box>
            <Avatar src={row.photo || undefined} sx={{ width: 30, height: 30, bgcolor: 'rgba(255,255,255,0.06)' }}>
              <PersonIcon sx={{ fontSize: 16 }} />
            </Avatar>
            <Typography noWrap sx={{ flex: 1, fontWeight: 800, fontSize: 12.5 }} title={row.name}>{row.name}</Typography>
            <Typography sx={{ fontWeight: 900, fontSize: 14, color, flexShrink: 0 }}>
              {mode === 'rating' ? Math.round(row.value * 10) / 10 : row.value}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  )
}

export default function TeamStatisticsDialog({ open, onClose, team, players, leagueId, color }: {
  open: boolean
  onClose: () => void
  team: CompetitionTeamDoc | null
  players: CompetitionPlayerDoc[]
  leagueId: number
  color: string
}) {
  const currentSeason = getCurrentSeason()
  const statKeys = (team?.statistics ? Object.keys(team.statistics) : [])
    .map((k) => Number(k))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => b - a)
  const season = statKeys.length > 0 && !statKeys.includes(currentSeason) ? statKeys[0] : currentSeason
  const stats = team?.statistics?.[String(season)]
  // The external API's form string is oldest→newest; keep only the last 5 matches
  // and show the most recent first (mirrors the standings FormBadges).
  const recentForm = useMemo(() => {
    const chars = (stats?.form ?? '')
      .toUpperCase()
      .split('')
      .filter((ch) => ch === 'W' || ch === 'D' || ch === 'L')
    return chars.slice(-5).reverse()
  }, [stats?.form])
  const derivedLeaderboards = useMemo(() => deriveLeaderboards(players, season), [players, season])
  // Prefer the persisted leaderboards written by the season-stats sync; fall back
  // to deriving them live from player docs until the next sync runs. When a rating
  // override exists, recompute the top-rated list live so it reflects the editors'
  // manual values (persisted lists are baked from the API at sync time).
  const hasRatingOverrides = players.some((p) => p.ratingOverrides && Object.keys(p.ratingOverrides).length > 0)
  const leaderboards: Leaderboards = {
    scorers: stats?.topScorers?.length ? stats.topScorers : derivedLeaderboards.scorers,
    assisters: stats?.topAssists?.length ? stats.topAssists : derivedLeaderboards.assisters,
    rated: hasRatingOverrides ? derivedLeaderboards.rated : (stats?.topRated?.length ? stats.topRated : derivedLeaderboards.rated),
  }
  const hasLeaders = leaderboards.scorers.length > 0 || leaderboards.assisters.length > 0 || leaderboards.rated.length > 0

  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [synced, setSynced] = useState<{ teamLeagues: number[]; players: number } | null>(null)
  const [syncedOtherOnly, setSyncedOtherOnly] = useState(false)

  useEffect(() => {
    if (open) {
      setError(null)
      setSynced(null)
      setSyncedOtherOnly(false)
    }
  }, [open])

  const handleRefresh = async () => {
    if (!team) return
    setRefreshing(true)
    setError(null)
    setSynced(null)
    setSyncedOtherOnly(false)
    try {
      const result = await refreshTeamSeasonStatistics(team.id, season)
      if (result.leagues.length === 0) {
        setError(
          result.detail
            ? `تعذر جلب الإحصائيات من المصدر الخارجي (${result.detail}). تحقق من مفاتيح API أو حاول مجدداً لاحقاً.`
            : 'تعذر جلب الإحصائيات من المصدر الخارجي. تأكد من أن البطولة بدأت أو حاول مجدداً لاحقاً.',
        )
        return
      }
      setSynced(result)
      setSyncedOtherOnly(!result.teamLeagues.includes(leagueId))
    } catch {
      setError('تعذر تحديث الإحصائيات. حاول مجدداً بعد قليل.')
    } finally {
      setRefreshing(false)
    }
  }

  const tiles = stats ? statsTiles(stats) : []

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      dir="rtl"
      PaperProps={{ sx: { borderRadius: 4, bgcolor: '#0A0E1C', border: '1px solid rgba(255,255,255,0.12)', overflow: 'hidden', backgroundImage: `linear-gradient(160deg, ${color}18, rgba(10,14,28,0.6))` } }}
    >
      <Box
        sx={{
          p: 3,
          pb: 2.5,
          position: 'relative',
          background: `linear-gradient(150deg, ${color}2B 0%, rgba(10,14,28,0) 60%)`,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <IconButton onClick={onClose} sx={{ position: 'absolute', top: 12, left: 12, color: 'text.secondary' }}>
          <CloseIcon fontSize="small" />
        </IconButton>

        <Stack direction="row" alignItems="center" spacing={2.25}>
          {team?.logo ? (
            <Box
              component="img"
              src={team.logo}
              alt={team.name ?? 'فريق'}
              sx={{ width: 84, height: 84, objectFit: 'contain', flexShrink: 0, filter: 'drop-shadow(0 10px 22px rgba(0,0,0,0.45))' }}
            />
          ) : (
            <SportsSoccerIcon sx={{ fontSize: 56, color, flexShrink: 0 }} />
          )}

          <Stack spacing={0.75} sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              {team?.flag && <CountryFlag src={team.flag} alt={team.country ?? team.name} size={17} />}
              <Typography noWrap sx={{ fontWeight: 900, fontSize: 22, fontFamily: '"Cairo", sans-serif', lineHeight: 1.1 }}>{team?.name ?? 'الفريق'}</Typography>
            </Stack>
            <Stack direction="row" spacing={0.75} flexWrap="wrap" sx={{ gap: 0.75 }}>
              <Chip size="small" label={`${LEAGUE_NAMES[leagueId] ?? 'البطولة'}`} sx={{ height: 24, fontSize: 11, fontWeight: 800, bgcolor: `${color}33`, color: '#FFF' }} />
              <Chip size="small" label={`موسم ${season}`} sx={{ height: 24, fontSize: 11, fontWeight: 800, bgcolor: 'rgba(255,255,255,0.1)', color: 'text.secondary' }} />
            </Stack>
          </Stack>

          <Button
            variant="contained"
            size="small"
            onClick={handleRefresh}
            disabled={refreshing || !team}
            startIcon={refreshing ? <CircularProgress size={14} color="inherit" /> : <RefreshIcon sx={{ fontSize: 16 }} />}
            sx={{
              gap: 0.75,
              flexShrink: 0,
              '& .MuiButton-startIcon': { m: 0 },
              background: `linear-gradient(135deg, ${color} 0%, ${color}99 100%)`,
              boxShadow: `0 8px 24px -8px ${color}aa`,
              '&:hover': { filter: 'brightness(1.15)' },
            }}
          >
            {refreshing ? 'جارٍ التحديث…' : 'تحديث الآن'}
          </Button>
        </Stack>
      </Box>

      <DialogContent sx={{ p: 3, pt: 2.75 }}>
        <Stack spacing={2.5}>
          {stats && (
            <Box>
              <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 1 }}>
                <BarChartIcon sx={{ fontSize: 18, color }} />
                <Typography variant="caption" sx={{ fontWeight: 900, color: '#8EC5FF', fontSize: 12, flex: 1 }}>آخر 5 نتائج</Typography>
              </Stack>
              <Stack direction="row" spacing={0.75} flexWrap="wrap" sx={{ gap: 0.75 }}>
                {recentForm.length > 0 ? (
                  recentForm.map((letter, i) => {
                    const c = formChip(letter)
                    return (
                      <Box key={`${letter}-${i}`} sx={{ width: 42, height: 42, borderRadius: 2.5, display: 'grid', placeItems: 'center', bgcolor: c.bg, border: '1px solid rgba(255,255,255,0.1)', fontWeight: 900, fontSize: 14, color: c.color }}>
                        {c.label}
                      </Box>
                    )
                  })
                ) : (
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>لا يوجد سجل نتائج.</Typography>
                )}
              </Stack>
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ borderRadius: 2, bgcolor: 'rgba(255,82,82,0.1)', color: '#FF8A80', '& .MuiAlert-icon': { color: '#FF5252' } }}>{error}</Alert>
          )}

          {synced && syncedOtherOnly && !stats && (
            <Alert severity="warning" sx={{ borderRadius: 2, bgcolor: 'rgba(254,190,16,0.1)', color: '#FFD54F', '& .MuiAlert-icon': { color: '#FEBE10' } }}>
              لا تتوفر إحصائيات فريق لهذه البطولة لهذا الموسم، لكن تم تحديث إحصائيات {synced.players} لاعب.
            </Alert>
          )}

          {synced && !(syncedOtherOnly && !stats) && (
            <Alert severity="success" sx={{ borderRadius: 2, bgcolor: 'rgba(0,230,118,0.1)', color: '#00E676', '& .MuiAlert-icon': { color: '#00E676' } }}>
              تم تحديث إحصائيات الفريق واللاعبين بنجاح ({synced.teamLeagues.length} بطولة، {synced.players} لاعب).
            </Alert>
          )}

          {!stats ? (
            <Stack alignItems="center" spacing={1.5} sx={{ py: 4 }}>
              <Box sx={{ width: 64, height: 64, borderRadius: 3, display: 'grid', placeItems: 'center', bgcolor: `${color}1E`, border: `1px solid ${color}44`, color }}>
                <BarChartIcon sx={{ fontSize: 32 }} />
              </Box>
              <Typography sx={{ fontWeight: 900, fontSize: 16 }}>لا توجد إحصائيات لهذا الموسم بعد</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 420, textAlign: 'center', lineHeight: 1.9 }}>
                تُجلب إحصائيات الموسم تلقائياً عند انتهاء المباريات، أو اضغط «تحديث الآن» لجلبها يدوياً من المصدر الخارجي.
              </Typography>
            </Stack>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 1 }}>
              {tiles.map((m) => (
                <Stack key={m.label} direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ borderRadius: 2, border: '1px solid rgba(255,255,255,0.08)', bgcolor: 'rgba(255,255,255,0.025)', px: 1.4, py: 1 }}>
                  <Typography variant="caption" noWrap sx={{ color: 'text.secondary', fontWeight: 700, fontSize: 11 }}>{m.label}</Typography>
                  <Typography sx={{ fontWeight: 900, fontSize: 16, lineHeight: 1.1, color: m.color, flexShrink: 0 }}>{m.value}</Typography>
                </Stack>
              ))}
            </Box>
          )}

          {hasLeaders ? (
            <>
              <Leaderboard title="الهدافون" icon={<EmojiEventsIcon sx={{ fontSize: 18, color: '#FEBE10' }} />} rows={leaderboards.scorers} color="#FEBE10" mode="count" />
              <Leaderboard title="صنّاع الأهداف" icon={<SportsSoccerIcon sx={{ fontSize: 18, color: '#00E676' }} />} rows={leaderboards.assisters} color="#00E676" mode="count" />
              <Leaderboard title="الأعلى تقييماً" icon={<StarIcon sx={{ fontSize: 18, color: '#4FC3F7' }} />} rows={leaderboards.rated} color="#4FC3F7" mode="rating" />
            </>
          ) : (
            players.length > 0 && (
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textAlign: 'center' }}>
                لا تتوفر إحصائيات لاعبين لهذا الموسم بعد.
              </Typography>
            )
          )}

          {stats && (
            <Paper sx={{ borderRadius: 2.5, p: 1.5, bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, fontSize: 10.5 }}>
                آخر تحديث: {stats.updatedAt ? new Date(stats.updatedAt).toLocaleString('ar-KW') : '—'}
              </Typography>
            </Paper>
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  )
}