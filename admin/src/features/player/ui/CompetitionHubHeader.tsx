import { Box, Stack, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import GroupsIcon from '@mui/icons-material/Groups'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import { API_FOOTBALL_LEAGUES, LEAGUE_COLORS, getCurrentSeason } from '@/features/match/domain/match.constants'
import { useCompetitionTeams } from './useCompetitionDatabase'

function leagueLogo(leagueId: number): string {
  return `https://media.api-sports.io/football/leagues/${leagueId}.png`
}

function StatPill({ icon, label, bg, color, border }: { icon: ReactNode; label: string; bg: string; color: string; border: string }) {
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        px: 1.25,
        py: 0.65,
        borderRadius: 20,
        bgcolor: bg,
        border: `1px solid ${border}`,
        color,
        width: 'fit-content',
      }}
    >
      {icon}
      <Box component="span" sx={{ fontSize: 13, fontWeight: 800, color: 'inherit', lineHeight: 1 }}>
        {label}
      </Box>
    </Box>
  )
}

function CompetitionHubHeader() {
  const season = getCurrentSeason()
  const seasonText = `${season}/${String((season + 1) % 100).padStart(2, '0')}`
  const [laLigaId, uclId, copaId, supercopaId] = API_FOOTBALL_LEAGUES
  const totalTeams =
    useCompetitionTeams(laLigaId).teams.length +
    useCompetitionTeams(uclId).teams.length +
    useCompetitionTeams(copaId).teams.length +
    useCompetitionTeams(supercopaId).teams.length

  return (
    <Box
      sx={{
        position: 'relative',
        borderRadius: 5,
        overflow: 'hidden',
        p: { xs: 3, md: 4 },
        border: '1px solid rgba(255,255,255,0.14)',
        background: 'linear-gradient(135deg, rgba(0,87,168,0.24) 0%, rgba(10,14,28,0.88) 48%, rgba(10,14,28,0.96) 100%)',
        backdropFilter: 'blur(14px)',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          insetInline: 0,
          height: 3,
          background: 'linear-gradient(90deg, transparent 0%, #FEBE10 30%, #0057A8 70%, transparent 100%)',
        }}
      />

      <Box
        sx={{
          position: 'absolute',
          width: 380,
          height: 380,
          borderRadius: '50%',
          top: -160,
          right: -120,
          background: 'radial-gradient(circle, rgba(0,87,168,0.42), rgba(0,87,168,0) 70%)',
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          width: 320,
          height: 320,
          borderRadius: '50%',
          bottom: -150,
          left: -100,
          background: 'radial-gradient(circle, rgba(254,190,16,0.30), rgba(254,190,16,0) 70%)',
          pointerEvents: 'none',
        }}
      />

      <Stack
        spacing={1.25}
        sx={{
          position: 'relative',
          maxWidth: 700,
          display: { xs: 'flex', md: 'block' },
        }}
      >
        <StatPill
          icon={<EmojiEventsIcon sx={{ fontSize: 17 }} />}
          label="قواعد بيانات البطولات"
          bg="rgba(254,190,16,0.14)"
          color="#FEBE10"
          border="rgba(254,190,16,0.4)"
        />

        <Box>
          <Typography
            variant="h3"
            sx={{
              fontSize: { xs: 26, md: 34 },
              lineHeight: 1.4,
              background: 'linear-gradient(90deg, #F4F7FF 0%, #F4F7FF 55%, rgba(254,190,16,0.95) 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            فِرَق البطولات
          </Typography>
          <Typography variant="h6" sx={{ color: 'rgba(244,247,255,0.75)', mt: 0.5 }}>
            دليل الفرق واللاعبين — برشلونة وريال مدريد وكل أندية البطولات الأربع
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ pt: 0.5 }}>
          <StatPill
            icon={<EmojiEventsIcon sx={{ fontSize: 17 }} />}
            label="4 بطولات"
            bg="rgba(0,87,168,0.22)"
            color="#90CAF9"
            border="rgba(0,87,168,0.5)"
          />
          <StatPill
            icon={<GroupsIcon sx={{ fontSize: 17 }} />}
            label={totalTeams > 0 ? `${totalTeams} فريق محفوظ` : 'لم تُجلب الفرق بعد'}
            bg="rgba(0,230,118,0.1)"
            color="#00E676"
            border="rgba(0,230,118,0.35)"
          />
          <StatPill
            icon={<CalendarMonthIcon sx={{ fontSize: 17 }} />}
            label={`الموسم ${seasonText}`}
            bg="rgba(255,255,255,0.07)"
            color="rgba(244,247,255,0.75)"
            border="rgba(255,255,255,0.16)"
          />
        </Stack>
      </Stack>

      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: 48,
          transform: 'translateY(-50%)',
          display: { xs: 'none', md: 'grid' },
          gridTemplateColumns: 'repeat(2, auto)',
          gap: 1.25,
          opacity: 0.95,
        }}
      >
        {API_FOOTBALL_LEAGUES.map((id, i) => (
          <Box
            key={id}
            sx={{
              width: 64,
              height: 64,
              bgcolor: '#fff',
              borderRadius: 2.5,
              p: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 12px 26px -8px ${LEAGUE_COLORS[id] ?? '#fff'}88, 0 6px 12px rgba(0,0,0,0.4)`,
              transform: `rotate(${[-6, 5, -3, 7][i] ?? 0}deg)`,
              transition: 'transform 0.25s ease',
              '&:hover': { transform: 'scale(1.08) rotate(0deg)' },
            }}
          >
            <Box component="img" src={leagueLogo(id)} alt="" sx={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
          </Box>
        ))}
      </Box>
    </Box>
  )
}

export default CompetitionHubHeader