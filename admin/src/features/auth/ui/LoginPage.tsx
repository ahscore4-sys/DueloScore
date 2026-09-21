import { useEffect, useState } from 'react'
import {
  Box,
  Typography,
  TextField,
  Button,
  Checkbox,
  FormControlLabel,
  Stack,
  Paper,
  Alert,
  CircularProgress,
  IconButton,
  InputAdornment,
} from '@mui/material'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined'
import LogoMark from '@/core/ui/components/LogoMark'
import { useAuth } from './useAuth'
import { login } from '../data/auth.service'
import { useNavigate } from 'react-router-dom'

export default function LoginPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    if (user) navigate('/', { replace: true })
  }, [user, navigate])

  const validate = () => {
    const next: { email?: string; password?: string } = {}
    if (!email.trim()) next.email = 'البريد الإلكتروني مطلوب'
    else if (!/^\S+@\S+\.\S+$/.test(email)) next.email = 'صيغة البريد الإلكتروني غير صحيحة'
    if (!password) next.password = 'كلمة المرور مطلوبة'
    else if (password.length < 6) next.password = 'كلمة المرور يجب ألا تقل عن 6 أحرف'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async () => {
    setAuthError('')
    if (!validate()) return
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        setAuthError('البريد الإلكتروني أو كلمة المرور غير صحيحة')
      } else if (code === 'auth/too-many-requests') {
        setAuthError('تم حظر الحساب مؤقتاً بسبب محاولات كثيرة. حاول لاحقاً')
      } else {
        setAuthError('حدث خطأ غير متوقع. حاول مرة أخرى')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: '-120px',
          right: '-120px',
          width: 380,
          height: 380,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0, 87, 168, 0.45), transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: '-140px',
          left: '-100px',
          width: 420,
          height: 420,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(254, 190, 16, 0.18), transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <Paper
        sx={{
          width: 430,
          maxWidth: '100%',
          p: 4,
          borderRadius: 4,
          bgcolor: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          backdropFilter: 'blur(18px)',
          position: 'relative',
        }}
      >
        <Stack spacing={3}>
          <Box sx={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'flex-start' }}>
            <LogoMark size={68} />
            <Typography variant="h5" sx={{ position: 'absolute', insetInlineStart: 0, insetInlineEnd: 0, textAlign: 'center', top: '50%', transform: 'translateY(-50%)' }}>
              تسجيل الدخول
            </Typography>
          </Box>

          {authError && <Alert severity="error">{authError}</Alert>}

          <Stack spacing={2}>
            <TextField
              label="البريد الإلكتروني (Email)"
              placeholder="admin@dueloscore.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={Boolean(errors.email)}
              helperText={errors.email}
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Box sx={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary' }}>
                      <EmailOutlinedIcon sx={{ fontSize: 20, display: 'block', transform: 'translateY(1px)' }} />
                    </Box>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label="كلمة المرور (Password)"
              placeholder="••••••••"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={Boolean(errors.password)}
              helperText={errors.password}
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Box sx={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary' }}>
                      <LockOutlinedIcon sx={{ fontSize: 20, display: 'block' }} />
                    </Box>
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowPassword((v) => !v)} edge="end">
                      {showPassword ? <VisibilityOff sx={{ fontSize: 20 }} /> : <Visibility sx={{ fontSize: 20 }} />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: -1 }}>
              <FormControlLabel
                control={<Checkbox size="small" defaultChecked />}
                label="تذكرني"
                sx={{ marginInlineStart: 0 }}
              />
              <Typography
                sx={{ color: 'primary.light', fontSize: 13, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
              >
                نسيت كلمة المرور؟
              </Typography>
            </Stack>
          </Stack>

          <Button
            variant="contained"
            size="large"
            fullWidth
            disabled={loading}
            onClick={handleSubmit}
            sx={{
              background: 'linear-gradient(135deg, #00E676, #00C853)',
              color: '#062A16',
              '&:hover': { background: 'linear-gradient(135deg, #00E676, #00A84C)' },
              py: 1.4,
            }}
          >
            {loading ? <CircularProgress size={22} color="inherit" /> : 'تسجيل الدخول'}
          </Button>

          <Stack spacing={1} direction="row" alignItems="flex-start" sx={{ bgcolor: 'rgba(255, 255, 255, 0.04)', borderRadius: 2, p: 1.5 }}>
            <LockOutlinedIcon sx={{ fontSize: 18, color: 'text.secondary', mt: 0.2 }} />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              مخصص لمشرفي النظام فقط. يتم التحقق من الصلاحية عند تسجيل الدخول، ولا يُسمح لحسابات
              المستخدمين العاديين بالدخول.
            </Typography>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  )
}
