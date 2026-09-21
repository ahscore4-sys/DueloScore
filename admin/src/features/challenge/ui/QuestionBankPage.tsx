import { useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Typography, Stack, Button, Paper, TextField, Skeleton, CircularProgress, Fab, Tooltip, IconButton } from '@mui/material'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import AddIcon from '@mui/icons-material/Add'
import SearchIcon from '@mui/icons-material/Search'
import QuizOutlinedIcon from '@mui/icons-material/QuizOutlined'
import type { ChallengeQuestion, ChallengeQuestionType } from '../domain/challenge.types'
import { CHALLENGE_TYPES } from '../domain/challenge.types'
import { useQuestions } from './useQuestions'
import { setQuestionActive, deleteQuestion } from '../data/questions.service'
import QuestionCard from './components/QuestionCard'
import ChipSelector from '@/core/ui/components/ChipSelector'
import ConfirmDialog from '@/core/ui/components/ConfirmDialog'

const TYPE_OPTIONS = CHALLENGE_TYPES.map((t) => ({ value: t.value, label: t.label }))
const STATUS_OPTIONS = [
  { value: 'active' as const, label: 'مفعل' },
  { value: 'inactive' as const, label: 'معطل' },
]

export default function QuestionBankPage() {
  const navigate = useNavigate()
  const [type, setType] = useState<ChallengeQuestionType | null>(null)
  const [status, setStatus] = useState<'active' | 'inactive' | null>(null)
  const [search, setSearch] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<ChallengeQuestion | null>(null)
  const [deleting, setDeleting] = useState(false)
  const { questions, setQuestions, loading, loadingMore, hasMore, loadMore } = useQuestions()

  const visible = useMemo(() => {
    let list = questions
    if (type) list = list.filter((q) => q.type === type)
    if (status) list = list.filter((q) => (status === 'active' ? q.active : !q.active))
    const q = search.trim()
    if (q) list = list.filter((item) => item.question.includes(q))
    return list
  }, [questions, type, status, search])

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteQuestion(deleteTarget)
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  const toggleActive = useCallback(async (question: ChallengeQuestion, active: boolean) => {
    await setQuestionActive(question.id, active)
    setQuestions((prev) => prev.map((q) => q.id === question.id ? { ...q, active } : q))
  }, [setQuestions])

  return (
    <Stack spacing={3}>
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <IconButton onClick={() => navigate(-1)} sx={{ color: 'text.secondary', border: '1px solid rgba(255,255,255,0.12)' }}>
          <ArrowForwardIcon />
        </IconButton>
        <Stack spacing={0.25}>
          <Typography variant="h4">بنك الأسئلة (Question Bank)</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            أضف أسئلة متنوعة ليتم سحبها عشوائياً في تحديات اليوم.
          </Typography>
        </Stack>
      </Stack>

      <Paper sx={{ p: 2, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(14px)', position: 'sticky', top: 0, zIndex: 5 }}>
        <Stack spacing={2}>
          <TextField
            size="small"
            placeholder="بحث في نص السؤال…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            slotProps={{ input: { startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} /> } }}
          />
          <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
            <ChipSelector label="النوع" options={TYPE_OPTIONS} value={type} onChange={setType} allowEmpty />
            <ChipSelector label="الحالة" options={STATUS_OPTIONS} value={status} onChange={setStatus} allowEmpty />
          </Stack>
        </Stack>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
          {[0, 1, 2, 3].map((i) => (
            <Paper key={i} sx={{ p: 2.5, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <Skeleton width="25%" height={24} />
              <Skeleton sx={{ mt: 1 }} height={30} />
              <Skeleton height={22} />
              <Skeleton height={22} />
              <Skeleton variant="rectangular" sx={{ mt: 1.5, borderRadius: 3 }} height={100} />
            </Paper>
          ))}
        </Box>
      ) : visible.length === 0 ? (
        <Paper sx={{ p: 6, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', textAlign: 'center' }}>
          <Stack spacing={2} alignItems="center">
            <Box sx={{ width: 84, height: 84, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,87,168,0.15)', border: '1px solid rgba(0,87,168,0.4)', color: '#FEBE10' }}>
              <QuizOutlinedIcon sx={{ fontSize: 44 }} />
            </Box>
            <Typography variant="h5">لا توجد أسئلة بعد</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 440 }}>
              أضف الأسئلة وفعّلها لتظهر في التحديات اليومية.
            </Typography>
            <Button variant="contained" onClick={() => navigate('/challenges/bank/new')} sx={{ gap: 1 }}>
              <AddIcon />
              إضافة سؤال
            </Button>
          </Stack>
        </Paper>
      ) : (
        <>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
            {visible.map((q) => (
              <QuestionCard key={q.id} question={q} onToggleActive={toggleActive} onDelete={setDeleteTarget} />
            ))}
          </Box>
          {hasMore && (
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Button
                variant="outlined"
                onClick={loadMore}
                disabled={loadingMore}
                startIcon={loadingMore ? <CircularProgress size={16} /> : undefined}
                sx={{ px: 4, borderColor: 'rgba(254,190,16,0.5)', color: '#FEBE10', '&:hover': { borderColor: '#FEBE10', bgcolor: 'rgba(254,190,16,0.08)' } }}
              >
                {loadingMore ? 'جارٍ التحميل…' : 'تحميل المزيد'}
              </Button>
            </Box>
          )}
        </>
      )}

      <Tooltip title="إضافة سؤال" placement="top">
        <Fab
          color="primary"
          aria-label="إضافة سؤال"
          onClick={() => navigate('/challenges/bank/new')}
          sx={{ position: 'fixed', bottom: 24, left: 24, background: 'linear-gradient(135deg, #00E676, #00C853)', color: '#062A16', '&:hover': { background: 'linear-gradient(135deg, #00E676, #00A84C)' } }}
        >
          <AddIcon />
        </Fab>
      </Tooltip>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="حذف السؤال (Delete Question)"
        message={`هل تريد حذف السؤال نهائياً؟ سيختفي من البنك ولن يُسحب في أي تحدي مستقبلاً.`}
        confirmLabel="حذف"
        danger
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </Stack>
  )
}
