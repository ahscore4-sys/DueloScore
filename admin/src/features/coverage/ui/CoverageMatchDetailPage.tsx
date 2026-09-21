import { useState, type ReactElement } from 'react'
import { Box, Button, ButtonBase, Chip, CircularProgress, Divider, IconButton, Paper, Stack, Tooltip, Typography } from '@mui/material'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import LiveTvIcon from '@mui/icons-material/LiveTv'
import MicIcon from '@mui/icons-material/Mic'
import GavelIcon from '@mui/icons-material/Gavel'
import VideocamIcon from '@mui/icons-material/Videocam'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import SportsScoreIcon from '@mui/icons-material/SportsScore'
import GroupsIcon from '@mui/icons-material/Groups'
import TimelineIcon from '@mui/icons-material/Timeline'
import QueryStatsIcon from '@mui/icons-material/QueryStats'
import SaveAltIcon from '@mui/icons-material/SaveAlt'
import EditIcon from '@mui/icons-material/Edit'
import RefreshIcon from '@mui/icons-material/Refresh'
import { useNavigate, useParams } from 'react-router-dom'
import { LEAGUE_NAMES, LEAGUE_COLORS, LEAGUE_NAMES_SHORT } from '@/features/match/domain/match.constants'
import type { CoverageMatch } from '../domain/coverageMatches.types'
import {
  COVERAGE_MATCH_STATUS_COLORS,
  COVERAGE_MATCH_STATUS_LABELS,
  displayCompetition,
  displayStadium,
  displayTeamName,
  formatDateAr,
  formatKickoff12,
  formatSeason,
} from '../domain/coverageMatches.types'
import { useCoverageMatch } from './useCoverageMatch'
import CoverageMatchEditDialog from './components/CoverageMatchEditDialog'
import CoverageMatchClock from './components/CoverageMatchClock'
import CoverageMatchStatsSection from './components/CoverageMatchStatsSection'
import CoverageMatchLineupsTab from './components/CoverageMatchLineupsTab'
import CoverageEventTimeline from './components/CoverageEventTimeline'

type TabValue = 'info' | 'lineups' | 'events' | 'stats'

function InfoField({ icon, label, value }: { icon: ReactElement; label: string; value: string }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1.25} sx={{ px: 1.5, py: 1.1, borderRadius: 2.5, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <Box sx={{ width: 34, height: 34, borderRadius: 2, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(254,190,16,0.12)', border: '1px solid rgba(254,190,16,0.3)', color: '#FEBE10' }}>
        {icon}
      </Box>
      <Stack sx={{ minWidth: 0, flexGrow: 1 }} spacing={0.1}>
        <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 700 }}>{label}</Typography>
        <Typography noWrap sx={{ fontSize: 13.5, fontWeight: 800 }}>{value}</Typography>
      </Stack>
    </Stack>
  )
}

function InfoTab({ match, onEdit }: { match: CoverageMatch; onEdit: () => void }) {
  const stadium = displayStadium(match)
  const leagueColor = LEAGUE_COLORS[match.competitionId] ?? '#0057A8'
  return (
    <Stack spacing={2}>
      <Paper
        sx={{
          p: 2.5,
          borderRadius: 4,
          position: 'relative',
          overflow: 'hidden',
          bgcolor: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(360px 140px at 100% -20%, ${leagueColor}30, transparent 62%)`,
            pointerEvents: 'none',
          }}
        />
        <Box sx={{ position: 'relative' }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1.25}>
              <Box sx={{ width: 40, height: 40, borderRadius: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: `${leagueColor}22`, border: `1px solid ${leagueColor}55`, color: leagueColor }}>
                <EmojiEventsIcon sx={{ fontSize: 20 }} />
              </Box>
              <Stack spacing={0.1}>
                <Typography sx={{ fontWeight: 900, fontSize: 16 }}>معلومات المباراة (Match Info)</Typography>
                <Typography sx={{ fontSize: 12, color: 'text.secondary', fontWeight: 700 }}>جميع تفاصيل المباراة المغطاة</Typography>
              </Stack>
            </Stack>
            <Chip
              size="small"
              label={match.saved ? 'محفوظة بشكل دائم' : 'تحديث تلقائي من المصدر'}
              sx={{ fontWeight: 800, fontSize: 11, height: 26, bgcolor: match.saved ? 'rgba(254,190,16,0.12)' : 'rgba(0,230,118,0.12)', color: match.saved ? '#FEBE10' : '#00E676', border: `1px solid ${match.saved ? 'rgba(254,190,16,0.4)' : 'rgba(0,230,118,0.4)'}` }}
            />
          </Stack>
          <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', mb: 2 }} />

          <Typography sx={{ fontSize: 12, fontWeight: 900, color: '#FEBE10', mb: 1.25 }}>المسابقة والموعد</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1 }}>
            <InfoField icon={<EmojiEventsIcon sx={{ fontSize: 17 }} />} label="المسابقة" value={displayCompetition(match)} />
            <InfoField icon={<SportsScoreIcon sx={{ fontSize: 17 }} />} label="الجولة" value={(match.round || '—').trim()} />
            <InfoField icon={<CalendarMonthIcon sx={{ fontSize: 17 }} />} label="الموسم" value={formatSeason(match.season) || '—'} />
            <InfoField icon={<AccessTimeIcon sx={{ fontSize: 17 }} />} label="التاريخ" value={formatDateAr(match.date)} />
            <InfoField icon={<AccessTimeIcon sx={{ fontSize: 17 }} />} label="وقت الانطلاق (توقيت الكويت)" value={formatKickoff12(match.kickoff)} />
            {stadium && <InfoField icon={<LocationOnIcon sx={{ fontSize: 17 }} />} label="الملعب" value={stadium} />}
          </Box>

          <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', my: 2 }} />
          <Typography sx={{ fontSize: 12, fontWeight: 900, color: '#FEBE10', mb: 1.25 }}>البث والتغطية</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1 }}>
            {match.channels.length > 0 && (
              <InfoField icon={<LiveTvIcon sx={{ fontSize: 17 }} />} label="القنوات الناقلة" value={match.channels.join('، ')} />
            )}
            {match.commentators && match.commentators.length > 0 && (
              <InfoField icon={<MicIcon sx={{ fontSize: 17 }} />} label="المعلقون" value={match.commentators.join('، ')} />
            )}
            {match.referees && match.referees.length > 0 && (
              <InfoField icon={<GavelIcon sx={{ fontSize: 17 }} />} label="الحكام" value={match.referees.map((r) => r.name).filter(Boolean).join('، ')} />
            )}
            {match.summaryVideoUrl && (
              <InfoField icon={<VideocamIcon sx={{ fontSize: 17 }} />} label="فيديو الملخص" value={match.summaryVideoUrl} />
            )}
            {!match.channels.length && !(match.commentators?.length) && !(match.referees?.length) && !match.summaryVideoUrl && (
              <Typography sx={{ fontSize: 12.5, color: 'text.secondary', fontWeight: 700, py: 1 }}>
                لم تُضف تفاصيل البث بعد — أضفها من زر التعديل بالأسفل.
              </Typography>
            )}
          </Box>

          <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', my: 2 }} />
          <Stack direction={{ xs: 'column', sm: 'row' }} alignItems="center" justifyContent="space-between" spacing={1.5}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ color: 'text.secondary' }}>
              <SaveAltIcon sx={{ fontSize: 15, color: '#FEBE10' }} />
              <Typography sx={{ fontSize: 11.5, fontWeight: 700 }}>
                آخر تحديث للمعلومات: {match.updatedAt ? new Date(match.updatedAt).toLocaleString('ar-KW') : '—'}
              </Typography>
            </Stack>
            <Button
              variant="contained"
              startIcon={<EditIcon sx={{ fontSize: 17 }} />}
              onClick={onEdit}
              sx={{
                borderRadius: 12,
                flexShrink: 0,
                background: 'linear-gradient(135deg, #FEBE10, #F6A000)',
                color: '#1A1400',
                fontWeight: 900,
                boxShadow: '0 8px 24px rgba(254,190,16,0.35)',
                '&:hover': { background: 'linear-gradient(135deg, #FFD354, #FEBE10)', color: '#1A1400' },
              }}
            >
              تعديل الترجمة والتفاصيل
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Stack>
  )
}

function HeroMedallion({ logo, name, fallback }: { logo: string; name: string; fallback: string }) {
  return (
    <Stack spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
      <Box
        sx={{
          width: 92,
          height: 92,
          borderRadius: '50%',
          p: 1,
          bgcolor: 'rgba(255,255,255,0.05)',
          border: '1.5px solid rgba(255,255,255,0.14)',
          boxShadow: '0 14px 34px rgba(0,0,0,0.5), inset 0 0 22px rgba(254,190,16,0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {logo ? (
          <Box
            component="img"
            src={logo}
            alt={name}
            sx={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.5))' }}
          />
        ) : (
          <Box sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GroupsIcon sx={{ fontSize: 40 }} />
          </Box>
        )}
      </Box>
      <Typography
        noWrap
        sx={{ maxWidth: 170, fontSize: 15, fontWeight: 900, textAlign: 'center', textShadow: '0 2px 10px rgba(0,0,0,0.6)' }}
      >
        {name || fallback}
      </Typography>
    </Stack>
  )
}

function HeroScorecard({ match }: { match: CoverageMatch }) {
  const started = match.homeScore !== null && match.awayScore !== null
  const live = match.status === 'in_progress'
  const postponed = match.status === 'postponed'
  const leagueColor = LEAGUE_COLORS[match.competitionId] ?? '#0057A8'
  const stadium = displayStadium(match)

  return (
    <Paper
      sx={{
        p: 3.5,
        borderRadius: 5,
        position: 'relative',
        overflow: 'hidden',
        bgcolor: 'linear-gradient(180deg, rgba(14,20,40,0.85), rgba(6,8,17,0.9))',
        border: `1px solid ${live ? 'rgba(0,230,118,0.5)' : 'rgba(255,255,255,0.12)'}`,
        boxShadow: live ? '0 0 60px rgba(0,230,118,0.14)' : '0 24px 60px rgba(0,0,0,0.5)',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(560px 190px at 90% -30%, ${leagueColor}44, transparent 62%),
            radial-gradient(560px 190px at 10% 130%, ${leagueColor}2E, transparent 62%)`,
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 340,
          height: 340,
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${live ? 'rgba(0,230,118,0.1)' : 'rgba(254,190,16,0.09)'}, transparent 68%)`,
          filter: 'blur(6px)',
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `linear-gradient(${leagueColor}14 1px, transparent 1px), linear-gradient(90deg, ${leagueColor}14 1px, transparent 1px)`,
          backgroundSize: '38px 38px',
          maskImage: 'radial-gradient(560px 260px at 50% 30%, rgba(0,0,0,0.5), transparent 80%)',
          WebkitMaskImage: 'radial-gradient(560px 260px at 50% 30%, rgba(0,0,0,0.5), transparent 80%)',
          pointerEvents: 'none',
        }}
      />

      <Box sx={{ position: 'relative' }}>
        <Stack direction="row" alignItems="center" justifyContent="center" spacing={2} sx={{ mb: 3 }}>
          <Stack direction="row" alignItems="center" spacing={0.7}>
            <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: leagueColor, boxShadow: `0 0 10px ${leagueColor}` }} />
            <Typography sx={{ fontSize: 12, fontWeight: 900, color: 'text.primary', opacity: 0.85 }}>
              {LEAGUE_NAMES_SHORT[match.competitionId] ?? displayCompetition(match)} · جولة {match.round || '—'}
            </Typography>
          </Stack>
          <Box sx={{ width: 26, height: 1.5, bgcolor: 'rgba(255,255,255,0.18)' }} />
          <Stack direction="row" alignItems="center" spacing={0.7}>
            <CalendarMonthIcon sx={{ fontSize: 15, opacity: 0.75 }} />
            <Typography sx={{ fontSize: 12, fontWeight: 800, color: 'text.secondary' }}>{formatDateAr(match.date)}</Typography>
            <AccessTimeIcon sx={{ fontSize: 15, opacity: 0.75 }} />
            <Typography sx={{ fontSize: 12, fontWeight: 800, color: 'text.secondary' }}>{formatKickoff12(match.kickoff)}</Typography>
          </Stack>
        </Stack>

        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
          <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            <HeroMedallion logo={match.home.logo} name={displayTeamName(match, 'home')} fallback={match.home.name} />
          </Box>

          <Stack alignItems="center" spacing={1} sx={{ flexShrink: 0, width: 210 }}>
            <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', minHeight: 64 }}>
              {live && (
                <Box
                  sx={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    width: 120,
                    height: 120,
                    transform: 'translate(-50%, -50%)',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(0,230,118,0.22), transparent 70%)',
                    pointerEvents: 'none',
                  }}
                />
              )}
              {postponed ? (
                <Chip
                  label="مؤجلة"
                  sx={{ fontWeight: 900, fontSize: 16, height: 42, px: 3, bgcolor: 'rgba(255,179,0,0.16)', color: '#FFB300', border: '1.5px solid rgba(255,179,0,0.55)', boxShadow: '0 0 22px rgba(255,179,0,0.22)' }}
                />
              ) : (
                <Typography
                  sx={{
                    fontSize: 56,
                    lineHeight: 1,
                    fontWeight: 900,
                    fontFamily: '"Cairo", sans-serif',
                    color: live ? '#00E676' : '#FEBE10',
                    textShadow: live ? '0 0 30px rgba(0,230,118,0.55)' : '0 0 30px rgba(254,190,16,0.45)',
                    letterSpacing: 2,
                  }}
                >
                  {started ? `${match.homeScore} : ${match.awayScore}` : 'VS'}
                </Typography>
              )}
            </Box>
            <Chip
              size="small"
              label={
                <Stack direction="row" alignItems="center" spacing={0.9}>
                  {live && (
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: COVERAGE_MATCH_STATUS_COLORS[match.status], animation: 'livePulse 1.6s ease-in-out infinite', flexShrink: 0 }} />
                  )}
                  <Typography sx={{ fontWeight: 900, fontSize: 11.5, color: COVERAGE_MATCH_STATUS_COLORS[match.status] }}>
                    {COVERAGE_MATCH_STATUS_LABELS[match.status]}
                  </Typography>
                </Stack>
              }
              sx={{
                height: 26,
                pl: live ? 1 : 1.5,
                pr: 1.5,
                bgcolor: `${COVERAGE_MATCH_STATUS_COLORS[match.status]}1F`,
                border: `1px solid ${COVERAGE_MATCH_STATUS_COLORS[match.status]}66`,
                '@keyframes livePulse': {
                  '0%': { boxShadow: '0 0 0 0 rgba(0,230,118,0.55)' },
                  '70%': { boxShadow: '0 0 0 7px rgba(0,230,118,0)' },
                  '100%': { boxShadow: '0 0 0 0 rgba(0,230,118,0)' },
                },
              }}
            />
            <Typography sx={{ fontSize: 12, color: 'text.secondary', fontWeight: 800 }}>{displayCompetition(match)} — موسم {formatSeason(match.season) || '—'}</Typography>
            <CoverageMatchClock match={match} size="lg" />
          </Stack>

          <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            <HeroMedallion logo={match.away.logo} name={displayTeamName(match, 'away')} fallback={match.away.name} />
          </Box>
        </Stack>

        {(stadium || match.channels.length > 0) && (
          <Stack direction="row" alignItems="center" justifyContent="center" spacing={2} sx={{ mt: 3, flexWrap: 'wrap' }}>
            {stadium && (
              <Stack direction="row" alignItems="center" spacing={0.7}>
                <LocationOnIcon sx={{ fontSize: 15, color: leagueColor }} />
                <Typography sx={{ fontSize: 12, fontWeight: 800, color: 'text.secondary' }}>{stadium}</Typography>
              </Stack>
            )}
            {match.channels.length > 0 && (
              <Stack direction="row" alignItems="center" spacing={0.7}>
                <LiveTvIcon sx={{ fontSize: 15, color: leagueColor }} />
                <Typography sx={{ fontSize: 12, fontWeight: 800, color: 'text.secondary' }}>{match.channels.join('، ')}</Typography>
              </Stack>
            )}
          </Stack>
        )}
      </Box>
    </Paper>
  )
}

const TABS: { value: TabValue; label: string; icon: ReactElement }[] = [
  { value: 'info', label: 'المعلومات', icon: <EmojiEventsIcon sx={{ fontSize: 17 }} /> },
  { value: 'lineups', label: 'التشكيلة', icon: <GroupsIcon sx={{ fontSize: 17 }} /> },
  { value: 'events', label: 'الأحداث', icon: <TimelineIcon sx={{ fontSize: 17 }} /> },
  { value: 'stats', label: 'الإحصائيات', icon: <QueryStatsIcon sx={{ fontSize: 17 }} /> },
]

function SegmentedTabs({ value, onChange, eventsCount }: { value: TabValue; onChange: (v: TabValue) => void; eventsCount: number }) {
  return (
    <Paper
      sx={{
        p: 0.6,
        borderRadius: 999,
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 0.6,
        bgcolor: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {TABS.map((t) => {
        const active = value === t.value
        return (
          <ButtonBase
            key={t.value}
            onClick={() => onChange(t.value)}
            sx={{
              py: 1.15,
              px: 1,
              borderRadius: 999,
              transition: 'all 0.25s ease',
              position: 'relative',
              overflow: 'hidden',
              background: active
                ? 'linear-gradient(135deg, #FEBE10, #F6A000)'
                : 'transparent',
              boxShadow: active ? '0 6px 22px rgba(254,190,16,0.3)' : 'none',
              '&:hover': {
                background: active
                  ? 'linear-gradient(135deg, #FFD354, #FEBE10)'
                  : 'rgba(255,255,255,0.08)',
              },
            }}
          >
            <Stack direction="row" alignItems="center" spacing={0.8} sx={{ color: active ? '#1A1400' : 'text.secondary' }}>
              <Box sx={{ color: active ? '#1A1400' : 'text.secondary' }}>{t.icon}</Box>
              <Typography sx={{ fontWeight: 900, fontSize: 13, color: active ? '#1A1400' : 'text.secondary' }}>{t.label}</Typography>
              {t.value === 'events' && eventsCount > 0 && (
                <Box
                  sx={{
                    ml: 0.4,
                    minWidth: 18,
                    height: 18,
                    px: 0.5,
                    borderRadius: 999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: active ? 'rgba(0,0,0,0.22)' : '#FEBE10',
                    color: active ? '#FEBE10' : '#1A1400',
                    fontSize: 10.5,
                    fontWeight: 900,
                  }}
                >
                  {eventsCount}
                </Box>
              )}
            </Stack>
          </ButtonBase>
        )
      })}
    </Paper>
  )
}

export default function CoverageMatchDetailPage() {
  const { matchId } = useParams<{ matchId: string }>()
  const navigate = useNavigate()
  const { match, events, loading, refreshing, refresh } = useCoverageMatch(matchId)
  const [tab, setTab] = useState<TabValue>('info')
  const [editOpen, setEditOpen] = useState(false)

  if (loading) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ py: 10 }} spacing={2}>
        <CircularProgress size={28} color="inherit" />
        <Typography sx={{ color: 'text.secondary', fontWeight: 700 }}>جارٍ تحميل تفاصيل المباراة…</Typography>
      </Stack>
    )
  }

  if (!match) {
    return (
      <Paper sx={{ p: 5, borderRadius: 4, textAlign: 'center', bgcolor: 'rgba(255,255,255,0.04)' }}>
        <Typography sx={{ fontWeight: 800 }}>لم يتم العثور على المباراة</Typography>
      </Paper>
    )
  }

  const leagueShort = LEAGUE_NAMES_SHORT[match.competitionId] ?? LEAGUE_NAMES[match.competitionId] ?? displayCompetition(match)
  const statusColor = COVERAGE_MATCH_STATUS_COLORS[match.status]

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" alignItems="center" spacing={1.25}>
        <Tooltip title="رجوع لمباريات التغطية">
          <IconButton
            onClick={() => navigate('/coverage/matches')}
            sx={{ color: 'text.secondary', border: '1px solid rgba(255,255,255,0.12)', '&:hover': { color: '#FEBE10', borderColor: 'rgba(254,190,16,0.5)', bgcolor: 'rgba(254,190,16,0.08)' } }}
          >
            <ArrowForwardIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Tooltip>
        <Box
          sx={{
            width: 42,
            height: 42,
            borderRadius: 2.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `linear-gradient(135deg, ${statusColor}33, ${statusColor}18)`,
            border: `1px solid ${statusColor}55`,
            color: statusColor,
            boxShadow: `0 4px 18px ${statusColor}22`,
            flexShrink: 0,
          }}
        >
          <SportsScoreIcon sx={{ fontSize: 20 }} />
        </Box>
        <Stack spacing={0.15} sx={{ flexGrow: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography sx={{ fontWeight: 900, fontSize: 17 }}>تفاصيل مباراة التغطية</Typography>
            {match.saved && (
              <Chip
                size="small"
                icon={<SaveAltIcon sx={{ fontSize: 12 }} />}
                label="محفوظة"
                sx={{ height: 22, fontWeight: 800, fontSize: 10.5, bgcolor: 'rgba(254,190,16,0.12)', color: '#FEBE10', border: '1px solid rgba(254,190,16,0.4)' }}
              />
            )}
          </Stack>
          <Typography sx={{ fontSize: 12, color: 'text.secondary', fontWeight: 700 }}>
            {leagueShort} — {formatDateAr(match.date)} · {formatKickoff12(match.kickoff)}
          </Typography>
        </Stack>
        <Tooltip title="تحديث بيانات المباراة من المصدر">
          <Button
            variant="contained"
            size="small"
            startIcon={refreshing ? <CircularProgress size={14} color="inherit" /> : <RefreshIcon sx={{ fontSize: 16 }} />}
            disabled={refreshing || match.status === 'postponed'}
            onClick={refresh}
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
            {refreshing ? 'جارٍ التحديث…' : 'تحديث التفاصيل'}
          </Button>
        </Tooltip>
        <Button variant="contained" size="small" startIcon={<EditIcon sx={{ fontSize: 16 }} />} onClick={() => setEditOpen(true)} sx={{ flexShrink: 0 }}>
          تعديل
        </Button>
      </Stack>

      <HeroScorecard match={match} />

      <SegmentedTabs value={tab} onChange={setTab} eventsCount={events.length} />

      <Box sx={{ display: tab === 'info' ? 'block' : 'none' }}>
        <InfoTab match={match} onEdit={() => setEditOpen(true)} />
      </Box>
      <Box sx={{ display: tab === 'lineups' ? 'block' : 'none' }}>
        <CoverageMatchLineupsTab
          match={match}
          events={events.map((e) => ({ player: e.player, playerOut: e.playerOut, team: e.team as 'home' | 'away', type: e.type }))}
        />
        {events.length === 0 && (
          <Typography sx={{ fontSize: 11, color: 'text.secondary', textAlign: 'center', mt: 1 }}>
            للتشكيلة الكاملة مع البدلاء والإصابات، اضغط «تحديث التفاصيل» قبل انطلاق المباراة.
          </Typography>
        )}
      </Box>
      <Box sx={{ display: tab === 'events' ? 'block' : 'none' }}>
        <CoverageEventTimeline events={events} />
        {match.eventsUpdatedAt && (
          <Typography sx={{ fontSize: 11, color: 'text.secondary', textAlign: 'center', mt: 1.5 }}>
            آخر تحديث للأحداث: {new Date(match.eventsUpdatedAt).toLocaleString('ar-KW')}
          </Typography>
        )}
      </Box>
      <Box sx={{ display: tab === 'stats' ? 'block' : 'none' }}>
        <Paper sx={{ p: 2.5, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <CoverageMatchStatsSection match={match} embedded />
        </Paper>
      </Box>

      <CoverageMatchEditDialog open={editOpen} match={match} onClose={() => setEditOpen(false)} />
    </Stack>
  )
}