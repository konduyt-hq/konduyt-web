'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { useApi } from '../../../../../lib/useApi'
import BuildLayout from '../../../../../components/layouts/ProjectLayout'

const MODES = [
  { id:'fastest',   label:'Always Fastest',          desc:'Route to the provider with the lowest average settlement time for this currency.', icon:'⚡' },
  { id:'cheapest',  label:'Always Cheapest',          desc:'Route to the provider with the lowest processing fee for this transaction.', icon:'◎' },
  { id:'success',   label:'Highest Success Rate',     desc:'Route to the provider with the highest recent success rate for this region.', icon:'✓' },
  { id:'custom',    label:'Custom Rules',             desc:'Define your own routing logic with fallback chains.', icon:'⇢' },
]

const CURRENCIES = [
  { code:'KES', name:'Kenyan Shilling',    providers:['mpesa','stripe','paystack'] },
  { code:'NGN', name:'Nigerian Naira',     providers:['paystack','flutterwave','stripe'] },
  { code:'USD', name:'US Dollar',          providers:['stripe','paypal','razorpay'] },
  { code:'INR', name:'Indian Rupee',       providers:['razorpay','stripe','paypal'] },
  { code:'BRL', name:'Brazilian Real',     providers:['pix','stripe','paypal'] },
  { code:'GHS', name:'Ghanaian Cedi',      providers:['paystack','flutterwave'] },
]

export default function SmartRoutingPage() {
  const { orgId, projectId } = useParams()
  const { isLoaded, isSignedIn } = useAuth()
  const api = useApi()
  const router = useRouter()
  const [org, setOrg]         = useState(null)
  const [project, setProject] = useState(null)
  const [mode, setMode]       = useState('success')
  const [rules, setRules]     = useState([
    { currency:'KES', chain:['mpesa','stripe','paypal'] },
    { currency:'USD', chain:['stripe','paypal'] },
  ])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) { router.push('/login'); return }
    Promise.all([
      api.get('/projects/project/' + projectId),
      api.get('/orgs/' + orgId),
    ]).then(([p, o]) => { setProject(p); setOrg(o) })
     .catch(console.error)
     .finally(() => setLoading(false))
  }, [isLoaded, isSignedIn, projectId, orgId])

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#07090F', color:'rgba(237,240,247,0.4)' }}>Loading...</div>

  return (
    <ProjectLayout org={org} project={project}>
      <div style={{ maxWidth:'720px' }}>

        <div style={{ marginBottom:'32px' }}>
          <h1 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'22px', color:'#EDF0F7', marginBottom:'6px' }}>Smart Routing</h1>
          <p style={{ fontSize:'14px', color:'rgba(237,240,247,0.5)', lineHeight:1.65 }}>
            Define how Konduyt selects the best payment provider for every transaction. Rules apply in real-time based on live provider performance data.
          </p>
        </div>

        {/* Mode selector */}
        <div style={{ marginBottom:'32px' }}>
          <div style={{ fontSize:'12px', fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'rgba(237,240,247,0.4)', marginBottom:'12px' }}>Routing mode</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
            {MODES.map(m => (
              <button key={m.id} onClick={() => setMode(m.id)} style={{
                padding:'16px', background: mode === m.id ? 'rgba(255,92,53,0.1)' : '#0D1120',
                border: mode === m.id ? '1px solid rgba(255,92,53,0.4)' : '1px solid rgba(255,255,255,0.06)',
                borderRadius:'10px', cursor:'pointer', textAlign:'left', transition:'all .15s',
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'6px' }}>
                  <span style={{ fontSize:'16px' }}>{m.icon}</span>
                  <span style={{ fontSize:'13px', fontWeight:600, color: mode === m.id ? '#FF5C35' : '#EDF0F7' }}>{m.label}</span>
                </div>
                <div style={{ fontSize:'12px', color:'rgba(237,240,247,0.45)', lineHeight:1.5 }}>{m.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Custom rules */}
        {mode === 'custom' && (
          <div style={{ marginBottom:'32px' }}>
            <div style={{ fontSize:'12px', fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'rgba(237,240,247,0.4)', marginBottom:'12px' }}>Routing rules</div>
            <div style={{ display:'grid', gap:'10px' }}>
              {rules.map((rule, i) => {
                const curr = CURRENCIES.find(c => c.code === rule.currency)
                return (
                  <div key={i} style={{ background:'#0D1120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'10px', padding:'16px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'12px', flexWrap:'wrap' }}>
                      <div style={{ fontSize:'13px', fontWeight:700, color:'#EDF0F7', minWidth:'40px' }}>{rule.currency}</div>
                      <div style={{ display:'flex', alignItems:'center', gap:'6px', flex:1, flexWrap:'wrap' }}>
                        {rule.chain.map((p, pi) => (
                          <span key={pi} style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                            {pi > 0 && <span style={{ fontSize:'11px', color:'rgba(237,240,247,0.3)' }}>→ fallback</span>}
                            <span style={{ fontSize:'12px', fontWeight:600, color:'#EDF0F7', background:'rgba(255,255,255,0.07)', padding:'4px 10px', borderRadius:'6px' }}>
                              {p}
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>
                    {rule.chain[0] === 'mpesa' && (
                      <div style={{ marginTop:'8px', fontSize:'11px', color:'rgba(34,197,94,0.7)' }}>
                        ● M-Pesa — 99.1% success rate today · fastest for KES
                      </div>
                    )}
                  </div>
                )
              })}
              <button onClick={() => {}} style={{ padding:'12px', background:'rgba(255,255,255,0.03)', border:'1px dashed rgba(255,255,255,0.1)', borderRadius:'10px', color:'rgba(237,240,247,0.4)', fontSize:'13px', cursor:'pointer' }}>
                + Add rule
              </button>
            </div>
          </div>
        )}

        {/* Live performance preview */}
        <div style={{ background:'#0D1120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'12px', overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', borderBottom:'1px solid rgba(255,255,255,0.05)', fontSize:'12px', fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'rgba(237,240,247,0.4)' }}>
            Live provider performance
          </div>
          {[
            { provider:'M-Pesa',      currency:'KES', success:'99.1%', speed:'4s',   fee:'1.5%', recommended: true  },
            { provider:'Stripe',      currency:'USD', success:'98.4%', speed:'2s',   fee:'2.9%', recommended: false },
            { provider:'Paystack',    currency:'NGN', success:'97.8%', speed:'6s',   fee:'1.5%', recommended: false },
            { provider:'Flutterwave', currency:'NGN', success:'71.2%', speed:'12s',  fee:'1.4%', recommended: false, warn: true },
          ].map((row, i) => (
            <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr auto auto auto auto', gap:'12px', alignItems:'center', padding:'12px 18px', borderBottom:'1px solid rgba(255,255,255,0.03)', opacity: row.warn ? 0.5 : 1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                <span style={{ fontSize:'8px', color: row.warn ? '#EF4444' : '#22C55E' }}>●</span>
                <span style={{ fontSize:'13px', fontWeight:500, color:'#EDF0F7' }}>{row.provider}</span>
                {row.recommended && <span style={{ fontSize:'10px', fontWeight:700, color:'#FF5C35', background:'rgba(255,92,53,0.1)', padding:'1px 6px', borderRadius:'4px' }}>⭐ Recommended</span>}
              </div>
              <span style={{ fontSize:'12px', color:'rgba(237,240,247,0.5)' }}>{row.currency}</span>
              <span style={{ fontSize:'12px', color: parseFloat(row.success) > 95 ? '#22C55E' : '#F59E0B' }}>{row.success}</span>
              <span style={{ fontSize:'12px', color:'rgba(237,240,247,0.5)' }}>{row.speed}</span>
              <span style={{ fontSize:'12px', color:'rgba(237,240,247,0.5)' }}>{row.fee}</span>
            </div>
          ))}
        </div>

        <div style={{ display:'flex', justifyContent:'flex-end', marginTop:'20px' }}>
          <button style={{ padding:'11px 24px', background:'#FF5C35', color:'#fff', border:'none', borderRadius:'100px', fontSize:'13px', fontWeight:600, cursor:'pointer' }}>
            Save routing rules
          </button>
        </div>

      </div>
    </ProjectLayout>
  )
}
