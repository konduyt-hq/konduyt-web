'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { useApi } from '../../../../../lib/useApi'
import ProjectLayout from '../../../../../components/layouts/ProjectLayout'

const PROVIDERS = [
  { id:'stripe',      name:'Stripe',      region:'Global cards',    color:'#635BFF', icon:'S', fields:[{key:'secret_key',label:'Secret Key',placeholder:'sk_live_...',link:'https://dashboard.stripe.com/apikeys'}] },
  { id:'mpesa',       name:'M-Pesa',      region:'East Africa',     color:'#00A550', icon:'M', fields:[{key:'consumer_key',label:'Consumer Key',placeholder:'key'},{key:'consumer_secret',label:'Consumer Secret',placeholder:'secret'},{key:'shortcode',label:'Shortcode',placeholder:'174379'},{key:'passkey',label:'Passkey',placeholder:'key'}] },
  { id:'paypal',      name:'PayPal',      region:'Global',          color:'#009CDE', icon:'P', fields:[{key:'client_id',label:'Client ID',placeholder:'AYj...'},{key:'client_secret',label:'Client Secret',placeholder:'secret'}] },
  { id:'flutterwave', name:'Flutterwave', region:'Africa',          color:'#F5A623', icon:'F', fields:[{key:'secret_key',label:'Secret Key',placeholder:'FLWSECK-...'}] },
  { id:'razorpay',    name:'Razorpay',    region:'India',           color:'#2D9EE0', icon:'R', fields:[{key:'key_id',label:'Key ID',placeholder:'rzp_live_...'},{key:'key_secret',label:'Key Secret',placeholder:'secret'}] },
  { id:'paystack',    name:'Paystack',    region:'West Africa',     color:'#0BA4DB', icon:'PS', fields:[{key:'secret_key',label:'Secret Key',placeholder:'sk_live_...'}] },
  { id:'grabpay',     name:'GrabPay',     region:'Southeast Asia',  color:'#00B14F', icon:'G', fields:[{key:'partner_id',label:'Partner ID',placeholder:'partner-...'},{key:'partner_secret',label:'Secret',placeholder:'secret'}] },
  { id:'pix',         name:'PIX',         region:'Brazil',          color:'#32BCAD', icon:'X', fields:[{key:'client_id',label:'Client ID',placeholder:'id'},{key:'client_secret',label:'Client Secret',placeholder:'secret'}] },
]

export default function ConnectionsPage() {
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
  const [disconnecting, setDisconnecting] = useState(null)

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

  async function connect(provider) {
    setSaving(true)
    try {
      await api.post('/vendors/' + projectId + '/connect', { vendor: provider.id, credentials: form })
      setConnected(prev => ({ ...prev, [provider.id]: { vendor: provider.id, status: 'operational' } }))
      setModal(null); setForm({})
    } catch (e) { alert(e.message) } finally { setSaving(false) }
  }

  async function disconnect(vendorId) {
    if (!confirm('Disconnect ' + vendorId + '?')) return
    setDisconnecting(vendorId)
    try {
      await api.del('/vendors/' + projectId + '/' + vendorId)
      setConnected(prev => { const n = {...prev}; delete n[vendorId]; return n })
    } catch (e) { alert(e.message) } finally { setDisconnecting(null) }
  }

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:'#07090F',color:'rgba(237,240,247,0.4)'}}>Loading...</div>

  const openProvider = PROVIDERS.find(p => p.id === modal)
  const connectedCount = Object.keys(connected).length

  return (
    <ProjectLayout org={org} project={project}>
      <div style={{maxWidth:'720px'}}>
        <div style={{marginBottom:'28px'}}>
          <h1 style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:'22px',color:'#EDF0F7',marginBottom:'6px'}}>Connections</h1>
          <p style={{fontSize:'14px',color:'rgba(237,240,247,0.5)',lineHeight:1.65}}>
            Connect your payment providers. {connectedCount > 0 ? connectedCount + ' connected.' : 'No providers connected yet.'}
            {connectedCount === 0 && ' Connect at least one to start processing payments.'}
          </p>
        </div>

        <div style={{display:'grid',gap:'8px'}}>
          {PROVIDERS.map(provider => {
            const conn = connected[provider.id]
            return (
              <div key={provider.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 18px',background:'#0D1120',border:'1px solid',borderColor:conn?'rgba(34,197,94,0.2)':'rgba(255,255,255,0.06)',borderRadius:'10px',transition:'border-color .15s'}}>
                <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                  <div style={{width:'36px',height:'36px',borderRadius:'8px',background:provider.color+'18',border:'1px solid '+provider.color+'30',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'11px',fontWeight:700,color:provider.color,flexShrink:0}}>
                    {provider.icon}
                  </div>
                  <div>
                    <div style={{fontSize:'13px',fontWeight:600,color:'#EDF0F7'}}>{provider.name}</div>
                    <div style={{fontSize:'11px',color:'rgba(237,240,247,0.4)',marginTop:'1px'}}>{provider.region}</div>
                  </div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                  {conn ? (
                    <>
                      <span style={{fontSize:'12px',fontWeight:600,color:'#22C55E'}}>● Connected</span>
                      <button onClick={()=>{setModal(provider.id);setForm({})}} style={{fontSize:'11px',color:'rgba(237,240,247,0.45)',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)',padding:'4px 10px',borderRadius:'6px',cursor:'pointer'}}>Reconnect</button>
                      <button onClick={()=>disconnect(provider.id)} disabled={disconnecting===provider.id} style={{fontSize:'11px',color:'rgba(239,68,68,0.7)',background:'rgba(239,68,68,0.06)',border:'1px solid rgba(239,68,68,0.15)',padding:'4px 10px',borderRadius:'6px',cursor:'pointer'}}>
                        {disconnecting===provider.id?'...':'Disconnect'}
                      </button>
                    </>
                  ) : (
                    <button onClick={()=>{setModal(provider.id);setForm({})}} style={{fontSize:'12px',fontWeight:600,color:'#EDF0F7',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',padding:'7px 16px',borderRadius:'100px',cursor:'pointer'}}>
                      Connect
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div style={{marginTop:'20px',padding:'14px 16px',background:'rgba(255,92,53,0.05)',border:'1px solid rgba(255,92,53,0.12)',borderRadius:'10px',fontSize:'13px',color:'rgba(237,240,247,0.55)',lineHeight:1.65}}>
          These connections are used by all Konduyt products in this project.
          Connect once — available for payments, payroll, and creator earnings.
        </div>
      </div>

      {openProvider && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:500,padding:'20px'}} onClick={()=>setModal(null)}>
          <div style={{background:'#0D1120',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'16px',width:'100%',maxWidth:'400px'}} onClick={e=>e.stopPropagation()}>
            <div style={{padding:'18px 20px',borderBottom:'1px solid rgba(255,255,255,0.07)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:'15px',color:'#EDF0F7'}}>Connect {openProvider.name}</div>
              <button onClick={()=>setModal(null)} style={{background:'none',border:'none',color:'rgba(237,240,247,0.4)',fontSize:'20px',cursor:'pointer',lineHeight:1}}>×</button>
            </div>
            <div style={{padding:'20px',display:'grid',gap:'14px'}}>
              {openProvider.fields.map(f=>(
                <div key={f.key}>
                  <label style={{fontSize:'12px',fontWeight:600,color:'rgba(237,240,247,0.6)',textTransform:'uppercase',letterSpacing:'.06em',display:'block',marginBottom:'6px'}}>{f.label}</label>
                  <input value={form[f.key]||''} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))} placeholder={f.placeholder}
                    type={f.key.includes('secret')||f.key.includes('passkey')?'password':'text'}
                    style={{width:'100%',padding:'9px 12px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'7px',color:'#EDF0F7',fontSize:'13px',outline:'none',boxSizing:'border-box'}} />
                </div>
              ))}
            </div>
            <div style={{padding:'14px 20px',borderTop:'1px solid rgba(255,255,255,0.07)',display:'flex',gap:'10px',justifyContent:'flex-end'}}>
              <button onClick={()=>setModal(null)} style={{padding:'9px 16px',background:'none',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'7px',color:'rgba(237,240,247,0.5)',fontSize:'13px',cursor:'pointer'}}>Cancel</button>
              <button onClick={()=>connect(openProvider)} disabled={saving} style={{padding:'9px 20px',background:'#FF5C35',color:'#fff',border:'none',borderRadius:'7px',fontSize:'13px',fontWeight:600,cursor:'pointer',opacity:saving?0.6:1}}>
                {saving?'Connecting...':'Connect'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ProjectLayout>
  )
}
