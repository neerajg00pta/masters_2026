import { useState, useMemo } from 'react'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { addSelection } from '../lib/data-service'
import { PICKS_PER_TEAM } from '../lib/types'
import styles from './GolferPicker.module.css'

interface Props {
  teamId: string
}

export function GolferPicker({ teamId }: Props) {
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

  // Map golferId → team names for OTHER teams of same user
  const otherTeamGolferMap = useMemo(() => {
    const team = teams.find(t => t.id === teamId)
    if (!team) return new Map<string, string[]>()
    const otherTeams = teams.filter(t => t.userId === team.userId && t.id !== teamId)
    const otherTeamMap = new Map(otherTeams.map(t => [t.id, t.teamName]))
    const map = new Map<string, string[]>()
    for (const s of selections) {
      const tName = otherTeamMap.get(s.teamId)
      if (!tName) continue
      const existing = map.get(s.golferId) ?? []
      existing.push(tName)
      map.set(s.golferId, existing)
    }
    return map
  }, [teams, teamId, selections])

  const pickCount = teamSelections.filter(s => !s.isRandom).length
  const isFull = pickCount >= PICKS_PER_TEAM
  const isLocked = config.poolLocked
  const canEdit = !isLocked || isAdmin

  const golferMap = useMemo(() => {
    const m = new Map<string, typeof golfers[0]>()
    for (const g of golfers) m.set(g.id, g)
    return m
  }, [golfers])

  const filteredGolfers = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return golfers
    return golfers.filter(g => g.name.toLowerCase().includes(q))
  }, [golfers, search])

  const handleAdd = async (golferId: string) => {
    if (!canEdit || claimingId || isFull) return
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

  if (!canEdit) return null // read-only handled by team cards

  return (
    <div className={styles.panel}>
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
      <div className={styles.list}>
        {filteredGolfers.length === 0 && (
          <div className={styles.empty}>No golfers match "{search}"</div>
        )}
        {filteredGolfers.map((g, i) => {
          const isPicked = pickedGolferIds.has(g.id)
          const otherTeamNames = otherTeamGolferMap.get(g.id)
          const isClaiming = claimingId === g.id
          const isDimmed = !isPicked && isFull

          return (
            <div
              key={g.id}
              className={[
                styles.row,
                i % 2 === 0 ? styles.rowEven : '',
                isPicked ? styles.rowPicked : '',
                isDimmed ? styles.rowDimmed : '',
                isClaiming ? styles.rowClaiming : '',
              ].filter(Boolean).join(' ')}
              onClick={() => !isPicked && handleAdd(g.id)}
            >
              <span className={styles.rank}>{g.sortOrder}</span>
              <span className={styles.name}>
                {g.name}
                {otherTeamNames && !isPicked && otherTeamNames.map(tn => (
                  <span key={tn} className={styles.otherBadge}>{tn}</span>
                ))}
              </span>
              <span className={styles.odds}>{g.odds ?? ''}</span>
              {isPicked && <span className={styles.pickedTag}>PICKED</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
