import { useState } from 'react'
import { Typography, Stack, Grid, Chip, Avatar, Divider, Button, Switch, List, ListItem, ListItemText, Box } from '@mui/material'
import BadgeIcon from '@mui/icons-material/Badge'
import EmailIcon from '@mui/icons-material/Email'
import PhoneIcon from '@mui/icons-material/Phone'
import LockResetIcon from '@mui/icons-material/LockReset'
import VerifiedIcon from '@mui/icons-material/Verified'
import ShieldIcon from '@mui/icons-material/Shield'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import SecurityIcon from '@mui/icons-material/Security'
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive'
import EditIcon from '@mui/icons-material/Edit'
import LogoutIcon from '@mui/icons-material/Logout'
import HistoryIcon from '@mui/icons-material/History'
import GlassCard from '../components/GlassCard'
import { logout } from '@/features/auth/data/auth.service'
import { useNavigate } from 'react-router-dom'

const accountRows = [
  { icon: <BadgeIcon />, label: 'الاسم الكامل', value: 'أحمد سالم' },
  { icon: <EmailIcon />, label: 'البريد الإلكتروني', value: 'admin@dueloscore.com' },
  { icon: <PhoneIcon />, label: 'رقم الهاتف', value: '+966 55 000 0000' },
  { icon: <ShieldIcon />, label: 'الدور', value: 'مدير النظام (Admin)' },
  { icon: <VerifiedIcon />, label: 'حالة الحساب', value: 'مفعّل' },
]

const permissions = [
  'إدارة المباريات والتشكيلات',
  'التحكم المباشر وتسجيل الأحداث',
  'إدارة الأخبار والنشر',
  'إدارة الديوانية والاستطلاعات',
  'إدارة المستخدمين والتعليقات',
  'إدارة المعلقين والقنوات والملاعب',
]

export default function Profile() {
  const navigate = useNavigate()
  const [notifLive, setNotifLive] = useState(true)
  const [notifNews, setNotifNews] = useState(true)
  const [notifPolls, setNotifPolls] = useState(false)
  const [twoFactor, setTwoFactor] = useState(true)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <Stack spacing={3}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
        <Stack spacing={0.5}>
          <Typography variant="h4">الملف الشخصي (Profile)</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            بيانات الحساب والصلاحيات والإعدادات
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" startIcon={<HistoryIcon />} onClick={() => navigate('/settings/log')} sx={{ gap: 1 }}>سجل الأنشطة</Button>
          <Button variant="outlined" startIcon={<EditIcon />} sx={{ gap: 1 }}>تعديل الملف</Button>
          <Button variant="outlined" color="error" startIcon={<LogoutIcon />} onClick={handleLogout} sx={{ gap: 1 }}>تسجيل الخروج</Button>
        </Stack>
      </Stack>

      <GlassCard sx={{ background: 'linear-gradient(135deg, rgba(20,46,61,0.55), rgba(10,13,28,0.6))', border: '1px solid rgba(20, 46, 61, 0.6)' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={2.5} alignItems="center">
            <Avatar sx={{ bgcolor: '#142E3D', width: 72, height: 72, fontSize: 30, fontWeight: 800, border: '2px solid rgba(254, 190, 16, 0.6)' }}>أ</Avatar>
            <Stack spacing={0.5}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Typography variant="h5">أحمد سالم</Typography>
                <Chip size="small" icon={<ShieldIcon sx={{ fontSize: 13, color: '#FEBE10 !important' }} />} label="مدير النظام" sx={{ bgcolor: 'rgba(254, 190, 16, 0.12)', color: '#FEBE10', fontWeight: 700 }} />
              </Stack>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>admin@dueloscore.com</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>عضو منذ 2024 · آخر تسجيل دخول: اليوم — 09:40</Typography>
            </Stack>
          </Stack>
          <Stack direction="row" spacing={4}>
            <Stack alignItems="center" spacing={0.5}>
              <Typography variant="h4" sx={{ color: '#FEBE10' }}>120</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>مباراة مُدارة</Typography>
            </Stack>
            <Stack alignItems="center" spacing={0.5}>
              <Typography variant="h4" sx={{ color: '#FEBE10' }}>640</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>حدث مسجّل</Typography>
            </Stack>
            <Stack alignItems="center" spacing={0.5}>
              <Typography variant="h4" sx={{ color: '#FEBE10' }}>45</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>خبر منشور</Typography>
            </Stack>
            <Stack alignItems="center" spacing={0.5}>
              <Typography variant="h4" sx={{ color: '#FEBE10' }}>12</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>استطلاع</Typography>
            </Stack>
          </Stack>
        </Stack>
      </GlassCard>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <GlassCard title="معلومات الحساب">
            <Stack divider={<Divider />} spacing={1.5}>
              {accountRows.map((row) => (
                <Stack key={row.label} direction="row" spacing={1.5} alignItems="center" sx={{ py: 0.5 }}>
                  <Box sx={{ flexShrink: 0, display: 'flex', color: 'text.secondary' }}>{row.icon}</Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', minWidth: 110 }}>{row.label}</Typography>
                  <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{row.value}</Typography>
                </Stack>
              ))}
            </Stack>
          </GlassCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <GlassCard title="الصلاحيات (Permissions)">
            <List dense disablePadding>
              {permissions.map((p) => (
                <ListItem key={p} disableGutters sx={{ py: 0.6 }}>
                  <ListItemText primary={<Typography sx={{ fontSize: 14 }}>{p}</Typography>} sx={{ textAlign: 'right' }} />
                  <CheckCircleIcon sx={{ fontSize: 20, color: '#00E676', flexShrink: 0 }} />
                </ListItem>
              ))}
            </List>
          </GlassCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <GlassCard title="الأمان والحساب">
            <Stack spacing={2}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Stack spacing={0.5}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <SecurityIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                    <Typography sx={{ fontSize: 14, fontWeight: 700 }}>المصادقة الثنائية (2FA)</Typography>
                  </Stack>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>حماية إضافية عند تسجيل الدخول</Typography>
                </Stack>
                <Switch checked={twoFactor} onChange={(e) => setTwoFactor(e.target.checked)} />
              </Stack>
              <Divider />
              <Stack spacing={1}>
                <Button variant="outlined" startIcon={<LockResetIcon />} fullWidth sx={{ gap: 1 }}>تغيير كلمة المرور</Button>
                <Button variant="outlined" startIcon={<EmailIcon />} fullWidth sx={{ gap: 1 }}>تغيير البريد الإلكتروني</Button>
              </Stack>
            </Stack>
          </GlassCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <GlassCard title="الإشعارات (Notifications)">
            <Stack spacing={1}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Stack direction="row" spacing={1} alignItems="center">
                  <NotificationsActiveIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                  <Typography sx={{ fontSize: 14 }}>أحداث المباريات المباشرة</Typography>
                </Stack>
                <Switch checked={notifLive} onChange={(e) => setNotifLive(e.target.checked)} />
              </Stack>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Stack direction="row" spacing={1} alignItems="center">
                  <NotificationsActiveIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                  <Typography sx={{ fontSize: 14 }}>الأخبار المنشورة</Typography>
                </Stack>
                <Switch checked={notifNews} onChange={(e) => setNotifNews(e.target.checked)} />
              </Stack>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Stack direction="row" spacing={1} alignItems="center">
                  <NotificationsActiveIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                  <Typography sx={{ fontSize: 14 }}>الاستطلاعات والتصويت</Typography>
                </Stack>
                <Switch checked={notifPolls} onChange={(e) => setNotifPolls(e.target.checked)} />
              </Stack>
            </Stack>
          </GlassCard>
        </Grid>
      </Grid>
    </Stack>
  )
}
