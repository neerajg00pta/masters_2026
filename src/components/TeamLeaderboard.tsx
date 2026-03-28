import { useState, useCallback, useEffect } from 'react'
import type { TeamLeaderboardEntry, ScoredGolfer } from '../lib/types'
import { formatScore, isGolferLive, COUNTING_GOLFERS } from '../lib/types'
import type { PayoutPosition } from '../lib/scoring'
import styles from './TeamLeaderboard.module.css'

const STARRED_KEY = 'masters_starred_teams'

interface TeamLeaderboardProps {
  entries: TeamLeaderboardEntry[]
  payoutMap: Map<string, PayoutPosition>
  currentUserId: string | null
}

function readStarred(): Set<string> {
  try {
    const raw = localStorage.getItem(STARRED_KEY)
    if (raw) return new Set(JSON.parse(raw) as string[])
  } catch { /* ignore */ }
  return new Set()
}

function writeStarred(ids: Set<string>) {
  localStorage.setItem(STARRED_KEY, JSON.stringify([...ids]))
}

export function TeamLeaderboard({ entries, payoutMap, currentUserId }: TeamLeaderboardProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    if (!currentUserId) return new Set<string>()
    return new Set(entries.filter(e => e.user.id === currentUserId).map(e => e.team.id))
  })
  const [starred, setStarred] = useState<Set<string>>(readStarred)

  useEffect(() => {
    if (!currentUserId) return
    setExpanded(prev => {
      const own = entries.filter(e => e.user.id === currentUserId).map(e => e.team.id)
      const next = new Set(prev)
      for (const id of own) next.add(id)
      return next
    })
  }, [currentUserId, entries])

  const toggleExpand = useCallback((teamId: string) => {
    setExpanded(prev => { const n = new Set(prev); n.has(teamId) ? n.delete(teamId) : n.add(teamId); return n })
  }, [])

  const toggleStar = useCallback((e: React.MouseEvent, teamId: string) => {
    e.stopPropagation()
    setStarred(prev => { const n = new Set(prev); n.has(teamId) ? n.delete(teamId) : n.add(teamId); writeStarred(n); return n })
  }, [])

  // Sort: own teams first, starred, non-DQ by rank, DQ last
  const sorted = [...entries].sort((a, b) => {
    const aOwn = currentUserId && a.user.id === currentUserId ? 0 : 1
    const bOwn = currentUserId && b.user.id === currentUserId ? 0 : 1
    if (aOwn !== bOwn) return aOwn - bOwn
    const aStar = starred.has(a.team.id) ? 0 : 1
    const bStar = starred.has(b.team.id) ? 0 : 1
    if (aStar !== bStar) return aStar - bStar
    if (a.isDisqualified !== b.isDisqualified) return a.isDisqualified ? 1 : -1
    return a.rank - b.rank
  })

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader} onClick={() => setCollapsed(c => !c)}>
        <span className={styles.panelTitle}>Leaderboard</span>
        <span className={`${styles.chevron} ${collapsed ? styles.chevronCollapsed : ''}`}>&#9660;</span>
      </div>

      {!collapsed && (
        <div className={styles.panelBody}>
          {sorted.length === 0 ? (
            <div className={styles.empty}>No teams yet.</div>
          ) : sorted.map(entry => (
            <TeamRow
              key={entry.team.id}
              entry={entry}
              payout={payoutMap.get(entry.team.id) ?? null}
              isOwn={currentUserId === entry.user.id}
              isExpanded={expanded.has(entry.team.id)}
              isStarred={starred.has(entry.team.id)}
              onToggleExpand={() => toggleExpand(entry.team.id)}
              onToggleStar={(e) => toggleStar(e, entry.team.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface TeamRowProps {
  entry: TeamLeaderboardEntry
  payout: PayoutPosition
  isOwn: boolean
  isExpanded: boolean
  isStarred: boolean
  onToggleExpand: () => void
  onToggleStar: (e: React.MouseEvent) => void
}

function TeamRow({ entry, payout, isOwn, isExpanded, isStarred, onToggleExpand, onToggleStar }: TeamRowProps) {
  const rowClasses = [
    styles.teamRow,
    isOwn ? styles.ownRow : '',
    entry.isDisqualified ? styles.dqRow : '',
    payout === 'first' ? styles.payoutFirst : '',
    payout === 'second' ? styles.payoutSecond : '',
    payout === 'last' || payout === 'middle' ? styles.payoutBronze : '',
    isExpanded ? styles.teamRowExpanded : '',
  ].filter(Boolean).join(' ')

  return (
    <>
      <div className={rowClasses} onClick={onToggleExpand}>
        <span className={styles.rank}>
          {entry.isDisqualified ? <span className={styles.dqBadge}>DQ</span> : entry.rankDisplay}
        </span>

        <span className={styles.delta}>
          {entry.rankDelta !== null && entry.rankDelta > 0 && <span className={styles.deltaUp}>&#9650;{entry.rankDelta}</span>}
          {entry.rankDelta !== null && entry.rankDelta < 0 && <span className={styles.deltaDown}>&#9660;{Math.abs(entry.rankDelta)}</span>}
        </span>

        <div className={styles.teamInfo}>
          <span className={styles.teamName}>{entry.team.teamName}</span>
          <span className={styles.ownerName}>{entry.user.name}</span>
        </div>

        <div className={styles.scoreBlock}>
          {entry.isLive && !entry.isDisqualified && (
            <span className={styles.livePill}><span className={styles.liveDot} />LIVE</span>
          )}
          <span className={styles.aggScore}>
            {entry.isDisqualified ? '—' : formatScore(entry.aggregateScore)}
          </span>
          {entry.behind !== null && entry.behind > 0 && (
            <span className={styles.behind}>+{entry.behind}</span>
          )}
        </div>

        <button
          className={`${styles.starBtn} ${isStarred || isOwn ? styles.starActive : ''}`}
          onClick={onToggleStar}
        >
          {isStarred || isOwn ? '\u2605' : '\u2606'}
        </button>
      </div>

      {isExpanded && <GolferDetail scoredGolfers={entry.scoredGolfers} />}
    </>
  )
}

function GolferDetail({ scoredGolfers }: { scoredGolfers: ScoredGolfer[] }) {
  return (
    <div className={styles.detail}>
      <table className={styles.detailTable}>
        <thead>
          <tr>
            <th>Golfer</th>
            <th>Adj</th>
            <th>Masters</th>
            <th>Dups</th>
            <th>Thru</th>
          </tr>
        </thead>
        <tbody>
          {scoredGolfers.map((sg, idx) => {
            const isCounting = idx === COUNTING_GOLFERS - 1 && idx < scoredGolfers.length - 1
            const live = isGolferLive(sg.golfer.thru)

            return (
              <tr
                key={sg.golfer.id}
                className={[
                  isCounting ? styles.countingLine : '',
                  sg.isCut ? styles.cutRow : '',
                ].filter(Boolean).join(' ') || undefined}
              >
                <td>
                  <span className={styles.golferName}>
                    {sg.golfer.name}
                    {sg.isRandom && <span className={styles.rndPill}>RND</span>}
                    {live && !sg.isCut && <span className={styles.livePill}><span className={styles.liveDot} />LIVE</span>}
                  </span>
                </td>
                <td className={styles.numCell}>{formatScore(sg.adjScore)}</td>
                <td className={styles.numCell}>{sg.isCut ? 'CUT' : formatScore(sg.golfer.scoreToPar)}</td>
                <td className={styles.numCell}>{sg.dupPenalty > 0 ? `+${sg.dupPenalty}` : '-'}</td>
                <td className={styles.numCell}>{sg.isCut ? 'X' : (sg.golfer.thru || '--')}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
