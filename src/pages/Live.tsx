import { useMemo } from 'react'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { computeTeamLeaderboard, computePlayerLeaderboard, getPayoutPosition } from '../lib/scoring'
import type { PayoutPosition } from '../lib/scoring'
import { TeamLeaderboard } from '../components/TeamLeaderboard'
import { PlayerLeaderboard } from '../components/PlayerLeaderboard'
import styles from './Live.module.css'

export function LivePage() {
  const { teams, users, golfers, selections, snapshots, tick } = useData()
  const { currentUser } = useAuth()

  const teamEntries = useMemo(
    () => computeTeamLeaderboard(teams, users, golfers, selections, snapshots, currentUser?.id ?? null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [teams, users, golfers, selections, snapshots, currentUser, tick],
  )

  const playerEntries = useMemo(
    () => computePlayerLeaderboard(golfers, selections, teams),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [golfers, selections, teams, tick],
  )

  const payoutMap = useMemo(() => {
    const map = new Map<string, PayoutPosition>()
    for (const entry of teamEntries) {
      const pos = getPayoutPosition(entry, teamEntries)
      if (pos) map.set(entry.team.id, pos)
    }
    return map
  }, [teamEntries])

  if (teams.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p className={styles.emptyText}>No teams yet — head to the Teams page to get started.</p>
      </div>
    )
  }

  return (
    <div className={styles.grid}>
      <TeamLeaderboard
        entries={teamEntries}
        payoutMap={payoutMap}
        currentUserId={currentUser?.id ?? null}
      />
      <PlayerLeaderboard entries={playerEntries} />
    </div>
  )
}
