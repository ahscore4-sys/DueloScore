import { useNavigate } from 'react-router-dom'
import { Box, Typography, Stack, Avatar, Chip, IconButton, Tooltip } from '@mui/material'
import LockIcon from '@mui/icons-material/Lock'
import LockOpenIcon from '@mui/icons-material/LockOpen'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import VisibilityIcon from '@mui/icons-material/Visibility'
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined'
import EventIcon from '@mui/icons-material/Event'
import type { DiwaniyaPost } from '../../domain/diwaniya.types'
import { pollStatusLabel, tierAccent } from '../../domain/diwaniya.types'
import { formatDateTime, timeAgo } from '../timeAgo'
import PollResults from './PollResults'

interface DiwaniyaPostCardProps {
  post: DiwaniyaPost
  variant?: 'default' | 'hero'
  disableNavigation?: boolean
  onToggleStatus: (post: DiwaniyaPost) => void
  onHideRestore: (post: DiwaniyaPost) => void
}

export default function DiwaniyaPostCard({ post, variant = 'default', disableNavigation, onToggleStatus, onHideRestore }: DiwaniyaPostCardProps) {
  const navigate = useNavigate()
  const hero = variant === 'hero'
  const accent = '#0057A8'
  const initial = post.authorName.trim().charAt(0) || '؟'

  return (
    <Box
      onClick={() => {
        if (!disableNavigation) navigate(`/diwaniya/${post.id}`)
      }}
      sx={{
        position: 'relative',
        p: hero ? 3.5 : 2.5,
        borderRadius: 4,
        bgcolor: 'rgba(255,255,255,0.04)',
        border: `1px solid ${post.hidden ? 'rgba(255,82,82,0.35)' : 'rgba(255,255,255,0.1)'}`,
        backdropFilter: 'blur(14px)',
        cursor: disableNavigation ? 'default' : 'pointer',
        overflow: 'hidden',
        transition: 'all .18s ease',
        '&:hover': { borderColor: `${accent}88`, bgcolor: 'rgba(255,255,255,0.06)', transform: 'translateY(-2px)' },
      }}
    >
      <Box sx={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 4, bgcolor: accent, opacity: 0.85 }} />

      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <Avatar sx={{ width: hero ? 52 : 46, height: hero ? 52 : 46, fontWeight: 900, fontSize: hero ? 21 : 19, bgcolor: `${accent}44`, border: `2px solid ${accent}77` }}>
          {initial}
        </Avatar>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
            <Typography sx={{ fontWeight: 800, fontSize: hero ? 16 : 15 }}>{post.authorName}</Typography>
            {post.authorTier && (
              <Chip label={post.authorTier} size="small" sx={{ height: 18, fontSize: 10, fontWeight: 800, bgcolor: `${tierAccent(post.authorTier)}22`, color: tierAccent(post.authorTier), border: `1px solid ${tierAccent(post.authorTier)}55` }} />
            )}
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              · {timeAgo(post.createdAt)}
            </Typography>
          </Stack>

          <Stack direction="row" spacing={0.75} sx={{ mt: 0.75 }} flexWrap="wrap" useFlexGap>
            {post.pollStatus === 'open' ? (
              <Chip
                label={pollStatusLabel(post.pollStatus)}
                size="small"
                sx={{
                  height: 22,
                  fontSize: 11,
                  fontWeight: 800,
                  bgcolor: 'rgba(0,230,118,0.12)',
                  color: '#00E676',
                  border: '1px solid rgba(0,230,118,0.4)',
                }}
              />
            ) : (
              <Chip
                label={pollStatusLabel(post.pollStatus)}
                size="small"
                sx={{
                  height: 22,
                  fontSize: 11,
                  fontWeight: 800,
                  bgcolor: 'rgba(255,255,255,0.08)',
                  color: 'text.secondary',
                  border: '1px solid rgba(255,255,255,0.12)',
                }}
              />
            )}
            {post.hidden && (
              <Chip icon={<VisibilityOffIcon sx={{ fontSize: 12 }} />} label="مخفي" size="small" sx={{ height: 22, fontSize: 11, fontWeight: 800, bgcolor: 'rgba(255,82,82,0.12)', color: '#FF8A80', border: '1px solid rgba(255,82,82,0.4)', '& .MuiChip-icon': { color: '#FF8A80' } }} />
            )}
            {post.reportCount > 0 && (
              <Chip icon={<FlagOutlinedIcon sx={{ fontSize: 12 }} />} label={`${post.reportCount} بلاغ`} size="small" sx={{ height: 22, fontSize: 11, fontWeight: 800, bgcolor: 'rgba(255,179,0,0.12)', color: '#FFB300', border: '1px solid rgba(255,179,0,0.4)', '& .MuiChip-icon': { color: '#FFB300' } }} />
            )}
          </Stack>
        </Box>

        <Stack direction="row" spacing={0.5} onClick={(e) => e.stopPropagation()}>
          <Tooltip title={post.pollStatus === 'open' ? 'إغلاق التصويت' : 'إعادة فتح التصويت'} placement="top">
            <IconButton size="small" onClick={() => onToggleStatus(post)} sx={{ color: 'text.secondary', '&:hover': { color: '#00E676' } }}>
              {post.pollStatus === 'open' ? <LockOpenIcon sx={{ fontSize: 17 }} /> : <LockIcon sx={{ fontSize: 17 }} />}
            </IconButton>
          </Tooltip>
          <Tooltip title={post.hidden ? 'إظهار المنشور' : 'إخفاء المنشور'} placement="top">
            <IconButton size="small" onClick={() => onHideRestore(post)} sx={{ color: post.hidden ? '#FF8A80' : 'text.secondary', '&:hover': { color: '#FF1744' } }}>
              {post.hidden ? <VisibilityIcon sx={{ fontSize: 17 }} /> : <VisibilityOffIcon sx={{ fontSize: 17 }} />}
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      <Typography sx={{ mt: 1.5, fontWeight: 800, fontSize: hero ? 20 : 17, lineHeight: 1.6 }}>
        {post.question ?? post.text}
      </Typography>

      {post.options.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <PollResults post={post} compact={!hero} />
        </Box>
      )}

      <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mt: 1.5 }}>
        <EventIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
          {post.endsAt ? `تنتهي: ${formatDateTime(post.endsAt)}` : 'بدون موعد انتهاء'}
        </Typography>
      </Stack>
    </Box>
  )
}
