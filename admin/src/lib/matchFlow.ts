import type { Match, MatchStatus, ControlPhase, PenaltyKick } from '../types'
import { setClockRunning, setClockSeconds } from './liveClock'

export type { ControlPhase, PenaltyKick }

interface FlowState {
  phase: ControlPhase
  penalties: { home: number; away: number }
  kicks: PenaltyKick[]
}

const flows = new Map<string, FlowState>()
const listeners = new Set<() => void>()

let kickSeq = 1

export function phaseIsRunning(phase: ControlPhase): boolean {
  return phase === 'first_half' || phase === 'second_half' || phase === 'extra_first_half' || phase === 'extra_second_half'
}

export const PERIOD_END_SECONDS: Record<ControlPhase, number> = {
  not_started: 0,
  first_half: 45 * 60,
  half_time: 45 * 60,
  second_half: 90 * 60,
  full_time: 90 * 60,
  extra_first_half: 105 * 60,
  extra_break_1: 105 * 60,
  extra_second_half: 120 * 60,
  extra_break_2: 120 * 60,
  penalties: 120 * 60,
  final: 120 * 60,
}

export const PERIOD_START_SECONDS: Record<ControlPhase, number> = {
  not_started: 0,
  first_half: 0,
  half_time: 45 * 60,
  second_half: 45 * 60,
  full_time: 90 * 60,
  extra_first_half: 90 * 60,
  extra_break_1: 105 * 60,
  extra_second_half: 105 * 60,
  extra_break_2: 120 * 60,
  penalties: 120 * 60,
  final: 120 * 60,
}

export function clockParts(phase: ControlPhase, seconds: number): { base: number; extra: number } {
  const cap = PERIOD_END_SECONDS[phase]
  return { base: Math.min(seconds, cap), extra: Math.max(0, seconds - cap) }
}

export function formatEventMinute(phase: ControlPhase, seconds: number): string {
  const cap = PERIOD_END_SECONDS[phase]
  if (seconds <= cap) return `${Math.ceil(seconds / 60)}'`
  const regMinute = Math.round(cap / 60)
  const extra = Math.ceil((seconds - cap) / 60)
  return `${regMinute}+${extra}'`
}

export function minuteToEventMinute(phase: ControlPhase, minute: number): string {
  const regMinute = Math.round(PERIOD_END_SECONDS[phase] / 60)
  if (minute <= regMinute) return `${minute}'`
  return `${regMinute}+${minute - regMinute}'`
}

export function parseEventMinute(value: string): number | undefined {
  const m = (value || '').trim().replace(/['′]/g, '')
  const match = m.match(/^(\d+)(?:\+(\d+))?$/)
  if (!match) return undefined
  return parseInt(match[1], 10) + (match[2] ? parseInt(match[2], 10) : 0)
}

export function eventMinuteParts(value: string): { base: number; added: number } {
  const m = (value || '').trim().replace(/['′]/g, '')
  const match = m.match(/^(\d+)(?:\+(\d+))?$/)
  return { base: parseInt(match?.[1] ?? '0', 10), added: parseInt(match?.[2] ?? '0', 10) }
}

export const PHASE_ORDER: string[] = [
  'first_half',
  'half_time',
  'second_half',
  'full_time',
  'extra_first_half',
  'extra_break_1',
  'extra_second_half',
  'extra_break_2',
  'penalties',
  'final',
]

/**
 * Chronological sort key for the timeline. Regular events use a compound minute
 * (base*100 + added), so 45 < 45+1 < 46. Phase markers pin to the END of their
 * minute block (base*100 + 99 + rank), so first-half stoppage events at 45+X
 * appear BEFORE a second-half marker recorded at 45, while keeping the marker
 * ahead of the next minute block and ordering equal-minute markers by phase.
 */
export function eventSortKey(minute: string, phase?: string): number {
  const { base, added } = eventMinuteParts(minute)
  if (phase !== undefined && phase !== '') {
    const rank = PHASE_ORDER.indexOf(phase)
    return base * 100 + 99 + (rank >= 0 ? rank / 100 : 0)
  }
  return base * 100 + added
}

export function eventMinuteRange(seconds: number): { min: number; max: number } {
  const min = 0
  const max = Math.max(min, Math.ceil(seconds / 60))
  return { min, max }
}

export function flowPhaseStatus(phase: ControlPhase): MatchStatus {
  switch (phase) {
    case 'extra_break_1':
      return 'extra_first_half'
    case 'extra_break_2':
      return 'extra_second_half'
    default:
      return phase
  }
}

export const phaseLabel: Record<ControlPhase, string> = {
  not_started: 'لم تبدأ المباراة',
  first_half: 'الشوط الأول',
  half_time: 'استراحة بين الشوطين',
  second_half: 'الشوط الثاني',
  full_time: 'انتهى الوقت الأصلي',
  extra_first_half: 'الشوط الإضافي الأول',
  extra_break_1: 'استراحة قبل الشوط الإضافي الثاني',
  extra_second_half: 'الشوط الإضافي الثاني',
  extra_break_2: 'انتهت الأشواط الإضافية',
  penalties: 'ركلات الترجيح',
  final: 'انتهت المباراة',
}

function phaseFromStatus(status: MatchStatus): ControlPhase {
  return status
}

export function initFlow(id: string, initialStatus: MatchStatus): void {
  if (!flows.has(id)) {
    const phase = phaseFromStatus(initialStatus)
    flows.set(id, { phase, penalties: { home: 0, away: 0 }, kicks: [] })
    setClockRunning(id, phaseIsRunning(phase))
  }
}

export function initFlowFromFirestore(id: string, controlPhase: ControlPhase, penalties: { home: number; away: number }, kicks: PenaltyKick[]): void {
  flows.set(id, { phase: controlPhase, penalties, kicks })
  setClockRunning(id, phaseIsRunning(controlPhase))
}

export function getFlow(id: string): FlowState | undefined {
  return flows.get(id)
}

export function advancePhase(id: string, next: ControlPhase): void {
  const flow = flows.get(id)
  if (!flow) return
  flow.phase = next
  if (phaseIsRunning(next)) setClockSeconds(id, PERIOD_START_SECONDS[next])
  setClockRunning(id, phaseIsRunning(next))
  listeners.forEach((fn) => fn())
}

export function recordKick(id: string, team: 'home' | 'away', player: string, result: 'scored' | 'missed'): void {
  const flow = flows.get(id)
  if (!flow) return
  if (result === 'scored') flow.penalties[team] += 1
  flow.kicks.push({ id: `k${kickSeq++}`, kickNo: flow.kicks.length + 1, team, player, result })
  listeners.forEach((fn) => fn())
}

export function undoKick(id: string, team: 'home' | 'away', player: string, result: 'scored' | 'missed'): void {
  const flow = flows.get(id)
  if (!flow) return
  for (let i = flow.kicks.length - 1; i >= 0; i--) {
    const k = flow.kicks[i]
    if (k.team === team && k.player === player && k.result === result) {
      flow.kicks.splice(i, 1)
      flow.penalties[team] = Math.max(0, flow.penalties[team] - (result === 'scored' ? 1 : 0))
      break
    }
  }
  listeners.forEach((fn) => fn())
}

export function effectiveStatus(match: Match): MatchStatus {
  const flow = flows.get(match.id)
  return flow ? flowPhaseStatus(flow.phase) : match.status
}

export function subscribeFlow(fn: () => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}
