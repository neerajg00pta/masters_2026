import { createContext, useContext, type ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { useData } from './DataContext'
import { useLiveScoring, type LiveScoringState } from '../hooks/useLiveScoring'

const LiveScoringContext = createContext<LiveScoringState>({
  isPolling: false,
  lastPoll: null,
  error: null,
  unmatchedEspn: [],
  unmatchedPool: [],
  allEspnGolfers: [],
})

export function LiveScoringProvider({ children }: { children: ReactNode }) {
  const { isAdmin } = useAuth()
  const { config, golfers, teams, users, selections, snapshots, refresh } = useData()

  const state = useLiveScoring(isAdmin && config.liveScoring, golfers, teams, users, selections, snapshots, refresh)

  return (
    <LiveScoringContext.Provider value={state}>
      {children}
    </LiveScoringContext.Provider>
  )
}

export function useLiveScoringState() {
  return useContext(LiveScoringContext)
}
