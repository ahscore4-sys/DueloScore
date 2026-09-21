import { createTheme } from '@mui/material/styles'

const theme = createTheme({
  direction: 'rtl',
  palette: {
    mode: 'dark',
    primary: { main: '#142E3D', light: '#1E4557', dark: '#0B1D28', contrastText: '#FFFFFF' },
    secondary: { main: '#FEBE10', light: '#FFD354', dark: '#D69E08', contrastText: '#1A1400' },
    success: { main: '#00E676', dark: '#00C853' },
    error: { main: '#FF1744', light: '#FF5252', dark: '#D50000' },
    warning: { main: '#FFB300' },
    background: {
      default: '#060811',
      paper: 'rgba(255, 255, 255, 0.05)',
    },
    text: {
      primary: '#F4F7FF',
      secondary: 'rgba(244, 247, 255, 0.7)',
    },
    divider: 'rgba(255, 255, 255, 0.12)',
  },
  shape: {
    borderRadius: 16,
  },
  typography: {
    fontFamily: '"Almarai", "Cairo", sans-serif',
    h1: { fontFamily: '"Cairo", "Almarai", sans-serif', fontWeight: 700 },
    h2: { fontFamily: '"Cairo", "Almarai", sans-serif', fontWeight: 700 },
    h3: { fontFamily: '"Cairo", "Almarai", sans-serif', fontWeight: 700 },
    h4: { fontFamily: '"Cairo", "Almarai", sans-serif', fontWeight: 700 },
    h5: { fontFamily: '"Cairo", "Almarai", sans-serif', fontWeight: 700 },
    h6: { fontFamily: '"Cairo", "Almarai", sans-serif', fontWeight: 700 },
    button: { fontFamily: '"Cairo", "Almarai", sans-serif', fontWeight: 700 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background: 'linear-gradient(135deg, #060811 0%, #0A0E1C 100%)',
          backgroundAttachment: 'fixed',
          minHeight: '100vh',
        },
      },
    },
    MuiStack: {
      defaultProps: {
        useFlexGap: true,
      },
    },
    MuiFormHelperText: {
      styleOverrides: {
        root: {
          textAlign: 'right',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          backgroundColor: '#0E1428',
          border: '1px solid rgba(255, 255, 255, 0.12)',
        },
      },
    },
    MuiAutocomplete: {
      styleOverrides: {
        paper: {
          backgroundColor: '#0E1428',
          border: '1px solid rgba(255,255,255,0.14)',
          boxShadow: '0 18px 50px rgba(0,0,0,0.55)',
          backgroundImage: 'none',
        },
        listbox: {
          backgroundColor: '#0E1428',
          '& .MuiAutocomplete-option': {
            color: '#F4F7FF',
            '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' },
            '&[aria-selected="true"]': { backgroundColor: 'rgba(254,190,16,0.18)' },
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: '#0E1428',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          backgroundImage: 'none',
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 12,
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #00E676, #00C853)',
          color: '#062A16',
          '&:hover': {
            background: 'linear-gradient(135deg, #00E676, #00A84C)',
          },
          '&.Mui-disabled': {
            background: 'rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.38)',
          },
        },
        containedError: {
          background: 'linear-gradient(135deg, #FF5252, #FF1744)',
          color: '#FFFFFF',
          border: '1px solid rgba(255,255,255,0.45)',
          boxShadow: '0 4px 18px rgba(255,23,68,0.45)',
          '&:hover': {
            background: 'linear-gradient(135deg, #FF1744, #D50000)',
            boxShadow: '0 6px 22px rgba(255,23,68,0.6)',
          },
          '&.Mui-disabled': {
            background: 'rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.38)',
            boxShadow: 'none',
          },
        },
        outlinedError: {
          color: '#FF8A80',
          borderColor: 'rgba(255,138,128,0.75)',
          '&:hover': {
            bgcolor: 'rgba(255,23,68,0.18)',
            borderColor: '#FF5252',
            color: '#FF5252',
          },
        },
        textError: {
          color: '#FF8A80',
          '&:hover': {
            bgcolor: 'rgba(255,23,68,0.16)',
            color: '#FF5252',
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          bgcolor: '#FEBE10',
          height: 3,
          borderRadius: 3,
          boxShadow: '0 0 12px rgba(254,190,16,0.45)',
        },
        root: {
          '& .MuiTab-root.Mui-selected': { color: '#FEBE10' },
          '& .MuiTabs-indicator': { backgroundColor: '#FEBE10' },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 24,
          border: '1px solid rgba(255, 255, 255, 0.12)',
          backgroundColor: 'rgba(255, 255, 255, 0.04)',
          backdropFilter: 'blur(12px)',
        },
      },
    },
  },
})

export default theme
