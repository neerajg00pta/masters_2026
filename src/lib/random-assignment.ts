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

  return assignments
}
