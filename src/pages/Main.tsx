import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { computeTeamLeaderboard, computePlayerLeaderboard, getPayoutPosition } from '../lib/scoring'
import type { PayoutPosition } from '../lib/scoring'
import { TeamLeaderboard } from '../components/TeamLeaderboard'
import { PlayerLeaderboard } from '../components/PlayerLeaderboard'
import { PicksView } from './Picks'
import styles from './Main.module.css'

export function MainPage() {
  const { config, teams, users, golfers, selections, snapshots, tick } = useData()
  const { currentUser } = useAuth()

  // When pool is unlocked → show Picks view
  if (!config.poolLocked) {
    return <PicksView />
  }

  // When pool is locked → show Leaderboards
  const teamEntries = computeTeamLeaderboard(teams, users, golfers, selections, snapshots, currentUser?.id ?? null)
  const playerEntries = computePlayerLeaderboard(golfers, selections, teams)
  const payoutMap = new Map<string, PayoutPosition>()
  for (const entry of teamEntries) {
    const pos = getPayoutPosition(entry, teamEntries)
    if (pos) payoutMap.set(entry.team.id, pos)
  }

  // suppress unused warning for memoization deps
  void tick

  if (teams.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p className={styles.emptyText}>No teams were created before the pool was locked.</p>
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
