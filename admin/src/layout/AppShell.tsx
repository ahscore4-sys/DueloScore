import { Box, Typography, Stack, Divider, IconButton, Avatar, Tooltip, Menu, MenuItem } from '@mui/material'
import DashboardIcon from '@mui/icons-material/Dashboard'
import SportsIcon from '@mui/icons-material/Sports'
import GroupsIcon from '@mui/icons-material/Groups'
import ArticleIcon from '@mui/icons-material/Article'
import ForumIcon from '@mui/icons-material/Forum'
import PeopleIcon from '@mui/icons-material/People'
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone'
import QuizIcon from '@mui/icons-material/Quiz'
import SettingsIcon from '@mui/icons-material/Settings'
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver'
import TvIcon from '@mui/icons-material/Tv'
import StadiumIcon from '@mui/icons-material/Stadium'
import LocalPoliceIcon from '@mui/icons-material/LocalPolice'
import LiveTvIcon from '@mui/icons-material/LiveTv'
import ScoreboardIcon from '@mui/icons-material/Scoreboard'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useState, type ReactNode } from 'react'
import type { AdminPermission } from '@/core/domain/types'
import LogoMark from '@/core/ui/components/LogoMark'
import { useAuth } from '@/features/auth/ui/useAuth'

interface NavItem {
  to: string
  label: string
  icon: ReactNode
  permission?: AdminPermission
  superAdminOnly?: boolean
}

interface NavPopup {
  kind: 'popup'
  label: string
  icon: ReactNode
  permission?: AdminPermission
  superAdminOnly?: boolean
}

type NavEntry = NavItem | NavPopup

const mainNav: NavEntry[] = [
  { to: '/', label: 'الرئيسية', icon: <DashboardIcon /> },
  { to: '/matches', label: 'المباريات', icon: <SportsIcon />, permission: 'matches' },
  { to: '/players', label: 'فِرَق البطولات', icon: <GroupsIcon />, permission: 'players' },
  { kind: 'popup', label: 'التغطية', icon: <LiveTvIcon />, permission: 'coverage' },
  { to: '/news', label: 'الأخبار', icon: <ArticleIcon />, permission: 'news' },
  { to: '/diwaniya', label: 'الديوانية', icon: <ForumIcon />, permission: 'diwaniya' },
  { to: '/challenges', label: 'تحدي اليوم', icon: <QuizIcon />, permission: 'challenges' },
  { kind: 'popup', label: 'المستخدمون', icon: <PeopleIcon />, permission: 'users' },
  { to: '/settings', label: 'الإعدادات', icon: <SettingsIcon />, superAdminOnly: true },
]

const usersNav: NavItem[] = [
  { to: '/users', label: 'المستخدمون', icon: <PeopleIcon />, permission: 'users' },
  { to: '/notifications', label: 'الإشعارات', icon: <NotificationsNoneIcon />, permission: 'notifications' },
]

const coverageNav: NavItem[] = [
  { to: '/coverage/matches', label: 'مباريات التغطية', icon: <ScoreboardIcon /> },
  { to: '/commentators', label: 'المعلقون', icon: <RecordVoiceOverIcon /> },
  { to: '/referees', label: 'الحكام', icon: <LocalPoliceIcon /> },
  { to: '/channels', label: 'القنوات الناقلة', icon: <TvIcon /> },
  { to: '/stadiums', label: 'الملاعب', icon: <StadiumIcon /> },
]

function isNavVisible(
  item: NavEntry,
  hasPermission: (permission: AdminPermission) => boolean,
  isSuperAdmin: boolean,
): boolean {
  if (item.superAdminOnly) return isSuperAdmin
  if (item.permission) return hasPermission(item.permission)
  return true
}

export default function AppShell() {
  const [collapsed, setCollapsed] = useState(false)
  const [coverageAnchor, setCoverageAnchor] = useState<HTMLElement | null>(null)
  const [usersAnchor, setUsersAnchor] = useState<HTMLElement | null>(null)
  const location = useLocation()
  const { adminDoc, hasPermission, isSuperAdmin } = useAuth()
  const coverageActive = coverageNav.some((item) => location.pathname.startsWith(item.to))
  const visibleUsersNav = usersNav.filter((item) => isNavVisible(item, hasPermission, isSuperAdmin))
  const usersActive = visibleUsersNav.some((item) => location.pathname.startsWith(item.to))
  const visibleNav = mainNav.filter((item) => {
    if ('kind' in item && item.label === 'المستخدمون') {
      return hasPermission('users') || hasPermission('notifications')
    }
    return isNavVisible(item, hasPermission, isSuperAdmin)
  })

  const displayName = adminDoc?.name ?? 'مدير النظام'
  const roleLabel = adminDoc?.role === 'super_admin' ? 'مدير النظام العام' : 'مدير النظام'
  const initials = displayName.charAt(0)

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Box
        component="aside"
        sx={{
          width: collapsed ? 76 : 260,
          flexShrink: 0,
          borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(255, 255, 255, 0.02)',
          backdropFilter: 'blur(14px)',
          p: collapsed ? 1 : 2.5,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflowX: 'hidden',
          transition: 'width 0.2s ease, padding 0.2s ease',
        }}
      >
        {!collapsed ? (
          <Stack direction="row" alignItems="center" sx={{ px: 1, py: 1.5 }}>
            <Box sx={{ flexGrow: 1 }} />
            <NavLink to="/" aria-label="الرئيسية (Dashboard)" style={{ textDecoration: 'none', lineHeight: 0, borderRadius: 18 }}>
              <LogoMark size={76} />
            </NavLink>
            <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'flex-end' }}>
              <Tooltip title="طي الشريط الجانبي" placement="left">
                <IconButton
                  size="small"
                  onClick={() => setCollapsed(true)}
                  sx={{ color: 'text.secondary', border: '1px solid rgba(255,255,255,0.15)', bgcolor: 'rgba(255,255,255,0.04)' }}
                >
                  <ChevronLeftIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Stack>
        ) : (
          <Stack spacing={1} alignItems="center" sx={{ py: 1.5 }}>
            <NavLink to="/" aria-label="الرئيسية (Dashboard)" style={{ textDecoration: 'none', lineHeight: 0, borderRadius: 16 }}>
              <LogoMark size={64} />
            </NavLink>
            <Tooltip title="توسيع الشريط الجانبي" placement="left">
              <IconButton
                size="small"
                onClick={() => setCollapsed(false)}
                sx={{ color: 'text.secondary', border: '1px solid rgba(255,255,255,0.15)', bgcolor: 'rgba(255,255,255,0.04)' }}
              >
                <ChevronRightIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        )}

        <Divider sx={{ my: 1 }} />

        <Stack spacing={0.5}>
          {visibleNav.map((item) => {
            if ('kind' in item) {
              const isUsers = item.label === 'المستخدمون'
              const active = isUsers ? usersActive : coverageActive
              const onClick = (e: React.MouseEvent<HTMLElement>) => {
                if (isUsers) setUsersAnchor(e.currentTarget)
                else setCoverageAnchor(e.currentTarget)
              }
              return (
                <Tooltip key={item.label} title={item.label} placement="left" disableHoverListener={!collapsed}>
                  <Box
                    onClick={onClick}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      gap: 1.5,
                      px: collapsed ? 0 : 1.5,
                      py: 1.1,
                      borderRadius: 2,
                      cursor: 'pointer',
                      color: active ? '#fff' : 'text.secondary',
                      bgcolor: active ? 'rgba(0, 87, 168, 0.35)' : 'transparent',
                      borderRight: active ? '3px solid #FEBE10' : '3px solid transparent',
                      '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.06)' },
                    }}
                  >
                    <Box sx={{ flexShrink: 0 }}>{item.icon}</Box>
                    {!collapsed && (
                      <Typography sx={{ fontWeight: active ? 700 : 400, fontSize: 14, whiteSpace: 'nowrap', flexGrow: 1 }}>
                        {item.label}
                      </Typography>
                    )}
                    {!collapsed && <KeyboardArrowDownIcon sx={{ fontSize: 18, opacity: 0.7, flexShrink: 0 }} />}
                  </Box>
                </Tooltip>
              )
            }
            return (
              <NavLink key={item.to} to={item.to} style={{ textDecoration: 'none' }}>
                {({ isActive }) => (
                  <Tooltip title={item.label} placement="left" disableHoverListener={!collapsed}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        gap: 1.5,
                        px: collapsed ? 0 : 1.5,
                        py: 1.1,
                        borderRadius: 2,
                        color: isActive ? '#fff' : 'text.secondary',
                        bgcolor: isActive ? 'rgba(0, 87, 168, 0.35)' : 'transparent',
                        borderRight: isActive ? '3px solid #FEBE10' : '3px solid transparent',
                        '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.06)' },
                      }}
                    >
                      <Box sx={{ flexShrink: 0 }}>{item.icon}</Box>
                      {!collapsed && (
                        <Typography sx={{ fontWeight: isActive ? 700 : 400, fontSize: 14, whiteSpace: 'nowrap' }}>
                          {item.label}
                        </Typography>
                      )}
                    </Box>
                  </Tooltip>
                )}
              </NavLink>
            )
          })}
        </Stack>

        <Menu
          anchorEl={coverageAnchor}
          open={Boolean(coverageAnchor)}
          onClose={() => setCoverageAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          slotProps={{ paper: { sx: { minWidth: 220, mt: 0.5, p: 0.5 } } }}
        >
          {coverageNav.map((item) => (
            <MenuItem
              key={item.to}
              component={NavLink}
              to={item.to}
              onClick={() => setCoverageAnchor(null)}
              selected={coverageActive && location.pathname.startsWith(item.to)}
              sx={{ borderRadius: 2, gap: 1.5, py: 1 }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary', flexShrink: 0 }}>{item.icon}</Box>
              <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{item.label}</Typography>
            </MenuItem>
          ))}
        </Menu>

        <Menu
          anchorEl={usersAnchor}
          open={Boolean(usersAnchor)}
          onClose={() => setUsersAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          slotProps={{ paper: { sx: { minWidth: 220, mt: 0.5, p: 0.5 } } }}
        >
          {visibleUsersNav.map((item) => (
            <MenuItem
              key={item.to}
              component={NavLink}
              to={item.to}
              onClick={() => setUsersAnchor(null)}
              selected={usersActive && location.pathname.startsWith(item.to)}
              sx={{ borderRadius: 2, gap: 1.5, py: 1 }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary', flexShrink: 0 }}>{item.icon}</Box>
              <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{item.label}</Typography>
            </MenuItem>
          ))}
        </Menu>

        <Box sx={{ flexGrow: 1 }} />

        <Divider sx={{ my: 1 }} />

        <NavLink to="/profile" style={{ textDecoration: 'none' }}>
          {({ isActive }) => (
            <Tooltip title="الملف الشخصي" placement="left" disableHoverListener={!collapsed}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  gap: 1.5,
                  px: collapsed ? 0 : 1.5,
                  py: 1,
                  borderRadius: 2,
                  color: isActive ? '#fff' : 'text.secondary',
                  bgcolor: isActive ? 'rgba(0, 87, 168, 0.35)' : 'transparent',
                  borderRight: isActive ? '3px solid #FEBE10' : '3px solid transparent',
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.06)' },
                }}
              >
                <Avatar sx={{ bgcolor: '#142E3D', width: 38, height: 38, flexShrink: 0 }}>{initials}</Avatar>
                {!collapsed && (
                  <Box sx={{ whiteSpace: 'nowrap', flexGrow: 1 }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{displayName}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11, lineHeight: 1.2, display: 'block' }}>
                      {roleLabel}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Tooltip>
          )}
        </NavLink>
      </Box>

      <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Box component="main" sx={{ p: 3, flexGrow: 1 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  )
}
