import { useState } from 'react'
import {
  Box, Typography, Stack, Paper, Button, MenuItem, Avatar, Chip, CircularProgress, Alert,
  TextField,
} from '@mui/material'
import TableChartIcon from '@mui/icons-material/TableChart'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import RowingIcon from '@mui/icons-material/Rowing'
import RefreshIcon from '@mui/icons-material/Refresh'
import type { StandingsLeague } from '@/features/match/ui/useStandings'
import ChipIcon from '@/core/ui/components/ChipIcon'

function formatGD(gd: number): string {
  return gd > 0 ? `+${gd}` : `${gd}`
}

function MiniStat({ label, value, highlight }: { label: string; value: number | string; highlight?: string }) {
  return (
    <Box sx={{ textAlign: 'center', width: { xs: 36, md: 42 } }}>
      <Typography sx={{ fontSize: 9, color: 'text.secondary', fontWeight: 700, lineHeight: 1 }}>{label}</Typography>
      <Typography sx={{ fontWeight: 900, fontSize: { xs: 13, md: 15 }, color: highlight ?? '#F4F7FF', fontFamily: '"Cairo", sans-serif', lineHeight: 1.3 }}>
        {value}
      </Typography>
    </Box>
  )
}

function FormBadges({ form }: { form: string | null }) {
  const results = (form ?? '')
    .toUpperCase()
    .split('')
    .filter((ch) => ch === 'W' || ch === 'D' || ch === 'L')
  const items = Array.from({ length: 5 }, (_, i) => results[results.length - 1 - i] ?? null)
  if (items.every((it) => it === null)) {
    return <Typography sx={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, textAlign: 'center' }}>—</Typography>
  }
  return (
    <Box dir="rtl" sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 0.4 }}>
      {items.map((ch, i) => (
        <Box
          key={i}
          sx={{
            width: 20,
            height: 20,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: ch === null ? 'transparent' : `${colorFor(ch)}26`,
            border: ch === null ? '1px dashed rgba(255,255,255,0.22)' : `1px solid ${colorFor(ch)}66`,
            color: ch === null ? 'transparent' : colorFor(ch),
            fontSize: 11,
            fontWeight: 900,
          }}
        >
          {ch === null ? '' : (ch === 'W' ? 'ف' : ch === 'D' ? 'ت' : 'خ')}
        </Box>
      ))}
    </Box>
  )
}

function colorFor(ch: string): string {
  if (ch === 'W') return '#00E676'
  if (ch === 'D') return '#FEBE10'
  return '#FF5252'
}

function LeagueSwitcher({ leagues, value, onChange }: { leagues: StandingsLeague[]; value: string; onChange: (v: string) => void }) {
  return (
    <TextField
      select
      size="small"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      sx={{
        minWidth: 260,
        '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: 'rgba(255,255,255,0.05)' },
      }}
      slotProps={{
        select: {
          renderValue: (sel) => {
            const lg = leagues.find((l) => l.id === sel)
            if (!lg) return <span>اختر البطولة</span>
            return (
              <Stack direction="row" alignItems="center" spacing={1.25}>
                <Box sx={{ width: 28, height: 28, borderRadius: 1.5, bgcolor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                  <Box component="img" src={lg.logo} sx={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center' }} />
                </Box>
                <Stack spacing={0}>
                  <Typography sx={{ fontSize: 13, fontWeight: 800 }}>{lg.competition}</Typography>
                  <Typography sx={{ fontSize: 10, color: 'text.secondary', lineHeight: 1 }}>موسم {lg.season}</Typography>
                </Stack>
              </Stack>
            )
          },
        },
      }}
    >
      {leagues.map((lg) => (
        <MenuItem key={lg.id} value={lg.id} sx={{ gap: 1.5 }}>
          <Box sx={{ width: 30, height: 30, borderRadius: 1.5, bgcolor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
            <Box component="img" src={lg.logo} sx={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center' }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{lg.competition}</Typography>
            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>موسم {lg.season} · {lg.rows.length} فريق</Typography>
          </Box>
        </MenuItem>
      ))}
    </TextField>
  )
}

export default function StandingsTab({ leagues, loading, error, refresh }: {
  leagues: StandingsLeague[]
  loading: boolean
  error: string | null
  refresh: () => void
}) {
  const [selectedId, setSelectedId] = useState<string>('')

  const effectiveId = leagues.some((l) => l.id === selectedId)
    ? selectedId
    : (leagues[0]?.id ?? '')
  const selected = leagues.find((l) => l.id === effectiveId) ?? leagues[0]

  return (
    <Stack spacing={3}>
      {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}

      <Paper sx={{ p: 2, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(14px)' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }} justifyContent="space-between">
          {loading && leagues.length === 0 ? (
            <Stack direction="row" alignItems="center" spacing={1} sx={{ color: 'text.secondary' }}>
              <CircularProgress size={22} sx={{ color: '#0057A8' }} />
              <Typography sx={{ fontWeight: 700 }}>جارٍ جلب جداول الترتيب...</Typography>
            </Stack>
          ) : leagues.length === 0 ? (
            <Typography sx={{ fontWeight: 700, color: 'text.secondary' }}>لا توجد جداول ترتيب متاحة حاليًا</Typography>
          ) : (
            <LeagueSwitcher leagues={leagues} value={effectiveId} onChange={setSelectedId} />
          )}
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Chip
              icon={<ChipIcon bg="rgba(254,190,16,0.25)"><EmojiEventsIcon sx={{ fontSize: 13, color: '#FEBE10' }} /></ChipIcon>}
              label="المتصدّر / بطولة"
              size="small"
              sx={{ bgcolor: 'rgba(254,190,16,0.1)', color: '#FEBE10', fontWeight: 700, pr: 1, '& .MuiChip-icon': { m: 0, mr: 1 } }}
            />
            <Chip
              icon={<ChipIcon bg="rgba(0,87,168,0.4)"><RowingIcon sx={{ fontSize: 13, color: '#90CAF9' }} /></ChipIcon>}
              label="أوروبا"
              size="small"
              sx={{ bgcolor: 'rgba(0,87,168,0.2)', color: '#90CAF9', fontWeight: 700, pr: 1, '& .MuiChip-icon': { m: 0, mr: 1 } }}
            />
          </Stack>
        </Stack>
      </Paper>

      {!loading && leagues.length === 0 ? (
        <Paper sx={{ p: 6, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', textAlign: 'center' }}>
          <Stack spacing={2} alignItems="center">
            <Box sx={{ width: 84, height: 84, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0, 87, 168, 0.15)', border: '1px solid rgba(0, 87, 168, 0.4)', color: '#FEBE10' }}>
              <TableChartIcon sx={{ fontSize: 44 }} />
            </Box>
            <Typography variant="h5">لا توجد جداول ترتيب (No Standings)</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 440 }}>
              لا توجد جداول ترتيب متاحة حاليًا من مزوّد البيانات.
            </Typography>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={refresh} sx={{ gap: 1 }}>إعادة المحاولة</Button>
          </Stack>
        </Paper>
      ) : selected ? (
        <Paper sx={{ overflow: 'hidden', borderRadius: 4, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)' }}>
          <Box
            sx={{
              px: 3,
              py: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              flexWrap: 'wrap',
              background: 'linear-gradient(90deg, rgba(0,87,168,0.25), transparent 70%)',
              borderBottom: '1px solid rgba(0,87,168,0.3)',
            }}
          >
            <Box sx={{ width: 54, height: 54, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#fff', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.3)', p: 0.75 }}>
              <Box component="img" src={selected.logo} sx={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center' }} />
            </Box>
            <Stack spacing={0.25} sx={{ flex: 1 }}>
              <Typography sx={{ fontWeight: 900, fontSize: 17 }}>{selected.competition}</Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>موسم {selected.season} · {selected.rows.length} فريق</Typography>
            </Stack>
            <Chip
              icon={<ChipIcon bg="rgba(254,190,16,0.25)"><EmojiEventsIcon sx={{ fontSize: 13, color: '#FEBE10' }} /></ChipIcon>}
              label={selected.rows.find((r) => r.rank === 1)?.name ?? '—'}
              sx={{ bgcolor: 'rgba(254,190,16,0.12)', color: '#FEBE10', fontWeight: 800, pl: 1, '& .MuiChip-icon': { m: 0, ml: 1 } }}
            />
          </Box>

          <Stack spacing={1.25} sx={{ p: 2.5 }}>
            {selected.rows.map((r) => {
              const rank = r.rank
              const podium = rank <= 3
              const champion = rank === 1
              const euro = rank > 1 && rank <= 4
              const gd = r.goalsDiff
              return (
                <Box
                  key={r.id}
                  sx={{
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    gap: { xs: 1.5, md: 2.5 },
                    p: { xs: 1.5, md: 2 },
                    borderRadius: 3,
                    border: `1px solid ${
                      champion ? 'rgba(254,190,16,0.5)'
                      : podium ? 'rgba(0,87,168,0.4)'
                      : 'rgba(255,255,255,0.09)'
                    }`,
                    bgcolor: champion ? 'rgba(254,190,16,0.07)' : podium ? 'rgba(0,87,168,0.12)' : 'rgba(255,255,255,0.03)',
                    transition: 'all .2s ease',
                    '::before': {
                      content: '""',
                      position: 'absolute',
                      inset: 0,
                      background: `radial-gradient(500px 120px at 95% -40%, ${
                        champion ? 'rgba(254,190,16,0.18)' : podium ? 'rgba(0,87,168,0.2)' : 'rgba(0,87,168,0.1)'
                      }, transparent 60%)`,
                      pointerEvents: 'none',
                    },
                    '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 12px 30px rgba(0,0,0,0.35)' },
                  }}
                >
                  <Box sx={{ width: { xs: 34, md: 44 }, height: { xs: 34, md: 44 }, borderRadius: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 900, fontSize: { xs: 14, md: 17 }, fontFamily: '"Cairo", sans-serif', color: champion ? '#FEBE10' : euro ? '#90CAF9' : 'rgba(244,247,255,0.75)', bgcolor: champion ? 'rgba(254,190,16,0.16)' : euro ? 'rgba(0,87,168,0.32)' : 'rgba(255,255,255,0.06)', border: `1px solid ${champion ? 'rgba(254,190,16,0.55)' : euro ? 'rgba(0,87,168,0.5)' : 'rgba(255,255,255,0.12)'}` }}>
                    {champion ? <EmojiEventsIcon sx={{ fontSize: { xs: 18, md: 22 } }} /> : rank}
                  </Box>

                  <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flex: 1, minWidth: 0 }}>
                    <Avatar src={r.logo} sx={{ width: { xs: 38, md: 46 }, height: { xs: 38, md: 46 }, bgcolor: 'transparent', '& img': { objectFit: 'contain' } }} />
                    <Stack spacing={0.25} sx={{ minWidth: 0 }}>
                      <Typography noWrap sx={{ fontWeight: 800, fontSize: { xs: 14, md: 15 } }}>{r.name}</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {champion && (
                          <Chip size="small" label="المتصدّر" sx={{ height: 20, fontSize: 10, fontWeight: 800, bgcolor: 'rgba(254,190,16,0.14)', color: '#FEBE10', '& .MuiChip-label': { px: 1 } }} />
                        )}
                      </Box>
                    </Stack>
                  </Stack>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, md: 2.5 }, flexShrink: 0, position: 'relative', zIndex: 1, flexWrap: { xs: 'wrap', md: 'nowrap' }, justifyContent: 'center' }}>
                    <Box sx={{ display: 'flex', gap: { xs: 0.75, md: 1.5 }, alignItems: 'center' }}>
                      <MiniStat label="لعب" value={r.played} />
                      <MiniStat label="فوز" value={r.won} highlight="#00E676" />
                      <MiniStat label="تعادل" value={r.drawn} highlight="#FEBE10" />
                      <MiniStat label="خسارة" value={r.lost} highlight="#FF5252" />
                      <MiniStat label="الفرق" value={formatGD(gd)} highlight={gd > 0 ? '#00E676' : gd < 0 ? '#FF5252' : undefined} />
                    </Box>
                    <Box sx={{ textAlign: 'center', px: { xs: 1.25, md: 1.75 }, py: 1, borderRadius: 3, background: champion ? 'rgba(254,190,16,0.15)' : 'rgba(0,87,168,0.2)', border: `1px solid ${champion ? 'rgba(254,190,16,0.5)' : 'rgba(0,87,168,0.4)'}` }}>
                      <Typography sx={{ fontSize: 10, color: 'text.secondary', fontWeight: 700, lineHeight: 1 }}>نقاط</Typography>
                      <Typography sx={{ fontWeight: 900, fontSize: { xs: 20, md: 26 }, color: '#FEBE10', fontFamily: '"Cairo", sans-serif', lineHeight: 1 }}>{r.points}</Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', flexShrink: 0, pl: { xs: 0, md: 1 } }}>
                    <FormBadges form={r.form} />
                  </Box>
                </Box>
              )
            })}
          </Stack>

          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" sx={{ px: 3, py: 1.5, color: 'text.secondary' }}>
            <Chip
              icon={<ChipIcon bg="rgba(254,190,16,0.25)"><EmojiEventsIcon sx={{ fontSize: 13, color: '#FEBE10' }} /></ChipIcon>}
              label="المتصدّر"
              size="small"
              sx={{ bgcolor: 'rgba(254,190,16,0.1)', color: '#FEBE10', fontWeight: 700, pr: 1, '& .MuiChip-icon': { m: 0, mr: 1 } }}
            />
            <Chip
              icon={<ChipIcon bg="rgba(0,87,168,0.4)"><RowingIcon sx={{ fontSize: 13, color: '#90CAF9' }} /></ChipIcon>}
              label="أوروبا (المراكز 2-4)"
              size="small"
              sx={{ bgcolor: 'rgba(0,87,168,0.2)', color: '#90CAF9', fontWeight: 700, pr: 1, '& .MuiChip-icon': { m: 0, mr: 1 } }}
            />
          </Stack>
        </Paper>
      ) : null}
    </Stack>
  )
}
