import { useEffect, useRef, useState, useCallback } from 'react'
import type { Golfer, Team, User, Selection, ScoreSnapshot } from '../lib/types'
import { fetchESPNLeaderboard, matchESPNToPool, type ESPNGolfer } from '../lib/espn'
import { updateGolferScores, updateGolfer, saveSnapshots } from '../lib/data-service'
import { computeTeamLeaderboard } from '../lib/scoring'

const POLL_INTERVAL_MS = 30_000 // 30 seconds

export interface LiveScoringState {
  isPolling: boolean
  lastPoll: Date | null
  error: string | null
  unmatchedEspn: ESPNGolfer[]
  unmatchedPool: Golfer[]
  allEspnGolfers: ESPNGolfer[]
}

/**
 * Hook that polls ESPN for live golf scores and writes updates to Supabase.
 * Only active when `enabled` is true (admin has live scoring ON).
 * Pauses when the browser tab is hidden.
 */
export function useLiveScoring(
  enabled: boolean,
  golfers: Golfer[],
  teams: Team[],
  users: User[],
  selections: Selection[],
  snapshots: ScoreSnapshot[],
  onRefresh: () => Promise<void>,
): LiveScoringState {
  const [isPolling, setIsPolling] = useState(false)
  const [lastPoll, setLastPoll] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [unmatchedEspn, setUnmatchedEspn] = useState<ESPNGolfer[]>([])
  const [unmatchedPool, setUnmatchedPool] = useState<Golfer[]>([])
  const [allEspnGolfers, setAllEspnGolfers] = useState<ESPNGolfer[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval>>(null)
  const golfersRef = useRef(golfers)
  golfersRef.current = golfers
  const snapshotSavedRef = useRef(false)

  const poll = useCallback(async () => {
    if (document.hidden) return // skip when tab is backgrounded
    setIsPolling(true)
    try {
      const espnGolfers = await fetchESPNLeaderboard()
      setAllEspnGolfers(espnGolfers)

      const currentGolfers = golfersRef.current
      const { matched, unmatched, unmatchedPool: unPool } = matchESPNToPool(espnGolfers, currentGolfers)
      setUnmatchedEspn(unmatched)
      setUnmatchedPool(unPool)

      // Auto-persist espn_name and flagUrl for new matches
      for (const match of matched) {
        const poolGolfer = currentGolfers.find(g => g.id === match.poolGolferId)
        if (poolGolfer && !poolGolfer.espnName) {
          const updates: Parameters<typeof updateGolfer>[1] = { espnName: match.espnName }
          if (match.flagUrl) updates.flagUrl = match.flagUrl
          await updateGolfer(match.poolGolferId, updates)
        } else if (poolGolfer && match.flagUrl && !poolGolfer.flagUrl) {
          await updateGolfer(match.poolGolferId, { flagUrl: match.flagUrl })
        }
      }

      // Build score updates for matched golfers whose scores are not locked
      const updates: Array<{ id: string; scoreToPar: number; today: number; thru: string; status: Golfer['status'] }> = []
      for (const match of matched) {
        const poolGolfer = currentGolfers.find(g => g.id === match.poolGolferId)
        if (!poolGolfer) continue
        if (poolGolfer.scoreLocked) continue

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

      // Auto-snapshot: when ALL active (non-cut, non-wd) golfers have thru="F"
      const activeGolfers = golfersRef.current.filter(g => g.status === 'active')
      const allFinished = activeGolfers.length > 0 && activeGolfers.every(g => g.thru === 'F')
      if (allFinished && !snapshotSavedRef.current) {
        try {
          const entries = computeTeamLeaderboard(teams, users, golfersRef.current, selections, snapshots, null)
          const snapshotData = entries
            .filter(e => !e.isDisqualified)
            .map(e => ({ teamId: e.team.id, aggregateScore: e.aggregateScore, rank: e.rank }))
          if (snapshotData.length > 0) {
            await saveSnapshots(snapshotData)
            snapshotSavedRef.current = true
            console.log('Auto-saved daily snapshot')
          }
        } catch (err) {
          console.error('Auto-snapshot failed:', err)
        }
      }
      // Reset snapshot flag when a new round starts (not all finished anymore)
      if (!allFinished) {
        snapshotSavedRef.current = false
      }

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

  return { isPolling, lastPoll, error, unmatchedEspn, unmatchedPool, allEspnGolfers }
}
