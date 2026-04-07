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
  const liveScoring = useLiveScoringState()

  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'field' | 'espn'>('field')
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
    } catch (err) {
      addToast(`Failed to refresh field: ${err instanceof Error ? err.message : String(err)}`, 'error')
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

      {/* Tab bar */}
      <div className={styles.tabBar}>
        <button className={`${styles.tab} ${activeTab === 'field' ? styles.tabActive : ''}`} onClick={() => setActiveTab('field')}>
          Field
        </button>
        <button className={`${styles.tab} ${activeTab === 'espn' ? styles.tabActive : ''}`} onClick={() => setActiveTab('espn')}>
          ESPN Raw Feed {liveScoring.allEspnGolfers.length > 0 ? `(${liveScoring.allEspnGolfers.length})` : ''}
        </button>
      </div>

      {/* ESPN Raw Feed Tab */}
      {activeTab === 'espn' && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>ESPN Raw Feed</h2>
            <span className={styles.sectionCount}>
              {liveScoring.allEspnGolfers.length} golfers
              {liveScoring.lastPoll && <> &middot; last poll {liveScoring.lastPoll.toLocaleTimeString()}</>}
            </span>
          </div>
          {liveScoring.allEspnGolfers.length === 0 ? (
            <div style={{ padding: '24px 14px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              {liveOn ? 'Waiting for first ESPN poll...' : 'Turn on live scoring to fetch ESPN data.'}
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: 50 }}>Pos</th>
                    <th>Name</th>
                    <th style={{ width: 60 }}>Score</th>
                    <th style={{ width: 60 }}>Today</th>
                    <th style={{ width: 60 }}>Thru</th>
                    <th style={{ width: 70 }}>Status</th>
                    <th style={{ width: 70 }}>Matched</th>
                  </tr>
                </thead>
                <tbody>
                  {liveScoring.allEspnGolfers.map((eg, i) => {
                    const poolMatch = golfers.find(g => (g.espnId && g.espnId === eg.id) || g.espnName?.toLowerCase() === eg.name.toLowerCase())
                    return (
                      <tr key={eg.id} className={i % 2 === 0 ? '' : styles.row}>
                        <td style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>{eg.position || i + 1}</td>
                        <td style={{ fontWeight: 500 }}>{eg.name}</td>
                        <td style={{ textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{eg.scoreToPar === 0 ? '-' : eg.scoreToPar}</td>
                        <td style={{ textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{eg.today === 0 ? '-' : eg.today}</td>
                        <td style={{ textAlign: 'center' }}>{eg.thru || '--'}</td>
                        <td style={{ textAlign: 'center', fontSize: 11 }}>{eg.status}</td>
                        <td style={{ textAlign: 'center' }}>
                          {poolMatch ? (
                            <span style={{ color: 'var(--accent-green)', fontSize: 11, fontWeight: 600 }}>{poolMatch.id}</span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Field Table */}
      {activeTab === 'field' && <section className={styles.section}>
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
                <th className={styles.thNarrow}>Adj</th>
                <th className={styles.thNarrow}>Masters</th>
                <th className={styles.thNarrow}>Dups</th>
                <th className={styles.thNarrow}>Today</th>
                <th className={styles.thNarrow}>Thru</th>
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
                    teamCount={teamCount}
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
      </section>}
    </div>
  )
}

function GolferRow({
  golfer, liveOn, dupPenalty, teamCount, isRandomOnly, onDebouncedUpdate, onStatusChange, onLockToggle, saving,
}: {
  golfer: Golfer
  liveOn: boolean
  dupPenalty: number
  teamCount: number
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
        <input className={`${styles.textInput} ${styles.centered}`} value={localOdds} style={{ width: 60 }}
          onChange={e => { setLocalOdds(e.target.value); onDebouncedUpdate(golfer.id, { name: golfer.name }) }} />
      </td>
      <td className={styles.numCell}>
        {formatScore(golfer.scoreToPar + dupPenalty)}
      </td>
      <td>
        <input className={`${styles.scoreInput} ${golfer.scoreLocked ? styles.lockedInput : ''}`}
          type="number" value={localScore}
          onChange={e => { setLocalScore(e.target.value); const n = parseInt(e.target.value, 10); if (!isNaN(n)) onDebouncedUpdate(golfer.id, { scoreToPar: n }) }} />
      </td>
      <td className={styles.numCell}>
        {isRandomOnly ? (
          <span className={styles.rndLabel}>RND</span>
        ) : dupPenalty > 0 ? (
          <span className={styles.dupLabel}>+{dupPenalty}</span>
        ) : teamCount > 0 ? '0' : ''}
      </td>
      <td>
        <input className={`${styles.scoreInput} ${golfer.scoreLocked ? styles.lockedInput : ''}`}
          type="number" value={localToday}
          onChange={e => { setLocalToday(e.target.value); const n = parseInt(e.target.value, 10); if (!isNaN(n)) onDebouncedUpdate(golfer.id, { today: n }) }} />
      </td>
      <td>
        <input className={`${styles.textInput} ${styles.centered}`} value={localThru} placeholder="" style={{ width: 32 }}
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
