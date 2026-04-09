import type {
  Golfer,
  Selection,
  Team,
  User,
  ScoreSnapshot,
  ScoredGolfer,
  TeamLeaderboardEntry,
  PlayerLeaderboardEntry,
} from './types'
import { CUT_SCORE, COUNTING_GOLFERS, MIN_ACTIVE_FOR_QUALIFYING, isGolferLive } from './types'

// === Duplicate counting ===

/** Count how many teams each golfer appears on (non-random picks only for penalty calc) */
export function computeDupCounts(selections: Selection[]): Map<string, number> {
  const counts = new Map<string, number>()
  // Count unique teams per golfer (only non-random picks incur dup penalty)
  const golferTeams = new Map<string, Set<string>>()

  for (const sel of selections) {
    if (sel.isRandom) continue
    if (!golferTeams.has(sel.golferId)) {
      golferTeams.set(sel.golferId, new Set())
    }
    golferTeams.get(sel.golferId)!.add(sel.teamId)
  }

  for (const [golferId, teamSet] of golferTeams) {
    counts.set(golferId, teamSet.size)
  }
  return counts
}

// === Individual golfer scoring ===

/** Score a single golfer for a team */
export function scoreGolfer(
  golfer: Golfer,
  isRandom: boolean,
  dupCount: number
): ScoredGolfer {
  const isCut = golfer.status !== 'active'
  const dupPenalty = isRandom ? 0 : Math.max(0, dupCount - 1)
  const adjScore = isCut ? CUT_SCORE : golfer.scoreToPar + dupPenalty

  return {
    golfer,
    isRandom,
    dupCount,
    dupPenalty,
    adjScore,
    isCut,
  }
}

// === Team leaderboard ===

export function computeTeamLeaderboard(
  teams: Team[],
  users: User[],
  golfers: Golfer[],
  selections: Selection[],
  snapshots: ScoreSnapshot[],
  _currentUserId: string | null
): TeamLeaderboardEntry[] {
  const userMap = new Map(users.map(u => [u.id, u]))
  const golferMap = new Map(golfers.map(g => [g.id, g]))
  const dupCounts = computeDupCounts(selections)

  // Build snapshot lookup: teamId -> rank from YESTERDAY's snapshot
  // (not today's, since today's snapshot reflects current state)
  // Use Eastern time (Augusta) for snapshot date comparison
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
  const yesterdaySnapshots = snapshots.filter(s => s.snapshotDate < today)
  const yesterdayDate = yesterdaySnapshots.length > 0 ? yesterdaySnapshots[0].snapshotDate : null
  const dateSnapshots = yesterdayDate ? yesterdaySnapshots.filter(s => s.snapshotDate === yesterdayDate) : []
  const snapshotMap = new Map(dateSnapshots.map(s => [s.teamId, s.rank]))

  // Group selections by team
  const teamSelections = new Map<string, Selection[]>()
  for (const sel of selections) {
    if (!teamSelections.has(sel.teamId)) {
      teamSelections.set(sel.teamId, [])
    }
    teamSelections.get(sel.teamId)!.push(sel)
  }

  const entries: TeamLeaderboardEntry[] = []

  for (const team of teams) {
    const user = userMap.get(team.userId)
    if (!user) continue

    const sels = teamSelections.get(team.id) ?? []

    // Score each golfer
    const scoredGolfers: ScoredGolfer[] = []
    for (const sel of sels) {
      const golfer = golferMap.get(sel.golferId)
      if (!golfer) continue
      const dupCount = dupCounts.get(sel.golferId) ?? 0
      scoredGolfers.push(scoreGolfer(golfer, sel.isRandom, dupCount))
    }

    // Sort by adjScore ascending (best first)
    scoredGolfers.sort((a, b) => a.adjScore - b.adjScore)

    // Counting golfers: top COUNTING_GOLFERS that are not cut
    const activeGolfers = scoredGolfers.filter(sg => !sg.isCut)
    const countingGolfers = activeGolfers.slice(0, COUNTING_GOLFERS)

    // Aggregate score
    const aggregateScore = countingGolfers.reduce((sum, sg) => sum + sg.adjScore, 0)

    // DQ if fewer than MIN_ACTIVE_FOR_QUALIFYING active golfers
    const isDisqualified = activeGolfers.length < MIN_ACTIVE_FOR_QUALIFYING

    // Live if any counting golfer is currently on the course
    const isLive = countingGolfers.some(sg => isGolferLive(sg.golfer.thru))

    // Yesterday rank
    const yesterdayRank = snapshotMap.get(team.id) ?? null

    entries.push({
      team,
      user,
      scoredGolfers,
      countingGolfers,
      aggregateScore,
      rank: 0,          // computed below
      rankDisplay: '',   // computed below
      behind: null,      // computed below
      yesterdayRank,
      rankDelta: null,   // computed below
      isDisqualified,
      isLive,
    })
  }

  // Sort: non-DQ by aggregateScore asc, then DQ at bottom
  entries.sort((a, b) => {
    if (a.isDisqualified !== b.isDisqualified) {
      return a.isDisqualified ? 1 : -1
    }
    return a.aggregateScore - b.aggregateScore
  })

  // Tie-aware ranking
  let currentRank = 1
  for (let i = 0; i < entries.length; i++) {
    if (entries[i].isDisqualified) {
      entries[i].rank = entries.length
      entries[i].rankDisplay = 'DQ'
      continue
    }

    if (i > 0 && !entries[i - 1].isDisqualified &&
        entries[i].aggregateScore === entries[i - 1].aggregateScore) {
      entries[i].rank = entries[i - 1].rank
    } else {
      entries[i].rank = currentRank
    }
    currentRank = i + 2 // next possible rank
  }

  // Determine ties for display prefix
  const rankCounts = new Map<number, number>()
  for (const e of entries) {
    if (!e.isDisqualified) {
      rankCounts.set(e.rank, (rankCounts.get(e.rank) ?? 0) + 1)
    }
  }

  // Compute behind and rankDisplay
  const leaderScore = entries.length > 0 && !entries[0].isDisqualified
    ? entries[0].aggregateScore
    : null

  for (const e of entries) {
    if (e.isDisqualified) {
      e.behind = null
      // rankDisplay already set to 'DQ'
    } else {
      e.behind = leaderScore !== null ? e.aggregateScore - leaderScore : null
      const isTied = (rankCounts.get(e.rank) ?? 0) > 1
      e.rankDisplay = isTied ? `T${e.rank}` : `${e.rank}`
    }

    // Rank delta: positive = improved (moved up)
    if (e.yesterdayRank !== null && !e.isDisqualified) {
      e.rankDelta = e.yesterdayRank - e.rank
    }
  }

  return entries
}

// === Player leaderboard ===

export function computePlayerLeaderboard(
  golfers: Golfer[],
  selections: Selection[],
  teams: Team[]
): PlayerLeaderboardEntry[] {
  const teamMap = new Map(teams.map(t => [t.id, t]))
  const dupCounts = computeDupCounts(selections)

  // Build golfer -> teams mapping
  const golferTeamNames = new Map<string, string[]>()
  const golferIsRandom = new Map<string, boolean>()

  for (const sel of selections) {
    const team = teamMap.get(sel.teamId)
    if (!team) continue

    if (!golferTeamNames.has(sel.golferId)) {
      golferTeamNames.set(sel.golferId, [])
      golferIsRandom.set(sel.golferId, false)
    }
    golferTeamNames.get(sel.golferId)!.push(team.teamName)
    if (sel.isRandom) {
      golferIsRandom.set(sel.golferId, true)
    }
  }

  // Only include golfers that appear on at least one team
  const entries: PlayerLeaderboardEntry[] = []
  for (const golfer of golfers) {
    const teamNames = golferTeamNames.get(golfer.id)
    if (!teamNames || teamNames.length === 0) continue

    const dupCount = dupCounts.get(golfer.id) ?? 0
    const dupPenalty = Math.max(0, dupCount - 1)
    const isCut = golfer.status !== 'active'
    const adjScore = isCut ? CUT_SCORE : golfer.scoreToPar + dupPenalty

    entries.push({
      golfer,
      dupCount,
      dupPenalty,
      adjScore,
      isOnRandomTeam: golferIsRandom.get(golfer.id) ?? false,
      teamNames,
    })
  }

  // Sort by adjScore ascending
  entries.sort((a, b) => a.adjScore - b.adjScore)

  return entries
}

// === Payout positions ===

export type PayoutPosition = 'first' | 'second' | 'last' | 'middle' | null

export function getPayoutPosition(
  entry: TeamLeaderboardEntry,
  allEntries: TeamLeaderboardEntry[]
): PayoutPosition {
  if (entry.isDisqualified) return null

  const nonDq = allEntries.filter(e => !e.isDisqualified)
  if (nonDq.length === 0) return null

  // 1st rank
  if (entry.rank === 1) return 'first'

  // 2nd rank — only if 1st is NOT tied (tie for 1st eliminates 2nd place prize)
  const firstCount = nonDq.filter(e => e.rank === 1).length
  const ranks = [...new Set(nonDq.map(e => e.rank))].sort((a, b) => a - b)
  if (firstCount === 1 && ranks.length >= 2 && entry.rank === ranks[1]) return 'second'

  // Last non-DQ rank
  const lastRank = ranks[ranks.length - 1]
  if (entry.rank === lastRank && ranks.length > 2) return 'last'

  // Middle position: floor((count - 1) / 2) — rounds down for even counts
  const middleIndex = Math.floor((nonDq.length - 1) / 2)
  if (middleIndex > 0 && middleIndex < nonDq.length) {
    const middleRank = nonDq[middleIndex].rank
    if (entry.rank === middleRank && entry.rank !== ranks[0] && entry.rank !== lastRank) {
      return 'middle'
    }
  }

  return null
}
