import { useState, useMemo } from 'react'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { addSelection, removeSelection } from '../lib/data-service'
import { PICKS_PER_TEAM } from '../lib/types'
import styles from './GolferPicker.module.css'

interface Props {
  teamId: string
}

export function GolferPicker({ teamId }: Props) {
  const { config, golfers, selections, teams, refresh } = useData()
  const { currentUser } = useAuth()
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

  const randomMap = useMemo(() => {
    const m = new Map<string, boolean>()
    for (const s of teamSelections) m.set(s.golferId, s.isRandom)
    return m
  }, [teamSelections])

  // Golfer IDs picked by OTHER teams of same user
  const otherTeamGolferIds = useMemo(() => {
    if (!currentUser) return new Set<string>()
    const otherIds = new Set(
      teams.filter(t => t.userId === currentUser.id && t.id !== teamId).map(t => t.id),
    )
    return new Set(selections.filter(s => otherIds.has(s.teamId)).map(s => s.golferId))
  }, [currentUser, teams, teamId, selections])

  const pickCount = teamSelections.filter(s => !s.isRandom).length
  const isFull = pickCount >= PICKS_PER_TEAM
  const isLocked = config.poolLocked

  // Golfer lookup
  const golferMap = useMemo(() => {
    const m = new Map<string, typeof golfers[0]>()
    for (const g of golfers) m.set(g.id, g)
    return m
  }, [golfers])

  // My picked golfers in pick order
  const myPicks = useMemo(
    () => teamSelections
      .map(s => ({ golfer: golferMap.get(s.golferId)!, isRandom: s.isRandom }))
      .filter(p => p.golfer),
    [teamSelections, golferMap],
  )

  // Filter available golfers by search
  const filteredGolfers = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return golfers
    return golfers.filter(g => g.name.toLowerCase().includes(q))
  }, [golfers, search])

  const handleAdd = async (golferId: string) => {
    if (isLocked || claimingId || isFull) return
    setClaimingId(golferId)
    try {
      await addSelection(teamId, golferId, false)
      const g = golferMap.get(golferId)
      addToast(`Added ${g?.name ?? 'golfer'}`, 'success')
      await refresh()
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to add', 'error')
    } finally {
      setClaimingId(null)
    }
  }

  const handleRemove = async (golferId: string) => {
    if (isLocked || claimingId) return
    // Don't allow removing randoms
    if (randomMap.get(golferId)) return
    setClaimingId(golferId)
    try {
      await removeSelection(teamId, golferId)
      const g = golferMap.get(golferId)
      addToast(`Removed ${g?.name ?? 'golfer'}`, 'info')
      await refresh()
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to remove', 'error')
    } finally {
      setClaimingId(null)
    }
  }

  return (
    <div className={styles.layout}>
      {/* ── Left: My Team ── */}
      <div className={styles.teamPanel}>
        <div className={styles.teamHeader}>
          <span className={styles.teamTitle}>Your Team</span>
          <span className={`${styles.counter} ${isFull ? styles.counterFull : ''}`}>
            {pickCount}/{PICKS_PER_TEAM}
          </span>
        </div>
        <div className={styles.teamList}>
          {myPicks.length === 0 && (
            <div className={styles.teamEmpty}>
              {isLocked
                ? 'No golfers picked.'
                : 'Click golfers from the list to add them.'}
            </div>
          )}
          {myPicks.map(({ golfer: g, isRandom }, i) => (
            <div
              key={g.id}
              className={`${styles.teamRow} ${claimingId === g.id ? styles.teamRowClaiming : ''}`}
            >
              <span className={styles.teamRank}>{i + 1}</span>
              <span className={styles.teamName}>{g.name}</span>
              <span className={styles.teamOdds}>{g.odds ?? ''}</span>
              {isRandom && <span className={styles.randomBadge}>RND</span>}
              {!isLocked && !isRandom && (
                <button
                  className={styles.removeBtn}
                  onClick={() => handleRemove(g.id)}
                  title={`Remove ${g.name}`}
                  disabled={claimingId !== null}
                >
                  &times;
                </button>
              )}
            </div>
          ))}
          {/* Empty slots */}
          {!isLocked && Array.from({ length: Math.max(0, PICKS_PER_TEAM - pickCount) }).map((_, i) => (
            <div key={`empty-${i}`} className={styles.teamRowEmpty}>
              <span className={styles.teamRank}>{pickCount + i + 1}</span>
              <span className={styles.teamEmptySlot}>—</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right: Golfer List ── */}
      <div className={styles.listPanel}>
        <div className={styles.listHeader}>
          <span className={styles.listTitle}>Masters Field</span>
          <span className={styles.listCount}>{golfers.length} golfers</span>
        </div>
        {!isLocked && (
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
        )}
        <div className={styles.list}>
          {filteredGolfers.length === 0 && (
            <div className={styles.empty}>No golfers match "{search}"</div>
          )}
          {filteredGolfers.map((g, i) => {
            const isPicked = pickedGolferIds.has(g.id)
            const isOnOtherTeam = otherTeamGolferIds.has(g.id)
            const isClaiming = claimingId === g.id
            const isDimmed = !isPicked && isFull

            return (
              <div
                key={g.id}
                className={[
                  styles.row,
                  i % 2 === 0 ? styles.rowEven : '',
                  isPicked ? styles.rowSelected : '',
                  isDimmed ? styles.rowDimmed : '',
                  isClaiming ? styles.rowClaiming : '',
                ].filter(Boolean).join(' ')}
                onClick={() => {
                  if (isPicked) return // use X button on team panel instead
                  handleAdd(g.id)
                }}
              >
                <span className={styles.rank}>{g.sortOrder}</span>
                <span className={styles.name}>
                  {g.name}
                  {isOnOtherTeam && !isPicked && (
                    <span className={styles.otherBadge}>on other team</span>
                  )}
                </span>
                <span className={styles.odds}>{g.odds ?? ''}</span>
                {isPicked && <span className={styles.pickedTag}>PICKED</span>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
