import { useState, useEffect, useRef, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import styles from './Layout.module.css'

export function Layout({ children }: { children: ReactNode }) {
  const { currentUser, login, logout, isAdmin, activateAdmin, deactivateAdmin } = useAuth()
  const { loading, config } = useData()
  const { addToast } = useToast()
  const [emailInput, setEmailInput] = useState('')
  const [loginError, setLoginError] = useState(false)
  const location = useLocation()

  // Hidden admin activation: type "admin" anywhere on the page
  const keyBuffer = useRef('')
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      keyBuffer.current += e.key.toLowerCase()
      keyBuffer.current = keyBuffer.current.slice(-5)
      if (keyBuffer.current === 'admin') {
        keyBuffer.current = ''
        if (activateAdmin()) {
          addToast('Admin mode activated', 'success')
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [activateAdmin, addToast])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = emailInput.trim().toLowerCase()
    if (!login(trimmed)) {
      setLoginError(true)
      setTimeout(() => setLoginError(false), 2000)
    }
    setEmailInput('')
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <span>Loading pool data...</span>
      </div>
    )
  }

  return (
    <>
      <header className={styles.header}>
        <Link to="/" className={styles.brand}>
          <svg className={styles.brandIcon} viewBox="0 0 20 24" width="16" height="20">
            <rect x="9" y="2" width="2" height="20" fill="var(--masters-gold)" rx="1" />
            <path d="M11 2 L19 6 L11 10 Z" fill="var(--masters-gold)" />
          </svg>
          <span className={styles.brandText}>MASTERS POOL</span>
        </Link>

        <div className={styles.headerRight}>
          {(config.poolLocked || isAdmin) && (
            <Link
              to="/live"
              className={`${styles.navLink} ${location.pathname === '/live' ? styles.navLinkActive : ''}`}
            >
              Live
            </Link>
          )}
          {(!config.poolLocked || isAdmin) && (
            <Link
              to="/teams"
              className={`${styles.navLink} ${location.pathname === '/teams' ? styles.navLinkActive : ''}`}
            >
              Teams
            </Link>
          )}
          <Link
            to="/rules"
            className={`${styles.navLink} ${location.pathname === '/rules' ? styles.navLinkActive : ''}`}
          >
            Rules
          </Link>
          {currentUser ? (
            <>
              {isAdmin && (
                <nav className={styles.adminNav}>
                  <Link
                    to="/admin"
                    className={`${styles.navLink} ${location.pathname === '/admin' ? styles.navLinkActive : ''}`}
                  >
                    Admin
                  </Link>
                  <Link
                    to="/admin/golfers"
                    className={`${styles.navLink} ${location.pathname === '/admin/golfers' ? styles.navLinkActive : ''}`}
                  >
                    Golfers
                  </Link>
                  <button
                    className={styles.exitAdminBtn}
                    onClick={() => { deactivateAdmin(); addToast('Player mode', 'success') }}
                  >
                    Exit Admin
                  </button>
                </nav>
              )}
              <span className={styles.userName}>{currentUser.fullName ?? currentUser.name}</span>
              <button onClick={logout} className={styles.logoutBtn}>
                Log out
              </button>
            </>
          ) : (
            <form onSubmit={handleLogin} className={styles.loginForm}>
              <input
                type="email"
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                placeholder="Your email"
                className={`${styles.codeInput} ${loginError ? styles.codeInputError : ''}`}
              />
              <button type="submit" className={styles.goBtn}>Sign in</button>
            </form>
          )}
        </div>
      </header>

      <main
        className={styles.main}
        onTouchStart={() => { longPressRef.current = setTimeout(() => { if (activateAdmin()) addToast('Admin mode activated', 'success') }, 1500) }}
        onTouchEnd={() => { if (longPressRef.current) clearTimeout(longPressRef.current) }}
        onTouchCancel={() => { if (longPressRef.current) clearTimeout(longPressRef.current) }}
      >
        {children}
      </main>
    </>
  )
}
