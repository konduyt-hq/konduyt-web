'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '../../../../../lib/auth-context'
import { useApi } from '../../../../../lib/useApi'
import ProjectLayout from '../../../../../components/layouts/ProjectLayout'
import EmptyState from '../../../../../components/ui/EmptyState'
import Link from 'next/link'

const PAYOUT_STATUS_COLORS = {
  pending:    { color:'#F59E0B', label:'Pending' },
  processing: { color:'#0BA4DB', label:'Processing' },
  completed:  { color:'#22C55E', label:'Completed' },
  failed:     { color:'#EF4444', label:'Failed' },
}

export default function MoneyPage() {
  const { orgId, projectId } = useParams()
  const { isLoaded, isSignedIn } = useAuth()
  const api = useApi()
  const router = useRouter()
  const [org, setOrg]         = useState(null)
  const [project, setProject] = useState(null)
  const [txns, setTxns]       = useState([])
  const [payouts, setPayouts] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState('earnings')

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) { router.push('/login'); return }
    Promise.all([
      api.get('/projects/project/' + projectId),
      api.get('/orgs/' + orgId),
    ]).then(([p,o]) => {
      setProject(p); setOrg(o)
      return Promise.allSettled([
        api.get('/transactions/' + projectId + '/list?limit=100'),
        api.get('/creator/' + projectId + '/payouts'),
      ])
    }).then(([t, payout]) => {
      if (t.status==='fulfilled') setTxns(t.value.transactions||[])
      if (payout.status==='fulfilled') setPayouts(payout.value)
    }).catch(console.error).finally(()=>setLoading(false))
  }, [isLoaded, isSignedIn])

  const base = '/dashboard/' + orgId + '/' + projectId
  const succeeded = txns.filter(t=>t.status==='succeeded')
  const totalEarned = succeeded.reduce((a,t)=>a+t.amount,0)
  const payoutSummary = payouts?.summary

  return (
    <ProjectLayout org={org} project={project}>
      <div style={{ maxWidth:'720px' }}>
        <div style={{ marginBottom:'24px' }}>
          <h1 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'22px', color:'#EDF0F7', marginBottom:'4px' }}>Money</h1>
          <p style={{ fontSize:'13px', color:'rgba(237,240,247,0.45)' }}>What you've earned, what's pending, where it goes.</p>
        </div>

        {/* Payout summary */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:'10px', marginBottom:'24px' }}>
          {[
            { label:'Total earned',   value: totalEarned>0?'KES '+totalEarned.toLocaleString():'—',                                          color:'#F59E0B' },
            { label:'Paid out',       value: payoutSummary?.total_paid_out>0?'KES '+payoutSummary.total_paid_out.toLocaleString():'KES 0',    color:'#22C55E' },
            { label:'Available',      value: payoutSummary?.available>0?'KES '+payoutSummary.available.toLocaleString():'KES 0',              color:'#EDF0F7' },
            { label:'Pending payout', value: payoutSummary?.pending>0?'KES '+payoutSummary.pending.toLocaleString():'KES 0',                  color: payoutSummary?.pending>0?'#F59E0B':'rgba(237,240,247,0.4)' },
          ].map(s => (
            <div key={s.label} style={{ background:'#0D1120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'10px', padding:'16px' }}>
              <div style={{ fontSize:'10px', fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'rgba(237,240,247,0.3)', marginBottom:'8px' }}>{s.label}</div>
              <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'20px', color:s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Tab nav */}
        <div style={{ display:'flex', gap:'0', marginBottom:'16px', background:'#0D1120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'10px', padding:'3px', width:'fit-content' }}>
          {[['earnings','Earnings'],['payouts','Payouts']].map(([id,label]) => (
            <button key={id} onClick={()=>setTab(id)} style={{ fontSize:'13px', fontWeight:tab===id?600:400, padding:'7px 16px', borderRadius:'7px', border:'none', background:tab===id?'rgba(255,255,255,0.08)':'transparent', color:tab===id?'#EDF0F7':'rgba(237,240,247,0.45)', cursor:'pointer' }}>
              {label}
            </button>
          ))}
        </div>

        {/* Earnings tab */}
        {tab === 'earnings' && (
          <div style={{ background:'#0D1120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'12px', overflow:'hidden' }}>
            {loading ? (
              <div style={{ padding:'32px', textAlign:'center', color:'rgba(237,240,247,0.4)', fontSize:'13px' }}>Loading…</div>
            ) : succeeded.length === 0 ? (
              <EmptyState icon="$" title="No earnings yet" desc="Share a payment link to start receiving income." actions={[{label:'Create a payment link', href: base+'/create'}]} />
            ) : succeeded.map(t => (
              <div key={t.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'13px 16px', borderBottom:'1px solid rgba(255,255,255,0.03)' }}>
                <div>
                  <div style={{ fontSize:'13px', fontWeight:500, color:'#EDF0F7' }}>{t.customer_email||'Anonymous'}</div>
                  <div style={{ fontSize:'11px', color:'rgba(237,240,247,0.4)' }}>
                    {t.created_at?new Date(t.created_at).toLocaleDateString():''} · {t.vendor}
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                  <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'14px', color:'#F59E0B' }}>+{t.currency} {t.amount?.toLocaleString()}</div>
                  <Link href={base+'/payments/'+t.id} style={{ fontSize:'11px', color:'rgba(237,240,247,0.3)', textDecoration:'none' }}>Receipt →</Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Payouts tab */}
        {tab === 'payouts' && (
          <div>
            {(!payouts?.payouts || payouts.payouts.length === 0) ? (
              <div style={{ background:'#0D1120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'12px', padding:'48px', textAlign:'center', color:'rgba(237,240,247,0.35)', fontSize:'13px', lineHeight:1.65 }}>
                No payouts recorded yet.<br/>
                <span style={{ fontSize:'12px' }}>Payouts appear here when earnings settle to your connected accounts.</span>
              </div>
            ) : (
              <div style={{ background:'#0D1120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'12px', overflow:'hidden' }}>
                {payouts.payouts.map((p, i) => {
                  const s = PAYOUT_STATUS_COLORS[p.status] || PAYOUT_STATUS_COLORS.pending
                  return (
                    <div key={p.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'13px 16px', borderBottom:i<payouts.payouts.length-1?'1px solid rgba(255,255,255,0.03)':'none' }}>
                      <div>
                        <div style={{ fontSize:'13px', fontWeight:500, color:'#EDF0F7', textTransform:'capitalize' }}>{p.vendor}</div>
                        <div style={{ fontSize:'11px', color:'rgba(237,240,247,0.4)' }}>
                          {p.initiated_at?new Date(p.initiated_at).toLocaleDateString():''}
                          {p.expected_at ? ` · Expected ${new Date(p.expected_at).toLocaleDateString()}` : ''}
                        </div>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                        <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'14px', color:s.color }}>{p.currency} {p.amount?.toLocaleString()}</div>
                        <span style={{ fontSize:'11px', fontWeight:700, padding:'2px 8px', borderRadius:'100px', color:s.color, background:s.color+'18' }}>{s.label}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </ProjectLayout>
  )
}
