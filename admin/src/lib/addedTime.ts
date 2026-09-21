import type { ControlPhase } from './matchFlow'

const declared = new Map<string, number>()
const listeners = new Set<() => void>()

function key(id: string, phase: ControlPhase): string {
  return `${id}:${phase}`
}

export function getDeclaredExtra(id: string, phase: ControlPhase): number {
  return declared.get(key(id, phase)) ?? 0
}

export function setDeclaredExtra(id: string, phase: ControlPhase, minutes: number): void {
  declared.set(key(id, phase), Math.max(0, Math.min(15, Math.round(minutes))))
  listeners.forEach((fn) => fn())
}

export function initAddedTimeFromFirestore(id: string, addedTime: Record<string, number>): void {
  for (const [phase, minutes] of Object.entries(addedTime)) {
    declared.set(key(id, phase as ControlPhase), minutes)
  }
  listeners.forEach((fn) => fn())
}

export function subscribeAddedTime(fn: () => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}
