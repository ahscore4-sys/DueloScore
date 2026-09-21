import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Stack,
  Button,
  Paper,
  TextField,
  Skeleton,
  CircularProgress,
  Fab,
  Tooltip,
  Tabs,
  Tab,
  Chip,
  IconButton,
  Snackbar,
  Alert,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import ForumIcon from '@mui/icons-material/Forum'
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined'
import RefreshIcon from '@mui/icons-material/Refresh'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import VisibilityIcon from '@mui/icons-material/Visibility'
import type { ReportQueueItem } from '../data/diwaniya.service'
import {
  setPostHidden,
  setPostPollStatus,
  setCommentHidden,
  saveModerationSettings,
} from '../data/diwaniya.service'
import { useDiwaniyaPosts } from './useDiwaniyaPosts'
import { useReportsQueue } from './useReportsQueue'
import { useModerationSettings } from './useModerationSettings'
import { timeAgo } from './timeAgo'
import DiwaniyaPostCard from './components/DiwaniyaPostCard'
import CreatePollDialog from './components/CreatePollDialog'
import { useAuth } from '@/features/auth/ui/useAuth'

export default function DiwaniyaHubPage() {
  const navigate = useNavigate()
  const { adminDoc } = useAuth()

  const [tab, setTab] = useState(0)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  const { posts, loading, loadingMore, hasMore, loadMore } = useDiwaniyaPosts()
  const heroPost = posts.length > 0 ? posts[0] : null
  const gridPosts = posts.slice(1)

  const runAction = async (action: () => Promise<void>, successText?: string) => {
    try {
      await action()
      if (successText) setFeedback({ kind: 'success', text: successText })
    } catch {
      setFeedback({ kind: 'error', text: 'حدث خطأ أثناء تنفيذ العملية' })
    }
  }

  return (
    <Stack spacing={3}>
      <Stack spacing={0.5}>
        <Typography variant="h4">الديوانية (Diwaniya)</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          إدارة المنشورات والإشراف على النقاشات بين مشجعي الفريقين
        </Typography>
      </Stack>

      <Paper sx={{ borderRadius: 3, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(14px)' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 1.5, '& .MuiTab-root': { fontWeight: 800, fontSize: 14, minHeight: 52 } }}>
          <Tab label="المنشورات" />
          <Tab
            label={
              <Stack direction="row" spacing={0.75} alignItems="center">
                <span>التقارير</span>
                <FlagOutlinedIcon sx={{ fontSize: 15, color: '#FFB300' }} />
              </Stack>
            }
          />
        </Tabs>
      </Paper>

      {tab === 0 && (
        <>
          {loading ? (
            <>
              <Paper sx={{ p: 3.5, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Skeleton variant="circular" width={52} height={52} />
                  <Box sx={{ flexGrow: 1 }}>
                    <Skeleton width="30%" height={24} />
                    <Skeleton width="18%" height={18} />
                  </Box>
                </Stack>
                <Skeleton sx={{ mt: 2 }} height={34} />
                <Skeleton height={26} />
                <Skeleton height={26} width="55%" />
              </Paper>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
                {[0, 1].map((i) => (
                  <Paper key={i} sx={{ p: 2.5, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Skeleton variant="circular" width={46} height={46} />
                      <Box sx={{ flexGrow: 1 }}>
                        <Skeleton width="30%" height={24} />
                        <Skeleton width="18%" height={18} />
                      </Box>
                    </Stack>
                    <Skeleton sx={{ mt: 1.5 }} height={30} />
                    <Skeleton height={22} />
                  </Paper>
                ))}
              </Box>
            </>
          ) : !heroPost ? (
            <Paper sx={{ p: 6, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', textAlign: 'center' }}>
              <Stack spacing={2} alignItems="center">
                <Box
                  sx={{
                    width: 84,
                    height: 84,
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'rgba(0, 87, 168, 0.15)',
                    border: '1px solid rgba(0, 87, 168, 0.4)',
                    color: '#FEBE10',
                  }}
                >
                  <ForumIcon sx={{ fontSize: 44 }} />
                </Box>
                <Typography variant="h5">لا توجد منشورات بعد</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 440 }}>
                  ابدأ بإنشاء أول منشور جدلي ليشاهد المشجعون ويشاركون في التصويت والنقاش.
                </Typography>
                <Button variant="contained" onClick={() => setDialogOpen(true)} sx={{ gap: 1 }}>
                  <AddIcon />
                  إنشاء منشور جدلي
                </Button>
              </Stack>
            </Paper>
          ) : (
            <>
              <DiwaniyaPostCard
                post={heroPost}
                variant="hero"
                onToggleStatus={(p) => void runAction(() => setPostPollStatus(p.id, p.pollStatus === 'open' ? 'closed' : 'open'))}
                onHideRestore={(p) => {
                  if (!adminDoc) return
                  void runAction(() => setPostHidden(p.id, !p.hidden, adminDoc.name))
                }}
              />

              {gridPosts.length > 0 && (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
                  {gridPosts.map((post) => (
                    <DiwaniyaPostCard
                      key={post.id}
                      post={post}
                      onToggleStatus={(p) => void runAction(() => setPostPollStatus(p.id, p.pollStatus === 'open' ? 'closed' : 'open'))}
                      onHideRestore={(p) => {
                        if (!adminDoc) return
                        void runAction(() => setPostHidden(p.id, !p.hidden, adminDoc.name))
                      }}
                    />
                  ))}
                </Box>
              )}

              {hasMore && (
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  <Button variant="outlined" onClick={loadMore} disabled={loadingMore} startIcon={loadingMore ? <CircularProgress size={16} /> : undefined} sx={{ px: 4, borderColor: 'rgba(254,190,16,0.5)', color: '#FEBE10', '&:hover': { borderColor: '#FEBE10', bgcolor: 'rgba(254,190,16,0.08)' } }}>
                    {loadingMore ? 'جارٍ التحميل…' : 'تحميل المزيد'}
                  </Button>
                </Box>
              )}
            </>
          )}

          <Tooltip title="إنشاء منشور جدلي" placement="top">
            <Fab
              color="primary"
              aria-label="إنشاء منشور جدلي"
              onClick={() => setDialogOpen(true)}
              sx={{ position: 'fixed', bottom: 24, left: 24, background: 'linear-gradient(135deg, #00E676, #00C853)', color: '#062A16', '&:hover': { background: 'linear-gradient(135deg, #00E676, #00A84C)' } }}
            >
              <AddIcon />
            </Fab>
          </Tooltip>

          <CreatePollDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onCreated={(postId) => navigate(`/diwaniya/${postId}`)} />
        </>
      )}

      {tab === 1 && <ReportsTab adminName={adminDoc?.name ?? ''} onFeedback={setFeedback} />}

      <Snackbar
        open={feedback !== null}
        autoHideDuration={3200}
        onClose={() => setFeedback(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert variant="filled" severity={feedback?.kind ?? 'info'} onClose={() => setFeedback(null)} sx={{ width: '100%' }}>
          {feedback?.text}
        </Alert>
      </Snackbar>
    </Stack>
  )
}

interface ReportsTabProps {
  adminName: string
  onFeedback: (fb: { kind: 'success' | 'error'; text: string } | null) => void
}

function ReportsTab({ adminName, onFeedback }: ReportsTabProps) {
  const navigate = useNavigate()
  const { items, loading, refresh } = useReportsQueue()
  const { autoHideThreshold } = useModerationSettings()
  const [thresholdInput, setThresholdInput] = useState('')
  const [savingThreshold, setSavingThreshold] = useState(false)
  const [busyTarget, setBusyTarget] = useState<string | null>(null)

  useEffect(() => {
    setThresholdInput(String(autoHideThreshold))
  }, [autoHideThreshold])

  const thresholdValue = Number(thresholdInput)
  const thresholdValid = thresholdInput !== '' && Number.isInteger(thresholdValue) && thresholdValue >= 0

  const saveThreshold = async () => {
    if (!thresholdValid || savingThreshold) return
    setSavingThreshold(true)
    try {
      await saveModerationSettings({ autoHideThreshold: thresholdValue })
      onFeedback({ kind: 'success', text: 'تم حفظ الإعدادات' })
    } catch {
      onFeedback({ kind: 'error', text: 'حدث خطأ أثناء الحفظ' })
    } finally {
      setSavingThreshold(false)
    }
  }

  const toggleTarget = async (item: ReportQueueItem) => {
    if (!adminName || busyTarget) return
    setBusyTarget(`${item.targetType}:${item.targetId}`)
    try {
      if (item.targetType === 'comment') await setCommentHidden(item.targetId, !item.hidden, adminName)
      else await setPostHidden(item.targetId, !item.hidden, adminName)
      refresh()
    } catch {
      onFeedback({ kind: 'error', text: 'حدث خطأ أثناء تنفيذ العملية' })
    } finally {
      setBusyTarget(null)
    }
  }

  const openTarget = (item: ReportQueueItem) => {
    const postId = item.postId ?? item.targetId
    navigate(`/diwaniya/${postId}`)
  }

  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 2.5, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(14px)' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }}>
          <Box sx={{ flexGrow: 1 }}>
            <Typography sx={{ fontWeight: 800 }}>الإخفاء التلقائي</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              يُخفى المنشور أو التعليق تلقائياً عند وصول عدد البلاغات إلى هذا الحد — ضع 0 لتعطيل الميزة.
            </Typography>
          </Box>
          <TextField
            size="small"
            type="number"
            sx={{ width: { xs: '100%', sm: 140 } }}
            label="حد البلاغات"
            value={thresholdInput}
            onChange={(e) => setThresholdInput(e.target.value)}            error={thresholdInput !== '' && !thresholdValid}
            inputProps={{ min: 0, step: 1 }}
          />
          <Button variant="contained" onClick={() => void saveThreshold()} disabled={!thresholdValid || savingThreshold} startIcon={savingThreshold ? <CircularProgress size={16} color="inherit" /> : undefined}>
            حفظ
          </Button>
        </Stack>
      </Paper>

      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          قائمة البلاغات ({items.length})
        </Typography>
        <Tooltip title="تحديث" placement="top">
          <IconButton size="small" onClick={refresh} sx={{ color: 'text.secondary', '&:hover': { color: '#FEBE10' } }}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>

      {loading ? (
        <Stack spacing={1.5}>
          {[0, 1, 2].map((i) => (
            <Paper key={i} sx={{ p: 2, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <Skeleton height={24} width="40%" />
              <Skeleton height={20} width="80%" />
            </Paper>
          ))}
        </Stack>
      ) : items.length === 0 ? (
        <Paper sx={{ p: 5, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', textAlign: 'center' }}>
          <Stack spacing={1.5} alignItems="center">
            <FlagOutlinedIcon sx={{ fontSize: 40, color: '#FEBE10' }} />
            <Typography variant="h6">لا توجد بلاغات</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              ستظهر هنا المنشورات والتعليقات التي يبلّغ عنها المستخدمون.
            </Typography>
          </Stack>
        </Paper>
      ) : (
        <Stack spacing={1.5}>
          {items.map((item) => {
            const busy = busyTarget === `${item.targetType}:${item.targetId}`
            return (
              <Paper
                key={`${item.targetType}-${item.targetId}`}
                sx={{ p: 2, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <Stack spacing={1}>
                  <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip label={item.targetType === 'comment' ? 'تعليق' : 'منشور'} size="small" sx={{ height: 22, fontSize: 11, fontWeight: 800, bgcolor: 'rgba(0,87,168,0.18)', color: '#90CAF9', border: '1px solid rgba(0,87,168,0.5)' }} />
                    <Chip icon={<FlagOutlinedIcon sx={{ fontSize: 12 }} />} label={`${item.count} ${item.count > 1 ? 'بلاغات' : 'بلاغ'}`} size="small" sx={{ height: 22, fontSize: 11, fontWeight: 800, bgcolor: 'rgba(255,179,0,0.12)', color: '#FFB300', border: '1px solid rgba(255,179,0,0.4)', '& .MuiChip-icon': { color: '#FFB300' } }} />
                    {item.hidden && (
                      <Chip icon={<VisibilityOffIcon sx={{ fontSize: 12 }} />} label="مخفي حالياً" size="small" sx={{ height: 22, fontSize: 11, fontWeight: 800, bgcolor: 'rgba(255,82,82,0.12)', color: '#FF8A80', border: '1px solid rgba(255,82,82,0.4)', '& .MuiChip-icon': { color: '#FF8A80' } }} />
                    )}
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      آخر بلاغ · {timeAgo(item.latestAt)}
                    </Typography>
                    <Box sx={{ flexGrow: 1 }} />
                    <Button size="small" onClick={() => openTarget(item)} startIcon={<OpenInNewIcon />} sx={{ fontSize: 12, fontWeight: 800, color: '#FEBE10' }}>
                      عرض
                    </Button>
                    <Button
                      size="small"
                      onClick={() => void toggleTarget(item)}
                      disabled={busy || !adminName}
                      startIcon={busy ? <CircularProgress size={13} color="inherit" /> : item.hidden ? <VisibilityIcon /> : <VisibilityOffIcon />}
                      sx={{ fontSize: 12, fontWeight: 800, color: item.hidden ? '#00E676' : '#FF8A80' }}
                    >
                      {item.hidden ? 'إظهار' : 'إخفاء'}
                    </Button>
                  </Stack>
                  <Typography sx={{ fontSize: 13.5, lineHeight: 1.8, color: 'text.primary', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {item.preview ?? '(المحتوى غير متوفر — ربما حُذف هدفه)'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    سبب آخر بلاغ: «{item.latestReason}»
                  </Typography>
                </Stack>
              </Paper>
            )
          })}
        </Stack>
      )}
    </Stack>
  )
}
