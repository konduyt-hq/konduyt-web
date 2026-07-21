'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { useApi } from '../../../../../lib/useApi'
import ProjectLayout from '../../../../../components/layouts/ProjectLayout'

export default function PayrollRunsPage() {
  const { orgId, projectId } = useParams()
  const { isLoaded, isSignedIn } = useAuth()
  const api = useApi()
  const router = useRouter()
  const [org, setOrg]         = useState(null)
  const [project, setProject] = useState(null)
  const [people, setPeople]   = useState([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState([])

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) { router.push('/login'); return }
    Promise.all([
      api.get('/projects/project/' + projectId),
      api.get('/orgs/' + orgId),
      api.get('/people/' + projectId + '/people'),
    ]).then(([p,o,pe]) => { setProject(p); setOrg(o); setPeople(pe) })
     .catch(console.error).finally(()=>setLoading(false))
  }, [isLoaded, isSignedIn])

  async function runPayroll() {
    if (!confirm('Run payroll for all ' + people.length + ' people now?')) return
    setRunning(true); setResults([])
    const out = []
    for (const person of people) {
      try {
        const r = await api.post('/people/' + projectId + '/people/' + person.id + '/pay', {})
        out.push({ name: person.name, status: r.status, amount: person.amount, currency: person.currency })
      } catch (e) {
        out.push({ name: person.name, status: 'error', error: e.message, amount: person.amount, currency: person.currency })
      }
    }
    setResults(out); setRunning(false)
  }

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:'#07090F',color:'rgba(237,240,247,0.4)'}}>Loading...</div>

  return (
    <ProjectLayout org={org} project={project}>
      <div style={{maxWidth:'720px'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'24px',gap:'12px'}}>
          <div>
            <h1 style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:'22px',color:'#EDF0F7',marginBottom:'4px'}}>Payroll Runs</h1>
            <p style={{fontSize:'13px',color:'rgba(237,240,247,0.45)'}}>{people.length} people on payroll.</p>
          </div>
          <button onClick={runPayroll} disabled={running||people.length===0}
            style={{fontSize:'13px',fontWeight:600,color:'#fff',background:'#22C55E',border:'none',padding:'10px 20px',borderRadius:'100px',cursor:'pointer',opacity:(running||people.length===0)?0.5:1}}>
            {running?'Running...':'Run payroll now'}
          </button>
        </div>

        {people.length === 0 ? (
          <div style={{background:'#0D1120',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'12px',padding:'40px',textAlign:'center',color:'rgba(237,240,247,0.35)',fontSize:'13px'}}>
            No people on payroll yet. Add people in the People tab first.
          </div>
        ) : (
          <div style={{background:'#0D1120',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'12px',overflow:'hidden',marginBottom:'20px'}}>
            <div style={{padding:'12px 18px',borderBottom:'1px solid rgba(255,255,255,0.05)',fontSize:'12px',fontWeight:700,letterSpacing:'.08em',textTransform:'uppercase',color:'rgba(237,240,247,0.35)'}}>People ({people.length})</div>
            {people.map(p=>(
              <div key={p.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 18px',borderBottom:'1px solid rgba(255,255,255,0.03)'}}>
                <div>
                  <div style={{fontSize:'13px',fontWeight:600,color:'#EDF0F7'}}>{p.name}</div>
                  <div style={{fontSize:'11px',color:'rgba(237,240,247,0.4)',marginTop:'1px',textTransform:'capitalize'}}>{p.role} · via {p.vendor||'auto'}</div>
                </div>
                <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:'14px',color:'#EDF0F7'}}>{p.currency} {p.amount?.toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}

        {results.length > 0 && (
          <div style={{background:'#0D1120',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'12px',overflow:'hidden'}}>
            <div style={{padding:'12px 18px',borderBottom:'1px solid rgba(255,255,255,0.05)',fontSize:'12px',fontWeight:700,letterSpacing:'.08em',textTransform:'uppercase',color:'rgba(237,240,247,0.35)'}}>Results</div>
            {results.map((r,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 18px',borderBottom:'1px solid rgba(255,255,255,0.03)'}}>
                <div style={{fontSize:'13px',fontWeight:500,color:'#EDF0F7'}}>{r.name}</div>
                <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                  <span style={{fontSize:'13px',color:'rgba(237,240,247,0.55)'}}>{r.currency} {r.amount?.toLocaleString()}</span>
                  <span style={{fontSize:'11px',fontWeight:700,padding:'2px 8px',borderRadius:'100px',color:r.status==='success'?'#22C55E':'#EF4444',background:r.status==='success'?'rgba(34,197,94,0.1)':'rgba(239,68,68,0.1)'}}>
                    {r.status}
                  </span>
                </div>
              </div>
            ))}
            <div style={{padding:'12px 18px',fontSize:'13px',color:'rgba(237,240,247,0.55)'}}>
              {results.filter(r=>r.status==='success').length} of {results.length} succeeded.
              Total: {results.filter(r=>r.status==='success').reduce((a,r)=>a+r.amount,0).toLocaleString()}
            </div>
          </div>
        )}
      </div>
    </ProjectLayout>
  )
}
