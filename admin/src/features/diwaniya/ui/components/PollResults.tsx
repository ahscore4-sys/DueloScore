import { Box, Stack, Typography } from '@mui/material'
import HowToVoteIcon from '@mui/icons-material/HowToVote'
import type { DiwaniyaPost, FanTeam } from '../../domain/diwaniya.types'
import { teamAccent, teamLabel } from '../../domain/diwaniya.types'

interface PollResultsProps {
  post: DiwaniyaPost
  compact?: boolean
}

function optionVotes(post: DiwaniyaPost, optionId: string): number {
  return (post.votesByTeam.barcelona[optionId] ?? 0) + (post.votesByTeam.realmadrid[optionId] ?? 0)
}

export default function PollResults({ post, compact }: PollResultsProps) {
  const total = Math.max(post.totalVotes, post.options.reduce((sum, opt) => sum + optionVotes(post, opt.id), 0))

  return (
    <Stack spacing={compact ? 1.25 : 1.75}>
      {post.options.map((opt) => {
        const votes = optionVotes(post, opt.id)
        const pct = total > 0 ? Math.round((votes / total) * 100) : 0
        const isWinner = post.winningOptionId === opt.id

        return (
          <Box key={opt.id}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
              <Typography sx={{ fontWeight: 800, fontSize: compact ? 13 : 14, flexGrow: 1, color: isWinner ? '#00E676' : '#F4F7FF' }}>
                {opt.text}
                {isWinner ? ' ✓' : ''}
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>
                {votes} · {pct}%
              </Typography>
            </Stack>
            <Box sx={{ height: compact ? 8 : 10, borderRadius: 99, bgcolor: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
              <Box
                sx={{
                  height: '100%',
                  width: `${pct}%`,
                  borderRadius: 99,
                  background: isWinner
                    ? 'linear-gradient(90deg, rgba(0,230,118,0.85), rgba(0,230,118,0.45))'
                    : `linear-gradient(90deg, #FEBE10cc, #0057A8aa)`,
                  transition: 'width .3s ease',
                }}
              />
            </Box>
            <Stack direction="row" spacing={1.5} sx={{ mt: 0.4 }} flexWrap="wrap" useFlexGap>
              {(['barcelona', 'realmadrid'] as FanTeam[]).map((team) => {
                const teamVotes = post.votesByTeam[team][opt.id] ?? 0
                const accent = teamAccent(team)
                return (
                  <Typography key={team} variant="caption" sx={{ fontWeight: 800, color: accent }}>
                    {teamLabel(team)}: {teamVotes}
                  </Typography>
                )
              })}
            </Stack>
          </Box>
        )
      })}

      <Stack direction="row" alignItems="center" spacing={0.5}>
        <HowToVoteIcon sx={{ fontSize: 16, color: '#90CAF9' }} />
        <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>
          إجمالي الأصوات: {total}
        </Typography>
      </Stack>
    </Stack>
  )
}
