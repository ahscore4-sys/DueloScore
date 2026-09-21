interface ClockEntry {
  seconds: number
  running: boolean
}

const clocks = new Map<string, ClockEntry>()
const listeners = new Set<() => void>()
let timer: number | undefined

function tick() {
  for (const entry of clocks.values()) {
    if (entry.running) entry.seconds += 1
  }
  listeners.forEach((fn) => fn())
}

function ensureTimer() {
  if (timer === undefined) timer = window.setInterval(tick, 1000)
}

export function initClock(id: string, startMinute: number) {
  if (!clocks.has(id)) {
    clocks.set(id, { seconds: startMinute * 60, running: startMinute > 0 })
    ensureTimer()
  }
}

export function initClockFromFirestore(id: string, baseSeconds: number, startedAt: string | null, running: boolean) {
  const seconds = running && startedAt
    ? baseSeconds + (Date.now() - new Date(startedAt).getTime()) / 1000
    : baseSeconds
  clocks.set(id, { seconds: Math.floor(seconds), running })
  ensureTimer()
}

export function getClock(id: string) {
  return clocks.get(id)
}

export function setClockRunning(id: string, running: boolean) {
  const entry = clocks.get(id)
  if (entry) entry.running = running
}

export function setClockSeconds(id: string, seconds: number) {
  const entry = clocks.get(id)
  if (entry) entry.seconds = seconds
}

export function clockMinute(seconds: number) {
  return Math.floor(seconds / 60)
}

export function subscribeClock(fn: () => void) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}
