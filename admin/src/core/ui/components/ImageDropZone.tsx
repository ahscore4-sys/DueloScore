import { useRef, useState, type DragEvent } from 'react'
import {
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Slider,
} from '@mui/material'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import DeleteIcon from '@mui/icons-material/Delete'
import AutorenewIcon from '@mui/icons-material/Autorenew'

interface ImageDropZoneProps {
  previewUrl: string | null
  uploading?: boolean
  disabled?: boolean
  maxWidth?: number
  aspectRatio?: string
  ratioLabel?: string
  outputWidth?: number
  outputHeight?: number
  filePrefix?: string
  onFileSelected: (file: File) => void
  onClear: () => void
}

function isImageFile(file: File): boolean {
  return file.type.startsWith('image/')
}

export default function ImageDropZone({
  previewUrl,
  uploading,
  disabled,
  maxWidth = 640,
  aspectRatio = '16 / 9',
  ratioLabel = '16:9',
  outputWidth = 1920,
  outputHeight = 1080,
  filePrefix = 'image',
  onFileSelected,
  onClear,
}: ImageDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [cropOpen, setCropOpen] = useState(false)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [cropArea, setCropArea] = useState<Area | null>(null)
  const [zoom, setZoom] = useState(1)
  const [cropping, setCropping] = useState(false)

  const cropToFile = async (src: string, area: Area): Promise<File> => {
    const image = new Image()
    image.src = src
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = outputWidth
    canvas.height = outputHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('canvas unavailable')
    ctx.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, outputWidth, outputHeight)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92))
    if (!blob) throw new Error('crop failed')
    return new File([blob], `${filePrefix}_${Date.now()}.jpg`, { type: 'image/jpeg' })
  }

  const acceptRawFile = (raw: File) => {
    setCropSrc((prev) => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev)
      return URL.createObjectURL(raw)
    })
    setCrop({ x: 0, y: 0 })
    setCropArea(null)
    setZoom(1)
    setCropOpen(true)
  }

  const discardCrop = () => {
    setCropSrc((prev) => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev)
      return null
    })
    setCropOpen(false)
  }

  const confirmCrop = async () => {
    if (!cropSrc || !cropArea || cropping) return
    setCropping(true)
    try {
      const file = await cropToFile(cropSrc, cropArea)
      onFileSelected(file)
      discardCrop()
    } finally {
      setCropping(false)
    }
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    if (disabled || uploading) return
    const file = e.dataTransfer.files?.[0]
    if (file && isImageFile(file)) acceptRawFile(file)
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (!disabled && !uploading) setDragOver(true)
  }

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <Box
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={() => setDragOver(false)}
          onClick={() => !disabled && !uploading && inputRef.current?.click()}
          sx={{
            position: 'relative',
            width: '100%',
            maxWidth,
            aspectRatio,
            borderRadius: 3,
            cursor: disabled || uploading ? 'default' : 'pointer',
            overflow: 'hidden',
            border: dragOver ? '2px dashed #FEBE10' : '2px dashed rgba(255,255,255,0.18)',
            bgcolor: dragOver ? 'rgba(254,190,16,0.08)' : 'rgba(255,255,255,0.03)',
            transition: 'all .2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file && isImageFile(file)) acceptRawFile(file)
            e.target.value = ''
          }}
        />

        {previewUrl ? (
          <>
            <Box component="img" src={previewUrl} alt="معاينة الصورة" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            {!uploading && !disabled && (
              <Box sx={{ position: 'absolute', top: 8, left: 8, display: 'flex', gap: 0.5 }}>
                <IconButton
                  size="small"
                  title="استبدال الصورة"
                  onClick={(e) => {
                    e.stopPropagation()
                    inputRef.current?.click()
                  }}
                  sx={{ bgcolor: 'rgba(6,8,17,0.75)', color: '#FEBE10', '&:hover': { bgcolor: 'rgba(6,8,17,0.9)' } }}
                >
                  <AutorenewIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  title="إزالة الصورة"
                  onClick={(e) => {
                    e.stopPropagation()
                    onClear()
                  }}
                  sx={{ bgcolor: 'rgba(6,8,17,0.75)', color: '#FF1744', '&:hover': { bgcolor: 'rgba(6,8,17,0.9)' } }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            )}
          </>
        ) : (
          <Stack spacing={1.5} alignItems="center" sx={{ px: 3, textAlign: 'center' }}>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'rgba(0,87,168,0.18)',
                border: '1px solid rgba(0,87,168,0.45)',
                color: '#FEBE10',
              }}
            >
              <CloudUploadIcon sx={{ fontSize: 32 }} />
            </Box>
            <Typography sx={{ fontWeight: 800, fontSize: 15 }}>اسحب الصورة هنا أو انقر للاختيار</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              سيتم قص الصورة بنسبة {ratioLabel} · PNG · JPG · WEBP
            </Typography>
          </Stack>
        )}

        {uploading && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 1.5,
              bgcolor: 'rgba(6,8,17,0.72)',
              backdropFilter: 'blur(4px)',
            }}
          >
            <CircularProgress size={40} sx={{ color: '#FEBE10' }} />
            <Typography sx={{ fontWeight: 800, color: '#FEBE10' }}>جارٍ رفع الصورة…</Typography>
          </Box>
        )}
        </Box>
      </Box>

      <Dialog open={cropOpen} onClose={cropping ? undefined : discardCrop} maxWidth="sm" fullWidth disableRestoreFocus>
        <DialogTitle>اختيار منطقة الصورة ({ratioLabel})</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Box sx={{ position: 'relative', height: 340, borderRadius: 3, overflow: 'hidden', bgcolor: '#000' }}>
              {cropSrc && (
                <Cropper
                  image={cropSrc}
                  aspect={outputWidth / outputHeight}
                  crop={crop}
                  zoom={zoom}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={(_, pixels) => setCropArea(pixels)}
                  restrictPosition
                  objectFit="contain"
                  showGrid
                />
              )}
              {cropping && (
                <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(6,8,17,0.7)' }}>
                  <CircularProgress sx={{ color: '#FEBE10' }} />
                </Box>
              )}
            </Box>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', whiteSpace: 'nowrap' }}>
                تكبير
              </Typography>
              <Slider value={zoom} min={1} max={3} step={0.05} onChange={(_, v) => setZoom(v as number)} disabled={cropping} sx={{ color: '#FEBE10' }} />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={discardCrop} disabled={cropping} sx={{ color: 'text.secondary' }}>
            إلغاء
          </Button>
          <Button variant="contained" onClick={confirmCrop} disabled={cropping}>
            تأكيد القص
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
