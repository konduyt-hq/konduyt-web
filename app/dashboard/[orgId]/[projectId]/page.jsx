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

  const mode = project?.mode || 'build'
  const base = '/dashboard/' + orgId + '/' + projectId

  const totalRevenue   = summary?.vendors?.reduce((a, v) => a + v.total_processed, 0) || 0
  const totalTxns      = summary?.vendors?.reduce((a, v) => a + v.successful + v.failed, 0) || 0
  const totalFailed    = summary?.vendors?.reduce((a, v) => a + v.failed, 0) || 0
  const successRate    = totalTxns > 0 ? ((totalTxns - totalFailed) / totalTxns * 100).toFixed(1) : null
  const connectedCount = vendors.length
  const taxDue         = summary?.tax_summary?.[0]?.amount_owed || 0

  const attention = []
  if (totalFailed > 0) attention.push({ type:'warn', msg: totalFailed + ' payment' + (totalFailed>1?'s':'')+' failed', href: '/payments?status=failed', action: 'View' })
  if (connectedCount === 0) attention.push({ type:'warn', msg: mode === 'creator' ? 'No payout accounts connected — where should your money go?' : 'No payment providers connected', href: mode==='creator'?'/accounts':'/connections', action: mode==='creator'?'Add account':'Connect now' })
  if (taxDue > 0) attention.push({ type:'info', msg: 'KES ' + taxDue.toLocaleString() + ' estimated tax owed this period', href: '/taxes', action: 'View' })
  if (!project?.live_mode) attention.push({ type:'info', msg: mode==='creator'?'Sandbox mode — no real earnings yet':'Sandbox mode — no real payments', href: '/settings', action: mode==='creator'?'Go live':'Go live' })

  // ── Creator-specific home ──────────────────────────────────────────────────
  if (mode === 'creator') {
    return (
      <ProjectLayout org={org} project={project}>
        <div style={{ maxWidth:'860px' }}>
          <div style={{ marginBottom:'28px' }}>
            <div style={{ fontSize:'11px', fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'rgba(245,158,11,0.7)', marginBottom:'6px' }}>KONDUYTcreator</div>
            <h1 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'22px', color:'#EDF0F7', marginBottom:'4px' }}>
              {project?.name || 'Your creator dashboard'}
            </h1>
            <p style={{ fontSize:'14px', color:'rgba(237,240,247,0.45)' }}>Sell your work. Get paid your way.</p>
          </div>

          {/* 4 questions answered upfront */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px', marginBottom:'24px' }}>

            {/* 1. How much have I earned? */}
            <div style={{ background:'#0D1120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'14px', padding:'20px' }}>
              <div style={{ fontSize:'11px', fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'rgba(245,158,11,0.6)', marginBottom:'12px' }}>How much have I earned?</div>
              {loading ? <SkeletonCard height="60px" /> : (
                <>
                  <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'28px', color: totalRevenue > 0 ? '#F59E0B' : 'rgba(237,240,247,0.3)', marginBottom:'4px' }}>
                    {totalRevenue > 0 ? 'KES ' + totalRevenue.toLocaleString() : '—'}
                  </div>
                  <div style={{ fontSize:'12px', color:'rgba(237,240,247,0.4)' }}>
                    {totalRevenue > 0 ? `from ${summary?.vendors?.reduce((a,v)=>a+v.successful,0)||0} sales` : 'No earnings yet'}
                  </div>
                  {totalRevenue === 0 && (
                    <Link href={base + '/create'} style={{ fontSize:'13px', fontWeight:600, color:'#F59E0B', textDecoration:'none', display:'block', marginTop:'10px' }}>Create something to sell →</Link>
                  )}
                </>
              )}
            </div>

            {/* 2. Who paid me? */}
            <div style={{ background:'#0D1120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'14px', padding:'20px' }}>
              <div style={{ fontSize:'11px', fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'rgba(245,158,11,0.6)', marginBottom:'12px' }}>Who paid me?</div>
              {loading ? <SkeletonCard height="60px" /> : txns.length === 0 ? (
                <div>
                  <div style={{ fontSize:'28px', fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, color:'rgba(237,240,247,0.3)', marginBottom:'4px' }}>—</div>
                  <div style={{ fontSize:'12px', color:'rgba(237,240,247,0.4)' }}>No customers yet</div>
                  <Link href={base + '/sales'} style={{ fontSize:'13px', fontWeight:600, color:'#F59E0B', textDecoration:'none', display:'block', marginTop:'10px' }}>Share a payment link →</Link>
                </div>
              ) : (
                <div>
                  <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'28px', color:'#EDF0F7', marginBottom:'4px' }}>{new Set(txns.map(t=>t.customer_email).filter(Boolean)).size}</div>
                  <div style={{ fontSize:'12px', color:'rgba(237,240,247,0.4)' }}>unique customers</div>
                  <Link href={base + '/customers'} style={{ fontSize:'13px', fontWeight:600, color:'#F59E0B', textDecoration:'none', display:'block', marginTop:'10px' }}>View all →</Link>
                </div>
              )}
            </div>

            {/* 3. Where is my money? */}
            <div style={{ background:'#0D1120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'14px', padding:'20px' }}>
              <div style={{ fontSize:'11px', fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'rgba(245,158,11,0.6)', marginBottom:'12px' }}>Where is my money?</div>
              {loading ? <SkeletonCard height="60px" /> : connectedCount === 0 ? (
                <div>
                  <div style={{ fontSize:'13px', color:'rgba(237,240,247,0.5)', marginBottom:'10px', lineHeight:1.55 }}>No payout accounts connected. Add an account to receive your earnings.</div>
                  <Link href={base + '/accounts'} style={{ fontSize:'13px', fontWeight:600, color:'#F59E0B', textDecoration:'none' }}>Add payout account →</Link>
                </div>
              ) : (
                <div>
                  <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'28px', color:'#EDF0F7', marginBottom:'4px' }}>{connectedCount}</div>
                  <div style={{ fontSize:'12px', color:'rgba(237,240,247,0.4)', marginBottom:'8px' }}>payout {connectedCount === 1 ? 'account' : 'accounts'} connected</div>
                  <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                    {vendors.slice(0,3).map(v => (
                      <span key={v.vendor} style={{ fontSize:'11px', fontWeight:700, padding:'2px 8px', borderRadius:'100px', background:'rgba(245,158,11,0.1)', color:'#F59E0B', textTransform:'capitalize' }}>{v.vendor}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 4. What should I create next? */}
            <div style={{ background:'rgba(245,158,11,0.05)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:'14px', padding:'20px' }}>
              <div style={{ fontSize:'11px', fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'rgba(245,158,11,0.6)', marginBottom:'12px' }}>What should I create?</div>
              <div style={{ display:'grid', gap:'8px' }}>
                {[
                  { label:'Payment Link', desc:'Sell anything. Share anywhere.', href: base + '/create?type=link' },
                  { label:'Subscription', desc:'Monthly recurring income.',       href: base + '/create?type=subscription', soon:true },
                ].map(item => (
                  <Link key={item.label} href={item.href} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 12px', background:'rgba(255,255,255,0.04)', borderRadius:'8px', textDecoration:'none', opacity:item.soon?0.5:1 }}>
                    <div>
                      <div style={{ fontSize:'13px', fontWeight:600, color:'#EDF0F7' }}>{item.label}</div>
                      <div style={{ fontSize:'11px', color:'rgba(237,240,247,0.45)', marginTop:'2px' }}>{item.desc}</div>
                    </div>
                    {item.soon ? <span style={{ fontSize:'10px', fontWeight:700, color:'#F59E0B', background:'rgba(245,158,11,0.1)', padding:'2px 6px', borderRadius:'4px' }}>SOON</span>
                               : <span style={{ color:'rgba(237,240,247,0.4)', fontSize:'14px' }}>→</span>}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Attention */}
          {attention.length > 0 && (
            <div style={{ display:'grid', gap:'8px', marginBottom:'20px' }}>
              {attention.map((item, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', background: item.type==='warn'?'rgba(239,68,68,0.06)':'rgba(245,158,11,0.06)', border:'1px solid', borderColor: item.type==='warn'?'rgba(239,68,68,0.2)':'rgba(245,158,11,0.2)', borderRadius:'10px', gap:'12px' }}>
                  <span style={{ fontSize:'13px', color:'rgba(237,240,247,0.8)' }}>{item.msg}</span>
                  <Link href={base + item.href} style={{ fontSize:'12px', fontWeight:600, color: item.type==='warn'?'#EF4444':'#F59E0B', textDecoration:'none', whiteSpace:'nowrap' }}>{item.action} →</Link>
                </div>
              ))}
            </div>
          )}

          {/* Recent sales */}
          {txns.length > 0 && (
            <div style={{ background:'#0D1120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'12px', overflow:'hidden' }}>
              <div style={{ padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,0.05)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ fontSize:'13px', fontWeight:600, color:'#EDF0F7' }}>Recent sales</div>
                <Link href={base + '/money'} style={{ fontSize:'12px', color:'#F59E0B', textDecoration:'none', fontWeight:600 }}>View all →</Link>
              </div>
              {txns.map(t => (
                <div key={t.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'11px 16px', borderBottom:'1px solid rgba(255,255,255,0.03)' }}>
                  <div>
                    <div style={{ fontSize:'13px', fontWeight:500, color:'#EDF0F7' }}>{t.customer_email || 'Anonymous'}</div>
                    <div style={{ fontSize:'11px', color:'rgba(237,240,247,0.4)' }}>{t.created_at ? new Date(t.created_at).toLocaleDateString() : ''}</div>
                  </div>
                  <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'14px', color:'#F59E0B' }}>{t.currency} {t.amount?.toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ProjectLayout>
    )
  }

  // ── Build/Payroll overview (4-section format) ──────────────────────────────
  return (
    <ProjectLayout org={org} project={project}>
      <div style={{ maxWidth:'860px' }}>
        <div style={{ marginBottom:'28px' }}>
          <h1 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'22px', color:'#EDF0F7', marginBottom:'4px' }}>{project?.name || 'Overview'}</h1>
          <div style={{ fontSize:'13px', color:'rgba(237,240,247,0.45)' }}>{project?.live_mode ? '● Live' : '○ Sandbox'} · {project?.jurisdiction || 'KE'}</div>
        </div>

        {/* System Health */}
        <div style={{ marginBottom:'24px' }}>
          <div style={{ fontSize:'11px', fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'rgba(237,240,247,0.3)', marginBottom:'10px' }}>System health</div>
          {loading ? <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px' }}>{[0,1,2].map(i=><SkeletonCard key={i} height="70px"/>)}</div> : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px' }}>
              {[
                { icon: connectedCount>0?'●':'○', label: connectedCount>0?'Providers online':'No providers', sub: connectedCount+' connected', color: connectedCount>0?'#22C55E':'#F59E0B' },
                { icon:'◎', label: successRate?successRate+'% success':'No data', sub:'Payment success rate', color: successRate&&parseFloat(successRate)>95?'#22C55E':'#F59E0B' },
                { icon:'◈', label: project?.live_mode?'Live':'Sandbox', sub: project?.live_mode?'Real payments active':'Test mode only', color: project?.live_mode?'#22C55E':'#F59E0B' },
              ].map((s,i) => (
                <div key={i} style={{ background:'#0D1120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'10px', padding:'14px 16px', display:'flex', alignItems:'center', gap:'12px' }}>
                  <span style={{ fontSize:'16px', color:s.color }}>{s.icon}</span>
                  <div><div style={{ fontSize:'12px', fontWeight:700, color:s.color }}>{s.label}</div><div style={{ fontSize:'11px', color:'rgba(237,240,247,0.4)' }}>{s.sub}</div></div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Money */}
        <div style={{ marginBottom:'24px' }}>
          <div style={{ fontSize:'11px', fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'rgba(237,240,247,0.3)', marginBottom:'10px' }}>Money</div>
          {loading ? <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'10px' }}>{[0,1,2,3].map(i=><SkeletonCard key={i} height="80px"/>)}</div> : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'10px' }}>
              {[
                { label:'Total revenue', value:'KES '+(totalRevenue||0).toLocaleString(), color:'#EDF0F7' },
                { label:'Transactions', value:(totalTxns||0).toLocaleString(),             color:'#EDF0F7' },
                { label:'Failed',       value:(totalFailed||0).toLocaleString(),           color:totalFailed>0?'#EF4444':'#EDF0F7' },
                { label:'Tax estimated', value:taxDue>0?'KES '+taxDue.toLocaleString():'KES 0', color:taxDue>0?'#F59E0B':'#EDF0F7' },
              ].map(s => (
                <div key={s.label} style={{ background:'#0D1120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'10px', padding:'14px 16px' }}>
                  <div style={{ fontSize:'10px', fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'rgba(237,240,247,0.3)', marginBottom:'8px' }}>{s.label}</div>
                  <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'18px', color:s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Attention */}
        {attention.length > 0 && (
          <div style={{ marginBottom:'24px' }}>
            <div style={{ fontSize:'11px', fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'rgba(237,240,247,0.3)', marginBottom:'10px' }}>Attention required</div>
            <div style={{ display:'grid', gap:'8px' }}>
              {attention.map((item, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', background:item.type==='warn'?'rgba(239,68,68,0.06)':'rgba(245,158,11,0.06)', border:'1px solid', borderColor:item.type==='warn'?'rgba(239,68,68,0.2)':'rgba(245,158,11,0.2)', borderRadius:'10px', gap:'12px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                    <span style={{ fontSize:'14px', color:item.type==='warn'?'#EF4444':'#F59E0B' }}>{item.type==='warn'?'⚠':'ℹ'}</span>
                    <span style={{ fontSize:'13px', color:'rgba(237,240,247,0.8)' }}>{item.msg}</span>
                  </div>
                  <Link href={base+item.href} style={{ fontSize:'12px', fontWeight:600, color:item.type==='warn'?'#EF4444':'#F59E0B', textDecoration:'none', whiteSpace:'nowrap' }}>{item.action} →</Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div>
          <div style={{ fontSize:'11px', fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'rgba(237,240,247,0.3)', marginBottom:'10px' }}>Recent activity</div>
          <div style={{ background:'#0D1120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'12px', overflow:'hidden' }}>
            <div style={{ padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,0.05)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ fontSize:'12px', fontWeight:600, color:'rgba(237,240,247,0.6)' }}>Latest transactions</div>
              <Link href={base+'/payments'} style={{ fontSize:'12px', color:'#FF5C35', textDecoration:'none', fontWeight:600 }}>View all →</Link>
            </div>
            {loading ? [0,1,2,3,4].map(i=><SkeletonRow key={i}/>) : txns.length===0 ? (
              <EmptyState icon="⇅" title="No payments yet" desc="Connect a provider and make your first test transaction." actions={[{label:'Connect a provider',href:base+'/connections'},{label:'View docs',href:'/docs'}]} />
            ) : txns.map(t => (
              <div key={t.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'11px 16px', borderBottom:'1px solid rgba(255,255,255,0.03)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                  <span style={{ fontSize:'8px', color:t.status==='succeeded'?'#22C55E':t.status==='failed'?'#EF4444':'#F59E0B' }}>●</span>
                  <span style={{ fontSize:'13px', fontWeight:500, color:'#EDF0F7' }}>{t.currency} {t.amount?.toLocaleString()}</span>
                  <span style={{ fontSize:'12px', color:'rgba(237,240,247,0.45)', textTransform:'capitalize' }}>{t.vendor}</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                  <span style={{ fontSize:'12px', color:'rgba(237,240,247,0.4)' }}>{t.customer_email||'—'}</span>
                  <span style={{ fontSize:'11px', color:'rgba(237,240,247,0.3)' }}>{t.created_at?new Date(t.created_at).toLocaleDateString():''}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ProjectLayout>
  )
}
