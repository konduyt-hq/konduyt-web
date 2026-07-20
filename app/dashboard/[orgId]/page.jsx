'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { useApi } from '../../../lib/useApi'
import Link from 'next/link'

const PRODUCTS = [
  { id:'build',   name:'KONDUYTbuild',   accent:'#FF5C35', icon:'{}', desc:'For developers shipping payments.', available: true,  cta:'Enter' },
  { id:'creator', name:'KONDUYTcreator', accent:'#F59E0B', icon:'◑',  desc:'For creators earning globally.',  available: false, cta:'Coming September 2026' },
  { id:'payroll', name:'KONDUYTpayroll', accent:'#22C55E', icon:'$',  desc:'For businesses paying people.',   available: false, cta:'Coming September 2026' },
]

export default function OrgProductSelector() {
  const router = useRouter()
  const { orgId } = useParams()
  const { isLoaded, isSignedIn } = useAuth()
  const api = useApi()
  const [org, setOrg]           = useState(null)
  const [projects, setProjects] = useState([])
  const [loading, setLoading]   = useState(true)
  const [showNew, setShowNew]   = useState(false)
  const [form, setForm]         = useState({ name: '', website: '' })
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) { router.push('/login'); return }
    Promise.all([
      api.get('/orgs/' + orgId),
      api.get('/projects/' + orgId + '/projects'),
    ]).then(([o, p]) => { setOrg(o); setProjects(p) })
     .catch(console.error)
     .finally(() => setLoading(false))
  }, [isLoaded, isSignedIn, orgId])

  async function createProject(e) {
    e.preventDefault(); setCreating(true)
    try {
      const p = await api.post('/projects/' + orgId + '/projects', form)
      router.push('/dashboard/' + orgId + '/' + p.id)
    } catch (e) { console.error(e) } finally { setCreating(false) }
  }

  if (loading) return <Loading />

  return (
    <div style={{ minHeight:'100vh', background:'#07090F', fontFamily:'Inter,sans-serif' }}>
      {/* Top bar */}
      <div style={{ borderBottom:'1px solid rgba(255,255,255,0.05)', padding:'0 32px', height:'52px', display:'flex', alignItems:'center', gap:'10px', background:'#0A0C14' }}>
        <Link href="/dashboard" style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'15px', letterSpacing:'.05em', color:'#EDF0F7', textDecoration:'none' }}>KONDU<span style={{ color:'#FF5C35' }}>Y</span>T</Link>
        <span style={{ color:'rgba(255,255,255,0.2)' }}>/</span>
        <span style={{ fontSize:'13px', color:'rgba(237,240,247,0.7)', fontWeight:500 }}>{org?.name}</span>
      </div>

      <div style={{ maxWidth:'920px', margin:'0 auto', padding:'48px 32px' }}>
        <div style={{ marginBottom:'40px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'6px' }}>
            <div style={{ width:'40px', height:'40px', borderRadius:'10px', background:'linear-gradient(135deg,#FF5C35,#FF8C60)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'16px', color:'#fff' }}>
              {org?.name?.[0]?.toUpperCase()}
            </div>
            <h1 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'22px', color:'#EDF0F7' }}>{org?.name}</h1>
          </div>
          <p style={{ fontSize:'13px', color:'rgba(237,240,247,0.4)', marginLeft:'52px' }}>Select a product to continue</p>
        </div>

        {/* Product cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'14px', marginBottom:'40px' }}>
          {PRODUCTS.map(p => (
            <div key={p.id} style={{ background:'#0D1120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'14px', padding:'22px', opacity: p.available ? 1 : 0.65 }}>
              <div style={{ width:'32px', height:'32px', borderRadius:'8px', background: p.accent + '18', border:'1px solid ' + p.accent + '30', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', color: p.accent, marginBottom:'14px', fontWeight:700 }}>{p.icon}</div>
              <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'14px', color:'#EDF0F7', marginBottom:'6px' }}>{p.name}</div>
              <div style={{ fontSize:'12px', color:'rgba(237,240,247,0.45)', marginBottom:'18px', lineHeight:1.55 }}>{p.desc}</div>
              {p.available ? (
                <div style={{ fontSize:'12px', fontWeight:600, color: p.accent }}>{projects.length} project{projects.length !== 1 ? 's' : ''}</div>
              ) : (
                <div style={{ fontSize:'10px', fontWeight:700, color:'#F59E0B', background:'rgba(245,158,11,0.1)', padding:'3px 8px', borderRadius:'100px', display:'inline-block', letterSpacing:'.04em' }}>{p.cta}</div>
              )}
            </div>
          ))}
        </div>

        {/* Build projects */}
        <div style={{ background:'#0D1120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'14px', overflow:'hidden' }}>
          <div style={{ padding:'16px 20px', borderBottom:'1px solid rgba(255,255,255,0.05)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ fontSize:'13px', fontWeight:600, color:'#EDF0F7' }}>Build projects</div>
            <button onClick={() => setShowNew(true)} style={{ fontSize:'12px', fontWeight:600, color:'#FF5C35', background:'rgba(255,92,53,0.1)', border:'1px solid rgba(255,92,53,0.2)', padding:'6px 12px', borderRadius:'100px', cursor:'pointer' }}>+ New project</button>
          </div>

          {showNew && (
            <form onSubmit={createProject} style={{ padding:'16px 20px', borderBottom:'1px solid rgba(255,255,255,0.05)', display:'flex', gap:'10px' }}>
              <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Project name" autoFocus
                style={{ flex:1, padding:'9px 12px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'7px', color:'#EDF0F7', fontSize:'13px', outline:'none' }} />
              <button type="submit" disabled={creating} style={{ padding:'9px 16px', background:'#FF5C35', color:'#fff', border:'none', borderRadius:'7px', fontSize:'13px', fontWeight:600, cursor:'pointer' }}>{creating ? '...' : 'Create'}</button>
              <button type="button" onClick={()=>setShowNew(false)} style={{ padding:'9px 12px', background:'none', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'7px', color:'rgba(237,240,247,0.5)', fontSize:'13px', cursor:'pointer' }}>Cancel</button>
            </form>
          )}

          {projects.map(p => (
            <Link key={p.id} href={'/dashboard/' + orgId + '/' + p.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px', borderBottom:'1px solid rgba(255,255,255,0.03)', textDecoration:'none', transition:'background .12s' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                <div style={{ width:'28px', height:'28px', borderRadius:'6px', background:'rgba(255,92,53,0.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:700, color:'#FF5C35' }}>{p.name[0]}</div>
                <div>
                  <div style={{ fontSize:'13px', fontWeight:600, color:'#EDF0F7' }}>{p.name}</div>
                  <div style={{ fontSize:'11px', color:'rgba(237,240,247,0.35)' }}>{p.live_mode ? '● Live' : '○ Sandbox'}</div>
                </div>
              </div>
              <span style={{ color:'rgba(237,240,247,0.3)', fontSize:'14px' }}>→</span>
            </Link>
          ))}

          {projects.length === 0 && !showNew && (
            <div style={{ padding:'40px', textAlign:'center', color:'rgba(237,240,247,0.35)', fontSize:'13px' }}>
              No projects yet.{' '}
              <button onClick={() => setShowNew(true)} style={{ color:'#FF5C35', background:'none', border:'none', cursor:'pointer', fontSize:'13px', fontWeight:600 }}>Create your first.</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Loading() {
  return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#07090F', color:'rgba(237,240,247,0.4)' }}>Loading...</div>
}
