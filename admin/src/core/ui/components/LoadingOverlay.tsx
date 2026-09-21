import { Box, Typography } from '@mui/material'
import './LoadingOverlay.css'

interface LoadingOverlayProps {
  open?: boolean
  label?: string
  zIndex?: number
}

export default function LoadingOverlay({ open = true, label, zIndex = 1400 }: LoadingOverlayProps) {
  if (!open) return null

  return (
    <Box className="duelo-loader" sx={{ zIndex }}>
      <Box className="duelo-loader__stage">
        <Box className="duelo-loader__ring-wrap">
          <Box className="duelo-loader__ring" />
          <Box className="duelo-loader__ring-soft" />
          <Box className="duelo-loader__crest" />
        </Box>
      </Box>
      {label && (
        <Typography variant="body1" sx={{ mt: 2, color: 'rgba(255, 255, 255, 0.85)', fontWeight: 700 }}>
          {label}
        </Typography>
      )}
    </Box>
  )
}
