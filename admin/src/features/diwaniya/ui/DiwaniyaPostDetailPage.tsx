import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Typography,
  Stack,
  Button,
  Paper,
  TextField,
  CircularProgress,
  IconButton,
  Skeleton,
  Snackbar,
  Alert,
} from '@mui/material'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import ForumIcon from '@mui/icons-material/Forum'
import type { DiwaniyaComment } from '../domain/diwaniya.types'
import { setCommentHidden, addAdminComment, setPostHidden, setPostPollStatus, saveDiwaniyaReport } from '../data/diwaniya.service'
import { useDiwaniyaPost } from './useDiwaniyaPost'
import { usePostComments } from './usePostComments'
import DiwaniyaPostCard from './components/DiwaniyaPostCard'
import CommentThread from './components/CommentThread'
import { useAuth } from '@/features/auth/ui/useAuth'

export default function DiwaniyaPostDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, adminDoc } = useAuth()
  const { post, loading } = useDiwaniyaPost(id)
  const { comments, loading: commentsLoading } = usePostComments(id)

  const [topReply, setTopReply] = useState('')
  const [postingReply, setPostingReply] = useState(false)
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  const runAction = async (action: () => Promise<void>) => {
    try {
      await action()
    } catch {
      setFeedback({ kind: 'error', text: 'حدث خطأ أثناء تنفيذ العملية' })
    }
  }

  const submitTopReply = async () => {
    const text = topReply.trim()
    if (!text || !user || !adminDoc || postingReply || !id) return
    setPostingReply(true)
    try {
      await addAdminComment({ postId: id, parentId: null, parentRootId: null, parentDepth: 0, text, admin: { uid: user.uid, name: adminDoc.name } })
      setTopReply('')
    } catch {
      setFeedback({ kind: 'error', text: 'حدث خطأ أثناء نشر التعليق' })
    } finally {
      setPostingReply(false)
    }
  }

  const handleReply = async (parent: DiwaniyaComment, text: string) => {
    if (!user || !adminDoc) return
    await runAction(() =>
      addAdminComment({
        postId: parent.postId,
        parentId: parent.id,
        parentRootId: parent.rootId ?? parent.id,
        parentDepth: parent.depth,
        text,
        admin: { uid: user.uid, name: adminDoc.name },
      }),
    )
  }

  if (loading) {
    return (
      <Stack alignItems="center" sx={{ py: 10 }}>
        <CircularProgress />
      </Stack>
    )
  }

  if (!post || !id) {
    return (
      <Stack spacing={2}>
        <IconButton onClick={() => navigate('/diwaniya')} sx={{ alignSelf: 'flex-start', color: 'text.secondary' }}>
          <ArrowForwardIcon />
        </IconButton>
        <Paper sx={{ p: 5, borderRadius: 4, textAlign: 'center', bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)' }}>
          <Typography variant="h6">المنشور غير موجود</Typography>
        </Paper>
      </Stack>
    )
  }

  return (
    <Stack spacing={3}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <IconButton onClick={() => navigate('/diwaniya')} sx={{ color: 'text.secondary', '&:hover': { color: '#FEBE10' } }}>
          <ArrowForwardIcon />
        </IconButton>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>
          تفاصيل المنشور
        </Typography>
      </Stack>

      <DiwaniyaPostCard
        post={post}
        variant="hero"
        disableNavigation
        onToggleStatus={(p) => void runAction(() => setPostPollStatus(p.id, p.pollStatus === 'open' ? 'closed' : 'open'))}
        onHideRestore={(p) => {
          if (!adminDoc) return
          void runAction(() => setPostHidden(p.id, !p.hidden, adminDoc.name))
        }}
      />

      <Paper sx={{ p: 2.5, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(14px)' }}>
        <Stack spacing={2}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <ForumIcon sx={{ fontSize: 20, color: '#90CAF9' }} />
            <Typography variant="h6" sx={{ fontWeight: 800, flexGrow: 1 }}>
              النقاش ({comments.length})
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="flex-start">
            <TextField
              size="small"
              fullWidth
              multiline
              minRows={1}
              maxRows={4}
              placeholder="شارك بتعليق كإدارة…"
              value={topReply}
              onChange={(e) => setTopReply(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void submitTopReply()
                }
              }}
            />
            <Button variant="contained" onClick={() => void submitTopReply()} disabled={!topReply.trim() || postingReply} startIcon={postingReply ? <CircularProgress size={15} color="inherit" /> : undefined}>
              نشر
            </Button>
          </Stack>

          {commentsLoading ? (
            <Stack spacing={1.5}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} height={56} sx={{ borderRadius: 2 }} />
              ))}
            </Stack>
          ) : comments.length === 0 ? (
            <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 2 }}>
              لا توجد تعليقات بعد — ابدأ النقاش.
            </Typography>
          ) : (
            <CommentThread
              comments={comments}
              onReply={handleReply}
              onHideRestore={(c) => {
                if (!adminDoc) return
                void runAction(() => setCommentHidden(c.id, !c.hidden, adminDoc.name))
              }}
              onReport={async (c, reason) => {
                if (!user) return
                await runAction(() => saveDiwaniyaReport('comment', c.id, user.uid, reason))
              }}
            />
          )}
        </Stack>
      </Paper>

      <Snackbar open={feedback !== null} autoHideDuration={3200} onClose={() => setFeedback(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}>
        <Alert variant="filled" severity={feedback?.kind ?? 'info'} onClose={() => setFeedback(null)} sx={{ width: '100%' }}>
          {feedback?.text}
        </Alert>
      </Snackbar>
    </Stack>
  )
}
