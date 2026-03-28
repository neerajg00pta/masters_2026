import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { createUser } from '../lib/data-service'
import styles from './RegisterModal.module.css'

interface Props {
  onClose: () => void
  onRegistered: () => void
}

export function RegisterModal({ onClose, onRegistered }: Props) {
  const { loginDirect } = useAuth()
  const { users, refresh } = useData()
  const { addToast } = useToast()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const trimName = name.trim()
    const trimEmail = email.trim().toLowerCase()
    if (!trimName || !trimEmail) { setError('All fields are required'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimEmail)) { setError('Please enter a valid email'); return }
    if (users.some(u => u.email?.toLowerCase() === trimEmail)) { setError('Email already registered — use Sign In'); return }

    setSaving(true)
    try {
      const newUser = await createUser({ name: trimName, email: trimEmail, fullName: trimName })
      loginDirect(newUser)
      refresh()
      addToast(`Welcome, ${trimName}!`, 'success')
      onRegistered()
    } catch (err) {
      console.error(err)
      setError('Something went wrong')
    } finally { setSaving(false) }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.card} onClick={e => e.stopPropagation()}>
        <h2 className={styles.title}>Join the Pool</h2>
        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.field}>
            <span className={styles.label}>Name</span>
            <input className={styles.input} value={name} onChange={e => setName(e.target.value)} placeholder="Your name" autoFocus />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Email</span>
            <input className={styles.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Your email" />
          </label>
          {error && <div className={styles.error}>{error}</div>}
          <button className={styles.submit} type="submit" disabled={saving || !name.trim() || !email.trim()}>
            {saving ? 'Joining...' : 'Join'}
          </button>
        </form>
      </div>
    </div>
  )
}
