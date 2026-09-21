import { Typography, Stack, Button } from '@mui/material'
import HomeIcon from '@mui/icons-material/Home'
import RefreshIcon from '@mui/icons-material/Refresh'
import { useNavigate } from 'react-router-dom'

export default function NotFound() {
  const navigate = useNavigate()
  return (
    <Stack spacing={2} alignItems="center" sx={{ py: 8, textAlign: 'center' }}>
      <Typography variant="h1" sx={{ fontSize: 120, fontWeight: 900, color: 'rgba(0, 87, 168, 0.5)', textShadow: '0 0 40px rgba(0, 87, 168, 0.6)', lineHeight: 1 }}>
        404
      </Typography>
      <Typography variant="h5">الصفحة غير موجودة (Not Found)</Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 420 }}>
        الصفحة التي تبحث عنها غير متوفرة أو تم نقلها. يمكنك العودة إلى الرئيسية أو تحديث الصفحة.
      </Typography>
      <Stack direction="row" spacing={1.5}>
        <Button variant="contained" startIcon={<HomeIcon />} onClick={() => navigate('/')} sx={{ gap: 1 }}>
          العودة إلى الرئيسية
        </Button>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => window.location.reload()} sx={{ gap: 1 }}>
          تحديث
        </Button>
      </Stack>
    </Stack>
  )
}
