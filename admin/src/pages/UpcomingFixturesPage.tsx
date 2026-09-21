import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, Typography, Stack, Paper, Button, Chip, Alert, IconButton, CircularProgress,
  Accordion, AccordionSummary, AccordionDetails,
} from '@mui/material'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import RefreshIcon from '@mui/icons-material/Refresh'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ScheduleIcon from '@mui/icons-material/Schedule'
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer'
import BoltIcon from '@mui/icons-material/Bolt'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { useMatches } from '@/features/match/ui/useMatches'
import { useUpcomingFixtures } from '@/features/match/ui/useUpcomingFixtures'
import { LEAGUE_COLORS, LEAGUE_NAMES, LEAGUE_NAMES_SHORT } from '@/features/match/domain/match.constants'
import type { UpcomingFixture } from '@/features/match/domain/match.types'
import ChipIcon from '@/core/ui/components/ChipIcon'

const arabicMonths = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
const arabicDays = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

function formatKickoff(local: Date): string {
  const hours = local.getHours()
  const period = hours >= 12 ? 'مساءً' : 'صباحاً'
  const h12 = hours % 12 || 12
  return `${h12}:${String(local.getMinutes()).padStart(2, '0')} ${period}`
}

function relativeDay(local: Date): { label: string; color: string } {
  const today = new Date()
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const diff = Math.round((startOfDay(local) - startOfDay(today)) / 86400000)
  if (diff === 0) return { label: 'اليوم', color: '#00E676' }
  if (diff === 1) return { label: 'غداً', color: '#FEBE10' }
  if (diff > 1) return { label: `${diff} أيام`, color: '#8EC5FF' }
  return { label: 'ماضية', color: '#FF8A80' }
}

function FixtureCard({ fixture, onImport, importing }: { fixture: UpcomingFixture; onImport: () => void; importing: boolean }) {
  const local = new Date(fixture.timestamp * 1000)
  const kickoff = formatKickoff(local)
  const dayName = arabicDays[local.getDay()]
  const monthName = arabicMonths[local.getMonth()]
  const day = relativeDay(local)
  const imported = fixture.alreadyImported

  return (
    <Paper
      onClick={imported ? undefined : onImport}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        p: { xs: 2, md: 2.5 },
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        borderRadius: 3,
        cursor: imported ? 'default' : 'pointer',
        bgcolor: 'rgba(255,255,255,0.035)',
        border: `1px solid ${imported ? 'rgba(0,230,118,0.28)' : 'rgba(255,255,255,0.1)'}`,
        transition: 'all .22s ease',
        '::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(600px 180px at 90% -30%, ${imported ? 'rgba(0,230,118,0.16)' : 'rgba(0,87,168,0.22)'}, transparent 60%)`,
          opacity: 0,
          transition: 'opacity .25s ease',
          pointerEvents: 'none',
        },
        '&:hover': {
          transform: imported ? 'none' : 'translateY(-2px)',
          borderColor: imported ? 'rgba(0,230,118,0.5)' : 'rgba(0,87,168,0.65)',
          boxShadow: imported ? '0 10px 30px rgba(0,230,118,.12)' : '0 14px 36px rgba(0,87,168,.28)',
          '::before': { opacity: 1 },
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 64,
          py: 0.5,
          px: 1,
          borderRadius: 2.5,
          bgcolor: 'rgba(0,0,0,0.28)',
          border: '1px solid rgba(255,255,255,0.08)',
          flexShrink: 0,
        }}
      >
        <Typography sx={{ fontWeight: 900, fontSize: 11, color: 'text.secondary' }}>{dayName}</Typography>
        <Typography sx={{ fontWeight: 900, fontSize: 22, lineHeight: 1.1, color: '#FEBE10', fontFamily: '"Cairo", sans-serif' }}>
          {local.getDate()}
        </Typography>
        <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 700 }}>{monthName}</Typography>
        <Chip
          size="small"
          label={day.label}
          sx={{
            mt: 0.75,
            height: 18,
            fontSize: 9.5,
            fontWeight: 800,
            bgcolor: `${day.color}1A`,
            color: day.color,
            border: `1px solid ${day.color}55`,
            '& .MuiChip-label': { px: 0.75 },
          }}
        />
      </Box>

      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: { xs: 1.5, md: 3 }, py: 0.5 }}>
        <Stack spacing={0.75} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
          <Box
            component="img"
            src={fixture.home.logo}
            alt={fixture.home.name}
            sx={{
              height: { xs: 42, md: 52 },
              width: 'auto',
              maxWidth: { xs: 42, md: 52 },
              objectFit: 'contain',
            }}
          />
          <Typography noWrap sx={{ fontWeight: 800, fontSize: 13, textAlign: 'center', maxWidth: '100%' }}>{fixture.home.name}</Typography>
        </Stack>

        <Stack alignItems="center" spacing={1} sx={{ flexShrink: 0, px: { xs: 1, md: 2 } }}>
          <Stack
            direction="row"
            alignItems="center"
            spacing={0.6}
            sx={{
              px: 1.25,
              py: 0.5,
              borderRadius: 2,
              bgcolor: 'rgba(254,190,16,0.14)',
              border: '1px solid rgba(254,190,16,0.45)',
            }}
          >
            <ScheduleIcon sx={{ fontSize: 14, color: '#FEBE10' }} />
            <Typography sx={{ fontWeight: 900, fontSize: 14, color: '#FEBE10', whiteSpace: 'nowrap' }}>{kickoff}</Typography>
          </Stack>
          <Box
            sx={{
              width: { xs: 42, md: 52 },
              height: { xs: 42, md: 52 },
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, rgba(0,87,168,0.35), rgba(10,14,28,0.5))',
              border: '1.5px solid rgba(254,190,16,0.35)',
              color: '#F4F7FF',
              boxShadow: 'inset 0 0 18px rgba(0,87,168,0.4)',
            }}
          >
            <Typography sx={{ fontWeight: 900, fontSize: { xs: 13, md: 14 }, fontFamily: '"Cairo", sans-serif' }}>VS</Typography>
          </Box>
        </Stack>

        <Stack spacing={0.75} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
          <Box
            component="img"
            src={fixture.away.logo}
            alt={fixture.away.name}
            sx={{
              height: { xs: 42, md: 52 },
              width: 'auto',
              maxWidth: { xs: 42, md: 52 },
              objectFit: 'contain',
            }}
          />
          <Typography noWrap sx={{ fontWeight: 800, fontSize: 13, textAlign: 'center', maxWidth: '100%' }}>{fixture.away.name}</Typography>
        </Stack>
      </Box>

      <Box sx={{ minWidth: { xs: 44, md: 56 }, display: 'flex', justifyContent: 'center', position: 'relative', zIndex: 1 }} onClick={(e) => e.stopPropagation()}>
        {imported ? (
          <Chip
            icon={<ChipIcon bg="rgba(0,230,118,0.22)"><CheckCircleIcon sx={{ fontSize: 13, color: '#00E676' }} /></ChipIcon>}
            label="مُضاف"
            size="small"
            sx={{
              bgcolor: 'rgba(0,230,118,0.16)',
              color: '#00E676',
              fontWeight: 800,
              border: '1px solid rgba(0,230,118,0.4)',
              boxShadow: '0 4px 16px rgba(0,230,118,0.2)',
              pl: 1,
              '& .MuiChip-icon': { m: 0, ml: 1 },
            }}
          />
        ) : (
          <Button
            variant="contained"
            size="small"
            startIcon={importing ? <CircularProgress size={14} color="inherit" /> : <AddCircleOutlineIcon sx={{ fontSize: 16 }} />}
            onClick={onImport}
            disabled={importing}
            sx={{
              fontWeight: 800,
              fontSize: 12,
              borderRadius: 2,
              px: 2,
              py: 0.75,
              background: 'linear-gradient(135deg, #0057A8, #0E7CE8)',
              boxShadow: '0 6px 20px rgba(0,87,168,0.4)',
              '&:hover': { background: 'linear-gradient(135deg, #0E7CE8, #1098FF)' },
              '&:disabled': { bgcolor: 'rgba(255,255,255,0.08)', color: 'text.secondary', boxShadow: 'none' },
            }}
          >
            {importing ? 'جارٍ...' : 'إضافة'}
          </Button>
        )}
      </Box>
    </Paper>
  )
}

function LeagueSection({ leagueId, fixtures, importingIds, onImport }: {
  leagueId: number
  fixtures: UpcomingFixture[]
  importingIds: Set<number>
  onImport: (f: UpcomingFixture) => void
}) {
  const color = LEAGUE_COLORS[leagueId] || '#666'
  const importedCount = fixtures.filter((f) => f.alreadyImported).length
  const leagueLogo = fixtures[0]?.league.logo

  return (
    <Accordion
      defaultExpanded
      disableGutters
      sx={{
        overflow: 'hidden',
        borderRadius: 3.5,
        borderBottomLeftRadius: 14,
        borderBottomRightRadius: 14,
        bgcolor: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.09)',
        boxShadow: '0 10px 40px rgba(0,0,0,0.25)',
        '&::before': { display: 'none' },
        '&.Mui-expanded': { borderRadius: 3.5, borderBottomLeftRadius: 14, borderBottomRightRadius: 14 },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon sx={{ color }} />}
        sx={{
          px: 2.5,
          py: 1,
          background: `linear-gradient(90deg, ${color}22, transparent 70%)`,
          borderBottom: `1px solid ${color}33`,
          '& .MuiAccordionSummary-content': { m: '12px 0', alignItems: 'center', gap: 1.5 },
        }}
      >
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: leagueLogo ? '#ffffff' : 'rgba(255,255,255,0.06)',
            overflow: 'hidden',
            boxShadow: leagueLogo ? '0 2px 8px rgba(0,0,0,0.3)' : `inset 0 0 0 1px ${color}44`,
            flexShrink: 0,
          }}
        >
          {leagueLogo ? (
            <Box component="img" src={leagueLogo} alt="" sx={{ width: '78%', height: '78%', objectFit: 'contain' }} />
          ) : (
            <SportsSoccerIcon sx={{ fontSize: 28, color }} />
          )}
        </Box>
        <Box sx={{ flex: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1.25}>
            <Typography sx={{ fontWeight: 900, fontSize: 16 }}>{LEAGUE_NAMES[leagueId] || LEAGUE_NAMES_SHORT[leagueId] || `League ${leagueId}`}</Typography>
            <Chip
              size="small"
              label={`${fixtures.length} مباراة`}
              sx={{ bgcolor: `${color}22`, color, fontWeight: 800, border: `1px solid ${color}66`, fontSize: 11 }}
            />
          </Stack>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.75 }}>
            <Box sx={{ flex: 1, height: 4, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              <Box sx={{ width: `${fixtures.length ? Math.round((importedCount / fixtures.length) * 100) : 0}%`, height: '100%', background: `linear-gradient(90deg, ${color}, ${color}cc)`, transition: 'width .4s ease' }} />
            </Box>
            <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 700, whiteSpace: 'nowrap' }}>
              {importedCount}/{fixtures.length} مضافة
            </Typography>
          </Box>
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ p: 1.5, overflow: 'hidden', borderBottomLeftRadius: 14, borderBottomRightRadius: 14, bgcolor: 'transparent' }}>
        <Stack spacing={1.5}>
          {fixtures.map((f) => (
            <FixtureCard
              key={f.fixtureId}
              fixture={f}
              importing={importingIds.has(f.fixtureId)}
              onImport={() => onImport(f)}
            />
          ))}
        </Stack>
      </AccordionDetails>
    </Accordion>
  )
}

export default function UpcomingFixturesPage() {
  const navigate = useNavigate()
  const { matches } = useMatches()
  const existingFixtureIds = useMemo(
    () => new Set(matches.map((m) => m.fixtureId).filter(Boolean) as number[]),
    [matches],
  )
  const { fixtures, loading, error, importError, importingIds, refresh, importMatch, importAll } = useUpcomingFixtures(existingFixtureIds)

  const grouped = useMemo(() => {
    const map = new Map<number, UpcomingFixture[]>()
    for (const f of fixtures) {
      const arr = map.get(f.league.id) || []
      arr.push(f)
      map.set(f.league.id, arr)
    }
    return Array.from(map.entries())
  }, [fixtures])

  const unimportedCount = fixtures.filter((f) => !f.alreadyImported).length
  const nearest = fixtures.find((f) => !f.alreadyImported)
  const nearestLocal = nearest ? new Date(nearest.timestamp * 1000) : null

  return (
    <Box>
      {loading && (
        <Stack alignItems="center" justifyContent="center" spacing={2} sx={{ py: 16 }}>
          <CircularProgress sx={{ color: '#0057A8' }} />
          <Typography sx={{ color: 'text.secondary', fontWeight: 700 }}>جارٍ جلب المباريات القادمة...</Typography>
        </Stack>
      )}

      {!loading && (
      <Stack spacing={2.5}>
        <Paper
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            overflow: 'hidden',
            borderRadius: 4,
            p: { xs: 2.5, md: 3.5 },
            background: 'linear-gradient(135deg, #060811 0%, #0A1E3D 55%, #0A0E1C 100%)',
            border: '1px solid rgba(0,87,168,0.35)',
            boxShadow: '0 8px 30px rgba(0,0,0,0.45)',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              top: -120,
              left: -80,
              width: 320,
              height: 320,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(0,87,168,0.4), transparent 70%)',
              filter: 'blur(20px)',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              bottom: -140,
              right: -60,
              width: 340,
              height: 340,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(254,190,16,0.22), transparent 70%)',
              filter: 'blur(24px)',
            }}
          />
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            alignItems={{ xs: 'flex-start', md: 'center' }}
            spacing={2.5}
            sx={{ position: 'relative', zIndex: 1 }}
          >
            <IconButton
              onClick={() => navigate('/matches')}
              size="small"
              sx={{ color: '#F4F7FF', bgcolor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', '&:hover': { bgcolor: 'rgba(255,255,255,0.16)' }, order: { xs: 2, md: 0 } }}
            >
              <ArrowForwardIcon />
            </IconButton>

            <Box sx={{ flex: 1 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                <BoltIcon sx={{ fontSize: 20, color: '#FEBE10' }} />
                <Typography sx={{ color: '#FEBE10', fontWeight: 900, fontSize: 13, letterSpacing: 0.5 }}>
                  مركز المباريات القادمة
                </Typography>
              </Stack>
              <Typography variant="h4" sx={{ fontWeight: 900, color: '#F4F7FF' }}>
                المباريات القادمة <Box component="span" sx={{ color: '#8EC5FF' }}>(Upcoming Fixtures)</Box>
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(244,247,255,0.65)', mt: 0.5 }}>
                مباريات برشلونة وريال مدريد في البطولات الأربع — أضف المباريات لتظهر في لوحة المباريات
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} alignItems="center" flexShrink={0}>
              <IconButton
                onClick={refresh}
                disabled={loading}
                size="small"
                sx={{ color: '#F4F7FF', bgcolor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', '&:hover': { bgcolor: 'rgba(255,255,255,0.16)' } }}
              >
                <RefreshIcon />
              </IconButton>
              {unimportedCount > 0 ? (
                <Button
                  variant="contained"
                  startIcon={<AddCircleOutlineIcon />}
                  onClick={importAll}
                  disabled={importingIds.size > 0}
                  sx={{
                    fontWeight: 900,
                    borderRadius: 2.5,
                    px: 2.5,
                    py: 1,
                    background: 'linear-gradient(135deg, #00E676, #00C853)',
                    color: '#062A16',
                    boxShadow: '0 8px 26px rgba(0,230,118,0.4)',
                    '&:hover': { background: 'linear-gradient(135deg, #00E676, #00A84C)' },
                    animation: importingIds.size === 0 ? 'pulseGlow 2s infinite' : 'none',
                    '@keyframes pulseGlow': {
                      '0%,100%': { boxShadow: '0 8px 26px rgba(0,230,118,0.4)' },
                      '50%': { boxShadow: '0 8px 40px rgba(0,230,118,0.7)' },
                    },
                  }}
                >
                  إضافة الكل ({unimportedCount})
                </Button>
              ) : (
                <Chip
                  icon={<ChipIcon bg="rgba(0,230,118,0.22)"><CheckCircleIcon sx={{ fontSize: 13, color: '#00E676' }} /></ChipIcon>}
                  label="اكتمل الإضافة"
                  sx={{ bgcolor: 'rgba(0,230,118,0.14)', color: '#00E676', fontWeight: 800, border: '1px solid rgba(0,230,118,0.4)', pl: 1, '& .MuiChip-icon': { m: 0, ml: 1 } }}
                />
              )}
            </Stack>
          </Stack>

          {nearestLocal && (
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 2.5, position: 'relative', zIndex: 1, bgcolor: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2, px: 2, py: 1.25, width: 'fit-content' }}>
              <FiberDots />
              <Typography sx={{ fontSize: 12, color: 'text.secondary', fontWeight: 700 }}>المواجهة التالية للإضافة:</Typography>
              <Typography sx={{ fontSize: 12, fontWeight: 900, color: '#F4F7FF' }}>{nearest!.home.name}</Typography>
              <Typography sx={{ fontSize: 12, fontWeight: 900, color: '#FEBE10' }}>×</Typography>
              <Typography sx={{ fontSize: 12, fontWeight: 900, color: '#F4F7FF' }}>{nearest!.away.name}</Typography>
              <Chip size="small" label={`${formatKickoff(new Date(nearest!.timestamp * 1000))}`} sx={{ bgcolor: 'rgba(254,190,16,0.15)', color: '#FEBE10', fontWeight: 800, fontSize: 11 }} />
            </Stack>
          )}
        </Paper>

        {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}
        {importError && <Alert severity="error" sx={{ borderRadius: 2 }}>{importError}</Alert>}

        {!loading && fixtures.length === 0 && (
          <Paper sx={{ p: 5, textAlign: 'center', bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4 }}>
            <Box sx={{ width: 76, height: 76, mx: 'auto', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,87,168,0.14)', border: '1px dashed rgba(0,87,168,0.5)', color: '#FEBE10', mb: 2 }}>
              <SportsSoccerIcon sx={{ fontSize: 40 }} />
            </Box>
            <Typography variant="h6" sx={{ color: 'text.secondary', fontWeight: 800 }}>لا توجد مباريات قادمة</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
              جرّب التحديث لجلب أحدث مباريات برشلونة وريال مدريد
            </Typography>
            <Button variant="contained" startIcon={<RefreshIcon />} onClick={refresh} sx={{ mt: 2.5, borderRadius: 2, fontWeight: 800 }}>تحديث</Button>
          </Paper>
        )}

        {grouped.map(([leagueId, leagueFixtures]) => (
          <LeagueSection
            key={leagueId}
            leagueId={leagueId}
            fixtures={leagueFixtures}
            importingIds={importingIds}
            onImport={importMatch}
          />
        ))}
      </Stack>
      )}
    </Box>
  )
}

function FiberDots() {
  return (
    <Box sx={{ display: 'flex', gap: 0.35 }}>
      {[0, 1, 2].map((i) => (
        <Box key={i} sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: '#00E676', animation: `dotPulse 1.4s ${i * 0.2}s infinite` }} />
      ))}
      <style>{`@keyframes dotPulse { 0%,100% { opacity: 0.35; transform: scale(0.85);} 50% { opacity: 1; transform: scale(1.15);} }`}</style>
    </Box>
  )
}
