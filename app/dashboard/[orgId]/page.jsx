'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'
import { get, post } from '../../../lib/api'

export default function OrgPage() {
  const router  = useRouter()
  const params  = useParams()
  const orgId   = params.orgId
  const [projects, setProjects] = useState([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState({ name: '', website: '' })
  const [creating, setCreating] = useState(false)
  const [error, setError]       = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.push('/login'); return }
      loadProjects()
    })
  }, [orgId])

  async function loadProjects() {
    try {
      const data = await get(`/projects/${orgId}/projects`)
      if (data.length === 1) { router.push(`/dashboard/${orgId}/${data[0].id}`); return }
      setProjects(data)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  async function createProject(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    setCreating(true)
    try {
      const p = await post(`/projects/${orgId}/projects`, form)
      router.push(`/dashboard/${orgId}/${p.id}`)
    } catch (e) { setError(e.message); setCreating(false) }
  }

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',color:'var(--text-muted)'}}>Loading…</div>

  return (
    <div style={{minHeight:'100vh',background:'var(--bg)',padding:'48px 24px'}}>
      <div style={{maxWidth:'560px',margin:'0 auto'}}>
        <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'48px'}}>
          <Link href="/dashboard" style={{color:'var(--text-muted)',fontSize:'13px',textDecoration:'none'}}>← Projects</Link>
        </div>

        <h1 style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:'24px',marginBottom:'24px'}}>Select a project</h1>
        {error && <p style={{color:'var(--red)',fontSize:'13px',marginBottom:'16px'}}>{error}</p>}

        <div style={{display:'grid',gap:'10px',marginBottom:'16px'}}>
          {projects.map(p => (
            <Link key={p.id} href={`/dashboard/${orgId}/${p.id}`} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 20px',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius)',textDecoration:'none'}}>
              <div>
                <div style={{fontSize:'15px',fontWeight:600,color:'var(--text)'}}>{p.name}</div>
                <div style={{fontSize:'12px',color:'var(--text-muted)',marginTop:'2px'}}>{p.live_mode ? '● Live' : '○ Sandbox'} · {p.jurisdiction}</div>
              </div>
              <span style={{color:'var(--text-muted)'}}>→</span>
            </Link>
          ))}
        </div>

        {!showForm ? (
          <button onClick={() => setShowForm(true)} style={{fontSize:'13px',fontWeight:600,color:'var(--accent)',background:'var(--accent-bg)',border:'1px solid var(--accent-border)',padding:'10px 18px',borderRadius:'var(--radius-sm)',cursor:'pointer'}}>+ New project</button>
        ) : (
          <form onSubmit={createProject} style={{display:'grid',gap:'10px',marginTop:'8px'}}>
            <input type="text" placeholder="Project name" value={form.name} autoFocus onChange={e => setForm(f => ({...f, name: e.target.value}))}
              style={{padding:'10px 14px',background:'rgba(255,255,255,.04)',border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',color:'var(--text)',fontSize:'14px',outline:'none'}} />
            <input type="url" placeholder="Website URL (optional)" value={form.website} onChange={e => setForm(f => ({...f, website: e.target.value}))}
              style={{padding:'10px 14px',background:'rgba(255,255,255,.04)',border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',color:'var(--text)',fontSize:'14px',outline:'none'}} />
            <div style={{display:'flex',gap:'10px'}}>
              <button type="submit" disabled={creating} style={{padding:'10px 20px',background:'var(--accent)',color:'#fff',border:'none',borderRadius:'var(--radius-sm)',fontSize:'14px',fontWeight:600,cursor:'pointer'}}>
                {creating ? 'Creating…' : 'Create project'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} style={{padding:'10px 16px',background:'none',border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',color:'var(--text-muted)',fontSize:'14px',cursor:'pointer'}}>Cancel</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
