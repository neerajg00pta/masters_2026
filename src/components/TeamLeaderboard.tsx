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
    // Auto-expand current user's teams
    if (!currentUserId) return new Set<string>()
    const own = entries.filter(e => e.user.id === currentUserId).map(e => e.team.id)
    return new Set(own)
  })
  const [starred, setStarred] = useState<Set<string>>(readStarred)

  // Keep auto-expand in sync when currentUserId changes
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
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(teamId)) {
        next.delete(teamId)
      } else {
        next.add(teamId)
      }
      return next
    })
  }, [])

  const toggleStar = useCallback((e: React.MouseEvent, teamId: string) => {
    e.stopPropagation()
    setStarred(prev => {
      const next = new Set(prev)
      if (next.has(teamId)) {
        next.delete(teamId)
      } else {
        next.add(teamId)
      }
      writeStarred(next)
      return next
    })
  }, [])

  // Sort entries: current user first, then starred, then non-DQ by rank, DQ last
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
        <span className={styles.panelTitle}>Team Leaderboard</span>
        <span className={`${styles.chevron} ${collapsed ? styles.chevronCollapsed : ''}`}>&#9660;</span>
      </div>

      {!collapsed && (
        <div className={styles.panelBody}>
          {sorted.length === 0 ? (
            <div className={styles.empty}>No teams yet.</div>
          ) : (
            sorted.map(entry => (
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
            ))
          )}
        </div>
      )}
    </div>
  )
}

/* === Individual team row === */

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
    isOwn ? styles.currentUser : '',
    entry.isDisqualified ? styles.dqRow : '',
    payout === 'first' ? styles.payoutFirst : '',
    payout === 'second' ? styles.payoutSecond : '',
    payout === 'last' ? styles.payoutLast : '',
    payout === 'middle' ? styles.payoutMiddle : '',
  ].filter(Boolean).join(' ')

  return (
    <>
      <div className={rowClasses} onClick={onToggleExpand}>
        {/* Rank */}
        <span className={`${styles.rank} ${entry.isDisqualified ? styles.rankDq : ''}`}>
          {entry.rankDisplay}
        </span>

        {/* Rank delta */}
        <span className={styles.delta}>
          <RankDelta delta={entry.rankDelta} />
        </span>

        {/* Team name + owner */}
        <div className={styles.teamInfo}>
          <span className={styles.teamName}>{entry.team.teamName}</span>
          <span className={styles.ownerName}>({entry.user.name})</span>
        </div>

        {/* Aggregate score */}
        <span className={styles.aggScore}>
          <span className={styles.aggLabel}>Best 4:</span>
          {entry.isDisqualified ? 'DQ' : formatScore(entry.aggregateScore)}
        </span>

        {/* Behind */}
        <span className={styles.behind}>
          {entry.behind === null || entry.behind === 0 ? '-' : `+${entry.behind}`}
        </span>

        {/* Badges */}
        <span>
          {entry.isLive && !entry.isDisqualified && (
            <span className={styles.liveBadge}>
              <span className={styles.liveDot} />
              LIVE
            </span>
          )}
          {entry.isDisqualified && (
            <span className={styles.dqBadge}>DQ</span>
          )}
        </span>

        {/* Star */}
        <button
          className={`${styles.starBtn} ${isStarred ? styles.starBtnActive : ''}`}
          onClick={onToggleStar}
          aria-label={isStarred ? 'Unpin team' : 'Pin team'}
        >
          {isStarred ? '\u2605' : '\u2606'}
        </button>
      </div>

      {/* Expanded golfer detail */}
      {isExpanded && (
        <GolferDetail scoredGolfers={entry.scoredGolfers} />
      )}
    </>
  )
}

/* === Rank delta display === */

function RankDelta({ delta }: { delta: number | null }) {
  if (delta === null) return null
  if (delta > 0) return <span className={styles.deltaUp}>{'\u25B2'}{delta}</span>
  if (delta < 0) return <span className={styles.deltaDown}>{'\u25BC'}{Math.abs(delta)}</span>
  return <span className={styles.deltaFlat}>-</span>
}

/* === Golfer detail table (expanded view) === */

function GolferDetail({ scoredGolfers }: { scoredGolfers: ScoredGolfer[] }) {
  return (
    <div className={styles.golferDetail}>
      <table className={styles.golferTable}>
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
            const isCountingLine = idx === COUNTING_GOLFERS - 1 && idx < scoredGolfers.length - 1
            const live = isGolferLive(sg.golfer.thru)

            const trClasses = [
              isCountingLine ? styles.countingLine : '',
              sg.isCut ? styles.cutGolfer : '',
              sg.isRandom ? styles.randomGolfer : '',
            ].filter(Boolean).join(' ') || undefined

            return (
              <tr key={sg.golfer.id} className={trClasses}>
                <td>
                  <span className={styles.golferName}>
                    {sg.isRandom && <span className={styles.randomBadge} title="Random assignment">{'\uD83C\uDFB2'}</span>}
                    {sg.golfer.name}
                    {live && !sg.isCut && (
                      <span className={styles.golferLive}>
                        <span className={styles.golferLiveDot} />
                      </span>
                    )}
                  </span>
                </td>
                <td>{formatScore(sg.adjScore)}</td>
                <td>{sg.isCut ? 'CUT' : formatScore(sg.golfer.scoreToPar)}</td>
                <td>{sg.dupPenalty > 0 ? `+${sg.dupPenalty}` : '-'}</td>
                <td>{sg.isCut ? 'X' : sg.golfer.thru}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
