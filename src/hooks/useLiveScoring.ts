import { useEffect, useRef, useState, useCallback } from 'react'
import type { Golfer, Team, User, Selection, ScoreSnapshot } from '../lib/types'
import { fetchESPNLeaderboard, matchESPNToPool, roundDate, type ESPNGolfer } from '../lib/espn'
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
  const snapshotsRef = useRef(snapshots)
  snapshotsRef.current = snapshots
  const teamsRef = useRef(teams)
  teamsRef.current = teams
  const usersRef = useRef(users)
  usersRef.current = users
  const selectionsRef = useRef(selections)
  selectionsRef.current = selections

  const poll = useCallback(async () => {
    if (document.hidden) return // skip when tab is backgrounded
    setIsPolling(true)
    try {
      const { golfers: espnGolfers, currentRound, roundComplete, eventStartDate } = await fetchESPNLeaderboard()
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

      // Auto-snapshot: round-aware — only snapshot completed rounds, dated by round
      if (roundComplete && currentRound > 0 && eventStartDate) {
        const snapshotDateForRound = roundDate(eventStartDate, currentRound)
        const currentSnapshots = snapshotsRef.current
        const alreadySnapshotted = currentSnapshots.some(s => s.snapshotDate === snapshotDateForRound)

        if (!alreadySnapshotted) {
          try {
            const entries = computeTeamLeaderboard(
              teamsRef.current, usersRef.current, golfersRef.current,
              selectionsRef.current, currentSnapshots, null
            )
            const snapshotData = entries
              .filter(e => !e.isDisqualified)
              .map(e => ({ teamId: e.team.id, aggregateScore: e.aggregateScore, rank: e.rank }))
            if (snapshotData.length > 0) {
              await saveSnapshots(snapshotData, snapshotDateForRound)
              console.log(`Auto-saved snapshot for round ${currentRound} (${snapshotDateForRound})`)
              await onRefresh()
            }
          } catch (err) {
            console.error('Auto-snapshot failed:', err)
          }
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
