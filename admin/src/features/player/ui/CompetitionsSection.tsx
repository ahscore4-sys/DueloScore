import { Box, Grid, Stack, Typography, Chip } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import { API_FOOTBALL_LEAGUES, LEAGUE_NAMES, LEAGUE_NAMES_SHORT, LEAGUE_COLORS, getCurrentSeason } from '@/features/match/domain/match.constants'
import { useCompetition, useCompetitionTeams } from './useCompetitionDatabase'

function leagueLogo(leagueId: number): string {
  return `https://media.api-sports.io/football/leagues/${leagueId}.png`
}

function seasonLabel(season: number): string {
  const next = (season + 1) % 100
  return `${season}/${String(next).padStart(2, '0')}`
}

function CompetitionCard({ leagueId }: { leagueId: number }) {
  const navigate = useNavigate()
  const comp = useCompetition(leagueId)
  const { teams } = useCompetitionTeams(leagueId)

  const color = LEAGUE_COLORS[leagueId] ?? '#0057A8'
  const season = comp?.season ?? getCurrentSeason()
  const teamCount = teams.length

  return (
    <Grid item xs={6}>
      <Box
        onClick={() => navigate(`/players/competition/${leagueId}`)}
        sx={{
          position: 'relative',
          borderRadius: 4,
          p: 3,
          height: '100%',
          minHeight: 210,
          cursor: 'pointer',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1.75,
          border: '1px solid rgba(255,255,255,0.12)',
          bgcolor: 'rgba(255,255,255,0.04)',
          backdropFilter: 'blur(14px)',
          transition: 'all 0.25s ease',
          '&:hover': {
            transform: 'translateY(-6px)',
            borderColor: color,
            boxShadow: `0 18px 50px -12px ${color}55`,
            bgcolor: 'rgba(255,255,255,0.06)',
          },
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            width: 240,
            height: 240,
            borderRadius: '50%',
            top: -120,
            right: -100,
            background: `radial-gradient(circle, ${color}33, ${color}00 70%)`,
            pointerEvents: 'none',
          }}
        />

        <Chip
          size="small"
          label={seasonLabel(season)}
          sx={{
            bgcolor: `${color}22`,
            color,
            fontWeight: 800,
            border: `1px solid ${color}44`,
            fontSize: 11,
          }}
        />

        <Box
          sx={{
            width: 88,
            height: 88,
            bgcolor: '#fff',
            borderRadius: 3,
            p: 1.2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 12px 28px -6px ${color}aa, 0 6px 14px rgba(0,0,0,0.45)`,
            transition: 'transform 0.25s ease',
          }}
        >
          <Box component="img" src={leagueLogo(leagueId)} alt={LEAGUE_NAMES[leagueId] ?? ''} sx={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
        </Box>

        <Box sx={{ textAlign: 'center' }}>
          <Typography sx={{ fontWeight: 800, fontSize: 17, lineHeight: 1.5 }}>{LEAGUE_NAMES[leagueId] ?? `البطولة ${leagueId}`}</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
            {LEAGUE_NAMES_SHORT[leagueId] ?? ''}
          </Typography>
        </Box>

        <Stack direction="row" alignItems="center" spacing={0.75}>
          <EmojiEventsIcon sx={{ fontSize: 18, color }} />
          {teamCount > 0 ? (
            <>
              <Typography sx={{ fontSize: 24, fontWeight: 900, color, lineHeight: 1 }}>{teamCount}</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                فريق محفوظ
              </Typography>
            </>
          ) : (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>اضغط لعرض الفرق</Typography>
          )}
        </Stack>
      </Box>
    </Grid>
  )
}

export default function CompetitionsSection() {
  return (
    <Stack spacing={1.5}>
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <Typography sx={{ fontWeight: 900, fontSize: 17 }}>اختر البطولة</Typography>
        <Box sx={{ flexGrow: 1, height: 1, bgcolor: 'divider' }} />
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
          اضغط على البطولة للاطلاع على فرقها وتشكيلاتها
        </Typography>
      </Stack>

      <Grid container spacing={{ xs: 1.5, md: 2 }}>
        {API_FOOTBALL_LEAGUES.map((id) => (
          <CompetitionCard key={id} leagueId={id} />
        ))}
      </Grid>
    </Stack>
  )
}