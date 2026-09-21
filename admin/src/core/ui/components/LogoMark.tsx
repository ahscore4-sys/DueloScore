import { Box } from '@mui/material'
import dueloscoreLogo from '@/shared/assets/branding/dueloscore-logo.svg'

export default function LogoMark({ size = 76 }: { size?: number }) {
  const img = Math.round(size * 0.6)
  return (
    <Box
      sx={{
        position: 'relative',
        width: size,
        height: size,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: size * 0.24,
        background: 'radial-gradient(circle at 32% 18%, #234E63 0%, #142E3D 45%, #08161F 100%)',
        border: '1px solid rgba(254, 190, 16, 0.45)',
        boxShadow: '0 12px 30px rgba(0, 0, 0, 0.5), 0 0 24px rgba(20, 46, 61, 0.9), 0 0 12px rgba(254, 190, 16, 0.14), inset 0 1px 0 rgba(255,255,255,0.2)',
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 5,
          borderRadius: 'inherit',
          border: '1px solid rgba(254, 190, 16, 0.22)',
          pointerEvents: 'none',
        },
      }}
    >
      <Box
        component="img"
        src={dueloscoreLogo}
        alt="DueloScore"
        sx={{ width: img, height: img, display: 'block', position: 'relative', filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.5))' }}
      />
    </Box>
  )
}
