import { useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { useLiveScoringState } from '../context/LiveScoringContext'
import { upsertGolfers, updateGolfer } from '../lib/data-service'
import { MASTERS_2026_FIELD } from '../lib/masters-field'
import type { Golfer } from '../lib/types'
import styles from './AdminGolfers.module.css'

export function AdminGolfersPage() {
  const { isAdmin } = useAuth()
  const { config, golfers, refresh } = useData()
  const { addToast } = useToast()
  const liveScoring = useLiveScoringState()

  const [saving, setSaving] = useState(false)
  const [cutSelection, setCutSelection] = useState<Set<string>>(new Set())

  // Debounced saves
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  // ESPN match state
  const [espnAssignments, setEspnAssignments] = useState<Map<string, string>>(new Map())

  if (!isAdmin) {
    return <div className={styles.forbidden}>Admin access required.</div>
  }

  // Stats
  const activeCount = golfers.filter(g => g.status === 'active').length
  const cutCount = golfers.filter(g => g.status === 'cut').length
  const wdCount = golfers.filter(g => g.status === 'withdrawn').length

  // === Controls ===

  const handleRefreshField = async () => {
    setSaving(true)
    try {
      const count = await upsertGolfers(MASTERS_2026_FIELD)
      await refresh()
      addToast(`Field refreshed: ${count} golfers`, 'success')
    } catch {
      addToast('Failed to refresh field', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleMarkCut = async () => {
    if (cutSelection.size === 0) {
      addToast('Select golfers to mark as cut', 'error')
      return
    }
    setSaving(true)
    try {
      for (const golferId of cutSelection) {
        await updateGolfer(golferId, { status: 'cut' })
      }
      await refresh()
      setCutSelection(new Set())
      addToast(`${cutSelection.size} golfers marked as cut`, 'success')
    } catch {
      addToast('Failed to mark cut', 'error')
    } finally {
      setSaving(false)
    }
  }

  // === Debounced Golfer Updates ===

  const debouncedUpdate = (golferId: string, updates: Parameters<typeof updateGolfer>[1]) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSaving(true)
      try {
        await updateGolfer(golferId, updates)
        await refresh()
      } catch {
        addToast('Save failed', 'error')
      } finally {
        setSaving(false)
      }
    }, 800)
  }

  const handleStatusChange = async (golferId: string, status: Golfer['status']) => {
    setSaving(true)
    try {
      await updateGolfer(golferId, { status })
      await refresh()
    } catch {
      addToast('Failed to update status', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleLockToggle = async (golferId: string, current: boolean) => {
    setSaving(true)
    try {
      await updateGolfer(golferId, { scoreLocked: !current })
      await refresh()
    } catch {
      addToast('Failed to toggle lock', 'error')
    } finally {
      setSaving(false)
    }
  }

  // === ESPN Matching ===

  const handleAssignEspn = async (espnName: string, poolGolferId: string) => {
    if (!poolGolferId) return
    setSaving(true)
    try {
      await updateGolfer(poolGolferId, { espnName })
      await refresh()
      setEspnAssignments(prev => {
        const next = new Map(prev)
        next.delete(espnName)
        return next
      })
      addToast(`Mapped "${espnName}"`, 'success')
    } catch {
      addToast('Failed to assign ESPN name', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleAutoMatch = async () => {
    if (liveScoring.unmatchedEspn.length === 0) return
    setSaving(true)
    let matched = 0
    try {
      for (const espn of liveScoring.unmatchedEspn) {
        const espnLower = espn.name.toLowerCase()
        // Fuzzy: try last-name match
        const espnParts = espnLower.split(/\s+/)
        const espnLast = espnParts[espnParts.length - 1]
        const pool = golfers.find(g => {
          if (g.espnName) return false // already mapped
          const poolLower = g.name.toLowerCase()
          if (poolLower === espnLower) return true
          const poolParts = poolLower.split(/\s+/)
          const poolLast = poolParts[poolParts.length - 1]
          return poolLast === espnLast && poolParts[0][0] === espnParts[0][0]
        })
        if (pool) {
          await updateGolfer(pool.id, { espnName: espn.name })
          matched++
        }
      }
      await refresh()
      if (matched > 0) addToast(`Auto-matched ${matched} golfers`, 'success')
      else addToast('No additional matches found', 'info')
    } catch {
      addToast('Auto-match failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  // === CSV Export ===

  const downloadCsv = () => {
    const header = 'Sort,Name,ESPN Name,Odds,Score To Par,Today,Thru,Status,Locked'
    const rows = golfers.map(g =>
      `${g.sortOrder},"${g.name}","${g.espnName ?? ''}","${g.odds ?? ''}",${g.scoreToPar},${g.today},"${g.thru}","${g.status}",${g.scoreLocked}`
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'masters-golfer-scores.csv'
    a.click()
    URL.revokeObjectURL(url)
    addToast('CSV downloaded', 'success')
  }

  // Toggle cut selection
  const toggleCutSelect = (golferId: string) => {
    setCutSelection(prev => {
      const next = new Set(prev)
      if (next.has(golferId)) next.delete(golferId)
      else next.add(golferId)
      return next
    })
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Golfer Management</h1>
        <div className={styles.stats}>
          <span className={styles.statActive}>{activeCount} active</span>
          <span className={styles.statCut}>{cutCount} cut</span>
          <span className={styles.statWd}>{wdCount} wd</span>
        </div>
        {saving && <span className={styles.savingBadge}>Saving...</span>}
      </div>

      {/* Controls */}
      <div className={styles.controls}>
        <button
          className={`${styles.btn} ${styles.btnPrimary}`}
          onClick={handleRefreshField}
          disabled={saving}
        >
          Refresh Masters Field
        </button>
        <button
          className={styles.csvBtn}
          onClick={downloadCsv}
        >
          Download CSV
        </button>
      </div>

      {/* Mark Cut Section */}
      {golfers.filter(g => g.status === 'active').length > 0 && (
        <div className={styles.cutSection}>
          <div className={styles.cutTitle}>
            Mark Cut
            {cutSelection.size > 0 && (
              <button
                className={`${styles.btn} ${styles.btnDanger} ${styles.btnSm}`}
                onClick={handleMarkCut}
                disabled={saving}
                style={{ marginLeft: 12 }}
              >
                Cut {cutSelection.size} golfer{cutSelection.size !== 1 ? 's' : ''}
              </button>
            )}
          </div>
          <div className={styles.cutList}>
            {golfers
              .filter(g => g.status === 'active')
              .map(g => (
                <button
                  key={g.id}
                  className={`${styles.cutChip} ${cutSelection.has(g.id) ? styles.cutChipSelected : ''}`}
                  onClick={() => toggleCutSelect(g.id)}
                >
                  {g.name}
                </button>
              ))}
          </div>
        </div>
      )}

      {/* ESPN Matching (when live scoring is on) */}
      {config.liveScoring && liveScoring.unmatchedEspn.length > 0 && (
        <div className={styles.matchSection}>
          <div className={styles.matchTitle}>
            Unmatched ESPN Golfers ({liveScoring.unmatchedEspn.length})
            <button
              className={`${styles.btn} ${styles.btnSm}`}
              onClick={handleAutoMatch}
              disabled={saving}
              style={{ marginLeft: 12 }}
            >
              Auto-Match All
            </button>
          </div>
          {liveScoring.unmatchedEspn.map(espn => (
            <div key={espn.id} className={styles.matchRow}>
              <span className={styles.matchEspnName}>{espn.name}</span>
              <select
                className={styles.matchSelect}
                value={espnAssignments.get(espn.name) ?? ''}
                onChange={e => {
                  const val = e.target.value
                  setEspnAssignments(prev => {
                    const next = new Map(prev)
                    if (val) next.set(espn.name, val)
                    else next.delete(espn.name)
                    return next
                  })
                }}
              >
                <option value="">-- Select pool golfer --</option>
                {golfers
                  .filter(g => !g.espnName)
                  .map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
              </select>
              <button
                className={styles.matchBtn}
                disabled={!espnAssignments.get(espn.name) || saving}
                onClick={() => handleAssignEspn(espn.name, espnAssignments.get(espn.name) ?? '')}
              >
                Assign
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Golfer Table */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Field</h2>
          <span className={styles.sectionCount}>{golfers.length} golfers</span>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.thNum}>#</th>
                <th className={styles.thName}>Name</th>
                <th className={styles.thEspn}>ESPN Name</th>
                <th className={styles.thOdds}>Odds</th>
                <th className={styles.thScore}>Score</th>
                <th className={styles.thToday}>Today</th>
                <th className={styles.thThru}>Thru</th>
                <th className={styles.thStatus}>Status</th>
                <th className={styles.thLocked}>Lock</th>
                <th className={styles.thActions}></th>
              </tr>
            </thead>
            <tbody>
              {golfers.map(golfer => (
                <GolferRow
                  key={golfer.id}
                  golfer={golfer}
                  onDebouncedUpdate={debouncedUpdate}
                  onStatusChange={handleStatusChange}
                  onLockToggle={handleLockToggle}
                  saving={saving}
                />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function GolferRow({
  golfer,
  onDebouncedUpdate,
  onStatusChange,
  onLockToggle,
  saving,
}: {
  golfer: Golfer
  onDebouncedUpdate: (id: string, updates: Parameters<typeof updateGolfer>[1]) => void
  onStatusChange: (id: string, status: Golfer['status']) => void
  onLockToggle: (id: string, current: boolean) => void
  saving: boolean
}) {
  const [localName, setLocalName] = useState(golfer.name)
  const [localEspn, setLocalEspn] = useState(golfer.espnName ?? '')
  const [localScore, setLocalScore] = useState(String(golfer.scoreToPar))
  const [localToday, setLocalToday] = useState(String(golfer.today))
  const [localThru, setLocalThru] = useState(golfer.thru)

  const rowClass = golfer.status === 'cut'
    ? `${styles.row} ${styles.rowCut}`
    : golfer.status === 'withdrawn'
      ? `${styles.row} ${styles.rowWithdrawn}`
      : styles.row

  return (
    <tr className={rowClass}>
      <td className={styles.sortNum}>{golfer.sortOrder}</td>
      <td>
        <input
          className={styles.textInput}
          value={localName}
          onChange={e => {
            setLocalName(e.target.value)
            onDebouncedUpdate(golfer.id, { name: e.target.value })
          }}
        />
      </td>
      <td>
        <input
          className={styles.textInput}
          value={localEspn}
          placeholder="ESPN name"
          onChange={e => {
            setLocalEspn(e.target.value)
            onDebouncedUpdate(golfer.id, { espnName: e.target.value || null })
          }}
        />
      </td>
      <td className={styles.oddsCell}>{golfer.odds ?? '\u2014'}</td>
      <td>
        <input
          className={`${styles.scoreInput} ${golfer.scoreLocked ? styles.lockedInput : ''}`}
          type="number"
          value={localScore}
          onChange={e => {
            setLocalScore(e.target.value)
            const num = parseInt(e.target.value, 10)
            if (!isNaN(num)) onDebouncedUpdate(golfer.id, { scoreToPar: num })
          }}
        />
      </td>
      <td>
        <input
          className={`${styles.scoreInput} ${golfer.scoreLocked ? styles.lockedInput : ''}`}
          type="number"
          value={localToday}
          onChange={e => {
            setLocalToday(e.target.value)
            const num = parseInt(e.target.value, 10)
            if (!isNaN(num)) onDebouncedUpdate(golfer.id, { today: num })
          }}
        />
      </td>
      <td>
        <input
          className={styles.textInput}
          value={localThru}
          placeholder="F"
          style={{ width: 48, textAlign: 'center' }}
          onChange={e => {
            setLocalThru(e.target.value)
            onDebouncedUpdate(golfer.id, { thru: e.target.value })
          }}
        />
      </td>
      <td>
        <select
          className={styles.statusSelect}
          value={golfer.status}
          onChange={e => onStatusChange(golfer.id, e.target.value as Golfer['status'])}
          disabled={saving}
        >
          <option value="active">active</option>
          <option value="cut">cut</option>
          <option value="withdrawn">wd</option>
        </select>
      </td>
      <td>
        <button
          className={`${styles.lockToggle} ${golfer.scoreLocked ? styles.lockToggleOn : ''}`}
          onClick={() => onLockToggle(golfer.id, golfer.scoreLocked)}
          disabled={saving}
          title={golfer.scoreLocked ? 'Score locked (click to unlock)' : 'Click to lock score'}
        >
          {golfer.scoreLocked ? 'L' : '\u2014'}
        </button>
      </td>
      <td></td>
    </tr>
  )
}
