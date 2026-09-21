import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Typography,
} from '@mui/material'
import type { AdminPermission } from '@/core/domain/types'
import { ADMIN_PERMISSIONS } from '@/core/domain/types'
import { setAdminRole } from '../../data/admins.service'
import type { AdminRecord } from '../../data/admins.service'

interface AdminPermissionsDialogProps {
  open: boolean
  targetUser: { uid: string; name: string; email: string }
  existing: AdminRecord | null
  onClose: () => void
  onSaved: () => void
}

export default function AdminPermissionsDialog({ open, targetUser, existing, onClose, onSaved }: AdminPermissionsDialogProps) {
  const [selected, setSelected] = useState<Set<AdminPermission>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setSelected(new Set(existing?.permissions ?? []))
      setError(null)
    }
  }, [open, existing])

  const toggle = (permission: AdminPermission) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(permission)) next.delete(permission)
      else next.add(permission)
      return next
    })
  }

  const handleClose = () => {
    if (saving) return
    onClose()
  }

  const submit = async () => {
    if (selected.size === 0) {
      setError('اختر صلاحية واحدة على الأقل')
      return
    }
    setError(null)
    setSaving(true)
    try {
      await setAdminRole({
        uid: targetUser.uid,
        name: targetUser.name,
        email: targetUser.email,
        role: 'admin',
        permissions: [...selected],
      })
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر حفظ الصلاحيات — تأكد من نشر Cloud Function (setAdminRole)')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>{existing ? 'تعديل صلاحيات المشرف' : 'ترقية إلى مشرف'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 700 }}>
            {existing
              ? `تحديث صلاحيات «${targetUser.name}» على لوحة التحكم`
              : `منح «${targetUser.name}» صلاحية الوصول للوحة التحكم مع تحديد ما يمكنه إدارته`}
          </Typography>

          <Box
            sx={{
              borderRadius: 3,
              border: '1px solid rgba(255,255,255,0.12)',
              bgcolor: 'rgba(255,255,255,0.03)',
              p: 1,
            }}
          >
            {ADMIN_PERMISSIONS.map((perm) => (
              <FormControlLabel
                key={perm.value}
                control={<Checkbox size="small" checked={selected.has(perm.value)} onChange={() => toggle(perm.value)} />}
                label={perm.label}
                sx={{ display: 'flex', m: 0.25, px: 1, borderRadius: 2, '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' }, '& .MuiTypography-root': { fontSize: 14, fontWeight: 700 } }}
              />
            ))}
          </Box>

          {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={saving} sx={{ color: 'text.secondary' }}>
          إلغاء
        </Button>
        <Button variant="contained" onClick={submit} disabled={saving} startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}>
          {existing ? 'حفظ التعديلات' : 'ترقية'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
