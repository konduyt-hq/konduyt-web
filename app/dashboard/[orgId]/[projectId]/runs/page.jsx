'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { useApi } from '../../../../../lib/useApi'
import ProjectLayout from '../../../../../components/layouts/ProjectLayout'
import EmptyState from '../../../../../components/ui/EmptyState'
import Link from 'next/link'

const STATUS_CONFIG = {
  draft:      { color:'#8892A4', label:'Draft',      actions:['submit'] },
  submitted:  { color:'#F59E0B', label:'Pending approval', actions:['approve'] },
  approved:   { color:'#0BA4DB', label:'Approved',   actions:['execute'] },
  executing:  { color:'#0BA4DB', label:'Executing…', actions:[] },
  completed:  { color:'#22C55E', label:'Completed',  actions:[] },
  partial:    { color:'#F59E0B', label:'Partial',    actions:[] },
  failed:     { color:'#EF4444', label:'Failed',     actions:[] },
}

export default function PayrollRunsPage() {
  const { orgId, projectId } = useParams()
  const { isLoaded, isSignedIn } = useAuth()
  const api = useApi()
  const router = useRouter()
  const [org, setOrg]       = useState(null)
  const [project, setProject] = useState(null)
  const [runs, setRuns]     = useState([])
  const [people, setPeople] = useState([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(null)
  const [showNew, setShowNew] = useState(false)
  const [newForm, setNewForm] = useState({ name:'', currency:'KES' })
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) { router.push('/login'); return }
    Promise.all([
      api.get('/projects/project/' + projectId),
      api.get('/orgs/' + orgId),
    ]).then(([p,o]) => { setProject(p); setOrg(o) }).catch(console.error)
    load()
  }, [isLoaded, isSignedIn])

  async function load() {
    setLoading(true)
    try {
      const [r, pe] = await Promise.allSettled([
        api.get('/people/' + projectId + '/payroll-runs'),
        api.get('/people/' + projectId + '/list'),
      ])
      if (r.status === 'fulfilled')  setRuns(r.value.runs || r.value || [])
      if (pe.status === 'fulfilled') setPeople(pe.value.people || pe.value || [])
    } finally { setLoading(false) }
  }

  async function act(runId, action) {
    setActing(runId + action)
    try {
      await api.post('/people/' + projectId + '/payroll-runs/' + runId + '/' + action, {})
      await load()
    } catch (e) { alert(e.message) } finally { setActing(null) }
  }

  async function createRun(e) {
    e.preventDefault(); setCreating(true)
    try {
      await api.post('/people/' + projectId + '/payroll-runs', newForm)
      setShowNew(false); setNewForm({ name:'', currency:'KES' }); await load()
    } catch (e) { alert(e.message) } finally { setCreating(false) }
  }

  const base = '/dashboard/' + orgId + '/' + projectId
  const pending = runs.filter(r => r.status === 'submitted').length

  return (
    <ProjectLayout org={org} project={project}>
      <div style={{ maxWidth:'820px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'24px', gap:'12px', flexWrap:'wrap' }}>
          <div>
            <h1 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'22px', color:'#EDF0F7', marginBottom:'4px' }}>Payroll Runs</h1>
            <p style={{ fontSize:'13px', color:'rgba(237,240,247,0.45)' }}>Prepare, approve, and execute payments to your people.</p>
          </div>
          <button onClick={() => setShowNew(true)} style={{ fontSize:'13px', fontWeight:600, color:'#fff', background:'#0BA4DB', border:'none', padding:'10px 20px', borderRadius:'100px', cursor:'pointer' }}>
            + New run
          </button>
        </div>

        {/* Architecture callout */}
        <div style={{ background:'rgba(11,164,219,0.06)', border:'1px solid rgba(11,164,219,0.12)', borderRadius:'10px', padding:'12px 16px', marginBottom:'20px', fontSize:'13px', color:'rgba(237,240,247,0.55)', lineHeight:1.6 }}>
          <strong style={{ color:'#0BA4DB' }}>Principle:</strong> Code prepares. Humans approve. Payroll never executes without explicit approval. KONDUYT recommends the best payment route for each person — finance makes the final call.
        </div>

        {pending > 0 && (
          <div style={{ background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.25)', borderRadius:'10px', padding:'12px 16px', marginBottom:'16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span style={{ fontSize:'13px', color:'#F59E0B', fontWeight:600 }}>{pending} run{pending>1?'s':''} pending approval</span>
          </div>
        )}

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px', marginBottom:'20px' }}>
          {[
            { label:'People on payroll',  value: people.length,                                          color:'#EDF0F7' },
            { label:'Pending approval',   value: pending,                                                color: pending>0?'#F59E0B':'rgba(237,240,247,0.4)' },
            { label:'Completed runs',     value: runs.filter(r=>r.status==='completed').length,          color:'#22C55E' },
          ].map(s => (
            <div key={s.label} style={{ background:'#0D1120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'10px', padding:'14px 16px' }}>
              <div style={{ fontSize:'10px', fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'rgba(237,240,247,0.3)', marginBottom:'8px' }}>{s.label}</div>
              <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'22px', color:s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* New run form */}
        {showNew && (
          <form onSubmit={createRun} style={{ background:'#0D1120', border:'1px solid rgba(11,164,219,0.2)', borderRadius:'12px', padding:'20px', marginBottom:'16px', display:'grid', gap:'12px' }}>
            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'14px', color:'#EDF0F7' }}>New payroll run</div>
            <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:'10px' }}>
              <input required value={newForm.name} onChange={e=>setNewForm(f=>({...f,name:e.target.value}))} placeholder="e.g. July 2026 Payroll"
                style={{ padding:'10px 12px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'8px', color:'#EDF0F7', fontSize:'13px', outline:'none' }} />
              <select value={newForm.currency} onChange={e=>setNewForm(f=>({...f,currency:e.target.value}))}
                style={{ padding:'10px 12px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'8px', color:'#EDF0F7', fontSize:'13px', outline:'none' }}>
                {['KES','USD','NGN','GHS','ZAR','EUR','GBP'].map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ display:'flex', gap:'10px', justifyContent:'flex-end' }}>
              <button type="button" onClick={()=>setShowNew(false)} style={{ padding:'9px 14px', background:'none', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'8px', color:'rgba(237,240,247,0.5)', fontSize:'13px', cursor:'pointer' }}>Cancel</button>
              <button type="submit" disabled={creating} style={{ padding:'9px 18px', background:'#0BA4DB', color:'#fff', border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:600, cursor:'pointer', opacity:creating?0.6:1 }}>
                {creating?'Creating…':'Create run'}
              </button>
            </div>
          </form>
        )}

        {/* Runs list */}
        {loading ? (
          <div style={{ padding:'40px', textAlign:'center', color:'rgba(237,240,247,0.4)', fontSize:'13px' }}>Loading…</div>
        ) : runs.length === 0 ? (
          <EmptyState icon="▶" title="No payroll runs" desc="Add your people first, then create a payroll run. KONDUYT recommends the best payment route for each person." actions={[{label:'Add people', href: base+'/people'}]} />
        ) : (
          <div style={{ background:'#0D1120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'12px', overflow:'hidden' }}>
            {runs.map((run, i) => {
              const cfg = STATUS_CONFIG[run.status] || STATUS_CONFIG.draft
              return (
                <div key={run.id} style={{ padding:'14px 16px', borderBottom:i<runs.length-1?'1px solid rgba(255,255,255,0.03)':'none' }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'12px' }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:'14px', fontWeight:600, color:'#EDF0F7', marginBottom:'3px' }}>{run.name}</div>
                      <div style={{ fontSize:'11px', color:'rgba(237,240,247,0.4)' }}>
                        {run.currency} · {run.created_at ? new Date(run.created_at).toLocaleDateString() : ''}
                        {run.success_count != null && ` · ${run.success_count} paid`}
                        {run.failure_count > 0 && ` · ${run.failure_count} failed`}
                      </div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px', flexShrink:0 }}>
                      {cfg.actions.includes('submit') && (
                        <button onClick={()=>act(run.id,'submit')} disabled={acting===run.id+'submit'}
                          style={{ fontSize:'12px', fontWeight:600, color:'#F59E0B', background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.2)', padding:'6px 12px', borderRadius:'100px', cursor:'pointer' }}>
                          Submit for approval
                        </button>
                      )}
                      {cfg.actions.includes('approve') && (
                        <button onClick={()=>act(run.id,'approve')} disabled={acting===run.id+'approve'}
                          style={{ fontSize:'12px', fontWeight:600, color:'#0BA4DB', background:'rgba(11,164,219,0.1)', border:'1px solid rgba(11,164,219,0.2)', padding:'6px 12px', borderRadius:'100px', cursor:'pointer' }}>
                          Approve
                        </button>
                      )}
                      {cfg.actions.includes('execute') && (
                        <button onClick={()=>{ if(confirm('Execute this payroll run? This will initiate real payments to all people.')) act(run.id,'execute') }} disabled={acting===run.id+'execute'}
                          style={{ fontSize:'12px', fontWeight:700, color:'#fff', background:'#0BA4DB', border:'none', padding:'6px 14px', borderRadius:'100px', cursor:'pointer' }}>
                          Execute
                        </button>
                      )}
                      <span style={{ fontSize:'11px', fontWeight:700, padding:'2px 8px', borderRadius:'100px', color:cfg.color, background:cfg.color+'18' }}>{cfg.label}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </ProjectLayout>
  )
}
