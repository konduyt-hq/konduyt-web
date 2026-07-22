'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { useApi } from '../../../../../lib/useApi'
import ProjectLayout from '../../../../../components/layouts/ProjectLayout'

const STATUS_COLORS = {
  completed: '#22C55E', running: '#F59E0B', failed: '#EF4444'
}

export default function ReconciliationPage() {
  const { orgId, projectId } = useParams()
  const { isLoaded, isSignedIn } = useAuth()
  const api = useApi()
  const router = useRouter()
  const [org, setOrg]           = useState(null)
  const [project, setProject]   = useState(null)
  const [runs, setRuns]         = useState([])
  const [mismatches, setMismatches] = useState([])
  const [loading, setLoading]   = useState(true)
  const [running, setRunning]   = useState(false)
  const [selectedRun, setSelectedRun] = useState(null)

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) { router.push('/login'); return }
    Promise.all([
      api.get('/projects/project/' + projectId),
      api.get('/orgs/' + orgId),
    ]).then(([p,o]) => { setProject(p); setOrg(o) }).catch(console.error)
    loadData()
  }, [isLoaded, isSignedIn])

  async function loadData() {
    setLoading(true)
    try {
      const [r, m] = await Promise.all([
        api.get('/reconciliation/' + projectId + '/runs'),
        api.get('/reconciliation/' + projectId + '/mismatches?resolved=false'),
      ])
      setRuns(r.runs || [])
      setMismatches(m.mismatches || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function triggerRun() {
    setRunning(true)
    try {
      await api.post('/reconciliation/' + projectId + '/run', {})
      setTimeout(loadData, 3000)
    } catch (e) { alert(e.message) }
    finally { setRunning(false) }
  }

  async function resolveM(id) {
    try {
      await api.post('/reconciliation/' + projectId + '/mismatches/' + id + '/resolve', {})
      setMismatches(prev => prev.filter(m => m.id !== id))
    } catch (e) { alert(e.message) }
  }

  const latestRun = runs[0]

  return (
    <ProjectLayout org={org} project={project}>
      <div style={{maxWidth:'820px'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'28px',gap:'12px',flexWrap:'wrap'}}>
          <div>
            <h1 style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:'22px',color:'#EDF0F7',marginBottom:'6px'}}>Reconciliation</h1>
            <p style={{fontSize:'13px',color:'rgba(237,240,247,0.45)'}}>Verify Konduyt's records match your payment providers.</p>
          </div>
          <button onClick={triggerRun} disabled={running} style={{fontSize:'13px',fontWeight:600,color:'#fff',background:'#FF5C35',border:'none',padding:'10px 20px',borderRadius:'100px',cursor:'pointer',opacity:running?0.6:1}}>
            {running ? 'Running...' : 'Run now'}
          </button>
        </div>

        {/* Latest run summary */}
        {latestRun && (
          <div style={{background:'#0D1120',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'12px',padding:'20px',marginBottom:'20px'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'14px'}}>
              <div style={{fontSize:'13px',fontWeight:700,color:'#EDF0F7'}}>Last run</div>
              <span style={{fontSize:'11px',fontWeight:700,padding:'2px 8px',borderRadius:'100px',color:STATUS_COLORS[latestRun.status]||'#8892A4',background:(STATUS_COLORS[latestRun.status]||'#8892A4')+'18',textTransform:'capitalize'}}>{latestRun.status}</span>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'12px'}}>
              {[
                {label:'Checked',    value:latestRun.transactions_checked,                    color:'#EDF0F7'},
                {label:'Matched',    value:latestRun.matches,                                 color:'#22C55E'},
                {label:'Mismatches', value:latestRun.mismatches,                              color:latestRun.mismatches>0?'#EF4444':'#22C55E'},
                {label:'Errors',     value:latestRun.errors,                                  color:latestRun.errors>0?'#F59E0B':'#EDF0F7'},
              ].map(s=>(
                <div key={s.label} style={{background:'rgba(255,255,255,0.03)',borderRadius:'8px',padding:'12px'}}>
                  <div style={{fontSize:'10px',fontWeight:700,letterSpacing:'.08em',textTransform:'uppercase',color:'rgba(237,240,247,0.3)',marginBottom:'6px'}}>{s.label}</div>
                  <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:'20px',color:s.color}}>{s.value}</div>
                </div>
              ))}
            </div>
            <div style={{fontSize:'12px',color:'rgba(237,240,247,0.4)',marginTop:'12px'}}>
              {latestRun.started_at ? new Date(latestRun.started_at).toLocaleString() : ''} · Triggered {latestRun.triggered_by}
            </div>
          </div>
        )}

        {/* Mismatches */}
        {mismatches.length > 0 && (
          <div style={{marginBottom:'20px'}}>
            <div style={{fontSize:'11px',fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',color:'rgba(239,68,68,0.7)',marginBottom:'10px'}}>
              {mismatches.length} unresolved mismatch{mismatches.length!==1?'es':''}
            </div>
            <div style={{display:'grid',gap:'8px'}}>
              {mismatches.map(m=>(
                <div key={m.id} style={{background:'rgba(239,68,68,0.05)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:'10px',padding:'14px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:'12px'}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:'12px',fontWeight:700,color:'#EF4444',marginBottom:'4px',textTransform:'capitalize'}}>{m.mismatch_type?.replace('_',' ')}</div>
                    <div style={{fontSize:'12px',color:'rgba(237,240,247,0.7)',lineHeight:1.55}}>{m.description}</div>
                    <div style={{fontSize:'11px',color:'rgba(237,240,247,0.35)',marginTop:'4px',fontFamily:'monospace'}}>txn: {m.transaction_id?.slice(0,16)}...</div>
                    {m.our_status && m.provider_status && (
                      <div style={{fontSize:'11px',color:'rgba(237,240,247,0.5)',marginTop:'4px'}}>
                        Konduyt: <span style={{color:'#EDF0F7',fontWeight:600}}>{m.our_status}</span> · Provider: <span style={{color:'#EDF0F7',fontWeight:600}}>{m.provider_status}</span>
                      </div>
                    )}
                  </div>
                  <button onClick={()=>resolveM(m.id)} style={{fontSize:'12px',fontWeight:600,color:'rgba(237,240,247,0.6)',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',padding:'6px 12px',borderRadius:'6px',cursor:'pointer',flexShrink:0}}>
                    Mark resolved
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Run history */}
        <div>
          <div style={{fontSize:'11px',fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',color:'rgba(237,240,247,0.3)',marginBottom:'10px'}}>Run history</div>
          <div style={{background:'#0D1120',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'12px',overflow:'hidden'}}>
            {loading ? (
              <div style={{padding:'32px',textAlign:'center',color:'rgba(237,240,247,0.35)',fontSize:'13px'}}>Loading...</div>
            ) : runs.length === 0 ? (
              <div style={{padding:'40px',textAlign:'center',color:'rgba(237,240,247,0.35)',fontSize:'13px'}}>
                No reconciliation runs yet. Click "Run now" to start.
              </div>
            ) : runs.map((run,i)=>(
              <div key={run.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',borderBottom:i<runs.length-1?'1px solid rgba(255,255,255,0.03)':'none'}}>
                <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                  <span style={{fontSize:'8px',color:STATUS_COLORS[run.status]||'#8892A4'}}>●</span>
                  <div>
                    <div style={{fontSize:'13px',fontWeight:500,color:'#EDF0F7'}}>{run.transactions_checked} checked · {run.matches} matched</div>
                    <div style={{fontSize:'11px',color:'rgba(237,240,247,0.35)'}}>{run.started_at?new Date(run.started_at).toLocaleString():''} · {run.triggered_by}</div>
                  </div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                  {run.mismatches > 0 && <span style={{fontSize:'12px',fontWeight:700,color:'#EF4444'}}>{run.mismatches} mismatch{run.mismatches!==1?'es':''}</span>}
                  <span style={{fontSize:'11px',fontWeight:700,padding:'2px 8px',borderRadius:'100px',color:STATUS_COLORS[run.status]||'#8892A4',background:(STATUS_COLORS[run.status]||'#8892A4')+'18',textTransform:'capitalize'}}>{run.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{marginTop:'16px',padding:'12px 14px',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.05)',borderRadius:'8px',fontSize:'12px',color:'rgba(237,240,247,0.4)',lineHeight:1.65}}>
          Reconciliation runs as a background process. The payment request lifecycle is unaffected. The ledger is never modified — mismatches create new ledger events.
        </div>
      </div>
    </ProjectLayout>
  )
}
