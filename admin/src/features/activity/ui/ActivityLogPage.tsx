import { useCallback, useEffect, useMemo, useState } from 'react'
import { Box, Button, CircularProgress, Paper, Skeleton, Stack, Typography } from '@mui/material'
import HistoryIcon from '@mui/icons-material/History'
import type { ActivityLogEntry, ActivityTargetType } from '../domain/activity.types'
import { useActivityLogs } from './useActivityLogs'
import ActivityFilterBar, { type ActivityFilters } from './components/ActivityFilterBar'
import ActivityLogCard from './components/ActivityLogCard'
import { fetchLogAdmins, type LogAdminRef } from '../data/activity.service'
import { useAuth } from '@/features/auth/ui/useAuth'

const EMPTY_FILTERS: ActivityFilters = {
  adminId: null,
  targetType: null,
  from: null,
  to: null,
  search: '',
}

export default function ActivityLogPage({ showHeader = true }: { showHeader?: boolean }) {
  const { user, adminDoc, isSuperAdmin } = useAuth()
  const ownAdminId = user?.uid ?? ''

  const [filters, setFilters] = useState<ActivityFilters>(EMPTY_FILTERS)
  const [admins, setAdmins] = useState<LogAdminRef[]>([])

  useEffect(() => {
    if (!isSuperAdmin) return
    let cancelled = false
    fetchLogAdmins()
      .then((list) => {
        if (!cancelled) setAdmins(list)
      })
      .catch(() => {
        if (!cancelled) setAdmins([])
      })
    return () => {
      cancelled = true
    }
  }, [isSuperAdmin])

  const { entries, loading, loadingMore, hasMore, loadMore } = useActivityLogs({
    ownAdminId,
    isSuperAdmin,
    adminId: filters.adminId,
    targetType: filters.targetType,
    from: filters.from,
    to: filters.to,
  })

  const visibleEntries = useMemo(() => {
    const q = filters.search.trim()
    if (!q) return entries
    const needle = q.toLowerCase()
    return entries.filter(
      (e) =>
        e.targetLabel.toLowerCase().includes(needle) ||
        e.adminName.toLowerCase().includes(needle) ||
        JSON.stringify(e.details ?? {}).toLowerCase().includes(needle),
    )
  }, [entries, filters.search])

  const handleAdminChange = useCallback((adminId: string | null) => setFilters((f) => ({ ...f, adminId })), [])
  const handleTargetTypeChange = useCallback(
    (targetType: ActivityTargetType | null) => setFilters((f) => ({ ...f, targetType })),
    [],
  )
  const handleFromChange = useCallback((from: number | null) => setFilters((f) => ({ ...f, from })), [])
  const handleToChange = useCallback((to: number | null) => setFilters((f) => ({ ...f, to })), [])
  const handleSearchChange = useCallback((search: string) => setFilters((f) => ({ ...f, search })), [])
  const handleReset = useCallback(() => setFilters(EMPTY_FILTERS), [])

  const scopeLabel = isSuperAdmin && filters.adminId ? admins.find((a) => a.adminId === filters.adminId)?.adminName : adminDoc?.name

  return (
    <Stack spacing={3}>
      {showHeader && (
        <Stack spacing={0.5}>
          <Typography variant="h4">سجل الأنشطة (Activity Log)</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {isSuperAdmin ? 'جميع تحركات المديرين مسجلة — تصفح الأنشطة حسب المدير أو النوع.' : 'كل تحركاتك مسجلة بشفافية في النظام.'}
          </Typography>
        </Stack>
      )}

      <ActivityFilterBar
        isSuperAdmin={isSuperAdmin}
        admins={admins}
        filters={filters}
        onAdminChange={handleAdminChange}
        onTargetTypeChange={handleTargetTypeChange}
        onFromChange={handleFromChange}
        onToChange={handleToChange}
        onSearchChange={handleSearchChange}
        onReset={handleReset}
      />

      {isSuperAdmin && filters.adminId && (
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
          عرض سجل المدير: {scopeLabel ?? '—'}
        </Typography>
      )}

      {loading ? (
        <Stack spacing={1.5}>
          {[0, 1, 2, 3].map((i) => (
            <Paper key={i} sx={{ p: 2, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Skeleton variant="circular" width={38} height={38} />
                <Box sx={{ flexGrow: 1 }}>
                  <Skeleton width="40%" height={22} />
                  <Skeleton width="55%" height={16} />
                </Box>
              </Stack>
            </Paper>
          ))}
        </Stack>
      ) : visibleEntries.length === 0 ? (
        <Paper sx={{ p: 6, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', textAlign: 'center' }}>
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
              <HistoryIcon sx={{ fontSize: 44 }} />
            </Box>
            <Typography variant="h5">لا توجد أنشطة بعد</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 440 }}>
              ستظهر هنا جميع تحركاتك في النظام فور قيامك بأي إجراء.
            </Typography>
          </Stack>
        </Paper>
      ) : (
        <Stack spacing={1.5}>
          {visibleEntries.map((entry: ActivityLogEntry) => (
            <ActivityLogCard key={entry.id} entry={entry} />
          ))}

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
        </Stack>
      )}
    </Stack>
  )
}