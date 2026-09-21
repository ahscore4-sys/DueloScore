import { useCallback, useEffect, useState } from 'react'
import { Alert, Box, Button, CircularProgress, Paper, Stack, TextField, Typography } from '@mui/material'
import SaveIcon from '@mui/icons-material/Save'
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium'
import { DEFAULT_TIER_THRESHOLDS, TIER_NAMES, TIER_COLORS } from '@/features/user/domain/user.types'
import { useTierThresholds } from '@/features/user/ui/useUser'
import { saveTierThresholds } from '@/features/settings/data/settings.service'

export default function TierThresholdsTab() {
  const savedThresholds = useTierThresholds()
  const [thresholds, setThresholds] = useState<number[]>(DEFAULT_TIER_THRESHOLDS)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (savedThresholds.length > 0) setThresholds(savedThresholds)
  }, [savedThresholds])

  const updateThreshold = useCallback((index: number, value: string) => {
    const parsed = parseInt(value, 10)
    setThresholds((prev) => {
      const next = [...prev]
      next[index] = isNaN(parsed) ? 0 : Math.max(0, parsed)
      return next
    })
    setSaved(false)
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      await saveTierThresholds(thresholds)
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر حفظ الحدود')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Stack spacing={3}>
      <Stack spacing={0.5}>
        <Stack direction="row" spacing={1} alignItems="center">
          <WorkspacePremiumIcon sx={{ color: '#FEBE10' }} />
          <Typography variant="h6" sx={{ fontSize: 17, fontWeight: 800 }}>حدود المراتب (Tier Thresholds)</Typography>
        </Stack>
        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: 13 }}>
          حدد عدد النقاط المطلوبة لكل مرتبة. يتم تطبيق التغييرات تلقائياً على المستخدمين فور الحفظ.
        </Typography>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))' }, gap: 2 }}>
        {TIER_NAMES.map((name, i) => (
          <Paper
            key={name}
            sx={{
              p: 2.5,
              borderRadius: 4,
              bgcolor: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderTop: `3px solid ${TIER_COLORS[i]}`,
            }}
          >
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Box sx={{ width: 10, height: 10, borderRadius: 5, bgcolor: TIER_COLORS[i] }} />
                <Typography sx={{ fontWeight: 800, fontSize: 14 }}>{name}</Typography>
              </Stack>
              <TextField
                size="small"
                type="number"
                value={thresholds[i] ?? 0}
                onChange={(e) => updateThreshold(i, e.target.value)}
                slotProps={{
                  htmlInput: { min: 0, step: 100 },
                  input: {
                    startAdornment: (
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, whiteSpace: 'nowrap' }}>
                        نقطة
                      </Typography>
                    ),
                  },
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontWeight: 800,
                    fontSize: 16,
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.15)' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: `${TIER_COLORS[i]}55` },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: TIER_COLORS[i], borderWidth: 2 },
                  },
                }}
              />
              {i === 0 && (
                <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.5 }}>
                  هذه هي المرتبة الافتراضية لجميع المستخدمين الجدد.
                </Typography>
              )}
            </Stack>
          </Paper>
        ))}
      </Box>

      {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}
      {saved && (
        <Alert severity="success" sx={{ borderRadius: 2, bgcolor: 'rgba(0,230,118,0.1)', border: '1px solid rgba(0,230,118,0.35)', color: '#00E676' }}>
          تم حفظ حدود المراتب بنجاح — سيتم تطبيقها فوراً على المستخدمين.
        </Alert>
      )}

      <Stack direction="row" spacing={1.5} justifyContent="flex-end">
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
          onClick={handleSave}
          disabled={saving}
          sx={{ fontWeight: 800, px: 4 }}
        >
          حفظ الحدود
        </Button>
      </Stack>

      <Paper sx={{ p: 2.5, borderRadius: 4, bgcolor: 'rgba(254,190,16,0.04)', border: '1px solid rgba(254,190,16,0.25)' }}>
        <Stack spacing={1}>
          <Typography variant="body2" sx={{ fontWeight: 800, color: '#FEBE10', fontSize: 13 }}>كيف تعمل المراتب؟</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
            • المشجع (0-499) — افتراضي لكل المستخدمين الجدد<br />
            • متحمس المدرجات (500+) — يظهر بجانب تعليقاته برونزي<br />
            • نجم الديوانية (1,500+) — لون أزرق مميز<br />
            • قائد الجماهير (3,500+) — ذهبي بارز<br />
            • أسطورة النادي (7,000+) — أعلى مرتبة<br />
            الصلاحيات الإدارية لا تتأثر بالمراتب — تتم عبر صفحة المستخدم أو صفحة المشرفين.
          </Typography>
        </Stack>
      </Paper>
    </Stack>
  )
}