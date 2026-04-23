import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import {
  createUser,
  updateUser,
  deleteUser,
  updateConfig,
  bulkAddSelections,
} from '../lib/data-service'
import { supabase } from '../lib/supabase'
import { assignRandomGolfers } from '../lib/random-assignment'
import type { User } from '../lib/types'
import styles from './Admin.module.css'

const ENTRY_FEE = 20 // per team
const BASE_URL = `${window.location.origin}${window.location.pathname}`

export function AdminPage() {
  const { isAdmin } = useAuth()
  const { config, users, teams, golfers, selections, snapshots, refresh } = useData()
  const { addToast } = useToast()
  const [saving, setSaving] = useState(false)

  // New player inline row state
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [showNewRow, setShowNewRow] = useState(false)

  // Inline editing state
  const [editingCell, setEditingCell] = useState<{
    userId: string
    field: 'name' | 'email' | 'fullName'
  } | null>(null)
  const [editValue, setEditValue] = useState('')

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [playerSearch, setPlayerSearch] = useState('')

  if (!isAdmin) {
    return <div className={styles.forbidden}>Admin access required.</div>
  }

  // Count submitted teams per user
  const teamCountByUser = new Map<string, number>()
  for (const t of teams) {
    if (t.confirmed) teamCountByUser.set(t.userId, (teamCountByUser.get(t.userId) ?? 0) + 1)
  }

  // Only users with submitted teams matter
  const submittedUsers = users.filter(u => (teamCountByUser.get(u.id) ?? 0) > 0)
  const paidCount = submittedUsers.filter(u => u.paid).length
  const unpaidUsers = submittedUsers.filter(u => !u.paid)

  // Team readiness
  const readyTeams = teams.filter(t => t.confirmed)
  const totalCollected = paidCount * ENTRY_FEE

  // === Pool Controls ===

  const toggleLock = async () => {
    const willLock = !config.poolLocked
    setSaving(true)
    try {
      await updateConfig({ poolLocked: willLock })
      await refresh()
      addToast(willLock ? 'Pool locked' : 'Pool unlocked', 'success')
    } catch {
      addToast('Failed to toggle lock', 'error')
    } finally {
      setSaving(false)
    }
  }

  // Teams that are ready (5 picks) but have no random yet
  const teamsNeedingRandom = readyTeams.filter(t =>
    !selections.some(s => s.teamId === t.id && s.isRandom)
  )

  const handleAssignRandoms = async () => {
    setSaving(true)
    try {
      const assignments = assignRandomGolfers(teamsNeedingRandom, golfers, selections)
      if (assignments.length === 0) {
        addToast('All ready teams already have randoms', 'info')
        setSaving(false)
        return
      }
      await bulkAddSelections(assignments)
      await updateConfig({ randomsAssigned: true })
      await refresh()
      addToast(`Random golfers assigned to ${assignments.length} teams`, 'success')
    } catch {
      addToast('Failed to assign randoms', 'error')
    } finally {
      setSaving(false)
    }
  }

  // @ts-expect-error hidden feature, uncomment button in JSX to re-enable
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleClearRandoms = async () => {
    if (!window.confirm('Clear ALL random assignments? This cannot be undone.')) return
    setSaving(true)
    try {
      // Delete all selections where is_random = true
      const { error } = await supabase.from('pga_masters_selections').delete().eq('is_random', true)
      if (error) throw new Error(error.message)
      await updateConfig({ randomsAssigned: false })
      await refresh()
      addToast('All random assignments cleared', 'info')
    } catch {
      addToast('Failed to clear randoms', 'error')
    } finally {
      setSaving(false)
    }
  }

  const forceSnapshot = async () => {
    setSaving(true)
    try {
      const { computeTeamLeaderboard } = await import('../lib/scoring')
      const lb = computeTeamLeaderboard(teams, users, golfers, selections, snapshots, null)
      const data = lb.filter(e => !e.isDisqualified).map(e => ({ teamId: e.team.id, aggregateScore: e.aggregateScore, rank: e.rank }))
      const { saveSnapshots } = await import('../lib/data-service')
      const todayET = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
      await saveSnapshots(data, todayET)
      await refresh()
      addToast(`Snapshot saved for ${todayET} (${data.length} teams)`, 'success')
    } catch {
      addToast('Failed to save snapshot', 'error')
    } finally {
      setSaving(false)
    }
  }

  const toggleLiveScoring = async () => {
    const willEnable = !config.liveScoring
    setSaving(true)
    try {
      await updateConfig({ liveScoring: willEnable })
      await refresh()
      addToast(willEnable ? 'Live scoring enabled' : 'Live scoring disabled', 'success')
    } catch {
      addToast('Failed to toggle live scoring', 'error')
    } finally {
      setSaving(false)
    }
  }

  // === User Management ===

  const addPlayer = async () => {
    const name = newName.trim()
    const email = newEmail.trim().toLowerCase()
    if (!name || !email) {
      addToast('Name and email are required', 'error')
      return
    }
    if (users.some(u => u.email.toLowerCase() === email)) {
      addToast('Email already registered', 'error')
      return
    }
    setSaving(true)
    try {
      await createUser({ name, email, fullName: name })
      await refresh()
      setNewName('')
      setNewEmail('')
      setShowNewRow(false)
      addToast(`Added ${name}`, 'success')
    } catch {
      addToast('Failed to add user', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteUser = async (user: User) => {
    setSaving(true)
    try {
      await deleteUser(user.id)
      await refresh()
      addToast(`Deleted ${user.name}`, 'success')
    } catch {
      addToast('Failed to delete', 'error')
    } finally {
      setSaving(false)
      setConfirmDeleteId(null)
    }
  }

  const togglePaid = async (user: User) => {
    setSaving(true)
    try {
      await updateUser(user.id, { paid: !user.paid })
      await refresh()
    } catch {
      addToast('Failed to update', 'error')
    } finally {
      setSaving(false)
    }
  }

  const toggleAdmin = async (user: User) => {
    setSaving(true)
    try {
      await updateUser(user.id, { admin: !user.admin })
      await refresh()
    } catch {
      addToast('Failed to update', 'error')
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (userId: string, field: 'name' | 'email' | 'fullName', currentValue: string) => {
    setEditingCell({ userId, field })
    setEditValue(currentValue)
  }

  const commitEdit = async () => {
    if (!editingCell) return
    const { userId, field } = editingCell
    let val = editValue.trim()
    if (!val) {
      setEditingCell(null)
      return
    }
    const other = users.filter(u => u.id !== userId)
    if (field === 'email' && other.some(u => u.email.toLowerCase() === val.toLowerCase())) {
      addToast('Email already taken', 'error')
      setEditingCell(null)
      return
    }

    setSaving(true)
    try {
      if (field === 'name') {
        // Write to both name and fullName
        await updateUser(userId, { name: val, fullName: val })
      } else {
        await updateUser(userId, { [field]: val })
      }
      await refresh()
      setEditingCell(null)
    } catch {
      addToast('Failed to update', 'error')
    } finally {
      setSaving(false)
    }
  }

  const inviteLink = (email: string) => `${BASE_URL}#/?token=${encodeURIComponent(email)}`

  const copyLink = (email: string) => {
    navigator.clipboard.writeText(inviteLink(email))
    addToast('Link copied!', 'success')
  }

  const cancelNewRow = () => {
    setShowNewRow(false)
    setNewName('')
    setNewEmail('')
  }

  return (
    <div className={styles.admin}>
      <h1 className={styles.pageTitle}>Admin Panel</h1>

      {/* Pool Controls */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Pool Controls</h2>
        <div className={styles.controls}>
          <button
            className={`${styles.btn} ${config.poolLocked ? styles.btnDanger : styles.btnPrimary}`}
            onClick={toggleLock}
            disabled={saving}
          >
            {config.poolLocked ? 'Unlock Pool' : 'Lock Pool'}
          </button>

          {config.poolLocked && (
            <>
              <button
                className={`${styles.btn} ${styles.btnGold}`}
                onClick={handleAssignRandoms}
                disabled={saving || teamsNeedingRandom.length === 0}
                title={teamsNeedingRandom.length === 0 ? 'All ready teams have randoms' : `${teamsNeedingRandom.length} teams need randoms`}
              >
                Assign Randoms{teamsNeedingRandom.length > 0 ? ` (${teamsNeedingRandom.length})` : ''}
              </button>
              {/* Clear Randoms hidden — uncomment if needed
              {config.randomsAssigned && (
                <button
                  className={`${styles.btn} ${styles.btnDanger} ${styles.btnSm}`}
                  onClick={handleClearRandoms}
                  disabled={saving}
                >
                  Clear Randoms
                </button>
              )} */}
            </>
          )}

          <button
            className={`${styles.btn} ${config.liveScoring ? styles.btnSuccess : ''}`}
            onClick={toggleLiveScoring}
            disabled={saving}
          >
            {config.liveScoring ? 'Live Scoring ON' : 'Live Scoring OFF'}
          </button>

          <button
            className={`${styles.btn} ${styles.btnSm}`}
            onClick={forceSnapshot}
            disabled={saving}
          >
            Force Snapshot
          </button>
        </div>

        <div className={styles.statusLine}>
          <span className={`${styles.statusDot} ${config.poolLocked ? styles.statusDotRed : styles.statusDotGreen}`} />
          Pool: {config.poolLocked ? 'Locked' : 'Open'}
          {' | '}
          Teams: {readyTeams.length} ready
          {' | '}
          Randoms: {config.randomsAssigned ? 'Assigned' : 'Pending'}
          {' | '}
          Live: {config.liveScoring ? 'ON' : 'OFF'}
          {' | '}
          Last snapshot: {snapshots.length > 0 ? new Date(snapshots[0].snapshotDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'none'}
        </div>
        <div className={styles.controls} style={{ marginTop: 8 }}>
          <button className={`${styles.btn} ${styles.btnSm}`} onClick={() => {
            const header = 'Team,Owner,OwnerEmail,Paid,Pick1,Pick2,Pick3,Pick4,Pick5,Random'
            const rows = readyTeams.map(t => {
              const owner = users.find(u => u.id === t.userId)
              const sels = selections.filter(s => s.teamId === t.id)
              const picks = sels.filter(s => !s.isRandom).map(s => golfers.find(g => g.id === s.golferId)?.name ?? '?')
              const rnd = sels.find(s => s.isRandom)
              const rndName = rnd ? (golfers.find(g => g.id === rnd.golferId)?.name ?? '?') : ''
              while (picks.length < 5) picks.push('')
              return `"${t.teamName}","${owner?.fullName ?? owner?.name ?? ''}","${owner?.email ?? ''}",${owner?.paid ? 'Y' : 'N'},"${picks[0]}","${picks[1]}","${picks[2]}","${picks[3]}","${picks[4]}","${rndName}"`
            })
            const csv = [header, ...rows].join('\n')
            const blob = new Blob([csv], { type: 'text/csv' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a'); a.href = url; a.download = 'teams.csv'; a.click()
            URL.revokeObjectURL(url)
          }}>
            Download Teams CSV
          </button>
          <button className={`${styles.btn} ${styles.btnSm}`} onClick={async () => {
            const { computeTeamLeaderboard } = await import('../lib/scoring')
            const lb = computeTeamLeaderboard(teams, users, golfers, selections, snapshots, null)
            const header = 'Rank,Team,Owner,Golfer,IsRandom,AdjScore,MastersScore,DupPenalty,Thru,Status'
            const rows: string[] = []
            for (const e of lb) {
              for (const sg of e.scoredGolfers) {
                rows.push(`${e.rankDisplay},"${e.team.teamName}","${e.user.fullName ?? e.user.name}","${sg.golfer.name}",${sg.isRandom ? 'Y' : 'N'},${sg.adjScore},${sg.golfer.scoreToPar},${sg.dupPenalty},"${sg.golfer.thru}","${sg.golfer.status}"`)
              }
            }
            const csv = [header, ...rows].join('\n')
            const blob = new Blob([csv], { type: 'text/csv' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a'); a.href = url; a.download = 'results.csv'; a.click()
            URL.revokeObjectURL(url)
          }}>
            Download Results CSV
          </button>
        </div>
      </section>

      {/* User Management */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            Players
            <span className={styles.badge}>{submittedUsers.length}</span>
          </h2>
          <span className={styles.paidSummary}>
            {paidCount}/{submittedUsers.length} paid &middot; ${totalCollected.toLocaleString()} collected
          </span>
          <div style={{ position: 'relative', flex: 1, maxWidth: 220 }}>
            <input
              className={styles.inlineInput}
              style={{ width: '100%', paddingRight: 24 }}
              placeholder="Filter players..."
              value={playerSearch}
              onChange={e => setPlayerSearch(e.target.value)}
            />
            {playerSearch && (
              <button
                style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14 }}
                onClick={() => setPlayerSearch('')}
              >&times;</button>
            )}
          </div>
          <button
            className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`}
            onClick={() => setShowNewRow(true)}
            disabled={saving || showNewRow}
          >
            + Add Player
          </button>
          <a
            className={`${styles.btn} ${styles.btnSm}`}
            href={`mailto:?bcc=${submittedUsers.map(u => u.email).filter(e => e && e.includes('@')).join(',')}`}
            target="_blank" rel="noopener noreferrer"
          >
            Email All
          </a>
          {unpaidUsers.length > 0 && (
            <a
              className={`${styles.btn} ${styles.btnSm} ${styles.btnDanger}`}
              href={`mailto:${unpaidUsers.map(u => u.email).filter(e => e && e.includes('@')).join(',')}?subject=${encodeURIComponent('Masters Pool — Payment Reminder')}&body=${encodeURIComponent('Hey! You still owe $20 for the Masters pool. Please send payment ASAP.\n\nThanks!')}`}
              target="_blank" rel="noopener noreferrer"
              title={`${unpaidUsers.length} unpaid: ${unpaidUsers.map(u => u.name).join(', ')}`}
            >
              Email Unpaid ({unpaidUsers.length})
            </a>
          )}
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: 28 }}></th>
                <th>Name</th>
                <th>Email</th>
                <th>Teams</th>
                <th>Paid</th>
                <th>Admin</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {[...submittedUsers]
              .filter(u => {
                if (!playerSearch.trim()) return true
                const q = playerSearch.toLowerCase()
                return u.name.toLowerCase().includes(q)
                  || (u.fullName ?? '').toLowerCase().includes(q)
                  || u.email.toLowerCase().includes(q)
              })
              .sort((a, b) => {
                if (a.admin !== b.admin) return a.admin ? -1 : 1
                return (a.createdAt ?? '').localeCompare(b.createdAt ?? '')
              }).map(user => (
                <tr key={user.id}>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      className={styles.linkIcon}
                      onClick={() => copyLink(user.email)}
                      title="Copy invite link"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                      </svg>
                    </button>
                  </td>
                  <td>
                    {editingCell?.userId === user.id && editingCell.field === 'name' ? (
                      <input
                        className={styles.inlineInput}
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') commitEdit()
                          if (e.key === 'Escape') setEditingCell(null)
                        }}
                        onBlur={commitEdit}
                        autoFocus
                      />
                    ) : (
                      <button
                        className={styles.cellBtn}
                        onClick={() => startEdit(user.id, 'name', user.fullName || user.name)}
                      >
                        {user.fullName || user.name}
                      </button>
                    )}
                  </td>
                  <td>
                    {editingCell?.userId === user.id && editingCell.field === 'email' ? (
                      <input
                        className={styles.inlineInput}
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') commitEdit()
                          if (e.key === 'Escape') setEditingCell(null)
                        }}
                        onBlur={commitEdit}
                        autoFocus
                      />
                    ) : (
                      <button
                        className={styles.cellBtn}
                        onClick={() => startEdit(user.id, 'email', user.email)}
                      >
                        {user.email}
                      </button>
                    )}
                  </td>
                  <td className={styles.teamsCell}>
                    {teamCountByUser.get(user.id) ?? 0}
                  </td>
                  <td>
                    <button
                      className={`${styles.toggle} ${user.paid ? styles.toggleOn : ''}`}
                      onClick={() => togglePaid(user)}
                      disabled={saving}
                    >
                      {user.paid ? '\u2713' : '\u2014'}
                    </button>
                  </td>
                  <td>
                    <button
                      className={`${styles.toggle} ${user.admin ? styles.toggleOn : ''}`}
                      onClick={() => toggleAdmin(user)}
                      disabled={saving}
                    >
                      {user.admin ? '\u2713' : '\u2014'}
                    </button>
                  </td>
                  <td>
                    {confirmDeleteId === user.id ? (
                      <div className={styles.newRowActions}>
                        <button
                          className={`${styles.btn} ${styles.btnDanger} ${styles.btnSm}`}
                          onClick={() => handleDeleteUser(user)}
                        >
                          Delete
                        </button>
                        <button
                          className={`${styles.btn} ${styles.btnSm}`}
                          onClick={() => setConfirmDeleteId(null)}
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        className={styles.deleteBtn}
                        onClick={() => setConfirmDeleteId(user.id)}
                        disabled={saving}
                      >
                        {'\u2715'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {showNewRow && (
                <tr className={styles.newRow}>
                  <td></td>
                  <td>
                    <input
                      className={styles.inlineInput}
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      placeholder="Name"
                      autoFocus
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          const next = e.currentTarget.parentElement?.nextElementSibling?.querySelector('input') as HTMLInputElement | null
                          next?.focus()
                        }
                        if (e.key === 'Escape') cancelNewRow()
                      }}
                    />
                  </td>
                  <td>
                    <input
                      className={styles.inlineInput}
                      value={newEmail}
                      onChange={e => setNewEmail(e.target.value)}
                      placeholder="Email"
                      onBlur={() => {
                        if (newName.trim() && newEmail.trim()) addPlayer()
                        else if (!newName.trim() && !newEmail.trim()) cancelNewRow()
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && newName.trim() && newEmail.trim()) addPlayer()
                        if (e.key === 'Escape') cancelNewRow()
                      }}
                    />
                  </td>
                  <td></td>
                  <td></td>
                  <td></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
