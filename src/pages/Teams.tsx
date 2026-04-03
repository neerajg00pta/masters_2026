import { useState, useMemo, useEffect } from 'react'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { createTeam, deleteTeam, updateTeamName, removeSelection, createUser, setTeamConfirmed } from '../lib/data-service'
import { PICKS_PER_TEAM, MAX_TEAMS_PER_USER } from '../lib/types'
import { GolferPicker } from '../components/GolferPicker'
import styles from './Teams.module.css'

export function TeamsPage() { return <TeamsView /> }

function TeamsView() {
  const { config, teams, users, golfers, selections, refresh } = useData()
  const { currentUser, isAdmin, login, loginDirect } = useAuth()
  const { addToast } = useToast()

  const [activeTeamId, setActiveTeamId] = useState<string | null>(null)
  const [creatingTeam, setCreatingTeam] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [renamingTeamId, setRenamingTeamId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const isLocked = config.poolLocked
  const canEdit = !isLocked || isAdmin

  // Build user lookup
  const userMap = useMemo(() => {
    const m = new Map<string, typeof users[0]>()
    for (const u of users) m.set(u.id, u)
    return m
  }, [users])

  // For regular users: show only their teams. For admin: show all teams (filterable by search).
  const allVisibleTeams = useMemo(() => {
    if (isAdmin) return teams
    return currentUser ? teams.filter(t => t.userId === currentUser.id) : []
  }, [teams, currentUser, isAdmin])

  // Fuzzy search filter (admin only — searches participant name + team name)
  const visibleTeams = useMemo(() => {
    if (!searchQuery.trim()) return allVisibleTeams
    const q = searchQuery.toLowerCase().trim()
    return allVisibleTeams.filter(t => {
      const owner = userMap.get(t.userId)
      const ownerName = (owner?.name ?? '').toLowerCase()
      const ownerFull = (owner?.fullName ?? '').toLowerCase()
      const teamName = t.teamName.toLowerCase()
      return teamName.includes(q) || ownerName.includes(q) || ownerFull.includes(q)
    })
  }, [allVisibleTeams, searchQuery, userMap])

  // Auto-select first team
  useEffect(() => {
    if (visibleTeams.length > 0 && !visibleTeams.some(t => t.id === activeTeamId)) {
      setActiveTeamId(visibleTeams[0].id)
    } else if (visibleTeams.length === 0) {
      setActiveTeamId(null)
    }
  }, [visibleTeams, activeTeamId])

  // Golfer lookup map — must be before any early returns (React hooks rule)
  const golferMap = useMemo(() => {
    const m = new Map<string, typeof golfers[0]>()
    for (const g of golfers) m.set(g.id, g)
    return m
  }, [golfers])

  // Keep teams in creation order (no reordering)
  const sortedTeams = visibleTeams

  // Unconfirmed teams with 5 picks — for admin nudge
  const unconfirmedFullTeams = useMemo(() => {
    return teams.filter(t => {
      if (t.confirmed) return false
      const picks = selections.filter(s => s.teamId === t.id && !s.isRandom)
      return picks.length >= PICKS_PER_TEAM
    })
  }, [teams, selections])

  const nudgeEmails = useMemo(() => {
    const emails = new Set<string>()
    for (const t of unconfirmedFullTeams) {
      const u = userMap.get(t.userId)
      if (u?.email) emails.add(u.email)
    }
    return [...emails]
  }, [unconfirmedFullTeams, userMap])

  // Auth modal — email first, then name if new
  const [showAuth, setShowAuth] = useState(false)
  const [authEmail, setAuthEmail] = useState('')
  const [authName, setAuthName] = useState('')
  const [authStep, setAuthStep] = useState<'email' | 'register'>('email')
  const [authError, setAuthError] = useState('')
  const [authSaving, setAuthSaving] = useState(false)

  const requireAuth = () => {
    if (!currentUser) { setShowAuth(true); setAuthStep('email'); setAuthEmail(''); setAuthName(''); setAuthError(''); return true }
    return false
  }

  const handleAuthEmail = (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError('')
    const email = authEmail.trim().toLowerCase()
    if (!email) { setAuthError('Enter your email'); return }
    if (login(email)) { setShowAuth(false) }
    else { setAuthStep('register') } // not found → show name field
  }

  const handleAuthRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError('')
    const name = authName.trim()
    if (!name) { setAuthError('Enter your name'); return }
    setAuthSaving(true)
    try {
      const newUser = await createUser({ name, email: authEmail.trim().toLowerCase(), fullName: name })
      loginDirect(newUser)
      await refresh()
      addToast(`Welcome, ${name}!`, 'success')
      setShowAuth(false)
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Failed to register')
    } finally { setAuthSaving(false) }
  }

  const handleCreateTeam = async () => {
    if (requireAuth()) return
    const trimmed = newTeamName.trim()
    if (!trimmed || !currentUser) return
    const userTeamCount = teams.filter(t => t.userId === currentUser.id).length
    if (!isAdmin && userTeamCount >= MAX_TEAMS_PER_USER) {
      addToast(`Maximum ${MAX_TEAMS_PER_USER} teams allowed`, 'error'); return
    }
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


  return (
    <div className={styles.picksLayout}>
      {/* Row 1, left column: title + admin tools */}
      <div className={styles.titleArea}>
        <h1 className={styles.title}>{isAdmin ? 'All Teams' : 'My Picks'}</h1>
        {isAdmin && (
          <div className={styles.teamTools}>
            <div className={styles.teamSearchWrap}>
              <input
                className={styles.teamSearchInput}
                type="text"
                placeholder="Search teams..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className={styles.teamSearchClear} onClick={() => setSearchQuery('')}>&times;</button>
              )}
            </div>
            {unconfirmedFullTeams.length > 0 && (
              <a
                className={styles.nudgeBtn}
                href={`mailto:${nudgeEmails.join(',')}?subject=${encodeURIComponent('Masters Pool — Submit Your Picks!')}&body=${encodeURIComponent('Hey! You have 5 golfers picked but haven\'t submitted yet. Head to the site and hit "Submit Picks" to lock them in before the deadline.\n\nThanks!')}`}
                title={`${nudgeEmails.join(', ')}`}
              >
                Nudge ({unconfirmedFullTeams.length})
              </a>
            )}
          </div>
        )}
        {isLocked && (
          <div className={styles.lockedBanner}>
            Pool is locked{isAdmin ? ' — admin editing mode' : ' — picks are final'}
          </div>
        )}
      </div>

      {/* Row 2, left column: team cards */}
      <div className={styles.teamsColumn}>
          {sortedTeams.map(t => {
            const isActive = t.id === activeTeamId
            const teamSels = selections.filter(s => s.teamId === t.id)
            const userPicks = teamSels.filter(s => !s.isRandom)
            const randomSel = teamSels.find(s => s.isRandom)
            const pickCount = userPicks.length
            const hasFivePicks = pickCount >= PICKS_PER_TEAM
            const isReady = t.confirmed && hasFivePicks

            const handleConfirm = async (ev: React.MouseEvent) => {
              ev.stopPropagation()
              setSaving(true)
              try {
                await setTeamConfirmed(t.id, true)
                await refresh()
                addToast(`"${t.teamName}" is locked in!`, 'success')
              } catch { addToast('Failed to save', 'error') }
              finally { setSaving(false) }
            }

            return (
              <div
                key={t.id}
                className={`${styles.teamCard} ${isActive ? styles.teamCardActive : ''} ${isReady ? styles.teamCardComplete : ''}`}
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
                    <span className={`${styles.statusBadge} ${isReady ? styles.statusReady : styles.statusDraft}`}>
                      {isReady ? 'READY' : 'DRAFT'} {pickCount}/{PICKS_PER_TEAM}
                    </span>
                    {canEdit && (
                      <button
                        className={styles.cardDeleteBtn}
                        onClick={e => { e.stopPropagation(); handleDeleteTeam(t.id, t.teamName) }}
                        title="Delete team"
                      >&times;</button>
                    )}
                  </div>
                </div>

                {/* Owner info for admin */}
                {isAdmin && (() => {
                  const owner = userMap.get(t.userId)
                  return owner ? (
                    <div className={styles.ownerRow}>{owner.name} &middot; {owner.email}</div>
                  ) : null
                })()}

                {/* Golfer list in card */}
                <div className={styles.cardGolfers}>
                  {userPicks.length === 0 && randomSel === undefined && (
                    <div className={styles.cardEmpty}>No golfers picked yet</div>
                  )}
                  {/* User picks (1-5) */}
                  {userPicks.map(s => {
                    const g = golferMap.get(s.golferId)
                    if (!g) return null
                    return (
                      <div key={s.id} className={styles.cardGolferRow}>
                        <span className={styles.cardGolferName}>{g.name}</span>
                        <span className={styles.cardGolferOdds}>{g.odds}</span>
                        {canEdit && (
                          <button
                            className={styles.cardRemoveBtn}
                            onClick={e => { e.stopPropagation(); handleRemoveGolfer(t.id, g.id) }}
                            disabled={saving}
                          >&times;</button>
                        )}
                      </div>
                    )
                  })}
                  {/* Empty pick slots */}
                  {Array.from({ length: Math.max(0, PICKS_PER_TEAM - pickCount) }).map((_, i) => (
                    <div key={`e${i}`} className={styles.cardGolferRowEmpty}>
                      <span className={styles.cardEmptySlot}>Pick {pickCount + i + 1}</span>
                    </div>
                  ))}
                  {/* Random slot — always shown as slot 6 */}
                  <div className={`${styles.cardGolferRow} ${styles.cardRandomRow}`}>
                    {randomSel ? (
                      <>
                        <span className={styles.cardGolferName}>
                          {golferMap.get(randomSel.golferId)?.name ?? '?'}
                          <span className={styles.rndBadge}>RND</span>
                        </span>
                        <span className={styles.cardGolferOdds}>{golferMap.get(randomSel.golferId)?.odds}</span>
                      </>
                    ) : (
                      <span className={styles.cardRandomSlot}>Random — TBD</span>
                    )}
                  </div>
                </div>

                {/* Submit Picks — full-width pulsating pill below picks */}
                {canEdit && hasFivePicks && !isReady && (
                  <button className={styles.saveBtn} onClick={handleConfirm} disabled={saving}>
                    Submit Picks
                  </button>
                )}
              </div>
            )
          })}

          {/* New team button/input — show input directly if no teams yet */}
          {canEdit && (isAdmin || (currentUser && teams.filter(t => t.userId === currentUser.id).length < MAX_TEAMS_PER_USER)) && (
            creatingTeam || visibleTeams.length === 0 ? (
              <div className={styles.newTeamCard}>
                <div className={styles.newTeamRow}>
                  <input
                    className={styles.newTeamInput}
                    placeholder="Team name..."
                    value={newTeamName}
                    onChange={e => setNewTeamName(e.target.value)}
                    onKeyDown={handleCreateKeyDown}
                    onBlur={() => { if (!newTeamName.trim() && visibleTeams.length > 0) { setCreatingTeam(false); setNewTeamName('') } }}
                    disabled={saving}
                    autoFocus
                    maxLength={24}
                  />
                  <button
                    className={styles.newTeamOkBtn}
                    onClick={handleCreateTeam}
                    disabled={saving || !newTeamName.trim()}
                  >OK</button>
                </div>
              </div>
            ) : (
              <button className={styles.newTeamBtn} onClick={() => { if (!requireAuth()) setCreatingTeam(true) }} disabled={saving}>
                + Add Another Team
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

      {/* Auth modal overlay */}
      {showAuth && (
        <div className={styles.authOverlay} onClick={() => setShowAuth(false)}>
          <div className={styles.authPrompt} onClick={e => e.stopPropagation()}>
            {authStep === 'email' ? (
              <>
                <h2 className={styles.authTitle}>Enter your email</h2>
                <form onSubmit={handleAuthEmail} className={styles.authForm}>
                  <input className={styles.authInput} type="email" value={authEmail}
                    onChange={e => setAuthEmail(e.target.value)} placeholder="you@email.com" autoFocus />
                  {authError && <div className={styles.authError}>{authError}</div>}
                  <button className={styles.authBtn} type="submit">Continue</button>
                </form>
              </>
            ) : (
              <>
                <h2 className={styles.authTitle}>Welcome! What's your name?</h2>
                <p className={styles.authSubtext}>{authEmail}</p>
                <form onSubmit={handleAuthRegister} className={styles.authForm}>
                  <input className={styles.authInput} value={authName}
                    onChange={e => setAuthName(e.target.value)} placeholder="Your name" autoFocus />
                  {authError && <div className={styles.authError}>{authError}</div>}
                  <button className={styles.authBtn} type="submit" disabled={authSaving}>
                    {authSaving ? 'Joining...' : 'Join'}
                  </button>
                </form>
                <button className={styles.authToggle}
                  onClick={() => { setAuthStep('email'); setAuthError(''); setAuthEmail('') }}>
                  ← Different email
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
