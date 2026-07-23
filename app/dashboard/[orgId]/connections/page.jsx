'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '../../../../lib/auth-context'
import { useApi } from '../../../../lib/useApi'
import BuildLayout from '../../../../components/layouts/BuildLayout'

const ALL_PROVIDERS = [
  { id:'stripe',      name:'Stripe',      region:'Global cards',    color:'#635BFF', icon:'S', fields:[{key:'secret_key',label:'Secret Key',placeholder:'sk_live_...',link:'https://dashboard.stripe.com/apikeys'}] },
  { id:'paypal',      name:'PayPal',      region:'Global',          color:'#009CDE', icon:'P', fields:[{key:'client_id',label:'Client ID',placeholder:'AYj...',link:'https://developer.paypal.com'},{key:'client_secret',label:'Client Secret',placeholder:'secret',link:'https://developer.paypal.com'}] },
  { id:'mpesa',       name:'M-Pesa',      region:'East Africa',     color:'#00A550', icon:'M', fields:[{key:'consumer_key',label:'Consumer Key',placeholder:'key',link:'https://developer.safaricom.co.ke'},{key:'consumer_secret',label:'Consumer Secret',placeholder:'secret',link:'https://developer.safaricom.co.ke'},{key:'shortcode',label:'Shortcode',placeholder:'174379',link:'https://developer.safaricom.co.ke'},{key:'passkey',label:'Passkey',placeholder:'key',link:'https://developer.safaricom.co.ke'}] },
  { id:'flutterwave', name:'Flutterwave', region:'Africa',          color:'#F5A623', icon:'F', fields:[{key:'secret_key',label:'Secret Key',placeholder:'FLWSECK-...',link:'https://dashboard.flutterwave.com'}] },
  { id:'razorpay',    name:'Razorpay',    region:'India',           color:'#2D9EE0', icon:'R', fields:[{key:'key_id',label:'Key ID',placeholder:'rzp_live_...',link:'https://dashboard.razorpay.com'},{key:'key_secret',label:'Key Secret',placeholder:'secret',link:'https://dashboard.razorpay.com'}] },
  { id:'grabpay',     name:'GrabPay',     region:'Southeast Asia',  color:'#00B14F', icon:'G', fields:[{key:'partner_id',label:'Partner ID',placeholder:'partner-...',link:'https://developer.grab.com'},{key:'partner_secret',label:'Secret',placeholder:'secret',link:'https://developer.grab.com'}] },
  { id:'pix',         name:'PIX',         region:'Brazil',          color:'#32BCAD', icon:'X', fields:[{key:'client_id',label:'Client ID',placeholder:'id',link:'https://developers.gerencianet.com.br'},{key:'client_secret',label:'Client Secret',placeholder:'secret',link:'https://developers.gerencianet.com.br'}] },
  { id:'paystack',    name:'Paystack',    region:'West Africa',     color:'#0BA4DB', icon:'PS', fields:[{key:'secret_key',label:'Secret Key',placeholder:'sk_live_...',link:'https://dashboard.paystack.com'}] },
]

export default function ConnectionsPage() {
  const { orgId } = useParams()
  const { isLoaded, isSignedIn } = useAuth()
  const api = useApi()
  const router = useRouter()
  const [org, setOrg]         = useState(null)
  const [projects, setProjects] = useState([])
  const [connected, setConnected] = useState({})
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(null)
  const [form, setForm]       = useState({})
  const [saving, setSaving]   = useState(false)

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) { router.push('/login'); return }
    Promise.all([
      api.get('/orgs/' + orgId),
      api.get('/projects/' + orgId + '/projects'),
    ]).then(([o, p]) => {
      setOrg(o); setProjects(p)
      if (p.length > 0) {
        api.get('/vendors/' + p[0].id + '/vendors').then(vendors => {
          const map = {}
          vendors.forEach(v => { map[v.vendor] = v })
          setConnected(map)
        }).catch(() => {})
      }
    }).catch(console.error).finally(() => setLoading(false))
  }, [isLoaded, isSignedIn, orgId])

  async function connect(provider) {
    if (projects.length === 0) { alert('Create a project first'); return }
    setSaving(true)
    try {
      await api.post('/vendors/' + projects[0].id + '/connect', { vendor: provider.id, credentials: form })
      setConnected(prev => ({ ...prev, [provider.id]: { vendor: provider.id, status: 'operational' } }))
      setModal(null); setForm({})
    } catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#07090F', color:'rgba(237,240,247,0.4)' }}>Loading...</div>

  const openProvider = ALL_PROVIDERS.find(p => p.id === modal)

  return (
    <BuildLayout org={org} project={projects[0]}>
      <div style={{ maxWidth:'760px' }}>
        <div style={{ marginBottom:'32px' }}>
          <h1 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'22px', color:'#EDF0F7', marginBottom:'6px' }}>Connections</h1>
          <p style={{ fontSize:'14px', color:'rgba(237,240,247,0.5)', lineHeight:1.65 }}>
            Connect your payment providers once here. All Konduyt products — Build, Creator, and Payroll — share these connections automatically.
          </p>
        </div>

        <div style={{ display:'grid', gap:'8px' }}>
          {ALL_PROVIDERS.map(provider => {
            const conn = connected[provider.id]
            return (
              <div key={provider.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', background:'#0D1120', border:'1px solid', borderColor: conn ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.06)', borderRadius:'10px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                  <div style={{ width:'36px', height:'36px', borderRadius:'8px', background: provider.color + '18', border:'1px solid ' + provider.color + '30', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:700, color: provider.color, flexShrink:0 }}>{provider.icon}</div>
                  <div>
                    <div style={{ fontSize:'13px', fontWeight:600, color:'#EDF0F7' }}>{provider.name}</div>
                    <div style={{ fontSize:'11px', color:'rgba(237,240,247,0.4)' }}>{provider.region}</div>
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                  {conn ? (
                    <>
                      <span style={{ fontSize:'12px', fontWeight:600, color:'#22C55E' }}>● Connected</span>
                      <button onClick={() => {}} style={{ fontSize:'12px', color:'rgba(237,240,247,0.4)', background:'none', border:'1px solid rgba(255,255,255,0.07)', padding:'5px 10px', borderRadius:'6px', cursor:'pointer' }}>Reconnect</button>
                    </>
                  ) : (
                    <button onClick={() => { setModal(provider.id); setForm({}) }} style={{ fontSize:'12px', fontWeight:600, color:'#EDF0F7', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', padding:'6px 14px', borderRadius:'6px', cursor:'pointer' }}>Connect</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ marginTop:'24px', padding:'16px', background:'rgba(255,92,53,0.06)', border:'1px solid rgba(255,92,53,0.15)', borderRadius:'10px', fontSize:'13px', color:'rgba(237,240,247,0.6)', lineHeight:1.65 }}>
          Connections are shared across your entire workspace. Connect once. Use everywhere.
        </div>
      </div>

      {/* Connect modal */}
      {openProvider && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:500, padding:'20px' }} onClick={() => setModal(null)}>
          <div style={{ background:'#0D1120', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'16px', width:'100%', maxWidth:'420px', overflow:'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding:'18px 20px', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'15px', color:'#EDF0F7' }}>Connect {openProvider.name}</div>
              <button onClick={() => setModal(null)} style={{ background:'none', border:'none', color:'rgba(237,240,247,0.4)', fontSize:'18px', cursor:'pointer' }}>×</button>
            </div>
            <div style={{ padding:'20px', display:'grid', gap:'14px' }}>
              {openProvider.fields.map(f => (
                <div key={f.key}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'6px' }}>
                    <label style={{ fontSize:'12px', fontWeight:600, color:'rgba(237,240,247,0.7)', textTransform:'uppercase', letterSpacing:'.06em' }}>{f.label}</label>
                    <a href={f.link} target="_blank" rel="noopener" style={{ fontSize:'11px', color:'#FF5C35', textDecoration:'none' }}>Where to find →</a>
                  </div>
                  <input value={form[f.key] || ''} onChange={e => setForm(prev => ({...prev, [f.key]: e.target.value}))}
                    placeholder={f.placeholder} type={f.key.includes('secret') || f.key.includes('passkey') || f.key.includes('key_secret') ? 'password' : 'text'}
                    style={{ width:'100%', padding:'9px 12px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'7px', color:'#EDF0F7', fontSize:'13px', outline:'none', boxSizing:'border-box' }} />
                </div>
              ))}
            </div>
            <div style={{ padding:'14px 20px', borderTop:'1px solid rgba(255,255,255,0.07)', display:'flex', gap:'10px', justifyContent:'flex-end' }}>
              <button onClick={() => setModal(null)} style={{ padding:'9px 16px', background:'none', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'7px', color:'rgba(237,240,247,0.5)', fontSize:'13px', cursor:'pointer' }}>Cancel</button>
              <button onClick={() => connect(openProvider)} disabled={saving} style={{ padding:'9px 20px', background:'#FF5C35', color:'#fff', border:'none', borderRadius:'7px', fontSize:'13px', fontWeight:600, cursor:'pointer', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          </div>
        </div>
      )}
    </BuildLayout>
  )
}
