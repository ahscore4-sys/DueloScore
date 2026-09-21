import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Box, Typography, Stack, Button, Paper, TextField, CircularProgress, IconButton, Chip } from '@mui/material'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import type { NewsTag, NewsTeam } from '../domain/news.types'
import { NEWS_TAGS, NEWS_TEAMS, teamAccent, SUMMARY_MIN_LENGTH, SUMMARY_MAX_LENGTH } from '../domain/news.types'
import { saveNewsPost, generateNewsSummary } from '../data/news.service'
import { useNewsPost } from './useNewsPost'
import { useAuth } from '@/features/auth/ui/useAuth'
import ImageDropZone from '@/core/ui/components/ImageDropZone'
import ChipSelector from '@/core/ui/components/ChipSelector'
import ConfirmDialog from '@/core/ui/components/ConfirmDialog'

export default function NewsEditorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  const { post, loading: postLoading } = useNewsPost(id)
  const { adminDoc } = useAuth()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [team, setTeam] = useState<NewsTeam | null>('all')
  const [tag, setTag] = useState<NewsTag | null>(null)
  const [author, setAuthor] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState('')
  const [summarySource, setSummarySource] = useState<'ai' | 'fallback' | null>(null)
  const [generatingSummary, setGeneratingSummary] = useState(false)

  useEffect(() => {
    if (!isEdit && !author && adminDoc?.name) setAuthor(adminDoc.name)
  }, [isEdit, author, adminDoc?.name])

  const filledRef = useRef<string | null>(null)

  useEffect(() => {
    if (post && filledRef.current !== post.id) {
      filledRef.current = post.id
      setTitle(post.title)
      setContent(post.content)
      setTeam(post.team)
      setTag(post.tag)
      setAuthor(post.author)
      setSourceUrl(post.sourceUrl ?? '')
      setSummary(post.summary ?? '')
      setImagePreview(post.imageUrl || null)
    }
  }, [post])

  const mark = (field: string) => setTouched((t) => ({ ...t, [field]: true }))

  const titleError = touched.title && !title.trim()
  const contentError = touched.content && !content.trim()
  const authorError = touched.author && !author.trim()
  const teamError = touched.team && !team
  const sourceUrlError = touched.sourceUrl && sourceUrl.trim() !== '' && !/^https?:\/\/.+/.test(sourceUrl.trim())
  const imageMissing = isEdit ? false : !imageFile

  const summaryError = touched.summary && summary.trim().length < SUMMARY_MIN_LENGTH

  const canSave = useMemo(
    () => Boolean(title.trim()) && Boolean(content.trim()) && Boolean(author.trim()) && team !== null && !sourceUrlError && !imageMissing && summary.trim().length >= SUMMARY_MIN_LENGTH,
    [title, content, author, team, sourceUrlError, imageMissing, summary],
  )

  const onFileSelected = (file: File) => {
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview)
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const onClearImage = () => {
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview)
    setImageFile(null)
    setImagePreview(isEdit ? post?.imageUrl || null : null)
  }

  const handleGenerateSummary = async () => {
    if (!title.trim() || !content.trim()) return
    setGeneratingSummary(true)
    try {
      const result = await generateNewsSummary(title, content)
      setSummary(result.summary)
      setSummarySource(result.source)
    } catch {
      setError('حدث خطأ أثناء توليد الملخص.')
    } finally {
      setGeneratingSummary(false)
    }
  }

  const doSave = async () => {
    if (!canSave || saving || !team) return
    setSaving(true)
    setError(null)
    try {
      const savedId = await saveNewsPost({
        id,
        title,
        content,
        team,
        tag,
        author,
        sourceUrl: sourceUrl.trim() || null,
        imageFile,
        existingImageUrl: isEdit ? post?.imageUrl ?? null : null,
        existingImagePath: isEdit ? post?.imagePath ?? null : null,
        summary,
      })
      navigate(`/news/${savedId}`)
    } catch {
      setError('حدث خطأ أثناء الحفظ. تحقق من الاتصال وحاول مرة أخرى.')
    } finally {
      setSaving(false)
    }
  }

  if (isEdit && postLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress sx={{ color: '#FEBE10' }} />
      </Box>
    )
  }

  if (isEdit && !post) {
    return (
      <Stack spacing={2} alignItems="center" sx={{ py: 10 }}>
        <Typography variant="h5">الخبر غير موجود</Typography>
        <Button variant="contained" onClick={() => navigate('/news')}>
          العودة إلى الأخبار
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
          <Typography variant="h4">{isEdit ? 'تعديل الخبر' : 'نشر خبر جديد'}</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {isEdit ? 'قم بتعديل بيانات الخبر ثم اضغط حفظ التعديلات' : 'اكتب محتوى الخبر بالعنوان والصورة وإعداد النشر للجمهور'}
          </Typography>
        </Stack>
      </Stack>

      <Paper sx={{ p: 3, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(14px)' }}>
        <Stack spacing={2.5}>
          <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
            <Box onClick={() => mark('team')} sx={{ cursor: 'default' }}>
              <ChipSelector label="الفريق (Team)" options={NEWS_TEAMS} value={team} onChange={setTeam} accent={teamAccent} disabled={saving} />
              {teamError && (
                <Typography variant="caption" sx={{ color: '#FF5252', display: 'block', mt: 0.5 }}>
                  اختر الفريق
                </Typography>
              )}
            </Box>
            <ChipSelector label="التصنيف (Tag)" options={NEWS_TAGS} value={tag} onChange={setTag} allowEmpty emptyLabel="عام" disabled={saving} />
          </Stack>

          <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap alignItems="flex-start">
            <Stack spacing={2.5} sx={{ flexGrow: 1, minWidth: 280 }}>
              <TextField
                label="عنوان الخبر (Title)"
                fullWidth
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => mark('title')}
                error={Boolean(titleError)}
                helperText={titleError ? 'العنوان مطلوب' : ' '}
              />
              <TextField
                label="نص الخبر (Content)"
                fullWidth
                multiline
                minRows={12}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onBlur={() => mark('content')}
                error={Boolean(contentError)}
                helperText={contentError ? 'نص الخبر مطلوب' : `${content.length} حرف`}
              />
              <Stack spacing={1}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <TextField
                    label="الملخص (Summary)"
                    fullWidth
                    multiline
                    minRows={3}
                    maxRows={6}
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    onBlur={() => mark('summary')}
                    error={Boolean(summaryError)}
                    helperText={summaryError ? `الملخص يجب أن يكون ${SUMMARY_MIN_LENGTH} حرف على الأقل` : `${summary.length} / ${SUMMARY_MAX_LENGTH}`}
                    inputProps={{ maxLength: SUMMARY_MAX_LENGTH }}
                  />
                  <Button
                    variant="outlined"
                    startIcon={generatingSummary ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon />}
                    disabled={generatingSummary || !title.trim() || !content.trim()}
                    onClick={handleGenerateSummary}
                    sx={{ minWidth: 140, height: 56, borderColor: 'rgba(0,230,118,0.5)', color: '#00E676', '&:hover': { borderColor: '#00E676', bgcolor: 'rgba(0,230,118,0.08)' } }}
                  >
                    {generatingSummary ? 'جارٍ التوليد…' : 'توليد بالذكاء'}
                  </Button>
                </Stack>
                {summarySource && (
                  <Chip
                    label={summarySource === 'ai' ? 'مُولّد بالذكاء الاصطناعي' : 'مُستخرج من النص'}
                    size="small"
                    sx={{ alignSelf: 'flex-start', fontWeight: 700, bgcolor: summarySource === 'ai' ? 'rgba(0,230,118,0.12)' : 'rgba(255,179,0,0.12)', color: summarySource === 'ai' ? '#69F0AE' : '#FFB300' }}
                  />
                )}
              </Stack>
            </Stack>
            <Box sx={{ width: { xs: '100%', sm: 380 }, flexShrink: 0 }}>
              <Typography sx={{ fontWeight: 800, fontSize: 13, color: 'text.secondary', mb: 1 }}>صورة الخبر (Image)</Typography>
              <ImageDropZone previewUrl={imagePreview} maxWidth={380} disabled={saving} onFileSelected={onFileSelected} onClear={onClearImage} />
              {!isEdit && touched.image && imageMissing && (
                <Typography variant="caption" sx={{ color: '#FF5252', display: 'block', mt: 0.5 }}>
                  صورة الخبر مطلوبة
                </Typography>
              )}
            </Box>
          </Stack>

          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
            <TextField
              label="الكاتب (Author)"
              sx={{ flexGrow: 1, minWidth: 220 }}
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              onBlur={() => mark('author')}
              error={Boolean(authorError)}
              helperText={authorError ? 'اسم الكاتب مطلوب' : ' '}
            />
            <TextField
              label="رابط المصدر (Source URL)"
              sx={{ flexGrow: 1, minWidth: 220 }}
              placeholder="https://..."
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              onBlur={() => {
                mark('sourceUrl')
                mark('image')
              }}
              error={Boolean(sourceUrlError)}
              helperText={sourceUrlError ? 'رابط غير صحيح — يبدأ بـ https://' : 'اختياري — يظهر كزرارة في التفاصيل'}
            />
          </Stack>

          {error && (
            <Typography sx={{ color: '#FF8A80', fontWeight: 700 }}>{error}</Typography>
          )}

          <Stack direction="row" spacing={1.5} justifyContent="flex-end">
            <Button onClick={() => navigate(-1)} disabled={saving}>
              إلغاء
            </Button>
            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveOutlinedIcon />}
              disabled={!canSave || saving}
              onClick={() => {
                mark('title')
                mark('content')
                mark('author')
                mark('team')
                mark('sourceUrl')
                mark('image')
                mark('summary')
                if (isEdit) doSave()
                else setConfirmOpen(true)
              }}
            >
              {saving ? (isEdit ? 'جارٍ الحفظ…' : 'جارٍ النشر…') : isEdit ? 'حفظ التعديلات' : 'نشر الخبر'}
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <ConfirmDialog
        open={confirmOpen}
        title="نشر الخبر (Publish Post)"
        message={`هل تريد نشر «${title.trim()}» فوراً؟ سيتم إرسال الإشعار لجمهور الفريق ${team === 'barcelona' ? 'برشلونة' : team === 'realmadrid' ? 'ريال مدريد' : 'الكل'}.`}
        confirmLabel="نشر المنشور"
        loading={saving}
        onConfirm={() => {
          setConfirmOpen(false)
          void doSave()
        }}
        onClose={() => setConfirmOpen(false)}
      />
    </Stack>
  )
}
