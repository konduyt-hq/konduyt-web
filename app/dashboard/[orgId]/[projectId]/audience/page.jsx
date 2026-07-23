'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { useApi } from '../../../../../lib/useApi'
import ProjectLayout from '../../../../../components/layouts/ProjectLayout'
import EmptyState from '../../../../../components/ui/EmptyState'

export default function AudiencePage() {
  const { orgId, projectId } = useParams()
  const { isLoaded, isSignedIn } = useAuth()
  const api = useApi()
  const router = useRouter()
  const [org, setOrg]         = useState(null)
  const [project, setProject] = useState(null)
  const [customers, setCustomers] = useState([])
  const [selected, setSelected]   = useState(null)
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) { router.push('/login'); return }
    Promise.all([
      api.get('/projects/project/' + projectId),
      api.get('/orgs/' + orgId),
    ]).then(([p, o]) => { setProject(p); setOrg(o) }).catch(console.error)
    load()
  }, [isLoaded, isSignedIn])

  async function load(q = '') {
    setLoading(true)
    try {
      const d = await api.get('/creator/' + projectId + '/customers' + (q ? '?search=' + q : ''))
      setCustomers(d.customers || [])
    } catch {
      try {
        const d = await api.get('/transactions/' + projectId + '/customers')
        setCustomers(d.map(c => ({ ...c, id: c.email, total_spent: c.total_paid, total_orders: c.txn_count })))
      } catch (e) { console.error(e) }
    } finally { setLoading(false) }
  }

  const base = '/dashboard/' + orgId + '/' + projectId

  return (
    <ProjectLayout org={org} project={project}>
      <div style={{ maxWidth:'860px', display:'grid', gridTemplateColumns: selected ? '1fr 300px' : '1fr', gap:'20px' }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'20px', gap:'12px', flexWrap:'wrap' }}>
            <div>
              <h1 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'22px', color:'#EDF0F7', marginBottom:'4px' }}>Audience</h1>
              <p style={{ fontSize:'13px', color:'rgba(237,240,247,0.45)' }}>
                {customers.length} {customers.length === 1 ? 'person' : 'people'} — customers, subscribers, clients, and buyers
              </p>
            </div>
            <input value={search} onChange={e => { setSearch(e.target.value); load(e.target.value) }}
              placeholder="Search by name or email…"
              style={{ padding:'8px 12px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'8px', color:'#EDF0F7', fontSize:'12px', outline:'none', width:'220px' }} />
          </div>

          {loading ? (
            <div style={{ padding:'40px', textAlign:'center', color:'rgba(237,240,247,0.4)', fontSize:'13px' }}>Loading…</div>
          ) : customers.length === 0 ? (
            <EmptyState icon="⊙" title="No audience yet"
              desc="When someone pays you, they appear here with their full purchase history and lifetime value."
              actions={[{ label:'Create a payment link', href: base + '/create' }]} />
          ) : (
            <div style={{ background:'#0D1120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'12px', overflow:'hidden' }}>
              {customers.map((c, i) => (
                <div key={c.id || c.email} onClick={() => setSelected(selected?.id === c.id ? null : c)}
                  style={{ display:'flex', alignItems:'center', gap:'12px', padding:'14px 16px', borderBottom:i < customers.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none', cursor:'pointer', background:selected?.id === c.id ? 'rgba(245,158,11,0.05)' : 'transparent' }}>
                  <div style={{ width:'36px', height:'36px', borderRadius:'50%', background:'rgba(245,158,11,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', fontWeight:700, color:'#F59E0B', flexShrink:0 }}>
                    {(c.name || c.email || '?')[0].toUpperCase()}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:'13px', fontWeight:600, color:'#EDF0F7' }}>{c.name || c.email}</div>
                    {c.name && <div style={{ fontSize:'11px', color:'rgba(237,240,247,0.4)' }}>{c.email}</div>}
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'14px', color:'#F59E0B' }}>KES {(c.total_spent || 0).toLocaleString()}</div>
                    <div style={{ fontSize:'11px', color:'rgba(237,240,247,0.4)' }}>{c.total_orders || 0} purchase{(c.total_orders || 0) !== 1 ? 's' : ''}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selected && (
          <div style={{ background:'#0D1120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'12px', padding:'20px', height:'fit-content', position:'sticky', top:'20px' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px' }}>
              <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'14px', color:'#EDF0F7' }}>Profile</div>
              <button onClick={() => setSelected(null)} style={{ background:'none', border:'none', color:'rgba(237,240,247,0.4)', fontSize:'18px', cursor:'pointer' }}>×</button>
            </div>
            <div style={{ textAlign:'center', marginBottom:'14px' }}>
              <div style={{ width:'48px', height:'48px', borderRadius:'50%', background:'rgba(245,158,11,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', fontWeight:700, color:'#F59E0B', margin:'0 auto 8px' }}>
                {(selected.name || selected.email || '?')[0].toUpperCase()}
              </div>
              <div style={{ fontSize:'13px', fontWeight:700, color:'#EDF0F7' }}>{selected.name || 'Customer'}</div>
              <div style={{ fontSize:'11px', color:'rgba(237,240,247,0.45)' }}>{selected.email}</div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
              {[
                { label:'Lifetime value', value:'KES ' + (selected.total_spent || 0).toLocaleString(), color:'#F59E0B' },
                { label:'Purchases',      value:(selected.total_orders || 0).toString(),               color:'#EDF0F7' },
              ].map(s => (
                <div key={s.label} style={{ background:'rgba(255,255,255,0.04)', borderRadius:'8px', padding:'10px' }}>
                  <div style={{ fontSize:'10px', fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', color:'rgba(237,240,247,0.3)', marginBottom:'4px' }}>{s.label}</div>
                  <div style={{ fontSize:'13px', fontWeight:600, color:s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ProjectLayout>
  )
}
