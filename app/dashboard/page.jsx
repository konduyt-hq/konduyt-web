'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { get, post } from '../../lib/api'

export default function DashboardPage() {
  const router = useRouter()
  const [orgs, setOrgs]       = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.push('/login'); return }
      loadOrgs()
    })
  }, [])

  async function loadOrgs() {
    try {
      const data = await get('/orgs')
      if (data.length === 1) { router.push(`/dashboard/${data[0].id}`); return }
      setOrgs(data)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  async function createOrg(e) {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    try {
      const org = await post('/orgs', { name: newName })
      router.push(`/dashboard/${org.id}`)
    } catch (e) { setError(e.message); setCreating(false) }
  }

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',color:'var(--text-muted)'}}>Loading…</div>

  return (
    <div style={{minHeight:'100vh',background:'var(--bg)',padding:'48px 24px'}}>
      <div style={{maxWidth:'560px',margin:'0 auto'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'48px'}}>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:'18px',letterSpacing:'.05em'}}>KONDU<span style={{color:'var(--accent)'}}>Y</span>T</div>
          <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))} style={{fontSize:'13px',color:'var(--text-muted)',background:'none',border:'none',cursor:'pointer'}}>Sign out</button>
        </div>

        <h1 style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:'24px',marginBottom:'24px'}}>Your projects</h1>
        {error && <p style={{color:'var(--red)',fontSize:'13px',marginBottom:'16px'}}>{error}</p>}

        <div style={{display:'grid',gap:'10px',marginBottom:'16px'}}>
          {orgs.map(org => (
            <Link key={org.id} href={`/dashboard/${org.id}`} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 20px',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius)',textDecoration:'none',transition:'border-color .15s'}}>
              <div>
                <div style={{fontSize:'15px',fontWeight:600,color:'var(--text)'}}>{org.name}</div>
                <div style={{fontSize:'12px',color:'var(--text-muted)',marginTop:'2px'}}>{org.plan} · {org.website || 'No website set'}</div>
              </div>
              <span style={{color:'var(--text-muted)'}}>→</span>
            </Link>
          ))}
        </div>

        {!showForm ? (
          <button onClick={() => setShowForm(true)} style={{fontSize:'13px',fontWeight:600,color:'var(--accent)',background:'var(--accent-bg)',border:'1px solid var(--accent-border)',padding:'10px 18px',borderRadius:'var(--radius-sm)',cursor:'pointer'}}>+ New project</button>
        ) : (
          <form onSubmit={createOrg} style={{display:'flex',gap:'10px',flexWrap:'wrap',marginTop:'8px'}}>
            <input type="text" placeholder="Project name" value={newName} autoFocus onChange={e => setNewName(e.target.value)}
              style={{flex:1,minWidth:'200px',padding:'10px 14px',background:'rgba(255,255,255,.04)',border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',color:'var(--text)',fontSize:'14px',outline:'none'}} />
            <button type="submit" disabled={creating} style={{padding:'10px 20px',background:'var(--accent)',color:'#fff',border:'none',borderRadius:'var(--radius-sm)',fontSize:'14px',fontWeight:600,cursor:'pointer'}}>
              {creating ? 'Creating…' : 'Create'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} style={{padding:'10px 16px',background:'none',border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',color:'var(--text-muted)',fontSize:'14px',cursor:'pointer'}}>Cancel</button>
          </form>
        )}
      </div>
    </div>
  )
}
