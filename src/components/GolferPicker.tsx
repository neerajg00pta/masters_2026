import { useState, useMemo } from 'react'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { addSelection, removeSelection } from '../lib/data-service'
import { PICKS_PER_TEAM } from '../lib/types'
import type { Golfer } from '../lib/types'
import styles from './GolferPicker.module.css'

interface Props {
  teamId: string
  compact?: boolean
}

/** Parse a position string to a number for color classification */
function posToNum(pos: string | null): number | null {
  if (!pos) return null
  if (pos === 'MC' || pos === 'WD' || pos === 'DQ') return null
  const n = parseInt(pos.replace('T', ''), 10)
  return isNaN(n) ? null : n
}

function HistoryPill({ pos }: { pos: string | null }) {
  if (!pos) return <span className={styles.histCell}><span className={styles.histDash}>–</span></span>

  if (pos === 'MC' || pos === 'WD' || pos === 'DQ') {
    return <span className={styles.histCell}><span className={styles.histMc}>{pos}</span></span>
  }

  const num = posToNum(pos)
  const label = num === 1 ? 'WIN' : pos

  let cls = styles.histPill
  if (num === 1) cls += ` ${styles.histWin}`
  else if (num && num >= 2 && num <= 5) cls += ` ${styles.histTop5}`
  else if (num && num >= 6 && num <= 10) cls += ` ${styles.histTop10}`
  else cls += ` ${styles.histRest}`

  return <span className={styles.histCell}><span className={cls}>{label}</span></span>
}

export function GolferPicker({ teamId, compact }: Props) {
  const { config, golfers, selections, teams, refresh } = useData()
  const { isAdmin } = useAuth()
  const { addToast } = useToast()
  const [search, setSearch] = useState('')
  const [claimingId, setClaimingId] = useState<string | null>(null)

  const teamSelections = useMemo(
    () => selections.filter(s => s.teamId === teamId),
    [selections, teamId],
  )

  const pickedGolferIds = useMemo(
    () => new Set(teamSelections.map(s => s.golferId)),
    [teamSelections],
  )

  // Count how many of this team owner's teams have each golfer
  const pickCountMap = useMemo(() => {
    const team = teams.find(t => t.id === teamId)
    if (!team) return new Map<string, number>()
    const ownerTeamIds = new Set(teams.filter(t => t.userId === team.userId).map(t => t.id))
    const map = new Map<string, number>()
    for (const s of selections) {
      if (ownerTeamIds.has(s.teamId) && !s.isRandom) {
        map.set(s.golferId, (map.get(s.golferId) ?? 0) + 1)
      }
    }
    return map
  }, [teams, teamId, selections])

  const pickCount = teamSelections.filter(s => !s.isRandom).length
  const isFull = pickCount >= PICKS_PER_TEAM
  const isLocked = config.poolLocked
  const canEdit = !isLocked || isAdmin

  const filteredGolfers = useMemo(() => {
    const active = golfers.filter(g => g.status !== 'withdrawn')
    const q = search.toLowerCase().trim()
    if (!q) return active
    return active.filter(g => g.name.toLowerCase().includes(q))
  }, [golfers, search])

  const handleAdd = async (golferId: string) => {
    if (!canEdit || claimingId || isFull) return
    setClaimingId(golferId)
    try {
      await addSelection(teamId, golferId, false)
      const g = golfers.find(g => g.id === golferId)
      addToast(`Added ${g?.name ?? 'golfer'}`, 'success')
      await refresh()
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to add', 'error')
    } finally {
      setClaimingId(null)
    }
  }

  const handleRemove = async (golferId: string) => {
    if (!canEdit || claimingId) return
    setClaimingId(golferId)
    try {
      await removeSelection(teamId, golferId)
      const g = golfers.find(g => g.id === golferId)
      addToast(`Removed ${g?.name ?? 'golfer'}`, 'info')
      await refresh()
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to remove', 'error')
    } finally {
      setClaimingId(null)
    }
  }

  if (!canEdit) return null

  const historyYears: (keyof Golfer)[] = ['masters2025', 'masters2024', 'masters2023', 'masters2022', 'masters2021']
  const yearLabels = ["'25", "'24", "'23", "'22", "'21"]

  return (
    <div className={`${styles.panel} ${compact ? styles.compact : ''}`}>
      <div className={styles.header}>
        <span className={styles.headerTitle}>Masters Field</span>
        <span className={styles.headerCount}>{golfers.length} golfers</span>
      </div>
      <div className={styles.searchWrap}>
        <input
          className={styles.searchInput}
          type="text"
          placeholder="Search golfers..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button className={styles.searchClear} onClick={() => setSearch('')}>&times;</button>
        )}
      </div>

      {/* Column headers */}
      <div className={styles.colHeaders}>
        <span className={styles.colDots} />
        <span className={styles.colOdds}>ODDS</span>
        <span className={styles.colFlag} />
        <span className={styles.colName}>PLAYER</span>
        {yearLabels.map(y => <span key={y} className={styles.colHist}>{y}</span>)}
      </div>

      <div className={styles.list}>
        {filteredGolfers.length === 0 && (
          <div className={styles.empty}>No golfers match "{search}"</div>
        )}
        {filteredGolfers.map((g) => {
          const isPicked = pickedGolferIds.has(g.id)
          const dots = pickCountMap.get(g.id) ?? 0
          const isClaiming = claimingId === g.id
          const isDimmed = !isPicked && isFull

          return (
            <div
              key={g.id}
              className={[
                styles.row,
                isPicked ? styles.rowPicked : '',
                isDimmed ? styles.rowDimmed : '',
                isClaiming ? styles.rowClaiming : '',
              ].filter(Boolean).join(' ')}
              onClick={() => isPicked ? handleRemove(g.id) : handleAdd(g.id)}
            >
              {/* Pick dots */}
              <span className={styles.dots}>
                {Array.from({ length: dots }).map((_, i) => (
                  <span key={i} className={styles.dot} />
                ))}
              </span>

              {/* Odds */}
              <span className={styles.odds}>{g.odds ?? ''}</span>

              {/* Flag */}
              <span className={styles.flag}>
                {g.flagUrl && <img src={g.flagUrl} alt="" className={styles.flagImg} />}
              </span>

              {/* Name */}
              <span className={styles.name}>{g.name}</span>

              {/* History pills */}
              {historyYears.map((key, i) => (
                <HistoryPill key={i} pos={g[key] as string | null} />
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
