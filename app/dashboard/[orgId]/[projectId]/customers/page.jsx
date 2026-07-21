'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { useApi } from '../../../../../lib/useApi'
import BuildLayout from '../../../../../components/layouts/ProjectLayout'

export default function CustomersPage() {
  const { orgId, projectId } = useParams()
  const { isLoaded, isSignedIn } = useAuth()
  const api = useApi()
  const router = useRouter()
  const [org, setOrg]           = useState(null)
  const [project, setProject]   = useState(null)
  const [customers, setCustomers] = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) { router.push('/login'); return }
    Promise.all([
      api.get('/projects/project/' + projectId),
      api.get('/orgs/' + orgId),
      api.get('/transactions/' + projectId + '/customers'),
    ]).then(([p,o,c]) => { setProject(p); setOrg(o); setCustomers(c) })
     .catch(console.error).finally(() => setLoading(false))
  }, [isLoaded, isSignedIn])

  const filtered = customers.filter(c =>
    !search || c.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <ProjectLayout org={org} project={project}>
      <div style={{maxWidth:'800px'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'24px',gap:'12px',flexWrap:'wrap'}}>
          <div>
            <h1 style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:'22px',color:'#EDF0F7',marginBottom:'4px'}}>Customers</h1>
            <p style={{fontSize:'13px',color:'rgba(237,240,247,0.45)'}}>{customers.length} unique customers</p>
          </div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by email..." style={{padding:'8px 12px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'8px',color:'#EDF0F7',fontSize:'12px',outline:'none',width:'220px'}} />
        </div>
        <div style={{background:'#0D1120',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'12px',overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{background:'#131928'}}>
              {['Customer','Payments','Total paid','Currencies','Last payment'].map(h=>(
                <th key={h} style={{textAlign:'left',padding:'10px 14px',fontSize:'10px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',color:'rgba(237,240,247,0.35)',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{padding:'40px',textAlign:'center',color:'rgba(237,240,247,0.35)',fontSize:'13px'}}>Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} style={{padding:'40px',textAlign:'center',color:'rgba(237,240,247,0.35)',fontSize:'13px'}}>No customers yet.</td></tr>
              ) : filtered.sort((a,b)=>b.total_paid-a.total_paid).map(c=>(
                <tr key={c.email} style={{borderBottom:'1px solid rgba(255,255,255,0.03)'}}>
                  <td style={{padding:'11px 14px'}}>
                    <div style={{fontSize:'13px',fontWeight:500,color:'#EDF0F7'}}>{c.email}</div>
                    {c.phone && <div style={{fontSize:'11px',color:'rgba(237,240,247,0.4)'}}>{c.phone}</div>}
                  </td>
                  <td style={{padding:'11px 14px',fontSize:'13px',color:'rgba(237,240,247,0.7)'}}>{c.txn_count}</td>
                  <td style={{padding:'11px 14px',fontSize:'13px',fontWeight:600,color:'#22C55E'}}>KES {c.total_paid?.toLocaleString()}</td>
                  <td style={{padding:'11px 14px',fontSize:'12px',color:'rgba(237,240,247,0.5)'}}>{c.currencies?.join(', ')}</td>
                  <td style={{padding:'11px 14px',fontSize:'12px',color:'rgba(237,240,247,0.4)'}}>{c.last_payment?new Date(c.last_payment).toLocaleDateString():'—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ProjectLayout>
  )
}
