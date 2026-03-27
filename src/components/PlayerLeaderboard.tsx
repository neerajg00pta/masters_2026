import { useState } from 'react'
import type { PlayerLeaderboardEntry } from '../lib/types'
import { formatScore, isGolferLive, CUT_SCORE } from '../lib/types'
import styles from './PlayerLeaderboard.module.css'

interface PlayerLeaderboardProps {
  entries: PlayerLeaderboardEntry[]
}

/** Compute tie-aware rank display strings for player entries (already sorted by adjScore asc) */
function computeRanks(entries: PlayerLeaderboardEntry[]): string[] {
  const ranks: number[] = []
  let currentRank = 1
  for (let i = 0; i < entries.length; i++) {
    if (i > 0 && entries[i].adjScore === entries[i - 1].adjScore) {
      ranks.push(ranks[i - 1])
    } else {
      ranks.push(currentRank)
    }
    currentRank = i + 2
  }

  // Determine ties
  const rankCounts = new Map<number, number>()
  for (const r of ranks) {
    rankCounts.set(r, (rankCounts.get(r) ?? 0) + 1)
  }

  return ranks.map(r => {
    const isTied = (rankCounts.get(r) ?? 0) > 1
    return isTied ? `T${r}` : `${r}`
  })
}

export function PlayerLeaderboard({ entries }: PlayerLeaderboardProps) {
  const [collapsed, setCollapsed] = useState(false)
  const rankDisplays = computeRanks(entries)

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader} onClick={() => setCollapsed(c => !c)}>
        <span className={styles.panelTitle}>Field</span>
        <span className={`${styles.chevron} ${collapsed ? styles.chevronCollapsed : ''}`}>&#9660;</span>
      </div>

      {!collapsed && (
        <div className={styles.panelBody}>
          {entries.length === 0 ? (
            <div className={styles.empty}>No players in the field yet.</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Player</th>
                  <th>Adj Score</th>
                  <th>Masters</th>
                  <th>Dup Pen</th>
                  <th>Thru</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, idx) => {
                  const isCut = entry.adjScore >= CUT_SCORE
                  const live = isGolferLive(entry.golfer.thru)

                  const trClasses = [
                    isCut ? styles.cutRow : '',
                    entry.isOnRandomTeam ? styles.randomPlayer : '',
                  ].filter(Boolean).join(' ') || undefined

                  return (
                    <tr key={entry.golfer.id} className={trClasses}>
                      <td className={styles.rank}>{isCut ? '' : rankDisplays[idx]}</td>
                      <td>
                        <span className={styles.playerName}>
                          {entry.isOnRandomTeam && <span className={styles.randomBadge} title="Random assignment">{'\uD83C\uDFB2'}</span>}
                          {entry.golfer.name}
                          {live && !isCut && (
                            <span className={styles.liveBadge}>
                              <span className={styles.liveDot} />
                            </span>
                          )}
                        </span>
                      </td>
                      <td>{formatScore(entry.adjScore)}</td>
                      <td>{isCut ? 'CUT' : formatScore(entry.golfer.scoreToPar)}</td>
                      <td>{entry.dupPenalty > 0 ? `+${entry.dupPenalty}` : '-'}</td>
                      <td>{isCut ? 'X' : entry.golfer.thru}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
