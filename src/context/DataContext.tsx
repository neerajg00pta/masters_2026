import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import type { Config, User, Team, Golfer, Selection, ScoreSnapshot } from '../lib/types'
import { fetchAllData, seedGolfersIfEmpty } from '../lib/data-service'
import { MASTERS_2026_FIELD } from '../lib/masters-field'
import { POLL_INTERVAL_MS } from '../lib/config'

interface DataState {
  config: Config
  users: User[]
  teams: Team[]
  golfers: Golfer[]
  selections: Selection[]
  snapshots: ScoreSnapshot[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  /** Increments on every successful poll -- forces consumer re-renders */
  tick: number
}

const DataContext = createContext<DataState | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<Config>({ poolLocked: false, randomsAssigned: false, liveScoring: false })
  const [users, setUsers] = useState<User[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [golfers, setGolfers] = useState<Golfer[]>([])
  const [selections, setSelections] = useState<Selection[]>([])
  const [snapshots, setSnapshots] = useState<ScoreSnapshot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const refresh = useCallback(async () => {
    try {
      const data = await fetchAllData()
      setConfig(data.config)
      setUsers(data.users)
      setTeams(data.teams)
      setGolfers(data.golfers)
      setSelections(data.selections)
      setSnapshots(data.snapshots)
      setError(null)
      setTick(t => t + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const init = async () => {
      // Auto-seed golfers on first load if table is empty
      const seeded = await seedGolfersIfEmpty(MASTERS_2026_FIELD)
      if (seeded) console.log('Auto-seeded Masters field')
      await refresh()
    }
    init()
    const interval = setInterval(refresh, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [refresh])

  return (
    <DataContext.Provider value={{ config, users, teams, golfers, selections, snapshots, loading, error, refresh, tick }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}
