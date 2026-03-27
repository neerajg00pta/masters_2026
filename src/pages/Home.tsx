import { useMemo } from 'react'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { computeTeamLeaderboard, computePlayerLeaderboard, getPayoutPosition } from '../lib/scoring'
import type { PayoutPosition } from '../lib/scoring'
import { TeamLeaderboard } from '../components/TeamLeaderboard'
import { PlayerLeaderboard } from '../components/PlayerLeaderboard'
import styles from './Home.module.css'

export function HomePage() {
  const { teams, users, golfers, selections, snapshots, tick } = useData()
  const { currentUser } = useAuth()

  const teamEntries = useMemo(
    () => computeTeamLeaderboard(teams, users, golfers, selections, snapshots, currentUser?.id ?? null),
    [teams, users, golfers, selections, snapshots, currentUser, tick]
  )

  const playerEntries = useMemo(
    () => computePlayerLeaderboard(golfers, selections, teams),
    [golfers, selections, teams, tick]
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
      <div className={styles.grid}>
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>&#9971;</span>
          <p className={styles.emptyText}>No teams yet. Create your team on the Picks page!</p>
        </div>
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
      <PlayerLeaderboard
        entries={playerEntries}
      />
    </div>
  )
}
