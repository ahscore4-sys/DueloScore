import { Stack, Typography, Paper, Chip } from '@mui/material'
import ConstructionIcon from '@mui/icons-material/Construction'
import type { ReactNode } from 'react'

export default function ComingSoon({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <Stack spacing={2} alignItems="center" sx={{ py: 8, textAlign: 'center' }}>
      <Paper sx={{ width: 84, height: 84, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0, 87, 168, 0.15)', border: '1px solid rgba(0, 87, 168, 0.4)' }}>
        <ConstructionIcon sx={{ fontSize: 44, color: '#FEBE10' }} />
      </Paper>
      <Typography variant="h5">{title}</Typography>
      <Chip label="قيد الإنشاء — متاح في مرحلة لاحقة" sx={{ bgcolor: 'rgba(254, 190, 16, 0.12)', color: '#FEBE10', fontWeight: 700 }} />
      {children}
      <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 440 }}>
        هذه الصفحة ضمن مرحلة لاحقة من التطوير. حالياً المعاينة تشمل: المباريات، التحضير، التحكم المباشر، وتسجيل الأحداث.
      </Typography>
    </Stack>
  )
}
