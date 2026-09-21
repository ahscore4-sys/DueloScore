import { useState } from 'react'
import { Avatar, Box, ButtonBase, Chip, Paper, Stack, Tooltip, Typography } from '@mui/material'
import EventSeatIcon from '@mui/icons-material/EventSeat'
import BlockIcon from '@mui/icons-material/Block'
import ShieldIcon from '@mui/icons-material/Shield'
import GroupsIcon from '@mui/icons-material/Groups'
import type { Player } from '@/types'
import type { CoverageMatch, CoveragePlans, CoverageTeamPlan } from '../../domain/coverageMatches.types'
import { displayTeamName } from '../../domain/coverageMatches.types'
import { LEAGUE_COLORS } from '@/features/match/domain/match.constants'
import PitchPreview from '@/components/PitchPreview'

type Side = 'home' | 'away'

function teamColor(match: CoverageMatch): string {
  return LEAGUE_COLORS[match.competitionId] ?? '#0057A8'
}

function planFor(match: CoverageMatch, side: Side): CoverageTeamPlan | null {
  const plans: CoveragePlans | undefined = match.plans
  if (!plans) return null
  const teamId = side === 'home' ? String(match.home.id) : String(match.away.id)
  return plans[teamId] ?? null
}

function toSlots(plan: CoverageTeamPlan): (Player | undefined)[] {
  return plan.lineup.map((id) => {
    const data = plan.playerData[id]
    if (!data) return undefined
    return {
      id,
      name: data.name,
      position: data.pos,
      number: data.number ?? 0,
      teamId: '',
      imageUrl: data.photo ?? '',
    } as Player
  })
}

function TeamSwitch({ match, side, onChange }: { match: CoverageMatch; side: Side; onChange: (side: Side) => void }) {
  return (
    <Paper
      sx={{
        p: 0.6,
        borderRadius: 999,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 0.6,
        bgcolor: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {(['home', 'away'] as Side[]).map((s) => {
        const active = side === s
        const team = s === 'home' ? match.home : match.away
        const color = teamColor(match)
        return (
          <ButtonBase
            key={s}
            onClick={() => onChange(s)}
            sx={{
              py: 1,
              px: 1.25,
              borderRadius: 999,
              transition: 'all 0.25s ease',
              background: active ? `linear-gradient(135deg, ${color}, ${color}BB)` : 'transparent',
              '&:hover': { background: active ? `linear-gradient(135deg, ${color}, ${color}C0)` : 'rgba(255,255,255,0.08)' },
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
              <Box sx={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: active ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.08)', border: active ? '1px solid rgba(255,255,255,0.5)' : `1px solid ${color}44` }}>
                {team.logo ? (
                  <Box component="img" src={team.logo} alt={team.name} sx={{ width: 22, height: 22, objectFit: 'contain', filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.4))' }} />
                ) : (
                  <GroupsIcon sx={{ fontSize: 15, color: active ? '#FFFFFF' : 'text.secondary' }} />
                )}
              </Box>
              <Typography
                noWrap
                sx={{
                  fontWeight: 900,
                  fontSize: 13,
                  color: active ? '#FFFFFF' : 'text.secondary',
                  textShadow: active ? '0 1px 6px rgba(0,0,0,0.5)' : 'none',
                }}
              >
                {displayTeamName(match, s)}
              </Typography>
            </Stack>
          </ButtonBase>
        )
      })}
    </Paper>
  )
}

function PlayerChip({ name, number, photo, captain, subbedOut }: {
  name: string
  number: number | null
  photo?: string | null
  captain?: boolean
  subbedOut?: string | null
}) {
  const subbed = subbedOut
  return (
    <Stack spacing={0.5} alignItems="center" sx={{ width: 76 }}>
      <Box sx={{ position: 'relative' }}>
        <Avatar
          src={photo ?? undefined}
          sx={{
            width: 52,
            height: 52,
            bgcolor: 'rgba(0,87,168,0.2)',
            color: '#FFFFFF',
            border: `1.5px solid ${captain ? '#FEBE10' : 'rgba(255,255,255,0.35)'}`,
            fontSize: 16,
            fontWeight: 900,
            fontFamily: '"Cairo", sans-serif',
            filter: photo ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.35))' : 'none',
          }}
        >
          {photo ? '' : (number ?? '—')}
        </Avatar>
        {captain && (
          <Chip
            size="small"
            label="C"
            sx={{
              position: 'absolute',
              top: -6,
              right: -6,
              height: 18,
              minWidth: 18,
              fontSize: 10,
              fontWeight: 900,
              bgcolor: '#FEBE10',
              color: '#0A0E1C',
              border: '1px solid rgba(0,0,0,0.4)',
            }}
          />
        )}
        {number !== null && photo && (
          <Box
            sx={{
              position: 'absolute',
              bottom: -4,
              left: -4,
              width: 20,
              height: 20,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: '#0A0E1C',
              border: '1px solid rgba(255,255,255,0.4)',
              color: '#FFFFFF',
              fontSize: 10.5,
              fontWeight: 900,
              fontFamily: '"Cairo", sans-serif',
            }}
          >
            {number}
          </Box>
        )}
      </Box>
      <Tooltip title={name}>
        <Typography
          noWrap
          sx={{
            maxWidth: 76,
            fontSize: 11,
            fontWeight: 700,
            color: subbed ? '#FF8A80' : 'text.primary',
            textAlign: 'center',
          }}
        >
          {name}
        </Typography>
      </Tooltip>
      {subbed && (
        <Typography noWrap sx={{ maxWidth: 76, fontSize: 9.5, color: '#FF8A80', fontWeight: 600 }}>
          ← {subbed}
        </Typography>
      )}
    </Stack>
  )
}

function SectionHeader({ icon, title, color, count }: { icon: React.ReactNode; title: string; color: string; count?: number }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1}>
      <Box
        sx={{
          width: 26,
          height: 26,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 1.5,
          bgcolor: `${color}1A`,
          border: `1px solid ${color}40`,
          color,
        }}
      >
        {icon}
      </Box>
      <Typography sx={{ fontWeight: 800, fontSize: 14.5 }}>{title}</Typography>
      {count !== undefined && (
        <Chip size="small" label={count} sx={{ height: 18, fontSize: 10.5, fontWeight: 800, bgcolor: `${color}1A`, color }} />
      )}
    </Stack>
  )
}

export default function CoverageMatchLineupsTab({ match, events }: {
  match: CoverageMatch
  events: { player: string; playerOut?: string; team: 'home' | 'away'; type: string }[]
}) {
  const [side, setSide] = useState<Side>('home')
  const plan = planFor(match, side)
  const accent = teamColor(match)
  const empty = !plan

  const involved = new Set<string>()
  for (const e of events) {
    if (e.type === 'sub' && e.team === side) {
      involved.add(e.player)
      if (e.playerOut) involved.add(e.playerOut)
    }
  }
  const subbedIns = (plan?.bench ?? []).filter((id) => involved.has(id))
  const plainBench = (plan?.bench ?? []).filter((id) => !involved.has(id))

  const subbedOff = (playerId: string): string | null => {
    const e = events.find((x) => x.type === 'sub' && x.team === side && x.player === playerId)
    if (!e || !e.playerOut) return null
    const data = plan?.playerData[e.playerOut]
    return data?.name ?? e.playerOut
  }

  return (
    <Stack spacing={2}>
      <TeamSwitch match={match} side={side} onChange={setSide} />

      {empty ? (
        <Paper sx={{ p: 4, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.16)', textAlign: 'center' }}>
          <Stack spacing={1} alignItems="center">
            <EventSeatIcon sx={{ fontSize: 32, color: 'text.secondary' }} />
            <Typography sx={{ color: 'text.secondary', fontWeight: 700, fontSize: 13.5 }}>
              لا توجد تشكيلة معلنة بعد — تُجلب تلقائياً قبل انطلاق المباراة.
            </Typography>
          </Stack>
        </Paper>
      ) : (
        <>
          <Paper sx={{ p: 2, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <PitchPreview
              formation={plan!.formation}
              color={accent}
              gkColor="#FEBE10"
              players={toSlots(plan!)}
              ratings={match.ratings}
              captainId={plan!.captain}
            />
          </Paper>

          {plan!.coach && (
            <Paper sx={{ p: 2, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: `${accent}22`,
                    border: `1px solid ${accent}55`,
                    color: accent,
                    overflow: 'hidden',
                  }}
                >
                  {plan!.coach.photo ? (
                    <Box component="img" src={plan!.coach.photo} alt={plan!.coach.name ?? 'مدرب'} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <ShieldIcon sx={{ fontSize: 20 }} />
                  )}
                </Box>
                <Stack>
                  <Typography sx={{ fontWeight: 800, fontSize: 13.5 }}>{plan!.coach.name}</Typography>
                  <Typography sx={{ fontSize: 11.5, color: 'text.secondary', fontWeight: 700 }}>المدرب — {plan!.formation}</Typography>
                </Stack>
              </Stack>
            </Paper>
          )}

          {(plan!.bench.length > 0 || plan!.injured.length > 0 || plan!.suspended.length > 0) && (
            <Paper sx={{ p: 2, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <Stack spacing={1.75}>
                {subbedIns.length > 0 && (
                  <Stack spacing={1}>
                    <SectionHeader icon={<EventSeatIcon sx={{ fontSize: 15 }} />} title="التبديلات" color="#00E676" count={subbedIns.length} />
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {subbedIns.map((id) => {
                        const d = plan!.playerData[id]
                        return (
                          <PlayerChip
                            key={id}
                            name={d?.name ?? id}
                            number={d?.number ?? null}
                            photo={d?.photo}
                            captain={plan!.captain === id}
                            subbedOut={subbedOff(id)}
                          />
                        )
                      })}
                    </Box>
                  </Stack>
                )}
                {plainBench.length > 0 && (
                  <Stack spacing={1}>
                    <SectionHeader icon={<EventSeatIcon sx={{ fontSize: 15 }} />} title="البدلاء (Bench)" color="#42A5F5" count={plainBench.length} />
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {plainBench.map((id) => {
                        const d = plan!.playerData[id]
                        return (
                          <PlayerChip key={id} name={d?.name ?? id} number={d?.number ?? null} photo={d?.photo} captain={plan!.captain === id} />
                        )
                      })}
                    </Box>
                  </Stack>
                )}
                {plan!.injured.length > 0 && (
                  <Stack spacing={1}>
                    <SectionHeader icon={<BlockIcon sx={{ fontSize: 15 }} />} title="مصابون" color="#FF5252" count={plan!.injured.length} />
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {plan!.injured.map((id) => {
                        const d = plan!.playerData[id]
                        return <PlayerChip key={id} name={d?.name ?? id} number={d?.number ?? null} photo={d?.photo} />
                      })}
                    </Box>
                  </Stack>
                )}
                {plan!.suspended.length > 0 && (
                  <Stack spacing={1}>
                    <SectionHeader icon={<BlockIcon sx={{ fontSize: 15 }} />} title="موقوفون" color="#FFB300" count={plan!.suspended.length} />
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {plan!.suspended.map((id) => {
                        const d = plan!.playerData[id]
                        return <PlayerChip key={id} name={d?.name ?? id} number={d?.number ?? null} photo={d?.photo} />
                      })}
                    </Box>
                  </Stack>
                )}
              </Stack>
            </Paper>
          )}
        </>
      )}
    </Stack>
  )
}