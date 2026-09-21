import { Box, Typography, Stack, Chip, Paper, Avatar, Dialog, DialogContent, IconButton, Divider, Skeleton, ButtonBase, LinearProgress, TextField, InputAdornment, CircularProgress } from '@mui/material'
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos'
import CloseIcon from '@mui/icons-material/Close'
import CheckIcon from '@mui/icons-material/Check'
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun'
import PersonIcon from '@mui/icons-material/Person'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import StarIcon from '@mui/icons-material/Star'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Match, MatchPlayerStatistics, PlayerFixtureEntry, PlayerFixtureStatistics } from '@/types'
import { isInPlay } from '@/lib/matchStatus'
import { savePlayerDistance } from '../data/match.service'
import { subscribeCompetitionPlayersMeta } from '@/features/player/data/competitionDatabase.service'
import CountryFlag from '@/core/ui/components/CountryFlag'

type TeamSide = 'home' | 'away'

function fmt(v: unknown, suffix = ''): string {
  if (v == null || typeof v === 'boolean') return v === true ? 'نعم' : '—'
  if (typeof v === 'number' && (Number.isFinite(v) || v === 0)) return `${v}${suffix}`
  return `${v}${suffix}`
}

function ratingColor(rating: number | null): string {
  if (rating == null) return '#9E9E9E'
  if (rating >= 8) return '#00E676'
  if (rating >= 7) return '#8BC34A'
  if (rating >= 6) return '#F9A825'
  return '#FF5252'
}

const POSITION_LABELS: Record<string, string> = {
  G: 'حارس',
  D: 'مدافع',
  M: 'وسط',
  F: 'مهاجم',
  GK: 'حارس',
  DF: 'مدافع',
  MF: 'وسط',
  FW: 'مهاجم',
}

interface StatField {
  key: keyof PlayerFixtureStatistics
  label: string
  suffix?: string
  group?: string
  icon?: React.ReactNode
}

const GROUP_ICONS: Record<string, React.ReactNode> = {
  'أساسي': '⭐',
  'التسديدات': '🎯',
  'التمرير': '🎮',
  'الدفاع': '🛡️',
  'الهجوم': '⚔️',
  'الانضباط': '🟨',
  'ركلات الجزاء': '🥅',
  'التبديلات': '🔁',
}

const STAT_FIELDS: StatField[] = [
  { key: 'minutes', label: 'دقائق اللعب', group: 'أساسي' },
  { key: 'goals', label: 'الأهداف', group: 'أساسي' },
  { key: 'assists', label: 'صناعة الأهداف', group: 'أساسي' },
  { key: 'saves', label: 'التصديات', group: 'أساسي' },
  { key: 'conceded', label: 'أهداف استقبلها', group: 'أساسي' },
  { key: 'shotsTotal', label: 'إجمالي التسديدات', group: 'التسديدات' },
  { key: 'shotsOn', label: 'تسديدات على المرمى', group: 'التسديدات' },
  { key: 'passesTotal', label: 'إجمالي التمريرات', group: 'التمرير' },
  { key: 'passesKey', label: 'تمريرات حاسمة', group: 'التمرير' },
  { key: 'passesAccuracy', label: 'دقة التمرير', suffix: '%', group: 'التمرير' },
  { key: 'tacklesTotal', label: 'اعتراضات', group: 'الدفاع' },
  { key: 'tacklesBlocks', label: 'حصر', group: 'الدفاع' },
  { key: 'tacklesInterceptions', label: 'قطع كرات', group: 'الدفاع' },
  { key: 'duelsTotal', label: 'كرات مشتركة', group: 'الدفاع' },
  { key: 'duelsWon', label: 'كرات مشتركة فائزة', group: 'الدفاع' },
  { key: 'dribbleAttempts', label: 'محاولات مراوغة', group: 'الهجوم' },
  { key: 'dribbleSuccess', label: 'مراوغات ناجحة', group: 'الهجوم' },
  { key: 'foulsDrawn', label: 'أخطاء استُدرجت', group: 'الانضباط' },
  { key: 'foulsCommitted', label: 'أخطاء مرتكبة', group: 'الانضباط' },
  { key: 'cardsYellow', label: 'بطاقات صفراء', group: 'الانضباط' },
  { key: 'cardsRed', label: 'بطاقات حمراء', group: 'الانضباط' },
  { key: 'penaltyScored', label: 'ركلات جزاء مسجلة', group: 'ركلات الجزاء' },
  { key: 'penaltyMissed', label: 'ركلات جزاء ضائعة', group: 'ركلات الجزاء' },
  { key: 'penaltyWon', label: 'ركلات جزاء محتسبة', group: 'ركلات الجزاء' },
  { key: 'penaltyCommitted', label: 'ركلات جزاء بحق الخصم', group: 'ركلات الجزاء' },
  { key: 'penaltySaved', label: 'ركلات جزاء مُصدّاة', group: 'ركلات الجزاء' },
  { key: 'rating', label: 'التقييم', group: 'التقييم' },
  { key: 'subsIn', label: 'دخل كبديل', group: 'التبديلات' },
  { key: 'subsOut', label: 'خرج', group: 'التبديلات' },
]

function positionLabel(pos: string | null | undefined): string {
  if (!pos) return ''
  const compact = pos.trim()
  return POSITION_LABELS[compact] ?? compact
}

function groupStats(s: PlayerFixtureStatistics): Array<{ group: string; fields: StatField[] }> {
  const map = new Map<string, StatField[]>()
  for (const f of STAT_FIELDS) {
    const value = s[f.key]
    if (value == null || value === false) continue
    const bucket = f.group ?? 'أساسي'
    map.set(bucket, [...(map.get(bucket) ?? []), f])
  }
  return [...map.entries()].map(([group, fields]) => ({ group, fields }))
}

function TeamLogo({ match, side, size = 44 }: { match: Match; side: TeamSide; size?: number }) {
  const team = side === 'home' ? match.home : match.away
  if (team.logo) {
    return <Avatar src={team.logo} sx={{ width: size, height: size, bgcolor: 'transparent', '& img': { objectFit: 'contain' } }} />
  }
  return (
    <Avatar sx={{ width: size, height: size, bgcolor: team.color + '33', color: team.color, fontWeight: 900, fontSize: size / 2.3 }}>{team.short}</Avatar>
  )
}

function TeamSwitcher({ match, side, onChange, homeCount, awayCount }: {
  match: Match
  side: TeamSide
  onChange: (s: TeamSide) => void
  homeCount: number
  awayCount: number
}) {
  const options: Array<{ value: TeamSide; teamId: string; name: string; color: string }> = [
    { value: 'home', teamId: match.home.id, name: match.home.name, color: match.home.color || '#0057A8' },
    { value: 'away', teamId: match.away.id, name: match.away.name, color: match.away.color || '#0057A8' },
  ]

  return (
    <Paper sx={{ display: 'flex', p: 0.75, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', gap: 0.75 }}>
      {options.map((o) => {
        const active = side === o.value
        const count = o.value === 'home' ? homeCount : awayCount
        return (
          <ButtonBase
            key={o.value}
            onClick={() => onChange(o.value)}
            sx={{
              flex: 1,
              borderRadius: 2.25,
              py: 1,
              px: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1.5,
              bgcolor: active ? `${o.color}26` : 'transparent',
              border: active ? `1px solid ${o.color}66` : '1px solid transparent',
              transition: 'all 0.2s ease',
              '&:hover': { bgcolor: active ? `${o.color}33` : 'rgba(255,255,255,0.05)' },
            }}
          >
            <TeamLogo match={match} side={o.value} size={34} />
            <Stack spacing={0.15} sx={{ textAlign: 'right', minWidth: 0 }}>
              <Typography noWrap sx={{ fontWeight: 900, fontSize: 14, lineHeight: 1.1, color: active ? '#FFF' : 'text.secondary' }}>{o.name}</Typography>
              <Typography variant="caption" sx={{ color: active ? o.color : 'text.secondary', fontWeight: 800, fontSize: 11, lineHeight: 1 }}>
                {count} لاعب
              </Typography>
            </Stack>
            {active && (
              <Chip size="small" label="محدد" sx={{ height: 16, fontSize: 9, fontWeight: 800, bgcolor: o.color, color: '#fff', minWidth: 0, px: 0.5 }} />
            )}
          </ButtonBase>
        )
      })}
    </Paper>
  )
}

function ratingVisual(rating: number | null): string {
  if (rating == null) return '—'
  return rating >= 8 ? 'ممتاز' : rating >= 7 ? 'جيد جداً' : rating >= 6 ? 'جيد' : 'ضعيف'
}

function DistanceField({ match, entry }: { match: Match; entry: PlayerFixtureEntry }) {
  const saved = match.playersDistance?.[entry.playerId]
  const [value, setValue] = useState(saved != null ? String(saved) : '')
  const [saving, setSaving] = useState(false)
  const [savedFlag, setSavedFlag] = useState(false)
  const ref = useRef<HTMLInputElement>(null)
  const focusedRef = useRef(false)

  useEffect(() => {
    if (!focusedRef.current) {
      setValue(saved != null ? String(saved) : '')
    }
  }, [saved])

  useEffect(() => {
    if (!savedFlag) return
    const t = setTimeout(() => setSavedFlag(false), 1800)
    return () => clearTimeout(t)
  }, [savedFlag])

  const commit = async () => {
    const n = Number.parseFloat(value)
    if (!Number.isFinite(n) || n < 0) {
      setValue(saved != null ? String(saved) : '')
      return
    }
    setSaving(true)
    try {
      await savePlayerDistance(match.id, entry.playerId, n)
      setSavedFlag(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Paper
      sx={{
        borderRadius: 2.5,
        border: '1px solid rgba(255,255,255,0.1)',
        bgcolor: 'rgba(255,255,255,0.03)',
        p: 1.25,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1}>
        <Box
          sx={{
            width: 38,
            height: 38,
            borderRadius: 2,
            display: 'grid',
            placeItems: 'center',
            bgcolor: 'rgba(0,230,118,0.12)',
            border: '1px solid rgba(0,230,118,0.3)',
            color: '#00E676',
            flexShrink: 0,
          }}
        >
          <DirectionsRunIcon sx={{ fontSize: 21 }} />
        </Box>
        <Stack sx={{ flex: 1, minWidth: 0 }} spacing={0.2}>
          <Typography variant="caption" sx={{ fontWeight: 900, fontSize: 11, color: 'text.secondary' }}>
            المسافة المقطوعة
          </Typography>
          <TextField
            inputRef={ref}
            size="small"
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              setSavedFlag(false)
            }}
            onFocus={() => { focusedRef.current = true }}
            onBlur={() => { focusedRef.current = false; void commit() }}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
            placeholder="0.0"
            type="number"
            inputProps={{ min: 0, step: 0.1, style: { fontWeight: 800, fontSize: 14, padding: '6px 10px' } }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 1.5,
                bgcolor: 'rgba(0,0,0,0.25)',
                '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' },
                '&:hover fieldset': { borderColor: 'rgba(0,230,118,0.4)' },
              },
              '& .MuiInputBase-input': { color: '#00E676' },
              '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 },
              '& input[type=number]': { MozAppearance: 'textfield' },
            }}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <Typography sx={{ color: 'text.secondary', fontSize: 11, fontWeight: 800 }}>كم</Typography>
                  </InputAdornment>
                ),
              },
            }}
          />
        </Stack>
        <Box sx={{ width: 30, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          {saving ? (
            <CircularProgress size={18} sx={{ color: '#00E676' }} />
          ) : savedFlag ? (
            <CheckIcon sx={{ color: '#00E676', fontSize: 20 }} />
          ) : (
            <IconButton size="small" onClick={() => void commit()} sx={{ color: 'text.secondary' }}>
              <CheckIcon sx={{ fontSize: 18 }} />
            </IconButton>
          )}
        </Box>
      </Stack>
    </Paper>
  )
}

type PlayerMeta = Record<number, { nationality?: string | null; flag?: string | null }>

// Enriches per-fixture stats entries with squad metadata (nationality/flag)
// from the competition DB — best effort; opponents often have no squad data.
function useCompetitionPlayerMeta(apiIds: number[]): PlayerMeta {
  const listKey = [...new Set(apiIds.filter((n) => Number.isFinite(n)))].sort((a, b) => a - b).join(',')
  const [meta, setMeta] = useState<PlayerMeta>({})
  const apiIdsRef = useRef(listKey)
  apiIdsRef.current = listKey

  useEffect(() => {
    const ids = apiIdsRef.current.split(',').filter(Boolean).map(Number)
    if (ids.length === 0) return
    let active = true
    const unsubs: (() => void)[] = []
    for (let i = 0; i < ids.length; i += 10) {
      const chunk = ids.slice(i, i + 10)
      unsubs.push(
        subscribeCompetitionPlayersMeta(chunk, (docs) => {
          if (!active) return
          setMeta((prev) => {
            const next: PlayerMeta = { ...prev }
            for (const d of docs) {
              const id = Number(d.id)
              if (Number.isFinite(id)) next[id] = { nationality: d.nationality ?? null, flag: d.flag ?? null }
            }
            return next
          })
        }),
      )
    }
    return () => {
      active = false
      unsubs.forEach((u) => u())
    }
  }, [apiIdsRef.current])

  return meta
}

function PlayerStatsDialog({ entry, match, side, open, onClose, meta }: {
  entry: PlayerFixtureEntry
  match: Match
  side: TeamSide
  open: boolean
  onClose: () => void
  meta?: { nationality?: string | null; flag?: string | null }
}) {
  const s = entry.stats
  const rating = s.rating
  const team = side === 'home' ? match.home : match.away
  const groups = useMemo(() => groupStats(s), [s])
  const maxMinutes = 90

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      dir="rtl"
      PaperProps={{ sx: { borderRadius: 4, bgcolor: '#0A0E1C', border: '1px solid rgba(255,255,255,0.12)', overflow: 'hidden', backgroundImage: 'linear-gradient(160deg, rgba(0,87,168,0.15), rgba(10,14,28,0.6))' } }}
    >
      <Box
        sx={{
          p: 3,
          pb: 2.5,
          position: 'relative',
          background: `linear-gradient(150deg, ${team.color}2B 0%, rgba(10,14,28,0) 60%)`,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <IconButton onClick={onClose} sx={{ position: 'absolute', top: 12, left: 12, color: 'text.secondary' }}>
          <CloseIcon fontSize="small" />
        </IconButton>

        <Stack direction="row" alignItems="center" spacing={2.25}>
          {entry.photo ? (
            <Avatar src={entry.photo} sx={{ width: 84, height: 84, border: `2px solid ${team.color}`, boxShadow: `0 0 25px ${team.color}55`, bgcolor: 'rgba(0,87,168,0.2)' }} />
          ) : (
            <Avatar sx={{ width: 84, height: 84, border: `2px solid ${team.color}`, bgcolor: 'rgba(0,87,168,0.35)', boxShadow: `0 0 25px ${team.color}55` }}>
              <PersonIcon sx={{ fontSize: 44 }} />
            </Avatar>
          )}

          <Stack spacing={0.75} sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
              {meta?.flag && <CountryFlag src={meta.flag} alt={meta.nationality ?? entry.name} size={16} />}
              <Typography noWrap sx={{ fontWeight: 900, fontSize: 22, fontFamily: '"Cairo", sans-serif', lineHeight: 1.1 }}>{entry.name}</Typography>
            </Stack>
            <Stack direction="row" spacing={0.75} flexWrap="wrap" sx={{ gap: 0.75 }}>
              {s.number != null && (
                <Chip size="small" label={`#${s.number}`} sx={{ height: 22, fontSize: 11, fontWeight: 800, bgcolor: `${team.color}33`, color: '#FFF' }} />
              )}
              {s.position && (
                <Chip size="small" label={positionLabel(s.position)} sx={{ height: 22, fontSize: 11, fontWeight: 800, bgcolor: 'rgba(255,255,255,0.1)', color: 'text.secondary' }} />
              )}
              {s.captain && (
                <Chip size="small" label="قائد الفريق" sx={{ height: 22, fontSize: 11, fontWeight: 800, bgcolor: 'rgba(254,190,16,0.18)', color: '#FEBE10', border: '1px solid rgba(254,190,16,0.4)' }} />
              )}
            </Stack>
            <Stack direction="row" alignItems="center" spacing={0.75}>
              <TeamLogo match={match} side={side} size={18} />
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>{team.name}</Typography>
            </Stack>
          </Stack>

          <Stack alignItems="center" spacing={0.5} sx={{ flexShrink: 0, borderRadius: 3, border: `1.5px solid ${ratingColor(rating)}55`, px: 1.75, py: 1.25, bgcolor: ratingColor(rating) + '11' }}>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <StarIcon sx={{ fontSize: 16, color: ratingColor(rating) }} />
              <Typography sx={{ fontWeight: 900, fontSize: 30, fontFamily: '"Cairo", sans-serif', lineHeight: 1, color: ratingColor(rating) }}>
                {rating != null ? Math.round(rating * 10) / 10 : '—'}
              </Typography>
            </Stack>
            <Typography variant="caption" sx={{ fontWeight: 800, fontSize: 10.5, color: 'text.secondary', lineHeight: 1 }}>{ratingVisual(rating)}</Typography>
          </Stack>
        </Stack>
      </Box>

      <DialogContent sx={{ p: 3, pt: 2.75 }}>
        <Stack spacing={2.5}>
          <DistanceField match={match} entry={entry} />

          <Box>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.75 }}>
              <Typography variant="caption" sx={{ fontWeight: 900, color: 'text.secondary', fontSize: 11 }}>دقائق اللعب</Typography>
              <Typography sx={{ fontWeight: 800, fontSize: 13, color: '#FFF' }}>{fmt(s.minutes)}/{maxMinutes}</Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={s.minutes != null ? Math.min(100, (s.minutes / maxMinutes) * 100) : 0}
              sx={{
                height: 8,
                borderRadius: 99,
                bgcolor: 'rgba(255,255,255,0.08)',
                '& .MuiLinearProgress-bar': { borderRadius: 99, background: `linear-gradient(90deg, ${team.color}, #FEBE10)` },
              }}
            />
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 1 }}>
            {[
              { label: 'أهداف', value: fmt(s.goals), color: '#00E676' },
              { label: 'أسيست', value: fmt(s.assists), color: '#4FC3F7' },
              { label: 'تسديدات', value: fmt(s.shotsTotal), color: '#FEBE10' },
              { label: 'تدخلات', value: fmt(s.tacklesTotal), color: '#FF8A80' },
            ].map((m, i) => (
              <Stack key={i} alignItems="center" spacing={0.25} sx={{ borderRadius: 2.5, border: '1px solid rgba(255,255,255,0.1)', bgcolor: 'rgba(255,255,255,0.03)', py: 1.25 }}>
                <Typography sx={{ fontWeight: 900, fontSize: 20, lineHeight: 1.1, color: m.color }}>{m.value}</Typography>
                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 10, color: 'text.secondary', lineHeight: 1 }}>{m.label}</Typography>
              </Stack>
            ))}
          </Box>

          <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />

          {groups.length === 0 ? (
            <Stack alignItems="center" spacing={1} sx={{ py: 2 }}>
              <Typography sx={{ color: 'text.secondary', fontWeight: 700, fontSize: 14 }}>لا توجد بيانات إحصائية متاحة لهذا اللاعب بعد.</Typography>
            </Stack>
          ) : (
            groups.map(({ group, fields }) => (
              <Box key={group}>
                <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 1 }}>
                  <Typography sx={{ fontSize: 14 }}>{GROUP_ICONS[group] ?? '📊'}</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 900, color: '#8EC5FF', fontSize: 12, flex: 1 }}>{group}</Typography>
                  <Divider sx={{ flex: 2, borderColor: 'rgba(255,255,255,0.07)' }} />
                </Stack>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0,1fr))', sm: 'repeat(3, minmax(0,1fr))' }, gap: 1 }}>
                  {fields.map((f) => (
                    <Stack key={f.key} direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ borderRadius: 2, border: '1px solid rgba(255,255,255,0.08)', bgcolor: 'rgba(255,255,255,0.025)', px: 1.25, py: 0.9 }}>
                      <Typography variant="caption" noWrap sx={{ color: 'text.secondary', fontWeight: 700, fontSize: 10.5 }}>{f.label}</Typography>
                      <Typography sx={{ fontWeight: 900, fontSize: 13.5, color: f.key === 'rating' ? ratingColor(s.rating) : '#FFF', flexShrink: 0 }}>{fmt(s[f.key], f.suffix)}</Typography>
                    </Stack>
                  ))}
                </Box>
              </Box>
            ))
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  )
}

function PlayerCard({ entry, match, side, onClick, meta }: {
  entry: PlayerFixtureEntry
  match: Match
  side: TeamSide
  onClick: () => void
  meta?: { nationality?: string | null; flag?: string | null }
}) {
  const s = entry.stats
  const rating = s.rating
  const team = side === 'home' ? match.home : match.away

  return (
    <Paper
      component={ButtonBase}
      onClick={onClick}
      sx={{
        display: 'block',
        textAlign: 'right',
        borderRadius: 3,
        bgcolor: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.1)',
        overflow: 'hidden',
        transition: 'all 0.2s ease',
        '&:hover': { borderColor: `${team.color}88`, bgcolor: 'rgba(255,255,255,0.05)', transform: 'translateY(-2px)' },
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ p: 1.75 }}>
        {entry.photo ? (
          <Avatar src={entry.photo} sx={{ width: 46, height: 46, border: `1.5px solid ${team.color}66`, bgcolor: 'rgba(0,87,168,0.35)' }} />
        ) : (
          <Avatar sx={{ width: 46, height: 46, border: `1.5px solid ${team.color}66`, bgcolor: 'rgba(0,87,168,0.35)' }}>
            <PersonIcon />
          </Avatar>
        )}
        <Stack spacing={0.25} sx={{ minWidth: 0, flex: 1 }}>
          <Stack direction="row" spacing={0.6} alignItems="center" sx={{ minWidth: 0 }}>
            {meta?.flag && <CountryFlag src={meta.flag} alt={meta.nationality ?? entry.name} size={12} />}
            <Typography noWrap sx={{ fontWeight: 900, fontSize: 14.5 }}>{entry.name}</Typography>
          </Stack>
          <Stack direction="row" spacing={0.75} alignItems="center">
            {s.number != null && (
              <Chip size="small" label={`#${s.number}`} sx={{ height: 18, fontSize: 10, fontWeight: 800, bgcolor: `${team.color}2E`, color: '#FFF' }} />
            )}
            {positionLabel(s.position) && (
              <Chip size="small" label={positionLabel(s.position)} sx={{ height: 18, fontSize: 10, fontWeight: 800, bgcolor: 'rgba(255,255,255,0.08)', color: 'text.secondary' }} />
            )}
            {s.captain && (
              <Chip size="small" label="قائد" sx={{ height: 18, fontSize: 10, fontWeight: 800, bgcolor: 'rgba(254,190,16,0.15)', color: '#FEBE10' }} />
            )}
          </Stack>
        </Stack>
        <Stack alignItems="center" spacing={0.2} sx={{ flexShrink: 0 }}>
          <Stack direction="row" alignItems="baseline" spacing={0.5}>
            <StarIcon sx={{ fontSize: 13, color: ratingColor(rating) }} />
            <Typography sx={{ fontWeight: 900, fontSize: 19, lineHeight: 1, color: ratingColor(rating) }}>
              {rating != null ? Math.round(rating * 10) / 10 : '—'}
            </Typography>
          </Stack>
          <Typography variant="caption" sx={{ fontSize: 9, color: 'text.secondary', fontWeight: 700 }}>التقييم</Typography>
        </Stack>
        <IconButton size="small" sx={{ color: 'text.secondary', flexShrink: 0 }}>
          <ArrowForwardIosIcon sx={{ fontSize: 15, transform: 'rotate(180deg)' }} />
        </IconButton>
      </Stack>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />

      <Box sx={{ px: 1.5, py: 1.25, display: 'flex', gap: 1 }}>
        {[
          { label: 'دقائق', value: fmt(s.minutes), color: 'text.secondary' },
          { label: 'أهداف', value: fmt(s.goals), color: '#00E676' },
          { label: 'أسيست', value: fmt(s.assists), color: '#4FC3F7' },
          { label: 'تسديدات', value: fmt(s.shotsTotal), color: '#FEBE10' },
          { label: 'تمريرات', value: fmt(s.passesTotal), color: '#B39DDB' },
        ].map((m) => (
          <Stack key={m.label} spacing={0.2} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
            <Typography noWrap sx={{ fontWeight: 900, fontSize: 14, lineHeight: 1.1, color: m.color }}>{m.value}</Typography>
            <Typography noWrap variant="caption" sx={{ fontSize: 9.5, color: 'text.secondary', fontWeight: 700 }}>{m.label}</Typography>
          </Stack>
        ))}
      </Box>
    </Paper>
  )
}

function playersFor(stats: MatchPlayerStatistics | null | undefined, side: TeamSide): PlayerFixtureEntry[] {
  if (!stats) return []
  const map = stats[side] ?? {}
  return Object.values(map).sort((a, b) => (a.stats.number ?? 99) - (b.stats.number ?? 99))
}

function Empty({ label, live }: { label: string; live: boolean }) {
  return (
    <Paper sx={{ borderRadius: 4, p: { xs: 3, md: 4 }, textAlign: 'center', bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>
      <Stack alignItems="center" spacing={1.5}>
        <Box sx={{ width: 52, height: 52, borderRadius: 3, display: 'grid', placeItems: 'center', bgcolor: 'rgba(0,87,168,0.12)', border: '1px solid rgba(0,87,168,0.4)', color: '#8EC5FF' }}>
          <PersonIcon sx={{ fontSize: 26 }} />
        </Box>
        <Typography sx={{ fontWeight: 900, fontSize: 16 }}>{live ? 'جارٍ جلب إحصائيات اللاعبين...' : 'لا توجد إحصائيات لاعبين بعد'}</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 460, lineHeight: 1.9 }}>
          {label}
        </Typography>
      </Stack>
    </Paper>
  )
}

function SkeletonGrid() {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0,1fr))', lg: 'repeat(3, minmax(0,1fr))' }, gap: 2 }}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Paper key={i} sx={{ borderRadius: 3, p: 2, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Skeleton variant="circular" width={46} height={46} sx={{ bgcolor: 'rgba(255,255,255,0.06)' }} />
            <Stack spacing={0.5} sx={{ flex: 1 }}>
              <Skeleton height={14} width="70%" sx={{ bgcolor: 'rgba(255,255,255,0.06)' }} />
              <Skeleton height={12} width="40%" sx={{ bgcolor: 'rgba(255,255,255,0.06)' }} />
            </Stack>
          </Stack>
        </Paper>
      ))}
    </Box>
  )
}

export default function PlayersStatisticsTab({ match }: { match: Match }) {
  const [side, setSide] = useState<TeamSide>('home')
  const [selected, setSelected] = useState<PlayerFixtureEntry | null>(null)
  const live = isInPlay(match.status)
  const stats = match.playerStatistics
  const players = playersFor(stats, side)
  const homeCount = stats?.home ? Object.keys(stats.home).length : 0
  const awayCount = stats?.away ? Object.keys(stats.away).length : 0
  const allPlayers = playersFor(stats, 'home').concat(playersFor(stats, 'away'))
  const meta = useCompetitionPlayerMeta(allPlayers.map((p) => Number(p.playerId)))
  const metaFor = (p: PlayerFixtureEntry) => meta[Number(p.playerId)]

  useEffect(() => {
    setSide('home')
    setSelected(null)
  }, [match.id])

  return (
    <Stack spacing={2.5}>
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems="center" justifyContent="space-between" spacing={1.5}>
        <TeamSwitcher match={match} side={side} onChange={setSide} homeCount={homeCount} awayCount={awayCount} />
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip
            size="small"
            icon={<EmojiEventsIcon sx={{ fontSize: 15 }} />}
            label={`${players.length} لاعب`}
            sx={{ bgcolor: 'rgba(254,190,16,0.12)', color: '#FEBE10', fontWeight: 800 }}
          />
          {live && (
            <Chip size="small" label="مباشر — تحديث كل 10 ثوانٍ" sx={{ bgcolor: 'rgba(0,230,118,0.12)', color: '#00E676', fontWeight: 800 }} />
          )}
        </Stack>
      </Stack>

      {stats == null && live ? (
        <SkeletonGrid />
      ) : players.length === 0 ? (
        <Empty
          live={live}
          label={
            stats == null
              ? 'لم يصل المصدر الخارجي ببيانات اللاعبين بعد. أثناء لعب المباراة تُجلب الإحصائيات تلقائياً كل 10 ثوانٍ وتُحدّث هنا.'
              : `لم يُرجع المصدر الخارجي لاعبي ${side === 'home' ? match.home.name : match.away.name} لهذه المباراة بعد. أثناء لعب المباراة تُجلب الإحصائيات تلقائياً كل 10 ثوانٍ.`
          }
        />
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0,1fr))', lg: 'repeat(3, minmax(0,1fr))' }, gap: 2 }}>
          {players.map((p) => (
            <PlayerCard key={p.playerId} entry={p} match={match} side={side} onClick={() => setSelected(p)} meta={metaFor(p)} />
          ))}
        </Box>
      )}

      {selected && (
        <PlayerStatsDialog entry={selected} match={match} side={side} open={Boolean(selected)} onClose={() => setSelected(null)} meta={metaFor(selected)} />
      )}
    </Stack>
  )
}