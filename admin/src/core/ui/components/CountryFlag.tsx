import { Box } from '@mui/material'
import PublicIcon from '@mui/icons-material/Public'

const FLAG_BASE = 'https://media.api-sports.io/flags'

export interface CountryFlagProps {
  src?: string | null
  code?: string | null
  size?: number
  alt?: string
}

export default function CountryFlag({ src, code, size = 16, alt }: CountryFlagProps) {
  const url = src || (code ? `${FLAG_BASE}/${code.toLowerCase()}.svg` : null)
  if (!url) {
    return (
      <Box
        sx={{
          width: size,
          height: size,
          borderRadius: '50%',
          bgcolor: 'rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <PublicIcon sx={{ width: size * 0.62, height: size * 0.62, color: 'text.secondary' }} />
      </Box>
    )
  }
  return (
    <Box
      component="img"
      src={url}
      alt={alt ?? ''}
      title={alt}
      draggable={false}
      sx={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        objectFit: 'cover',
        boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
        display: 'block',
        flexShrink: 0,
      }}
      onError={(e) => {
        e.currentTarget.style.display = 'none'
      }}
    />
  )
}