'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { useApi } from '../../../../../lib/useApi'
import ProjectLayout from '../../../../../components/layouts/ProjectLayout'

export default function SupportersPage() {
  const { orgId, projectId } = useParams()
  const { isLoaded, isSignedIn } = useAuth()
  const api = useApi()
  const router = useRouter()
  const [org, setOrg]           = useState(null)
  const [project, setProject]   = useState(null)
  const [supporters, setSupporters] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) { router.push('/login'); return }
    Promise.all([
      api.get('/projects/project/' + projectId),
      api.get('/orgs/' + orgId),
      api.get('/transactions/' + projectId + '/customers'),
    ]).then(([p,o,c]) => { setProject(p); setOrg(o); setSupporters(c) })
     .catch(console.error).finally(()=>setLoading(false))
  }, [isLoaded, isSignedIn])

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:'#07090F',color:'rgba(237,240,247,0.4)'}}>Loading...</div>

  return (
    <ProjectLayout org={org} project={project}>
      <div style={{maxWidth:'720px'}}>
        <div style={{marginBottom:'24px'}}>
          <h1 style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:'22px',color:'#EDF0F7',marginBottom:'4px'}}>Supporters</h1>
          <p style={{fontSize:'13px',color:'rgba(237,240,247,0.45)'}}>{supporters.length} people have paid you.</p>
        </div>
        {supporters.length === 0 ? (
          <div style={{background:'#0D1120',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'12px',padding:'48px',textAlign:'center',color:'rgba(237,240,247,0.35)',fontSize:'13px'}}>
            No supporters yet. Share your payment link to start receiving payments.
          </div>
        ) : (
          <div style={{background:'#0D1120',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'12px',overflow:'hidden'}}>
            {supporters.sort((a,b)=>b.total_paid-a.total_paid).map((s,i)=>(
              <div key={s.email} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 18px',borderBottom:'1px solid rgba(255,255,255,0.03)'}}>
                <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                  <div style={{width:'32px',height:'32px',borderRadius:'50%',background:'rgba(245,158,11,0.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',fontWeight:700,color:'#F59E0B',flexShrink:0}}>
                    {s.email?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div style={{fontSize:'13px',fontWeight:500,color:'#EDF0F7'}}>{s.email}</div>
                    <div style={{fontSize:'11px',color:'rgba(237,240,247,0.4)'}}>{s.txn_count} payment{s.txn_count!==1?'s':''} · Last: {s.last_payment?new Date(s.last_payment).toLocaleDateString():'—'}</div>
                  </div>
                </div>
                <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:'14px',color:'#F59E0B'}}>
                  KES {s.total_paid?.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ProjectLayout>
  )
}
