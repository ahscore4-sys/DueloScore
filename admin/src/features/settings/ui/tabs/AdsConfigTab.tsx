import { useEffect, useState } from 'react'
import { Alert, Box, Button, Chip, CircularProgress, Paper, Stack, Switch, TextField, Typography } from '@mui/material'
import CampaignIcon from '@mui/icons-material/Campaign'
import SaveIcon from '@mui/icons-material/Save'
import { fetchAdConfig, saveAdConfig } from '@/features/settings/data/settings.service'
import type { AdConfig } from '@/features/settings/domain/settings.types'
import { BANNER_POSITIONS, DEFAULT_AD_CONFIG } from '@/features/settings/domain/settings.types'

export default function AdsConfigTab() {
  const [config, setConfig] = useState<AdConfig>(DEFAULT_AD_CONFIG)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchAdConfig().then((c) => {
      if (!cancelled) setConfig(c)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const setPartial = (patch: Partial<AdConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }))
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      await saveAdConfig(config)
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر حفظ إعدادات الإعلانات')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Paper sx={{ p: 8, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
        <CircularProgress size={36} sx={{ color: '#FEBE10' }} />
      </Paper>
    )
  }

  return (
    <Stack spacing={3}>
      <Stack spacing={0.5}>
        <Stack direction="row" spacing={1} alignItems="center">
          <CampaignIcon sx={{ color: '#FEBE10' }} />
          <Typography variant="h6" sx={{ fontSize: 17, fontWeight: 800 }}>إعدادات الإعلانات (Ads Configuration)</Typography>
        </Stack>
        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: 13 }}>
          الإعدادات تُطبّق على تطبيق الموبايل. لا يوجد هنا محتوى إعلاني — فقط تكوين أماكن العرض ووحدات AdMob.
        </Typography>
      </Stack>

      <Paper sx={{ p: 2.5, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <Stack spacing={2.5}>
          <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box sx={{ width: 44, height: 44, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: config.enabled ? 'rgba(0,230,118,0.12)' : 'rgba(255,255,255,0.06)', border: `1px solid ${config.enabled ? 'rgba(0,230,118,0.4)' : 'rgba(255,255,255,0.1)'}` }}>
                <CampaignIcon sx={{ color: config.enabled ? '#00E676' : 'text.secondary' }} />
              </Box>
              <Stack spacing={0.25}>
                <Typography sx={{ fontWeight: 800, fontSize: 14 }}>تفعيل الإعلانات</Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {config.enabled ? 'الإعلانات معروضة حاليًا في التطبيق' : 'الإعلانات معطلة — سيتم إخفاؤها من التطبيق'}
                </Typography>
              </Stack>
            </Stack>
            <Switch
              checked={config.enabled}
              onChange={(e) => setPartial({ enabled: e.target.checked })}
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': { color: '#00E676' },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#00E676' },
              }}
            />
          </Stack>

          <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
            <Stack spacing={0.25}>
              <Typography sx={{ fontWeight: 800, fontSize: 14 }}>وضع الاختبار (Test Mode)</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                استخدم إعلانات تجريبية أثناء التطوير قبل الإطلاق الفعلي.
              </Typography>
            </Stack>
            <Switch
              checked={config.testMode}
              onChange={(e) => setPartial({ testMode: e.target.checked })}
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': { color: '#FEBE10' },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#FEBE10' },
              }}
            />
          </Stack>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2.5, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <Stack spacing={2.5}>
          <Typography sx={{ fontWeight: 800, fontSize: 15 }}>وحدات AdMob</Typography>
          <TextField
            label="معرّف وحدة Android"
            fullWidth
            size="small"
            value={config.adUnitIdAndroid}
            onChange={(e) => setPartial({ adUnitIdAndroid: e.target.value })}
            placeholder="ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYYYYYYYY"
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="معرّف وحدة iOS"
            fullWidth
            size="small"
            value={config.adUnitIdIos}
            onChange={(e) => setPartial({ adUnitIdIos: e.target.value })}
            placeholder="ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYYYYYYYY"
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="حد عرض الإعلانات (مرة لكل استخدام)"
            type="number"
            fullWidth
            size="small"
            value={config.frequencyCap}
            onChange={(e) => setPartial({ frequencyCap: Math.max(0, parseInt(e.target.value, 10) || 0) })}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: 0 } }}
          />
        </Stack>
      </Paper>

      <Paper sx={{ p: 2.5, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <Stack spacing={1.5}>
          <Typography sx={{ fontWeight: 800, fontSize: 15 }}>موضع البانر</Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {BANNER_POSITIONS.map((pos) => (
              <Chip
                key={pos.value}
                label={pos.label}
                clickable
                onClick={() => setPartial({ bannerPosition: pos.value })}
                sx={{
                  fontWeight: 800,
                  bgcolor: config.bannerPosition === pos.value ? 'rgba(0,87,168,0.35)' : 'rgba(255,255,255,0.06)',
                  color: config.bannerPosition === pos.value ? '#fff' : 'text.secondary',
                  border: config.bannerPosition === pos.value ? '1px solid rgba(0,87,168,0.7)' : '1px solid rgba(255,255,255,0.12)',
                }}
              />
            ))}
          </Stack>
        </Stack>
      </Paper>

      {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}
      {saved && (
        <Alert severity="success" sx={{ borderRadius: 2, bgcolor: 'rgba(0,230,118,0.1)', border: '1px solid rgba(0,230,118,0.35)', color: '#00E676' }}>
          تم حفظ إعدادات الإعلانات بنجاح.
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
          حفظ الإعدادات
        </Button>
      </Stack>
    </Stack>
  )
}