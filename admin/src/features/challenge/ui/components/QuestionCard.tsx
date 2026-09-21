import { useNavigate } from 'react-router-dom'
import { Box, Typography, Stack, Paper, IconButton, Switch, Tooltip, Chip } from '@mui/material'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import NotesIcon from '@mui/icons-material/Notes'
import type { ChallengeQuestion } from '../../domain/challenge.types'
import { formatKuwaitDate, typeLabel } from '../../domain/challenge.types'

interface QuestionCardProps {
  question: ChallengeQuestion
  onToggleActive: (question: ChallengeQuestion, active: boolean) => void
  onDelete: (question: ChallengeQuestion) => void
}

export default function QuestionCard({ question, onToggleActive, onDelete }: QuestionCardProps) {
  const navigate = useNavigate()

  return (
    <Paper
      onClick={() => navigate(`/challenges/bank/${question.id}`)}
      sx={{
        p: 2.5,
        borderRadius: 4,
        bgcolor: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        opacity: question.active ? 1 : 0.55,
        cursor: 'pointer',
        transition: 'border-color 0.2s, transform 0.15s',
        '&:hover': {
          borderColor: 'rgba(0,87,168,0.5)',
          transform: 'translateY(-2px)',
        },
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} onClick={(e) => e.stopPropagation()}>
        <Box
          sx={{
            width: 34,
            height: 34,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(0,87,168,0.25)',
            border: '1px solid rgba(0,87,168,0.5)',
            color: '#90CAF9',
            flexShrink: 0,
          }}
        >
          {question.type === 'image' ? <ImageOutlinedIcon fontSize="small" /> : <NotesIcon fontSize="small" />}
        </Box>
        <Typography sx={{ fontWeight: 800, fontSize: 13, color: 'text.secondary', flexGrow: 1 }}>{typeLabel(question.type)}</Typography>
        <Tooltip title={question.active ? 'مفعل — يدخل في السحب' : 'معطل — لا يدخل في السحب'}>
          <Switch size="small" checked={question.active} onChange={(e) => onToggleActive(question, e.target.checked)} />
        </Tooltip>
      </Stack>

      {question.type === 'image' && question.imageUrl && (
        <Box
          component="img"
          src={question.imageUrl}
          alt="صورة السؤال"
          sx={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)' }}
        />
      )}

      <Typography sx={{ fontWeight: 700, lineHeight: 1.6 }}>{question.question || '(بدون نص سؤال)'}</Typography>

      <Stack spacing={0.75}>
        {question.options.map((opt, i) => {
          const correct = i === question.correctAnswer
          return (
            <Stack key={i} direction="row" alignItems="center" spacing={0.75}>
              <Typography sx={{ fontSize: 13, fontWeight: correct ? 800 : 400, color: correct ? '#00E676' : 'text.secondary', flexGrow: 1 }}>
                {`${i + 1}. ${opt || '—'}`}
              </Typography>
              {correct && <CheckCircleIcon sx={{ fontSize: 17, color: '#00E676' }} />}
            </Stack>
          )
        })}
      </Stack>

      <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 'auto', pt: 0.5 }}>
        {question.usedAt && (
          <Chip label="مستخدم سابقاً" size="small" sx={{ fontWeight: 700, fontSize: 11, height: 22, color: '#FFB300', bgcolor: 'rgba(255,179,0,0.11)', border: '1px solid rgba(255,179,0,0.33)' }} />
        )}
        <Typography variant="caption" sx={{ color: 'text.secondary', mr: 'auto' }}>
          {formatKuwaitDate(question.createdAt)}
        </Typography>
        <IconButton size="small" aria-label="تعديل السؤال" onClick={(e) => { e.stopPropagation(); navigate(`/challenges/bank/${question.id}`) }} sx={{ color: '#90CAF9' }}>
          <EditOutlinedIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" aria-label="حذف السؤال" onClick={(e) => { e.stopPropagation(); onDelete(question) }} sx={{ color: '#FF1744' }}>
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </Stack>
    </Paper>
  )
}
