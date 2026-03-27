import { useState, useMemo, useEffect } from 'react'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { createTeam, deleteTeam, updateTeamName } from '../lib/data-service'
import { GolferPicker } from '../components/GolferPicker'
import styles from './Picks.module.css'

export function PicksPage() {
  const { config, teams, refresh } = useData()
  const { currentUser } = useAuth()
  const { addToast } = useToast()

  const [activeTeamId, setActiveTeamId] = useState<string | null>(null)
  const [creatingTeam, setCreatingTeam] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [renamingTeamId, setRenamingTeamId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [saving, setSaving] = useState(false)

  const isLocked = config.poolLocked

  // Only this user's teams
  const myTeams = useMemo(
    () => (currentUser ? teams.filter(t => t.userId === currentUser.id) : []),
    [teams, currentUser],
  )

  // Auto-select first team when teams load or active team is removed
  useEffect(() => {
    if (myTeams.length > 0) {
      const activeExists = myTeams.some(t => t.id === activeTeamId)
      if (!activeExists) {
        setActiveTeamId(myTeams[0].id)
      }
    } else {
      setActiveTeamId(null)
    }
  }, [myTeams, activeTeamId])

  // ── Not logged in ──
  if (!currentUser) {
    return (
      <div className={styles.container}>
        <div className={styles.authPrompt}>
          <span className={styles.authIcon}>&#9971;</span>
          <span className={styles.authTitle}>Sign in to manage your picks</span>
          <span className={styles.authSubtitle}>
            Use the Sign In button in the header to log in with your email.
          </span>
        </div>
      </div>
    )
  }

  // ── Create team handler ──
  const handleCreateTeam = async () => {
    const trimmed = newTeamName.trim()
    if (!trimmed || !currentUser) return

    setSaving(true)
    try {
      const team = await createTeam(currentUser.id, trimmed)
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
    if (e.key === 'Enter') {
      handleCreateTeam()
    } else if (e.key === 'Escape') {
      setCreatingTeam(false)
      setNewTeamName('')
    }
  }

  // ── Delete team handler ──
  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    const ok = window.confirm(`Delete team "${teamName}"? This removes all picks for this team.`)
    if (!ok) return

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

  // ── Rename team handler ──
  const startRename = (teamId: string, currentName: string) => {
    if (isLocked) return
    setRenamingTeamId(teamId)
    setRenameValue(currentName)
  }

  const handleRename = async () => {
    const trimmed = renameValue.trim()
    if (!trimmed || !renamingTeamId) {
      setRenamingTeamId(null)
      setRenameValue('')
      return
    }

    setSaving(true)
    try {
      await updateTeamName(renamingTeamId, trimmed)
      await refresh()
      addToast(`Team renamed to "${trimmed}"`, 'success')
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to rename team', 'error')
    } finally {
      setSaving(false)
      setRenamingTeamId(null)
      setRenameValue('')
    }
  }

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRename()
    } else if (e.key === 'Escape') {
      setRenamingTeamId(null)
      setRenameValue('')
    }
  }

  // ── Empty state: no teams ──
  if (myTeams.length === 0 && !creatingTeam) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>My Picks</h1>
        {isLocked ? (
          <div className={styles.lockedBanner}>
            <span className={styles.lockIcon}>&#128274;</span>
            The pool is locked. No teams were created before the deadline.
          </div>
        ) : (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>&#127948;</span>
            <span className={styles.emptyTitle}>Create your first team</span>
            <span className={styles.emptySubtitle}>
              Pick a team name and start drafting golfers for the Masters.
            </span>
            <button
              className={styles.createBtn}
              onClick={() => setCreatingTeam(true)}
            >
              + New Team
            </button>
          </div>
        )}
      </div>
    )
  }

  // ── Main view ──
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>My Picks</h1>

      {isLocked && (
        <div className={styles.lockedBanner}>
          <span className={styles.lockIcon}>&#128274;</span>
          Pool is locked &mdash; picks are final
        </div>
      )}

      {/* Team tab bar */}
      <div className={styles.tabBar}>
        {myTeams.map(t => {
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
              title={isLocked ? t.teamName : 'Double-click to rename'}
            >
              {t.teamName}
              {!isLocked && (
                <span
                  className={`${styles.tabDelete} ${isActive ? '' : styles.tabDeleteInactive}`}
                  onClick={e => {
                    e.stopPropagation()
                    handleDeleteTeam(t.id, t.teamName)
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.stopPropagation()
                      handleDeleteTeam(t.id, t.teamName)
                    }
                  }}
                  title={`Delete ${t.teamName}`}
                >
                  &#x2715;
                </span>
              )}
            </button>
          )
        })}

        {/* New team inline input or button */}
        {!isLocked && (
          creatingTeam ? (
            <input
              className={styles.inlineInput}
              placeholder="Team name..."
              value={newTeamName}
              onChange={e => setNewTeamName(e.target.value)}
              onKeyDown={handleCreateKeyDown}
              onBlur={() => {
                if (!newTeamName.trim()) {
                  setCreatingTeam(false)
                  setNewTeamName('')
                }
              }}
              disabled={saving}
              autoFocus
              maxLength={24}
            />
          ) : (
            <button
              className={styles.newTeamBtn}
              onClick={() => setCreatingTeam(true)}
              disabled={saving}
            >
              + New Team
            </button>
          )
        )}
      </div>

      {/* Golfer picker for active team */}
      {activeTeamId && <GolferPicker teamId={activeTeamId} />}

      {/* Edge case: creating first team */}
      {!activeTeamId && myTeams.length === 0 && creatingTeam && (
        <div className={styles.emptyState}>
          <span className={styles.emptySubtitle}>
            Type a team name above and press Enter to create it.
          </span>
        </div>
      )}
    </div>
  )
}
