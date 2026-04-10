import { useState, useMemo, useCallback, useRef } from 'react'
import type { PlayerLeaderboardEntry } from '../lib/types'
import { formatScore, isGolferLive, CUT_SCORE } from '../lib/types'
import { fetchScorecards, type RoundScorecard } from '../lib/espn'
import { getMastersUrl } from '../lib/masters-ids'
import styles from './PlayerLeaderboard.module.css'

interface PlayerLeaderboardProps {
  entries: PlayerLeaderboardEntry[]
  compact?: boolean
  search?: string
}

type SortKey = 'adj' | 'masters' | 'dups' | 'name' | 'odds' | 'thru'
type SortDir = 'asc' | 'desc'

function computeRanks(entries: PlayerLeaderboardEntry[]): string[] {
  const ranks: number[] = []
  let currentRank = 1
  for (let i = 0; i < entries.length; i++) {
    if (i > 0 && entries[i].adjScore === entries[i - 1].adjScore) ranks.push(ranks[i - 1])
    else ranks.push(currentRank)
    currentRank = i + 2
  }
  const counts = new Map<number, number>()
  for (const r of ranks) counts.set(r, (counts.get(r) ?? 0) + 1)
  return ranks.map(r => (counts.get(r) ?? 0) > 1 ? `T${r}` : `${r}`)
}

export function PlayerLeaderboard({ entries, compact, search = '' }: PlayerLeaderboardProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('adj')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null)
  const [scorecards, setScorecards] = useState<Map<string, RoundScorecard[]> | null>(null)
  const fetchingRef = useRef(false)

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir(key === 'name' ? 'asc' : key === 'dups' ? 'desc' : 'asc') }
  }

  const sorted = useMemo(() => {
    const arr = [...entries]
    const dir = sortDir === 'asc' ? 1 : -1
    arr.sort((a, b) => {
      const aCut = a.adjScore >= CUT_SCORE ? 1 : 0, bCut = b.adjScore >= CUT_SCORE ? 1 : 0
      if (aCut !== bCut) return aCut - bCut
      let cmp = 0
      switch (sortKey) {
        case 'adj': cmp = a.adjScore - b.adjScore; if (cmp === 0) cmp = a.golfer.oddsNumeric - b.golfer.oddsNumeric; break
        case 'masters': cmp = a.golfer.scoreToPar - b.golfer.scoreToPar; break
        case 'dups': cmp = a.dupPenalty - b.dupPenalty; break
        case 'name': cmp = a.golfer.name.localeCompare(b.golfer.name); break
        case 'odds': cmp = a.golfer.oddsNumeric - b.golfer.oddsNumeric; break
        case 'thru': { const at = parseInt(a.golfer.thru,10)||(a.golfer.thru==='F'?99:0), bt = parseInt(b.golfer.thru,10)||(b.golfer.thru==='F'?99:0); cmp = at - bt; break }
      }
      return cmp * dir
    })
    return arr
  }, [entries, sortKey, sortDir])

  const rankDisplays = useMemo(() => computeRanks(sorted), [sorted])

  const filteredSorted = useMemo(() => {
    if (!search.trim()) return sorted
    const q = search.toLowerCase()
    return sorted.filter(e => e.golfer.name.toLowerCase().includes(q))
  }, [sorted, search])

  const togglePlayer = useCallback(async (espnName: string | null) => {
    if (!espnName) return
    const key = espnName.toLowerCase()
    if (expandedPlayer === key) { setExpandedPlayer(null); return }
    setExpandedPlayer(key)
    // Fetch scorecards if not cached
    if (!scorecards && !fetchingRef.current) {
      fetchingRef.current = true
      try {
        const data = await fetchScorecards()
        setScorecards(data)
      } catch { /* ignore */ }
      fetchingRef.current = false
    }
  }, [expandedPlayer, scorecards])

  const si = (key: SortKey) => sortKey !== key ? '' : sortDir === 'asc' ? ' \u25B2' : ' \u25BC'
  const thCls = (key: SortKey) => `${styles.sortableTh} ${sortKey === key ? styles.sortableThActive : ''}`

  return (
    <div className={`${styles.panel} ${compact ? styles.compact : ''}`}>
      <div className={styles.panelHeader} onClick={() => setCollapsed(c => !c)}>
        <span className={styles.panelTitle}>Field</span>
        <span className={`${styles.chevron} ${collapsed ? styles.chevronCollapsed : ''}`}>&#9660;</span>
      </div>
      {!collapsed && (
        <div className={styles.panelBody}>
          {entries.length === 0 ? <div className={styles.empty}>No players yet.</div> : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.thLink}></th>
                  <th>Rank</th>
                  <th className={thCls('name')} onClick={() => handleSort('name')}>Player{si('name')}</th>
                  <th className={thCls('adj')} onClick={() => handleSort('adj')}>Adj{si('adj')}</th>
                  <th className={thCls('masters')} onClick={() => handleSort('masters')}>Masters{si('masters')}</th>
                  <th className={thCls('dups')} onClick={() => handleSort('dups')}>Dups{si('dups')}</th>
                  <th className={thCls('thru')} onClick={() => handleSort('thru')}>Thru{si('thru')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredSorted.map((entry) => {
                  const idx = sorted.indexOf(entry)
                  const isCut = entry.adjScore >= CUT_SCORE
                  const live = isGolferLive(entry.golfer.thru)
                  const espnKey = (entry.golfer.espnName ?? entry.golfer.name).toLowerCase()
                  const isExpanded = expandedPlayer === espnKey
                  const rounds = scorecards?.get(espnKey)

                  return (
                    <PlayerRow key={entry.golfer.id}
                      entry={entry} rank={isCut ? '' : rankDisplays[idx]}
                      isCut={isCut} live={live} isExpanded={isExpanded}
                      rounds={rounds ?? null}
                      onToggle={() => togglePlayer(entry.golfer.espnName ?? entry.golfer.name)} />
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

function PlayerRow({ entry, rank, isCut, live, isExpanded, rounds, onToggle }: {
  entry: PlayerLeaderboardEntry; rank: string; isCut: boolean; live: boolean
  isExpanded: boolean; rounds: RoundScorecard[] | null; onToggle: () => void
}) {
  const trCls = [isCut ? styles.cutRow : '', entry.isOnRandomTeam ? styles.randomPlayer : ''].filter(Boolean).join(' ') || undefined

  return (
    <>
      <tr className={trCls} onClick={onToggle} style={{ cursor: 'pointer' }}>
        <td className={styles.iconsCell}>
          <span className={styles.iconsWrap}>
            <span className={styles.linkSlot}>
              {entry.golfer.mastersId && (
                <a href={getMastersUrl(entry.golfer.mastersId)} target="_blank" rel="noopener noreferrer"
                  className={styles.linkIcon} onClick={e => e.stopPropagation()} title="masters.com">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>
              )}
            </span>
            <span className={styles.dotSlot}>
              {live && !isCut && <span className={styles.liveDot} />}
            </span>
          </span>
        </td>
        <td className={styles.rank}>{rank}</td>
        <td>
          <span className={styles.playerName}>
            {entry.golfer.flagUrl && <img src={entry.golfer.flagUrl} alt="" className={styles.flag} />}
            {entry.golfer.name}
            {entry.isOnRandomTeam && <span className={styles.rndPill}>RND</span>}
          </span>
        </td>
        <td>{formatScore(entry.adjScore)}</td>
        <td>{isCut ? 'CUT' : formatScore(entry.golfer.scoreToPar)}</td>
        <td>{entry.dupPenalty > 0 ? `+${entry.dupPenalty}` : '-'}</td>
        <td>{isCut ? 'X' : entry.golfer.thru}</td>
      </tr>
      {isExpanded && (
        <tr className={styles.scorecardRow}>
          <td colSpan={7}>
            {rounds ? <Scorecard rounds={rounds} /> : <div className={styles.scorecardLoading}>Loading scorecard...</div>}
          </td>
        </tr>
      )}
    </>
  )
}

/** Golf scorecard convention:
 * Eagle or better (-2+): gold circle
 * Birdie (-1): green circle
 * Par (E): no decoration
 * Bogey (+1): black square
 * Double bogey+ (+2+): red double square
 */
function Scorecard({ rounds }: { rounds: RoundScorecard[] }) {
  return (
    <div className={styles.scorecard}>
      {rounds.map(r => (
        <div key={r.round} className={styles.scRound}>
          <div className={styles.scRoundLabel}>R{r.round} ({r.displayValue})</div>
          <div className={styles.scHoles}>
            {/* Front 9 */}
            <div className={styles.scNine}>
              {r.holes.filter(h => h.hole >= 1 && h.hole <= 9).sort((a,b) => a.hole - b.hole).map(h => (
                <HoleCell key={h.hole} hole={h} />
              ))}
            </div>
            {/* Back 9 */}
            <div className={styles.scNine}>
              {r.holes.filter(h => h.hole >= 10 && h.hole <= 18).sort((a,b) => a.hole - b.hole).map(h => (
                <HoleCell key={h.hole} hole={h} />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function HoleCell({ hole }: { hole: { hole: number; strokes: number; relative: string } }) {
  const rel = parseInt(hole.relative, 10)
  // ESPN returns "OTHER" for extreme scores — use strokes to guess direction
  // Hole-in-one (1 stroke) or albatross (2 strokes) = eagle+; 7+ strokes = double bogey+
  const otherIsGood = hole.relative === 'OTHER' && hole.strokes <= 2
  const otherIsBad = hole.relative === 'OTHER' && hole.strokes >= 5
  const isEagle = (!isNaN(rel) && rel <= -2) || otherIsGood
  const isBirdie = hole.relative === '-1'
  const isBogey = hole.relative === '+1'
  const isDoublePlus = (!isNaN(rel) && rel >= 2) || otherIsBad

  const cls = [
    styles.scCell,
    isEagle ? styles.scEagle : '',
    isBirdie ? styles.scBirdie : '',
    isBogey ? styles.scBogey : '',
    isDoublePlus ? styles.scDouble : '',
  ].filter(Boolean).join(' ')

  return (
    <div className={cls}>
      <span className={styles.scHoleNum}>{hole.hole}</span>
      <span className={styles.scStroke}>{hole.strokes}</span>
    </div>
  )
}
