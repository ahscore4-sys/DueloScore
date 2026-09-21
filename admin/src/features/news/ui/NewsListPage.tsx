import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Typography, Stack, Button, Paper, TextField, Skeleton, CircularProgress, Fab, Tooltip } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import SearchIcon from '@mui/icons-material/Search'
import ArticleIcon from '@mui/icons-material/Article'
import type { NewsPost, NewsTag, NewsTeam } from '../domain/news.types'
import { NEWS_TEAM_FILTERS, NEWS_TAGS, teamAccent } from '../domain/news.types'
import { useNewsPosts } from './useNewsPosts'
import { deleteNewsPost } from '../data/news.service'
import NewsPostCard from './components/NewsPostCard'
import ChipSelector from '@/core/ui/components/ChipSelector'
import ConfirmDialog from '@/core/ui/components/ConfirmDialog'

export default function NewsListPage() {
  const navigate = useNavigate()
  const [team, setTeam] = useState<NewsTeam | null>(null)
  const [tag, setTag] = useState<NewsTag | null>(null)
  const [search, setSearch] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<NewsPost | null>(null)
  const [deleting, setDeleting] = useState(false)

  const { posts, loading, loadingMore, hasMore, loadMore } = useNewsPosts({ team: team ?? undefined, tag: tag ?? undefined })

  const visiblePosts = useMemo(() => {
    const q = search.trim()
    if (!q) return posts
    return posts.filter((p) => p.title.includes(q) || p.content.includes(q) || p.author.includes(q))
  }, [posts, search])

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteNewsPost(deleteTarget)
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Stack spacing={3}>
      <Stack spacing={0.5}>
        <Typography variant="h4">الأخبار (News)</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          نشر ومتابعة أخبار برشلونة وريال مدريد
        </Typography>
      </Stack>

      <Paper sx={{ p: 2, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(14px)', position: 'sticky', top: 0, zIndex: 5 }}>
        <Stack spacing={2}>
          <TextField
            size="small"
            placeholder="بحث بالعنوان أو المحتوى أو الكاتب…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            slotProps={{ input: { startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} /> } }}
          />
          <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
            <ChipSelector label="الفريق" options={NEWS_TEAM_FILTERS} value={team} onChange={setTeam} allowEmpty accent={teamAccent} />
            <ChipSelector label="التصنيف" options={NEWS_TAGS} value={tag} onChange={setTag} allowEmpty emptyLabel="عام" />
          </Stack>
        </Stack>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
          {[0, 1, 2, 3].map((i) => (
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
              <Skeleton variant="rectangular" sx={{ mt: 1.5, borderRadius: 3 }} height={180} />
            </Paper>
          ))}
        </Box>
      ) : visiblePosts.length === 0 ? (
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
              <ArticleIcon sx={{ fontSize: 44 }} />
            </Box>
            <Typography variant="h5">لا توجد أخبار بعد</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 440 }}>
              ابدأ بنشر أول خبر ليصل إلى مشجعي الفريقين مع إشعار فوري.
            </Typography>
            <Button variant="contained" onClick={() => navigate('/news/new')} sx={{ gap: 1 }}>
              <AddIcon />
              إنشاء خبر
            </Button>
          </Stack>
        </Paper>
      ) : (
        <>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
            {visiblePosts.map((post) => (
              <NewsPostCard key={post.id} post={post} onDelete={setDeleteTarget} />
            ))}
          </Box>
          {hasMore && (
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Button variant="outlined" onClick={loadMore} disabled={loadingMore} startIcon={loadingMore ? <CircularProgress size={16} /> : undefined} sx={{ px: 4, borderColor: 'rgba(254,190,16,0.5)', color: '#FEBE10', '&:hover': { borderColor: '#FEBE10', bgcolor: 'rgba(254,190,16,0.08)' } }}>
                {loadingMore ? 'جارٍ التحميل…' : 'تحميل المزيد'}
              </Button>
            </Box>
          )}
        </>
      )}

      <Tooltip title="إنشاء خبر" placement="top">
        <Fab
          color="primary"
          aria-label="إنشاء خبر"
          onClick={() => navigate('/news/new')}
          sx={{ position: 'fixed', bottom: 24, left: 24, background: 'linear-gradient(135deg, #00E676, #00C853)', color: '#062A16', '&:hover': { background: 'linear-gradient(135deg, #00E676, #00A84C)' } }}
        >
          <AddIcon />
        </Fab>
      </Tooltip>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="حذف الخبر (Delete Post)"
        message={`هل تريد حذف «${deleteTarget?.title ?? ''}» نهائياً؟ سيختفي من التطبيق فوراً مع كل تحديثاته المرتبطة.`}
        confirmLabel="حذف"
        danger
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </Stack>
  )
}
