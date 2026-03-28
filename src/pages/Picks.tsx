import { useState, useMemo, useEffect } from 'react'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { createTeam, deleteTeam, updateTeamName, removeSelection } from '../lib/data-service'
import { PICKS_PER_TEAM } from '../lib/types'
import { GolferPicker } from '../components/GolferPicker'
import styles from './Picks.module.css'

export { PicksView }
export function PicksPage() { return <PicksView /> }

function PicksView() {
  const { config, teams, users, golfers, selections, refresh } = useData()
  const { currentUser, isAdmin } = useAuth()
  const { addToast } = useToast()

  const [managingUserId, setManagingUserId] = useState<string | null>(null)
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null)
  const [creatingTeam, setCreatingTeam] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [renamingTeamId, setRenamingTeamId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [saving, setSaving] = useState(false)

  const isLocked = config.poolLocked
  const canEdit = !isLocked || isAdmin

  const effectiveUserId = managingUserId ?? currentUser?.id ?? null
  const effectiveUser = users.find(u => u.id === effectiveUserId)
  const isManagingOther = isAdmin && managingUserId !== null && managingUserId !== currentUser?.id

  const visibleTeams = useMemo(
    () => (effectiveUserId ? teams.filter(t => t.userId === effectiveUserId) : []),
    [teams, effectiveUserId],
  )

  // Auto-select first team
  useEffect(() => {
    if (visibleTeams.length > 0 && !visibleTeams.some(t => t.id === activeTeamId)) {
      setActiveTeamId(visibleTeams[0].id)
    } else if (visibleTeams.length === 0) {
      setActiveTeamId(null)
    }
  }, [visibleTeams, activeTeamId])

  // Golfer lookup map
  const golferMap = useMemo(() => {
    const m = new Map<string, typeof golfers[0]>()
    for (const g of golfers) m.set(g.id, g)
    return m
  }, [golfers])

  if (!currentUser) {
    return (
      <div className={styles.container}>
        <div className={styles.authPrompt}>
          <span className={styles.authTitle}>Sign in to manage your picks</span>
          <span className={styles.authSubtitle}>Use the Sign In button in the header.</span>
        </div>
      </div>
    )
  }

  const handleCreateTeam = async () => {
    const trimmed = newTeamName.trim()
    if (!trimmed || !effectiveUserId) return
    setSaving(true)
    try {
      const team = await createTeam(effectiveUserId, trimmed)
      await refresh()
      setActiveTeamId(team.id)
      setCreatingTeam(false)
      setNewTeamName('')
      addToast(`Team "${trimmed}" created`, 'success')
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to create team', 'error')
    } finally { setSaving(false) }
  }

  const handleCreateKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCreateTeam()
    else if (e.key === 'Escape') { setCreatingTeam(false); setNewTeamName('') }
  }

  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    if (!window.confirm(`Delete team "${teamName}"?`)) return
    setSaving(true)
    try {
      await deleteTeam(teamId)
      await refresh()
      addToast(`Deleted "${teamName}"`, 'info')
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed', 'error')
    } finally { setSaving(false) }
  }

  const handleRemoveGolfer = async (teamId: string, golferId: string) => {
    setSaving(true)
    try {
      await removeSelection(teamId, golferId)
      const g = golferMap.get(golferId)
      addToast(`Removed ${g?.name ?? 'golfer'}`, 'info')
      await refresh()
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed', 'error')
    } finally { setSaving(false) }
  }

  const startRename = (teamId: string, name: string) => {
    if (!canEdit) return
    setRenamingTeamId(teamId); setRenameValue(name)
  }
  const handleRename = async () => {
    const trimmed = renameValue.trim()
    if (!trimmed || !renamingTeamId) { setRenamingTeamId(null); return }
    setSaving(true)
    try {
      await updateTeamName(renamingTeamId, trimmed)
      await refresh()
      addToast(`Renamed to "${trimmed}"`, 'success')
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed', 'error')
    } finally { setSaving(false); setRenamingTeamId(null); setRenameValue('') }
  }
  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleRename()
    else if (e.key === 'Escape') { setRenamingTeamId(null); setRenameValue('') }
  }

  // Sort teams: active first, then others
  const sortedTeams = useMemo(() => {
    const active = visibleTeams.filter(t => t.id === activeTeamId)
    const rest = visibleTeams.filter(t => t.id !== activeTeamId)
    return [...active, ...rest]
  }, [visibleTeams, activeTeamId])

  return (
    <div className={styles.container}>
      <div className={styles.titleRow}>
        <h1 className={styles.title}>
          {isManagingOther ? `Editing: ${effectiveUser?.name ?? 'User'}` : 'My Picks'}
        </h1>
        {isAdmin && (
          <select
            className={styles.userSelect}
            value={effectiveUserId ?? ''}
            onChange={e => { setManagingUserId(e.target.value || null); setActiveTeamId(null) }}
          >
            <option value={currentUser.id}>My teams</option>
            {users.filter(u => u.id !== currentUser.id).map(u => (
              <option key={u.id} value={u.id}>{u.name} ({u.fullName ?? u.email})</option>
            ))}
          </select>
        )}
      </div>

      {isLocked && (
        <div className={styles.lockedBanner}>
          Pool is locked{isAdmin ? ' — admin editing mode' : ' — picks are final'}
        </div>
      )}

      {/* Main layout: team cards on left, golfer picker on right */}
      <div className={styles.picksLayout}>
        {/* Left column: all team cards */}
        <div className={styles.teamsColumn}>
          {sortedTeams.map(t => {
            const isActive = t.id === activeTeamId
            const teamSels = selections.filter(s => s.teamId === t.id)
            const userPicks = teamSels.filter(s => !s.isRandom)
            const pickCount = userPicks.length
            const isComplete = pickCount >= PICKS_PER_TEAM

            return (
              <div
                key={t.id}
                className={`${styles.teamCard} ${isActive ? styles.teamCardActive : ''} ${isComplete ? styles.teamCardComplete : ''}`}
                onClick={() => setActiveTeamId(t.id)}
              >
                {/* Card header */}
                <div className={styles.cardHeader}>
                  {renamingTeamId === t.id ? (
                    <input
                      className={styles.renameInput}
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      onKeyDown={handleRenameKeyDown}
                      onBlur={handleRename}
                      onClick={e => e.stopPropagation()}
                      autoFocus
                      maxLength={24}
                    />
                  ) : (
                    <span
                      className={styles.cardName}
                      onDoubleClick={e => { e.stopPropagation(); startRename(t.id, t.teamName) }}
                      title={canEdit ? 'Double-click to rename' : undefined}
                    >
                      {t.teamName}
                    </span>
                  )}
                  <div className={styles.cardMeta}>
                    <span className={`${styles.pickBadge} ${isComplete ? styles.pickBadgeComplete : styles.pickBadgeIncomplete}`}>
                      {pickCount}/{PICKS_PER_TEAM}
                    </span>
                    {isActive && <span className={styles.editingBadge}>EDITING</span>}
                    {canEdit && (
                      <button
                        className={styles.cardDeleteBtn}
                        onClick={e => { e.stopPropagation(); handleDeleteTeam(t.id, t.teamName) }}
                        title="Delete team"
                      >&times;</button>
                    )}
                  </div>
                </div>

                {/* Golfer list in card */}
                <div className={styles.cardGolfers}>
                  {teamSels.length === 0 && (
                    <div className={styles.cardEmpty}>No golfers picked yet</div>
                  )}
                  {teamSels.map(s => {
                    const g = golferMap.get(s.golferId)
                    if (!g) return null
                    return (
                      <div key={s.id} className={styles.cardGolferRow}>
                        <span className={styles.cardGolferName}>
                          {g.name}
                          {s.isRandom && <span className={styles.rndBadge}>RND</span>}
                        </span>
                        <span className={styles.cardGolferOdds}>{g.odds}</span>
                        {canEdit && !s.isRandom && (
                          <button
                            className={styles.cardRemoveBtn}
                            onClick={e => { e.stopPropagation(); handleRemoveGolfer(t.id, g.id) }}
                            disabled={saving}
                          >&times;</button>
                        )}
                      </div>
                    )
                  })}
                  {/* Empty slots */}
                  {Array.from({ length: Math.max(0, PICKS_PER_TEAM - pickCount) }).map((_, i) => (
                    <div key={`e${i}`} className={styles.cardGolferRowEmpty}>
                      <span className={styles.cardEmptySlot}>Pick {pickCount + i + 1}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {/* New team button/input */}
          {canEdit && (
            creatingTeam ? (
              <div className={styles.newTeamCard}>
                <input
                  className={styles.newTeamInput}
                  placeholder="Team name..."
                  value={newTeamName}
                  onChange={e => setNewTeamName(e.target.value)}
                  onKeyDown={handleCreateKeyDown}
                  onBlur={() => { if (!newTeamName.trim()) { setCreatingTeam(false); setNewTeamName('') } }}
                  disabled={saving}
                  autoFocus
                  maxLength={24}
                />
              </div>
            ) : (
              <button className={styles.newTeamBtn} onClick={() => setCreatingTeam(true)} disabled={saving}>
                + New Team
              </button>
            )
          )}
        </div>

        {/* Right column: golfer picker for active team */}
        <div className={styles.pickerColumn}>
          {activeTeamId ? (
            <GolferPicker teamId={activeTeamId} />
          ) : (
            <div className={styles.pickerEmpty}>
              {visibleTeams.length === 0
                ? 'Create a team to start picking golfers'
                : 'Select a team to edit picks'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
