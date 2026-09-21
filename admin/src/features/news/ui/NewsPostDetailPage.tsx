import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Box,
  Typography,
  Stack,
  Avatar,
  Chip,
  IconButton,
  Button,
  Paper,
  CircularProgress,
  Snackbar,
  Alert,
} from '@mui/material'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import FavoriteIcon from '@mui/icons-material/Favorite'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive'
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff'
import RefreshIcon from '@mui/icons-material/Refresh'
import { tagLabel, teamAccent, teamLabel } from '../domain/news.types'
import { deleteNewsPost, saveNewsPost, generateNewsSummary } from '../data/news.service'
import { useNewsPost } from './useNewsPost'
import { timeAgo } from './timeAgo'
import ConfirmDialog from '@/core/ui/components/ConfirmDialog'

export default function NewsPostDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { post, loading } = useNewsPost(id)

  const [deletingPost, setDeletingPost] = useState(false)
  const [deletePostOpen, setDeletePostOpen] = useState(false)

  const [regeneratingSummary, setRegeneratingSummary] = useState(false)
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' })

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress sx={{ color: '#FEBE10' }} />
      </Box>
    )
  }

  if (!post || !id) {
    return (
      <Stack spacing={2} alignItems="center" sx={{ py: 10 }}>
        <Typography variant="h5">الخبر غير موجود</Typography>
        <Button variant="contained" onClick={() => navigate('/news')}>
          العودة إلى الأخبار
        </Button>
      </Stack>
    )
  }

  const accent = teamAccent(post.team)
  const initial = post.author.trim().charAt(0) || '؟'

  const confirmDeletePost = async () => {
    setDeletingPost(true)
    try {
      await deleteNewsPost(post)
      navigate('/news')
    } finally {
      setDeletingPost(false)
    }
  }

  const handleRegenerateSummary = async () => {
    setRegeneratingSummary(true)
    try {
      const result = await generateNewsSummary(post.title, post.content)
      await saveNewsPost({
        id: post.id,
        title: post.title,
        content: post.content,
        team: post.team,
        tag: post.tag,
        author: post.author,
        sourceUrl: post.sourceUrl,
        imageFile: null,
        existingImageUrl: post.imageUrl,
        existingImagePath: post.imagePath,
        summary: result.summary,
      })
    } catch {
      setSnack({ open: true, message: 'حدث خطأ أثناء إعادة توليد الملخص.', severity: 'error' })
    } finally {
      setRegeneratingSummary(false)
    }
  }

  return (
    <Stack spacing={3}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ flexWrap: 'wrap', gap: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <IconButton onClick={() => navigate('/news')} sx={{ color: 'text.secondary', border: '1px solid rgba(255,255,255,0.12)' }}>
            <ArrowForwardIcon />
          </IconButton>
          <Typography variant="h4">تفاصيل الخبر</Typography>
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<EditIcon />} onClick={() => navigate(`/news/${id}/edit`)} sx={{ borderColor: 'rgba(254,190,16,0.5)', color: '#FEBE10', '&:hover': { borderColor: '#FEBE10', bgcolor: 'rgba(254,190,16,0.08)' } }}>
            تعديل الخبر
          </Button>
          <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={() => setDeletePostOpen(true)}>
            حذف الخبر
          </Button>
          <Button
            variant="outlined"
            startIcon={regeneratingSummary ? <CircularProgress size={18} color="inherit" /> : <RefreshIcon />}
            disabled={regeneratingSummary}
            onClick={handleRegenerateSummary}
            sx={{ borderColor: 'rgba(0,230,118,0.5)', color: '#00E676', '&:hover': { borderColor: '#00E676', bgcolor: 'rgba(0,230,118,0.08)' } }}
          >
            {regeneratingSummary ? 'جارٍ التوليد…' : 'إعادة توليد'}
          </Button>
        </Stack>
      </Stack>

      <Paper sx={{ p: 3, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(14px)', position: 'relative', overflow: 'hidden' }}>
        <Box sx={{ position: 'absolute', top: 0, right: 0, left: 0, height: 4, background: `linear-gradient(90deg, ${accent}, transparent)` }} />

        {post.imageUrl && (
          <Box component="img" src={post.imageUrl} alt={post.title} sx={{ display: 'block', width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)' }} />
        )}

        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
          <Avatar sx={{ width: 36, height: 36, fontWeight: 900, fontSize: 15, bgcolor: `${accent}44`, border: `2px solid ${accent}77` }}>{initial}</Avatar>
          <Typography sx={{ fontWeight: 800, fontSize: 13 }}>{post.author}</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {timeAgo(post.createdAt)}
          </Typography>
          <Chip label={teamLabel(post.team)} size="small" sx={{ height: 22, fontSize: 11, fontWeight: 800, bgcolor: `${accent}26`, color: accent === '#FEBE10' ? '#FEBE10' : '#fff', border: `1px solid ${accent}55` }} />
          <Chip label={tagLabel(post.tag)} size="small" sx={{ height: 22, fontSize: 11, fontWeight: 800, bgcolor: post.tag === 'injuries' ? 'rgba(255,82,82,0.14)' : 'rgba(33,150,243,0.14)', color: post.tag === 'injuries' ? '#FF8A80' : '#90CAF9' }} />
          <Chip icon={<FavoriteIcon sx={{ fontSize: 14, color: '#FF5252' }} />} label={post.likedBy.length} size="small" sx={{ height: 22, fontSize: 11, fontWeight: 800, bgcolor: 'rgba(255,82,82,0.1)', color: '#FF8A80' }} />
          {post.notifiedAt ? (
            <Chip icon={<NotificationsActiveIcon sx={{ fontSize: 14 }} />} label={`أُرسل ${timeAgo(post.notifiedAt)}`} size="small" sx={{ height: 22, fontSize: 11, fontWeight: 800, bgcolor: 'rgba(0,230,118,0.1)', color: '#69F0AE' }} />
          ) : (
            <Chip icon={<NotificationsOffIcon sx={{ fontSize: 14 }} />} label="فشل الإشعار" size="small" sx={{ height: 22, fontSize: 11, fontWeight: 800, bgcolor: 'rgba(255,179,0,0.12)', color: '#FFB300' }} />
          )}
        </Stack>

        <Typography variant="h5" sx={{ mt: 2, lineHeight: 1.6 }}>
          {post.title}
        </Typography>

        {post.summary?.trim() && (
          <Box sx={{ mt: 2, p: 2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.03)', border: `1px solid ${accent}33` }}>
            <Typography variant="body1" sx={{ color: 'text.secondary', mb: 0.5 }}>
              الملخص:
            </Typography>
            <Typography variant="body1">{post.summary}</Typography>
          </Box>
        )}

        <Typography sx={{ mt: 2, color: 'text.secondary', fontSize: 15, lineHeight: 2, whiteSpace: 'pre-wrap' }}>{post.content}</Typography>

        {post.sourceUrl && (
          <Button size="small" href={post.sourceUrl} target="_blank" rel="noreferrer" startIcon={<OpenInNewIcon />} sx={{ mt: 1.5, fontSize: 12, fontWeight: 800, color: '#FEBE10' }}>
            زيارة المصدر
          </Button>
        )}
      </Paper>

      <ConfirmDialog
        open={deletePostOpen}
        title="حذف الخبر"
        message={`هل تريد حذف «${post.title}» نهائياً؟ سيختفي من التطبيق فوراً.`}
        confirmLabel="حذف"
        danger
        loading={deletingPost}
        onConfirm={confirmDeletePost}
        onClose={() => setDeletePostOpen(false)}
      />

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}>
        <Alert onClose={() => setSnack((s) => ({ ...s, open: false }))} severity={snack.severity} variant="filled" sx={{ borderRadius: 3 }}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Stack>
  )
}
