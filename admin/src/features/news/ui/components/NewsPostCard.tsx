import { useNavigate } from 'react-router-dom'
import { Box, Typography, Stack, Avatar, Chip, IconButton, Tooltip, Button } from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import FavoriteIcon from '@mui/icons-material/Favorite'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive'
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff'
import type { NewsPost } from '../../domain/news.types'
import { tagLabel, teamAccent, teamLabel } from '../../domain/news.types'
import { timeAgo } from '../timeAgo'

interface NewsPostCardProps {
  post: NewsPost
  onDelete: (post: NewsPost) => void
}

export default function NewsPostCard({ post, onDelete }: NewsPostCardProps) {
  const navigate = useNavigate()
  const accent = teamAccent(post.team)
  const initial = post.author.trim().charAt(0) || '؟'

  return (
    <Box
      onClick={() => navigate(`/news/${post.id}`)}
      sx={{
        position: 'relative',
        p: 2.5,
        borderRadius: 4,
        bgcolor: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(14px)',
        cursor: 'pointer',
        overflow: 'hidden',
        transition: 'all .18s ease',
        '&:hover': { borderColor: `${accent}88`, bgcolor: 'rgba(255,255,255,0.06)', transform: 'translateY(-2px)' },
      }}
    >
      <Box sx={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 4, bgcolor: accent, opacity: 0.85 }} />
      
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <Avatar sx={{ width: 46, height: 46, fontWeight: 900, fontSize: 19, bgcolor: `${accent}44`, border: `2px solid ${accent}77` }}>{initial}</Avatar>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
            <Typography sx={{ fontWeight: 800, fontSize: 15 }}>{post.author}</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              · {timeAgo(post.createdAt)}
            </Typography>
            <Tooltip title={post.notifiedAt ? 'تم إرسال الإشعار' : 'لم يتم إرسال الإشعار'} placement="top">
              <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', color: post.notifiedAt ? '#00E676' : '#FFB300' }}>
                {post.notifiedAt ? <NotificationsActiveIcon sx={{ fontSize: 15 }} /> : <NotificationsOffIcon sx={{ fontSize: 15 }} />}
              </Box>
            </Tooltip>
          </Stack>
          
          <Stack direction="row" spacing={0.75} sx={{ mt: 0.75 }} flexWrap="wrap" useFlexGap>
            <Chip label={teamLabel(post.team)} size="small" sx={{ height: 22, fontSize: 11, fontWeight: 800, bgcolor: `${accent}26`, color: accent === '#FEBE10' ? '#FEBE10' : '#fff', border: `1px solid ${accent}55` }} />
            <Chip label={tagLabel(post.tag)} size="small" sx={{ height: 22, fontSize: 11, fontWeight: 800, bgcolor: post.tag === 'injuries' ? 'rgba(255,82,82,0.14)' : 'rgba(33,150,243,0.14)', color: post.tag === 'injuries' ? '#FF8A80' : '#90CAF9' }} />
          </Stack>
        </Box>
        
        <Stack direction="row" spacing={0.5} onClick={(e) => e.stopPropagation()}>
          <Tooltip title="تعديل الخبر" placement="top">
            <IconButton size="small" onClick={() => navigate(`/news/${post.id}/edit`)} sx={{ color: 'text.secondary', '&:hover': { color: '#FEBE10' } }}>
              <EditIcon sx={{ fontSize: 17 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="حذف الخبر" placement="top">
            <IconButton size="small" onClick={() => onDelete(post)} sx={{ color: 'text.secondary', '&:hover': { color: '#FF1744' } }}>
              <DeleteIcon sx={{ fontSize: 17 }} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>
      
      {post.imageUrl && (
        <Box
          component="img"
          src={post.imageUrl}
          alt={post.title}
          sx={{ mt: 1.5, display: 'block', mx: 'auto', width: '100%', maxWidth: 440, aspectRatio: '16 / 9', objectFit: 'cover', borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)' }}
        />
      )}
      
      <Typography sx={{ mt: 1.25, fontWeight: 800, fontSize: 17, lineHeight: 1.6 }}>{post.title}</Typography>
      
      {post.summary?.trim() ? (
        <Typography
          sx={{
            mt: 0.75,
            color: 'text.secondary',
            fontSize: 14,
            lineHeight: 1.9,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {post.summary}
        </Typography>
      ) : (
        <Typography
          sx={{
            mt: 0.75,
            color: 'text.secondary',
            fontSize: 14,
            lineHeight: 1.9,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {post.content}
        </Typography>
      )}
      
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mt: 1.75 }} onClick={(e) => e.stopPropagation()}>
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <FavoriteIcon sx={{ fontSize: 17, color: '#FF5252' }} />
          <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>
            {post.likedBy.length}
          </Typography>
        </Stack>
        {post.sourceUrl && (
          <Button
            size="small"
            href={post.sourceUrl}
            target="_blank"
            rel="noreferrer"
            startIcon={<OpenInNewIcon />}
            sx={{ mr: 'auto', fontSize: 12, fontWeight: 800, color: '#FEBE10' }}
          >
            المصدر
          </Button>
        )}
      </Stack>
    </Box>
  )
}