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
  saveSnapshots,
} from '../lib/data-service'
import { assignRandomGolfers } from '../lib/random-assignment'
import { computeTeamLeaderboard } from '../lib/scoring'
import type { User } from '../lib/types'
import styles from './Admin.module.css'

const ENTRY_FEE = 100
const BASE_URL = `${window.location.origin}${window.location.pathname}`

export function AdminPage() {
  const { isAdmin } = useAuth()
  const { config, users, teams, golfers, selections, snapshots, refresh } = useData()
  const { addToast } = useToast()
  const [saving, setSaving] = useState(false)

  // New player inline row state
  const [newFullName, setNewFullName] = useState('')
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [showNewRow, setShowNewRow] = useState(false)

  // Inline editing state
  const [editingCell, setEditingCell] = useState<{
    userId: string
    field: 'name' | 'email' | 'fullName'
  } | null>(null)
  const [editValue, setEditValue] = useState('')

  // Delete confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  if (!isAdmin) {
    return <div className={styles.forbidden}>Admin access required.</div>
  }

  const paidCount = users.filter(u => u.paid).length
  const totalCollected = paidCount * ENTRY_FEE

  // Count teams per user
  const teamCountByUser = new Map<string, number>()
  for (const t of teams) {
    teamCountByUser.set(t.userId, (teamCountByUser.get(t.userId) ?? 0) + 1)
  }

  // Team readiness
  const readyTeams = teams.filter(t => {
    const picks = selections.filter(s => s.teamId === t.id && !s.isRandom)
    return picks.length >= 5
  })
  void (teams.length - readyTeams.length) // draft count available if needed

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

  const handleAssignRandoms = async () => {
    setSaving(true)
    try {
      const assignments = assignRandomGolfers(teams, golfers, selections)
      if (assignments.length === 0) {
        addToast('No teams to assign', 'error')
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

  const handleSaveSnapshot = async () => {
    setSaving(true)
    try {
      const leaderboard = computeTeamLeaderboard(teams, users, golfers, selections, snapshots, null)
      const entries = leaderboard.map(e => ({
        teamId: e.team.id,
        aggregateScore: e.aggregateScore,
        rank: e.rank,
      }))
      await saveSnapshots(entries)
      await refresh()
      addToast('Snapshot saved for today', 'success')
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
    const fullName = newFullName.trim()
    const name = newName.trim().slice(0, 8)
    const email = newEmail.trim().toLowerCase()
    if (!name || !email) {
      addToast('Display name and email are required', 'error')
      return
    }
    if (users.some(u => u.email.toLowerCase() === email)) {
      addToast('Email already registered', 'error')
      return
    }
    if (users.some(u => u.name.toLowerCase() === name.toLowerCase())) {
      addToast('Display name already taken', 'error')
      return
    }
    if (fullName && users.some(u => u.fullName?.toLowerCase() === fullName.toLowerCase())) {
      addToast('Full name already registered', 'error')
      return
    }
    setSaving(true)
    try {
      await createUser({ name, email, fullName: fullName || name })
      await refresh()
      setNewFullName('')
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
    if (field === 'name') val = val.slice(0, 8)

    const other = users.filter(u => u.id !== userId)
    if (field === 'email' && other.some(u => u.email.toLowerCase() === val.toLowerCase())) {
      addToast('Email already taken', 'error')
      setEditingCell(null)
      return
    }
    if (field === 'name' && other.some(u => u.name.toLowerCase() === val.toLowerCase())) {
      addToast('Display name already taken', 'error')
      setEditingCell(null)
      return
    }
    if (field === 'fullName' && other.some(u => u.fullName?.toLowerCase() === val.toLowerCase())) {
      addToast('Full name already taken', 'error')
      setEditingCell(null)
      return
    }

    setSaving(true)
    try {
      await updateUser(userId, { [field]: val })
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
    setNewFullName('')
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

          {config.poolLocked && !config.randomsAssigned && (
            <button
              className={`${styles.btn} ${styles.btnGold}`}
              onClick={handleAssignRandoms}
              disabled={saving}
            >
              Assign Random Golfers
            </button>
          )}

          <button
            className={styles.btn}
            onClick={handleSaveSnapshot}
            disabled={saving}
          >
            Save Daily Snapshot
          </button>

          <button
            className={`${styles.btn} ${config.liveScoring ? styles.btnSuccess : ''}`}
            onClick={toggleLiveScoring}
            disabled={saving}
          >
            {config.liveScoring ? 'Live Scoring ON' : 'Live Scoring OFF'}
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
        </div>
      </section>

      {/* User Management */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            Players
            <span className={styles.badge}>{users.length}</span>
          </h2>
          <span className={styles.paidSummary}>
            {paidCount}/{users.length} paid &middot; ${totalCollected.toLocaleString()} collected
          </span>
          <button
            className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`}
            onClick={() => setShowNewRow(true)}
            disabled={saving || showNewRow}
          >
            + Add Player
          </button>
          <button
            className={`${styles.btn} ${styles.btnSm}`}
            onClick={() => {
              const emails = users
                .map(u => u.email)
                .filter(e => e && e.includes('@'))
                .join(', ')
              navigator.clipboard.writeText(emails)
              addToast('Emails copied!', 'success')
            }}
          >
            Copy Emails
          </button>
          <a
            className={`${styles.btn} ${styles.btnSm}`}
            href={`mailto:?bcc=${users.map(u => u.email).filter(e => e && e.includes('@')).join(',')}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Email All
          </a>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: 28 }}></th>
                <th>Full Name</th>
                <th>Display</th>
                <th>Email</th>
                <th>Teams</th>
                <th>Paid</th>
                <th>Admin</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
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
                    {editingCell?.userId === user.id && editingCell.field === 'fullName' ? (
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
                        onClick={() => startEdit(user.id, 'fullName', user.fullName || '')}
                      >
                        {user.fullName || '\u2014'}
                      </button>
                    )}
                  </td>
                  <td>
                    {editingCell?.userId === user.id && editingCell.field === 'name' ? (
                      <input
                        className={styles.inlineInput}
                        value={editValue}
                        onChange={e => setEditValue(e.target.value.slice(0, 8))}
                        onKeyDown={e => {
                          if (e.key === 'Enter') commitEdit()
                          if (e.key === 'Escape') setEditingCell(null)
                        }}
                        onBlur={commitEdit}
                        autoFocus
                        maxLength={8}
                      />
                    ) : (
                      <button
                        className={styles.cellBtn}
                        onClick={() => startEdit(user.id, 'name', user.name)}
                      >
                        {user.name}
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
                  <td>
                    <input
                      className={styles.inlineInput}
                      value={newFullName}
                      onChange={e => setNewFullName(e.target.value)}
                      placeholder="Full name"
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
                      value={newName}
                      onChange={e => setNewName(e.target.value.slice(0, 8))}
                      placeholder="Max 8 chars"
                      maxLength={8}
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
                        else if (!newFullName.trim() && !newName.trim() && !newEmail.trim()) cancelNewRow()
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
