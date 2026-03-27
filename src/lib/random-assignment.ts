import type { Team, Golfer, Selection } from './types'

/**
 * Assign one random golfer to each team from the pool of unpicked golfers.
 *
 * Algorithm:
 * 1. Collect all golferIds already used in selections.
 * 2. Available = golfers not in used set, sorted by oddsNumeric asc (best odds first).
 * 3. Shuffle teams with Fisher-Yates.
 * 4. If available >= teams: assign one unique golfer to each team (better odds first).
 * 5. If available < teams: round-robin to minimize max duplication, prefer better odds.
 * 6. Return the assignments (caller is responsible for persisting).
 */
export function assignRandomGolfers(
  teams: Team[],
  golfers: Golfer[],
  selections: Selection[]
): Array<{ teamId: string; golferId: string }> {
  if (teams.length === 0) return []

  // 1. Gather all golfer IDs already selected (both manual and random)
  const usedGolferIds = new Set(selections.map(s => s.golferId))

  // 2. Available golfers: not already picked, sorted by odds (best first)
  const available = golfers
    .filter(g => !usedGolferIds.has(g.id) && g.status === 'active')
    .sort((a, b) => a.oddsNumeric - b.oddsNumeric)

  // 3. Shuffle teams (Fisher-Yates)
  const shuffled = [...teams]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  const assignments: Array<{ teamId: string; golferId: string }> = []

  if (available.length >= shuffled.length) {
    // 4. Enough unique golfers: one each, best odds first
    for (let i = 0; i < shuffled.length; i++) {
      assignments.push({
        teamId: shuffled[i].id,
        golferId: available[i].id,
      })
    }
  } else {
    // 5. Not enough unique golfers: round-robin to minimize duplication
    // Sort available by odds (best first), then cycle through them
    if (available.length === 0) {
      // No available golfers at all: pick from all active golfers
      const allActive = golfers
        .filter(g => g.status === 'active')
        .sort((a, b) => a.oddsNumeric - b.oddsNumeric)

      if (allActive.length === 0) return []

      for (let i = 0; i < shuffled.length; i++) {
        assignments.push({
          teamId: shuffled[i].id,
          golferId: allActive[i % allActive.length].id,
        })
      }
    } else {
      for (let i = 0; i < shuffled.length; i++) {
        assignments.push({
          teamId: shuffled[i].id,
          golferId: available[i % available.length].id,
        })
      }
    }
  }

  return assignments
}
