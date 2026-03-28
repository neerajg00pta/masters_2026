import { useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { useLiveScoringState } from '../context/LiveScoringContext'
import { upsertGolfers, updateGolfer } from '../lib/data-service'
import { MASTERS_2026_FIELD } from '../lib/masters-field'
import { formatScore, type Golfer } from '../lib/types'
import styles from './AdminGolfers.module.css'

export function AdminGolfersPage() {
  const { isAdmin } = useAuth()
  const { config, golfers, selections, refresh } = useData()
  const { addToast } = useToast()
  void useLiveScoringState() // keep hook call order but not used directly anymore

  const [saving, setSaving] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  if (!isAdmin) {
    return <div className={styles.forbidden}>Admin access required.</div>
  }

  const activeCount = golfers.filter(g => g.status === 'active').length
  const cutCount = golfers.filter(g => g.status === 'cut').length
  const wdCount = golfers.filter(g => g.status === 'withdrawn').length
  const matchedCount = golfers.filter(g => g.espnName).length
  const liveOn = config.liveScoring

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

  const downloadCsv = () => {
    const header = 'Rank,Name,ESPN Name,Odds,Score,Today,Thru,Status,Locked'
    const rows = golfers.map(g =>
      `${g.sortOrder},"${g.name}","${g.espnName ?? ''}","${g.odds ?? ''}",${g.scoreToPar},${g.today},"${g.thru}","${g.status}",${g.scoreLocked}`
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'masters-golfer-scores.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Golfer Management</h1>
        <div className={styles.stats}>
          <span className={styles.statActive}>{activeCount} active</span>
          <span className={styles.statCut}>{cutCount} cut</span>
          {wdCount > 0 && <span className={styles.statWd}>{wdCount} wd</span>}
          {liveOn && <span className={matchedCount === golfers.length ? styles.statActive : styles.statCut}>
            {matchedCount}/{golfers.length} matched
          </span>}
        </div>
        {saving && <span className={styles.savingBadge}>Saving...</span>}
      </div>

      <div className={styles.controls}>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleRefreshField} disabled={saving}>
          Refresh Masters Field
        </button>
        <button className={styles.csvBtn} onClick={downloadCsv}>Download CSV</button>
      </div>

      {liveOn && matchedCount < golfers.length && (
        <div className={styles.tipWarn}>
          <strong>{golfers.length - matchedCount} golfers have no ESPN match.</strong> Edit their Name to match what ESPN uses. Matching runs automatically every 30s.
        </div>
      )}

      {/* Single Field Table — the one source of truth */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Field</h2>
          <span className={styles.sectionCount}>{golfers.length} golfers</span>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.thNum}>Rank</th>
                <th className={styles.thName}>Name</th>
                <th className={styles.thEspn}>ESPN Match</th>
                <th className={styles.thOdds}>Odds</th>
                <th style={{ width: '40px', textAlign: 'center' }}>Dups</th>
                <th className={styles.thScore}>Score</th>
                <th style={{ width: '50px', textAlign: 'center' }}>Adj</th>
                <th className={styles.thToday}>Today</th>
                <th className={styles.thThru}>Thru</th>
                <th className={styles.thStatus}>Status</th>
                <th className={styles.thLocked} title="Lock prevents live scoring from overwriting">Lock</th>
              </tr>
            </thead>
            <tbody>
              {golfers.map(golfer => {
                const teamCount = selections.filter(s => s.golferId === golfer.id && !s.isRandom).length
                const isRandomOnly = selections.some(s => s.golferId === golfer.id && s.isRandom) && teamCount === 0
                const dupPenalty = isRandomOnly ? 0 : Math.max(0, teamCount - 1)
                return (
                  <GolferRow
                    key={golfer.id}
                    golfer={golfer}
                    liveOn={liveOn}
                    dupPenalty={dupPenalty}
                    isRandomOnly={isRandomOnly}
                    onDebouncedUpdate={debouncedUpdate}
                    onStatusChange={handleStatusChange}
                    onLockToggle={handleLockToggle}
                    saving={saving}
                  />
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function GolferRow({
  golfer, liveOn, dupPenalty, isRandomOnly, onDebouncedUpdate, onStatusChange, onLockToggle, saving,
}: {
  golfer: Golfer
  liveOn: boolean
  dupPenalty: number
  isRandomOnly: boolean
  onDebouncedUpdate: (id: string, updates: Parameters<typeof updateGolfer>[1]) => void
  onStatusChange: (id: string, status: Golfer['status']) => void
  onLockToggle: (id: string, current: boolean) => void
  saving: boolean
}) {
  const [localName, setLocalName] = useState(golfer.name)
  const [localOdds, setLocalOdds] = useState(golfer.odds ?? '')
  const [localScore, setLocalScore] = useState(String(golfer.scoreToPar))
  const [localToday, setLocalToday] = useState(String(golfer.today))
  const [localThru, setLocalThru] = useState(golfer.thru)

  const hasMatch = !!golfer.espnName
  const noMatch = liveOn && !hasMatch && golfer.status === 'active'

  const rowClass = [
    styles.row,
    golfer.status === 'cut' ? styles.rowCut : '',
    golfer.status === 'withdrawn' ? styles.rowWithdrawn : '',
    noMatch ? styles.rowNoMatch : '',
  ].filter(Boolean).join(' ')

  return (
    <tr className={rowClass}>
      <td className={styles.sortNum}>{golfer.sortOrder}</td>
      <td>
        <input className={styles.textInput} value={localName}
          onChange={e => { setLocalName(e.target.value); onDebouncedUpdate(golfer.id, { name: e.target.value }) }} />
      </td>
      <td>
        {hasMatch ? (
          <span className={styles.matchedName}>{golfer.espnName}</span>
        ) : liveOn ? (
          <span className={styles.noMatchBadge}>NO MATCH</span>
        ) : (
          <span className={styles.noData}>&mdash;</span>
        )}
      </td>
      <td>
        <input className={styles.textInput} value={localOdds} style={{ width: 60, textAlign: 'center' }}
          onChange={e => { setLocalOdds(e.target.value); onDebouncedUpdate(golfer.id, { name: golfer.name }) }} />
      </td>
      <td style={{ textAlign: 'center', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
        {isRandomOnly ? (
          <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)' }}>RND</span>
        ) : dupPenalty > 0 ? (
          <span style={{ fontWeight: 600, color: 'var(--accent-red)' }}>+{dupPenalty}</span>
        ) : ''}
      </td>
      <td>
        <input className={`${styles.scoreInput} ${golfer.scoreLocked ? styles.lockedInput : ''}`}
          type="number" value={localScore}
          onChange={e => { setLocalScore(e.target.value); const n = parseInt(e.target.value, 10); if (!isNaN(n)) onDebouncedUpdate(golfer.id, { scoreToPar: n }) }} />
      </td>
      <td style={{ textAlign: 'center', fontSize: 12, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
        {formatScore(golfer.scoreToPar + dupPenalty)}
      </td>
      <td>
        <input className={`${styles.scoreInput} ${golfer.scoreLocked ? styles.lockedInput : ''}`}
          type="number" value={localToday}
          onChange={e => { setLocalToday(e.target.value); const n = parseInt(e.target.value, 10); if (!isNaN(n)) onDebouncedUpdate(golfer.id, { today: n }) }} />
      </td>
      <td>
        <input className={styles.textInput} value={localThru} placeholder=""
          style={{ width: 48, textAlign: 'center' }}
          onChange={e => { setLocalThru(e.target.value); onDebouncedUpdate(golfer.id, { thru: e.target.value }) }} />
      </td>
      <td>
        <select className={styles.statusSelect} value={golfer.status}
          onChange={e => onStatusChange(golfer.id, e.target.value as Golfer['status'])} disabled={saving}>
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
          title={golfer.scoreLocked ? 'Locked — click to unlock' : 'Unlocked — click to lock'}
        >
          {golfer.scoreLocked ? 'L' : '\u2014'}
        </button>
      </td>
    </tr>
  )
}
