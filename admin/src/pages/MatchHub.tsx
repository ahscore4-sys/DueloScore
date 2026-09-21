import { Typography, Stack, Button, Chip, Tabs, Tab, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Box } from '@mui/material'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import DeleteIcon from '@mui/icons-material/Delete'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import MatchStatusBadge from '../components/MatchStatusBadge'
import { isInPlay } from '../lib/matchStatus'
import { clockMinute } from '../lib/liveClock'
import { useLiveClock } from '../hooks/useLiveClocks'
import { useMatchFlow } from '../hooks/useMatchFlow'
import { useMatch } from '@/features/match/ui/useMatch'
import { useMatchStatsPolling } from '@/features/match/ui/useMatchStatsPolling'
import { MatchHubContext } from '../lib/matchHubContext'
import { deleteMatch } from '@/features/match/data/match.service'
import LoadingOverlay from '@/core/ui/components/LoadingOverlay'
import NotFound from './NotFound'
import MatchInfo from './MatchInfo'
import PreMatch from './PreMatch'
import LiveControl from './LiveControl'
import MatchStatistics from './MatchStatistics'

const tabs = [
  { key: 'info', label: 'معلومات المباراة (Info)' },
  { key: 'pre-match', label: 'التحضير (Pre-Match)' },
  { key: 'live', label: 'التحكم المباشر (Live)' },
  { key: 'statistics', label: 'الاحصائيات (Statistics)' },
]

export default function MatchHub() {
  const navigate = useNavigate()
  const location = useLocation()
  const { id: matchId } = useParams<{ id: string }>()
  const { match, loading } = useMatch(matchId)
  const clock = useLiveClock(match)
  const flow = useMatchFlow(match)
  const statsPolling = useMatchStatsPolling(match)
  const [tabsStuck, setTabsStuck] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const scrollMemo = useRef<Record<string, number>>({})

  useEffect(() => {
    const seg = location.pathname.split('/').pop() ?? ''
    const tab = tabs.some((t) => t.key === seg) ? seg : 'info'
    window.scrollTo(0, scrollMemo.current[tab] ?? 0)
  }, [location.pathname])

  if (loading) return <LoadingOverlay label="جارٍ تحميل المباراة..." />
  if (!match && !deleting) return <NotFound />
  if (!match) return null

  const seg = location.pathname.split('/').pop() ?? ''
  const active = tabs.some((t) => t.key === seg) ? seg : seg === 'events' ? 'live' : isInPlay(flow.status) ? 'live' : 'info'
  const minute = clock ? String(clockMinute(clock.seconds)) : '0'
  const score = flow.status === 'not_started' ? '—' : `${match.score.home} : ${match.score.away}`
  const penaltyScore = flow.penalties.home + flow.penalties.away > 0

  const handleTabChange = (_: unknown, v: string) => {
    scrollMemo.current[active] = window.scrollY
    navigate(v)
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteMatch(match.id)
      navigate('/matches', { replace: true })
    } finally {
      setDeleting(false)
    }
  }

  const renderTab = (key: string, node: ReactNode) => (
    <Box sx={{ display: active === key ? 'block' : 'none' }}>{node}</Box>
  )

  return (
    <MatchHubContext.Provider value={{ setTabsStuck, statsPolling, activeTab: active }}>
      <Stack spacing={3}>
      <Stack direction="row" alignItems="center" spacing={2}>
        <Button onClick={() => navigate('/matches')} startIcon={<ArrowForwardIcon />} sx={{ color: 'text.secondary', gap: 1 }}>
          المباريات
        </Button>
        <Stack spacing={0.5} sx={{ flexGrow: 1 }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Typography variant="h4">{match.home.name} × {match.away.name}</Typography>
            <MatchStatusBadge status={flow.status} minute={minute} />
          </Stack>
        </Stack>
        <Chip
          label={score}
          sx={{ bgcolor: 'rgba(254, 190, 16, 0.12)', color: '#FEBE10', fontWeight: 800, fontSize: 15, border: '1px solid rgba(254, 190, 16, 0.4)' }}
        />
        {penaltyScore && (
          <Chip
            label={`ركلات الترجيح: ${flow.penalties.home} : ${flow.penalties.away}`}
            sx={{ bgcolor: 'rgba(255, 82, 82, 0.12)', color: '#FF8A80', fontWeight: 800, fontSize: 13, border: '1px solid rgba(255, 82, 82, 0.4)' }}
          />
        )}
        <IconButton onClick={() => setDeleteOpen(true)} size="small" sx={{ color: '#FF1744' }}>
          <DeleteIcon />
        </IconButton>
      </Stack>

      <Tabs
        value={active}
        onChange={handleTabChange}
        sx={{
          borderBottom: tabsStuck ? 'none' : '1px solid rgba(255,255,255,0.08)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: 'linear-gradient(135deg, #060811 0%, #0A0E1C 100%)',
          backgroundAttachment: 'fixed',
          backdropFilter: 'blur(14px)',
        }}
      >
        {tabs.map((t) => (
          <Tab key={t.key} value={t.key} label={t.label} />
        ))}
      </Tabs>

      {renderTab('info', <MatchInfo />)}
      {renderTab('pre-match', <PreMatch />)}
      {renderTab('live', <LiveControl />)}
      {renderTab('statistics', <MatchStatistics />)}
      </Stack>

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} dir="rtl">
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
          <DeleteIcon sx={{ color: '#FF1744' }} />
          حذف المباراة
        </DialogTitle>
        <DialogContent>
          <Typography>
            هل أنت متأكد من حذف مباراة <strong>{match.home.name}</strong> × <strong>{match.away.name}</strong>؟
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
            سيتم حذف جميع الأحداث والتخطيطات المرتبطة بهذه المباراة.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteOpen(false)} sx={{ color: 'text.secondary' }}>إلغاء</Button>
          <Button
            onClick={handleDelete}
            disabled={deleting}
            color="error"
            variant="contained"
            startIcon={<DeleteIcon />}
            sx={{ fontWeight: 700 }}
          >
            {deleting ? 'جارٍ الحذف...' : 'حذف المباراة'}
          </Button>
        </DialogActions>
      </Dialog>
    </MatchHubContext.Provider>
  )
}
