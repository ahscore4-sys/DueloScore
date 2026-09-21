import { Stack } from '@mui/material'
import CompetitionHubHeader from '@/features/player/ui/CompetitionHubHeader'
import CompetitionsSection from '@/features/player/ui/CompetitionsSection'

export default function Players() {
  return (
    <Stack spacing={3}>
      <CompetitionHubHeader />
      <CompetitionsSection />
    </Stack>
  )
}