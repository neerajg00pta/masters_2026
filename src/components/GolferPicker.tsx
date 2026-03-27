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

  // Selections on THIS team
  const teamSelections = useMemo(
    () => selections.filter(s => s.teamId === teamId),
    [selections, teamId],
  )

  // Set of golfer IDs on this team
  const pickedGolferIds = useMemo(
    () => new Set(teamSelections.map(s => s.golferId)),
    [teamSelections],
  )

  // Map of golfer ID -> isRandom for this team
  const randomMap = useMemo(() => {
    const m = new Map<string, boolean>()
    for (const s of teamSelections) {
      m.set(s.golferId, s.isRandom)
    }
    return m
  }, [teamSelections])

  // Golfer IDs picked by OTHER teams of the same user
  const otherTeamGolferIds = useMemo(() => {
    if (!currentUser) return new Set<string>()
    const myOtherTeamIds = teams
      .filter(t => t.userId === currentUser.id && t.id !== teamId)
      .map(t => t.id)
    const otherTeamIdSet = new Set(myOtherTeamIds)
    return new Set(
      selections
        .filter(s => otherTeamIdSet.has(s.teamId))
        .map(s => s.golferId),
    )
  }, [currentUser, teams, teamId, selections])

  const pickCount = teamSelections.length
  const isFull = pickCount >= PICKS_PER_TEAM
  const isLocked = config.poolLocked

  // Filter golfers by search (already sorted by sortOrder from data fetch)
  const filteredGolfers = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return golfers
    return golfers.filter(g => g.name.toLowerCase().includes(q))
  }, [golfers, search])

  const handleClick = async (golferId: string) => {
    if (isLocked) return
    if (claimingId) return

    const isPicked = pickedGolferIds.has(golferId)

    if (!isPicked && isFull) return // can't add more

    setClaimingId(golferId)
    try {
      if (isPicked) {
        await removeSelection(teamId, golferId)
        const golfer = golfers.find(g => g.id === golferId)
        addToast(`Removed ${golfer?.name ?? 'golfer'}`, 'info')
      } else {
        await addSelection(teamId, golferId, false)
        const golfer = golfers.find(g => g.id === golferId)
        addToast(`Added ${golfer?.name ?? 'golfer'}`, 'success')
      }
      await refresh()
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : 'Something went wrong',
        'error',
      )
    } finally {
      setClaimingId(null)
    }
  }

  // ── Locked / read-only view ──
  if (isLocked) {
    const pickedGolfers = golfers.filter(g => pickedGolferIds.has(g.id))

    return (
      <div className={styles.container}>
        <div className={styles.lockedHeader}>
          <span className={styles.lockIcon}>&#128274;</span>
          Pool is locked &mdash; picks are final
        </div>
        <div className={styles.list}>
          {pickedGolfers.length === 0 && (
            <div className={styles.empty}>No golfers picked for this team.</div>
          )}
          {pickedGolfers.map((g, i) => {
            const isRandom = randomMap.get(g.id) ?? false
            return (
              <div
                key={g.id}
                className={`${styles.row} ${styles.rowSelected} ${styles.rowReadonly} ${i % 2 === 0 ? styles.rowEven : styles.rowOdd}`}
              >
                <span className={styles.rank}>{i + 1}</span>
                <span className={styles.checkmark}>&#10003;</span>
                <span className={styles.name}>{g.name}</span>
                {isRandom && <span className={styles.randomBadge}>&#127922; Random</span>}
                <span className={styles.odds}>{g.odds ?? ''}</span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Editable view ──
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={`${styles.counter} ${isFull ? styles.counterFull : ''}`}>
          {pickCount} of {PICKS_PER_TEAM} picked
        </span>
      </div>

      <div className={styles.searchWrap}>
        <input
          className={styles.searchInput}
          type="text"
          placeholder="Search golfers..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className={styles.list}>
        {filteredGolfers.length === 0 && (
          <div className={styles.empty}>No golfers match your search.</div>
        )}
        {filteredGolfers.map((g, i) => {
          const isPicked = pickedGolferIds.has(g.id)
          const isOnOtherTeam = otherTeamGolferIds.has(g.id)
          const isClaiming = claimingId === g.id
          const isDimmed = !isPicked && isFull

          const rowClasses = [
            styles.row,
            i % 2 === 0 ? styles.rowEven : styles.rowOdd,
            isPicked ? styles.rowSelected : '',
            isDimmed ? styles.rowDimmed : '',
            isClaiming ? styles.rowClaiming : '',
            !isPicked && isOnOtherTeam ? styles.rowOtherTeam : '',
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <div
              key={g.id}
              className={rowClasses}
              onClick={() => handleClick(g.id)}
            >
              <span className={styles.rank}>{i + 1}</span>
              {isPicked && <span className={styles.checkmark}>&#10003;</span>}
              <span className={styles.name}>{g.name}</span>
              {isOnOtherTeam && !isPicked && (
                <span className={styles.otherTeamBadge}>other team</span>
              )}
              <span className={styles.odds}>{g.odds ?? ''}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
