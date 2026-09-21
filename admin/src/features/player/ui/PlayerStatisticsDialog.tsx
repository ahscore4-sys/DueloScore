import { useEffect, useMemo, useState } from 'react'
import {
  Box, Stack, Typography, Chip, Avatar, Dialog, DialogContent, DialogTitle, DialogActions,
  IconButton, Divider, Paper, Button, Alert, CircularProgress, TextField, MenuItem
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import PersonIcon from '@mui/icons-material/Person'
import RefreshIcon from '@mui/icons-material/Refresh'
import StarIcon from '@mui/icons-material/Star'
import EditIcon from '@mui/icons-material/Edit'
import SaveIcon from '@mui/icons-material/Save'
import { LEAGUE_NAMES, getCurrentSeason } from '@/features/match/domain/match.constants'
import { refreshTeamSeasonStatistics, updatePlayerOverrides } from '../data/competitionDatabase.service'
import type { CompetitionPlayerDoc, CompetitionTeamDoc, PlayerSeasonStatisticsDoc } from '../domain/competition.types'
import CountryFlag from '@/core/ui/components/CountryFlag'

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

function positionLabel(pos: string | null | undefined): string {
  if (!pos) return ''
  const compact = pos.trim()
  return POSITION_LABELS[compact] ?? compact
}

const SPECIFIC_POSITIONS: { value: string; label: string }[] = [
  { value: 'GK', label: 'حارس مرمى' },
  { value: 'RB', label: 'ظهير أيمن' },
  { value: 'LB', label: 'ظهير أيسر' },
  { value: 'CB', label: 'قلب دفاع' },
  { value: 'RCB', label: 'قلب دفاع أيمن' },
  { value: 'LCB', label: 'قلب دفاع أيسر' },
  { value: 'RWB', label: 'ظهير أيمن متقدم' },
  { value: 'LWB', label: 'ظهير أيسر متقدم' },
  { value: 'CDM', label: 'وسط دفاعي' },
  { value: 'RDM', label: 'وسط دفاعي أيمن' },
  { value: 'LDM', label: 'وسط دفاعي أيسر' },
  { value: 'CM', label: 'وسط مركزي' },
  { value: 'RCM', label: 'وسط مركزي أيمن' },
  { value: 'LCM', label: 'وسط مركزي أيسر' },
  { value: 'CAM', label: 'وسط مهاجم' },
  { value: 'RAM', label: 'وسط مهاجم أيمن' },
  { value: 'LAM', label: 'وسط مهاجم أيسر' },
  { value: 'RM', label: 'جناح أيمن' },
  { value: 'LM', label: 'جناح أيسر' },
  { value: 'RW', label: 'جناح أيمن' },
  { value: 'LW', label: 'جناح أيسر' },
  { value: 'CF', label: 'رأس حربة' },
  { value: 'ST', label: 'مهاجم صريح' },
  { value: 'RF', label: 'مهاجم أيمن' },
  { value: 'LF', label: 'مهاجم أيسر' },
  { value: 'SS', label: 'مهاجم ثانوي' },
]

function getSpecificPositionLabel(value: string): string {
  const found = SPECIFIC_POSITIONS.find(p => p.value === value)
  return found?.label ?? value
}

const GROUP_ICONS: Record<string, string> = {
  المشاركة: '⭐',
  الأهداف: '🎯',
  التسديدات: '🎯',
  التمرير: '🎮',
  الدفاع: '🛡️',
  الهجوم: '⚔️',
  الانضباط: '🟨',
  'ركلات الجزاء': '🥅',
  التبديلات: '🔁',
}

interface StatField {
  key: keyof PlayerSeasonStatisticsDoc
  label: string
  suffix?: string
  group?: string
}

const STAT_FIELDS: StatField[] = [
  { key: 'appearances', label: 'المباريات', group: 'المشاركة' },
  { key: 'lineups', label: 'أساسي', group: 'المشاركة' },
  { key: 'minutes', label: 'دقائق اللعب', group: 'المشاركة' },
  { key: 'goals', label: 'الأهداف', group: 'الأهداف' },
  { key: 'assists', label: 'صناعة الأهداف', group: 'الأهداف' },
  { key: 'conceded', label: 'أهداف استقبلها', group: 'الأهداف' },
  { key: 'saves', label: 'التصديات', group: 'الأهداف' },
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
  { key: 'dribblePast', label: 'تخطى اللاعبين', group: 'الهجوم' },
  { key: 'foulsDrawn', label: 'أخطاء استُدرجت', group: 'الانضباط' },
  { key: 'foulsCommitted', label: 'أخطاء مرتكبة', group: 'الانضباط' },
  { key: 'cardsYellow', label: 'بطاقات صفراء', group: 'الانضباط' },
  { key: 'cardsRed', label: 'بطاقات حمراء', group: 'الانضباط' },
  { key: 'penaltyWon', label: 'ركلات جزاء محتسبة', group: 'ركلات الجزاء' },
  { key: 'penaltyCommitted', label: 'ركلات جزاء بحق الخصم', group: 'ركلات الجزاء' },
  { key: 'penaltyScored', label: 'ركلات جزاء مسجلة', group: 'ركلات الجزاء' },
  { key: 'penaltyMissed', label: 'ركلات جزاء ضائعة', group: 'ركلات الجزاء' },
  { key: 'penaltySaved', label: 'ركلات جزاء مُصدّاة', group: 'ركلات الجزاء' },
  { key: 'subsIn', label: 'دخل كبديل', group: 'التبديلات' },
  { key: 'subsOut', label: 'خرج', group: 'التبديلات' },
  { key: 'subsBench', label: 'أيام على الاحتياط', group: 'التبديلات' },
]

function groupStats(s: PlayerSeasonStatisticsDoc): Array<{ group: string; fields: StatField[] }> {
  const map = new Map<string, StatField[]>()
  for (const f of STAT_FIELDS) {
    const value = s[f.key]
    if (value == null || value === false) continue
    const bucket = f.group ?? 'المشاركة'
    map.set(bucket, [...(map.get(bucket) ?? []), f])
  }
  return [...map.entries()].map(([group, fields]) => ({ group, fields }))
}

export default function PlayerStatisticsDialog({ open, onClose, player, team, leagueId, color }: {
  open: boolean
  onClose: () => void
  player: CompetitionPlayerDoc | null
  team: CompetitionTeamDoc | null
  leagueId: number
  color: string
}) {
  const currentSeason = getCurrentSeason()
  const statKeys = (player?.statistics ? Object.keys(player.statistics) : [])
    .map((k) => Number(k))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => b - a)
  const season = statKeys.length > 0 && !statKeys.includes(currentSeason) ? statKeys[0] : currentSeason
  const stats = player?.statistics?.[String(season)]
  const groups = useMemo(() => (stats ? groupStats(stats) : []), [stats])

  // Effective values with overrides
  const effectiveRating = stats && player?.ratingOverrides?.[String(season)] != null
    ? player.ratingOverrides[String(season)]
    : stats?.rating ?? null
  const effectiveSpecificPosition = player?.specificPosition

  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [synced, setSynced] = useState<{ playerLeagues: number[]; players: number } | null>(null)
  const [syncedOtherOnly, setSyncedOtherOnly] = useState(false)

  // Edit states
  const [ratingEditOpen, setRatingEditOpen] = useState(false)
  const [ratingEditValue, setRatingEditValue] = useState<string>('')
  const [positionEditOpen, setPositionEditOpen] = useState(false)
  const [positionEditValue, setPositionEditValue] = useState<string>('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setError(null)
      setSynced(null)
      setSyncedOtherOnly(false)
      setRatingEditOpen(false)
      setPositionEditOpen(false)
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
      setSyncedOtherOnly(!result.playerLeagues.includes(leagueId))
    } catch {
      setError('تعذر تحديث الإحصائيات. حاول مجدداً بعد قليل.')
    } finally {
      setRefreshing(false)
    }
  }

  const handleRatingEditOpen = () => {
    setRatingEditValue(effectiveRating != null ? String(effectiveRating) : '')
    setRatingEditOpen(true)
  }

  const handleRatingEditSave = async () => {
    if (!player || !team) return
    const value = Number(ratingEditValue)
    if (isNaN(value) || value < 0 || value > 10) {
      setError('التقييم يجب أن يكون رقماً بين 0 و 10')
      return
    }
    setSaving(true)
    try {
      const currentOverrides = player.ratingOverrides ?? {}
      const newOverrides = { ...currentOverrides, [String(season)]: value }
      await updatePlayerOverrides(leagueId, team.id, player.id, player.name, { ratingOverrides: newOverrides, ratingOverrideValue: value })
      setRatingEditOpen(false)
      setError(null)
    } catch {
      setError('تعذر حفظ التقييم. حاول مجدداً.')
    } finally {
      setSaving(false)
    }
  }

  const handleRatingEditClear = async () => {
    if (!player || !team) return
    setSaving(true)
    try {
      const currentOverrides = { ...(player.ratingOverrides ?? {}) }
      delete currentOverrides[String(season)]
      await updatePlayerOverrides(leagueId, team.id, player.id, player.name, { ratingOverrides: currentOverrides, ratingOverrideValue: null })
      setRatingEditOpen(false)
      setError(null)
    } catch {
      setError('تعذر مسح التقييم. حاول مجدداً.')
    } finally {
      setSaving(false)
    }
  }

  const handlePositionEditOpen = () => {
    setPositionEditValue(effectiveSpecificPosition ?? '')
    setPositionEditOpen(true)
  }

  const handlePositionEditSave = async () => {
    if (!player || !team) return
    setSaving(true)
    try {
      await updatePlayerOverrides(leagueId, team.id, player.id, player.name, { specificPosition: positionEditValue || null })
      setPositionEditOpen(false)
      setError(null)
    } catch {
      setError('تعذر حفظ المركز. حاول مجدداً.')
    } finally {
      setSaving(false)
    }
  }

  const handlePositionEditClear = async () => {
    if (!player || !team) return
    setSaving(true)
    try {
      await updatePlayerOverrides(leagueId, team.id, player.id, player.name, { specificPosition: null })
      setPositionEditOpen(false)
      setError(null)
    } catch {
      setError('تعذر مسح المركز. حاول مجدداً.')
    } finally {
      setSaving(false)
    }
  }

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
          {player?.photo ? (
            <Avatar src={player.photo} sx={{ width: 84, height: 84, border: `2px solid ${color}`, boxShadow: `0 0 25px ${color}55`, bgcolor: 'rgba(255,255,255,0.05)' }} />
          ) : (
            <Avatar sx={{ width: 84, height: 84, border: `2px solid ${color}`, bgcolor: 'rgba(255,255,255,0.08)' }}>
              <PersonIcon sx={{ fontSize: 44 }} />
            </Avatar>
          )}

          <Stack spacing={0.75} sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
              {player?.flag && <CountryFlag src={player.flag} alt={player.nationality ?? player.name} size={17} />}
              <Typography noWrap sx={{ fontWeight: 900, fontSize: 22, fontFamily: '"Cairo", sans-serif', lineHeight: 1.1 }}>{player?.name ?? 'اللاعب'}</Typography>
            </Stack>
<Stack direction="row" spacing={0.75} flexWrap="wrap" sx={{ gap: 0.75 }}>
                {stats?.position && (
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Chip
                      size="small"
                      label={effectiveSpecificPosition ? getSpecificPositionLabel(effectiveSpecificPosition) : positionLabel(stats.position)}
                      sx={{ height: 22, fontSize: 11, fontWeight: 800, bgcolor: 'rgba(255,255,255,0.1)', color: 'text.secondary' }}
                    />
                    <IconButton
                      size="small"
                      onClick={handlePositionEditOpen}
                      sx={{ p: 0.25, color: 'text.secondary', '&:hover': { color: color, bgcolor: `${color}22` } }}
                      aria-label="تعديل المركز"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                )}
                {stats?.captain && (
                  <Chip size="small" label="قائد الفريق" sx={{ height: 22, fontSize: 11, fontWeight: 800, bgcolor: 'rgba(254,190,16,0.18)', color: '#FEBE10', border: '1px solid rgba(254,190,16,0.4)' }} />
                )}
                {stats?.substitute && (
                  <Chip size="small" label="بديل" sx={{ height: 22, fontSize: 11, fontWeight: 800, bgcolor: 'rgba(0,230,118,0.14)', color: '#00E676' }} />
                )}
              </Stack>
            <Stack direction="row" alignItems="center" spacing={0.75}>
              {team?.logo ? (
                <Box component="img" src={team.logo} alt={team.name ?? ''} sx={{ width: 18, height: 18, objectFit: 'contain' }} />
              ) : null}
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                {team?.name ?? ''} · {LEAGUE_NAMES[leagueId] ?? 'البطولة'} · موسم {season}
              </Typography>
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

        {stats && (
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 2 }}>
            <Stack alignItems="center" spacing={0.5} sx={{ borderRadius: 3, border: `1.5px solid ${ratingColor(effectiveRating)}55`, px: 1.75, py: 1.25, bgcolor: ratingColor(effectiveRating) + '11', width: 'fit-content' }}>
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <StarIcon sx={{ fontSize: 16, color: ratingColor(effectiveRating) }} />
                <Typography sx={{ fontWeight: 900, fontSize: 24, fontFamily: '"Cairo", sans-serif', lineHeight: 1, color: ratingColor(effectiveRating) }}>
                  {effectiveRating != null ? Math.round(effectiveRating * 10) / 10 : '—'}
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 800, fontSize: 10.5, color: 'text.secondary', lineHeight: 1, mr: 0.5 }}>التقييم</Typography>
              </Stack>
            </Stack>
            <IconButton
              size="small"
              onClick={handleRatingEditOpen}
              sx={{ color: 'text.secondary', border: '1px solid rgba(255,255,255,0.14)', bgcolor: 'rgba(255,255,255,0.04)', '&:hover': { color: color, bgcolor: `${color}22` } }}
              aria-label="تعديل التقييم"
            >
              <EditIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Stack>
        )}
      </Box>

      <DialogContent sx={{ p: 3, pt: 2.75 }}>
        <Stack spacing={2.5}>
          {error && (
            <Alert severity="error" sx={{ borderRadius: 2, bgcolor: 'rgba(255,82,82,0.1)', color: '#FF8A80', '& .MuiAlert-icon': { color: '#FF5252' } }}>{error}</Alert>
          )}

          {synced && syncedOtherOnly && !stats && (
            <Alert severity="warning" sx={{ borderRadius: 2, bgcolor: 'rgba(254,190,16,0.1)', color: '#FFD54F', '& .MuiAlert-icon': { color: '#FEBE10' } }}>
              لا تتوفر إحصائيات لهذا اللاعب في هذه البطولة، وتم تحديث إحصائيات {synced.players} لاعب في بطولات أخرى.
            </Alert>
          )}

          {synced && !(syncedOtherOnly && !stats) && (
            <Alert severity="success" sx={{ borderRadius: 2, bgcolor: 'rgba(0,230,118,0.1)', color: '#00E676', '& .MuiAlert-icon': { color: '#00E676' } }}>
              تم تحديث إحصائيات اللاعبين بنجاح ({synced.playerLeagues.length} بطولة، {synced.players} لاعب).
            </Alert>
          )}

          {!stats ? (
            <Stack alignItems="center" spacing={1.5} sx={{ py: 4 }}>
              <Box sx={{ width: 64, height: 64, borderRadius: 3, display: 'grid', placeItems: 'center', bgcolor: `${color}1E`, border: `1px solid ${color}44`, color }}>
                <PersonIcon sx={{ fontSize: 32 }} />
              </Box>
              <Typography sx={{ fontWeight: 900, fontSize: 16 }}>لا توجد إحصائيات لهذا الموسم بعد</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 420, textAlign: 'center', lineHeight: 1.9 }}>
                تُجلب إحصائيات اللاعبين تلقائياً عند انتهاء المباريات، أو اضغط «تحديث الآن» لجلبها يدوياً من المصدر الخارجي.
              </Typography>
            </Stack>
          ) : (
            <>
              {stats.appearances != null && (
                <Box>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.75 }}>
                    <Typography variant="caption" sx={{ fontWeight: 900, color: 'text.secondary', fontSize: 11 }}>دقائق اللعب</Typography>
                    <Typography sx={{ fontWeight: 800, fontSize: 13, color: '#FFF' }}>{fmt(stats.minutes)} دقيقة</Typography>
                  </Stack>
                  <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', mb: 1.5 }} />
                </Box>
              )}

              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 1 }}>
                {[
                  { label: 'مباريات', value: fmt(stats.appearances), color: '#FFF' },
                  { label: 'أساسي', value: fmt(stats.lineups), color: '#4FC3F7' },
                  { label: 'أهداف', value: fmt(stats.goals), color: '#00E676' },
                  { label: 'أسيست', value: fmt(stats.assists), color: '#4FC3F7' },
                ].map((m, i) => (
                  <Stack key={i} alignItems="center" spacing={0.25} sx={{ borderRadius: 2.5, border: '1px solid rgba(255,255,255,0.1)', bgcolor: 'rgba(255,255,255,0.03)', py: 1.25 }}>
                    <Typography sx={{ fontWeight: 900, fontSize: 18, lineHeight: 1.1, color: m.color }}>{m.value}</Typography>
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
                          <Typography sx={{ fontWeight: 900, fontSize: 13.5, color: f.key === 'rating' ? ratingColor(stats.rating) : '#FFF', flexShrink: 0 }}>{fmt(stats[f.key], f.suffix)}</Typography>
                        </Stack>
                      ))}
                    </Box>
                  </Box>
                ))
              )}

              {stats.updatedAt && (
                <Paper sx={{ borderRadius: 2.5, p: 1.5, bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, fontSize: 10.5 }}>
                    آخر تحديث: {new Date(stats.updatedAt).toLocaleString('ar-KW')}
                  </Typography>
                </Paper>
              )}
            </>
          )}
        </Stack>
      </DialogContent>

      <Dialog open={ratingEditOpen} onClose={() => setRatingEditOpen(false)} fullWidth maxWidth="xs" dir="rtl">
        <DialogTitle sx={{ fontSize: 16, fontWeight: 900, pb: 0.5 }}>تعديل التقييم</DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          <TextField
            autoFocus
            fullWidth
            type="number"
            inputProps={{ step: '0.1', min: 0, max: 10 }}
            value={ratingEditValue}
            onChange={(e) => setRatingEditValue(e.target.value)}
            placeholder="مثال: 7.3"
          />
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1 }}>
            التقييم الرسمي الحالي من المصدر: {stats?.rating != null ? Math.round(stats.rating * 10) / 10 : '—'}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button size="small" onClick={() => setRatingEditOpen(false)} color="inherit">إلغاء</Button>
          <Button size="small" onClick={handleRatingEditClear} disabled={saving || !player?.ratingOverrides?.[String(season)]} sx={{ color: '#FF5252' }}>
            مسح التقييم المخصص
          </Button>
          <Button size="small" variant="contained" onClick={handleRatingEditSave} disabled={saving} startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <SaveIcon sx={{ fontSize: 16 }} />}>
            حفظ
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={positionEditOpen} onClose={() => setPositionEditOpen(false)} fullWidth maxWidth="xs" dir="rtl">
        <DialogTitle sx={{ fontSize: 16, fontWeight: 900, pb: 0.5 }}>تعديل المركز</DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          <TextField
            select
            fullWidth
            size="small"
            value={positionEditValue}
            onChange={(e) => setPositionEditValue(e.target.value)}
          >
            <MenuItem value="">— بدون تحديد —</MenuItem>
            {SPECIFIC_POSITIONS.map((p) => (
              <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button size="small" onClick={() => setPositionEditOpen(false)} color="inherit">إلغاء</Button>
          <Button size="small" onClick={handlePositionEditClear} disabled={saving || !player?.specificPosition} sx={{ color: '#FF5252' }}>
            مسح المركز المخصص
          </Button>
          <Button size="small" variant="contained" onClick={handlePositionEditSave} disabled={saving} startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <SaveIcon sx={{ fontSize: 16 }} />}>
            حفظ
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  )
}