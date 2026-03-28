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
    const competitions = event?.competitions ?? []
    for (const competition of competitions) {
      const competitors = competition?.competitors ?? []
      for (const competitor of competitors) {
        const athlete = competitor?.athlete ?? {}
        const statusText = competitor?.status?.type?.description ?? ''

        // Parse score from the competitor's score field (e.g. "-13", "+2", "E")
        let scoreToPar = 0
        const scoreStr = String(competitor?.score ?? '0')
        if (scoreStr === 'E') scoreToPar = 0
        else scoreToPar = parseInt(scoreStr, 10) || 0

        // Parse today and thru from linescores or status
        let today = 0
        let thru = ''

        // Try statistics array first
        const stats = competitor?.statistics ?? []
        for (const stat of stats) {
          if (stat.name === 'scoreToPar') scoreToPar = parseInt(stat.value, 10) || 0
          if (stat.name === 'today') today = parseInt(stat.value, 10) || 0
          if (stat.name === 'thru') thru = stat.displayValue ?? ''
        }

        // Fallback: parse thru from status
        if (!thru) {
          thru = competitor?.status?.thru?.displayValue ?? ''
        }

        let status: ESPNGolfer['status'] = 'active'
        const stLower = statusText.toLowerCase()
        if (stLower.includes('cut')) status = 'cut'
        if (stLower.includes('wd') || stLower.includes('withdrawn')) status = 'withdrawn'

        const name = athlete.displayName ?? ''
        if (name) {
          golfers.push({
            id: String(athlete.id ?? competitor.id ?? ''),
            name,
            scoreToPar,
            today,
            thru,
            status,
            position: competitor.status?.position?.displayName ?? String(competitor.order ?? ''),
          })
        }
      }
    }
  }

  return golfers
}

// === Name normalization & fuzzy matching ===

/** Normalize a name for matching: lowercase, strip suffixes, trim */
function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+(jr\.?|sr\.?|iii|iv|ii)$/i, '')
    .replace(/[.']/g, '')
    .trim()
}

/** Split into [first, last] parts */
function nameParts(name: string): { first: string; last: string } {
  const parts = normalize(name).split(/\s+/)
  return {
    first: parts[0] ?? '',
    last: parts[parts.length - 1] ?? '',
  }
}

/** Check if two names are a fuzzy match */
export function fuzzyMatch(a: string, b: string): boolean {
  const na = normalize(a)
  const nb = normalize(b)

  // Exact
  if (na === nb) return true

  // Substring (either direction)
  if (na.includes(nb) || nb.includes(na)) return true

  // Last name match + first initial
  const pa = nameParts(a)
  const pb = nameParts(b)
  if (pa.last === pb.last && pa.first[0] === pb.first[0]) return true

  return false
}

/**
 * Match ESPN golfers to pool golfers.
 *
 * Pass 1: By stored espn_name (exact, most reliable — persisted from previous match)
 * Pass 2: By fuzzy name match
 *
 * Returns matched pairs and unmatched ESPN golfers.
 */
export function matchESPNToPool(
  espnGolfers: ESPNGolfer[],
  poolGolfers: Golfer[],
): { matched: MatchResult[]; unmatched: ESPNGolfer[]; unmatchedPool: Golfer[] } {
  const matched: MatchResult[] = []
  const usedPoolIds = new Set<string>()
  const matchedEspnIds = new Set<string>()

  // Pass 1: match by stored espn_name (persisted link)
  for (const espn of espnGolfers) {
    const espnLower = espn.name.toLowerCase().trim()
    const pool = poolGolfers.find(g =>
      !usedPoolIds.has(g.id) &&
      g.espnName &&
      g.espnName.toLowerCase().trim() === espnLower
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

  // Pass 2: fuzzy name match for remaining
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
