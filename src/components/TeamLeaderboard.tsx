import { useState, useCallback, useEffect, useRef } from 'react'
import type { TeamLeaderboardEntry, ScoredGolfer } from '../lib/types'
import { formatScore, isGolferLive, COUNTING_GOLFERS } from '../lib/types'
import type { PayoutPosition } from '../lib/scoring'
import styles from './TeamLeaderboard.module.css'

const STARRED_KEY = 'masters_starred_teams'

interface Props {
  entries: TeamLeaderboardEntry[]
  payoutMap: Map<string, PayoutPosition>
  currentUserId: string | null
}

function readStarred(): Set<string> {
  try { const r = localStorage.getItem(STARRED_KEY); if (r) return new Set(JSON.parse(r)); } catch {}
  return new Set()
}
function writeStarred(ids: Set<string>) { localStorage.setItem(STARRED_KEY, JSON.stringify([...ids])) }

export function TeamLeaderboard({ entries, payoutMap, currentUserId }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    if (!currentUserId) return new Set()
    return new Set(entries.filter(e => e.user.id === currentUserId).map(e => e.team.id))
  })
  const [starred, setStarred] = useState(readStarred)

  // Auto-expand user's teams ONCE on first load, not on every poll
  const didAutoExpand = useRef(false)
  useEffect(() => {
    if (!currentUserId || didAutoExpand.current) return
    const own = entries.filter(e => e.user.id === currentUserId).map(e => e.team.id)
    if (own.length > 0) {
      setExpanded(prev => { const n = new Set(prev); own.forEach(id => n.add(id)); return n })
      didAutoExpand.current = true
    }
  }, [currentUserId, entries])

  const toggleExpand = useCallback((id: string) => {
    setExpanded(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  }, [])

  const toggleStar = useCallback((ev: React.MouseEvent, id: string) => {
    ev.stopPropagation()
    setStarred(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); writeStarred(n); return n })
  }, [])

  // Full field in pure rank order (DQ at bottom)
  const sorted = [...entries].sort((a, b) => {
    if (a.isDisqualified !== b.isDisqualified) return a.isDisqualified ? 1 : -1
    return a.rank - b.rank
  })

  return (
    <div className={styles.panel}>
      <div className={styles.header} onClick={() => setCollapsed(c => !c)}>
        <span className={styles.headerTitle}>Leaderboard</span>
        <span className={`${styles.chev} ${collapsed ? styles.chevClosed : ''}`}>&#9660;</span>
      </div>
      {!collapsed && (
        <div className={styles.body}>
          {sorted.length === 0 ? <div className={styles.empty}>No teams yet.</div> : <>
            {/* Pinned section: own + starred teams */}
            {(() => {
              const pinned = sorted.filter(e =>
                (currentUserId && e.user.id === currentUserId) || starred.has(e.team.id)
              )
              if (pinned.length === 0) return null
              return (
                <>
                  {pinned.map(e => (
                    <Row key={`pin-${e.team.id}`} entry={e}
                      payout={payoutMap.get(e.team.id) ?? null}
                      isOwn={currentUserId === e.user.id}
                      isExpanded={expanded.has(e.team.id)}
                      isStarred={starred.has(e.team.id) || (currentUserId === e.user.id)}
                      onExpand={() => toggleExpand(e.team.id)}
                      onStar={ev => toggleStar(ev, e.team.id)}
                    />
                  ))}
                  <div className={styles.divider} />
                </>
              )
            })()}
            {/* Full field */}
            {sorted.map(e => (
              <Row key={e.team.id} entry={e}
                payout={payoutMap.get(e.team.id) ?? null}
                isOwn={currentUserId === e.user.id}
                isExpanded={expanded.has(e.team.id)}
                isStarred={starred.has(e.team.id) || (currentUserId === e.user.id)}
                onExpand={() => toggleExpand(e.team.id)}
                onStar={ev => toggleStar(ev, e.team.id)}
              />
            ))}
          </>}
        </div>
      )}
    </div>
  )
}

function Row({ entry, payout, isOwn, isExpanded, isStarred, onExpand, onStar }: {
  entry: TeamLeaderboardEntry; payout: PayoutPosition; isOwn: boolean
  isExpanded: boolean; isStarred: boolean; onExpand: () => void; onStar: (e: React.MouseEvent) => void
}) {
  const cls = [
    styles.row,
    isOwn ? styles.rowOwn : '',
    entry.isDisqualified ? styles.rowDq : '',
    payout === 'first' ? styles.rowFirst : '',
    payout === 'second' ? styles.rowSecond : '',
    (payout === 'last' || payout === 'middle') ? styles.rowBronze : '',
    isExpanded ? styles.rowOpen : '',
  ].filter(Boolean).join(' ')

  const hasMoney = payout === 'first' || payout === 'second' || payout === 'last' || payout === 'middle'

  return (
    <>
      <div className={cls} onClick={onExpand}>
        {/* Position */}
        <div className={styles.pos}>
          {entry.isDisqualified ? <span className={styles.dqBadge}>DQ</span> : (
            <span className={styles.posNum}>{entry.rankDisplay}</span>
          )}
        </div>

        {/* Team */}
        <div className={styles.team} title={entry.user.fullName ?? entry.user.name}>
          <span className={styles.teamName}>
            {entry.team.teamName}
            {hasMoney && <span className={styles.moneyPill}>$</span>}
            {entry.isLive && !entry.isDisqualified && (
              <span className={styles.livePill}><span className={styles.liveDot} />LIVE</span>
            )}
          </span>
        </div>

        {/* Score */}
        <div className={styles.score}>
          {entry.isDisqualified ? '—' : formatScore(entry.aggregateScore)}
        </div>

        {/* Movement — the big fun indicator */}
        <div className={styles.move}>
          <Movement delta={entry.rankDelta} />
        </div>

        {/* Star */}
        <button className={`${styles.star} ${isStarred || isOwn ? styles.starOn : ''}`} onClick={onStar}>
          {isStarred || isOwn ? '\u2605' : '\u2606'}
        </button>
      </div>

      {isExpanded && <Detail golfers={entry.scoredGolfers} />}
    </>
  )
}

function Movement({ delta }: { delta: number | null }) {
  if (delta === null) return <span className={styles.moveNone}>—</span>
  if (delta === 0) return <span className={styles.moveFlat}>—</span>
  if (delta > 0) return (
    <span className={styles.moveUp}>
      <span className={styles.moveArrow}>&#9650;</span>
      <span className={styles.moveNum}>{delta}</span>
    </span>
  )
  return (
    <span className={styles.moveDown}>
      <span className={styles.moveArrow}>&#9660;</span>
      <span className={styles.moveNum}>{Math.abs(delta)}</span>
    </span>
  )
}

function Detail({ golfers }: { golfers: ScoredGolfer[] }) {
  return (
    <div className={styles.detail}>
      <table className={styles.dtable}>
        <thead>
          <tr><th>Golfer</th><th>Adj</th><th>Masters</th><th>Dups</th><th>Thru</th></tr>
        </thead>
        <tbody>
          {golfers.map((sg, i) => {
            const counting = i === COUNTING_GOLFERS - 1 && i < golfers.length - 1
            const live = isGolferLive(sg.golfer.thru)
            return (
              <tr key={sg.golfer.id} className={[
                counting ? styles.cutLine : '', sg.isCut ? styles.cutRow : '',
              ].filter(Boolean).join(' ') || undefined}>
                <td>
                  <span className={styles.gName}>
                    {sg.golfer.name}
                    {sg.isRandom && <span className={styles.rndPill}>RND</span>}
                    {live && !sg.isCut && <span className={styles.livePill}><span className={styles.liveDot} />LIVE</span>}
                  </span>
                </td>
                <td className={styles.num}>{formatScore(sg.adjScore)}</td>
                <td className={styles.num}>{sg.isCut ? 'CUT' : formatScore(sg.golfer.scoreToPar)}</td>
                <td className={styles.num}>{sg.dupPenalty > 0 ? `+${sg.dupPenalty}` : '-'}</td>
                <td className={styles.num}>{sg.isCut ? 'X' : (sg.golfer.thru || '--')}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
