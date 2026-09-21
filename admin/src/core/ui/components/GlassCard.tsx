import { Card, CardContent, Typography, Box } from '@mui/material'
import type { ReactNode } from 'react'

interface GlassCardProps {
  title?: string
  action?: ReactNode
  children: ReactNode
  sx?: object
}

export default function GlassCard({ title, action, children, sx }: GlassCardProps) {
  return (
    <Card sx={{ height: '100%', ...sx }}>
      {(title || action) && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, pt: 2.5 }}>
          {title && (
            <Typography variant="h6" sx={{ fontSize: 17 }}>
              {title}
            </Typography>
          )}
          {action}
        </Box>
      )}
      <CardContent>{children}</CardContent>
    </Card>
  )
}
