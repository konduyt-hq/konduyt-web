'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'

export default function OnboardingPage() {
  const router = useRouter()
  const [form, setForm]     = useState({ name: '', website: '' })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.name.trim()) { setError('Project name is required'); return }
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/orgs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Failed to create')
      router.push(`/dashboard/${data.id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>

        <div className={styles.logo}>KONDU<span>Y</span>T</div>

        <h1 className={styles.title}>Create your first project</h1>
        <p className={styles.sub}>
          A project is a separate workspace for each business or app you build.
          Each project has its own API keys, connected payment methods, and tax settings.
        </p>

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <div className={styles.field}>
            <label htmlFor="name">Project name</label>
            <input
              id="name"
              type="text"
              placeholder="My App"
              required
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="website">
              Website URL <span className={styles.optional}>(optional)</span>
            </label>
            <input
              id="website"
              type="url"
              placeholder="https://myapp.com"
              value={form.website}
              onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.submit} disabled={loading}>
            {loading ? 'Creating project…' : 'Create project →'}
          </button>
        </form>

      </div>
    </div>
  )
}
