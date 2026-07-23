'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '../../../../../lib/auth-context'
import { useApi } from '../../../../../lib/useApi'
import ProjectLayout from '../../../../../components/layouts/ProjectLayout'

const DESTINATIONS = [
  { id:'paypal',  name:'PayPal',   currency:'USD, EUR, GBP', color:'#009CDE', icon:'P', desc:'Global — fast for international customers', fields:[{key:'client_id',label:'Client ID'},{key:'client_secret',label:'Client Secret',secret:true}], link:'https://developer.paypal.com' },
  { id:'mpesa',   name:'M-Pesa',  currency:'KES',           color:'#00A550', icon:'M', desc:'Kenya — instant mobile money settlement',  fields:[{key:'consumer_key',label:'Consumer Key'},{key:'consumer_secret',label:'Consumer Secret',secret:true},{key:'shortcode',label:'Shortcode'},{key:'passkey',label:'Passkey',secret:true}], link:'https://developer.safaricom.co.ke' },
  { id:'stripe',  name:'Stripe',  currency:'USD, EUR, GBP+', color:'#635BFF', icon:'S', desc:'Global cards — widest currency support',  fields:[{key:'secret_key',label:'Secret Key',secret:true}], link:'https://dashboard.stripe.com/apikeys' },
  { id:'paystack',name:'Paystack',currency:'NGN, GHS, KES', color:'#0BA4DB', icon:'PS',desc:'West Africa — strong in Nigeria and Ghana', fields:[{key:'secret_key',label:'Secret Key',secret:true}], link:'https://dashboard.paystack.com' },
]

const STATUS_LABELS = {
  operational:        { label:'Connected',          color:'#22C55E' },
  validation_failed:  { label:'Check credentials',  color:'#EF4444' },
  disconnected:       { label:'Disconnected',        color:'#8892A4' },
}

export default function MoneyDestinationsPage() {
  const { orgId, projectId } = useParams()
  const { isLoaded, isSignedIn } = useAuth()
  const api = useApi()
  const router = useRouter()
  const [org, setOrg]         = useState(null)
  const [project, setProject] = useState(null)
  const [connected, setConnected] = useState({})
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(null)
  const [form, setForm]       = useState({})
  const [saving, setSaving]   = useState(false)
  const [healthChecking, setHealthChecking] = useState(null)

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) { router.push('/login'); return }
    Promise.all([
      api.get('/projects/project/' + projectId),
      api.get('/orgs/' + orgId),
    ]).then(([p, o]) => {
      setProject(p); setOrg(o)
      api.get('/vendors/' + projectId + '/vendors').then(vendors => {
        const map = {}
        vendors.forEach(v => { map[v.vendor] = v })
        setConnected(map)
      }).catch(() => {})
    }).catch(console.error).finally(() => setLoading(false))
  }, [isLoaded, isSignedIn])

  async function connect(dest) {
    setSaving(true)
    try {
      await api.post('/vendors/' + projectId + '/connect', { vendor: dest.id, credentials: form })
      const updated = await api.get('/vendors/' + projectId + '/vendors')
      const map = {}; updated.forEach(v => { map[v.vendor] = v })
      setConnected(map); setModal(null); setForm({})
    } catch (e) { alert(e.message) } finally { setSaving(false) }
  }

  async function runHealthCheck(vendorId) {
    setHealthChecking(vendorId)
    try {
      const r = await api.post('/vendors/' + projectId + '/health/' + vendorId, {})
      alert(r.operational ? `✓ ${vendorId} is operational (${r.latency_ms}ms)` : `✗ ${vendorId}: ${r.message}`)
    } catch (e) { alert(e.message) } finally { setHealthChecking(null) }
  }

  async function disconnect(vendorId) {
    if (!confirm('Disconnect ' + vendorId + '? You will stop receiving payouts to this account.')) return
    try {
      await api.del('/vendors/' + projectId + '/' + vendorId)
      setConnected(prev => { const n = {...prev}; delete n[vendorId]; return n })
    } catch (e) { alert(e.message) }
  }

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#07090F', color:'rgba(237,240,247,0.4)' }}>Loading...</div>

  const openDest = DESTINATIONS.find(d => d.id === modal)
  const connectedCount = Object.keys(connected).length

  return (
    <ProjectLayout org={org} project={project}>
      <div style={{ maxWidth:'720px' }}>
        <div style={{ marginBottom:'28px' }}>
          <h1 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'22px', color:'#EDF0F7', marginBottom:'6px' }}>Money Destinations</h1>
          <p style={{ fontSize:'14px', color:'rgba(237,240,247,0.55)', lineHeight:1.65 }}>
            Where your earnings go when someone pays you.
            Connect once — Konduyt routes your money automatically.
          </p>
        </div>

        {connectedCount === 0 && (
          <div style={{ background:'rgba(245,158,11,0.06)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:'12px', padding:'18px', marginBottom:'24px', fontSize:'13px', color:'rgba(237,240,247,0.7)', lineHeight:1.65 }}>
            <span style={{ fontWeight:700, color:'#F59E0B' }}>Start here:</span> Connect at least one account so you have somewhere to receive your earnings.
          </div>
        )}

        <div style={{ display:'grid', gap:'10px' }}>
          {DESTINATIONS.map(dest => {
            const conn = connected[dest.id]
            const statusInfo = STATUS_LABELS[conn?.status] || STATUS_LABELS.disconnected
            return (
              <div key={dest.id} style={{ display:'flex', alignItems:'center', gap:'16px', padding:'16px 18px', background:'#0D1120', border:'1px solid', borderColor: conn?.status === 'operational' ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.06)', borderRadius:'12px' }}>
                {/* Icon */}
                <div style={{ width:'40px', height:'40px', borderRadius:'10px', background:dest.color+'18', border:'1px solid '+dest.color+'30', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:700, color:dest.color, flexShrink:0 }}>
                  {dest.icon}
                </div>

                {/* Info */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'3px' }}>
                    <div style={{ fontSize:'14px', fontWeight:600, color:'#EDF0F7' }}>{dest.name}</div>
                    {conn && <span style={{ fontSize:'11px', fontWeight:700, color:statusInfo.color }}>{statusInfo.label}</span>}
                  </div>
                  <div style={{ fontSize:'12px', color:'rgba(237,240,247,0.45)' }}>{dest.desc}</div>
                  <div style={{ fontSize:'11px', color:'rgba(237,240,247,0.3)', marginTop:'2px' }}>Currencies: {dest.currency}</div>
                  {conn?.last_health_check_at && (
                    <div style={{ fontSize:'11px', color:'rgba(237,240,247,0.3)', marginTop:'2px' }}>
                      Last checked: {new Date(conn.last_health_check_at).toLocaleDateString()}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display:'flex', gap:'8px', alignItems:'center', flexShrink:0 }}>
                  {conn ? (
                    <>
                      <button onClick={() => runHealthCheck(dest.id)} disabled={healthChecking === dest.id} style={{ fontSize:'11px', color:'rgba(237,240,247,0.5)', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', padding:'5px 10px', borderRadius:'6px', cursor:'pointer', opacity:healthChecking===dest.id?0.5:1 }}>
                        {healthChecking===dest.id?'Checking...':'Check'}
                      </button>
                      <button onClick={() => { setModal(dest.id); setForm({}) }} style={{ fontSize:'11px', color:'rgba(237,240,247,0.5)', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', padding:'5px 10px', borderRadius:'6px', cursor:'pointer' }}>
                        Update
                      </button>
                      <button onClick={() => disconnect(dest.id)} style={{ fontSize:'11px', color:'rgba(239,68,68,0.6)', background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.15)', padding:'5px 10px', borderRadius:'6px', cursor:'pointer' }}>
                        Remove
                      </button>
                    </>
                  ) : (
                    <button onClick={() => { setModal(dest.id); setForm({}) }} style={{ fontSize:'13px', fontWeight:600, color:'#F59E0B', background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.2)', padding:'8px 18px', borderRadius:'100px', cursor:'pointer' }}>
                      Connect
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ marginTop:'20px', padding:'14px 16px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'10px', fontSize:'12px', color:'rgba(237,240,247,0.45)', lineHeight:1.65 }}>
          Your credentials are encrypted and never displayed after setup. Konduyt uses them only to route your earnings.
        </div>
      </div>

      {/* Connect modal */}
      {openDest && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:500, padding:'20px' }} onClick={() => setModal(null)}>
          <div style={{ background:'#0D1120', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'16px', width:'100%', maxWidth:'400px' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding:'18px 20px', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'15px', color:'#EDF0F7' }}>Connect {openDest.name}</div>
              <button onClick={() => setModal(null)} style={{ background:'none', border:'none', color:'rgba(237,240,247,0.4)', fontSize:'20px', cursor:'pointer' }}>×</button>
            </div>
            <div style={{ padding:'20px', display:'grid', gap:'14px' }}>
              {openDest.fields.map(f => (
                <div key={f.key}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'6px' }}>
                    <label style={{ fontSize:'12px', fontWeight:600, color:'rgba(237,240,247,0.6)', textTransform:'uppercase', letterSpacing:'.06em' }}>{f.label}</label>
                    <a href={openDest.link} target="_blank" rel="noopener" style={{ fontSize:'11px', color:'#F59E0B', textDecoration:'none' }}>Where to find →</a>
                  </div>
                  <input value={form[f.key]||''} onChange={e => setForm(p => ({...p, [f.key]: e.target.value}))}
                    type={f.secret ? 'password' : 'text'} placeholder={f.label}
                    style={{ width:'100%', padding:'9px 12px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'7px', color:'#EDF0F7', fontSize:'13px', outline:'none', boxSizing:'border-box' }} />
                </div>
              ))}
            </div>
            <div style={{ padding:'14px 20px', borderTop:'1px solid rgba(255,255,255,0.07)', display:'flex', gap:'10px', justifyContent:'flex-end' }}>
              <button onClick={() => setModal(null)} style={{ padding:'9px 16px', background:'none', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'7px', color:'rgba(237,240,247,0.5)', fontSize:'13px', cursor:'pointer' }}>Cancel</button>
              <button onClick={() => connect(openDest)} disabled={saving} style={{ padding:'9px 20px', background:'#F59E0B', color:'#fff', border:'none', borderRadius:'7px', fontSize:'13px', fontWeight:600, cursor:'pointer', opacity:saving?0.6:1 }}>
                {saving ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ProjectLayout>
  )
}
