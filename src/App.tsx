import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { DataProvider } from './context/DataContext'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { LiveScoringProvider } from './context/LiveScoringContext'
import { Layout } from './components/Layout'
import { LivePage } from './pages/Live'
import { TeamsPage } from './pages/Teams'
import { RulesPage } from './pages/Rules'
import { AdminPage } from './pages/Admin'
import { AdminGolfersPage } from './pages/AdminGolfers'
import { Toasts } from './components/Toasts'
import { DefaultRedirect } from './components/DefaultRedirect'

export default function App() {
  return (
    <HashRouter>
      <DataProvider>
        <AuthProvider>
          <ToastProvider>
            <LiveScoringProvider>
              <Layout>
                <Routes>
                  <Route path="/" element={<DefaultRedirect />} />
                  <Route path="/live" element={<LivePage />} />
                  <Route path="/teams" element={<TeamsPage />} />
                  <Route path="/rules" element={<RulesPage />} />
                  <Route path="/admin" element={<AdminPage />} />
                  <Route path="/admin/golfers" element={<AdminGolfersPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Layout>
            </LiveScoringProvider>
            <Toasts />
          </ToastProvider>
        </AuthProvider>
      </DataProvider>
    </HashRouter>
  )
}
