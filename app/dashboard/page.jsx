'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { useApi } from '../../lib/useApi'
import Link from 'next/link'

const PRODUCT_COLORS = { build: '#FF5C35', creator: '#F59E0B', payroll: '#22C55E' }

export default function WorkspacePage() {
  const router = useRouter()
  const { isLoaded, isSignedIn } = useAuth()
  const api = useApi()
  const [orgs, setOrgs]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [creating, setCreating] = useState(false)
  const [showNew, setShowNew]   = useState(false)
  const [newName, setNewName]   = useState('')

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) { router.push('/login'); return }
    api.get('/orgs').then(setOrgs).catch(console.error).finally(() => setLoading(false))
  }, [isLoaded, isSignedIn])

  async function createOrg(e) {
    e.preventDefault(); if (!newName.trim()) return
    setCreating(true)
    try { const org = await api.post('/orgs', { name: newName }); router.push('/dashboard/' + org.id) }
    catch (e) { console.error(e) } finally { setCreating(false) }
  }

  if (loading) return <Loading />

  return (
    <div style={{ minHeight:'100vh', background:'#07090F', fontFamily:'Inter,sans-serif' }}>
      {/* Top bar */}
      <div style={{ borderBottom:'1px solid rgba(255,255,255,0.05)', padding:'0 32px', height:'52px', display:'flex', alignItems:'center', justifyContent:'space-between', background:'#0A0C14' }}>
        <Link href="/" style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'15px', letterSpacing:'.05em', color:'#EDF0F7', textDecoration:'none' }}>
          KONDU<span style={{ color:'#FF5C35' }}>Y</span>T
        </Link>
        <Link href="/docs" style={{ fontSize:'13px', color:'rgba(237,240,247,0.5)', textDecoration:'none' }}>View docs</Link>
      </div>

      <div style={{ maxWidth:'900px', margin:'0 auto', padding:'48px 32px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'32px' }}>
          <div>
            <h1 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'22px', color:'#EDF0F7', marginBottom:'4px' }}>Your workspaces</h1>
            <p style={{ fontSize:'13px', color:'rgba(237,240,247,0.45)' }}>Select a workspace to continue</p>
          </div>
          <button onClick={() => setShowNew(true)} style={{ fontSize:'13px', fontWeight:600, color:'#FF5C35', background:'rgba(255,92,53,0.1)', border:'1px solid rgba(255,92,53,0.25)', padding:'9px 16px', borderRadius:'100px', cursor:'pointer' }}>
            + New workspace
          </button>
        </div>

        {showNew && (
          <form onSubmit={createOrg} style={{ background:'#0D1120', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'12px', padding:'20px', marginBottom:'24px', display:'flex', gap:'10px', alignItems:'center' }}>
            <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Workspace name" autoFocus
              style={{ flex:1, padding:'10px 14px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'8px', color:'#EDF0F7', fontSize:'14px', outline:'none' }} />
            <button type="submit" disabled={creating} style={{ padding:'10px 20px', background:'#FF5C35', color:'#fff', border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:600, cursor:'pointer' }}>
              {creating ? 'Creating...' : 'Create'}
            </button>
            <button type="button" onClick={() => setShowNew(false)} style={{ padding:'10px 14px', background:'none', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'8px', color:'rgba(237,240,247,0.5)', fontSize:'13px', cursor:'pointer' }}>
              Cancel
            </button>
          </form>
        )}

        <div style={{ display:'grid', gap:'12px' }}>
          {orgs.map(org => (
            <Link key={org.id} href={'/dashboard/' + org.id} style={{ display:'block', background:'#0D1120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'12px', padding:'20px 24px', textDecoration:'none', transition:'border-color .15s' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'14px' }}>
                  <div style={{ width:'36px', height:'36px', borderRadius:'8px', background:'linear-gradient(135deg,#FF5C35,#FF8C60)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'14px', color:'#fff', flexShrink:0 }}>
                    {org.name[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize:'14px', fontWeight:600, color:'#EDF0F7', marginBottom:'2px' }}>{org.name}</div>
                    <div style={{ fontSize:'12px', color:'rgba(237,240,247,0.4)' }}>{org.plan === 'global' ? 'Global plan' : 'Local plan'}</div>
                  </div>
                </div>
                <div style={{ display:'flex', gap:'6px', alignItems:'center' }}>
                  {['build','creator','payroll'].map(p => (
                    <span key={p} style={{ fontSize:'10px', fontWeight:700, padding:'2px 8px', borderRadius:'100px', background: p === 'build' ? 'rgba(255,92,53,0.12)' : 'rgba(255,255,255,0.05)', color: p === 'build' ? '#FF5C35' : 'rgba(237,240,247,0.25)', letterSpacing:'.04em', textTransform:'uppercase' }}>
                      {p}
                    </span>
                  ))}
                  <span style={{ color:'rgba(237,240,247,0.3)', marginLeft:'8px' }}>→</span>
                </div>
              </div>
            </Link>
          ))}

          {orgs.length === 0 && !showNew && (
            <div style={{ padding:'60px', textAlign:'center', color:'rgba(237,240,247,0.4)', fontSize:'14px' }}>
              No workspaces yet.{' '}
              <button onClick={() => setShowNew(true)} style={{ color:'#FF5C35', background:'none', border:'none', cursor:'pointer', fontSize:'14px', fontWeight:600 }}>
                Create your first one.
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Loading() {
  return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#07090F', color:'rgba(237,240,247,0.4)', fontFamily:'Inter,sans-serif' }}>Loading...</div>
}
