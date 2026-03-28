import { useState, useCallback, useRef, useEffect } from 'react'
import type { TeamLeaderboardEntry } from '../lib/types'
import { formatScore, isGolferLive, COUNTING_GOLFERS } from '../lib/types'
import type { PayoutPosition } from '../lib/scoring'
import styles from './TeamLeaderboard.module.css'

const STARRED_KEY = 'masters_starred_teams'
function readStarred(): Set<string> {
  try { const r = localStorage.getItem(STARRED_KEY); if (r) return new Set(JSON.parse(r)); } catch {}
  return new Set()
}
function writeStarred(ids: Set<string>) { localStorage.setItem(STARRED_KEY, JSON.stringify([...ids])) }

interface Props {
  entries: TeamLeaderboardEntry[]
  payoutMap: Map<string, PayoutPosition>
  currentUserId: string | null
}

export function TeamLeaderboard({ entries, payoutMap, currentUserId }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [starred, setStarred] = useState(readStarred)
  const [search, setSearch] = useState('')

  // Auto-expand pinned cards once
  const didInit = useRef(false)
  useEffect(() => {
    if (didInit.current || !currentUserId) return
    const own = entries.filter(e => e.user.id === currentUserId).map(e => `p-${e.team.id}`)
    if (own.length > 0) {
      setExpanded(new Set(own))
      didInit.current = true
    }
  }, [currentUserId, entries])

  const toggle = useCallback((id: string) => {
    setExpanded(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  }, [])
  const toggleStar = useCallback((ev: React.MouseEvent, id: string) => {
    ev.stopPropagation()
    setStarred(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); writeStarred(n); return n })
  }, [])

  const sorted = [...entries].sort((a, b) => {
    if (a.isDisqualified !== b.isDisqualified) return a.isDisqualified ? 1 : -1
    return a.rank - b.rank
  })

  // Filter by search
  const filtered = search.trim() ? sorted.filter(e => {
    const q = search.toLowerCase()
    return e.team.teamName.toLowerCase().includes(q)
      || (e.user.fullName ?? '').toLowerCase().includes(q)
      || e.user.name.toLowerCase().includes(q)
  }) : sorted

  const pinned = (search.trim() ? filtered : sorted).filter(e =>
    (currentUserId && e.user.id === currentUserId) || starred.has(e.team.id)
  )

  const renderRow = (e: TeamLeaderboardEntry, prefix: string) => {
    const key = `${prefix}${e.team.id}`
    const hasMoney = !!(payoutMap.get(e.team.id))
    return (
      <Row key={key} entry={e} hasMoney={hasMoney}
        isOwn={currentUserId === e.user.id}
        isOpen={expanded.has(key)}
        isStar={starred.has(e.team.id) || currentUserId === e.user.id}
        onToggle={() => toggle(key)}
        onStar={ev => toggleStar(ev, e.team.id)} />
    )
  }

  return (
    <div className={styles.panel}>
      <div className={styles.hdr} onClick={() => setCollapsed(c => !c)}>
        <span className={styles.hdrT}>Leaderboard</span>
        <span className={`${styles.chev} ${collapsed ? styles.chevC : ''}`}>&#9660;</span>
      </div>
      {!collapsed && <div className={styles.body}>
        <div className={styles.searchBar}>
          <input className={styles.searchInput} type="text" placeholder="Find team or player..."
            value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button className={styles.searchClear} onClick={() => setSearch('')}>&times;</button>}
        </div>
        {sorted.length === 0 ? <div className={styles.empty}>No teams yet.</div> : <>
          {!search.trim() && pinned.length > 0 && <>
            {pinned.map(e => renderRow(e, 'p-'))}
            <div className={styles.divider} />
          </>}
          {filtered.length === 0 ? <div className={styles.empty}>No matches for "{search}"</div> :
            filtered.map(e => renderRow(e, ''))}
        </>}
      </div>}
    </div>
  )
}

function Row({ entry, hasMoney, isOwn, isOpen, isStar, onToggle, onStar }: {
  entry: TeamLeaderboardEntry; hasMoney: boolean; isOwn: boolean
  isOpen: boolean; isStar: boolean; onToggle: () => void; onStar: (e: React.MouseEvent) => void
}) {
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
          {entry.isDisqualified ? <span className={styles.dq}>DQ</span> : entry.rankDisplay}
        </span>

        <span className={styles.money}>{hasMoney ? '$' : ''}</span>

        <span className={styles.team}>
          {entry.team.teamName}
          {entry.isLive && !entry.isDisqualified && <span className={styles.liveDot} />}
        </span>

        <span className={styles.score}>
          {entry.isDisqualified ? '—' : formatScore(entry.aggregateScore)}
        </span>

        <span className={styles.delta}>
          {entry.rankDelta !== null && entry.rankDelta > 0 && <span className={styles.up}>&#9650;{entry.rankDelta}</span>}
          {entry.rankDelta !== null && entry.rankDelta < 0 && <span className={styles.down}>&#9660;{Math.abs(entry.rankDelta)}</span>}
          {(entry.rankDelta === null || entry.rankDelta === 0) && <span className={styles.flat}>—</span>}
        </span>

        <button className={`${styles.star} ${isStar ? styles.starOn : ''}`} onClick={onStar}>
          {isStar ? '\u2605' : '\u2606'}
        </button>
      </div>

      {isOpen && <Detail entry={entry} />}
    </>
  )
}

function Detail({ entry }: { entry: TeamLeaderboardEntry }) {
  return (
    <div className={styles.detail}>
      <div className={styles.detailOwner}>{entry.user.fullName ?? entry.user.name}</div>
      <table className={styles.dt}>
        <thead>
          <tr><th className={styles.dtL}>Golfer</th><th>Adj</th><th>Mstr</th><th>Dup</th><th>Thru</th></tr>
        </thead>
        <tbody>
          {entry.scoredGolfers.map((sg, i) => {
            const cut = i === COUNTING_GOLFERS - 1 && i < entry.scoredGolfers.length - 1
            const live = isGolferLive(sg.golfer.thru)
            return (
              <tr key={sg.golfer.id} className={[cut ? styles.cutLine : '', sg.isCut ? styles.cutRow : ''].filter(Boolean).join(' ') || undefined}>
                <td className={styles.dtL}>
                  {live && !sg.isCut && <span className={styles.liveDot} />}
                  {sg.golfer.name}
                  {sg.isRandom && <span className={styles.rnd}>RND</span>}
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
