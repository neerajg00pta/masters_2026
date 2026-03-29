// === Data model types ===

export interface Config {
  poolLocked: boolean
  randomsAssigned: boolean
  liveScoring: boolean
}

export interface User {
  id: string
  name: string
  fullName: string | null
  email: string
  admin: boolean
  paid: boolean
  createdAt: string
}

export interface Team {
  id: string
  userId: string
  teamName: string
  confirmed: boolean
  createdAt: string
}

export interface Golfer {
  id: string
  name: string
  espnName: string | null
  odds: string | null
  oddsNumeric: number
  worldRank: number | null
  scoreToPar: number
  today: number
  thru: string
  status: 'active' | 'cut' | 'withdrawn'
  sortOrder: number
  scoreLocked: boolean
  flagUrl: string | null
  espnId: string | null
  mastersId: string | null
}

export interface Selection {
  id: string
  teamId: string
  golferId: string
  isRandom: boolean
  pickedAt: string
}

export interface ScoreSnapshot {
  id: number
  snapshotDate: string
  teamId: string
  aggregateScore: number
  rank: number
}

// === Derived types for scoring ===

export interface ScoredGolfer {
  golfer: Golfer
  isRandom: boolean
  dupCount: number
  dupPenalty: number
  adjScore: number   // scoreToPar + dupPenalty (CUT_SCORE for cut/withdrawn)
  isCut: boolean
}

export interface TeamLeaderboardEntry {
  team: Team
  user: User
  scoredGolfers: ScoredGolfer[]     // all 6 sorted by adjScore asc
  countingGolfers: ScoredGolfer[]   // top 4 non-cut
  aggregateScore: number
  rank: number
  rankDisplay: string               // "1", "T3"
  behind: number | null
  yesterdayRank: number | null
  rankDelta: number | null          // positive = improved
  isDisqualified: boolean
  isLive: boolean
}

export interface PlayerLeaderboardEntry {
  golfer: Golfer
  dupCount: number
  dupPenalty: number
  adjScore: number
  isOnRandomTeam: boolean
  teamNames: string[]
}

// === Constants ===

export const PICKS_PER_TEAM = 5
export const COUNTING_GOLFERS = 4
export const MIN_ACTIVE_FOR_QUALIFYING = 4
export const CUT_SCORE = 100

// === Utility functions ===

/** Score display: -5, 3, or "-" for even (never "0" or "E") */
export function formatScore(score: number): string {
  if (score >= CUT_SCORE) return 'CUT'
  if (score === 0) return '-'
  return `${score}`
}

/** Check if a golfer is currently on the course (thru is purely a number 1-17) */
export function isGolferLive(thru: string): boolean {
  if (!/^\d+$/.test(thru.trim())) return false
  const n = parseInt(thru, 10)
  return n >= 1 && n <= 17
}

/** Deterministic color from user ID */
const PALETTE = [
  '#006747', '#1a7d5a', '#2ea043', '#0969da', '#8250df',
  '#cf222e', '#d4a72c', '#e16f24', '#6e7781', '#57606a',
]

export function ownerColor(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0
  }
  return PALETTE[Math.abs(hash) % PALETTE.length]
}
