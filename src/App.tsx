import { HashRouter, Routes, Route } from 'react-router-dom'
import { DataProvider } from './context/DataContext'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { LiveScoringProvider } from './context/LiveScoringContext'
import { Layout } from './components/Layout'
import { HomePage } from './pages/Home'
import { PicksPage } from './pages/Picks'
import { RulesPage } from './pages/Rules'
import { AdminPage } from './pages/Admin'
import { AdminGolfersPage } from './pages/AdminGolfers'
import { Toasts } from './components/Toasts'

export default function App() {
  return (
    <HashRouter>
      <DataProvider>
        <AuthProvider>
          <ToastProvider>
            <LiveScoringProvider>
              <Layout>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/picks" element={<PicksPage />} />
                  <Route path="/rules" element={<RulesPage />} />
                  <Route path="/admin" element={<AdminPage />} />
                  <Route path="/admin/golfers" element={<AdminGolfersPage />} />
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
