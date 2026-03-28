import { useState, useMemo } from 'react'
import type { PlayerLeaderboardEntry } from '../lib/types'
import { formatScore, isGolferLive, CUT_SCORE } from '../lib/types'
import styles from './PlayerLeaderboard.module.css'

interface PlayerLeaderboardProps {
  entries: PlayerLeaderboardEntry[]
}

type SortKey = 'adj' | 'masters' | 'dups' | 'name' | 'odds' | 'thru'
type SortDir = 'asc' | 'desc'

/** Compute tie-aware rank display strings for sorted entries */
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
  const rankCounts = new Map<number, number>()
  for (const r of ranks) rankCounts.set(r, (rankCounts.get(r) ?? 0) + 1)
  return ranks.map(r => (rankCounts.get(r) ?? 0) > 1 ? `T${r}` : `${r}`)
}

export function PlayerLeaderboard({ entries }: PlayerLeaderboardProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('adj')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      // Default direction per column
      setSortDir(key === 'name' ? 'asc' : key === 'dups' ? 'desc' : 'asc')
    }
  }

  const sorted = useMemo(() => {
    const arr = [...entries]
    const dir = sortDir === 'asc' ? 1 : -1

    arr.sort((a, b) => {
      const aCut = a.adjScore >= CUT_SCORE ? 1 : 0
      const bCut = b.adjScore >= CUT_SCORE ? 1 : 0
      // Always push cut golfers to bottom
      if (aCut !== bCut) return aCut - bCut

      let cmp = 0
      switch (sortKey) {
        case 'adj':
          cmp = a.adjScore - b.adjScore
          // Secondary: best odds
          if (cmp === 0) cmp = a.golfer.oddsNumeric - b.golfer.oddsNumeric
          break
        case 'masters':
          cmp = a.golfer.scoreToPar - b.golfer.scoreToPar
          break
        case 'dups':
          cmp = a.dupPenalty - b.dupPenalty
          break
        case 'name':
          cmp = a.golfer.name.localeCompare(b.golfer.name)
          break
        case 'odds':
          cmp = a.golfer.oddsNumeric - b.golfer.oddsNumeric
          break
        case 'thru': {
          const aThru = parseInt(a.golfer.thru, 10) || (a.golfer.thru === 'F' ? 99 : 0)
          const bThru = parseInt(b.golfer.thru, 10) || (b.golfer.thru === 'F' ? 99 : 0)
          cmp = aThru - bThru
          break
        }
      }
      return cmp * dir
    })
    return arr
  }, [entries, sortKey, sortDir])

  const rankDisplays = useMemo(() => computeRanks(sorted), [sorted])

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return ''
    return sortDir === 'asc' ? ' ▲' : ' ▼'
  }

  const thClass = (key: SortKey) =>
    `${styles.sortableTh} ${sortKey === key ? styles.sortableThActive : ''}`

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
                  <th className={thClass('name')} onClick={() => handleSort('name')}>Player{sortIndicator('name')}</th>
                  <th className={thClass('adj')} onClick={() => handleSort('adj')}>Adj{sortIndicator('adj')}</th>
                  <th className={thClass('masters')} onClick={() => handleSort('masters')}>Masters{sortIndicator('masters')}</th>
                  <th className={thClass('dups')} onClick={() => handleSort('dups')}>Dups{sortIndicator('dups')}</th>
                  <th className={thClass('thru')} onClick={() => handleSort('thru')}>Thru{sortIndicator('thru')}</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((entry, idx) => {
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
                          {entry.isOnRandomTeam && <span className={styles.rndPill}>RND</span>}
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
