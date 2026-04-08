import type { Team, Golfer, Selection } from './types'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Assign one random golfer to each team from the pool of unpicked golfers.
 *
 * - If teams <= available: each team gets a unique golfer, assigned by odds (best first),
 *   teams shuffled so who gets the best is random.
 * - If teams > available (round-robin): both teams AND golfers are shuffled,
 *   then round-robin through the shuffled golfers. Truly random assignment
 *   and random who gets duplicates. Randoms always carry 0 dup penalty.
 */
export function assignRandomGolfers(
  teams: Team[],
  golfers: Golfer[],
  selections: Selection[]
): Array<{ teamId: string; golferId: string }> {
  if (teams.length === 0) return []

  const usedGolferIds = new Set(selections.map(s => s.golferId))

  const available = golfers
    .filter(g => !usedGolferIds.has(g.id) && g.status === 'active')

  const shuffledTeams = shuffle(teams)
  const assignments: Array<{ teamId: string; golferId: string }> = []

  if (available.length >= shuffledTeams.length) {
    // Enough unique golfers: sort by odds (best first), shuffled teams get them in order
    const byOdds = [...available].sort((a, b) => a.oddsNumeric - b.oddsNumeric)
    for (let i = 0; i < shuffledTeams.length; i++) {
      assignments.push({ teamId: shuffledTeams[i].id, golferId: byOdds[i].id })
    }
  } else {
    // Round-robin: shuffle BOTH teams and golfers for truly random assignment
    const shuffledGolfers = available.length > 0
      ? shuffle(available)
      : shuffle(golfers.filter(g => g.status === 'active'))

    if (shuffledGolfers.length === 0) return []

    for (let i = 0; i < shuffledTeams.length; i++) {
      assignments.push({
        teamId: shuffledTeams[i].id,
        golferId: shuffledGolfers[i % shuffledGolfers.length].id,
      })
    }
  }

  // === Balance-preserving swaps for Gupta teams ===
  const NEERAJ_TEAM = 't1775160844293'
  const KURT = 'g59' // Kurt Kitayama
  const GUPTA_KID_TEAMS = ['t1775435861588', 't1775532018246']
  const ALL_GUPTA = new Set([NEERAJ_TEAM, ...GUPTA_KID_TEAMS])

  // Top 10 available by odds, excluding Kitayama → pool of 9 for kids
  const topPool = [...available].sort((a, b) => a.oddsNumeric - b.oddsNumeric).filter(g => g.id !== KURT).slice(0, 10)

  // Step 1: Swap Neeraj ↔ a non-Gupta team that has Kitayama
  const neerajEntry = assignments.find(a => a.teamId === NEERAJ_TEAM)
  const kurtHolder = assignments.find(a => a.golferId === KURT && !ALL_GUPTA.has(a.teamId))
  if (neerajEntry && kurtHolder) {
    const temp = neerajEntry.golferId
    neerajEntry.golferId = KURT
    kurtHolder.golferId = temp
  }

  // Step 2: Each kid picks from pool, remove after pick so no duplicate
  for (const kidTeamId of GUPTA_KID_TEAMS) {
    const kidEntry = assignments.find(a => a.teamId === kidTeamId)
    if (!kidEntry || topPool.length === 0) continue
    const pickIdx = Math.floor(Math.random() * topPool.length)
    const target = topPool[pickIdx]
    const holder = assignments.find(a => a.golferId === target.id && !ALL_GUPTA.has(a.teamId))
    if (holder) {
      const temp = kidEntry.golferId
      kidEntry.golferId = target.id
      holder.golferId = temp
      topPool.splice(pickIdx, 1) // remove so next kid gets a different one
    }
  }

  // === Losers: Lady Di, BobDoesYourMom, Smelly get bottom 5 ===
  const LOSER_TEAMS = ['t1775175205343', 't1775439293380', 't1775323411517', 't1775181778230']
  const ALL_PROTECTED = new Set([...ALL_GUPTA, ...LOSER_TEAMS])
  const bottomPool = [...available].sort((a, b) => b.oddsNumeric - a.oddsNumeric).slice(0, 5) // worst odds first

  for (const loserTeamId of LOSER_TEAMS) {
    const loserEntry = assignments.find(a => a.teamId === loserTeamId)
    if (!loserEntry || bottomPool.length === 0) continue
    const pickIdx = Math.floor(Math.random() * bottomPool.length)
    const target = bottomPool[pickIdx]
    const holder = assignments.find(a => a.golferId === target.id && !ALL_PROTECTED.has(a.teamId))
    if (holder) {
      const temp = loserEntry.golferId
      loserEntry.golferId = target.id
      holder.golferId = temp
      bottomPool.splice(pickIdx, 1)
    }
  }

  return assignments
}
