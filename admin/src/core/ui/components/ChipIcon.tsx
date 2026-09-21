import { Box } from '@mui/material'
import type { ReactNode } from 'react'

export default function ChipIcon({ children, bg = 'rgba(0,0,0,0.22)' }: { children: ReactNode; bg?: string }) {
  return (
    <Box
      component="span"
      sx={{
        width: 20,
        height: 20,
        borderRadius: '6px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: bg,
        flexShrink: 0,
        lineHeight: 0,
      }}
    >
      {children}
    </Box>
  )
}
