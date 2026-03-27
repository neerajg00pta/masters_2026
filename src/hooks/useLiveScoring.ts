import { useEffect, useRef, useState, useCallback } from 'react'
import type { Golfer } from '../lib/types'
import { fetchESPNLeaderboard, matchESPNToPool, type ESPNGolfer } from '../lib/espn'
import { updateGolferScores } from '../lib/data-service'

const POLL_INTERVAL_MS = 30_000 // 30 seconds

export interface LiveScoringState {
  isPolling: boolean
  lastPoll: Date | null
  error: string | null
  unmatchedEspn: ESPNGolfer[]
}

/**
 * Hook that polls ESPN for live golf scores and writes updates to Supabase.
 * Only active when `enabled` is true (admin has live scoring ON).
 * Pauses when the browser tab is hidden.
 */
export function useLiveScoring(
  enabled: boolean,
  golfers: Golfer[],
  onRefresh: () => Promise<void>,
): LiveScoringState {
  const [isPolling, setIsPolling] = useState(false)
  const [lastPoll, setLastPoll] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [unmatchedEspn, setUnmatchedEspn] = useState<ESPNGolfer[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval>>(null)
  const golfersRef = useRef(golfers)
  golfersRef.current = golfers

  const poll = useCallback(async () => {
    if (document.hidden) return // skip when tab is backgrounded
    setIsPolling(true)
    try {
      const espnGolfers = await fetchESPNLeaderboard()

      const currentGolfers = golfersRef.current
      const { matched, unmatched } = matchESPNToPool(espnGolfers, currentGolfers)
      setUnmatchedEspn(unmatched)

      // Build updates for matched golfers whose scores are not locked
      const updates: Array<{ id: string; scoreToPar: number; today: number; thru: string; status: Golfer['status'] }> = []
      for (const match of matched) {
        const poolGolfer = currentGolfers.find(g => g.id === match.poolGolferId)
        if (!poolGolfer) continue
        if (poolGolfer.scoreLocked) continue // skip manually edited

        const changed =
          poolGolfer.scoreToPar !== match.scoreToPar ||
          poolGolfer.today !== match.today ||
          poolGolfer.thru !== match.thru ||
          poolGolfer.status !== match.status

        if (changed) {
          updates.push({
            id: poolGolfer.id,
            scoreToPar: match.scoreToPar,
            today: match.today,
            thru: match.thru,
            status: match.status,
          })
        }
      }

      if (updates.length > 0) {
        await updateGolferScores(updates)
      }

      await onRefresh()

      setError(null)
      setLastPoll(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ESPN fetch failed')
    } finally {
      setIsPolling(false)
    }
  }, [onRefresh])

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      intervalRef.current = null
      setUnmatchedEspn([])
      setLastPoll(null)
      setError(null)
      return
    }

    // Initial poll
    poll()

    // Start interval
    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [enabled, poll])

  return { isPolling, lastPoll, error, unmatchedEspn }
}
