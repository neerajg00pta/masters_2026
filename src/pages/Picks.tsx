import { useState, useMemo, useEffect } from 'react'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { createTeam, deleteTeam, updateTeamName } from '../lib/data-service'
import { GolferPicker } from '../components/GolferPicker'
import styles from './Picks.module.css'

export { PicksView }
export function PicksPage() { return <PicksView /> }

function PicksView() {
  const { config, teams, users, refresh } = useData()
  const { currentUser, isAdmin } = useAuth()
  const { addToast } = useToast()

  // Admin can pick a user to manage
  const [managingUserId, setManagingUserId] = useState<string | null>(null)
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null)
  const [creatingTeam, setCreatingTeam] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [renamingTeamId, setRenamingTeamId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [saving, setSaving] = useState(false)

  const isLocked = config.poolLocked

  // The effective user whose teams we're viewing
  const effectiveUserId = managingUserId ?? currentUser?.id ?? null
  const effectiveUser = users.find(u => u.id === effectiveUserId)
  const isManagingOther = isAdmin && managingUserId !== null && managingUserId !== currentUser?.id

  // Teams for the effective user
  const visibleTeams = useMemo(
    () => (effectiveUserId ? teams.filter(t => t.userId === effectiveUserId) : []),
    [teams, effectiveUserId],
  )

  // Auto-select first team
  useEffect(() => {
    if (visibleTeams.length > 0) {
      const exists = visibleTeams.some(t => t.id === activeTeamId)
      if (!exists) setActiveTeamId(visibleTeams[0].id)
    } else {
      setActiveTeamId(null)
    }
  }, [visibleTeams, activeTeamId])

  // Not logged in
  if (!currentUser) {
    return (
      <div className={styles.container}>
        <div className={styles.authPrompt}>
          <span className={styles.authTitle}>Sign in to manage your picks</span>
          <span className={styles.authSubtitle}>
            Use the Sign In button in the header to log in with your email.
          </span>
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
    } finally {
      setSaving(false)
    }
  }

  const handleCreateKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCreateTeam()
    else if (e.key === 'Escape') { setCreatingTeam(false); setNewTeamName('') }
  }

  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    if (!window.confirm(`Delete team "${teamName}"? This removes all picks.`)) return
    setSaving(true)
    try {
      await deleteTeam(teamId)
      await refresh()
      addToast(`Team "${teamName}" deleted`, 'info')
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to delete team', 'error')
    } finally {
      setSaving(false)
    }
  }

  const startRename = (teamId: string, currentName: string) => {
    if (isLocked && !isAdmin) return
    setRenamingTeamId(teamId)
    setRenameValue(currentName)
  }

  const handleRename = async () => {
    const trimmed = renameValue.trim()
    if (!trimmed || !renamingTeamId) { setRenamingTeamId(null); setRenameValue(''); return }
    setSaving(true)
    try {
      await updateTeamName(renamingTeamId, trimmed)
      await refresh()
      addToast(`Renamed to "${trimmed}"`, 'success')
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to rename', 'error')
    } finally {
      setSaving(false); setRenamingTeamId(null); setRenameValue('')
    }
  }

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleRename()
    else if (e.key === 'Escape') { setRenamingTeamId(null); setRenameValue('') }
  }

  // Can edit if: pool unlocked, OR admin
  const canEdit = !isLocked || isAdmin

  return (
    <div className={styles.container}>
      <div className={styles.titleRow}>
        <h1 className={styles.title}>
          {isManagingOther ? `Editing: ${effectiveUser?.name ?? 'User'}` : 'My Picks'}
        </h1>

        {/* Admin user selector */}
        {isAdmin && (
          <select
            className={styles.userSelect}
            value={effectiveUserId ?? ''}
            onChange={e => {
              setManagingUserId(e.target.value || null)
              setActiveTeamId(null)
            }}
          >
            <option value={currentUser.id}>My teams</option>
            {users.filter(u => u.id !== currentUser.id).map(u => (
              <option key={u.id} value={u.id}>{u.name} ({u.fullName ?? u.email})</option>
            ))}
          </select>
        )}
      </div>

      {isLocked && !isAdmin && (
        <div className={styles.lockedBanner}>Pool is locked — picks are final</div>
      )}
      {isLocked && isAdmin && (
        <div className={styles.lockedBanner}>Pool is locked — admin editing mode</div>
      )}

      {/* Team tab bar */}
      <div className={styles.tabBar}>
        {visibleTeams.map(t => {
          const isActive = t.id === activeTeamId
          const isRenaming = renamingTeamId === t.id

          if (isRenaming) {
            return (
              <input
                key={t.id}
                className={styles.renameInput}
                value={renameValue}
                onChange={e => setRenameValue(e.target.value)}
                onKeyDown={handleRenameKeyDown}
                onBlur={handleRename}
                autoFocus
                maxLength={24}
              />
            )
          }

          return (
            <button
              key={t.id}
              className={`${styles.tab} ${isActive ? styles.tabActive : ''}`}
              onClick={() => setActiveTeamId(t.id)}
              onDoubleClick={() => startRename(t.id, t.teamName)}
              title={canEdit ? 'Double-click to rename' : t.teamName}
            >
              {t.teamName}
              {canEdit && (
                <span
                  className={`${styles.tabDelete} ${isActive ? '' : styles.tabDeleteInactive}`}
                  onClick={e => { e.stopPropagation(); handleDeleteTeam(t.id, t.teamName) }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); handleDeleteTeam(t.id, t.teamName) } }}
                >
                  &times;
                </span>
              )}
            </button>
          )
        })}

        {canEdit && (
          creatingTeam ? (
            <input
              className={styles.inlineInput}
              placeholder="Team name..."
              value={newTeamName}
              onChange={e => setNewTeamName(e.target.value)}
              onKeyDown={handleCreateKeyDown}
              onBlur={() => { if (!newTeamName.trim()) { setCreatingTeam(false); setNewTeamName('') } }}
              disabled={saving}
              autoFocus
              maxLength={24}
            />
          ) : (
            <button className={styles.newTeamBtn} onClick={() => setCreatingTeam(true)} disabled={saving}>
              + New Team
            </button>
          )
        )}
      </div>

      {/* Golfer picker */}
      {activeTeamId && <GolferPicker teamId={activeTeamId} />}

      {/* Empty states */}
      {visibleTeams.length === 0 && !creatingTeam && (
        <div className={styles.emptyState}>
          <span className={styles.emptyTitle}>
            {canEdit ? 'Create a team to get started' : 'No teams'}
          </span>
          {canEdit && (
            <button className={styles.createBtn} onClick={() => setCreatingTeam(true)}>
              + New Team
            </button>
          )}
        </div>
      )}
    </div>
  )
}
