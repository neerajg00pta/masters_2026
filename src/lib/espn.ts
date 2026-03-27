import type { Golfer } from './types'

// === ESPN API Types ===

const ESPN_GOLF_SCOREBOARD =
  'https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard'

export interface ESPNGolfer {
  id: string
  name: string
  score: number   // parsed: "E"->0, "-5"->-5, "+2"->2
  today: number
  thru: string    // "F", "1"-"18", tee time, "--"
  status: 'active' | 'cut' | 'withdrawn'
}

// === Fetch ESPN leaderboard ===

export async function fetchESPNLeaderboard(): Promise<ESPNGolfer[]> {
  const resp = await fetch(ESPN_GOLF_SCOREBOARD)
  if (!resp.ok) throw new Error(`ESPN API error: ${resp.status}`)
  const data = await resp.json()

  const golfers: ESPNGolfer[] = []

  // Navigate: events[0].competitions[0].competitors[]
  const event = data.events?.[0]
  if (!event) return golfers

  const competition = event.competitions?.[0]
  if (!competition) return golfers

  const competitors = competition.competitors ?? []

  for (const comp of competitors) {
    const athlete = comp.athlete
    if (!athlete) continue

    const displayName: string = athlete.displayName ?? ''
    const id: string = String(athlete.id ?? comp.id ?? '')

    // Parse score to par
    const scoreStr: string = comp.score ?? comp.statistics?.[0]?.displayValue ?? 'E'
    const score = parseScoreString(scoreStr)

    // Parse today's round score
    const todayStr: string = comp.linescores?.[comp.linescores.length - 1]?.displayValue ?? 'E'
    const today = parseScoreString(todayStr)

    // Parse thru
    const thru = parseThru(comp)

    // Parse status
    const status = parseStatus(comp)

    golfers.push({ id, name: displayName, score, today, thru, status })
  }

  return golfers
}

/** Parse score string: "E"->0, "-5"->-5, "+2"->2, "3"->3 */
function parseScoreString(s: string): number {
  if (!s || s === 'E' || s === '-') return 0
  const n = parseInt(s, 10)
  return isNaN(n) ? 0 : n
}

/** Extract thru/hole info from competitor data */
function parseThru(comp: any): string {
  // Check status detail first
  const statusDetail: string = comp.status?.displayValue ?? ''
  if (statusDetail) {
    // "F" = finished, "1"-"18" = on hole, tee time format
    if (statusDetail === 'F') return 'F'
    const holeNum = parseInt(statusDetail, 10)
    if (!isNaN(holeNum) && holeNum >= 1 && holeNum <= 18) return `${holeNum}`
    return statusDetail
  }

  // Fallback: check linescores for last completed hole
  const linescores = comp.linescores
  if (Array.isArray(linescores) && linescores.length > 0) {
    return 'F'  // has linescores means at least one round completed
  }

  return '--'
}

/** Determine golfer status from ESPN data */
function parseStatus(comp: any): ESPNGolfer['status'] {
  const statusType: string = comp.status?.type?.name ?? ''
  const statusState: string = comp.status?.type?.state ?? ''

  if (statusType === 'STATUS_CUT' || statusState === 'cut') return 'cut'
  if (statusType === 'STATUS_WITHDRAWN' || statusType === 'STATUS_WD' ||
      statusState === 'withdrawn') return 'withdrawn'

  return 'active'
}

// === Name normalization and matching ===

/** Normalize a golfer name for matching: lowercase, trim, strip suffixes */
function normalize(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+(jr\.?|sr\.?|iii|iv|ii)$/i, '')
    .replace(/[.\-']/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Check if two golfer names likely refer to the same person */
export function fuzzyMatchGolfer(poolName: string, espnName: string): boolean {
  if (!poolName || !espnName) return false
  const p = normalize(poolName)
  const e = normalize(espnName)

  // Exact match after normalization
  if (p === e) return true

  // Substring: either contains the other
  if (e.includes(p) || p.includes(e)) return true

  // Last name match: compare last word of each
  const pParts = p.split(' ')
  const eParts = e.split(' ')
  const pLast = pParts[pParts.length - 1]
  const eLast = eParts[eParts.length - 1]

  if (pLast === eLast && pLast.length >= 3) {
    // Last names match — check first name initial
    if (pParts[0][0] === eParts[0][0]) return true
  }

  return false
}

// === Match ESPN golfers to pool golfers ===

export interface ESPNMatchResult {
  golferId: string
  espnGolfer: ESPNGolfer
}

/**
 * Match ESPN leaderboard golfers to pool golfers using a 3-pass strategy:
 * 1. By stored espnName (reliable, persisted from previous matches)
 * 2. By fuzzy name match
 * 3. Unmatched returned separately for admin manual mapping
 */
export function matchESPNToPool(
  espnGolfers: ESPNGolfer[],
  poolGolfers: Golfer[]
): { matched: ESPNMatchResult[]; unmatched: ESPNGolfer[] } {
  const matched: ESPNMatchResult[] = []
  const usedEspnIds = new Set<string>()
  const usedPoolIds = new Set<string>()

  // Pass 1: match by stored espnName (most reliable)
  for (const pool of poolGolfers) {
    if (!pool.espnName) continue
    const espn = espnGolfers.find(
      e => !usedEspnIds.has(e.id) && normalize(e.name) === normalize(pool.espnName!)
    )
    if (!espn) continue

    usedEspnIds.add(espn.id)
    usedPoolIds.add(pool.id)
    matched.push({ golferId: pool.id, espnGolfer: espn })
  }

  // Pass 2: fuzzy name match for remaining
  for (const pool of poolGolfers) {
    if (usedPoolIds.has(pool.id)) continue

    for (const espn of espnGolfers) {
      if (usedEspnIds.has(espn.id)) continue

      if (fuzzyMatchGolfer(pool.name, espn.name)) {
        usedEspnIds.add(espn.id)
        usedPoolIds.add(pool.id)
        matched.push({ golferId: pool.id, espnGolfer: espn })
        break
      }
    }
  }

  // Pass 3: collect unmatched ESPN golfers
  const unmatched = espnGolfers.filter(e => !usedEspnIds.has(e.id))

  return { matched, unmatched }
}
