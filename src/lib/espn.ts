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
 * Fetch the ESPN PGA leaderboard.
 */
export async function fetchESPNLeaderboard(): Promise<ESPNGolfer[]> {
  const url = 'https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard'
  const res = await fetch(url)
  if (!res.ok) throw new Error(`ESPN API ${res.status}`)
  const data = await res.json()

  const golfers: ESPNGolfer[] = []

  const events = data?.events ?? []
  for (const event of events) {
    // Get current round from competition status
    const competition = event?.competitions?.[0]
    if (!competition) continue
    const currentRound = competition?.status?.period ?? 0
    const competitors = competition?.competitors ?? []

    for (const competitor of competitors) {
      const athlete = competitor?.athlete ?? {}
      const name = athlete.displayName ?? ''
      if (!name) continue

      // Overall score-to-par: competitor.score (number or string like "-13", "+2", "E")
      let scoreToPar = 0
      const scoreVal = competitor?.score
      if (typeof scoreVal === 'number') {
        scoreToPar = scoreVal
      } else if (typeof scoreVal === 'string') {
        if (scoreVal === 'E') scoreToPar = 0
        else scoreToPar = parseInt(scoreVal, 10) || 0
      }

      // Today's score and thru from linescores for current round
      let today = 0
      let thru = ''
      const linescores = competitor?.linescores ?? []

      // Try statistics array (some formats have this)
      const stats = competitor?.statistics ?? []
      for (const stat of stats) {
        if (stat.name === 'today') today = parseInt(stat.value, 10) || 0
        if (stat.name === 'thru') thru = stat.displayValue ?? ''
      }

      // If no stats, derive from linescores
      if (!thru && currentRound > 0) {
        const currentRoundScore = linescores.find(
          (ls: { period: number }) => ls.period === currentRound
        )
        if (currentRoundScore) {
          const roundDisplay = currentRoundScore.displayValue
          if (roundDisplay && roundDisplay !== '-' && roundDisplay !== null) {
            // Player has a score for current round
            today = parseInt(roundDisplay, 10) || 0
            // If the round has a value (strokes), player has finished or is playing
            if (currentRoundScore.value && currentRoundScore.value > 0) {
              thru = 'F' // completed this round
            }
          }
        }

        // Check if player hasn't started current round
        const completedRounds = linescores.filter(
          (ls: { value: number | null }) => ls.value && ls.value > 0
        ).length
        if (completedRounds < currentRound) {
          // Still playing or hasn't started
          if (!thru) thru = '--'
        }
      }

      // For completed tournaments or between rounds, check if all rounds done
      if (!thru) {
        const completedRounds = linescores.filter(
          (ls: { value: number | null }) => ls.value && ls.value > 0
        ).length
        if (completedRounds >= 2) thru = 'F' // at least through the cut
      }

      // Status: cut/withdrawn detection
      let status: ESPNGolfer['status'] = 'active'
      const statusDesc = (competitor?.status?.type?.description ?? '').toLowerCase()
      if (statusDesc.includes('cut')) status = 'cut'
      else if (statusDesc.includes('wd') || statusDesc.includes('withdrawn')) status = 'withdrawn'

      golfers.push({
        id: String(athlete.id ?? competitor.id ?? ''),
        name,
        scoreToPar,
        today,
        thru,
        status,
        position: String(competitor.order ?? ''),
      })
    }
  }

  return golfers
}

// === Name normalization & fuzzy matching ===

function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+(jr\.?|sr\.?|iii|iv|ii)$/i, '')
    .replace(/[.']/g, '')
    .trim()
}

function nameParts(name: string): { first: string; last: string } {
  const parts = normalize(name).split(/\s+/)
  return { first: parts[0] ?? '', last: parts[parts.length - 1] ?? '' }
}

export function fuzzyMatch(a: string, b: string): boolean {
  const na = normalize(a)
  const nb = normalize(b)
  if (na === nb) return true
  if (na.includes(nb) || nb.includes(na)) return true
  const pa = nameParts(a)
  const pb = nameParts(b)
  if (pa.last === pb.last && pa.first && pb.first && pa.first[0] === pb.first[0]) return true
  return false
}

/**
 * Match ESPN golfers to pool golfers.
 * Pass 1: By stored espn_name (persisted link — most reliable)
 * Pass 2: By fuzzy name match
 */
export function matchESPNToPool(
  espnGolfers: ESPNGolfer[],
  poolGolfers: Golfer[],
): { matched: MatchResult[]; unmatched: ESPNGolfer[]; unmatchedPool: Golfer[] } {
  const matched: MatchResult[] = []
  const usedPoolIds = new Set<string>()
  const matchedEspnIds = new Set<string>()

  // Pass 1: by stored espn_name
  for (const espn of espnGolfers) {
    const espnLower = espn.name.toLowerCase().trim()
    const pool = poolGolfers.find(g =>
      !usedPoolIds.has(g.id) && g.espnName && g.espnName.toLowerCase().trim() === espnLower
    )
    if (pool) {
      usedPoolIds.add(pool.id)
      matchedEspnIds.add(espn.id)
      matched.push({
        poolGolferId: pool.id, espnGolferId: espn.id, espnName: espn.name,
        scoreToPar: espn.scoreToPar, today: espn.today, thru: espn.thru, status: espn.status,
      })
    }
  }

  // Pass 2: fuzzy name match
  for (const espn of espnGolfers) {
    if (matchedEspnIds.has(espn.id)) continue
    const pool = poolGolfers.find(g =>
      !usedPoolIds.has(g.id) && fuzzyMatch(g.name, espn.name)
    )
    if (pool) {
      usedPoolIds.add(pool.id)
      matchedEspnIds.add(espn.id)
      matched.push({
        poolGolferId: pool.id, espnGolferId: espn.id, espnName: espn.name,
        scoreToPar: espn.scoreToPar, today: espn.today, thru: espn.thru, status: espn.status,
      })
    }
  }

  const unmatched = espnGolfers.filter(e => !matchedEspnIds.has(e.id))
  const unmatchedPool = poolGolfers.filter(g => !usedPoolIds.has(g.id))

  return { matched, unmatched, unmatchedPool }
}
