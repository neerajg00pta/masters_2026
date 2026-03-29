import type { Golfer } from './types'

/** Golfer data from ESPN leaderboard API */
export interface ESPNGolfer {
  id: string
  name: string
  scoreToPar: number
  today: number
  thru: string        // "F", "3", "11:33a", "--"
  status: 'active' | 'cut' | 'withdrawn'
  position: string
  flagUrl: string | null
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
  flagUrl: string | null
}

/** Format tee time: "11:33 AM ET" → "11:33a", "2:15 PM ET" → "2:15p" */
function formatTeeTime(detail: string): string {
  // detail is like "11:33 AM ET" or "2:15 PM ET"
  const m = detail.match(/(\d{1,2}:\d{2})\s*(AM|PM)/i)
  if (!m) return detail
  const time = m[1]
  const ampm = m[2].toLowerCase().charAt(0) // 'a' or 'p'
  return `${time}${ampm}`
}

/**
 * Fetch ESPN PGA leaderboard — single endpoint for everything.
 */
export async function fetchESPNLeaderboard(): Promise<ESPNGolfer[]> {
  const url = 'https://site.web.api.espn.com/apis/site/v2/sports/golf/leaderboard?league=pga'
  const res = await fetch(url)
  if (!res.ok) throw new Error(`ESPN API ${res.status}`)
  const data = await res.json()

  const golfers: ESPNGolfer[] = []
  const events = data?.events ?? []
  for (const event of events) {
    const competitors = event?.competitions?.[0]?.competitors ?? []
    for (const c of competitors) {
      const athlete = c?.athlete ?? {}
      const name = athlete.displayName ?? ''
      if (!name) continue

      const st = c?.status ?? {}
      const stateType = st?.type?.state ?? ''
      const detail = st?.detail ?? ''

      // Score
      let scoreToPar = 0
      const scoreObj = c?.score
      if (scoreObj) {
        const dv = typeof scoreObj === 'object' ? scoreObj.displayValue : String(scoreObj)
        if (dv === 'E') scoreToPar = 0
        else scoreToPar = parseInt(dv, 10) || 0
      }

      // Today — from current round linescore
      let today = 0
      const linescores = c?.linescores ?? []
      const currentRound = event?.competitions?.[0]?.status?.period ?? 0
      if (currentRound > 0) {
        const roundScore = linescores.find((ls: { period: number }) => ls.period === currentRound)
        if (roundScore?.displayValue && roundScore.displayValue !== '-') {
          today = parseInt(roundScore.displayValue, 10) || 0
        }
      }

      // Thru — depends on state
      let thru = ''
      if (stateType === 'pre') {
        // Hasn't teed off — show tee time
        thru = detail ? formatTeeTime(detail) : '--'
      } else if (stateType === 'in') {
        // Mid-round — show holes completed
        const thruVal = st?.thru
        if (typeof thruVal === 'number') {
          thru = String(thruVal)
        } else {
          // Try parsing from detail like "E(3)"
          const m = detail.match(/\((\d+)\)/)
          thru = m ? m[1] : '--'
        }
      } else if (stateType === 'post') {
        thru = 'F'
      } else {
        thru = '--'
      }

      // Status
      let status: ESPNGolfer['status'] = 'active'
      const detailLower = detail.toLowerCase()
      if (detailLower.includes('cut')) status = 'cut'
      else if (detailLower.includes('wd') || detailLower.includes('withdrawn')) status = 'withdrawn'

      // Flag
      const flag = athlete?.flag ?? {}
      const flagUrl = flag?.href ?? null

      golfers.push({
        id: String(athlete.id ?? c.id ?? ''),
        name,
        scoreToPar,
        today,
        thru,
        status,
        position: String(c?.status?.position?.displayName ?? c?.order ?? ''),
        flagUrl,
      })
    }
  }

  return golfers
}

// === Name normalization & fuzzy matching ===

function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/\(a\)/gi, '')
    .replace(/\s+(jr\.?|sr\.?|iii|iv|ii)$/i, '')
    .replace(/[.''`,-]/g, '')
    .replace(/\s+/g, ' ')
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
 * Pass 1: By stored espn_name (persisted link)
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
        scoreToPar: espn.scoreToPar, today: espn.today, thru: espn.thru,
        status: espn.status, flagUrl: espn.flagUrl,
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
        scoreToPar: espn.scoreToPar, today: espn.today, thru: espn.thru,
        status: espn.status, flagUrl: espn.flagUrl,
      })
    }
  }

  const unmatched = espnGolfers.filter(e => !matchedEspnIds.has(e.id))
  const unmatchedPool = poolGolfers.filter(g => !usedPoolIds.has(g.id))

  return { matched, unmatched, unmatchedPool }
}
