'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { useApi } from '../../../../../lib/useApi'
import ProjectLayout from '../../../../../components/layouts/ProjectLayout'
import { SkeletonCard } from '../../../../../components/ui/Skeleton'
import EmptyState from '../../../../../components/ui/EmptyState'
import Link from 'next/link'

const PROVIDER_META = {
  stripe:      { color:'#635BFF', region:'Global',          currencies:['USD','EUR','GBP','AUD','CAD'], fee:'2.9% + 30¢' },
  paypal:      { color:'#009CDE', region:'Global',          currencies:['USD','EUR','GBP','AUD'],      fee:'3.49% + fixed' },
  mpesa:       { color:'#00A550', region:'East Africa',     currencies:['KES','TZS','UGX'],            fee:'1.5%' },
  flutterwave: { color:'#F5A623', region:'Africa',          currencies:['NGN','GHS','KES','ZAR'],      fee:'1.4%' },
  razorpay:    { color:'#2D9EE0', region:'India',           currencies:['INR'],                        fee:'2%' },
  paystack:    { color:'#0BA4DB', region:'West Africa',     currencies:['NGN','GHS','ZAR','KES'],      fee:'1.5%' },
  grabpay:     { color:'#00B14F', region:'Southeast Asia',  currencies:['SGD','MYR','PHP','THB'],      fee:'2%' },
  pix:         { color:'#32BCAD', region:'Brazil',          currencies:['BRL'],                        fee:'0.99%' },
}

function StatusDot({ rate }) {
  const color = rate >= 97 ? '#22C55E' : rate >= 90 ? '#F59E0B' : '#EF4444'
  const label = rate >= 97 ? 'Operational' : rate >= 90 ? 'Degraded' : 'Down'
  return <span style={{ display:'inline-flex', alignItems:'center', gap:'5px', fontSize:'12px', fontWeight:600, color }}><span style={{ fontSize:'8px' }}>●</span>{label}</span>
}

export default function ProvidersPage() {
  const { orgId, projectId } = useParams()
  const { isLoaded, isSignedIn } = useAuth()
  const api = useApi()
  const router = useRouter()
  const [org, setOrg]         = useState(null)
  const [project, setProject] = useState(null)
  const [vendors, setVendors] = useState([])
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
      return Promise.allSettled([
        api.get('/vendors/' + projectId + '/vendors'),
        api.get('/transactions/' + projectId + '/summary'),
      ])
    }).then(([v, s]) => {
      if (v.status === 'fulfilled') setVendors(v.value)
      if (s.status === 'fulfilled') setSummary(s.value)
    }).catch(console.error).finally(() => setLoading(false))
  }, [isLoaded, isSignedIn])

  const base = '/dashboard/' + orgId + '/' + projectId

  // Merge live summary with static meta
  const enriched = vendors.map(v => {
    const perf  = summary?.vendors?.find(s => s.vendor === v.vendor)
    const meta  = PROVIDER_META[v.vendor] || {}
    const total = (perf?.successful || 0) + (perf?.failed || 0)
    const rate  = total > 0 ? Math.round(perf.successful / total * 100) : 99
    return { ...v, ...meta, successRate: rate, txnCount: total, volume: perf?.total_processed || 0 }
  })

  return (
    <ProjectLayout org={org} project={project}>
      <div style={{ maxWidth:'860px' }}>
        <div style={{ marginBottom:'28px' }}>
          <h1 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'22px', color:'#EDF0F7', marginBottom:'6px' }}>Provider Health</h1>
          <p style={{ fontSize:'14px', color:'rgba(237,240,247,0.5)', lineHeight:1.65 }}>
            Real-time performance data for your connected payment providers.
            Konduyt uses this intelligence to route every payment to the best available option.
          </p>
        </div>

        {loading ? (
          <div style={{ display:'grid', gap:'12px' }}>
            {[0,1,2].map(i => <SkeletonCard key={i} height="120px" />)}
          </div>
        ) : enriched.length === 0 ? (
          <EmptyState
            icon="∞"
            title="No providers connected"
            desc="Connect at least one payment provider to see health data and enable Konduyt's routing intelligence."
            actions={[{ label:'Connect a provider', href: base + '/connections' }]}
          />
        ) : (
          <div style={{ display:'grid', gap:'12px' }}>
            {enriched.map(provider => (
              <div key={provider.id} style={{ background:'#0D1120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'12px', padding:'20px' }}>
                <div style={{ display:'grid', gridTemplateColumns:'auto 1fr auto', gap:'16px', alignItems:'center', marginBottom:'16px' }}>
                  <div style={{ width:'40px', height:'40px', borderRadius:'10px', background:(provider.color||'#635BFF')+'18', border:'1px solid '+(provider.color||'#635BFF')+'30', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:700, color:provider.color||'#635BFF', flexShrink:0, textTransform:'uppercase' }}>
                    {provider.vendor?.slice(0,2)}
                  </div>
                  <div>
                    <div style={{ fontSize:'14px', fontWeight:700, color:'#EDF0F7', textTransform:'capitalize', marginBottom:'2px' }}>{provider.vendor}</div>
                    <div style={{ fontSize:'12px', color:'rgba(237,240,247,0.45)' }}>{provider.region || 'Global'}</div>
                  </div>
                  <StatusDot rate={provider.successRate} />
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'12px' }}>
                  {[
                    { label:'Success rate', value:provider.successRate + '%',          color: provider.successRate >= 97 ? '#22C55E' : '#F59E0B' },
                    { label:'Total volume', value:'KES ' + (provider.volume||0).toLocaleString(), color:'#EDF0F7' },
                    { label:'Transactions', value:(provider.txnCount||0).toLocaleString(),  color:'#EDF0F7' },
                    { label:'Processing fee', value:provider.fee || '—',              color:'rgba(237,240,247,0.7)' },
                    { label:'Currencies',   value:(provider.currencies||[]).slice(0,3).join(', '), color:'rgba(237,240,247,0.7)' },
                  ].map(s => (
                    <div key={s.label}>
                      <div style={{ fontSize:'10px', fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'rgba(237,240,247,0.3)', marginBottom:'5px' }}>{s.label}</div>
                      <div style={{ fontSize:'13px', fontWeight:600, color:s.color }}>{s.value}</div>
                    </div>
                  ))}
                </div>

                {/* Success rate bar */}
                <div style={{ marginTop:'14px', height:'3px', background:'rgba(255,255,255,0.06)', borderRadius:'2px', overflow:'hidden' }}>
                  <div style={{ height:'100%', background: provider.successRate >= 97 ? '#22C55E' : '#F59E0B', borderRadius:'2px', width:provider.successRate+'%', transition:'width .4s' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop:'20px', padding:'14px 16px', background:'rgba(255,92,53,0.05)', border:'1px solid rgba(255,92,53,0.12)', borderRadius:'10px', fontSize:'13px', color:'rgba(237,240,247,0.55)', lineHeight:1.65 }}>
          Konduyt monitors these providers in real-time and routes every payment to the highest-performing option automatically.
          Configure routing rules in <Link href={base + '/routing'} style={{ color:'#FF5C35', textDecoration:'none', fontWeight:600 }}>Smart Routing →</Link>
        </div>
      </div>
    </ProjectLayout>
  )
}
