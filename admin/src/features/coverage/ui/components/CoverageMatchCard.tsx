import { useEffect, useState } from 'react'
import { Box, Paper, Typography, Chip, Stack, IconButton, Tooltip } from '@mui/material'
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'
import StadiumIcon from '@mui/icons-material/Stadium'
import TvIcon from '@mui/icons-material/Tv'
import SaveAltIcon from '@mui/icons-material/SaveAlt'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import EditIcon from '@mui/icons-material/Edit'
import QueryStatsIcon from '@mui/icons-material/QueryStats'
import { LEAGUE_NAMES_SHORT, LEAGUE_COLORS } from '@/features/match/domain/match.constants'
import type { CoverageMatch } from '../../domain/coverageMatches.types'
import {
  COVERAGE_MATCH_STATUS_LABELS,
  COVERAGE_MATCH_STATUS_COLORS,
  displayCompetition,
  displayStadium,
  displayTeamName,
  formatKickoff12,
  formatDateAr,
} from '../../domain/coverageMatches.types'

interface Props {
  match: CoverageMatch
  onOpen: (match: CoverageMatch) => void
  onEdit?: (match: CoverageMatch) => void
  onStats?: (match: CoverageMatch) => void
  showSaved?: boolean
}

function TeamBadge({ logo, name, short, color }: { logo: string; name: string; short: string; color: string }) {
  return (
    <Stack spacing={1} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
      <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box
          sx={{
            position: 'absolute',
            width: 62,
            height: 62,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${color}66, transparent 68%)`,
            filter: 'blur(3px)',
          }}
        />
        {logo ? (
          <Box
            component="img"
            src={logo}
            alt={name}
            sx={{
              width: { xs: 46, md: 54 },
              height: { xs: 46, md: 54 },
              objectFit: 'contain',
              position: 'relative',
              filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.45))',
            }}
          />
        ) : (
          <Box
            sx={{
              width: { xs: 46, md: 54 },
              height: { xs: 46, md: 54 },
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              bgcolor: 'rgba(255,255,255,0.07)',
              border: '2px solid rgba(255,255,255,0.16)',
              fontSize: 14,
              fontWeight: 900,
              color: 'text.secondary',
              boxShadow: '0 8px 20px rgba(0,0,0,0.4)',
            }}
          >
            {short}
          </Box>
        )}
      </Box>
      <Typography
        sx={{
          fontSize: { xs: 12.5, md: 13.5 },
          fontWeight: 800,
          textAlign: 'center',
          lineHeight: 1.25,
          maxWidth: '100%',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {name}
      </Typography>
    </Stack>
  )
}

function LiveCounter({ match }: { match: CoverageMatch }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const status = match.apiStatus
  const fixedMinute = status === 'HT' ? 45 : status === 'BT' ? 105 : status === 'P' ? 120 : null

  let label: string
  if (fixedMinute !== null) {
    label = `${fixedMinute}'`
  } else {
    const extra = match.apiExtra
    if (extra !== null && extra > 0) {
      label = `${match.apiElapsed ?? 90}+${extra}'`
    } else {
      const base = match.apiElapsed ?? Math.max(0, Math.floor((now - match.timestamp) / 60000))
      const drift = match.updatedAt ? Math.floor((now - match.updatedAt) / 60000) : 0
      label = `${Math.max(1, base + drift)}'`
    }
  }

  return (
    <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.6} sx={{ mt: 0.6 }}>
      <FiberManualRecordIcon sx={{ fontSize: 9, color: '#00E676', display: 'flex', animation: 'coveragePulse 1.4s ease-in-out infinite' }} />
      <Typography sx={{ fontVariantNumeric: 'tabular-nums', fontSize: 13, fontWeight: 900, color: '#00E676', fontFamily: '"Cairo", sans-serif', letterSpacing: 0.5 }}>
        {label}
      </Typography>
    </Stack>
  )
}

export default function CoverageMatchCard({ match, onOpen, onEdit, onStats, showSaved }: Props) {
  const leagueColor = LEAGUE_COLORS[match.competitionId] ?? '#0057A8'
  const live = match.status === 'in_progress'
  const statusColor = COVERAGE_MATCH_STATUS_COLORS[match.status]
  const started = match.homeScore !== null && match.awayScore !== null
  const stadium = displayStadium(match)
  const hasStats = Boolean(
    (match.statistics && (match.statistics.home.length > 0 || match.statistics.away.length > 0)) ||
    (match.playerStatistics && (Object.keys(match.playerStatistics.home ?? {}).length > 0 || Object.keys(match.playerStatistics.away ?? {}).length > 0)),
  )

  return (
    <Paper
      onClick={() => onOpen(match)}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 4,
        bgcolor: 'rgba(255,255,255,0.04)',
        border: `1px solid ${live ? 'rgba(0,230,118,0.45)' : 'rgba(255,255,255,0.1)'}`,
        backdropFilter: 'blur(16px)',
        cursor: 'pointer',
        transition: 'transform .22s ease, box-shadow .22s ease, border-color .22s ease',
        boxShadow: live ? '0 14px 40px rgba(0,230,118,0.16)' : '0 10px 30px rgba(0,0,0,0.28)',
        '::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(520px 180px at 88% -20%, ${leagueColor}33, transparent 62%)`,
          pointerEvents: 'none',
        },
        '&::after': live
          ? {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              width: '45%',
              height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(0,230,118,0.09), transparent)',
              animation: 'coverageSweep 3.2s ease-in-out infinite',
              pointerEvents: 'none',
            }
          : {},
        '@keyframes coverageSweep': {
          '0%': { transform: 'translateX(-160%)' },
          '100%': { transform: 'translateX(360%)' },
        },
        '@keyframes coveragePulse': {
          '0%,100%': { opacity: 1, transform: 'scale(1)' },
          '50%': { opacity: 0.35, transform: 'scale(0.82)' },
        },
        '&:hover': {
          transform: 'translateY(-3px)',
          borderColor: live ? 'rgba(0,230,118,0.75)' : `${leagueColor}aa`,
          boxShadow: live ? '0 18px 48px rgba(0,230,118,0.26)' : '0 18px 44px rgba(0,0,0,0.4)',
          '& .coverage-edit': { opacity: 1, transform: 'translateY(0)' },
        },
      }}
    >
      <Box sx={{ position: 'absolute', top: 0, right: 0, left: 0, height: 3, background: `linear-gradient(90deg, ${leagueColor}, ${leagueColor}00)` }} />

      <Stack spacing={1.5} sx={{ p: 2, position: 'relative' }}>
        <Stack direction="row" alignItems="center" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
          <Chip
            size="small"
            label={LEAGUE_NAMES_SHORT[match.competitionId] ?? match.competition}
            sx={{
              fontWeight: 900,
              fontSize: 11,
              height: 22,
              color: '#fff',
              bgcolor: `${leagueColor}33`,
              border: `1px solid ${leagueColor}`,
              boxShadow: `0 0 14px ${leagueColor}33`,
            }}
          />
          <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
            {displayCompetition(match)}
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Chip
            size="small"
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                {live && (
                  <FiberManualRecordIcon sx={{ fontSize: 12, color: statusColor, display: 'flex', animation: 'coveragePulse 1.4s ease-in-out infinite' }} />
                )}
                <Typography component="span" sx={{ fontSize: 11.5, fontWeight: 900, color: statusColor }}>
                  {COVERAGE_MATCH_STATUS_LABELS[match.status]}
                </Typography>
              </Box>
            }
            sx={{
              height: 22,
              bgcolor: `${statusColor}1A`,
              border: `1px solid ${statusColor}55`,
            }}
          />
        </Stack>

        <Stack direction="row" alignItems="center" spacing={{ xs: 1, md: 2 }}>
          <TeamBadge logo={match.home.logo} name={displayTeamName(match, 'home')} short={match.home.name.slice(0, 3).toUpperCase()} color={leagueColor} />

          <Box
            sx={{
              minWidth: { xs: 76, md: 92 },
              px: 1.5,
              py: 1.25,
              borderRadius: 3.5,
              textAlign: 'center',
              flexShrink: 0,
              background: live
                ? 'linear-gradient(135deg, rgba(0,230,118,0.22), rgba(0,0,0,0.5))'
                : 'linear-gradient(135deg, rgba(0,87,168,0.3), rgba(0,0,0,0.45))',
              border: `1.5px solid ${live ? 'rgba(0,230,118,0.5)' : 'rgba(254,190,16,0.35)'}`,
              boxShadow: 'inset 0 0 22px rgba(0,87,168,0.35)',
            }}
          >
            {started ? (
              <>
                <Typography sx={{ fontSize: { xs: 24, md: 27 }, fontWeight: 900, fontFamily: '"Cairo", sans-serif', lineHeight: 1, letterSpacing: 1 }}>
                  {match.homeScore}
                  <Box component="span" sx={{ mx: 0.5, color: 'text.secondary', fontSize: '0.6em' }}>:</Box>
                  {match.awayScore}
                </Typography>
                {live ? (
                  <LiveCounter match={match} />
                ) : (
                  <Typography sx={{ fontSize: 10, mt: 0.5, fontWeight: 800, color: 'text.secondary', letterSpacing: 0.5 }}>النهاية</Typography>
                )}
              </>
            ) : match.status === 'postponed' ? (
              <>
                <Typography sx={{ fontSize: 13, fontWeight: 900, fontFamily: '"Cairo", sans-serif', color: '#FFB300', letterSpacing: 0.5 }}>مؤجلة</Typography>
                <Typography sx={{ fontSize: 9.5, mt: 0.3, fontWeight: 700, color: 'text.secondary' }}>موعد لاحق</Typography>
              </>
            ) : (
              <>
                <Typography sx={{ fontSize: 15, fontWeight: 900, fontFamily: '"Cairo", sans-serif', color: '#FEBE10', letterSpacing: 1 }}>VS</Typography>
                <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.4} sx={{ mt: 0.4 }}>
                  <AccessTimeIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
                  <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: 'text.secondary' }}>{formatKickoff12(match.kickoff)}</Typography>
                </Stack>
              </>
            )}
          </Box>

          <TeamBadge logo={match.away.logo} name={displayTeamName(match, 'away')} short={match.away.name.slice(0, 3).toUpperCase()} color={leagueColor} />
        </Stack>

        <Box sx={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)' }} />

        <Stack direction="row" alignItems="center" spacing={1.25} useFlexGap sx={{ flexWrap: 'wrap' }}>
          <Stack direction="row" alignItems="center" spacing={0.6} sx={{ fontSize: 12, color: 'text.secondary' }}>
            <AccessTimeIcon sx={{ fontSize: 14, color: leagueColor }} />
            <Typography sx={{ fontSize: 12, color: 'text.secondary', fontWeight: 700 }}>
              {formatDateAr(match.date)} — {formatKickoff12(match.kickoff)}
            </Typography>
          </Stack>
          {stadium && (
            <Stack direction="row" alignItems="center" spacing={0.6}>
              <StadiumIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
              <Typography sx={{ fontSize: 12, color: 'text.secondary', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                {stadium}
              </Typography>
            </Stack>
          )}
          {match.channels.length > 0 && (
            <Stack direction="row" alignItems="center" spacing={0.6}>
              <TvIcon sx={{ fontSize: 14, color: '#8EC5FF' }} />
              <Typography sx={{ fontSize: 12, color: 'text.secondary', fontWeight: 700 }}>
                {match.channels.join('، ')}
              </Typography>
            </Stack>
          )}
          <Box sx={{ flexGrow: 1 }} />
          {match.saved && showSaved && (
            <Chip
              size="small"
              icon={<SaveAltIcon sx={{ fontSize: 13 }} />}
              label="محفوظة"
              sx={{ height: 20, fontWeight: 800, fontSize: 10.5, bgcolor: 'rgba(254,190,16,0.12)', color: '#FEBE10', border: '1px solid rgba(254,190,16,0.4)' }}
            />
          )}
          {hasStats && onStats && (
            <Tooltip title="إحصائيات المباراة">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation()
                  onStats(match)
                }}
                sx={{
                  p: 0.5,
                  color: live ? '#00E676' : leagueColor,
                  bgcolor: 'rgba(255,255,255,0.05)',
                  border: `1px solid ${live ? 'rgba(0,230,118,0.45)' : `${leagueColor}55`}`,
                  '&:hover': { bgcolor: `${leagueColor}22` },
                }}
                aria-label="إحصائيات المباراة"
              >
                <QueryStatsIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          )}
          {onEdit && (
            <Tooltip title="تعديل تفاصيل المباراة">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(match)
                }}
                className="coverage-edit"
                sx={{
                  p: 0.5,
                  color: leagueColor,
                  bgcolor: 'rgba(255,255,255,0.05)',
                  border: `1px solid ${leagueColor}55`,
                  opacity: 0,
                  transform: 'translateY(4px)',
                  transition: 'all .2s ease',
                  '&:hover': { bgcolor: `${leagueColor}22` },
                }}
                aria-label="تعديل المباراة"
              >
                <EditIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </Stack>
    </Paper>
  )
}
