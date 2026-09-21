import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Box, Stack, Tabs, Tab, Typography, Tooltip } from '@mui/material'
import HistoryIcon from '@mui/icons-material/History'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium'
import CampaignIcon from '@mui/icons-material/Campaign'
import CardMembershipIcon from '@mui/icons-material/CardMembership'
import type { ReactElement } from 'react'
import { useAuth } from '@/features/auth/ui/useAuth'

interface SettingsTab {
  path: string
  label: string
  icon: ReactElement
  superAdminOnly: boolean
}

const SETTINGS_TABS: SettingsTab[] = [
  { path: '/settings/log', label: 'سجل الأنشطة', icon: <HistoryIcon />, superAdminOnly: false },
  { path: '/settings/admins', label: 'إدارة المشرفين', icon: <AdminPanelSettingsIcon />, superAdminOnly: true },
  { path: '/settings/tiers', label: 'حدود المراتب', icon: <WorkspacePremiumIcon />, superAdminOnly: true },
  { path: '/settings/ads', label: 'الإعلانات', icon: <CampaignIcon />, superAdminOnly: true },
  { path: '/settings/membership', label: 'خطط العضوية', icon: <CardMembershipIcon />, superAdminOnly: true },
]

const SUPER_ADMIN_PATHS = SETTINGS_TABS.filter((t) => t.superAdminOnly).map((t) => t.path)

export default function SettingsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isSuperAdmin } = useAuth()

  if (!isSuperAdmin && SUPER_ADMIN_PATHS.includes(location.pathname)) {
    return <Navigate to="/settings/log" replace />
  }

  const visibleTabs = SETTINGS_TABS.filter((t) => !t.superAdminOnly || isSuperAdmin)
  const activeIndex = Math.max(
    0,
    visibleTabs.findIndex((t) => location.pathname === t.path || location.pathname.startsWith(`${t.path}?`)),
  )

  return (
    <Stack spacing={3}>
      <Stack spacing={0.5}>
        <Typography variant="h4">الإعدادات (Settings)</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {isSuperAdmin
            ? 'إدارة المشرفين والمراتب والإعلانات وخطط العضوية وسجل الأنشطة.'
            : 'سجل الأنشطة وكل تحركاتك على لوحة التحكم.'}
        </Typography>
      </Stack>

      <Box sx={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <Tabs
          value={activeIndex}
          onChange={(_, index) => {
            const tab = visibleTabs[index]
            if (tab) navigate(tab.path)
          }}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': { fontWeight: 800, fontSize: 14, minHeight: 46, gap: 1 },
            '& .MuiTabs-indicator': { bgcolor: '#FEBE10' },
          }}
        >
          {visibleTabs.map((tab) => (
            <Tooltip key={tab.path} title={tab.superAdminOnly ? 'مدير النظام فقط' : ''}>
              <Tab
                icon={tab.icon}
                iconPosition="start"
                label={tab.label}
                sx={{ '& .MuiTab-iconWrapper': { ml: 1 } }}
              />
            </Tooltip>
          ))}
        </Tabs>
      </Box>

      <Outlet />
    </Stack>
  )
}