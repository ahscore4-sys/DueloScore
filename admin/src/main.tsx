import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import '@fontsource/cairo/400.css'
import '@fontsource/cairo/700.css'
import '@fontsource/cairo/900.css'
import '@fontsource/almarai/400.css'
import '@fontsource/almarai/700.css'
import theme from '@/core/ui/theme'
import './index.css'
import App from './App'
import { AuthProvider } from '@/features/auth/ui/AuthContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
)
