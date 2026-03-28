import { Navigate } from 'react-router-dom'
import { useData } from '../context/DataContext'

export function DefaultRedirect() {
  const { config } = useData()
  return <Navigate to={config.poolLocked ? '/live' : '/teams'} replace />
}
