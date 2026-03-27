import type { Golfer } from './types'

/** Golfer data from the ESPN leaderboard API */
export interface ESPNGolfer {
  id: string
  name: string
  scoreToPar: number
  today: number
  thru: string
  status: 'active' | 'cut' | 'withdrawn'
  position: string
}

/** Result of matching an ESPN golfer to a pool golfer */
export interface MatchResult {
  poolGolferId: string
  espnGolferId: string
  espnName: string
  scoreToPar: number
  today: number
  thru: string
  status: Golfer['status']
}

/**
 * Fetch the ESPN Masters leaderboard.
 * Uses the ESPN public API for the Masters tournament.
 */
export async function fetchESPNLeaderboard(): Promise<ESPNGolfer[]> {
  // Masters tournament ID on ESPN -- the PGA scoreboard endpoint returns
  // the current/most-recent tournament
  const url = 'https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard'
  const res = await fetch(url)
  if (!res.ok) throw new Error(`ESPN API ${res.status}`)
  const data = await res.json()

  const golfers: ESPNGolfer[] = []

  // Navigate ESPN's nested response structure
  const events = data?.events ?? []
  for (const event of events) {
    const competitions = event?.competitions ?? []
    for (const competition of competitions) {
      const competitors = competition?.competitors ?? []
      for (const competitor of competitors) {
        const athlete = competitor?.athlete ?? {}
        const stats = competitor?.statistics ?? []
        const statusText = competitor?.status?.type?.description ?? ''

        // Parse score to par from statistics
        let scoreToPar = 0
        let today = 0
        let thru = ''

        for (const stat of stats) {
          if (stat.name === 'scoreToPar') scoreToPar = parseInt(stat.value, 10) || 0
          if (stat.name === 'today') today = parseInt(stat.value, 10) || 0
          if (stat.name === 'thru') thru = stat.displayValue ?? ''
        }

        let status: ESPNGolfer['status'] = 'active'
        if (statusText.toLowerCase().includes('cut')) status = 'cut'
        if (statusText.toLowerCase().includes('wd') || statusText.toLowerCase().includes('withdrawn')) status = 'withdrawn'

        golfers.push({
          id: String(athlete.id ?? competitor.id ?? ''),
          name: athlete.displayName ?? '',
          scoreToPar,
          today,
          thru,
          status,
          position: competitor.status?.position?.displayName ?? '',
        })
      }
    }
  }

  return golfers
}

/**
 * Match ESPN golfers to pool golfers by name.
 * Returns matched pairs and unmatched ESPN golfers.
 */
export function matchESPNToPool(
  espnGolfers: ESPNGolfer[],
  poolGolfers: Golfer[],
): { matched: MatchResult[]; unmatched: ESPNGolfer[] } {
  const matched: MatchResult[] = []
  const unmatched: ESPNGolfer[] = []

  for (const espn of espnGolfers) {
    const espnLower = espn.name.toLowerCase().trim()

    // Try exact match on espnName first, then name
    const pool = poolGolfers.find(g =>
      (g.espnName && g.espnName.toLowerCase().trim() === espnLower) ||
      g.name.toLowerCase().trim() === espnLower
    )

    if (pool) {
      matched.push({
        poolGolferId: pool.id,
        espnGolferId: espn.id,
        espnName: espn.name,
        scoreToPar: espn.scoreToPar,
        today: espn.today,
        thru: espn.thru,
        status: espn.status,
      })
    } else {
      unmatched.push(espn)
    }
  }

  return { matched, unmatched }
}
