import { useEffect, useState } from 'react'
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  CircularProgress,
  Chip,
  Typography,
  Divider,
  Autocomplete,
  IconButton,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import EditIcon from '@mui/icons-material/Edit'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import MicIcon from '@mui/icons-material/Mic'
import GavelIcon from '@mui/icons-material/Gavel'
import LiveTvIcon from '@mui/icons-material/LiveTv'
import VideocamIcon from '@mui/icons-material/Videocam'
import StadiumIcon from '@mui/icons-material/Stadium'
import GroupsIcon from '@mui/icons-material/Groups'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import { LEAGUE_NAMES, LEAGUE_COLORS } from '@/features/match/domain/match.constants'
import type { CoverageRecord } from '../../domain/coverage.types'
import { REFEREE_ROLES } from '../../domain/coverage.types'
import { useCoverageRecords } from '../useCoverageRecords'
import CoverageMatchClock from './CoverageMatchClock'
import type { CoverageMatch, CoverageReferee } from '../../domain/coverageMatches.types'
import { displayCompetition, displayTeamName, formatDateAr, formatKickoff12, formatSeason, parseSeason } from '../../domain/coverageMatches.types'
import { updateCoverageMatch } from '../../data/coverageMatches.service'

interface Props {
  open: boolean
  match: CoverageMatch | null
  onClose: () => void
}

function SectionHeader({ icon, title, hint }: { icon: React.ReactNode; title: string; hint?: string }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mt: 1.5 }}>
      <Box sx={{ width: 32, height: 32, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(254,190,16,0.12)', border: '1px solid rgba(254,190,16,0.32)', color: '#FEBE10' }}>
        {icon}
      </Box>
      <Stack spacing={0.1}>
        <Typography sx={{ fontWeight: 900, fontSize: 13.5 }}>{title}</Typography>
        {hint && <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 700 }}>{hint}</Typography>}
      </Stack>
    </Stack>
  )
}

function DynamicListField({
  label,
  placeholder,
  options,
  values,
  onChange,
  addLabel,
  helperText,
}: {
  label: string
  placeholder: string
  options: string[]
  values: string[]
  onChange: (v: string[]) => void
  addLabel: string
  helperText?: string
}) {
  const updateAt = (i: number, v: string) => {
    const next = [...values]
    next[i] = v
    onChange(next)
  }
  const removeAt = (i: number) => onChange(values.filter((_, idx) => idx !== i))
  const add = () => onChange([...values, ''])

  return (
    <Stack spacing={1}>
      {values.map((value, i) => (
        <Stack key={i} direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
          <Autocomplete
            freeSolo
            size="small"
            options={options}
            value={value}
            onChange={(_, v) => updateAt(i, (v ?? '').trim())}
            onInputChange={(_, v) => updateAt(i, v)}
            sx={{ flexGrow: 1 }}
            renderInput={(params) => (
              <TextField
                {...params}
                label={value || values.length > 1 ? label : placeholder}
                placeholder={placeholder}
              />
            )}
          />
          <IconButton
            onClick={() => removeAt(i)}
            disabled={values.length <= 1}
            size="small"
            sx={{ color: '#FF8A80', flexShrink: 0, '&:hover': { bgcolor: 'rgba(255,82,82,0.12)' }, '&.Mui-disabled': { color: 'rgba(255,255,255,0.2)' } }}
          >
            <DeleteOutlineIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Stack>
      ))}
      <Button
        startIcon={<AddIcon />}
        onClick={add}
        size="small"
        sx={{
          alignSelf: 'flex-start',
          borderRadius: 10,
          color: '#FEBE10',
          border: '1.5px dashed rgba(254,190,16,0.5)',
          px: 1.5,
          fontWeight: 800,
          bgcolor: 'rgba(254,190,16,0.06)',
          '&:hover': { bgcolor: 'rgba(254,190,16,0.14)', border: '1.5px dashed rgba(254,190,16,0.8)' },
        }}
      >
        {addLabel}
      </Button>
      {helperText && <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 700 }}>{helperText}</Typography>}
    </Stack>
  )
}

export default function CoverageMatchEditDialog({ open, match, onClose }: Props) {
  const { records: channels } = useCoverageRecords('channel')
  const { records: commentators } = useCoverageRecords('commentator')
  const channelNames = (channels as CoverageRecord[]).map((c) => c.name ?? '')
  const commentatorNames = (commentators as CoverageRecord[]).map((c) => c.name ?? '')

  const [homeNameAr, setHomeNameAr] = useState('')
  const [awayNameAr, setAwayNameAr] = useState('')
  const [competitionAr, setCompetitionAr] = useState('')
  const [stadiumAr, setStadiumAr] = useState('')
  const [round, setRound] = useState('')
  const [season, setSeason] = useState('')
  const [matchChannels, setMatchChannels] = useState<string[]>([''])
  const [matchCommentators, setMatchCommentators] = useState<string[]>([''])
  const [matchReferees, setMatchReferees] = useState<CoverageReferee[]>(REFEREE_ROLES.map((r) => ({ role: r.key, name: '' })))
  const [summaryVideoUrl, setSummaryVideoUrl] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open || !match) return
    setHomeNameAr(match.homeNameAr ?? '')
    setAwayNameAr(match.awayNameAr ?? '')
    setCompetitionAr(match.competitionAr ?? '')
    setStadiumAr(match.stadiumAr ?? '')
    setRound(match.round ?? '')
    setSeason(formatSeason(match.season))
    setMatchChannels(match.channels && match.channels.length > 0 ? [...match.channels] : [''])
    setMatchCommentators(match.commentators && match.commentators.length > 0 ? [...match.commentators] : [''])
    setMatchReferees(REFEREE_ROLES.map((r) => {
      const existing = (match.referees ?? []).find((ref) => ref.role === r.key)
      return { role: r.key, name: existing?.name ?? (r.key === 'main' && match.referees && match.referees.length === 1 ? match.referees[0].name : '') }
    }))
    setSummaryVideoUrl(match.summaryVideoUrl ?? '')
  }, [open, match])

  const handleClose = () => {
    if (saving) return
    onClose()
  }

  const handleSave = async () => {
    if (!match) return
    setSaving(true)
    try {
      await updateCoverageMatch(match.id, {
        homeNameAr: homeNameAr.trim(),
        awayNameAr: awayNameAr.trim(),
        competitionAr: competitionAr.trim(),
        stadiumAr: stadiumAr.trim(),
        round: round.trim(),
        season: parseSeason(season),
        channels: matchChannels.map((c) => c.trim()).filter((c) => c !== ''),
        commentators: matchCommentators.map((c) => c.trim()).filter((c) => c !== ''),
        referees: matchReferees.filter((r) => r.name.trim() !== '').map((r) => ({ role: r.role, name: r.name.trim() })),
        summaryVideoUrl: summaryVideoUrl.trim(),
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const leagueColor = match ? (LEAGUE_COLORS[match.competitionId] ?? '#0057A8') : '#0057A8'

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'rgba(14,20,40,0.97)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '28px',
          boxShadow: '0 32px 90px rgba(0,0,0,0.7)',
          backgroundImage: `radial-gradient(420px 160px at 0% 0%, ${leagueColor}20, transparent 60%)`,
        },
      }}
    >
      <DialogTitle sx={{ px: 3, pt: 2.5 }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
          <Stack spacing={0.4}>
            <Typography sx={{ fontFamily: '"Cairo", sans-serif', fontWeight: 900, fontSize: 17 }}>تعديل تفاصيل المباراة</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
              الترجمة العربية والتفاصيل تظهر في تطبيق الهاتف فقط
            </Typography>
          </Stack>
          <IconButton onClick={handleClose} disabled={saving} size="small" sx={{ color: 'text.secondary', '&:hover': { color: '#FEBE10', bgcolor: 'rgba(254,190,16,0.08)' } }}>
            <CloseIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Stack>
        {match && (
          <Box sx={{ position: 'relative', mt: 1.25, borderRadius: 4, overflow: 'hidden', border: `1px solid ${leagueColor}45` }}>
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                background: `
                  radial-gradient(420px 170px at 12% -30%, ${leagueColor}38, transparent 62%),
                  radial-gradient(420px 170px at 88% 130%, ${leagueColor}2E, transparent 62%)`,
                pointerEvents: 'none',
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: 240,
                height: 240,
                transform: 'translate(-50%, -50%)',
                borderRadius: '50%',
                background: match.status === 'in_progress' ? 'radial-gradient(circle, rgba(0,230,118,0.12), transparent 70%)' : 'radial-gradient(circle, rgba(254,190,16,0.1), transparent 70%)',
                filter: 'blur(4px)',
                pointerEvents: 'none',
              }}
            />
            <Box sx={{ position: 'relative', p: 2 }}>
              <Stack direction="row" alignItems="center" justifyContent="center" spacing={1.25} useFlexGap sx={{ mb: 1.5, flexWrap: 'wrap' }}>
                <Chip
                  size="small"
                  icon={<EmojiEventsIcon sx={{ fontSize: 13 }} />}
                  label={LEAGUE_NAMES[match.competitionId] ?? match.competition}
                  sx={{ fontWeight: 800, fontSize: 11, color: '#fff', bgcolor: `${leagueColor}44`, border: `1px solid ${leagueColor}` }}
                />
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                  جولة {match.round || '—'} — {formatDateAr(match.date)} · {formatKickoff12(match.kickoff)}
                </Typography>
              </Stack>

              <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1.5}>
                <Stack spacing={0.75} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ width: 64, height: 64, borderRadius: '50%', p: 1, bgcolor: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.14)', boxShadow: '0 10px 26px rgba(0,0,0,0.5), inset 0 0 16px rgba(254,190,16,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {match.home.logo ? (
                      <Box component="img" src={match.home.logo} alt={match.home.name} sx={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.5))' }} />
                    ) : (
                      <GroupsIcon sx={{ fontSize: 28, color: 'text.secondary' }} />
                    )}
                  </Box>
                  <Typography noWrap sx={{ maxWidth: 130, fontSize: 12.5, fontWeight: 900, textAlign: 'center' }}>{displayTeamName(match, 'home')}</Typography>
                </Stack>

                <Stack alignItems="center" spacing={0.5} sx={{ flexShrink: 0 }}>
                  <Typography sx={{ fontFamily: '"Cairo", sans-serif', fontWeight: 900, fontSize: 30, lineHeight: 1.1, color: match.status === 'in_progress' ? '#00E676' : '#FEBE10', textShadow: match.status === 'in_progress' ? '0 0 22px rgba(0,230,118,0.5)' : '0 0 22px rgba(254,190,16,0.4)' }}>
                    {match.homeScore !== null && match.awayScore !== null ? `${match.homeScore} : ${match.awayScore}` : 'VS'}
                  </Typography>
                  <CoverageMatchClock match={match} size="sm" />
                </Stack>

                <Stack spacing={0.75} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ width: 64, height: 64, borderRadius: '50%', p: 1, bgcolor: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.14)', boxShadow: '0 10px 26px rgba(0,0,0,0.5), inset 0 0 16px rgba(254,190,16,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {match.away.logo ? (
                      <Box component="img" src={match.away.logo} alt={match.away.name} sx={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.5))' }} />
                    ) : (
                      <GroupsIcon sx={{ fontSize: 28, color: 'text.secondary' }} />
                    )}
                  </Box>
                  <Typography noWrap sx={{ maxWidth: 130, fontSize: 12.5, fontWeight: 900, textAlign: 'center' }}>{displayTeamName(match, 'away')}</Typography>
                </Stack>
              </Stack>

              {match.stadium && (
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', textAlign: 'center', mt: 1.25 }}>
                  الملعب (API): {match.stadium}
                </Typography>
              )}
            </Box>
          </Box>
        )}
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {match && (
          <Stack spacing={1.25}>
            <SectionHeader icon={<GroupsIcon sx={{ fontSize: 17 }} />} title="أسماء الفريقين (عربي)" hint="تُستبدل الاسم الإنجليزي في تطبيق الهاتف" />
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.25 }}>
              <TextField
                size="small"
                label={`الاسم العربي — ${match.home.name}`}
                placeholder="الكتابة بالعربية تظهر في التطبيق"
                value={homeNameAr}
                onChange={(e) => setHomeNameAr(e.target.value)}
                fullWidth
              />
              <TextField
                size="small"
                label={`الاسم العربي — ${match.away.name}`}
                placeholder="الكتابة بالعربية تظهر في التطبيق"
                value={awayNameAr}
                onChange={(e) => setAwayNameAr(e.target.value)}
                fullWidth
              />
            </Box>

            <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', my: 0.5 }} />

            <SectionHeader icon={<StadiumIcon sx={{ fontSize: 17 }} />} title="بيانات المباراة والترجمة" hint="الأسماء العربية للعرض + الجولة والموسم تُحفظ كما هي" />
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.25 }}>
              <TextField
                size="small"
                label={`اسم المسابقة (عربي) — ${displayCompetition(match)}`}
                placeholder="مثال: الدوري الإسباني"
                value={competitionAr}
                onChange={(e) => setCompetitionAr(e.target.value)}
                fullWidth
              />
              <TextField
                size="small"
                label="اسم الملعب (عربي)"
                placeholder="مثال: ملعب سانتياغو برنابيو"
                value={stadiumAr}
                onChange={(e) => setStadiumAr(e.target.value)}
                fullWidth
              />
              <TextField
                size="small"
                label="الجولة"
                placeholder="مثال: 14"
                value={round}
                onChange={(e) => setRound(e.target.value)}
                fullWidth
              />
              <TextField
                size="small"
                label="الموسم"
                placeholder="مثال: 2026/27"
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                helperText="بصيغة مثل 2026/27"
                fullWidth
                error={season.trim() !== '' && parseSeason(season) === undefined}
              />
            </Box>

            <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', my: 0.5 }} />

            <SectionHeader icon={<LiveTvIcon sx={{ fontSize: 17 }} />} title="القنوات الناقلة" hint="أضف قناة لكل حقل — تُختار من القنوات المخزنة أو تُكتب مباشرة" />
            <DynamicListField
              label="اسم القناة"
              placeholder="مثال: beIN Sports 1"
              options={channelNames}
              values={matchChannels}
              onChange={setMatchChannels}
              addLabel="إضافة قناة جديدة"
            />

            <SectionHeader icon={<MicIcon sx={{ fontSize: 17 }} />} title="المعلقون" hint="اختياري — أضف معلقاً لكل حقل" />
            <DynamicListField
              label="اسم المعلق"
              placeholder="مثال: عصام الشوالي"
              options={commentatorNames}
              values={matchCommentators}
              onChange={setMatchCommentators}
              addLabel="إضافة معلق جديد"
            />

            <SectionHeader icon={<GavelIcon sx={{ fontSize: 17 }} />} title="الحكام" hint="ستة مراكز تحكيمية ثابتة" />
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.25 }}>
              {REFEREE_ROLES.map((role, i) => (
                <TextField
                  key={role.key}
                  size="small"
                  label={role.label}
                  placeholder="اكتب اسم الحكم"
                  value={matchReferees[i]?.name ?? ''}
                  onChange={(e) => {
                    const next = [...matchReferees]
                    if (!next[i]) next[i] = { role: role.key, name: '' }
                    next[i] = { ...next[i], name: e.target.value }
                    setMatchReferees(next)
                  }}
                  fullWidth
                />
              ))}
            </Box>
            <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 700 }}>
              تُخزَّن أسماء الحكام المملوءة فقط حسب مركزها التحكيمي.
            </Typography>

            <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', my: 0.5 }} />

            <SectionHeader icon={<VideocamIcon sx={{ fontSize: 17 }} />} title="فيديو الملخص" hint="اختياري — يُضاف لاحقاً عند توفره" />
            <TextField
              size="small"
              label="رابط فيديو الملخص"
              placeholder="https://..."
              value={summaryVideoUrl}
              onChange={(e) => setSummaryVideoUrl(e.target.value)}
              fullWidth
              helperText={
                summaryVideoUrl && !/^https?:\/\//i.test(summaryVideoUrl.trim())
                  ? 'يجب أن يبدأ الرابط بـ http:// أو https://'
                  : ' '
              }
              error={Boolean(summaryVideoUrl) && !/^https?:\/\//i.test(summaryVideoUrl.trim())}
            />
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, gap: 1.5 }}>
        <Button onClick={handleClose} disabled={saving} sx={{ color: 'text.secondary', fontWeight: 800 }}>
          إلغاء
        </Button>
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={15} color="inherit" /> : <EditIcon sx={{ fontSize: 16 }} />}
          onClick={handleSave}
          disabled={saving || !match}
          sx={{
            borderRadius: 12,
            background: 'linear-gradient(135deg, #FEBE10, #F6A000)',
            color: '#1A1400',
            fontWeight: 900,
            boxShadow: '0 8px 24px rgba(254,190,16,0.35)',
            '&:hover': { background: 'linear-gradient(135deg, #FFD354, #FEBE10)', color: '#1A1400' },
          }}
        >
          {saving ? 'جارٍ الحفظ…' : 'حفظ تعديلات المباراة'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}