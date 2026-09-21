import { useMemo, useState } from 'react'
import { Box, Button, Chip, CircularProgress, Paper, Skeleton, Stack, TextField, Typography } from '@mui/material'
import PeopleIcon from '@mui/icons-material/People'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import SearchIcon from '@mui/icons-material/Search'
import ChipSelector from '@/core/ui/components/ChipSelector'
import type { AdminPermission } from '@/core/domain/types'
import { ADMIN_PERMISSIONS } from '@/core/domain/types'
import type { FavoriteTeam } from '../domain/user.types'
import { DEFAULT_TIER_THRESHOLDS, teamColor } from '../domain/user.types'
import { useUsers } from './useUsers'
import { useTierThresholds } from './useUser'
import { useAdminsWithProfiles } from './useAdminsWithProfiles'
import UserCard from './components/UserCard'
import AdminCard from './components/AdminCard'

type UsersView = 'users' | 'admins'
type AdminRoleFilter = 'admin' | 'super_admin'

const TEAM_FILTERS: { value: FavoriteTeam; label: string }[] = [
  { value: 'barcelona', label: 'برشلونة' },
  { value: 'realmadrid', label: 'ريال مدريد' },
]

const ROLE_FILTERS: { value: AdminRoleFilter; label: string }[] = [
  { value: 'admin', label: 'مشرف' },
  { value: 'super_admin', label: 'مدير نظام' },
]

const VIEWS: { value: UsersView; label: string; icon: typeof PeopleIcon }[] = [
  { value: 'users', label: 'المستخدمون', icon: PeopleIcon },
  { value: 'admins', label: 'المدراء', icon: AdminPanelSettingsIcon },
]

export default function UsersListPage() {
  const { users, loading, loadingMore, hasMore, loadMore } = useUsers()
  const { admins, loading: loadingAdmins } = useAdminsWithProfiles()
  const thresholdsLoaded = useTierThresholds()
  const [view, setView] = useState<UsersView>('users')

  const [search, setSearch] = useState('')
  const [team, setTeam] = useState<FavoriteTeam | null>(null)
  const [minPoints, setMinPoints] = useState('')

  const [adminSearch, setAdminSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<AdminRoleFilter | null>(null)
  const [permissionFilter, setPermissionFilter] = useState<AdminPermission | null>(null)

  const thresholds = thresholdsLoaded.length > 0 ? thresholdsLoaded : DEFAULT_TIER_THRESHOLDS

  const adminsMap = useMemo(() => new Map(admins.map((a) => [a.admin.uid, a.admin])), [admins])

  const visibleUsers = useMemo(() => {
    const q = search.trim()
    const min = Number(minPoints) || 0
    return users.filter((u) => {
      if (team && u.favoriteTeam !== team) return false
      if (min > 0 && u.points < min) return false
      if (!q) return true
      return u.name.includes(q) || (u.email ?? '').includes(q)
    })
  }, [users, search, team, minPoints])

  const visibleAdmins = useMemo(() => {
    const q = adminSearch.trim()
    return admins.filter(({ admin }) => {
      if (roleFilter && admin.role !== roleFilter) return false
      if (permissionFilter && admin.role !== 'super_admin' && !admin.permissions.includes(permissionFilter)) {
        return false
      }
      if (!q) return true
      return admin.name.includes(q) || admin.email.includes(q)
    })
  }, [admins, adminSearch, roleFilter, permissionFilter])

  const renderSkeletons = () => (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' }, gap: 2 }}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Paper key={i} sx={{ p: 2.5, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Skeleton variant="circular" width={52} height={52} />
            <Box sx={{ flexGrow: 1 }}>
              <Skeleton width="55%" height={24} />
              <Skeleton width="40%" height={18} />
            </Box>
            <Skeleton width={64} height={24} />
          </Stack>
          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Skeleton width={80} height={24} sx={{ borderRadius: 3 }} />
            <Skeleton width={90} height={24} sx={{ borderRadius: 3 }} />
          </Stack>
        </Paper>
      ))}
    </Box>
  )

  return (
    <Stack spacing={3}>
      <Stack spacing={0.5}>
        <Typography variant="h4">المستخدمون (Users)</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          إدارة مشجعي الفريقين، النقاط، والمراتب
        </Typography>
      </Stack>

      <Box
        sx={{
          display: 'inline-flex',
          alignSelf: 'center',
          p: 0.5,
          borderRadius: 3,
          bgcolor: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.12)',
          gap: 0.5,
        }}
      >
        {VIEWS.map((v) => {
          const active = view === v.value
          const Icon = v.icon
          return (
            <Button
              key={v.value}
              size="small"
              onClick={() => setView(v.value)}
              startIcon={<Icon sx={{ fontSize: 18 }} />}
              sx={{
                borderRadius: 2,
                px: 3,
                py: 0.75,
                fontWeight: 800,
                fontSize: 13,
                color: active ? '#fff' : 'text.secondary',
                bgcolor: active ? 'rgba(0,87,168,0.6)' : 'transparent',
                border: active ? '1px solid rgba(0,87,168,0.9)' : '1px solid transparent',
                '&:hover': { bgcolor: active ? 'rgba(0,87,168,0.7)' : 'rgba(255,255,255,0.06)' },
              }}
            >
              {v.label}
            </Button>
          )
        })}
      </Box>

      <Paper
        sx={{
          p: 2,
          borderRadius: 3,
          bgcolor: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.12)',
          backdropFilter: 'blur(14px)',
        }}
      >
        <Stack spacing={2}>
          {view === 'users' ? (
            <>
              <TextField
                size="small"
                placeholder="بحث بالاسم أو البريد الإلكتروني…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                slotProps={{ input: { startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} /> } }}
              />
              <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap alignItems="center">
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography sx={{ fontWeight: 800, fontSize: 13, color: 'text.secondary' }}>الفريق</Typography>
                  <Chip
                    label="الكل"
                    clickable
                    onClick={() => setTeam(null)}
                    sx={{
                      fontWeight: 800,
                      fontSize: 12,
                      bgcolor: team === null ? 'rgba(0,87,168,0.35)' : 'rgba(255,255,255,0.06)',
                      color: team === null ? '#fff' : 'text.secondary',
                      border: team === null ? '1px solid rgba(0,87,168,0.7)' : '1px solid rgba(255,255,255,0.12)',
                    }}
                  />
                  {TEAM_FILTERS.map((opt) => {
                    const active = team === opt.value
                    return (
                      <Chip
                        key={opt.value}
                        label={opt.label}
                        clickable
                        onClick={() => setTeam(opt.value)}
                        sx={{
                          fontWeight: 800,
                          fontSize: 12,
                          bgcolor: active ? `${teamColor(opt.value)}55` : 'rgba(255,255,255,0.06)',
                          color: active ? '#fff' : 'text.secondary',
                          border: `1px solid ${active ? teamColor(opt.value) : 'rgba(255,255,255,0.12)'}`,
                        }}
                      />
                    )
                  })}
                </Stack>
                <TextField
                  size="small"
                  type="number"
                  label="أقل عدد نقاط"
                  placeholder="0"
                  value={minPoints}
                  onChange={(e) => setMinPoints(e.target.value)}
                  sx={{
                    width: 150,
                    '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': {
                      WebkitAppearance: 'none',
                      margin: 0,
                    },
                    '& input[type=number]': {
                      MozAppearance: 'textfield',
                    },
                  }}
                />
              </Stack>
            </>
          ) : (
            <>
              <TextField
                size="small"
                placeholder="بحث بالاسم أو البريد الإلكتروني…"
                value={adminSearch}
                onChange={(e) => setAdminSearch(e.target.value)}
                slotProps={{ input: { startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} /> } }}
              />
              <Stack direction="row" spacing={4} flexWrap="wrap" useFlexGap alignItems="flex-start">
                <ChipSelector<AdminRoleFilter> label="الدور" options={ROLE_FILTERS} value={roleFilter} onChange={setRoleFilter} allowEmpty />
                <ChipSelector<AdminPermission> label="الصلاحية" options={ADMIN_PERMISSIONS} value={permissionFilter} onChange={setPermissionFilter} allowEmpty />
              </Stack>
            </>
          )}
        </Stack>
      </Paper>

      {view === 'users' ? (
        loading ? (
          renderSkeletons()
        ) : visibleUsers.length === 0 ? (
          <Paper
            sx={{
              p: 6,
              borderRadius: 4,
              bgcolor: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.12)',
              textAlign: 'center',
            }}
          >
            <Stack spacing={2} alignItems="center">
              <Box
                sx={{
                  width: 84,
                  height: 84,
                  borderRadius: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'rgba(0, 87, 168, 0.15)',
                  border: '1px solid rgba(0, 87, 168, 0.4)',
                  color: '#FEBE10',
                }}
              >
                <PeopleIcon sx={{ fontSize: 44 }} />
              </Box>
              <Typography variant="h5">لا يوجد مستخدمون بعد</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 440 }}>
                سيظهر هنا كل مشجع ينضم عبر تطبيق DueloScore مع نقاطه ومرتبته.
              </Typography>
            </Stack>
          </Paper>
        ) : (
          <>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' }, gap: 2 }}>
              {visibleUsers.map((user) => (
                <UserCard key={user.id} user={user} thresholds={thresholds} adminRecord={adminsMap.get(user.id) ?? null} />
              ))}
            </Box>
            {hasMore && (
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <Button
                  variant="outlined"
                  onClick={loadMore}
                  disabled={loadingMore}
                  startIcon={loadingMore ? <CircularProgress size={16} /> : undefined}
                  sx={{ px: 4, borderColor: 'rgba(254,190,16,0.5)', color: '#FEBE10', '&:hover': { borderColor: '#FEBE10', bgcolor: 'rgba(254,190,16,0.08)' } }}
                >
                  {loadingMore ? 'جارٍ التحميل…' : 'تحميل المزيد'}
                </Button>
              </Box>
            )}
          </>
        )
      ) : loadingAdmins ? (
        renderSkeletons()
      ) : visibleAdmins.length === 0 ? (
        <Paper
          sx={{
            p: 6,
            borderRadius: 4,
            bgcolor: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.12)',
            textAlign: 'center',
          }}
        >
          <Stack spacing={2} alignItems="center">
            <Box
              sx={{
                width: 84,
                height: 84,
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'rgba(254, 190, 16, 0.1)',
                border: '1px solid rgba(254, 190, 16, 0.4)',
                color: '#FEBE10',
              }}
            >
              <AdminPanelSettingsIcon sx={{ fontSize: 44 }} />
            </Box>
            <Typography variant="h5">لا يوجد مدراء بعد</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 440 }}>
              يمكن للمدير العام ترقية أي مستخدم إلى مشرف بصلاحيات محددة من صفحة المستخدم.
            </Typography>
          </Stack>
        </Paper>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' }, gap: 2 }}>
          {visibleAdmins.map(({ admin, profile }) =>
            profile ? (
              <UserCard key={admin.uid} user={profile} thresholds={thresholds} adminRecord={admin} />
            ) : (
              <AdminCard key={admin.uid} admin={admin} />
            ),
          )}
        </Box>
      )}
    </Stack>
  )
}