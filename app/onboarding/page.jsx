'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../lib/auth-context'
import { useApi } from '../../lib/useApi'
import styles from './page.module.css'

const MODES = [
  { id: 'build',   label: 'Building a website or app', icon: '{}', desc: 'I need to accept payments in my software' },
  { id: 'payroll', label: 'Paying a team or people',   icon: 'P',  desc: 'I need to pay employees, contractors, or freelancers' },
  { id: 'creator', label: 'Accepting payments as a creator', icon: 'C', desc: 'I want a public payment link — tips, memberships, products' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const { isLoaded, isSignedIn } = useAuth()
  const api = useApi()
  const [step, setStep]   = useState(1)
  const [mode, setMode]   = useState('build')
  const [form, setForm]   = useState({ name: '', website: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) router.push('/login')
  }, [isLoaded, isSignedIn])

  async function handleSubmit(e) {
    e.preventDefault(); setError('')
    if (!form.name.trim()) { setError('Project name is required'); return }
    setLoading(true)
    try {
      const data = await api.post('/orgs', { name: form.name, website: form.website, mode })
      router.push('/dashboard/' + data.id)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  if (!isLoaded) return null

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>KONDU<span>Y</span>T</div>

        {step === 1 ? (
          <>
            <h1 className={styles.title}>What are you building?</h1>
            <p className={styles.sub}>We will set up your dashboard to match.</p>
            <div className={styles.modes}>
              {MODES.map(m => (
                <button key={m.id} onClick={() => setMode(m.id)}
                  className={styles.modeCard + (mode === m.id ? ' ' + styles.modeActive : '')}>
                  <span className={styles.modeIcon}>{m.icon}</span>
                  <div>
                    <div className={styles.modeLabel}>{m.label}</div>
                    <div className={styles.modeDesc}>{m.desc}</div>
                  </div>
                </button>
              ))}
            </div>
            <button className={styles.submit} onClick={() => setStep(2)}>Continue</button>
          </>
        ) : (
          <>
            <h1 className={styles.title}>Name your project</h1>
            <p className={styles.sub}>A project holds your API keys, vendors, and transactions.</p>
            <form onSubmit={handleSubmit} className={styles.form} noValidate>
              <div className={styles.field}>
                <label htmlFor="name">Project name</label>
                <input id="name" type="text" placeholder="My App" required value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} />
              </div>
              <div className={styles.field}>
                <label htmlFor="website">Website URL <span className={styles.optional}>(optional)</span></label>
                <input id="website" type="url" placeholder="https://myapp.com" value={form.website} onChange={e => setForm(f => ({...f, website: e.target.value}))} />
              </div>
              {error && <p className={styles.error}>{error}</p>}
              <div style={{display:'flex',gap:'10px'}}>
                <button type="button" className={styles.backBtn} onClick={() => setStep(1)}>Back</button>
                <button type="submit" className={styles.submit} disabled={loading} style={{flex:1}}>
                  {loading ? 'Creating...' : 'Create project'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
