import { useEffect, useRef, useState, useCallback } from 'react'
import type { Golfer, Team, User, Selection, ScoreSnapshot } from '../lib/types'
import { fetchESPNLeaderboard, matchESPNToPool, type ESPNGolfer } from '../lib/espn'
import { updateGolferScores, updateGolfer, saveSnapshots } from '../lib/data-service'
import { computeTeamLeaderboard } from '../lib/scoring'
import { ESPN_TO_MASTERS } from '../lib/masters-ids'

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

      // Auto-persist espnId, espnName, flagUrl, mastersId for new/updated matches
      for (const match of matched) {
        const poolGolfer = currentGolfers.find(g => g.id === match.poolGolferId)
        if (!poolGolfer) continue
        const updates: Parameters<typeof updateGolfer>[1] = {}
        if (!poolGolfer.espnId && match.espnId) updates.espnId = match.espnId
        if (!poolGolfer.espnName) updates.espnName = match.espnName
        if (!poolGolfer.flagUrl && match.flagUrl) updates.flagUrl = match.flagUrl
        if (!poolGolfer.mastersId && match.espnId) {
          const mid = ESPN_TO_MASTERS.get(match.espnId)
          if (mid) updates.mastersId = mid
        }
        if (Object.keys(updates).length > 0) {
          await updateGolfer(match.poolGolferId, updates)
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

      // Auto-snapshot: if all active golfers finished AND no snapshot for today yet
      const todayET = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
      const latestSnapshotDate = snapshots.length > 0 ? snapshots[0].snapshotDate : null
      const alreadySnapshotToday = latestSnapshotDate === todayET

      const activeGolfers = golfersRef.current.filter(g => g.status === 'active')
      const allFinished = activeGolfers.length > 0 && activeGolfers.every(g => g.thru === 'F')
      if (allFinished && !alreadySnapshotToday) {
        try {
          const entries = computeTeamLeaderboard(teams, users, golfersRef.current, selections, snapshots, null)
          const snapshotData = entries
            .filter(e => !e.isDisqualified)
            .map(e => ({ teamId: e.team.id, aggregateScore: e.aggregateScore, rank: e.rank }))
          if (snapshotData.length > 0) {
            await saveSnapshots(snapshotData)
            console.log('Auto-saved daily snapshot for', todayET)
          }
        } catch (err) {
          console.error('Auto-snapshot failed:', err)
        }
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
