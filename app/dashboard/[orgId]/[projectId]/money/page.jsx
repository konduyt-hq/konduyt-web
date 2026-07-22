'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { useApi } from '../../../../../lib/useApi'
import ProjectLayout from '../../../../../components/layouts/ProjectLayout'
import EmptyState from '../../../../../components/ui/EmptyState'
import Link from 'next/link'

export default function MoneyPage() {
  const { orgId, projectId } = useParams()
  const { isLoaded, isSignedIn } = useAuth()
  const api = useApi()
  const router = useRouter()
  const [org, setOrg]         = useState(null)
  const [project, setProject] = useState(null)
  const [summary, setSummary] = useState(null)
  const [txns, setTxns]       = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) { router.push('/login'); return }
    Promise.all([
      api.get('/projects/project/' + projectId),
      api.get('/orgs/' + orgId),
    ]).then(([p,o]) => {
      setProject(p); setOrg(o)
      return Promise.allSettled([
        api.get('/transactions/' + projectId + '/summary'),
        api.get('/transactions/' + projectId + '/list?limit=50'),
      ])
    }).then(([s,t]) => {
      if (s.status==='fulfilled') setSummary(s.value)
      if (t.status==='fulfilled') setTxns(t.value.transactions||[])
    }).catch(console.error).finally(()=>setLoading(false))
  }, [isLoaded, isSignedIn])

  const base = '/dashboard/' + orgId + '/' + projectId
  const totalEarned = summary?.vendors?.reduce((a,v)=>a+v.total_processed, 0) || 0
  const succeeded   = txns.filter(t=>t.status==='succeeded')

  return (
    <ProjectLayout org={org} project={project}>
      <div style={{ maxWidth:'720px' }}>
        <div style={{ marginBottom:'24px' }}>
          <h1 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'22px', color:'#EDF0F7', marginBottom:'6px' }}>Earnings</h1>
          <p style={{ fontSize:'13px', color:'rgba(237,240,247,0.45)' }}>Everything you've earned through Konduyt.</p>
        </div>

        {/* Earnings summary */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'12px', marginBottom:'24px' }}>
          {[
            { label:'Total earned',     value: totalEarned>0?'KES '+totalEarned.toLocaleString():'—',             color:'#F59E0B' },
            { label:'Successful sales', value: succeeded.length>0?succeeded.length.toString():'—',                color:'#EDF0F7' },
            { label:'Avg sale value',   value: succeeded.length>0?'KES '+(totalEarned/succeeded.length).toLocaleString(undefined,{maximumFractionDigits:0}):'—', color:'#EDF0F7' },
          ].map(s => (
            <div key={s.label} style={{ background:'#0D1120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'10px', padding:'16px' }}>
              <div style={{ fontSize:'10px', fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'rgba(237,240,247,0.3)', marginBottom:'8px' }}>{s.label}</div>
              <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'22px', color:s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Transaction list */}
        <div style={{ background:'#0D1120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'12px', overflow:'hidden' }}>
          <div style={{ padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,0.05)', fontSize:'12px', fontWeight:600, color:'rgba(237,240,247,0.6)' }}>All earnings</div>
          {loading ? (
            <div style={{ padding:'32px', textAlign:'center', color:'rgba(237,240,247,0.4)', fontSize:'13px' }}>Loading...</div>
          ) : txns.length===0 ? (
            <EmptyState icon="$" title="No earnings yet" desc="Share a payment link to start receiving income." actions={[{label:'Create a payment link', href: base+'/create'}]} />
          ) : txns.filter(t=>t.status==='succeeded').map(t => (
            <div key={t.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,0.03)' }}>
              <div>
                <div style={{ fontSize:'13px', fontWeight:500, color:'#EDF0F7' }}>{t.customer_email||'Anonymous'}</div>
                <div style={{ fontSize:'11px', color:'rgba(237,240,247,0.4)' }}>{t.created_at?new Date(t.created_at).toLocaleDateString():''} · via {t.vendor}</div>
              </div>
              <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'15px', color:'#F59E0B' }}>+{t.currency} {t.amount?.toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>
    </ProjectLayout>
  )
}
