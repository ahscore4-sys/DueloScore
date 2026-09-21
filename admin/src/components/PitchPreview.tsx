import { useCallback, useRef, useState } from 'react'
import { Box, Avatar, Typography, IconButton, CircularProgress } from '@mui/material'
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded'
import { toBlob } from 'html-to-image'
import { parseFormation, slotRoles } from '../lib/formations'
import { readableOn } from '../lib/colorUtils'
import lineupBg from '@/shared/assets/branding/lineup_bg.png'
import dueloscoreLogo from '@/shared/assets/branding/dueloscore-logo.svg'
import type { Player } from '../types'
import type { PlayerMatchStats } from '@/features/match/domain/matchDerivation'
import PlayerStatsBadges from './PlayerStatsBadges'
import { Stack } from '@mui/material'
import CountryFlag from '@/core/ui/components/CountryFlag'

export interface PitchDrag {
  isGK: boolean
  from: number
}

interface PitchPreviewProps {
  formation: string
  color?: string
  gkColor?: string
  players?: (Player | undefined)[]
  stats?: Record<string, PlayerMatchStats>
  ratings?: Record<string, number>
  dragging?: PitchDrag | null
  hover?: number | null
  onSlotClick?: (index: number, el: HTMLElement) => void
  onSlotDragStart?: (index: number) => void
  onSlotDragEnter?: (index: number) => void
  onSlotDragLeave?: (index: number) => void
  onSlotDrop?: (index: number) => void
  onSlotDragEnd?: () => void
  captainId?: string | null
  onCaptainChange?: (playerId: string | null) => void
}

const W = 68
const H = 105
const CIRCLE = '78px'
const SPACING_PCT = 21
const IMG_RATIO = '1160 / 1080'

const ROW_Y_ANCHORS: Record<number, number[]> = {
  4: [90, 62, 42, 18],
  5: [90, 68, 48, 33, 14],
}

const LINE_SPREAD: Record<number, number> = {
  1: 0,
  2: 0.5,
  3: 0.75,
  4: 1,
  5: 1,
}

export default function PitchPreview({
  formation,
  color = '#0057A8',
  gkColor = '#FEBE10',
  players,
  stats,
  ratings,
  dragging,
  hover,
  onSlotClick,
  onSlotDragStart,
  onSlotDragEnter,
  onSlotDragLeave,
  onSlotDrop,
  onSlotDragEnd,
  captainId,
  onCaptainChange,
}: PitchPreviewProps) {
const lines = parseFormation(formation)
  const rows = [1, ...lines]
  const roles = slotRoles(formation)
  const pitchRef = useRef<HTMLDivElement>(null)
  const [saving, setSaving] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  const handleDownload = useCallback(async () => {
    const node = pitchRef.current
    if (!node || saving) return
    setSaving(true)
    setExportError(null)
    try {
      await document.fonts.ready
      const imgs = Array.from(node.querySelectorAll('img'))
      const originals = new Map<HTMLImageElement, string>()
      const failed = new Set<HTMLImageElement>()
      const withTimeout = (ms: number) => new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
      const toDataUrl = (blob: Blob) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onerror = () => reject(reader.error)
          reader.onload = () => resolve(reader.result as string)
          reader.readAsDataURL(blob)
        })
      await Promise.all(
        imgs.map(async (img) => {
          const src = img.getAttribute('src') || img.currentSrc || ''
          if (!src || src.startsWith('data:')) return
          originals.set(img, src)
          try {
            const res = await Promise.race([fetch(src, { mode: 'cors', credentials: 'omit' }), withTimeout(8000)])
            if (!res.ok) throw new Error(String(res.status))
            const blob = await res.blob()
            img.setAttribute('src', await toDataUrl(blob))
          } catch {
            failed.add(img)
          }
        }),
      )
      const renderBlob = (extra: { skipFonts?: boolean }) =>
        toBlob(node, {
          pixelRatio: 2,
          backgroundColor: '#00333D',
          cacheBust: false,
          filter: (el) => !failed.has(el as HTMLImageElement),
          ...extra,
        })
      let blob: Blob | null = null
      try {
        blob = await renderBlob({})
      } catch (err) {
        blob = await renderBlob({ skipFonts: true }).catch(() => {
          throw err
        })
      } finally {
        for (const [img, src] of originals) {
          img.setAttribute('src', src)
        }
      }
      if (!blob) throw new Error('empty blob')
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `lineup-${formation || 'plan'}.png`
      link.rel = 'noopener'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      setTimeout(() => URL.revokeObjectURL(url), 5000)
    } catch (err) {
      setExportError(`تعذّر حفظ صورة التشكيلة${err instanceof Error ? ` (${err.message})` : ''}`)
      setTimeout(() => setExportError(null), 6000)
    } finally {
      setSaving(false)
    }
  }, [formation, saving])

  const circleR = (SPACING_PCT / 100) * W
  const gkY = 88
  const attY = 12
  const usableX = W - circleR * 2

  const dots: { x: number; y: number; isGK: boolean }[] = []
  rows.forEach((n, ri) => {
    const anchors = ROW_Y_ANCHORS[rows.length]
    const yRaw = anchors
      ? anchors[ri]
      : rows.length > 1
        ? gkY + (ri / (rows.length - 1)) * (attY - gkY)
        : gkY
    const y = yRaw
    const spread = (LINE_SPREAD[n] ?? 1) * usableX
    const step = n === 1 ? 0 : spread / (n - 1)
for (let i = 0; i < n; i++) {
      const x = W / 2 - (i - (n - 1) / 2) * step
      dots.push({ x, y, isGK: ri === 0 })
    }
  })

return (
    <Box sx={{ pt: 1 }}>
      <Box sx={{ position: 'relative', width: '100%', maxWidth: 720, mx: 'auto' }}>
        <Box
          ref={pitchRef}
          onDragEnd={onSlotDragEnd}
          sx={{
            position: 'relative',
            width: '100%',
            aspectRatio: IMG_RATIO,
            bgcolor: '#00333D',
            borderRadius: '14px',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 18px 40px rgba(0,0,0,0.45)',
          }}
        >
        <img
          src={lineupBg}
          alt=""
          draggable={false}
          style={{ display: 'block', width: '100%', height: '100%', objectFit: 'fill' }}
        />

        <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1 }}>
          {dots.map((d, i) => {
            const player = players?.[i]
            const role = roles[i]
            const empty = !player
            const droppable = Boolean(dragging && (dragging.isGK ? d.isGK : !d.isGK))
            const dimmed = dragging ? !droppable : false
            const isHover = hover === i
            const lifted = dragging && dragging.from === i
const chipColor = empty ? undefined : d.isGK ? gkColor : color
            const isCaptain = Boolean(captainId) && player !== undefined && captainId === player.id
            return (
              <Box
                key={i}
                title={empty ? role : player.name}
                draggable={!empty}
                onClick={(e) => onSlotClick?.(i, e.currentTarget)}
                onDragStart={(e) => {
                  if (!player) return
                  e.dataTransfer.setData('text/plain', player.id)
                  e.dataTransfer.effectAllowed = 'move'
                  onSlotDragStart?.(i)
                }}
                onDragOver={(e) => {
                  if (!droppable) return
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
                  onSlotDragEnter?.(i)
                }}
                onDragLeave={() => onSlotDragLeave?.(i)}
                onDrop={(e) => {
                  if (!droppable) return
                  e.preventDefault()
                  onSlotDrop?.(i)
                }}
                sx={{
                  position: 'absolute',
                  left: `${(d.x / W) * 100}%`,
                  top: `${(d.y / H) * 100}%`,
                  transform: 'translate(-50%, -50%)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 0.4,
                  pointerEvents: 'auto',
                  cursor: !empty ? 'grab' : droppable ? 'copy' : 'default',
                  opacity: dimmed ? 0.3 : lifted ? 0.45 : 1,
                  transition: 'opacity .15s ease',
                }}
              >
                {empty ? (
                  <Box
                    sx={{
                      width: CIRCLE,
                      aspectRatio: '1',
                      height: 'auto',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: `2px dashed ${droppable ? '#FEBE10' : isHover ? 'rgba(254,190,16,0.7)' : 'rgba(255,255,255,0.45)'}`,
                      bgcolor: droppable ? 'rgba(254,190,16,0.18)' : 'rgba(255,255,255,0.08)',
color: droppable ? '#FEBE10' : 'rgba(255,255,255,0.75)',
                      fontSize: 17,
                      fontWeight: 800,
                      boxShadow: droppable ? '0 0 18px rgba(254,190,16,0.5)' : 'none',
                    }}
                  >
                    {role}
                  </Box>
                ) : (
                  <>
<Box sx={{ position: 'relative', width: CIRCLE, aspectRatio: '1', height: 'auto' }}>
                      <Avatar
                        src={player.imageUrl}
                        sx={{
width: '100%',
                          height: '100%',
                          bgcolor: chipColor,
                          color: chipColor ? readableOn(chipColor) : '#fff',
                          border: `2px solid ${droppable ? '#FEBE10' : '#fff'}`,
                          boxShadow: droppable ? '0 0 0 3px rgba(254,190,16,0.5), 0 4px 10px rgba(0,0,0,0.4)' : '0 4px 10px rgba(0,0,0,0.4)',
                        }}
                      />
                      {player && (captainId ? captainId === player.id : true)
                      ? (
                        <Box
                          component="button"
                          type="button"
                          dir="ltr"
                          tabIndex={-1}
                          draggable={false}
                          aria-label={isCaptain ? 'إلغاء تعيين القائد' : 'تعيين اللاعب قائداً'}
                          title={isCaptain ? 'إلغاء القائد' : 'تعيين القائد'}
                          onClick={(e) => {
                            e.stopPropagation()
                            onCaptainChange?.(isCaptain ? null : player.id)
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          onDragStart={(e) => e.stopPropagation()}
                          sx={{
                            position: 'absolute',
                            top: -5,
                            left: -1,
                            zIndex: 3,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 20,
                            height: 20,
                            p: 0,
                            borderRadius: '50%',
                            bgcolor: '#FFFFFF',
                            border: '1px solid rgba(0,0,0,0.18)',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.35)',
                            fontFamily: 'inherit',
                            fontSize: 10,
                            fontWeight: 800,
                            lineHeight: 1,
                            cursor: 'pointer',
                            pointerEvents: 'auto',
                            transition: 'transform .12s ease',
                            '&:hover': { transform: 'scale(1.05)' },
                          }}
                        >
                          {player.number}
                          <Box
                            sx={{
                              position: 'absolute',
                              top: -6,
                              left: -6,
                              zIndex: 4,
                              width: 14,
                              height: 14,
                              p: 0,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: '50%',
                              bgcolor: isCaptain ? '#B8860B' : '#FFFFFF',
                              border: '1px solid #B8860B',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
                              color: isCaptain ? '#FFFFFF' : '#B8860B',
                              pointerEvents: 'none',
                            }}
                          >
                            <Box component="span" sx={{ fontSize: 7, fontWeight: 900, lineHeight: 1, color: isCaptain ? '#FFFFFF' : '#B8860B', fontFamily: 'inherit' }}>
                              C
                            </Box>
                          </Box>
                        </Box>
                      )
                      : (
                        <Box
                          sx={{
                            position: 'absolute',
                            top: -5,
                            left: -1,
                            zIndex: 1,
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: '#FFFFFF',
                            color: '#1A1A2E',
                            border: '1px solid rgba(0,0,0,0.18)',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.35)',
                            fontSize: 10,
                            fontWeight: 800,
                            lineHeight: 1,
                            pointerEvents: 'none',
                          }}
                        >
{player.number}
                        </Box>
                      )}
                      <PlayerStatsBadges stats={stats?.[player.id]} rating={ratings?.[player.id]} subTone="red" />
                      {droppable && (
                        <Box sx={{ position: 'absolute', inset: -6, borderRadius: '50%', border: '2px solid #FEBE10', pointerEvents: 'none' }} />
                      )}
                    </Box>
<Stack direction="row" spacing={0.35} alignItems="center" justifyContent="center" sx={{ maxWidth: '100%' }}>
                      {player.flag && <CountryFlag src={player.flag} alt={player.nationality ?? player.name} size={10} />}
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: 10,
                          fontWeight: 800,
                          lineHeight: 1.2,
                          color: '#fff',
                          textShadow: '0 1px 3px rgba(0,0,0,0.9)',
                          maxWidth: 120,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          textAlign: 'center',
                        }}
                      >
                        {player.name}
                      </Typography>
                    </Stack>
                  </>
                )}
              </Box>
            )
          })}
        </Box>

<Box
          sx={{
            position: 'absolute',
            left: 20,
            bottom: 26,
            px: 3,
            py: 1,
            borderRadius: 999,
            bgcolor: 'rgba(255,255,255,0.12)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.35)',
            color: '#FFFFFF',
            fontSize: 21,
            fontWeight: 900,
            lineHeight: 1.4,
            letterSpacing: 0.5,
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(0,0,0,0.28)',
            pointerEvents: 'none',
            zIndex: 2,
          }}
        >
          {formation}
        </Box>

        <Box
          sx={{
            position: 'absolute',
            right: 16,
            bottom: 20,
            width: 48,
            height: 48,
            borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.12)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.28)',
            pointerEvents: 'none',
            zIndex: 2,
          }}
        >
          <Box component="img" src={dueloscoreLogo} sx={{ width: 30, height: 'auto' }} />
        </Box>
        </Box>
        {exportError && (
          <Box sx={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', pt: 2, pointerEvents: 'none', zIndex: 6 }}>
            <Box sx={{ px: 2, py: 0.75, borderRadius: 999, bgcolor: 'rgba(255,82,82,0.18)', border: '1px solid rgba(255,82,82,0.55)', color: '#fff', fontSize: 13, fontWeight: 800 }}>
              {exportError}
            </Box>
          </Box>
        )}
        <IconButton
          onClick={handleDownload}
          title="حفظ صورة التشكيلة"
          size="small"
          disabled={saving}
          sx={{
            position: 'absolute',
            top: 10,
            right: 10,
            bgcolor: 'rgba(0,0,0,0.55)',
            border: '1px solid rgba(255,255,255,0.25)',
            color: '#fff',
            zIndex: 5,
            '&:hover': { bgcolor: 'rgba(0,0,0,0.75)' },
            '&.Mui-disabled': { color: 'rgba(255,255,255,0.6)' },
          }}
        >
          {saving ? <CircularProgress size={16} color="inherit" /> : <DownloadRoundedIcon sx={{ fontSize: 18 }} />}
        </IconButton>
      </Box>
    </Box>
  )
}