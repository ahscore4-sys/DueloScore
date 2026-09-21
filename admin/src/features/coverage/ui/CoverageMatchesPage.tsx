import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Typography, Stack, Button, Paper, TextField, Skeleton, CircularProgress, Chip, Accordion, AccordionSummary, AccordionDetails } from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import SportsScoreIcon from '@mui/icons-material/SportsScore'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import SearchIcon from '@mui/icons-material/Search'
import type { CoverageMatchStatus } from '../domain/coverageMatches.types'
import { COVERAGE_MATCH_STATUS_OPTIONS, COVERAGE_MATCH_STATUS_COLORS } from '../domain/coverageMatches.types'
import { useCoverageMatches } from './useCoverageMatches'
import { triggerCoverageRefresh } from '../data/coverageMatches.service'
import CoverageMatchCard from './components/CoverageMatchCard'
import CoverageMatchEditDialog from './components/CoverageMatchEditDialog'
import CoverageStatsDialog from './components/CoverageStatsDialog'
import ChipSelector from '@/core/ui/components/ChipSelector'
import type { CoverageMatch } from '../domain/coverageMatches.types'

const LEAGUE_OPTIONS = [
  { value: 140, label: 'LaLiga' },
  { value: 2, label: 'دوري أبطال أوروبا' },
  { value: 143, label: 'كأس ملك إسبانيا' },
  { value: 556, label: 'كأس السوبر الإسباني' },
]

function MatchGroupHeader({ matches, status }: { matches: CoverageMatch[]; status: CoverageMatchStatus }) {
  if (matches.length === 0) return null
  const color = COVERAGE_MATCH_STATUS_COLORS[status]
  return (
    <Stack direction="row" alignItems="center" spacing={1}>
      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color, boxShadow: `0 0 10px ${color}` }} />
      <Typography sx={{ fontWeight: 800, fontSize: 14, color }}>
        {status === 'not_started' ? `المباريات القادمة (${matches.length})`
          : status === 'in_progress' ? `مباشرة الآن (${matches.length})`
          : status === 'postponed' ? `المباريات المؤجلة (${matches.length})`
          : `المباريات المنتهية (${matches.length})`}
      </Typography>
    </Stack>
  )
}

export default function CoverageMatchesPage() {
  const navigate = useNavigate()
  const { matches, loading } = useCoverageMatches()
  const [status, setStatus] = useState<CoverageMatchStatus | null>(null)
  const [league, setLeague] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [editTarget, setEditTarget] = useState<CoverageMatch | null>(null)
  const [statsTarget, setStatsTarget] = useState<CoverageMatch | null>(null)
  const [refreshMsg, setRefreshMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const filtered = useMemo(() => {
    let list = matches
    if (status) list = list.filter((m) => m.status === status)
    if (league) list = list.filter((m) => m.competitionId === league)
    const q = search.trim()
    if (q) {
      list = list.filter((m) =>
        [m.home.name, m.away.name, m.homeNameAr ?? '', m.awayNameAr ?? '', m.competition, m.stadium]
          .some((v) => v.toLowerCase().includes(q.toLowerCase())),
      )
    }
    return list
  }, [matches, status, league, search])

  const upcoming = filtered.filter((m) => m.status === 'not_started')
  const inProgress = filtered.filter((m) => m.status === 'in_progress')
  const postponed = filtered.filter((m) => m.status === 'postponed')
  const finished = filtered.filter((m) => m.status === 'finished')

  const doRefresh = async () => {
    setRefreshing(true)
    setRefreshMsg(null)
    try {
      const res = await triggerCoverageRefresh()
      setRefreshMsg({ ok: true, text: res.count !== undefined ? `تم التحديث — ${res.count} مباراة` : 'تم التحديث' })
    } catch {
      setRefreshMsg({ ok: false, text: 'تعذّر التحديث — تحقق من الشبكة' })
    } finally {
      setRefreshing(false)
    }
  }

  const listSection = (group: CoverageMatch[], statusKey: CoverageMatchStatus) => (
    <Stack spacing={1.5}>
      <MatchGroupHeader matches={group} status={statusKey} />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
        {group.map((m) => (
          <CoverageMatchCard
            key={m.id}
            match={m}
            onOpen={(match) => navigate(`/coverage/matches/${match.id}`)}
            onEdit={setEditTarget}
            onStats={setStatsTarget}
            showSaved
          />
        ))}
      </Box>
    </Stack>
  )

  return (
    <Stack spacing={3}>
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <Box
          sx={{
            width: 46,
            height: 46,
            borderRadius: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(254,190,16,0.14)',
            border: '1px solid rgba(254,190,16,0.4)',
            color: '#FEBE10',
            flexShrink: 0,
          }}
        >
          <SportsScoreIcon />
        </Box>
        <Stack spacing={0.25} sx={{ flexGrow: 1 }}>
          <Typography variant="h4">مباريات التغطية (Coverage Matches)</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            جميع مباريات الدوريات الأربعة عدا برشلونة وريال مدريد — النتائج والإحصائيات محدثة تلقائياً أثناء المباراة
          </Typography>
        </Stack>
        <Button
          variant="contained"
          onClick={doRefresh}
          disabled={refreshing}
          startIcon={refreshing ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
          sx={{
            flexShrink: 0,
            background: 'linear-gradient(135deg, #00E676, #00C853)',
            color: '#000000',
            fontWeight: 900,
            boxShadow: '0 6px 20px rgba(0,230,118,0.4)',
            '&:hover': { background: 'linear-gradient(135deg, #00E676, #00A84C)', color: '#000000' },
            '&.Mui-disabled': { background: 'rgba(0,230,118,0.18)', color: 'rgba(0,0,0,0.4)' },
          }}
        >
          {refreshing ? 'جارٍ التحديث…' : 'تحديث من المصدر'}
        </Button>
      </Stack>

      {refreshMsg && (
        <Box
          sx={{
            px: 2,
            py: 1,
            borderRadius: 2,
            fontSize: 13,
            fontWeight: 700,
            bgcolor: refreshMsg.ok ? 'rgba(0,230,118,0.1)' : 'rgba(255,82,82,0.1)',
            border: `1px solid ${refreshMsg.ok ? 'rgba(0,230,118,0.35)' : 'rgba(255,82,82,0.4)'}`,
            color: refreshMsg.ok ? '#00E676' : '#FF8A80',
          }}
        >
          {refreshMsg.text}
        </Box>
      )}

      <Paper sx={{ p: 2, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(14px)', position: 'sticky', top: 0, zIndex: 5 }}>
        <Stack spacing={2}>
          <TextField
            size="small"
            placeholder="بحث بالفريق أو المسابقة أو الملعب…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            slotProps={{ input: { startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} /> } }}
          />
          <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
            <ChipSelector
              label="الحالة"
              options={COVERAGE_MATCH_STATUS_OPTIONS}
              value={status}
              onChange={setStatus}
              allowEmpty
            />
            <ChipSelector
              label="البطولة"
              options={LEAGUE_OPTIONS.map((o) => ({ value: String(o.value), label: o.label }))}
              value={league !== null ? String(league) : null}
              onChange={(v) => setLeague(v !== null ? Number(v) : null)}
              allowEmpty
              accent={(v) => ({ 140: '#FF4B44', 2: '#1A3C7E', 143: '#E91E63', 556: '#FF9800' } as Record<string, string>)[v ?? '']}
            />
          </Stack>
        </Stack>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
          {[0, 1, 2, 3].map((i) => (
            <Paper key={i} sx={{ p: 2.5, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <Skeleton width="40%" height={24} />
              <Skeleton sx={{ mt: 1.5 }} height={30} />
              <Skeleton height={30} />
              <Skeleton sx={{ mt: 1 }} height={18} />
            </Paper>
          ))}
        </Box>
      ) : filtered.length === 0 ? (
        <Paper sx={{ p: 6, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', textAlign: 'center' }}>
          <Stack spacing={2} alignItems="center">
            <Box sx={{ width: 84, height: 84, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,87,168,0.15)', border: '1px solid rgba(0,87,168,0.4)', color: '#FEBE10' }}>
              <SportsScoreIcon sx={{ fontSize: 44 }} />
            </Box>
            <Typography variant="h5">لا توجد مباريات مغطاة</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 440 }}>
              {matches.length === 0
                ? 'لا توجد مباريات في النطاق الحالي — اضغط تحديث من المصدر أو انتظر التحديث التلقائي.'
                : 'لا نتائج مطابقة للفلاتر الحالية.'}
            </Typography>
            {matches.length === 0 && (
              <Button variant="contained" onClick={doRefresh} disabled={refreshing} startIcon={refreshing ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}>
                تحديث الآن
              </Button>
            )}
          </Stack>
        </Paper>
      ) : (
        <Stack spacing={4}>
          {inProgress.length > 0 && listSection(inProgress, 'in_progress')}
          {upcoming.length > 0 && listSection(upcoming, 'not_started')}
          {postponed.length > 0 && listSection(postponed, 'postponed')}
          {finished.length > 0 && (
            <Accordion
              defaultExpanded={false}
              sx={{
                bgcolor: 'transparent',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '20px !important',
                boxShadow: 'none',
                '&::before': { display: 'none' },
              }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ borderRadius: 4 }}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: COVERAGE_MATCH_STATUS_COLORS.finished }} />
                  <Typography sx={{ fontWeight: 800 }}>المباريات المنتهية ({finished.length})</Typography>
                  <Chip size="small" label="محفوظة تلقائياً" sx={{ fontWeight: 800, fontSize: 11, bgcolor: 'rgba(254,190,16,0.1)', color: '#FEBE10', border: '1px solid rgba(254,190,16,0.35)' }} />
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
                  {finished.map((m) => (
                    <CoverageMatchCard
                      key={m.id}
                      match={m}
                      onOpen={(match) => navigate(`/coverage/matches/${match.id}`)}
                      onEdit={setEditTarget}
                      onStats={setStatsTarget}
                    />
                  ))}
                </Box>
              </AccordionDetails>
            </Accordion>
          )}
        </Stack>
      )}

      <CoverageMatchEditDialog open={Boolean(editTarget)} match={editTarget} onClose={() => setEditTarget(null)} />
      <CoverageStatsDialog open={statsTarget !== null} match={statsTarget} onClose={() => setStatsTarget(null)} />
    </Stack>
  )
}