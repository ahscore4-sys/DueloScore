import { useMemo, useState } from 'react'
import { Box, Chip, Paper, Stack, Typography } from '@mui/material'
import StarIcon from '@mui/icons-material/Star'
import QueryStatsIcon from '@mui/icons-material/QueryStats'
import PersonIcon from '@mui/icons-material/Person'
import type { CoverageMatch, CoveragePlayerFixtureEntry } from '../../domain/coverageMatches.types'
import { displayTeamName, COVERAGE_MATCH_STATUS_COLORS, COVERAGE_MATCH_STATUS_LABELS } from '../../domain/coverageMatches.types'

const STAT_TYPES_AR: Record<string, string> = {
  'Ball Possession': 'الاستحواذ',
  'Total Shots': 'إجمالي التسديدات',
  'Shots on Goal': 'تسديدات على المرمى',
  'Goal Attempts': 'محاولات على المرمى',
  'Shots off Goal': 'تسديدات خارج المرمى',
  'Blocked Shots': 'تسديدات مُثلثة',
  'Corner Kicks': 'ركلات ركنية',
  Fouls: 'أخطاء',
  'Yellow Cards': 'بطاقات صفراء',
  'Red Cards': 'بطاقات حمراء',
  Offsides: 'تسللات',
  'Total passes': 'إجمالي التمريرات',
  'Passes accurate': 'تمريرات ناجحة',
  'Passes %': 'دقة التمرير',
  'Expected Goals(xG)': 'الأهداف المتوقعة (xG)',
  'Expected Goals': 'الأهداف المتوقعة (xG)',
  'Big Chances': 'فرص كبيرة',
  Saves: 'تصديات',
  'Hit Woodwork': 'القائم والعارضة',
  'Successful Dribbles': 'مراوغات ناجحة',
  Tackles: 'اعتراضات',
  Interceptions: 'قطع كرات',
  Clearances: 'إبعادات',
  'Total Crosses': 'إجمالي العرضيات',
  'Successful Crosses': 'عرضيات ناجحة',
  'Total Long Balls': 'كرات طويلة',
  'Successful Long Balls': 'كرات طويلة ناجحة',
  'Penalty Goals': 'أهداف من ركلات جزاء',
  Penalties: 'ركلات جزاء',
  'Big Chances Missed': 'فرص ضائعة',
  'Goal Kicks': 'ركلات المرمى',
  'Team Play': 'لعب جماعي',
  Attacks: 'هجمات',
  'Dangerous Attacks': 'هجمات خطيرة',
  Injuries: 'إصابات',
}

function statLabel(type: string): string {
  return STAT_TYPES_AR[type] ?? type
}

function num(value: number | null): string {
  return value !== null && Number.isFinite(value) ? String(Math.round(value * 10) / 10) : '—'
}

function formatUpdated(ms: number | undefined): string {
  if (!ms) return ''
  try {
    return new Date(ms).toLocaleString('ar-KW')
  } catch {
    return ''
  }
}

function ratingColor(r: number | null): string {
  if (r === null) return 'rgba(255,255,255,0.3)'
  if (r >= 7.5) return '#00E676'
  if (r >= 6.5) return '#FEBE10'
  return '#FF5252'
}

function PlayerRow({ entry, accent }: { entry: CoveragePlayerFixtureEntry; accent: string }) {
  const s = entry.stats
  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1}
      sx={{ px: 1.5, py: 1, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <Box
        sx={{
          width: 30,
          height: 30,
          flexShrink: 0,
          borderRadius: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          fontWeight: 900,
          color: accent,
          bgcolor: `${accent}1F`,
          border: `1px solid ${accent}55`,
          fontFamily: '"Cairo", sans-serif',
        }}
      >
        {s.number ?? '—'}
      </Box>
      {s.captain && (
        <Chip size="small" label="قائد" sx={{ height: 18, fontSize: 9.5, fontWeight: 800, bgcolor: 'rgba(254,190,16,0.16)', color: '#FEBE10', border: '1px solid rgba(254,190,16,0.4)' }} />
      )}
      <Typography sx={{ flexGrow: 1, fontSize: 13, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {entry.name}
      </Typography>
      <Stack direction="row" alignItems="center" spacing={0.3}>
        <StarIcon sx={{ fontSize: 13, color: ratingColor(s.rating) }} />
        <Typography sx={{ fontSize: 12.5, fontWeight: 900, color: ratingColor(s.rating), fontFamily: '"Cairo", sans-serif' }}>
          {num(s.rating)}
        </Typography>
      </Stack>
      <Box sx={{ minWidth: 52, textAlign: 'center' }}>
        <Typography sx={{ fontSize: 10.5, color: 'text.secondary', fontWeight: 700 }}>دقائق</Typography>
        <Typography sx={{ fontSize: 12, fontWeight: 800 }}>{num(s.minutes)}</Typography>
      </Box>
      <Box sx={{ minWidth: 34, textAlign: 'center' }}>
        <Typography sx={{ fontSize: 10.5, color: 'text.secondary', fontWeight: 700 }}>أهداف</Typography>
        <Typography sx={{ fontSize: 12, fontWeight: 800, color: s.goals ? '#00E676' : 'inherit' }}>{num(s.goals)}</Typography>
      </Box>
      <Box sx={{ minWidth: 34, textAlign: 'center' }}>
        <Typography sx={{ fontSize: 10.5, color: 'text.secondary', fontWeight: 700 }}>تمريرات</Typography>
        <Typography sx={{ fontSize: 12, fontWeight: 800 }}>{num(s.passesKey)}</Typography>
      </Box>
    </Stack>
  )
}

export default function CoverageMatchStatsSection({ match, embedded = false }: {
  match: CoverageMatch
  embedded?: boolean
}) {
  const [side, setSide] = useState<'home' | 'away'>('home')
  const accent = '#0057A8'

  const matchStats = match.statistics
  const playerStats = match.playerStatistics
  const teams = useMemo(() => {
    if (!playerStats) return null
    const home = Object.values(playerStats.home ?? {}).sort((a, b) => (a.stats.number ?? 99) - (b.stats.number ?? 99))
    const away = Object.values(playerStats.away ?? {}).sort((a, b) => (a.stats.number ?? 99) - (b.stats.number ?? 99))
    return { home, away }
  }, [playerStats])

  const hasStats = (matchStats && (matchStats.home.length > 0 || matchStats.away.length > 0))
  const hasPlayers = (teams !== null && teams.home.length + teams.away.length > 0)
  const statusColor = COVERAGE_MATCH_STATUS_COLORS[match.status]
  const sideTeams = (teams !== null && side === 'home') ? teams.home : (teams?.away ?? [])

  return (
    <Stack spacing={1}>
      <Stack direction="row" alignItems="center" justifyContent="center" spacing={2} sx={{ mb: 1 }}>
        <Stack spacing={0.5} alignItems="center" sx={{ flex: 1 }}>
          {match.home.logo ? (
            <Box component="img" src={match.home.logo} alt={match.home.name} sx={{ width: 40, height: 40, objectFit: 'contain' }} />
          ) : (
            <PersonIcon sx={{ fontSize: 34, color: 'text.secondary' }} />
          )}
          <Typography sx={{ fontSize: 13.5, fontWeight: 900 }}>{displayTeamName(match, 'home')}</Typography>
        </Stack>
        <Typography sx={{ fontSize: 24, fontWeight: 900, fontFamily: '"Cairo", sans-serif', color: '#FEBE10' }}>
          {match.homeScore ?? '-'} : {match.awayScore ?? '-'}
        </Typography>
        <Stack spacing={0.5} alignItems="center" sx={{ flex: 1 }}>
          {match.away.logo ? (
            <Box component="img" src={match.away.logo} alt={match.away.name} sx={{ width: 40, height: 40, objectFit: 'contain' }} />
          ) : (
            <PersonIcon sx={{ fontSize: 34, color: 'text.secondary' }} />
          )}
          <Typography sx={{ fontSize: 13.5, fontWeight: 900 }}>{displayTeamName(match, 'away')}</Typography>
        </Stack>
      </Stack>
      {!embedded && hasStats && hasPlayers && (
        <Stack alignItems="center" sx={{ mb: 0.5 }}>
          <Chip
            size="small"
            label={COVERAGE_MATCH_STATUS_LABELS[match.status]}
            sx={{ fontWeight: 900, fontSize: 11, height: 22, bgcolor: `${statusColor}1A`, color: statusColor, border: `1px solid ${statusColor}55` }}
          />
        </Stack>
      )}

      {!hasStats && !hasPlayers && (
        <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.16)', textAlign: 'center' }}>
          <Stack spacing={1} alignItems="center">
            <QueryStatsIcon sx={{ fontSize: 30, color: 'text.secondary' }} />
            <Typography sx={{ color: 'text.secondary', fontSize: 13.5, fontWeight: 700 }}>
              لا توجد إحصائيات لهذه المباراة بعد — تظهر تلقائياً أثناء سير المباراة وتُحدَّث كل 20 ثانية.
            </Typography>
          </Stack>
        </Paper>
      )}

      {hasStats && (
        <Stack spacing={0.5}>
          <Typography sx={{ fontSize: 13, fontWeight: 900, color: '#FEBE10' }}>إحصائيات الفريقين</Typography>
          <Stack sx={{ borderRadius: 3, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
            <Stack direction="row" sx={{ bgcolor: 'rgba(0,87,168,0.14)', px: 1.75, py: 1 }}>
              <Typography sx={{ width: 46, fontSize: 12, fontWeight: 900, color: accent }}>{match.homeScore ?? '-'}</Typography>
              <Typography sx={{ flexGrow: 1, fontSize: 12, fontWeight: 900, textAlign: 'center' }}>المؤشر</Typography>
              <Typography sx={{ width: 46, fontSize: 12, fontWeight: 900, color: accent, textAlign: 'left' }}>{match.awayScore ?? '-'}</Typography>
            </Stack>
            {Array.from({ length: Math.max(matchStats!.home.length, matchStats!.away.length) }).map((_, i) => {
              const home = matchStats!.home[i]
              const away = matchStats!.away[i]
              const label = home?.type ?? away?.type ?? ''
              return (
                <Stack key={label || i} direction="row" alignItems="center" sx={{ px: 1.75, py: 0.75, bgcolor: i % 2 ? 'rgba(255,255,255,0.03)' : 'transparent' }}>
                  <Typography sx={{ width: 46, fontSize: 13, fontWeight: 800, color: accent, textAlign: 'center', fontFamily: '"Cairo", sans-serif' }}>
                    {home?.value ?? '—'}
                  </Typography>
                  <Typography sx={{ flexGrow: 1, fontSize: 12, color: 'text.secondary', fontWeight: 700, textAlign: 'center' }}>
                    {statLabel(label)}
                  </Typography>
                  <Typography sx={{ width: 46, fontSize: 13, fontWeight: 800, color: accent, textAlign: 'center', fontFamily: '"Cairo", sans-serif' }}>
                    {away?.value ?? '—'}
                  </Typography>
                </Stack>
              )
            })}
          </Stack>
        </Stack>
      )}

      {hasPlayers && (
        <Stack spacing={0.75}>
          <Typography sx={{ fontSize: 13, fontWeight: 900, color: '#FEBE10' }}>إحصائيات اللاعبين</Typography>
          <Stack direction="row" spacing={1}>
            <Box
              onClick={() => setSide('home')}
              sx={{
                flex: 1,
                px: 1.5,
                py: 1,
                borderRadius: 2.5,
                cursor: 'pointer',
                textAlign: 'center',
                fontSize: 12.5,
                fontWeight: 900,
                bgcolor: side === 'home' ? 'rgba(0,87,168,0.22)' : 'rgba(255,255,255,0.04)',
                border: `1.5px solid ${side === 'home' ? accent : 'rgba(255,255,255,0.12)'}`,
              }}
            >
              {displayTeamName(match, 'home')}
            </Box>
            <Box
              onClick={() => setSide('away')}
              sx={{
                flex: 1,
                px: 1.5,
                py: 1,
                borderRadius: 2.5,
                cursor: 'pointer',
                textAlign: 'center',
                fontSize: 12.5,
                fontWeight: 900,
                bgcolor: side === 'away' ? 'rgba(0,87,168,0.22)' : 'rgba(255,255,255,0.04)',
                border: `1.5px solid ${side === 'away' ? accent : 'rgba(255,255,255,0.12)'}`,
              }}
            >
              {displayTeamName(match, 'away')}
            </Box>
          </Stack>
          <Stack spacing={0.5} sx={{ maxHeight: embedded ? undefined : 330, overflowY: embedded ? 'visible' : 'auto', pr: 0.5 }}>
            {sideTeams.length > 0 ? (
              sideTeams.map((entry) => <PlayerRow key={entry.playerId} entry={entry} accent={accent} />)
            ) : (
              <Typography sx={{ fontSize: 12.5, color: 'text.secondary', py: 1.5, textAlign: 'center' }}>لا توجد بيانات لاعبين لهذا الفريق.</Typography>
            )}
          </Stack>
        </Stack>
      )}

      {(match.statisticsUpdatedAt !== undefined || match.playerStatisticsUpdatedAt !== undefined) && (
        <Typography sx={{ fontSize: 11, color: 'text.secondary', textAlign: 'center' }}>
          آخر تحديث: {formatUpdated(match.statisticsUpdatedAt ?? match.playerStatisticsUpdatedAt)}
        </Typography>
      )}
    </Stack>
  )
}