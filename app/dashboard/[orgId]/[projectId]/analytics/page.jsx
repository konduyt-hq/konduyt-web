'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { useApi } from '../../../../../lib/useApi'
import ProjectLayout from '../../../../../components/layouts/ProjectLayout'
import { SkeletonCard } from '../../../../../components/ui/Skeleton'
import EmptyState from '../../../../../components/ui/EmptyState'
import Link from 'next/link'

export default function AnalyticsPage() {
  const { orgId, projectId } = useParams()
  const { isLoaded, isSignedIn } = useAuth()
  const api = useApi()
  const router = useRouter()
  const [org, setOrg]         = useState(null)
  const [project, setProject] = useState(null)
  const [summary, setSummary] = useState(null)
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState('revenue')

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) { router.push('/login'); return }
    Promise.all([
      api.get('/projects/project/' + projectId),
      api.get('/orgs/' + orgId),
    ]).then(([p, o]) => {
      setProject(p); setOrg(o)
      return Promise.allSettled([
        api.get('/transactions/' + projectId + '/summary'),
        api.get('/transactions/' + projectId + '/customers'),
      ])
    }).then(([s, c]) => {
      if (s.status === 'fulfilled') setSummary(s.value)
      if (c.status === 'fulfilled') setCustomers(c.value)
    }).catch(console.error).finally(() => setLoading(false))
  }, [isLoaded, isSignedIn])

  const base = '/dashboard/' + orgId + '/' + projectId
  const mode = project?.mode || 'build'
  const vendors = summary?.vendors || []
  const totalRevenue = vendors.reduce((a, v) => a + v.total_processed, 0)
  const totalTxns    = vendors.reduce((a, v) => a + v.successful + v.failed, 0)
  const successRate  = totalTxns > 0 ? ((vendors.reduce((a,v)=>a+v.successful,0) / totalTxns)*100).toFixed(1) : null

  const tabs = [
    { id:'revenue',  label:'Revenue' },
    { id:'routing',  label:'Routing' },
    ...(mode==='creator' ? [{id:'creator', label:'Creator'}] : []),
    ...(mode==='payroll' ? [{id:'payroll', label:'Payroll'}]  : []),
  ]

  const hasData = totalTxns > 0

  return (
    <ProjectLayout org={org} project={project}>
      <div style={{ maxWidth:'860px' }}>
        <h1 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'22px', color:'#EDF0F7', marginBottom:'24px' }}>Analytics</h1>

        {/* Tabs */}
        <div style={{ display:'flex', gap:'0', marginBottom:'24px', background:'#0D1120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'10px', padding:'4px', width:'fit-content' }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ fontSize:'13px', fontWeight:tab===t.id?600:400, padding:'7px 18px', borderRadius:'7px', border:'none', background:tab===t.id?'rgba(255,255,255,0.08)':'transparent', color:tab===t.id?'#EDF0F7':'rgba(237,240,247,0.45)', cursor:'pointer', transition:'all .15s' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Revenue tab */}
        {tab==='revenue' && (
          loading ? (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'12px' }}>
              {[0,1,2].map(i => <SkeletonCard key={i} />)}
            </div>
          ) : !hasData ? (
            <EmptyState icon="▦" title="No revenue data yet" desc="Process your first transaction to start seeing analytics." actions={[{ label:'Make a test payment', href: base + '/payments' }]} />
          ) : (
            <div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'12px', marginBottom:'20px' }}>
                {[
                  { label:'Total revenue',   value:'KES ' + totalRevenue.toLocaleString(), color:'#EDF0F7' },
                  { label:'Total transactions', value:totalTxns.toLocaleString(),          color:'#EDF0F7' },
                  { label:'Success rate',    value: successRate ? successRate+'%' : '—',   color: successRate && parseFloat(successRate) > 95 ? '#22C55E' : '#F59E0B' },
                ].map(s => (
                  <div key={s.label} style={{ background:'#0D1120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'10px', padding:'16px' }}>
                    <div style={{ fontSize:'10px', fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'rgba(237,240,247,0.3)', marginBottom:'8px' }}>{s.label}</div>
                    <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'22px', color:s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Top customers */}
              {customers.length > 0 && (
                <div style={{ background:'#0D1120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'12px', overflow:'hidden' }}>
                  <div style={{ padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,0.05)', fontSize:'12px', fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'rgba(237,240,247,0.3)' }}>Top customers</div>
                  {customers.sort((a,b)=>b.total_paid-a.total_paid).slice(0,5).map((c,i) => (
                    <div key={c.email} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'11px 16px', borderBottom:'1px solid rgba(255,255,255,0.03)' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                        <div style={{ width:'24px', height:'24px', borderRadius:'50%', background:'rgba(255,92,53,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:700, color:'#FF5C35' }}>{i+1}</div>
                        <div style={{ fontSize:'13px', color:'#EDF0F7' }}>{c.email}</div>
                      </div>
                      <div style={{ display:'flex', gap:'16px', alignItems:'center' }}>
                        <span style={{ fontSize:'12px', color:'rgba(237,240,247,0.5)' }}>{c.txn_count} payments</span>
                        <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'13px', color:'#22C55E' }}>KES {c.total_paid?.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        )}

        {/* Routing tab */}
        {tab==='routing' && (
          !hasData ? (
            <EmptyState icon="⇢" title="No routing data yet" desc="Routing analytics appear after your first transactions are processed." actions={[{ label:'Set up routing rules', href: base + '/routing' }]} />
          ) : (
            <div style={{ display:'grid', gap:'12px' }}>
              <div style={{ background:'#0D1120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'12px', overflow:'hidden' }}>
                <div style={{ padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,0.05)', fontSize:'12px', fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'rgba(237,240,247,0.3)' }}>Provider breakdown</div>
                {vendors.map((v, i) => {
                  const total = v.successful + v.failed
                  const rate  = total > 0 ? ((v.successful/total)*100).toFixed(1) : 0
                  const share = totalTxns > 0 ? ((total/totalTxns)*100).toFixed(0) : 0
                  return (
                    <div key={v.vendor} style={{ padding:'14px 16px', borderBottom:'1px solid rgba(255,255,255,0.03)', display:'grid', gridTemplateColumns:'1fr auto auto auto', gap:'20px', alignItems:'center' }}>
                      <div>
                        <div style={{ fontSize:'13px', fontWeight:600, color:'#EDF0F7', textTransform:'capitalize', marginBottom:'6px' }}>{v.vendor}</div>
                        <div style={{ height:'4px', background:'rgba(255,255,255,0.06)', borderRadius:'2px', overflow:'hidden' }}>
                          <div style={{ height:'100%', background: parseFloat(rate)>=97?'#22C55E':'#F59E0B', borderRadius:'2px', width:rate+'%' }} />
                        </div>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontSize:'10px', color:'rgba(237,240,247,0.3)', marginBottom:'2px' }}>Success</div>
                        <div style={{ fontSize:'13px', fontWeight:700, color: parseFloat(rate)>=97?'#22C55E':'#F59E0B' }}>{rate}%</div>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontSize:'10px', color:'rgba(237,240,247,0.3)', marginBottom:'2px' }}>Volume</div>
                        <div style={{ fontSize:'13px', fontWeight:700, color:'#EDF0F7' }}>KES {v.total_processed?.toLocaleString()}</div>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontSize:'10px', color:'rgba(237,240,247,0.3)', marginBottom:'2px' }}>Share</div>
                        <div style={{ fontSize:'13px', fontWeight:700, color:'rgba(237,240,247,0.6)' }}>{share}%</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        )}

        {/* Creator tab */}
        {tab==='creator' && (
          <EmptyState icon="♡" title="Creator analytics coming September 2026" desc="Earnings by payment link, supporter growth, and subscription analytics." actions={[{ label:'View payment links', href: base + '/links' }]} />
        )}

        {/* Payroll tab */}
        {tab==='payroll' && (
          <EmptyState icon="⊙" title="Payroll analytics coming September 2026" desc="Payroll costs by person, country, and currency." actions={[{ label:'View people', href: base + '/people' }]} />
        )}
      </div>
    </ProjectLayout>
  )
}
