import { useState, useCallback } from 'react'
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
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [starred, setStarred] = useState(readStarred)

  const toggle = useCallback((id: string) => {
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

  const pinned = sorted.filter(e =>
    (currentUserId && e.user.id === currentUserId) || starred.has(e.team.id)
  )

  return (
    <div className={styles.panel}>
      <div className={styles.hdr} onClick={() => setCollapsed(c => !c)}>
        <span className={styles.hdrTitle}>Leaderboard</span>
        <span className={`${styles.chev} ${collapsed ? styles.chevClosed : ''}`}>&#9660;</span>
      </div>
      {!collapsed && (
        <div className={styles.body}>
          {sorted.length === 0 ? <div className={styles.empty}>No teams yet.</div> : <>
            {pinned.length > 0 && <>
              {pinned.map(e => (
                <Row key={`p-${e.team.id}`} entry={e}
                  payout={payoutMap.get(e.team.id) ?? null}
                  isOwn={currentUserId === e.user.id}
                  isOpen={expanded.has(`p-${e.team.id}`)}
                  isStar={starred.has(e.team.id) || currentUserId === e.user.id}
                  onToggle={() => toggle(`p-${e.team.id}`)}
                  onStar={ev => toggleStar(ev, e.team.id)} />
              ))}
              <div className={styles.divider} />
            </>}
            {sorted.map(e => (
              <Row key={e.team.id} entry={e}
                payout={payoutMap.get(e.team.id) ?? null}
                isOwn={currentUserId === e.user.id}
                isOpen={expanded.has(e.team.id)}
                isStar={starred.has(e.team.id) || currentUserId === e.user.id}
                onToggle={() => toggle(e.team.id)}
                onStar={ev => toggleStar(ev, e.team.id)} />
            ))}
          </>}
        </div>
      )}
    </div>
  )
}

function Row({ entry, payout, isOwn, isOpen, isStar, onToggle, onStar }: {
  entry: TeamLeaderboardEntry; payout: PayoutPosition; isOwn: boolean
  isOpen: boolean; isStar: boolean; onToggle: () => void; onStar: (e: React.MouseEvent) => void
}) {
  const hasMoney = payout === 'first' || payout === 'second' || payout === 'last' || payout === 'middle'

  const cls = [
    styles.row,
    isOwn ? styles.rowOwn : '',
    entry.isDisqualified ? styles.rowDq : '',
    hasMoney ? styles.rowMoney : '',
    isOpen ? styles.rowOpen : '',
  ].filter(Boolean).join(' ')

  return (
    <>
      <div className={cls} onClick={onToggle}>
        <span className={styles.pos}>
          {entry.isDisqualified ? <span className={styles.dqBadge}>DQ</span> : entry.rankDisplay}
        </span>

        <div className={styles.info}>
          <span className={styles.name}>{entry.team.teamName}</span>
          <span className={styles.owner}>&middot; {entry.user.fullName ?? entry.user.name}</span>
          {hasMoney && <span className={styles.pill} style={{ background: 'var(--masters-green)', color: '#fff' }}>$</span>}
          {entry.isLive && !entry.isDisqualified && (
            <span className={`${styles.pill} ${styles.pillLive}`}><span className={styles.liveDot} />LIVE</span>
          )}
        </div>

        <span className={styles.score}>
          {entry.isDisqualified ? '—' : formatScore(entry.aggregateScore)}
        </span>

        <span className={styles.delta}>
          {entry.rankDelta !== null && entry.rankDelta > 0 && (
            <span className={styles.deltaUp}>&#9650;{entry.rankDelta}</span>
          )}
          {entry.rankDelta !== null && entry.rankDelta < 0 && (
            <span className={styles.deltaDown}>&#9660;{Math.abs(entry.rankDelta)}</span>
          )}
          {entry.rankDelta !== null && entry.rankDelta === 0 && (
            <span className={styles.deltaFlat}>—</span>
          )}
        </span>

        <button className={`${styles.star} ${isStar ? styles.starOn : ''}`} onClick={onStar}>
          {isStar ? '\u2605' : '\u2606'}
        </button>
      </div>

      {isOpen && <Detail golfers={entry.scoredGolfers} />}
    </>
  )
}

function Detail({ golfers }: { golfers: ScoredGolfer[] }) {
  return (
    <div className={styles.detail}>
      <table className={styles.dt}>
        <thead>
          <tr><th className={styles.dtName}>Golfer</th><th>Adj</th><th>Mstr</th><th>Dup</th><th>Thru</th></tr>
        </thead>
        <tbody>
          {golfers.map((sg, i) => {
            const cut = i === COUNTING_GOLFERS - 1 && i < golfers.length - 1
            const live = isGolferLive(sg.golfer.thru)
            return (
              <tr key={sg.golfer.id} className={[cut ? styles.cutLine : '', sg.isCut ? styles.cutRow : ''].filter(Boolean).join(' ') || undefined}>
                <td className={styles.dtName}>
                  {sg.golfer.name}
                  {sg.isRandom && <span className={`${styles.pill} ${styles.pillGrey}`}>RND</span>}
                  {live && !sg.isCut && <span className={`${styles.pill} ${styles.pillLive}`}><span className={styles.liveDot} />LIVE</span>}
                </td>
                <td>{formatScore(sg.adjScore)}</td>
                <td>{sg.isCut ? 'CUT' : formatScore(sg.golfer.scoreToPar)}</td>
                <td>{sg.dupPenalty > 0 ? `+${sg.dupPenalty}` : '-'}</td>
                <td>{sg.isCut ? 'X' : (sg.golfer.thru || '--')}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
