import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import CardMembershipIcon from '@mui/icons-material/CardMembership'
import AddIcon from '@mui/icons-material/Add'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import DeleteForeverIcon from '@mui/icons-material/DeleteForever'
import EditIcon from '@mui/icons-material/Edit'
import GroupIcon from '@mui/icons-material/Group'
import { fetchMembershipPlans, saveMembershipPlan, deleteMembershipPlan, fetchMembershipSubscribers } from '@/features/settings/data/settings.service'
import type { MembershipPlan, MembershipSubscription, MembershipTier } from '@/features/settings/domain/settings.types'
import { MEMBERSHIP_TIERS, MEMBERSHIP_TIER_COLORS } from '@/features/settings/domain/settings.types'
import ConfirmDialog from '@/core/ui/components/ConfirmDialog'
import { teamLabel } from '@/features/user/domain/user.types'

const TIER_LABELS: Record<MembershipTier, string> = MEMBERSHIP_TIERS.reduce(
  (acc, t) => {
    acc[t.value] = t.label
    return acc
  },
  {} as Record<MembershipTier, string>,
)

interface PlanFormState {
  id: string | null
  name: string
  tier: MembershipTier
  price: string
  currency: string
  durationDays: string
  benefits: string
}

const EMPTY_FORM: PlanFormState = {
  id: null,
  name: '',
  tier: 'bronze',
  price: '0',
  currency: 'KWD',
  durationDays: '30',
  benefits: '',
}

function planToForm(plan: MembershipPlan): PlanFormState {
  return {
    id: plan.id,
    name: plan.name,
    tier: plan.tier,
    price: String(plan.price),
    currency: plan.currency,
    durationDays: String(plan.durationDays),
    benefits: plan.benefits.join('\n'),
  }
}

function subscribeStatusColor(status: MembershipSubscription['status']) {
  if (status === 'active') return '#00E676'
  if (status === 'expired') return '#FFB300'
  return '#FF5252'
}

export default function MembershipPlansTab() {
  const [plans, setPlans] = useState<MembershipPlan[]>([])
  const [subs, setSubs] = useState<MembershipSubscription[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<PlanFormState>(EMPTY_FORM)
  const [deleteTarget, setDeleteTarget] = useState<MembershipPlan | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([fetchMembershipPlans(), fetchMembershipSubscribers()])
      .then(([plansRes, subsRes]) => {
        setPlans(plansRes)
        setSubs(subsRes)
      })
      .catch(() => {
        setError('تعذر تحميل بيانات العضوية')
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = () => {
    setForm(EMPTY_FORM)
    setError(null)
    setDialogOpen(true)
  }

  const openEdit = (plan: MembershipPlan) => {
    setForm(planToForm(plan))
    setError(null)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('أدخل اسم الخطة')
      return
    }
    setError(null)
    setSaving(true)
    try {
      await saveMembershipPlan({
        id: form.id ?? undefined,
        name: form.name.trim(),
        tier: form.tier,
        price: Math.max(0, parseFloat(form.price) || 0),
        currency: form.currency.trim() || 'KWD',
        durationDays: Math.max(1, parseInt(form.durationDays, 10) || 30),
        benefits: form.benefits.split('\n').map((b) => b.trim()).filter(Boolean),
        active: true,
      })
      setDialogOpen(false)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر حفظ الخطة')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (plan: MembershipPlan) => {
    await saveMembershipPlan({ ...plan, active: !plan.active })
    load()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    setError(null)
    try {
      await deleteMembershipPlan(deleteTarget.id)
      setDeleteTarget(null)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر حذف الخطة')
    } finally {
      setDeleting(false)
    }
  }

  const activeSubs = subs.filter(({ status }) => status === 'active')

  return (
    <Stack spacing={3}>
      <Stack spacing={0.5}>
        <Stack direction="row" spacing={1} alignItems="center">
          <CardMembershipIcon sx={{ color: '#FEBE10' }} />
          <Typography variant="h6" sx={{ fontSize: 17, fontWeight: 800 }}>خطط العضوية (Membership Plans)</Typography>
        </Stack>
        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: 13 }}>
          التكوين والإعداد فقط — الدفع يتم تلقائياً عبر التطبيق (Stripe / ميتا بلاتفورم IAP) ويتم تفعيل الاشتراك فوراً.
        </Typography>
      </Stack>

      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Stack direction="row" spacing={1.5} alignItems="center">
          <GroupIcon sx={{ color: '#00E676' }} />
          <Typography sx={{ fontWeight: 800, fontSize: 13 }}>
            مشتركون نشطون: <span style={{ color: '#00E676' }}>{activeSubs.length}</span>
          </Typography>
        </Stack>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate} sx={{ fontWeight: 800 }}>
          إضافة خطة
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}

      {loading ? (
        <Paper sx={{ p: 8, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
          <CircularProgress size={36} sx={{ color: '#FEBE10' }} />
        </Paper>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' }, gap: 2 }}>
          {plans.length === 0 && (
            <Paper sx={{ p: 6, borderRadius: 4, gridColumn: '1 / -1', bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
              <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                لا توجد خطط بعد — أضف خطتك الأولى بالأعلى.
              </Typography>
            </Paper>
          )}
          {plans.map((plan) => {
            const color = MEMBERSHIP_TIER_COLORS[plan.tier]
            return (
              <Paper
                key={plan.id}
                sx={{
                  p: 2.5,
                  borderRadius: 4,
                  bgcolor: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderTop: `3px solid ${color}`,
                  opacity: plan.active ? 1 : 0.55,
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <Stack spacing={1.5} sx={{ flexGrow: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip label={TIER_LABELS[plan.tier]} size="small" sx={{ fontWeight: 800, fontSize: 11, bgcolor: `${color}22`, color, border: `1px solid ${color}55` }} />
                      {!plan.active && (
                        <Chip label="معطلة" size="small" sx={{ fontWeight: 800, fontSize: 11, bgcolor: 'rgba(255,82,82,0.12)', color: '#FF5252', border: '1px solid rgba(255,82,82,0.4)' }} />
                      )}
                    </Stack>
                    <Stack direction="row" spacing={0.5}>
                      <Button size="small" startIcon={<EditIcon />} onClick={() => openEdit(plan)} sx={{ minWidth: 0, color: 'text.secondary' }} />
                      <Button size="small" startIcon={<DeleteForeverIcon />} onClick={() => setDeleteTarget(plan)} sx={{ minWidth: 0, color: '#FF5252' }} />
                      <Switch size="small" checked={plan.active} onChange={() => handleToggleActive(plan)} />
                    </Stack>
                  </Stack>

                  <Typography sx={{ fontWeight: 800, fontSize: 18 }}>{plan.name}</Typography>

                  <Stack direction="row" alignItems="baseline" spacing={1}>
                    <Typography sx={{ fontWeight: 900, fontSize: 26, color }}>
                      {plan.price}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                      {plan.currency} / {plan.durationDays} يوم
                    </Typography>
                  </Stack>

                  {plan.benefits.length > 0 && (
                    <Stack spacing={0.75}>
                      {plan.benefits.map((b) => (
                        <Stack key={b} direction="row" spacing={1} alignItems="center">
                          <CheckCircleIcon sx={{ fontSize: 16, color }} />
                          <Typography variant="body2" sx={{ fontSize: 13, lineHeight: 1.6 }}>{b}</Typography>
                        </Stack>
                      ))}
                    </Stack>
                  )}
                </Stack>
              </Paper>
            )
          })}
        </Box>
      )}

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />

      <Stack spacing={1.5}>
        <Typography sx={{ fontWeight: 800, fontSize: 15 }}>المشتركون ({subs.length})</Typography>
        {subs.length === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            لا توجد اشتراكات بعد — ستظهر هنا تلقائياً عند قيام المستخدمين بالدفع من التطبيق.
          </Typography>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5 }}>
            {subs.slice(0, 12).map((sub) => (
              <Paper key={sub.id} sx={{ p: 2, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
                  <Stack spacing={0.25}>
                    <Typography sx={{ fontWeight: 800, fontSize: 14 }}>{sub.userName}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {sub.planName} · {teamLabel(sub.userTeam)} · حتى {new Date(sub.expiresAt).toLocaleDateString('ar-KW')}
                    </Typography>
                  </Stack>
                  <Chip
                    label={sub.status === 'active' ? 'نشط' : sub.status === 'expired' ? 'منتهي' : 'ملغى'}
                    size="small"
                    sx={{ fontWeight: 800, fontSize: 11, bgcolor: `${subscribeStatusColor(sub.status)}18`, color: subscribeStatusColor(sub.status), border: `1px solid ${subscribeStatusColor(sub.status)}44` }}
                  />
                </Stack>
              </Paper>
            ))}
          </Box>
        )}
      </Stack>

      <Dialog open={dialogOpen} onClose={saving ? undefined : () => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{form.id ? 'تعديل الخطة' : 'إضافة خطة عضوية'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <TextField
              label="اسم الخطة"
              fullWidth
              size="small"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="مثال: برونزي"
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800 }}>المرتبة</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {MEMBERSHIP_TIERS.map((t) => (
                <Chip
                  key={t.value}
                  label={t.label}
                  clickable
                  onClick={() => setForm((f) => ({ ...f, tier: t.value }))}
                  sx={{
                    fontWeight: 800,
                    bgcolor: form.tier === t.value ? `${MEMBERSHIP_TIER_COLORS[t.value]}33` : 'rgba(255,255,255,0.06)',
                    color: form.tier === t.value ? MEMBERSHIP_TIER_COLORS[t.value] : 'text.secondary',
                    border: form.tier === t.value ? `1px solid ${MEMBERSHIP_TIER_COLORS[t.value]}88` : '1px solid rgba(255,255,255,0.12)',
                  }}
                />
              ))}
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField
                label="السعر"
                type="number"
                fullWidth
                size="small"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: 0, step: 0.01 } }}
              />
              <TextField
                label="العملة"
                fullWidth
                size="small"
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="المدة (أيام)"
                type="number"
                fullWidth
                size="small"
                value={form.durationDays}
                onChange={(e) => setForm((f) => ({ ...f, durationDays: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: 1 } }}
              />
            </Stack>
            <TextField
              label="المميزات (سطر لكل ميزة)"
              fullWidth
              multiline
              minRows={3}
              size="small"
              value={form.benefits}
              onChange={(e) => setForm((f) => ({ ...f, benefits: e.target.value }))}
              placeholder={'بدون إعلانات\nشارة مميزة\nأولوية في التصويت'}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={saving} sx={{ color: 'text.secondary' }}>
            إلغاء
          </Button>
          <Button variant="contained" onClick={handleSave} disabled={saving} startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}>
            {form.id ? 'حفظ التعديلات' : 'إضافة الخطة'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="حذف خطة عضوية"
        message={`هل أنت متأكد من حذف خطة «${deleteTarget?.name ?? ''}»؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmLabel="حذف"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </Stack>
  )
}