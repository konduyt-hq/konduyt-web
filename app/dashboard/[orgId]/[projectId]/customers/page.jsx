'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '../../../../../lib/auth-context'
import { useApi } from '../../../../../lib/useApi'
import ProjectLayout from '../../../../../components/layouts/ProjectLayout'
import EmptyState from '../../../../../components/ui/EmptyState'
import Link from 'next/link'

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
     .catch(console.error).finally(()=>setLoading(false))
  }, [isLoaded, isSignedIn])

  const mode     = project?.mode || 'build'
  const base     = '/dashboard/' + orgId + '/' + projectId
  const filtered = customers.filter(c => !search || c.email?.toLowerCase().includes(search.toLowerCase()))

  return (
    <ProjectLayout org={org} project={project}>
      <div style={{ maxWidth:'800px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'24px', gap:'12px', flexWrap:'wrap' }}>
          <div>
            <h1 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'22px', color:'#EDF0F7', marginBottom:'4px' }}>Customers</h1>
            <p style={{ fontSize:'13px', color:'rgba(237,240,247,0.45)' }}>{customers.length} {mode==='creator'?'people have paid you':'unique customers'}</p>
          </div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by email..."
            style={{ padding:'8px 12px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'8px', color:'#EDF0F7', fontSize:'12px', outline:'none', width:'200px' }} />
        </div>

        {loading ? (
          <div style={{ padding:'40px', textAlign:'center', color:'rgba(237,240,247,0.4)', fontSize:'13px' }}>Loading...</div>
        ) : filtered.length===0 ? (
          <EmptyState
            icon="⊙"
            title="No customers yet"
            desc={mode==='creator'?"Share a payment link and your first customer will appear here.":"Process your first payment to see customers here."}
            actions={mode==='creator'?[{label:'Create a payment link', href:base+'/create'}]:[{label:'Connect a provider', href:base+'/connections'}]}
          />
        ) : (
          <div style={{ background:'#0D1120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'12px', overflow:'hidden' }}>
            {filtered.sort((a,b)=>b.total_paid-a.total_paid).map((c,i) => (
              <Link key={c.email} href={base + '/customers/' + encodeURIComponent(c.email)} style={{ display:'flex', alignItems:'center', gap:'14px', padding:'14px 18px', borderBottom:'1px solid rgba(255,255,255,0.03)', textDecoration:'none', transition:'background .12s' }}>
                <div style={{ width:'36px', height:'36px', borderRadius:'50%', background:'rgba(245,158,11,0.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', fontWeight:700, color:'#F59E0B', flexShrink:0 }}>
                  {c.email?.[0]?.toUpperCase()}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:'13px', fontWeight:600, color:'#EDF0F7' }}>{c.email}</div>
                  <div style={{ fontSize:'11px', color:'rgba(237,240,247,0.4)', marginTop:'2px' }}>{c.txn_count} purchase{c.txn_count!==1?'s':''} · {c.currencies?.join(', ')}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'14px', color:'#F59E0B' }}>{c.currencies?.[0]||'KES'} {c.total_paid?.toLocaleString()}</div>
                  <div style={{ fontSize:'11px', color:'rgba(237,240,247,0.35)', marginTop:'2px' }}>lifetime value</div>
                </div>
                <span style={{ color:'rgba(237,240,247,0.3)', fontSize:'14px' }}>→</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </ProjectLayout>
  )
}
