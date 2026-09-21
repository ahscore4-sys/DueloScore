import type { LeagueStandings, Match, MatchEvent, MatchStatus, Team } from './types'
import { isFinished } from './lib/matchStatus'

export type { LeagueStandings, Match, MatchEvent, MatchStatus, Team }

export const barca: Team = { id: 'barca', name: 'برشلونة', short: 'BAR', color: '#0057A8', gkColor: '#A7005A' }
export const madrid: Team = { id: 'madrid', name: 'ريال مدريد', short: 'RMA', color: '#E7E9EE', gkColor: '#FEBE10' }

const mockControl = (status: MatchStatus) => ({
  controlPhase: status,
  clockBaseSeconds: 0,
  clockStartedAt: null,
  clockRunning: false,
  addedTime: {} as Record<string, number>,
  penalties: { home: 0, away: 0 },
  penaltyKicks: [],
})

export const mainCompetitions: string[] = [
  'الدوري الإسباني',
  'كأس ملك إسبانيا',
  'دوري أبطال أوروبا',
  'كأس السوبر الإسباني',
]

export const mainTeams: string[] = [barca.name, madrid.name]

export const matches: Match[] = [
  {
    id: 'm1',
    home: barca,
    away: madrid,
    competition: 'الدوري الإسباني',
    round: 'الجولة 28',
    season: '2025/26',
    date: '2026-08-07',
    kickoff: '22:00',
    stadium: 'كامب نو',
    channels: ['beIN Sports 1', 'beIN Sports 4K'],
    commentators: ['عصام الشوالي', 'فارس عوض'],
    status: 'penalties',
    score: { home: 0, away: 0 },

    ...mockControl('penalties'),
  },
  {
    id: 'm5',
    home: { id: 'getafe', name: 'خيتافي', short: 'GET', color: '#1E88E5' },
    away: barca,
    competition: 'الدوري الإسباني',
    round: 'الجولة 30',
    season: '2025/26',
    date: '2026-08-07',
    kickoff: '21:00',
    stadium: 'كوليسيوم ألفونسو بيريز',
    channels: ['beIN Sports 2'],
    commentators: ['حسن العيدروس'],
    status: 'first_half',
    score: { home: 0, away: 1 },

    ...mockControl('first_half'),
  },
  {
    id: 'm3',
    home: madrid,
    away: { id: 'atletico', name: 'أتلتيكو مدريد', short: 'ATM', color: '#E91E63' },
    competition: 'كأس ملك إسبانيا',
    round: 'نصف النهائي',
    season: '2025/26',
    date: '2026-08-13',
    kickoff: '22:30',
    stadium: 'سانتياغو برنابيو',
    channels: ['beIN Sports 3'],
    commentators: ['عصام الشوالي'],
    status: 'not_started',
    score: { home: 0, away: 0 },

    ...mockControl('not_started'),
  },
  {
    id: 'm6',
    home: madrid,
    away: { id: 'athletic', name: 'أتلتيك بيلباو', short: 'ATH', color: '#37474F' },
    competition: 'كأس ملك إسبانيا',
    round: 'النهائي',
    season: '2025/26',
    date: '2026-08-08',
    kickoff: '22:00',
    stadium: 'لا كارتوخا',
    channels: ['beIN Sports 1'],
    commentators: ['عصام الشوالي', 'فارس عوض'],
    status: 'penalties',
    score: { home: 1, away: 1 },

    ...mockControl('penalties'),
  },
  {
    id: 'm4',
    home: { id: 'bilbao', name: 'أتلتيك بيلباو', short: 'ATH', color: '#37474F' },
    away: madrid,
    competition: 'الدوري الإسباني',
    round: 'الجولة 27',
    season: '2025/26',
    date: '2026-08-07',
    kickoff: 'انتهت',
    stadium: 'سان ماميس',
    channels: ['beIN Sports 1'],
    commentators: ['فارس عوض'],
    status: 'full_time',
    score: { home: 0, away: 2 },
    ...mockControl('full_time'),
  },
]

export const liveEvents: MatchEvent[] = [
  { id: 'e1', minute: "23'", type: 'yellow', player: 'أراوخو', team: 'home' },
  { id: 'e2', minute: "31'", type: 'goal', player: 'لامين يامال', team: 'home' },
  { id: 'e3', minute: "45'", type: 'pen_missed', player: 'مبابي', team: 'away' },
  { id: 'e4', minute: "48'", type: 'goal', player: 'فينيسيوس', team: 'away' },
  { id: 'e5', minute: "52'", type: 'sub', player: 'كامافينغا ← مودريتش', team: 'away' },
  { id: 'e6', minute: "58'", type: 'yellow', player: 'تشواميني', team: 'away' },
  { id: 'e7', minute: "61'", type: 'goal', player: 'ليفاندوفسكي', team: 'home' },
  { id: 'e8', minute: "78'", type: 'og', player: 'كوندي', team: 'away' },
]

export const fixtures = matches.filter((m) => !isFinished(m.status))

export const leagueStandings: LeagueStandings[] = [
  {
    id: 'standings-laliga-2025',
    competition: 'الدوري الإسباني',
    season: '2025/26',
    table: [
      { id: 'sr1', team: barca, played: 30, won: 23, drawn: 5, lost: 2, goalsFor: 84, goalsAgainst: 26, points: 74 },
      { id: 'sr2', team: madrid, played: 30, won: 21, drawn: 6, lost: 3, goalsFor: 72, goalsAgainst: 31, points: 69 },
      { id: 'sr3', team: { id: 'atletico', name: 'أتلتيكو مدريد', short: 'ATM', color: '#E91E63' }, played: 30, won: 18, drawn: 7, lost: 5, goalsFor: 55, goalsAgainst: 32, points: 61 },
      { id: 'sr4', team: { id: 'athletic', name: 'أتلتيك بيلباو', short: 'ATH', color: '#37474F' }, played: 30, won: 16, drawn: 8, lost: 6, goalsFor: 50, goalsAgainst: 30, points: 56 },
      { id: 'sr5', team: { id: 'sociedad', name: 'ريال سوسيداد', short: 'RSO', color: '#1976D2' }, played: 30, won: 14, drawn: 8, lost: 8, goalsFor: 46, goalsAgainst: 34, points: 50 },
      { id: 'sr6', team: { id: 'villarreal', name: 'فياريال', short: 'VIL', color: '#FDD835' }, played: 30, won: 13, drawn: 9, lost: 8, goalsFor: 52, goalsAgainst: 44, points: 48 },
      { id: 'sr7', team: { id: 'betis', name: 'ريال بيتيس', short: 'BET', color: '#00897B' }, played: 30, won: 12, drawn: 9, lost: 9, goalsFor: 40, goalsAgainst: 37, points: 45 },
      { id: 'sr8', team: { id: 'sevilla', name: 'إشبيلية', short: 'SEV', color: '#C62828' }, played: 30, won: 11, drawn: 8, lost: 11, goalsFor: 38, goalsAgainst: 42, points: 41 },
      { id: 'sr9', team: { id: 'getafe', name: 'خيتافي', short: 'GET', color: '#1E88E5' }, played: 30, won: 9, drawn: 8, lost: 13, goalsFor: 28, goalsAgainst: 40, points: 35 },
      { id: 'sr10', team: { id: 'valencia', name: 'فالنسيا', short: 'VAL', color: '#EF6C00' }, played: 30, won: 8, drawn: 9, lost: 13, goalsFor: 30, goalsAgainst: 41, points: 33 },
    ],
  },
  {
    id: 'standings-uefa-2025',
    competition: 'دوري أبطال أوروبا',
    season: '2025/26',
    table: [
      { id: 'ue1', team: barca, played: 6, won: 5, drawn: 1, lost: 0, goalsFor: 16, goalsAgainst: 5, points: 16 },
      { id: 'ue2', team: { id: 'liverpool', name: 'ليفربول', short: 'LIV', color: '#D32F2F' }, played: 6, won: 4, drawn: 1, lost: 1, goalsFor: 13, goalsAgainst: 7, points: 13 },
      { id: 'ue3', team: { id: 'inter', name: 'إنتر ميلان', short: 'INT', color: '#1565C0' }, played: 6, won: 2, drawn: 2, lost: 2, goalsFor: 8, goalsAgainst: 9, points: 8 },
      { id: 'ue4', team: { id: 'salzburg', name: 'سالزبورغ', short: 'RBS', color: '#B71C1C' }, played: 6, won: 0, drawn: 0, lost: 6, goalsFor: 4, goalsAgainst: 20, points: 0 },
    ],
  },
]

export const latestEvents = liveEvents.slice(0, 5)

export const newsDrafts = [
  { title: 'تحليل: مفاتيح الكلاسيكو أمام برشلونة', team: 'برشلونة', status: 'مسودة' },
  { title: 'تشكيلة الريال المتوقعة ضد إشبيلية', team: 'ريال مدريد', status: 'مسودة' },
]

export const openPolls = [
  { question: 'من سيكون أفضل لاعب في الكلاسيكو؟', team: 'برشلونة', endsAt: 'ينتهي خلال 3 ساعات' },
  { question: 'متى يسجل الريال هدفه الأول؟', team: 'ريال مدريد', endsAt: 'ينتهي خلال 4 ساعات' },
]
