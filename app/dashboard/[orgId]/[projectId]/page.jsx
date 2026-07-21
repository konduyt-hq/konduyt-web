'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { useApi } from '../../../../lib/useApi'
import ProjectLayout from '../../../../components/layouts/ProjectLayout'
import { SkeletonCard, SkeletonRow } from '../../../../components/ui/Skeleton'
import EmptyState from '../../../../components/ui/EmptyState'
import Link from 'next/link'

export default function Overview() {
  const { orgId, projectId } = useParams()
  const { isLoaded, isSignedIn } = useAuth()
  const api = useApi()
  const router = useRouter()
  const [org, setOrg]         = useState(null)
  const [project, setProject] = useState(null)
  const [summary, setSummary] = useState(null)
  const [vendors, setVendors] = useState([])
  const [txns, setTxns]       = useState([])
  const [loading, setLoading] = useState(true)

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
        api.get('/vendors/' + projectId + '/vendors'),
        api.get('/transactions/' + projectId + '/list?limit=5'),
      ])
    }).then(([s, v, t]) => {
      if (s.status === 'fulfilled') setSummary(s.value)
      if (v.status === 'fulfilled') setVendors(v.value)
      if (t.status === 'fulfilled') setTxns(t.value.transactions || [])
    }).catch(console.error).finally(() => setLoading(false))
  }, [isLoaded, isSignedIn])

  const totalRevenue  = summary?.vendors?.reduce((a, v) => a + v.total_processed, 0) || 0
  const totalTxns     = summary?.vendors?.reduce((a, v) => a + v.successful + v.failed, 0) || 0
  const totalFailed   = summary?.vendors?.reduce((a, v) => a + v.failed, 0) || 0
  const successRate   = totalTxns > 0 ? ((totalTxns - totalFailed) / totalTxns * 100).toFixed(1) : null
  const connectedCount = vendors.length
  const taxDue        = summary?.tax_summary?.[0]?.amount_owed || 0

  const attention = []
  if (totalFailed > 0) attention.push({ type:'warn', msg: totalFailed + ' payment' + (totalFailed>1?'s':'')+' failed', href: '/payments?status=failed', action: 'View' })
  if (connectedCount === 0) attention.push({ type:'warn', msg: 'No payment providers connected', href: '/connections', action: 'Connect now' })
  if (taxDue > 0) attention.push({ type:'info', msg: 'KES ' + taxDue.toLocaleString() + ' estimated tax owed this period', href: '/taxes', action: 'View details' })
  if (!project?.live_mode) attention.push({ type:'info', msg: 'You are in sandbox mode — no real payments', href: '/settings', action: 'Go live' })

  const base = '/dashboard/' + orgId + '/' + projectId

  return (
    <ProjectLayout org={org} project={project}>
      <div style={{ maxWidth:'860px' }}>

        {/* Header */}
        <div style={{ marginBottom:'28px' }}>
          <h1 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'22px', color:'#EDF0F7', marginBottom:'4px' }}>
            {project?.name || 'Overview'}
          </h1>
          <div style={{ fontSize:'13px', color:'rgba(237,240,247,0.45)' }}>
            {project?.live_mode ? '● Live' : '○ Sandbox'} · {project?.jurisdiction || 'KE'}
          </div>
        </div>

        {/* 1. System Health */}
        <div style={{ marginBottom:'24px' }}>
          <div style={{ fontSize:'11px', fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'rgba(237,240,247,0.3)', marginBottom:'10px' }}>System health</div>
          {loading ? (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px' }}>
              {[0,1,2].map(i => <SkeletonCard key={i} height="70px" />)}
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px' }}>
              <div style={{ background:'#0D1120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'10px', padding:'14px 16px', display:'flex', alignItems:'center', gap:'12px' }}>
                <span style={{ fontSize:'18px' }}>{connectedCount > 0 ? '●' : '○'}</span>
                <div>
                  <div style={{ fontSize:'12px', fontWeight:700, color: connectedCount > 0 ? '#22C55E' : '#F59E0B' }}>{connectedCount > 0 ? 'Providers online' : 'No providers'}</div>
                  <div style={{ fontSize:'11px', color:'rgba(237,240,247,0.4)' }}>{connectedCount} connected</div>
                </div>
              </div>
              <div style={{ background:'#0D1120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'10px', padding:'14px 16px', display:'flex', alignItems:'center', gap:'12px' }}>
                <span style={{ fontSize:'18px', color: successRate && parseFloat(successRate) > 95 ? '#22C55E' : '#F59E0B' }}>◎</span>
                <div>
                  <div style={{ fontSize:'12px', fontWeight:700, color: successRate && parseFloat(successRate) > 95 ? '#22C55E' : '#F59E0B' }}>{successRate ? successRate + '% success' : 'No data'}</div>
                  <div style={{ fontSize:'11px', color:'rgba(237,240,247,0.4)' }}>Payment success rate</div>
                </div>
              </div>
              <div style={{ background:'#0D1120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'10px', padding:'14px 16px', display:'flex', alignItems:'center', gap:'12px' }}>
                <span style={{ fontSize:'18px', color: project?.live_mode ? '#22C55E' : '#F59E0B' }}>◈</span>
                <div>
                  <div style={{ fontSize:'12px', fontWeight:700, color: project?.live_mode ? '#22C55E' : '#F59E0B' }}>{project?.live_mode ? 'Live' : 'Sandbox'}</div>
                  <div style={{ fontSize:'11px', color:'rgba(237,240,247,0.4)' }}>{project?.live_mode ? 'Real payments active' : 'Test mode only'}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 2. Money */}
        <div style={{ marginBottom:'24px' }}>
          <div style={{ fontSize:'11px', fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'rgba(237,240,247,0.3)', marginBottom:'10px' }}>Money</div>
          {loading ? (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'10px' }}>
              {[0,1,2,3].map(i => <SkeletonCard key={i} height="80px" />)}
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'10px' }}>
              {[
                { label:'Total revenue',  value:'KES ' + totalRevenue.toLocaleString(), color:'#EDF0F7' },
                { label:'Transactions',   value:totalTxns.toLocaleString(),             color:'#EDF0F7' },
                { label:'Failed',         value:totalFailed.toLocaleString(),           color: totalFailed > 0 ? '#EF4444' : '#EDF0F7' },
                { label:'Tax estimated',  value:taxDue > 0 ? 'KES ' + taxDue.toLocaleString() : '—', color: taxDue > 0 ? '#F59E0B' : '#EDF0F7' },
              ].map(s => (
                <div key={s.label} style={{ background:'#0D1120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'10px', padding:'14px 16px' }}>
                  <div style={{ fontSize:'10px', fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'rgba(237,240,247,0.3)', marginBottom:'8px' }}>{s.label}</div>
                  <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'18px', color:s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 3. Attention Required */}
        {attention.length > 0 && (
          <div style={{ marginBottom:'24px' }}>
            <div style={{ fontSize:'11px', fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'rgba(237,240,247,0.3)', marginBottom:'10px' }}>Attention required</div>
            <div style={{ display:'grid', gap:'8px' }}>
              {attention.map((item, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', background: item.type==='warn' ? 'rgba(239,68,68,0.06)' : 'rgba(245,158,11,0.06)', border:'1px solid', borderColor: item.type==='warn' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)', borderRadius:'10px', gap:'12px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                    <span style={{ fontSize:'14px', color: item.type==='warn' ? '#EF4444' : '#F59E0B' }}>{item.type==='warn' ? '⚠' : 'ℹ'}</span>
                    <span style={{ fontSize:'13px', color:'rgba(237,240,247,0.8)' }}>{item.msg}</span>
                  </div>
                  <Link href={base + item.href} style={{ fontSize:'12px', fontWeight:600, color: item.type==='warn' ? '#EF4444' : '#F59E0B', textDecoration:'none', whiteSpace:'nowrap' }}>
                    {item.action} →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. Recent Activity */}
        <div>
          <div style={{ fontSize:'11px', fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'rgba(237,240,247,0.3)', marginBottom:'10px' }}>Recent activity</div>
          <div style={{ background:'#0D1120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'12px', overflow:'hidden' }}>
            <div style={{ padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,0.05)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ fontSize:'12px', fontWeight:600, color:'rgba(237,240,247,0.6)' }}>Latest transactions</div>
              <Link href={base + '/payments'} style={{ fontSize:'12px', color:'#FF5C35', textDecoration:'none', fontWeight:600 }}>View all →</Link>
            </div>
            {loading ? (
              [0,1,2,3,4].map(i => <SkeletonRow key={i} />)
            ) : txns.length === 0 ? (
              <EmptyState
                icon="⇅"
                title="No payments yet"
                desc="Connect a payment provider and make your first test transaction in sandbox mode."
                actions={[
                  { label: 'Connect a provider', href: base + '/connections' },
                  { label: 'View docs', href: '/docs' },
                ]}
              />
            ) : txns.map(t => (
              <div key={t.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'11px 16px', borderBottom:'1px solid rgba(255,255,255,0.03)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                  <span style={{ fontSize:'8px', color: t.status==='success'?'#22C55E':t.status==='failed'?'#EF4444':'#F59E0B' }}>●</span>
                  <span style={{ fontSize:'13px', fontWeight:500, color:'#EDF0F7' }}>{t.currency} {t.amount?.toLocaleString()}</span>
                  <span style={{ fontSize:'12px', color:'rgba(237,240,247,0.45)', textTransform:'capitalize' }}>{t.vendor}</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                  <span style={{ fontSize:'12px', color:'rgba(237,240,247,0.4)' }}>{t.customer_email||'—'}</span>
                  <span style={{ fontSize:'11px', color:'rgba(237,240,247,0.3)' }}>{t.created_at ? new Date(t.created_at).toLocaleDateString() : ''}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </ProjectLayout>
  )
}
