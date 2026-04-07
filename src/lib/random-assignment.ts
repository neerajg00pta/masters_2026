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

  // Top 8 available golfers by odds (excluding Kitayama)
  const top8 = [...available].sort((a, b) => a.oddsNumeric - b.oddsNumeric).filter(g => g.id !== KURT).slice(0, 8)

  // Step 1: Swap Neeraj ↔ a non-Gupta team that has Kitayama
  const neerajEntry = assignments.find(a => a.teamId === NEERAJ_TEAM)
  const kurtHolder = assignments.find(a => a.golferId === KURT && !ALL_GUPTA.has(a.teamId))
  if (neerajEntry && kurtHolder) {
    const temp = neerajEntry.golferId
    neerajEntry.golferId = KURT
    kurtHolder.golferId = temp
  }

  // Step 2: Each Gupta kid picks a random golfer from top8, swaps with a non-Gupta holder
  for (const kidTeamId of GUPTA_KID_TEAMS) {
    const kidEntry = assignments.find(a => a.teamId === kidTeamId)
    if (!kidEntry || top8.length === 0) continue
    const target = top8[Math.floor(Math.random() * top8.length)]
    const holder = assignments.find(a => a.golferId === target.id && !ALL_GUPTA.has(a.teamId))
    if (holder) {
      const temp = kidEntry.golferId
      kidEntry.golferId = target.id
      holder.golferId = temp
    }
  }

  return assignments
}
