'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth, UserButton } from '@clerk/nextjs'
import { useApi } from '../../../lib/useApi'
import Link from 'next/link'

const MODE_CONFIG = {
  build:   { label:'KONDUYTbuild',   color:'#FF5C35', icon:'⌗', desc:'Payment infrastructure for developers' },
  creator: { label:'KONDUYTcreator', color:'#F59E0B', icon:'◎', desc:'Business operating system for creators' },
  payroll: { label:'KONDUYTpayroll', color:'#0BA4DB', icon:'▶', desc:'Intelligent payments for your people' },
}

export default function OrgHome() {
  const { orgId } = useParams()
  const { isLoaded, isSignedIn } = useAuth()
  const api = useApi()
  const router = useRouter()
  const [org, setOrg]         = useState(null)
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [newForm, setNewForm] = useState({ name:'', mode:'build' })
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) { router.push('/login'); return }
    api.get('/orgs/' + orgId).then(setOrg).catch(console.error)
    api.get('/projects/' + orgId + '/projects').then(setProjects).catch(() => {}).finally(() => setLoading(false))
  }, [isLoaded, isSignedIn])

  async function createProject(e) {
    e.preventDefault(); setCreating(true)
    try {
      const p = await api.post('/projects/' + orgId + '/projects', newForm)
      router.push('/dashboard/' + orgId + '/' + p.id)
    } catch (e) { alert(e.message) } finally { setCreating(false) }
  }

  return (
    <div style={{ minHeight:'100vh', background:'#07090F', fontFamily:'Inter,sans-serif' }}>
      {/* Top bar */}
      <div style={{ borderBottom:'1px solid rgba(255,255,255,0.06)', padding:'14px 28px', display:'flex', alignItems:'center', justifyContent:'space-between', background:'#0A0D18' }}>
        <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'17px', letterSpacing:'.05em', color:'#EDF0F7' }}>
          KONDU<span style={{ color:'#FF5C35' }}>Y</span>T
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
          <Link href="/dashboard" style={{ fontSize:'13px', color:'rgba(237,240,247,0.5)', textDecoration:'none' }}>All workspaces</Link>
          <UserButton afterSignOutUrl="/" />
        </div>
      </div>

      <div style={{ maxWidth:'860px', margin:'0 auto', padding:'40px 28px' }}>

        {/* Org header */}
        <div style={{ marginBottom:'36px' }}>
          <div style={{ fontSize:'12px', color:'rgba(237,240,247,0.4)', marginBottom:'6px' }}>Workspace</div>
          <h1 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'26px', color:'#EDF0F7', marginBottom:'4px' }}>
            {org?.name || '…'}
          </h1>
          <div style={{ fontSize:'14px', color:'rgba(237,240,247,0.45)' }}>
            {projects.length} {projects.length === 1 ? 'project' : 'projects'}
          </div>
        </div>

        {/* Projects grid */}
        <div style={{ display:'grid', gap:'12px', marginBottom:'20px' }}>
          {loading ? (
            [0,1].map(i => <div key={i} style={{ height:'88px', background:'#0D1120', borderRadius:'12px', border:'1px solid rgba(255,255,255,0.06)', animation:'pulse 1.5s ease-in-out infinite' }} />)
          ) : projects.length === 0 ? (
            <div style={{ padding:'48px', textAlign:'center', background:'#0D1120', borderRadius:'14px', border:'1px solid rgba(255,255,255,0.06)', color:'rgba(237,240,247,0.35)', fontSize:'14px', lineHeight:1.65 }}>
              No projects yet. Create your first below.
            </div>
          ) : projects.map(p => {
            const mc = MODE_CONFIG[p.mode] || MODE_CONFIG.build
            return (
              <Link key={p.id} href={'/dashboard/' + orgId + '/' + p.id}
                style={{ display:'flex', alignItems:'center', gap:'16px', padding:'18px 20px', background:'#0D1120', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'14px', textDecoration:'none', transition:'border-color .15s' }}>
                <div style={{ width:'40px', height:'40px', borderRadius:'10px', background: mc.color + '18', border:'1px solid ' + mc.color + '30', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', color:mc.color, flexShrink:0 }}>
                  {mc.icon}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:'15px', fontWeight:600, color:'#EDF0F7', marginBottom:'2px' }}>{p.name}</div>
                  <div style={{ fontSize:'12px', color:mc.color, fontWeight:600 }}>{mc.label}</div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:'8px', flexShrink:0 }}>
                  <span style={{ fontSize:'10px', fontWeight:700, color: p.live_mode?'#22C55E':'rgba(237,240,247,0.3)', letterSpacing:'.04em' }}>
                    {p.live_mode ? '● LIVE' : '○ SANDBOX'}
                  </span>
                  <span style={{ color:'rgba(237,240,247,0.3)', fontSize:'14px' }}>→</span>
                </div>
              </Link>
            )
          })}
        </div>

        {/* New project */}
        {!showNew ? (
          <button onClick={() => setShowNew(true)} style={{ width:'100%', padding:'14px', background:'transparent', border:'1px dashed rgba(255,255,255,0.12)', borderRadius:'12px', color:'rgba(237,240,247,0.4)', fontSize:'13px', fontWeight:600, cursor:'pointer', transition:'border-color .15s' }}>
            + New project
          </button>
        ) : (
          <form onSubmit={createProject} style={{ background:'#0D1120', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'14px', padding:'20px', display:'grid', gap:'14px' }}>
            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'15px', color:'#EDF0F7' }}>New project</div>
            <div>
              <label style={{ fontSize:'11px', fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'rgba(237,240,247,0.4)', display:'block', marginBottom:'8px' }}>Project name</label>
              <input required value={newForm.name} onChange={e => setNewForm(f => ({...f, name:e.target.value}))} placeholder="e.g. My Payment Integration"
                style={{ width:'100%', padding:'11px 14px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', color:'#EDF0F7', fontSize:'14px', outline:'none', boxSizing:'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize:'11px', fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'rgba(237,240,247,0.4)', display:'block', marginBottom:'8px' }}>Product</label>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px' }}>
                {Object.entries(MODE_CONFIG).map(([mode, mc]) => (
                  <button key={mode} type="button" onClick={() => setNewForm(f => ({...f, mode}))}
                    style={{ padding:'12px 10px', borderRadius:'10px', border:'1px solid', borderColor:newForm.mode===mode?mc.color+'60':'rgba(255,255,255,0.08)', background:newForm.mode===mode?mc.color+'12':'transparent', cursor:'pointer', textAlign:'center' }}>
                    <div style={{ fontSize:'16px', color:mc.color, marginBottom:'4px' }}>{mc.icon}</div>
                    <div style={{ fontSize:'11px', fontWeight:600, color:newForm.mode===mode?mc.color:'rgba(237,240,247,0.5)' }}>{mc.label.replace('KONDUYT','')}</div>
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display:'flex', gap:'10px', justifyContent:'flex-end' }}>
              <button type="button" onClick={() => setShowNew(false)} style={{ padding:'9px 16px', background:'none', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'8px', color:'rgba(237,240,247,0.5)', fontSize:'13px', cursor:'pointer' }}>Cancel</button>
              <button type="submit" disabled={creating} style={{ padding:'9px 20px', background: MODE_CONFIG[newForm.mode]?.color || '#FF5C35', color:'#fff', border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:600, cursor:'pointer', opacity:creating?0.6:1 }}>
                {creating ? 'Creating…' : 'Create project'}
              </button>
            </div>
          </form>
        )}
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
    </div>
  )
}
