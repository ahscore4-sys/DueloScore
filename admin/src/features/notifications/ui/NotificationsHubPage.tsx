import { useState } from 'react'
import { Tab, Tabs, Typography, Stack } from '@mui/material'
import type { PushNotification } from '../domain/notifications.types'
import { useNotifications } from './useNotifications'
import CreateNotificationForm from './components/CreateNotificationForm'
import NotificationHistoryList from './components/NotificationHistoryList'
import NotificationDetailDialog from './components/NotificationDetailDialog'

export default function NotificationsHubPage() {
  const [tab, setTab] = useState(0)
  const [selected, setSelected] = useState<PushNotification | null>(null)
  const { notifications, loading, loadingMore, hasMore, loadMore, refresh } = useNotifications()

  return (
    <Stack spacing={3}>
      <Stack spacing={0.5}>
        <Typography variant="h4">الإشعارات (Notifications)</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          إنشاء وجدولة ومتابعة الإشعارات المخصصة للمستخدمين.
        </Typography>
      </Stack>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        textColor="primary"
        indicatorColor="primary"
        sx={{
          '& .MuiTab-root': { fontWeight: 800, fontSize: 14, minHeight: 44 },
          '& .MuiTabs-indicator': { bgcolor: '#FEBE10' },
        }}
      >
        <Tab label="إنشاء جديد (Create New)" />
        <Tab label="السجل (History)" />
      </Tabs>

      {tab === 0 ? (
        <CreateNotificationForm onCreated={refresh} />
      ) : (
        <NotificationHistoryList
          notifications={notifications}
          loading={loading}
          loadingMore={loadingMore}
          hasMore={hasMore}
          onLoadMore={loadMore}
          onSelect={setSelected}
        />
      )}

      <NotificationDetailDialog notification={selected} onClose={() => setSelected(null)} />
    </Stack>
  )
}
