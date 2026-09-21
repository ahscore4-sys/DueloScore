import { useMemo, useState } from 'react'
import {
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import ReplyIcon from '@mui/icons-material/Reply'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import VisibilityIcon from '@mui/icons-material/Visibility'
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined'
import type { DiwaniyaComment } from '../../domain/diwaniya.types'
import { MAX_COMMENT_DEPTH, tierAccent } from '../../domain/diwaniya.types'
import { timeAgo } from '../timeAgo'

interface CommentThreadProps {
  comments: DiwaniyaComment[]
  onReply: (parent: DiwaniyaComment, text: string) => Promise<void>
  onHideRestore: (comment: DiwaniyaComment) => void
  onReport: (comment: DiwaniyaComment, reason: string) => Promise<void>
}

interface CommentItemProps {
  comment: DiwaniyaComment
  childrenMap: Map<string, DiwaniyaComment[]>
  onReply: (parent: DiwaniyaComment, text: string) => Promise<void>
  onHideRestore: (comment: DiwaniyaComment) => void
  onReportRequest: (comment: DiwaniyaComment) => void
}

function CommentItem({ comment, childrenMap, onReply, onHideRestore, onReportRequest }: CommentItemProps) {
  const [replying, setReplying] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const replies = childrenMap.get(comment.id) ?? []
  const canHaveReplies = comment.depth < MAX_COMMENT_DEPTH
  const initial = comment.authorName.trim().charAt(0) || '؟'

  const submitReply = async () => {
    const text = replyText.trim()
    if (!text || submitting) return
    setSubmitting(true)
    try {
      await onReply(comment, text)
      setReplyText('')
      setReplying(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Box>
      {comment.hidden ? (
        <Paper
          sx={{
            px: 2,
            py: 1,
            borderRadius: 3,
            bgcolor: 'rgba(255,82,82,0.06)',
            border: '1px dashed rgba(255,82,82,0.35)',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <VisibilityOffIcon sx={{ fontSize: 16, color: '#FF8A80' }} />
          <Typography variant="caption" sx={{ fontWeight: 800, color: '#FF8A80', flexGrow: 1 }}>
            تعليق مخفي بواسطة المشرف
          </Typography>
          <Tooltip title="إظهار التعليق" placement="top">
            <IconButton size="small" onClick={() => onHideRestore(comment)} sx={{ color: '#FF8A80' }}>
              <VisibilityIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Paper>
      ) : (
        <Stack direction="row" spacing={1.25} alignItems="flex-start">
          <Avatar sx={{ width: 34, height: 34, fontWeight: 900, fontSize: 14, bgcolor: 'rgba(0,87,168,0.3)', border: '2px solid rgba(0,87,168,0.55)' }}>
            {initial}
          </Avatar>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Paper sx={{ px: 1.75, py: 1.25, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
                <Typography sx={{ fontWeight: 800, fontSize: 13.5 }}>{comment.authorName}</Typography>
                {comment.authorTier && (
                  <Chip label={comment.authorTier} size="small" sx={{ height: 17, fontSize: 9.5, fontWeight: 800, bgcolor: `${tierAccent(comment.authorTier)}22`, color: tierAccent(comment.authorTier), border: `1px solid ${tierAccent(comment.authorTier)}55` }} />
                )}
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  · {timeAgo(comment.createdAt)}
                </Typography>
                {comment.reportCount > 0 && (
                  <Chip icon={<FlagOutlinedIcon sx={{ fontSize: 11 }} />} label={`${comment.reportCount}`} size="small" sx={{ height: 18, fontSize: 10, fontWeight: 800, bgcolor: 'rgba(255,179,0,0.12)', color: '#FFB300', border: '1px solid rgba(255,179,0,0.4)', '& .MuiChip-icon': { color: '#FFB300' } }} />
                )}
                <Box sx={{ flexGrow: 1 }} />
                <Tooltip title={canHaveReplies ? 'رد' : 'بلغتَ الحد الأقصى للردود'} placement="top">
                  <span>
                    <IconButton size="small" disabled={!canHaveReplies} onClick={() => setReplying((v) => !v)} sx={{ color: canHaveReplies ? '#90CAF9' : 'text.disabled' }}>
                      <ReplyIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="إبلاغ عن التعليق" placement="top">
                  <IconButton size="small" onClick={() => onReportRequest(comment)} sx={{ color: 'text.secondary', '&:hover': { color: '#FFB300' } }}>
                    <FlagOutlinedIcon sx={{ fontSize: 15 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="إخفاء التعليق" placement="top">
                  <IconButton size="small" onClick={() => onHideRestore(comment)} sx={{ color: 'text.secondary', '&:hover': { color: '#FF1744' } }}>
                    <VisibilityOffIcon sx={{ fontSize: 15 }} />
                  </IconButton>
                </Tooltip>
              </Stack>
              <Typography sx={{ mt: 0.5, fontSize: 13.5, lineHeight: 1.8, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{comment.text}</Typography>
            </Paper>

            {replying && (
              <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ mt: 1 }}>
                <TextField
                  size="small"
                  fullWidth
                  multiline
                  minRows={1}
                  maxRows={4}
                  autoFocus
                  placeholder={`رد على ${comment.authorName}…`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      void submitReply()
                    }
                  }}
                />
                <Button variant="contained" size="small" onClick={() => void submitReply()} disabled={!replyText.trim() || submitting}>
                  رد
                </Button>
              </Stack>
            )}
          </Box>
        </Stack>
      )}

      {replies.length > 0 && (
        <Stack spacing={1.25} sx={{ mt: 1.25, marginInlineStart: 3, paddingInlineStart: 1.5, borderInlineStart: '2px solid rgba(255,255,255,0.08)' }}>
          {replies.map((child) => (
            <CommentItem key={child.id} comment={child} childrenMap={childrenMap} onReply={onReply} onHideRestore={onHideRestore} onReportRequest={onReportRequest} />
          ))}
        </Stack>
      )}
    </Box>
  )
}

export default function CommentThread(props: CommentThreadProps) {
  const { comments } = props
  const [reportTarget, setReportTarget] = useState<DiwaniyaComment | null>(null)
  const [reportReason, setReportReason] = useState('')
  const [reporting, setReporting] = useState(false)

  const childrenMap = useMemo(() => {
    const map = new Map<string, DiwaniyaComment[]>()
    for (const c of comments) {
      if (!c.parentId) continue
      const list = map.get(c.parentId) ?? []
      list.push(c)
      map.set(c.parentId, list)
    }
    return map
  }, [comments])

  const roots = useMemo(() => comments.filter((c) => !c.parentId), [comments])

  const submitReport = async () => {
    if (!reportTarget || !reportReason.trim() || reporting) return
    setReporting(true)
    try {
      await props.onReport(reportTarget, reportReason)
      setReportTarget(null)
      setReportReason('')
    } finally {
      setReporting(false)
    }
  }

  return (
    <Stack spacing={1.75}>
      {roots.map((root) => (
        <CommentItem key={root.id} comment={root} childrenMap={childrenMap} onReply={props.onReply} onHideRestore={props.onHideRestore} onReportRequest={setReportTarget} />
      ))}

      <Dialog open={reportTarget !== null} onClose={() => (reporting ? undefined : setReportTarget(null))} maxWidth="xs" fullWidth>
        <DialogTitle>إبلاغ عن التعليق</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={2}
            label="سبب البلاغ"
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            sx={{ mt: 0.5 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReportTarget(null)} disabled={reporting} sx={{ color: 'text.secondary' }}>
            إلغاء
          </Button>
          <Button variant="contained" color="warning" onClick={() => void submitReport()} disabled={!reportReason.trim() || reporting}>
            إرسال البلاغ
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
