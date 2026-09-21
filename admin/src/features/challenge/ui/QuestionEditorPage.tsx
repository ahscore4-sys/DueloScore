import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Box, Typography, Stack, Button, Paper, TextField, CircularProgress, IconButton, Radio, FormControlLabel, Switch } from '@mui/material'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'
import type { ChallengeQuestionType } from '../domain/challenge.types'
import { QUESTION_OPTIONS_COUNT, CHALLENGE_TYPES } from '../domain/challenge.types'
import { saveQuestion, deleteQuestion } from '../data/questions.service'
import { useQuestion } from './useQuestion'
import ImageDropZone from '@/core/ui/components/ImageDropZone'
import ChipSelector from '@/core/ui/components/ChipSelector'
import ConfirmDialog from '@/core/ui/components/ConfirmDialog'

export default function QuestionEditorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  const { question, loading: questionLoading } = useQuestion(id)

  const [type, setType] = useState<ChallengeQuestionType>('text')
  const [questionText, setQuestionText] = useState('')
  const [options, setOptions] = useState<string[]>(Array(QUESTION_OPTIONS_COUNT).fill(''))
  const [correctAnswer, setCorrectAnswer] = useState(0)
  const [active, setActive] = useState(true)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)
  const [confirmSave, setConfirmSave] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filledRef = useRef<string | null>(null)

  useEffect(() => {
    if (question && filledRef.current !== question.id) {
      filledRef.current = question.id
      setType(question.type)
      setQuestionText(question.question)
      setOptions(question.options)
      setCorrectAnswer(question.correctAnswer)
      setActive(question.active)
      setImagePreview(question.imageUrl || null)
    }
  }, [question])

  const mark = (field: string) => setTouched((t) => ({ ...t, [field]: true }))

  const questionError = touched.question && !questionText.trim()
  const hasEmptyOption = options.some((o) => !o.trim())
  const optionsError = touched.options && hasEmptyOption
  const imageMissing = isEdit ? false : type === 'image' && !imageFile && !imagePreview

  const canSave = useMemo(
    () => Boolean(questionText.trim()) && !hasEmptyOption && !imageMissing,
    [questionText, hasEmptyOption, imageMissing],
  )

  const updateOption = (index: number, value: string) => {
    setOptions((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  const onFileSelected = (file: File) => {
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview)
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const onClearImage = () => {
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview)
    setImageFile(null)
    setImagePreview(isEdit ? question?.imageUrl || null : null)
  }

  const doSave = async () => {
    if (!canSave || saving) return
    setSaving(true)
    setError(null)
    try {
      await saveQuestion({
        id,
        type,
        question: questionText,
        options,
        correctAnswer,
        difficulty: 'easy',
        active,
        imageFile,
        existingImageUrl: isEdit ? question?.imageUrl ?? null : null,
        existingImagePath: isEdit ? question?.imagePath ?? null : null,
        removeExistingImage: type === 'text' && isEdit && question?.imagePath != null,
      })
      navigate('/challenges/bank')
    } catch {
      setError('حدث خطأ أثناء الحفظ. تحقق من اتصالك وحاول مجدداً.')
    } finally {
      setSaving(false)
    }
  }

  const doDelete = async () => {
    if (!question || deleting) return
    setDeleting(true)
    try {
      await deleteQuestion(question)
      navigate('/challenges/bank')
    } catch {
      setError('حدث خطأ أثناء الحذف.')
    } finally {
      setDeleting(false)
    }
  }

  if (isEdit && questionLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress sx={{ color: '#FEBE10' }} />
      </Box>
    )
  }

  if (isEdit && !question) {
    return (
      <Stack spacing={2} alignItems="center" sx={{ py: 10 }}>
        <Typography variant="h5">السؤال غير موجود</Typography>
        <Button variant="contained" onClick={() => navigate('/challenges/bank')}>
          العودة إلى البنك
        </Button>
      </Stack>
    )
  }

  return (
    <Stack spacing={3}>
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <IconButton onClick={() => navigate(-1)} sx={{ color: 'text.secondary', border: '1px solid rgba(255,255,255,0.12)' }}>
          <ArrowForwardIcon />
        </IconButton>
        <Stack spacing={0.25}>
          <Typography variant="h4">{isEdit ? 'تعديل السؤال' : 'إضافة سؤال جديد'}</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {isEdit ? 'حدّث بيانات السؤال ثم احفظ التعديلات' : 'أضف سؤالاً جديداً ليدخل في بنك التحديات'}
          </Typography>
        </Stack>
      </Stack>

      <Paper sx={{ p: 3, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(14px)' }}>
        <Stack spacing={2.5}>
          <Box onClick={() => mark('type')} sx={{ cursor: 'default' }}>
            <ChipSelector label="نوع السؤال" options={CHALLENGE_TYPES} value={type} onChange={(v) => v && setType(v)} disabled={saving} />
          </Box>

          <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap alignItems="flex-start">
            <Stack spacing={2.5} sx={{ flexGrow: 1, minWidth: 280 }}>
              <TextField
                label="نص السؤال (Question)"
                fullWidth
                multiline
                minRows={2}
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                onBlur={() => mark('question')}
                error={Boolean(questionError)}
                helperText={questionError ? 'نص السؤال مطلوب' : ' '}
              />

              <Stack spacing={1.5} onClick={() => mark('options')} sx={{ cursor: 'default' }}>
                <Typography sx={{ fontWeight: 800, fontSize: 13, color: 'text.secondary' }}>الخيارات (Options)</Typography>
                {options.map((opt, i) => (
                  <Stack key={i} direction="row" alignItems="center" spacing={1}>
                    <FormControlLabel
                      control={<Radio checked={correctAnswer === i} onChange={() => setCorrectAnswer(i)} size="small" sx={{ color: '#FEBE10', '&.Mui-checked': { color: '#00E676' } }} />}
                      label=""
                      sx={{ m: 0 }}
                    />
                    <TextField
                      size="small"
                      fullWidth
                      placeholder={`الخيار ${i + 1}`}
                      value={opt}
                      onChange={(e) => updateOption(i, e.target.value)}
                      error={touched.options && !opt.trim()}
                    />
                  </Stack>
                ))}
                {optionsError && (
                  <Typography variant="caption" sx={{ color: '#FF5252' }}>
                    جميع الخيارات مطلوبة
                  </Typography>
                )}
              </Stack>

              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Typography sx={{ fontWeight: 800, fontSize: 13, color: 'text.secondary' }}>مفعّل</Typography>
                <Switch checked={active} onChange={(e) => setActive(e.target.checked)} disabled={saving} size="small" />
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {active ? 'يدخل في السحب' : 'لا يدخل في السحب'}
                </Typography>
              </Stack>
            </Stack>

            {type === 'image' && (
              <Box sx={{ width: { xs: '100%', sm: 380 }, flexShrink: 0 }}>
                <Typography sx={{ fontWeight: 800, fontSize: 13, color: 'text.secondary', mb: 1 }}>صورة السؤال</Typography>
                <ImageDropZone
                  previewUrl={imagePreview}
                  maxWidth={380}
                  disabled={saving}
                  aspectRatio="1 / 1"
                  ratioLabel="1:1"
                  outputWidth={1024}
                  outputHeight={1024}
                  filePrefix="challenge_question"
                  onFileSelected={onFileSelected}
                  onClear={onClearImage}
                />
                {imageMissing && touched.image && (
                  <Typography variant="caption" sx={{ color: '#FF5252', display: 'block', mt: 0.5 }}>
                    صورة السؤال مطلوبة لأسئلة الصور المشوهة
                  </Typography>
                )}
              </Box>
            )}
          </Stack>

          {error && (
            <Typography sx={{ color: '#FF8A80', fontWeight: 700 }}>{error}</Typography>
          )}

          <Stack direction="row" spacing={1.5} justifyContent="flex-end">
            {isEdit && (
              <Button color="error" onClick={() => setConfirmDelete(true)} disabled={saving || deleting}>
                حذف السؤال
              </Button>
            )}
            <Button onClick={() => navigate(-1)} disabled={saving} sx={{ color: 'text.secondary' }}>
              إلغاء
            </Button>
            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveOutlinedIcon />}
              disabled={!canSave || saving}
              onClick={() => {
                mark('question')
                mark('options')
                mark('image')
                if (isEdit) doSave()
                else setConfirmSave(true)
              }}
            >
              {saving ? 'جارٍ الحفظ…' : isEdit ? 'حفظ التعديلات' : 'إضافة السؤال'}
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <ConfirmDialog
        open={confirmSave}
        title="إضافة السؤال"
        message="هل تريد إضافة هذا السؤال إلى البنك؟ يمكنك تعطيله لاحقاً من قائمة الأسئلة."
        confirmLabel="إضافة"
        loading={saving}
        onConfirm={() => { setConfirmSave(false); void doSave() }}
        onClose={() => setConfirmSave(false)}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="حذف السؤال (Delete Question)"
        message="هل تريد حذف السؤال نهائياً؟ سيختفي من البنك ولن يُسحب في أي تحدي مستقبلاً."
        confirmLabel="حذف"
        danger
        loading={deleting}
        onConfirm={() => { setConfirmDelete(false); void doDelete() }}
        onClose={() => setConfirmDelete(false)}
      />
    </Stack>
  )
}
