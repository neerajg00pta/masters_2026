import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { computeTeamLeaderboard, computePlayerLeaderboard, getPayoutPosition } from '../lib/scoring'
import type { PayoutPosition } from '../lib/scoring'
import { TeamLeaderboard } from '../components/TeamLeaderboard'
import { PlayerLeaderboard } from '../components/PlayerLeaderboard'
import styles from './Live.module.css'

export function LivePage() {
  const { config, teams, users, golfers, selections, snapshots, tick } = useData()
  const { currentUser, isAdmin } = useAuth()

  // Redirect non-admins to teams page when pool isn't locked
  if (!config.poolLocked && !isAdmin) {
    return <Navigate to="/teams" replace />
  }

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

  const [compact, setCompact] = useState(() => localStorage.getItem('masters_compact') !== '0')
  const toggleCompact = () => setCompact(p => { const v = !p; localStorage.setItem('masters_compact', v ? '1' : '0'); return v })

  if (teams.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p className={styles.emptyText}>No teams yet — head to the Teams page to get started.</p>
      </div>
    )
  }

  return (
    <div>
      <div className={styles.toolbar}>
        <button className={`${styles.compactBtn} ${compact ? styles.compactBtnOn : ''}`} onClick={toggleCompact} title={compact ? 'Normal view' : 'Compact view'}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {compact ? (
              <><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>
            ) : (
              <><line x1="3" y1="4" x2="21" y2="4" /><line x1="3" y1="10" x2="21" y2="10" /><line x1="3" y1="16" x2="21" y2="16" /><line x1="3" y1="22" x2="21" y2="22" /></>
            )}
          </svg>
        </button>
      </div>
      <div className={styles.grid}>
        <TeamLeaderboard
          entries={teamEntries}
          payoutMap={payoutMap}
          currentUserId={currentUser?.id ?? null}
          compact={compact}
        />
        <PlayerLeaderboard entries={playerEntries} compact={compact} />
      </div>
    </div>
  )
}
