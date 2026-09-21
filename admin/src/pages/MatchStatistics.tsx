import { Box, Typography, Stack, Chip, Paper, Button, Skeleton, Tooltip, IconButton, Fade, Divider, TextField, Tabs, Tab } from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import GroupsIcon from '@mui/icons-material/Groups'
import BarChartIcon from '@mui/icons-material/BarChart'
import ScheduleIcon from '@mui/icons-material/Schedule'
import LinkOffIcon from '@mui/icons-material/LinkOff'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import CheckIcon from '@mui/icons-material/Check'
import { useParams } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useMatch } from '@/features/match/ui/useMatch'
import { useMatchHub } from '@/lib/matchHubContext'
import { updateMatchFields } from '@/features/match/data/match.service'
import PlayersStatisticsTab from '@/features/match/ui/PlayersStatisticsTab'
import type { Match, MatchStatItem } from '@/types'

function normType(type: string): string {
  return (type ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

const RAW_LABELS: Record<string, string> = {
  'Ball Possession': 'الاستحواذ',
  'Possession': 'الاستحواذ',
  'Expected Goals': 'الأهداف المتوقعة',
  'Expected Goals (xG)': 'الأهداف المتوقعة (xG)',
  'Expected Goals(xG)': 'الأهداف المتوقعة (xG)',
  'Expected Goals First Half': 'الأهداف المتوقعة (الشوط الأول)',
  'Expected Goals Second Half': 'الأهداف المتوقعة (الشوط الثاني)',
  'Expected Assists': 'التمريرات الحاسمة المتوقعة',
  'Expected Assists (xA)': 'التمريرات الحاسمة المتوقعة (xA)',
  'Total Shots': 'إجمالي التسديدات',
  'Shots on Goal': 'التسديدات على المرمى',
  'Shots off Goal': 'التسديدات خارج المرمى',
  'Blocked Shots': 'التسديدات المحجوبة',
  'Shots Inside box': 'تسديدات داخل المنطقة',
  'Shots Inside Box': 'تسديدات داخل المنطقة',
  'Shots Outside box': 'تسديدات خارج المنطقة',
  'Shots Outside Box': 'تسديدات خارج المنطقة',
  'Big Chances': 'الفرص الخطيرة',
  'Big Chances Missed': 'فرص ضائعة',
  'Hit Woodwork': 'القائم والعارضة',
  'Hit Woodwork Crossbar': 'القائم والعارضة',
  'Corner Kicks': 'الركنيات',
  'Corners': 'الركنيات',
  'Free Kicks': 'الركلات الحرة',
  'Goal Kicks': 'ركلات المرمى',
  'Accurate Goal Kicks': 'ركلات مرمى صحيحة',
  'Accurate Goal Kicks %': 'دقة ركلات المرمى',
  'Throw-ins': 'الرمايات الجانبية',
  'Fouls': 'الأخطاء',
  'Offsides': 'التسللات',
  'Yellow Cards': 'البطاقات الصفراء',
  'Red Cards': 'البطاقات الحمراء',
  'Goalkeeper Saves': 'تصديات الحارس',
  'Saves': 'التصديات',
  'Punches': 'لكمات الحارس',
  'Penalties': 'ركلات الجزاء',
  'Penalty Goals': 'الأهداف من ركلات الجزاء',
  'Penalty Scored': 'ركلات جزاء مسجلة',
  'Penalty Missed': 'ركلات جزاء ضائعة',
  'Penalties Missed': 'ركلات جزاء ضائعة',
  'Penalty Save': 'ركلات جزء مُصدَّاة',
  'Penalty Saves': 'ركلات جزاء مُصدَّاة',
  'Penalties Won': 'ركلات الجزاء المحتسبة',
  'Penalties Committed': 'حالات لمس يد في المنطقة',
  'Penalty Committed': 'حالات لمس يد في المنطقة',
  'Penalties on target': 'ركلات جزاء على المرمى',
  'Penalties On Target': 'ركلات جزاء على المرمى',
  'Own Goals': 'الأهداف بالخطأ',
  'Total passes': 'إجمالي التمريرات',
  'Total Passes': 'إجمالي التمريرات',
  'Passes': 'التمريرات',
  'Passes accurate': 'التمريرات الدقيقة',
  'Passes Accurate': 'التمريرات الدقيقة',
  'Accurate passes': 'التمريرات الدقيقة',
  'Accurate Passes': 'التمريرات الدقيقة',
  'Successful passes': 'التمريرات الناجحة',
  'Passes %': 'دقة التمرير',
  'Pass %': 'دقة التمرير',
  'Pass accuracy': 'دقة التمرير',
  'Accurate ground passes': 'تمريرات أرضية صحيحة',
  'Total ground passes': 'إجمالي التمريرات الأرضية',
  'Accurate high balls': 'كرات عالية صحيحة',
  'Total high balls': 'إجمالي الكرات العالية',
  'Accurate chipped passes': 'تمريرات مقوسة صحيحة',
  'Total chipped passes': 'إجمالي التمريرات المقوسة',
  'Accurate through balls': 'تمريرات بينية صحيحة',
  'Total through balls': 'إجمالي التمريرات البينية',
  'Accurate long balls': 'كرات طويلة صحيحة',
  'Total long balls': 'إجمالي الكرات الطويلة',
  'Accurate crosses': 'عرضيات صحيحة',
  'Total crosses': 'إجمالي العرضيات',
  'Crosses accurate': 'عرضيات صحيحة',
  'Total Crosses': 'إجمالي العرضيات',
  'Successful final-third passes': 'تمريرات ناجحة في الثلث الأخير',
  'Successful final-third passes %': 'دقة التمرير في الثلث الأخير',
  'Successful passes in own half': 'تمريرات ناجحة في النصف الخاص',
  'Successful passes in own half %': 'دقة التمرير في النصف الخاص',
  'Successful passes in opposition half': 'تمريرات ناجحة في نصف الخصم',
  'Successful passes in opposition half %': 'دقة التمرير في نصف الخصم',
  'Successful switches': 'تغييرات اتجاه ناجحة',
  'Successful switches %': 'دقة تغييرات الاتجاه',
  'Dribble attempts': 'محاولات المراوغة',
  'Successful dribbles': 'مراوغات ناجحة',
  'Successful dribbles %': 'نسبة المراوغات الناجحة',
  'Tackles': 'الاعتراضات',
  'Effective tackles': 'اعتراضات ناجحة',
  'Effective tackles %': 'نسبة الاعتراضات الناجحة',
  'Interceptions': 'قطع الكرات',
  'Duels won': 'الكرات المشتركة',
  'Duels lost': 'الكرات المفقودة',
  'Aerial duels won': 'صراعات هوائية ناجحة',
  'Aerial duels lost': 'صراعات هوائية خاسرة',
  'Clearances': 'الإبعاد',
  'Effective clearances': 'إبعادات ناجحة',
  'Effective clearances %': 'نسبة الإبعاد الناجح',
  'Attacking blocks': 'حصارات هجومية',
  'Defensive blocks': 'حصارات دفاعية',
  'Effective blocks': 'تسديدات محجوبة ناجحة',
  'Effective blocks %': 'نسبة المحجوبات الناجحة',
  'Blocked Scored': 'أهداف من تسديدات محجوبة',
  'Substitutions': 'التبديلات',
  'Tackles won': 'اعتراضات ناجحة',
  'Total Chances': 'إجمالي الفرص',
  'Attacks': 'الهجمات',
  'Dangerous Attacks': 'الهجمات الخطيرة',
  'Ball Recovery': 'استعادة الكرة',
  'Field Advantage': 'أفضلية الملعب',
  'Positional Advantage': 'الأفضلية التمركزية',
  'Goal Attempts': 'المحاولات على المرمى',

  'On Target': 'على المرمى',
  'Off Target': 'خارج المرمى',
}

const LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(RAW_LABELS).map(([k, v]) => [normType(k), v]),
)

const RAW_ORDER = [
  'Ball Possession',
  'Expected Goals',
  'Expected Assists',
  'Total Shots',
  'Shots on Goal',
  'Shots off Goal',
  'Blocked Shots',
  'Shots Inside box',
  'Shots Outside box',
  'Big Chances',
  'Big Chances Missed',
  'Hit Woodwork',
  'Goal Attempts',
  'Corner Kicks',
  'Free Kicks',
  'Goal Kicks',
  'Throw-ins',
  'Fouls',
  'Offsides',
  'Yellow Cards',
  'Red Cards',
  'Penalties',
  'Penalty Goals',
  'Penalty Scored',
  'Penalty Missed',
  'Goalkeeper Saves',
  'Saves',
  'Punches',
  'Total passes',
  'Passes accurate',
  'Passes %',
  'Accurate ground passes',
  'Total ground passes',
  'Accurate high balls',
  'Total high balls',
  'Accurate chipped passes',
  'Total chipped passes',
  'Accurate through balls',
  'Total through balls',
  'Accurate long balls',
  'Total long balls',
  'Accurate crosses',
  'Total crosses',
  'Successful final-third passes',
  'Successful passes in own half',
  'Successful passes in opposition half',
  'Successful switches',
  'Dribble attempts',
  'Successful dribbles',
  'Tackles',
  'Effective tackles',
  'Interceptions',
  'Duels won',
  'Duels lost',
  'Aerial duels won',
  'Aerial duels lost',
  'Clearances',
  'Effective clearances',
  'Attacking blocks',
  'Defensive blocks',
  'Effective blocks',
  'Own Goals',
  'Substitutions',
  'Attacks',
  'Dangerous Attacks',
  'Ball Recovery',
]

const ORDER = RAW_ORDER.map(normType)

function labelOf(type: string): string {
  return LABELS[normType(type)] ?? (type || '—')
}

function num(v: string | null): number {
  if (v == null) return 0
  const n = Number.parseFloat(String(v).replace(/[%,]/g, ''))
  return Number.isFinite(n) ? n : 0
}

interface StatRow {
  key: string
  name: string
  home: string
  away: string
}

const HIDDEN_TYPES = new Set(['goalsprevented'])

function buildRows(homeItems: MatchStatItem[] = [], awayItems: MatchStatItem[] = []): StatRow[] {
  const awayByType = new Map(awayItems.map((a) => [normType(a.type), a]))
  const rows: StatRow[] = []
  for (const h of homeItems) {
    const key = normType(h.type)
    if (HIDDEN_TYPES.has(key)) continue
    const a = awayByType.get(key)
    if (h.value == null && a?.value == null) continue
    rows.push({ key, name: labelOf(h.type), home: String(h.value ?? '0'), away: String(a?.value ?? '0') })
  }
  const known = new Map(rows.map((r) => [r.key, true]))
  for (const a of awayItems) {
    const key = normType(a.type)
    if (known.has(key) || HIDDEN_TYPES.has(key)) continue
    rows.push({ key, name: labelOf(a.type), home: '0', away: String(a.value ?? '0') })
  }
  const rank = (key: string) => {
    const i = ORDER.indexOf(key)
    return i === -1 ? ORDER.length : i
  }
  return rows.sort((x, y) => rank(x.key) - rank(y.key))
}

function sharePair(row: StatRow): { home: number; away: number } {
  const h = num(row.home)
  const a = num(row.away)
  const sum = h + a
  if (sum <= 0) return { home: 50, away: 50 }
  const home = Math.round((h / sum) * 100)
  return { home, away: 100 - home }
}

function teamColor(color?: string): string {
  return color || '#0057A8'
}

function StatRowView({ row, homeColor, awayColor, animated, highlight }: {
  row: StatRow
  homeColor: string
  awayColor: string
  animated: boolean
  highlight?: boolean
}) {
  const { home: homeShare, away: awayShare } = sharePair(row)
  const barHeight = highlight ? 14 : 8
  return (
    <Box
      sx={{
        px: { xs: 1.5, md: 2.5 },
        py: 1.5,
        bgcolor: highlight ? 'rgba(254,190,16,0.05)' : 'transparent',
      }}
    >
      <Stack direction="row" alignItems="baseline" justifyContent="space-between" sx={{ mb: 0.75 }}>
        <Typography sx={{ width: 64, fontWeight: 900, fontSize: 20, fontFamily: '"Cairo", sans-serif', textAlign: 'center', color: homeColor }}>
          {row.home}
        </Typography>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
          {highlight && <BarChartIcon sx={{ fontSize: 15, color: '#FEBE10' }} />}
          <Typography noWrap sx={{ fontWeight: 800, fontSize: 14 }}>
            {row.name}
          </Typography>
        </Stack>
        <Typography sx={{ width: 64, fontWeight: 900, fontSize: 20, fontFamily: '"Cairo", sans-serif', textAlign: 'center', color: awayColor }}>
          {row.away}
        </Typography>
      </Stack>
      <Box
        dir="ltr"
        sx={{
          position: 'relative',
          height: barHeight,
          borderRadius: barHeight / 2,
          bgcolor: 'rgba(255,255,255,0.08)',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: `${animated ? homeShare : 0}%`,
            background: homeColor,
            borderRadius: barHeight / 2,
            transition: 'width 700ms ease',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: `${animated ? awayShare : 0}%`,
            background: awayColor,
            borderRadius: barHeight / 2,
            transition: 'width 700ms ease 60ms',
          }}
        />
        <Box sx={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, bgcolor: 'rgba(255,255,255,0.5)' }} />
      </Box>
    </Box>
  )
}

function StatsCard({ rows, homeName, awayName, homeColor, awayColor, animated, attendance }: {
  rows: StatRow[]
  homeName: string
  awayName: string
  homeColor: string
  awayColor: string
  animated: boolean
  attendance?: number
}) {
  const possession = rows.find((r) => r.key === 'ball possession')
  const rest = rows.filter((r) => r.key !== 'ball possession')
  return (
    <Paper sx={{ borderRadius: 4, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.12)', overflow: 'hidden' }}>
      <Stack direction="row" alignItems="center" sx={{ px: { xs: 2, md: 3 }, pt: 2.5, pb: 1.5 }}>
        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: homeColor, mr: 1 }} />
        <Typography noWrap sx={{ fontWeight: 800, fontSize: 13, color: homeColor, maxWidth: '40%' }}>{homeName}</Typography>
        <Typography sx={{ flex: 1, textAlign: 'center', fontWeight: 900, fontSize: 14, color: 'text.secondary' }}>إحصائيات المباراة</Typography>
        <Typography noWrap sx={{ fontWeight: 800, fontSize: 13, color: awayColor, maxWidth: '40%' }}>{awayName}</Typography>
        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: awayColor, ml: 1 }} />
      </Stack>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />
      {attendance != null && attendance >= 0 && (
        <>
          <Stack direction="row" alignItems="center" justifyContent="center" spacing={1} sx={{ px: { xs: 1.5, md: 2.5 }, py: 1.5, bgcolor: 'rgba(254,190,16,0.05)' }}>
            <GroupsIcon sx={{ fontSize: 15, color: '#FEBE10' }} />
            <Typography noWrap sx={{ fontWeight: 800, fontSize: 14 }}>الحضور الجماهيري</Typography>
            <Typography sx={{ fontWeight: 900, fontSize: 18, fontFamily: '"Cairo", sans-serif', color: '#FEBE10' }}>
              {attendance.toLocaleString('en-US')}
            </Typography>
          </Stack>
          <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />
        </>
      )}
      {possession && (
        <>
          <StatRowView row={possession} homeColor={homeColor} awayColor={awayColor} animated={animated} highlight />
          <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />
        </>
      )}
      {rest.map((row) => (
        <Box key={row.key}>
          <StatRowView row={row} homeColor={homeColor} awayColor={awayColor} animated={animated} />
          <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />
        </Box>
      ))}
    </Paper>
  )
}

function ScoreHeader({ match, final }: { match: Match; final: boolean }) {
  const homeColor = teamColor(match.home.color)
  const awayColor = teamColor(match.away.color)
  const homeWins = match.score.home > match.score.away
  const awayWins = match.score.away > match.score.home
  return (
    <Paper
      sx={{
        borderRadius: 4,
        p: { xs: 2, md: 2.5 },
        background: 'linear-gradient(135deg, #0A1E3D 0%, #060811 60%, #0A0E1C 100%)',
        border: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flex: 1, minWidth: 0 }}>
          {match.home.logo && (
            <Box component="img" src={match.home.logo} alt="" sx={{ height: 44, width: 44, objectFit: 'contain' }} />
          )}
          <Stack spacing={0}>
            <Typography noWrap sx={{ fontWeight: 900, fontSize: { xs: 15, md: 18 } }}>{match.home.name}</Typography>
            {homeWins && <Typography sx={{ fontSize: 11, fontWeight: 800, color: homeColor }}>الفائز</Typography>}
          </Stack>
        </Stack>

        <Stack alignItems="center" spacing={0.5} sx={{ flexShrink: 0 }}>
          <Typography sx={{ fontWeight: 900, fontSize: { xs: 30, md: 36 }, fontFamily: '"Cairo", sans-serif', lineHeight: 1, color: '#FEBE10' }}>
            {match.score.home} : {match.score.away}
          </Typography>
          <Chip
            size="small"
            label={final ? 'انتهت المباراة' : 'لم تنتهِ بعد'}
            sx={{
              height: 22,
              fontSize: 11,
              bgcolor: final ? 'rgba(0,230,118,0.12)' : 'rgba(254,190,16,0.12)',
              color: final ? '#00E676' : '#FEBE10',
              fontWeight: 800,
            }}
          />
        </Stack>

        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flex: 1, minWidth: 0, justifyContent: 'flex-end' }}>
          <Stack spacing={0} sx={{ alignItems: 'flex-end' }}>
            <Typography noWrap sx={{ fontWeight: 900, fontSize: { xs: 15, md: 18 } }}>{match.away.name}</Typography>
            {awayWins && <Typography sx={{ fontSize: 11, fontWeight: 800, color: awayColor }}>الفائز</Typography>}
          </Stack>
          {match.away.logo && (
            <Box component="img" src={match.away.logo} alt="" sx={{ height: 44, width: 44, objectFit: 'contain' }} />
          )}
        </Stack>
      </Stack>
    </Paper>
  )
}

function StateBox({ icon, title, description, action }: {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <Paper sx={{ borderRadius: 4, p: { xs: 3, md: 4 }, textAlign: 'center', bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>
      <Stack alignItems="center" spacing={1.5}>
        <Box sx={{ width: 52, height: 52, borderRadius: 3, display: 'grid', placeItems: 'center', bgcolor: 'rgba(0,87,168,0.12)', border: '1px solid rgba(0,87,168,0.4)', color: '#8EC5FF' }}>
          {icon}
        </Box>
        <Typography sx={{ fontWeight: 900, fontSize: 17 }}>{title}</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 460, lineHeight: 1.9 }}>{description}</Typography>
        {action}
      </Stack>
    </Paper>
  )
}

function FetchingState() {
  return (
    <Paper sx={{ borderRadius: 4, p: { xs: 3, md: 4 }, textAlign: 'center', bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>
      <Stack alignItems="center" spacing={2}>
        <Box sx={{ position: 'relative', width: 48, height: 48 }}>
          <Box sx={{ position: 'absolute', inset: 0, border: '3px solid rgba(254,190,16,0.15)', borderTopColor: '#FEBE10', borderRadius: '50%', animation: 'statsspin 1s linear infinite' }} />
          <style>{'@keyframes statsspin { to { transform: rotate(360deg) } }'}</style>
        </Box>
        <Stack spacing={0.5}>
          <Typography sx={{ fontWeight: 900, fontSize: 16 }}>جارٍ تحميل الإحصائيات...</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>قد يستغرق ذلك بضع ثوانٍ من المصدر الخارجي</Typography>
        </Stack>
        <Stack spacing={0.75} sx={{ width: { xs: '100%', md: 420 } }}>
          <Skeleton variant="rounded" height={18} sx={{ bgcolor: 'rgba(255,255,255,0.05)' }} />
          <Skeleton variant="rounded" height={18} sx={{ bgcolor: 'rgba(255,255,255,0.05)' }} />
          <Skeleton variant="rounded" height={18} sx={{ bgcolor: 'rgba(255,255,255,0.05)' }} />
        </Stack>
      </Stack>
    </Paper>
  )
}

function AttendanceCard({ match }: { match: Match }) {
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setValue(match.attendance != null ? String(match.attendance) : '')
  }, [match.attendance])

  const save = async () => {
    const n = Number(value)
    if (!Number.isFinite(n) || n < 0) return
    setSaving(true)
    try {
      await updateMatchFields(match.id, { attendance: n })
      setSaved(true)
      window.setTimeout(() => setSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  const formatted = value !== '' ? Number(value).toLocaleString('en-US') : ''

  return (
    <Paper
      sx={{
        borderRadius: 4,
        px: { xs: 2, md: 3 },
        py: 2,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        flexDirection: { xs: 'column', sm: 'row' },
        bgcolor: 'rgba(254,190,16,0.04)',
        border: '1px solid rgba(254,190,16,0.35)',
      }}
    >
      <Box sx={{ width: 46, height: 46, borderRadius: 2.5, display: 'grid', placeItems: 'center', flexShrink: 0, bgcolor: 'rgba(254,190,16,0.12)', border: '1px solid rgba(254,190,16,0.4)', color: '#FEBE10' }}>
        <GroupsIcon sx={{ fontSize: 24 }} />
      </Box>
      <Stack spacing={0.25} sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontWeight: 900, fontSize: 15 }}>الحضور الجماهيري (Attendance)</Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {formatted ? `متفرج: ${formatted}` : 'أدخل عدد الجماهير التي حضرت المباراة ثم احفظ — يظهر للمستخدمين في بيانات المباراة.'}
        </Typography>
      </Stack>
      <TextField
        label="عدد الجماهير"
        variant="outlined"
        inputMode="numeric"
        size="small"
        fullWidth={false}
        sx={{ width: { xs: '100%', sm: 200 } }}
        value={value}
        onChange={(e) => setValue(e.target.value.replace(/[^0-9]/g, ''))}
        slotProps={{
          htmlInput: { style: { fontFamily: '"Cairo", sans-serif', fontWeight: 700 } },
        }}
      />
      <Button
        variant="contained"
        disabled={saving || value === ''}
        startIcon={saved ? <CheckIcon sx={{ fontSize: 16 }} /> : undefined}
        onClick={save}
        sx={{
          flexShrink: 0,
          borderRadius: 2,
          fontWeight: 800,
          background: 'linear-gradient(135deg, #FEBE10, #F57F17)',
          color: '#1A1400',
          '&:hover': { background: 'linear-gradient(135deg, #FFE082, #F57F17)' },
          '&.Mui-disabled': { bgcolor: 'rgba(255,255,255,0.08)', color: 'text.disabled' },
        }}
      >
        {saving ? 'جارٍ الحفظ…' : saved ? 'تم الحفظ' : 'حفظ'}
      </Button>
    </Paper>
  )
}

export default function MatchStatistics() {
  const { id: matchId } = useParams<{ id: string }>()
  const { match } = useMatch(matchId)
  const { statsPolling } = useMatchHub()
  const [animated, setAnimated] = useState(false)
  const [tab, setTab] = useState(0)
  const fetchingRef = useRef(false)
  const [manualRefreshing, setManualRefreshing] = useState(false)

  const hasStats = Boolean(match?.statistics && match.statistics.home?.length)
  const isFinal = match?.status === 'final'

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 80)
    return () => clearTimeout(t)
  }, [matchId])

  const rows = useMemo(() => {
    if (!match?.statistics) return []
    return buildRows(match.statistics.home, match.statistics.away)
  }, [match?.statistics])

  if (!match) return null

  const homeColor = teamColor(match.home.color)
  const awayColor = teamColor(match.away.color)

  const refresh = async () => {
    if (!match.fixtureId || fetchingRef.current) return
    fetchingRef.current = true
    setManualRefreshing(true)
    try {
      await statsPolling.refresh()
    } finally {
      fetchingRef.current = false
      setManualRefreshing(false)
    }
  }

  const refreshing = manualRefreshing || statsPolling.refreshing

  const refreshButton = (
    <Tooltip title="تحديث الإحصائيات">
      <IconButton onClick={refresh} disabled={refreshing} size="small" sx={{ color: 'text.secondary' }}>
        <RefreshIcon sx={{ animation: refreshing ? 'spin 1s linear infinite' : 'none', '@keyframes spin': { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } } }} />
      </IconButton>
    </Tooltip>
  )

  return (
    <Stack spacing={2.5}>
      <ScoreHeader match={match} final={isFinal} />

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          '& .MuiTabs-indicator': { bgcolor: '#FEBE10' },
        }}
      >
        <Tab label="إحصائيات المباراة (Match Stats)" sx={{ fontWeight: 800 }} />
        <Tab label="إحصائيات اللاعبين (Players Stats)" sx={{ fontWeight: 800 }} />
      </Tabs>

      {tab === 1 ? (
        <PlayersStatisticsTab match={match} />
      ) : (
        <>
          <AttendanceCard match={match} />

          {hasStats ? (
            <Fade in timeout={400}>
              <Stack spacing={2}>
                <StatsCard
                  rows={rows}
                  homeName={match.home.name}
                  awayName={match.away.name}
                  homeColor={homeColor}
                  awayColor={awayColor}
                  animated={animated}
                  attendance={match.attendance}
                />
                <Stack direction="row" spacing={1} alignItems="center" sx={{ justifyContent: 'flex-end' }}>
                  <Chip
                    size="small"
                    icon={<BarChartIcon sx={{ fontSize: 15 }} />}
                    label={`${rows.length} مؤشر إحصائي`}
                    sx={{ bgcolor: 'rgba(0,87,168,0.18)', color: '#8EC5FF', fontWeight: 800 }}
                  />
                  {refreshButton}
                </Stack>
              </Stack>
            </Fade>
          ) : refreshing ? (
            <FetchingState />
          ) : !match.fixtureId ? (
            <StateBox
              icon={<LinkOffIcon sx={{ fontSize: 26 }} />}
              title="هذه المباراة غير مرتبطة بمصدر البيانات"
              description="لم تُستورد هذه المباراة من المصدر الخارجي، لذلك لن تتوفر الإحصائيات تلقائياً. تتوفر الإحصائيات للمباريات المرتبطة بملف خارجي (fixture)."
            />
          ) : isFinal ? (
            <StateBox
              icon={<InfoOutlinedIcon sx={{ fontSize: 26 }} />}
              title="لم تتوفر الإحصائيات بعد"
              description="المصدر الخارجي لم يُصدر بيانات إحصائية لهذه المباراة بعد. قد تمر دقائق بعد نهاية المباراة قبل ظهورها — يمكنك المحاولة مجدداً."
              action={
                <Button
                  variant="outlined"
                  onClick={refresh}
                  disabled={refreshing || !match.fixtureId}
                  startIcon={<RefreshIcon sx={{ animation: refreshing ? 'spin 1s linear infinite' : 'none', '@keyframes spin': { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } } }} />}
                  sx={{ color: '#FEBE10', borderColor: 'rgba(254,190,16,0.5)', borderRadius: 2, fontWeight: 700 }}
                >
                  إعادة المحاولة
                </Button>
              }
            />
          ) : (
            <StateBox
              icon={<ScheduleIcon sx={{ fontSize: 26 }} />}
              title="تُجلب الإحصائيات أثناء اللعب"
              description="خلال المباراة تُحدَّث الإحصائيات تلقائياً من المصدر الخارجي كل 10 ثوانٍ وتظهر هنا لحظياً — الاستحواذ والتسديدات والركنيات والأخطاء وجميع المؤشرات."
            />
          )}
        </>
      )}
    </Stack>
  )
}