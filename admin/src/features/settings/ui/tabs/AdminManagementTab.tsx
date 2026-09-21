import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Avatar, Box, Button, Chip, Paper, Skeleton, Stack, TextField, Typography } from '@mui/material'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import ManageSearchIcon from '@mui/icons-material/ManageSearch'
import SearchIcon from '@mui/icons-material/Search'
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1'
import EditIcon from '@mui/icons-material/Edit'
import DeleteForeverIcon from '@mui/icons-material/DeleteForever'
import { useAuth } from '@/features/auth/ui/useAuth'
import { useUsers } from '@/features/user/ui/useUsers'
import AdminPermissionsDialog from '@/features/user/ui/components/AdminPermissionsDialog'
import ConfirmDialog from '@/core/ui/components/ConfirmDialog'
import { fetchAdmins, revokeAdmin, type AdminRecord } from '@/features/user/data/admins.service'
import { permissionLabel } from '@/core/domain/types'
import { teamLabel } from '@/features/user/domain/user.types'
import type { AppUser } from '@/features/user/domain/user.types'

function AdminRow({ admin, reload }: { admin: AdminRecord; reload: () => void }) {
  const { user } = useAuth()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [revoking, setRevoking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isSuperAdmin = admin.role === 'super_admin'
  const isSelf = user?.uid === admin.uid

  const handleRevoke = async () => {
    setRevoking(true)
    setError(null)
    try {
      await revokeAdmin(admin.uid)
      setConfirmOpen(false)
      reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر إبطال الإشراف')
    } finally {
      setRevoking(false)
    }
  }

  return (
    <Paper sx={{ p: 2.5, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
      <Stack spacing={2}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar sx={{ width: 48, height: 48, fontSize: 20, fontWeight: 800, bgcolor: isSuperAdmin ? '#FEBE10' : '#00E676', color: isSuperAdmin ? '#1A1400' : '#062A16' }}>
            {admin.name.trim().charAt(0) || '؟'}
          </Avatar>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={0.75} alignItems="center">
              <Typography sx={{ fontWeight: 800, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {admin.name}
              </Typography>
              <Chip
                label={isSuperAdmin ? 'مدير النظام' : 'مشرف'}
                size="small"
                sx={{ height: 20, fontWeight: 800, fontSize: 10, bgcolor: isSuperAdmin ? 'rgba(254,190,16,0.15)' : 'rgba(0,230,118,0.12)', color: isSuperAdmin ? '#FEBE10' : '#00E676', border: `1px solid ${isSuperAdmin ? 'rgba(254,190,16,0.5)' : 'rgba(0,230,118,0.4)'}` }}
              />
            </Stack>
            <Typography variant="caption" noWrap sx={{ color: 'text.secondary', display: 'block' }}>
              {admin.email || 'بدون بريد إلكتروني'}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            {!isSuperAdmin && !isSelf && (
              <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={() => setDialogOpen(true)} sx={{ borderColor: 'rgba(0,230,118,0.4)', color: '#00E676' }}>
                تعديل
              </Button>
            )}
            {!isSelf && (
              <Button size="small" variant="outlined" color="error" startIcon={<DeleteForeverIcon />} onClick={() => setConfirmOpen(true)} disabled={isSuperAdmin}>
                إلغاء
              </Button>
            )}
          </Stack>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          {isSuperAdmin ? (
            <Chip label="كامل الصلاحيات" size="small" sx={{ fontWeight: 800, fontSize: 11, bgcolor: 'rgba(254,190,16,0.12)', color: '#FEBE10', border: '1px solid rgba(254,190,16,0.4)' }} />
          ) : admin.permissions.length > 0 ? (
            admin.permissions.slice(0, 5).map((p) => (
              <Chip key={p} label={permissionLabel(p)} size="small" sx={{ fontWeight: 700, fontSize: 11, bgcolor: 'rgba(0,87,168,0.15)', color: '#7CB7FF', border: '1px solid rgba(0,87,168,0.45)' }} />
            ))
          ) : (
            <Chip label="بدون صلاحيات" size="small" sx={{ fontWeight: 700, fontSize: 11, bgcolor: 'rgba(255,82,82,0.12)', color: '#FF5252', border: '1px solid rgba(255,82,82,0.4)' }} />
          )}
        </Stack>

        {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}
      </Stack>

      <AdminPermissionsDialog
        open={dialogOpen}
        targetUser={{ uid: admin.uid, name: admin.name, email: admin.email }}
        existing={admin}
        onClose={() => setDialogOpen(false)}
        onSaved={() => {
          setDialogOpen(false)
          reload()
        }}
      />
      <ConfirmDialog
        open={confirmOpen}
        title="إلغاء صلاحية المشرف"
        message={`هل أنت متأكد من إلغاء صلاحية «${admin.name}» للوحة التحكم؟ سيتم إبطال الجلسات فوراً.`}
        confirmLabel="إلغاء الإشراف"
        danger
        loading={revoking}
        onConfirm={handleRevoke}
        onClose={() => setConfirmOpen(false)}
      />
    </Paper>
  )
}

function UserSearchRow({ profile, isAdmin, onPromote }: { profile: AppUser; isAdmin: boolean; onPromote: () => void }) {
  return (
    <Paper sx={{ p: 2, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Avatar src={profile.profilePicture || undefined} sx={{ width: 42, height: 42, fontSize: 17, fontWeight: 800, bgcolor: '#142E3D' }}>
          {profile.name.trim().charAt(0) || '؟'}
        </Avatar>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 800, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile.name}</Typography>
          <Typography variant="caption" noWrap sx={{ color: 'text.secondary', display: 'block' }}>
            {profile.email || 'بدون بريد إلكتروني'} · {teamLabel(profile.favoriteTeam)} · {profile.points} نقطة
          </Typography>
        </Box>
        {isAdmin ? (
          <Chip label="مشرف بالفعل" size="small" sx={{ fontWeight: 800, fontSize: 11, bgcolor: 'rgba(0,230,118,0.1)', color: '#00E676', border: '1px solid rgba(0,230,118,0.35)' }} />
        ) : (
          <Button size="small" variant="contained" startIcon={<PersonAddAlt1Icon />} onClick={onPromote} sx={{ fontWeight: 800, fontSize: 12, flexShrink: 0 }}>
            ترقية
          </Button>
        )}
      </Stack>
    </Paper>
  )
}

export default function AdminManagementTab() {
  const { user } = useAuth()
  const { users, loading: usersLoading } = useUsers()
  const [admins, setAdmins] = useState<AdminRecord[]>([])
  const [loadingAdmins, setLoadingAdmins] = useState(true)
  const [search, setSearch] = useState('')
  const [promoteTarget, setPromoteTarget] = useState<AppUser | null>(null)

  const loadAdmins = useCallback(() => {
    setLoadingAdmins(true)
    fetchAdmins()
      .then(setAdmins)
      .catch(() => setAdmins([]))
      .finally(() => setLoadingAdmins(false))
  }, [])

  useEffect(() => {
    loadAdmins()
  }, [loadAdmins])

  const matchingUsers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return []
    return users.filter((u) => u.name.toLowerCase().includes(q) || (u.email ?? '').toLowerCase().includes(q))
  }, [users, search])

  const adminUids = useMemo(() => new Set(admins.map((a) => a.uid)), [admins])

  return (
    <Stack spacing={3}>
      <Paper sx={{ p: 2.5, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)' }}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <ManageSearchIcon sx={{ color: '#FEBE10' }} />
            <Typography sx={{ fontWeight: 800, fontSize: 15 }}>ترقية مستخدم إلى مشرف</Typography>
          </Stack>
          <TextField
            size="small"
            placeholder="ابحث عن مستخدم بالاسم أو البريد الإلكتروني…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            slotProps={{ input: { startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} /> } }}
          />
          {matchingUsers.length > 0 ? (
            <Stack spacing={1}>
              {matchingUsers
                .filter((u) => u.id !== user?.uid)
                .slice(0, 8)
                .map((u) => (
                  <UserSearchRow key={u.id} profile={u} isAdmin={adminUids.has(u.id)} onPromote={() => setPromoteTarget(u)} />
                ))}
            </Stack>
          ) : search.trim() ? (
            <Typography variant="body2" sx={{ color: 'text.secondary', py: 2, textAlign: 'center' }}>
              {usersLoading ? 'جارٍ تحميل المستخدمين…' : 'لا يوجد مستخدمون مطابقون — جرّب كلمة أخرى.'}
            </Typography>
          ) : (
            <Typography variant="body2" sx={{ color: 'text.secondary', py: 1 }}>
              اكتب الاسم أو البريد لإظهار النتائج ورفع المستخدم إلى مشرف بصلاحيات محددة.
            </Typography>
          )}
        </Stack>
      </Paper>

      <Stack spacing={1.5}>
        <Stack spacing={0.5}>
          <Typography variant="h6" sx={{ fontSize: 17 }}>المشرفون الحاليون ({admins.length})</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: 13 }}>
            إدارة صلاحيات المشرفين أو إلغاء الإشراف. لا يمكنك تعديل حسابك أو إلغاء مشرف النظام.
          </Typography>
        </Stack>

        {loadingAdmins ? (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
            {[0, 1, 2, 3].map((i) => (
              <Paper key={i} sx={{ p: 2.5, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Skeleton variant="circular" width={48} height={48} />
                  <Box sx={{ flexGrow: 1 }}>
                    <Skeleton width="55%" height={22} />
                    <Skeleton width="40%" height={16} />
                  </Box>
                </Stack>
                <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                  <Skeleton width={80} height={24} sx={{ borderRadius: 3 }} />
                  <Skeleton width={90} height={24} sx={{ borderRadius: 3 }} />
                </Stack>
              </Paper>
            ))}
          </Box>
        ) : admins.length === 0 ? (
          <Paper sx={{ p: 6, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', textAlign: 'center' }}>
            <Stack spacing={2} alignItems="center">
              <Box sx={{ width: 84, height: 84, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0, 87, 168, 0.15)', border: '1px solid rgba(0, 87, 168, 0.4)', color: '#FEBE10' }}>
                <AdminPanelSettingsIcon sx={{ fontSize: 44 }} />
              </Box>
              <Typography variant="h5">لا يوجد مشرفون بعد</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 440 }}>
                استخدم البحث بالأعلى لرفع أول مستخدم إلى مشرف.
              </Typography>
            </Stack>
          </Paper>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
            {admins.map((admin) => (
              <AdminRow key={admin.uid} admin={admin} reload={loadAdmins} />
            ))}
          </Box>
        )}
      </Stack>

      <AdminPermissionsDialog
        open={promoteTarget !== null}
        targetUser={promoteTarget ? { uid: promoteTarget.id, name: promoteTarget.name, email: promoteTarget.email ?? '' } : { uid: '', name: '', email: '' }}
        existing={null}
        onClose={() => setPromoteTarget(null)}
        onSaved={() => {
          setPromoteTarget(null)
          loadAdmins()
        }}
      />
    </Stack>
  )
}