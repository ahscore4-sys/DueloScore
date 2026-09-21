import { Box, Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, IconButton } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { useEffect, useState } from 'react'
import { formationGroups, UNDEFINED_FORMATION } from '../lib/formations'

interface FormationDialogProps {
  open: boolean
  value: string
  onClose: () => void
  onConfirm: (code: string) => void
}

export default function FormationDialog({ open, value, onClose, onConfirm }: FormationDialogProps) {
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    if (open) setDraft(value)
  }, [open, value])

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" PaperProps={{ sx: { bgcolor: '#0E1428', backgroundImage: 'none', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 3 } }}>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h6">الخطة التكتيكية (Formation)</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>اختر التشكيل الذي يناسب خطة الفريق</Typography>
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}><CloseIcon fontSize="small" /></IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ pt: 1.5 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 440, overflowY: 'auto', pr: 0.5 }}>
          <Box>
            <Typography sx={{ color: '#FF9800', fontSize: 13, fontWeight: 800, mb: 1 }}>عام</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 1 }}>
              {(() => {
                const isSel = draft === UNDEFINED_FORMATION
                return (
                  <Box
                    onClick={() => setDraft(UNDEFINED_FORMATION)}
                    sx={{
                      p: 1.25,
                      borderRadius: 2,
                      cursor: 'pointer',
                      border: isSel ? '1px solid #FF9800' : '1px solid rgba(255,255,255,0.1)',
                      bgcolor: isSel ? 'rgba(255,152,0,0.1)' : 'rgba(255,255,255,0.04)',
                      transition: 'all .15s ease',
                      '&:hover': { borderColor: isSel ? '#FF9800' : 'rgba(255,255,255,0.3)' },
                    }}
                  >
                    <Typography sx={{ fontSize: 20, fontWeight: 800 }}>—</Typography>
                    <Typography variant="caption" sx={{ color: isSel ? '#FF9800' : 'text.secondary', fontWeight: 700 }}>غير محدد</Typography>
                    <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 0.25, fontSize: 11 }}>لم يتم اختيار تشكيلة بعد</Typography>
                  </Box>
                )
              })()}
            </Box>
          </Box>
          {formationGroups.map((group) => (
            <Box key={group.title}>
              <Typography sx={{ color: '#FEBE10', fontSize: 13, fontWeight: 800, mb: 1 }}>{group.title}</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 1 }}>
                {group.formations.map((f) => {
                  const isSel = draft === f.code
                  return (
                    <Box
                      key={f.code}
                      onClick={() => setDraft(f.code)}
                      sx={{
                        p: 1.25,
                        borderRadius: 2,
                        cursor: 'pointer',
                        border: isSel ? '1px solid #FEBE10' : '1px solid rgba(255,255,255,0.1)',
                        bgcolor: isSel ? 'rgba(254,190,16,0.1)' : 'rgba(255,255,255,0.04)',
                        transition: 'all .15s ease',
                        '&:hover': { borderColor: isSel ? '#FEBE10' : 'rgba(255,255,255,0.3)' },
                      }}
                    >
                      <Typography sx={{ fontSize: 20, fontWeight: 800 }}>{f.code}</Typography>
                      <Typography variant="caption" sx={{ color: isSel ? '#FEBE10' : 'text.secondary', fontWeight: 700 }}>{f.label}</Typography>
                      <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 0.25, fontSize: 11 }}>{f.description}</Typography>
                    </Box>
                  )
                })}
              </Box>
            </Box>
          ))}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
        <Button onClick={onClose} sx={{ color: 'text.secondary' }}>إلغاء</Button>
        <Button variant="contained" onClick={() => onConfirm(draft)}>تأكيد</Button>
      </DialogActions>
    </Dialog>
  )
}
