'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { useApi } from '../../../../lib/useApi'
import BuildLayout from '../../../../components/layouts/BuildLayout'
import Link from 'next/link'

export default function ProjectOverview() {
  const router = useRouter()
  const { orgId, projectId } = useParams()
  const { isLoaded, isSignedIn } = useAuth()
  const api = useApi()
  const [project, setProject] = useState(null)
  const [org, setOrg]         = useState(null)
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) { router.push('/login'); return }
    Promise.all([
      api.get('/projects/project/' + projectId),
      api.get('/orgs/' + orgId),
    ]).then(([p, o]) => {
      setProject(p); setOrg(o)
      api.get('/transactions/project/' + projectId + '/summary').then(setSummary).catch(() => {})
    }).catch(console.error).finally(() => setLoading(false))
  }, [isLoaded, isSignedIn, projectId, orgId])

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#07090F', color:'rgba(237,240,247,0.4)' }}>Loading...</div>

  const totalTxns    = summary?.vendors?.reduce((a, v) => a + v.successful + v.failed, 0) || 0
  const totalRevenue = summary?.vendors?.reduce((a, v) => a + v.total_processed, 0) || 0
  const vendorCount  = summary?.vendors?.length || 0

  const stats = [
    { label:'Total revenue',     value: totalRevenue > 0 ? 'KES ' + totalRevenue.toLocaleString() : '—', sub:'All time', color:'#EDF0F7' },
    { label:'Transactions',      value: totalTxns > 0 ? totalTxns.toLocaleString() : '—', sub:'All time', color:'#EDF0F7' },
    { label:'Connected vendors', value: vendorCount > 0 ? vendorCount : '—', sub:'Active', color: vendorCount > 0 ? '#22C55E' : '#F59E0B' },
    { label:'Tax owed',          value: summary?.tax_summary?.length > 0 ? 'KES ' + summary.tax_summary[0].amount_owed : 'KES 0', sub:'This period', color:'#FF5C35' },
  ]

  return (
    <ProjectLayout org={org} project={project}>
      <div style={{ maxWidth:'900px' }}>

        {/* Header */}
        <div style={{ marginBottom:'32px' }}>
          <h1 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'22px', color:'#EDF0F7', marginBottom:'4px' }}>{project?.name}</h1>
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            <span style={{ fontSize:'12px', color: project?.live_mode ? '#22C55E' : '#F59E0B', fontWeight:600 }}>{project?.live_mode ? '● Live' : '○ Sandbox mode'}</span>
            {!project?.live_mode && <Link href={'/dashboard/' + orgId + '/' + projectId + '/integrations'} style={{ fontSize:'12px', color:'#FF5C35', textDecoration:'none', fontWeight:500 }}>Go live →</Link>}
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px', marginBottom:'28px' }}>
          {stats.map(s => (
            <div key={s.label} style={{ background:'#0D1120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'10px', padding:'18px' }}>
              <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'22px', color: s.color, marginBottom:'4px' }}>{s.value}</div>
              <div style={{ fontSize:'12px', fontWeight:600, color:'#EDF0F7', marginBottom:'2px' }}>{s.label}</div>
              <div style={{ fontSize:'11px', color:'rgba(237,240,247,0.35)' }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'28px' }}>
          <Link href={'/dashboard/' + orgId + '/' + projectId + '/integrations'} style={{ background:'#0D1120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'10px', padding:'18px', textDecoration:'none', display:'block', transition:'border-color .15s' }}>
            <div style={{ fontSize:'13px', fontWeight:600, color:'#EDF0F7', marginBottom:'4px' }}>Set up integrations</div>
            <div style={{ fontSize:'12px', color:'rgba(237,240,247,0.45)' }}>Connect Stripe, M-Pesa, PayPal and more</div>
          </Link>
          <Link href={'/dashboard/' + orgId + '/' + projectId + '/keys'} style={{ background:'#0D1120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'10px', padding:'18px', textDecoration:'none', display:'block' }}>
            <div style={{ fontSize:'13px', fontWeight:600, color:'#EDF0F7', marginBottom:'4px' }}>API Keys</div>
            <div style={{ fontSize:'12px', color:'rgba(237,240,247,0.45)' }}>Get your publishable and secret keys</div>
          </Link>
          <Link href={'/dashboard/' + orgId + '/' + projectId + '/routing'} style={{ background:'#0D1120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'10px', padding:'18px', textDecoration:'none', display:'block' }}>
            <div style={{ fontSize:'13px', fontWeight:600, color:'#EDF0F7', marginBottom:'4px' }}>Smart Routing</div>
            <div style={{ fontSize:'12px', color:'rgba(237,240,247,0.45)' }}>Configure provider selection rules</div>
          </Link>
          <Link href={'/dashboard/' + orgId + '/' + projectId + '/webhooks'} style={{ background:'#0D1120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'10px', padding:'18px', textDecoration:'none', display:'block' }}>
            <div style={{ fontSize:'13px', fontWeight:600, color:'#EDF0F7', marginBottom:'4px' }}>Webhooks</div>
            <div style={{ fontSize:'12px', color:'rgba(237,240,247,0.45)' }}>Set up event notifications</div>
          </Link>
        </div>

        {/* Recent transactions */}
        <div style={{ background:'#0D1120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'12px', overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', borderBottom:'1px solid rgba(255,255,255,0.05)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ fontSize:'13px', fontWeight:600, color:'#EDF0F7' }}>Recent transactions</div>
            <Link href={'/dashboard/' + orgId + '/' + projectId + '/transactions'} style={{ fontSize:'12px', color:'#FF5C35', textDecoration:'none' }}>View all →</Link>
          </div>
          {totalTxns === 0 ? (
            <div style={{ padding:'40px', textAlign:'center', color:'rgba(237,240,247,0.35)', fontSize:'13px' }}>
              No transactions yet. Complete your integration to start processing payments in sandbox mode.
            </div>
          ) : (
            <div style={{ padding:'14px 18px', color:'rgba(237,240,247,0.5)', fontSize:'13px' }}>
              {totalTxns} transaction{totalTxns !== 1 ? 's' : ''} processed.{' '}
              <Link href={'/dashboard/' + orgId + '/' + projectId + '/transactions'} style={{ color:'#FF5C35', textDecoration:'none' }}>View details →</Link>
            </div>
          )}
        </div>

      </div>
    </ProjectLayout>
  )
}
