import { useState, useCallback, useRef, useEffect } from 'react'
import type { TeamLeaderboardEntry } from '../lib/types'
import { formatScore, isGolferLive, COUNTING_GOLFERS } from '../lib/types'
import { getMastersUrl } from '../lib/masters-ids'
import type { PayoutPosition } from '../lib/scoring'
import styles from './TeamLeaderboard.module.css'

function starKey(userId: string | null) { return `masters_stars_${userId ?? 'anon'}` }
function readStarred(userId: string | null): Set<string> {
  try { const r = localStorage.getItem(starKey(userId)); if (r) return new Set(JSON.parse(r)); } catch {}
  return new Set()
}
function writeStarred(userId: string | null, ids: Set<string>) {
  localStorage.setItem(starKey(userId), JSON.stringify([...ids]))
}

interface Props {
  entries: TeamLeaderboardEntry[]
  payoutMap: Map<string, PayoutPosition>
  currentUserId: string | null
  compact?: boolean
}

export function TeamLeaderboard({ entries, payoutMap, currentUserId, compact }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [starred, setStarred] = useState(() => readStarred(currentUserId))
  const [search, setSearch] = useState('')

  // Auto-star own teams + auto-expand pinned, once
  const didInit = useRef(false)
  useEffect(() => {
    if (didInit.current || !currentUserId) return
    const ownIds = entries.filter(e => e.user.id === currentUserId).map(e => e.team.id)
    if (ownIds.length > 0) {
      setStarred(prev => {
        const n = new Set(prev)
        let changed = false
        for (const id of ownIds) { if (!n.has(id)) { n.add(id); changed = true } }
        if (changed) writeStarred(currentUserId, n)
        return n
      })
      setExpanded(new Set(ownIds.map(id => `p-${id}`)))
      didInit.current = true
    }
  }, [currentUserId, entries])

  const toggle = useCallback((id: string) => {
    setExpanded(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  }, [])
  const toggleStar = useCallback((ev: React.MouseEvent, id: string) => {
    ev.stopPropagation()
    setStarred(p => {
      const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id)
      writeStarred(currentUserId, n); return n
    })
  }, [currentUserId])

  const sorted = [...entries].sort((a, b) => {
    if (a.isDisqualified !== b.isDisqualified) return a.isDisqualified ? 1 : -1
    return a.rank - b.rank
  })

  const filtered = search.trim() ? sorted.filter(e => {
    const q = search.toLowerCase()
    return e.team.teamName.toLowerCase().includes(q)
      || (e.user.fullName ?? '').toLowerCase().includes(q)
      || e.user.name.toLowerCase().includes(q)
  }) : sorted

  // Pinned = starred teams (includes own unless user unstarred them)
  const pinned = (search.trim() ? [] : sorted.filter(e => starred.has(e.team.id)))

  const renderRow = (e: TeamLeaderboardEntry, prefix: string) => {
    const key = `${prefix}${e.team.id}`
    const payout = payoutMap.get(e.team.id) ?? null
    const moneyStr = payout === 'first' ? '$$$' : payout === 'second' ? '$$' : payout ? '$' : ''
    return (
      <Row key={key} entry={e} moneyStr={moneyStr} hasMoney={!!payout}
        isOwn={currentUserId === e.user.id}
        isOpen={expanded.has(key)}
        isStar={starred.has(e.team.id)}
        onToggle={() => toggle(key)}
        onStar={ev => toggleStar(ev, e.team.id)} />
    )
  }

  return (
    <div className={compact ? styles.compact : ''}>
      {/* Pinned section — above the main panel */}
      {!search.trim() && pinned.length > 0 && (
        <div className={styles.pinnedSection}>
          {pinned.map(e => renderRow(e, 'p-'))}
        </div>
      )}

      {/* Main leaderboard panel */}
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
          {sorted.length === 0 ? <div className={styles.empty}>No teams yet.</div> :
            filtered.length === 0 ? <div className={styles.empty}>No matches for &ldquo;{search}&rdquo;</div> :
              filtered.map(e => renderRow(e, ''))}
        </div>}
      </div>
    </div>
  )
}

function Row({ entry, moneyStr, hasMoney, isOwn, isOpen, isStar, onToggle, onStar }: {
  entry: TeamLeaderboardEntry; moneyStr: string; hasMoney: boolean; isOwn: boolean
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
        <span className={styles.liveCol}>
          {entry.isLive && !entry.isDisqualified && <span className={styles.liveDot} />}
        </span>

        <span className={styles.pos}>
          {entry.isDisqualified ? <span className={styles.dq}>DQ</span> : entry.rankDisplay}
        </span>

        <span className={styles.money}>{moneyStr}</span>

        <span className={styles.team}>
          {entry.team.teamName}
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
                  <span className={styles.golferCell}>
                    {live && !sg.isCut && <span className={styles.liveDot} />}
                    {sg.golfer.mastersId && (
                      <a href={getMastersUrl(sg.golfer.mastersId)} target="_blank" rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()} className={styles.detailLink} title="masters.com">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                      </a>
                    )}
                    {sg.golfer.name}
                    {sg.isRandom && <span className={styles.rnd}>RND</span>}
                  </span>
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
