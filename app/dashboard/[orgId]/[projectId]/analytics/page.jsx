'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { useApi } from '../../../../../lib/useApi'
import BuildLayout from '../../../../../components/layouts/ProjectLayout'

export default function AnalyticsPage() {
  const { orgId, projectId } = useParams()
  const { isLoaded, isSignedIn } = useAuth()
  const api = useApi()
  const router = useRouter()
  const [org, setOrg]         = useState(null)
  const [project, setProject] = useState(null)
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) { router.push('/login'); return }
    Promise.all([
      api.get('/projects/project/' + projectId),
      api.get('/orgs/' + orgId),
      api.get('/transactions/' + projectId + '/summary'),
    ]).then(([p,o,s]) => { setProject(p); setOrg(o); setSummary(s) })
     .catch(console.error).finally(()=>setLoading(false))
  }, [isLoaded, isSignedIn])

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:'#07090F',color:'rgba(237,240,247,0.4)'}}>Loading...</div>

  const vendors = summary?.vendors || []
  const totalTxns = vendors.reduce((a,v)=>a+v.successful+v.failed,0)
  const totalSuccess = vendors.reduce((a,v)=>a+v.successful,0)
  const totalRevenue = vendors.reduce((a,v)=>a+v.total_processed,0)
  const successRate = totalTxns > 0 ? ((totalSuccess/totalTxns)*100).toFixed(1) : '—'

  return (
    <ProjectLayout org={org} project={project}>
      <div style={{maxWidth:'860px'}}>
        <h1 style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:'22px',color:'#EDF0F7',marginBottom:'24px'}}>Analytics</h1>

        {/* Top stats */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'12px',marginBottom:'28px'}}>
          {[
            { label:'Total revenue',  value:'KES ' + totalRevenue.toLocaleString(), color:'#EDF0F7' },
            { label:'Transactions',   value:totalTxns,                              color:'#EDF0F7' },
            { label:'Success rate',   value:successRate + '%',                      color: parseFloat(successRate)>95?'#22C55E':'#F59E0B' },
            { label:'Active vendors', value:vendors.length,                         color:'#0BA4DB' },
          ].map(s=>(
            <div key={s.label} style={{background:'#0D1120',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'10px',padding:'16px'}}>
              <div style={{fontSize:'11px',fontWeight:700,letterSpacing:'.08em',textTransform:'uppercase',color:'rgba(237,240,247,0.3)',marginBottom:'8px'}}>{s.label}</div>
              <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:'22px',color:s.color}}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Provider performance */}
        <div style={{background:'#0D1120',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'12px',overflow:'hidden',marginBottom:'16px'}}>
          <div style={{padding:'14px 18px',borderBottom:'1px solid rgba(255,255,255,0.05)',fontSize:'12px',fontWeight:700,letterSpacing:'.08em',textTransform:'uppercase',color:'rgba(237,240,247,0.35)'}}>Provider performance</div>
          {vendors.length === 0 ? (
            <div style={{padding:'40px',textAlign:'center',color:'rgba(237,240,247,0.35)',fontSize:'13px'}}>No transaction data yet.</div>
          ) : vendors.map((v,i)=>{
            const total = v.successful + v.failed
            const rate  = total > 0 ? ((v.successful/total)*100).toFixed(1) : 0
            return (
              <div key={v.vendor} style={{padding:'14px 18px',borderBottom:'1px solid rgba(255,255,255,0.03)',display:'grid',gridTemplateColumns:'1fr auto auto auto',gap:'24px',alignItems:'center'}}>
                <div>
                  <div style={{fontSize:'13px',fontWeight:600,color:'#EDF0F7',textTransform:'capitalize',marginBottom:'6px'}}>{v.vendor}</div>
                  <div style={{height:'4px',background:'rgba(255,255,255,0.06)',borderRadius:'2px',overflow:'hidden'}}>
                    <div style={{height:'100%',background:'#22C55E',borderRadius:'2px',width:rate+'%',transition:'width .4s'}} />
                  </div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:'11px',color:'rgba(237,240,247,0.35)',marginBottom:'2px'}}>Success rate</div>
                  <div style={{fontSize:'14px',fontWeight:700,color:parseFloat(rate)>95?'#22C55E':'#F59E0B'}}>{rate}%</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:'11px',color:'rgba(237,240,247,0.35)',marginBottom:'2px'}}>Volume</div>
                  <div style={{fontSize:'14px',fontWeight:700,color:'#EDF0F7'}}>KES {v.total_processed?.toLocaleString()}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:'11px',color:'rgba(237,240,247,0.35)',marginBottom:'2px'}}>Txns</div>
                  <div style={{fontSize:'14px',fontWeight:700,color:'rgba(237,240,247,0.7)'}}>{total}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </ProjectLayout>
  )
}
