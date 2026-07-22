'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { useApi } from '../../../../../lib/useApi'
import ProjectLayout from '../../../../../components/layouts/ProjectLayout'

const ALL_EVENTS = ['payment.success','payment.failed','payment.refunded','vendor.degraded','vendor.recovered']

const ENV_LABELS = {
  test: { label:'Test',  color:'#F59E0B', hint:'Use in development. No real money moves.' },
  live: { label:'Live',  color:'#22C55E', hint:'Use in production. Real payments only.' },
}

export default function DevelopersPage() {
  const { orgId, projectId } = useParams()
  const { isLoaded, isSignedIn } = useAuth()
  const api = useApi()
  const router = useRouter()
  const [org, setOrg]           = useState(null)
  const [project, setProject]   = useState(null)
  const [keys, setKeys]         = useState(null)
  const [endpoints, setEndpoints] = useState([])
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState('keys')
  const [env, setEnv]           = useState('test')
  const [copied, setCopied]     = useState(null)
  const [rotating, setRotating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState({ url:'', events:['payment.success','payment.failed'] })
  const [saving, setSaving]     = useState(false)

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) { router.push('/login'); return }
    Promise.all([
      api.get('/projects/project/' + projectId),
      api.get('/orgs/' + orgId),
      api.get('/projects/project/' + projectId + '/keys'),
    ]).then(([p,o,k]) => {
      setProject(p); setOrg(o); setKeys(k)
      if (p.live_mode) setEnv('live')
      api.get('/webhooks/' + projectId + '/list').then(setEndpoints).catch(()=>{})
    }).catch(console.error).finally(()=>setLoading(false))
  }, [isLoaded, isSignedIn])

  function copy(val, label) {
    navigator.clipboard.writeText(val)
    setCopied(label); setTimeout(()=>setCopied(null), 2000)
  }

  async function rotate() {
    if (!confirm('This will invalidate your current ' + env + ' secret key. Any integration using the old key will stop working. Continue?')) return
    setRotating(true)
    try {
      const k = await api.post('/projects/project/' + projectId + '/keys/rotate?environment=' + env, {})
      const updated = await api.get('/projects/project/' + projectId + '/keys')
      setKeys(updated)
    } catch (e) { alert(e.message) } finally { setRotating(false) }
  }

  async function addEndpoint(e) {
    e.preventDefault(); setSaving(true)
    try {
      await api.post('/webhooks/' + projectId + '/endpoints', form)
      const updated = await api.get('/webhooks/' + projectId + '/list')
      setEndpoints(updated); setShowForm(false)
      setForm({ url:'', events:['payment.success','payment.failed'] })
    } catch (e) { alert(e.message) } finally { setSaving(false) }
  }

  function toggleEvent(ev) {
    setForm(f=>({...f,events:f.events.includes(ev)?f.events.filter(e=>e!==ev):[...f.events,ev]}))
  }

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:'#07090F',color:'rgba(237,240,247,0.4)'}}>Loading...</div>

  const envKeys = keys?.[env] || {}
  const envInfo = ENV_LABELS[env]

  return (
    <ProjectLayout org={org} project={project}>
      <div style={{maxWidth:'720px'}}>
        <div style={{marginBottom:'24px'}}>
          <h1 style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:'22px',color:'#EDF0F7',marginBottom:'4px'}}>Developers</h1>
          <p style={{fontSize:'13px',color:'rgba(237,240,247,0.45)'}}>API keys, webhooks, and SDK setup.</p>
        </div>

        {/* Main tabs */}
        <div style={{display:'flex',gap:'0',marginBottom:'20px',background:'#0D1120',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'10px',padding:'4px',width:'fit-content'}}>
          {[{id:'keys',label:'API Keys'},{id:'webhooks',label:'Webhooks'},{id:'sdk',label:'SDK'}].map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{fontSize:'13px',fontWeight:tab===t.id?600:400,padding:'7px 18px',borderRadius:'7px',border:'none',background:tab===t.id?'rgba(255,255,255,0.08)':'transparent',color:tab===t.id?'#EDF0F7':'rgba(237,240,247,0.45)',cursor:'pointer'}}>
              {t.label}
            </button>
          ))}
        </div>

        {/* API Keys tab */}
        {tab==='keys' && (
          <div>
            {/* Environment selector */}
            <div style={{display:'flex',gap:'8px',marginBottom:'16px'}}>
              {['test','live'].map(e=>(
                <button key={e} onClick={()=>setEnv(e)} style={{fontSize:'12px',fontWeight:600,padding:'6px 16px',borderRadius:'100px',border:'1px solid',borderColor:env===e?ENV_LABELS[e].color+'66':'rgba(255,255,255,0.08)',background:env===e?ENV_LABELS[e].color+'18':'transparent',color:env===e?ENV_LABELS[e].color:'rgba(237,240,247,0.5)',cursor:'pointer'}}>
                  {ENV_LABELS[e].label}
                </button>
              ))}
            </div>
            <div style={{fontSize:'12px',color:'rgba(237,240,247,0.4)',marginBottom:'16px',padding:'8px 12px',background:'rgba(255,255,255,0.03)',borderRadius:'7px',borderLeft:'2px solid '+envInfo.color}}>
              {envInfo.hint}
            </div>

            <div style={{display:'grid',gap:'12px',marginBottom:'16px'}}>
              {[
                { label:'Publishable key', value:envKeys.publishable_key, hint:'Safe in browser and mobile code. Use in the Client SDK.', secret:false },
                { label:'Secret key',      value:envKeys.secret_key,      hint:'Server-side only. Never expose in frontend code. Use in the Server SDK.', secret:true },
              ].map(k=>(
                <div key={k.label} style={{background:'#0D1120',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'12px',padding:'16px'}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'10px'}}>
                    <div>
                      <div style={{fontSize:'13px',fontWeight:600,color:'#EDF0F7',marginBottom:'2px'}}>{k.label}</div>
                      <div style={{fontSize:'11px',color:'rgba(237,240,247,0.4)'}}>{k.hint}</div>
                    </div>
                    <button onClick={()=>copy(k.value||'',k.label)} style={{fontSize:'12px',fontWeight:600,color:copied===k.label?'#22C55E':'rgba(237,240,247,0.5)',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',padding:'6px 12px',borderRadius:'6px',cursor:'pointer',flexShrink:0}}>
                      {copied===k.label?'Copied!':'Copy'}
                    </button>
                  </div>
                  <div style={{fontFamily:'monospace',fontSize:'12px',color:'rgba(200,212,232,0.8)',background:'rgba(0,0,0,0.3)',padding:'10px 12px',borderRadius:'6px',wordBreak:'break-all'}}>
                    {k.value ? (k.secret ? k.value.slice(0,18)+'•'.repeat(16) : k.value) : '—'}
                  </div>
                </div>
              ))}
            </div>

            <div style={{background:'rgba(239,68,68,0.05)',border:'1px solid rgba(239,68,68,0.15)',borderRadius:'10px',padding:'14px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:'16px'}}>
              <div>
                <div style={{fontSize:'13px',fontWeight:600,color:'#EDF0F7',marginBottom:'3px'}}>Rotate {env} keys</div>
                <div style={{fontSize:'12px',color:'rgba(237,240,247,0.5)'}}>Generates new keys and immediately invalidates the current ones.</div>
              </div>
              <button onClick={rotate} disabled={rotating} style={{fontSize:'12px',fontWeight:600,color:'#EF4444',background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)',padding:'8px 14px',borderRadius:'100px',cursor:'pointer',flexShrink:0,opacity:rotating?0.6:1}}>
                {rotating?'Rotating...':'Rotate'}
              </button>
            </div>
          </div>
        )}

        {/* Webhooks tab */}
        {tab==='webhooks' && (
          <div>
            <div style={{display:'flex',justifyContent:'flex-end',marginBottom:'14px'}}>
              <button onClick={()=>setShowForm(true)} style={{fontSize:'12px',fontWeight:600,color:'#FF5C35',background:'rgba(255,92,53,0.1)',border:'1px solid rgba(255,92,53,0.2)',padding:'8px 16px',borderRadius:'100px',cursor:'pointer'}}>
                + Add endpoint
              </button>
            </div>
            {showForm && (
              <form onSubmit={addEndpoint} style={{background:'#0D1120',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'12px',padding:'18px',marginBottom:'14px',display:'grid',gap:'14px'}}>
                <div>
                  <label style={{fontSize:'12px',fontWeight:600,color:'rgba(237,240,247,0.5)',textTransform:'uppercase',letterSpacing:'.06em',display:'block',marginBottom:'6px'}}>Endpoint URL</label>
                  <input required value={form.url} onChange={e=>setForm(f=>({...f,url:e.target.value}))} placeholder="https://yourapp.com/webhooks/konduyt"
                    style={{width:'100%',padding:'9px 12px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'7px',color:'#EDF0F7',fontSize:'13px',outline:'none',boxSizing:'border-box'}} />
                </div>
                <div>
                  <label style={{fontSize:'12px',fontWeight:600,color:'rgba(237,240,247,0.5)',textTransform:'uppercase',letterSpacing:'.06em',display:'block',marginBottom:'8px'}}>Events</label>
                  <div style={{display:'grid',gap:'6px'}}>
                    {ALL_EVENTS.map(ev=>(
                      <label key={ev} style={{display:'flex',alignItems:'center',gap:'10px',cursor:'pointer'}}>
                        <input type="checkbox" checked={form.events.includes(ev)} onChange={()=>toggleEvent(ev)} style={{accentColor:'#FF5C35'}} />
                        <span style={{fontSize:'12px',color:'rgba(237,240,247,0.7)',fontFamily:'monospace'}}>{ev}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div style={{display:'flex',gap:'10px',justifyContent:'flex-end'}}>
                  <button type="button" onClick={()=>setShowForm(false)} style={{fontSize:'13px',padding:'8px 14px',background:'none',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'7px',color:'rgba(237,240,247,0.5)',cursor:'pointer'}}>Cancel</button>
                  <button type="submit" disabled={saving} style={{fontSize:'13px',fontWeight:600,padding:'8px 18px',background:'#FF5C35',color:'#fff',border:'none',borderRadius:'7px',cursor:'pointer',opacity:saving?0.6:1}}>{saving?'Adding...':'Add'}</button>
                </div>
              </form>
            )}
            {endpoints.length === 0 && !showForm ? (
              <div style={{background:'#0D1120',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'12px',padding:'40px',textAlign:'center',color:'rgba(237,240,247,0.35)',fontSize:'13px'}}>
                No webhook endpoints. Add one to receive payment events.
              </div>
            ) : (
              <div style={{display:'grid',gap:'10px'}}>
                {endpoints.map((ep,i)=>(
                  <div key={i} style={{background:'#0D1120',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'10px',padding:'14px 16px'}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'8px'}}>
                      <div style={{fontFamily:'monospace',fontSize:'12px',color:'#EDF0F7',wordBreak:'break-all'}}>{ep.url}</div>
                      <span style={{fontSize:'10px',fontWeight:700,padding:'2px 7px',borderRadius:'100px',color:'#22C55E',background:'rgba(34,197,94,0.1)',flexShrink:0,marginLeft:'10px'}}>ACTIVE</span>
                    </div>
                    <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
                      {(ep.events||[]).map(ev=>(
                        <span key={ev} style={{fontSize:'11px',fontFamily:'monospace',color:'rgba(237,240,247,0.5)',background:'rgba(255,255,255,0.05)',padding:'2px 7px',borderRadius:'4px'}}>{ev}</span>
                      ))}
                    </div>
                    {ep.signing_secret && (
                      <div style={{marginTop:'8px',fontSize:'11px',color:'rgba(237,240,247,0.4)'}}>
                        Signing secret: <span style={{fontFamily:'monospace',color:'#F59E0B'}}>{ep.signing_secret.slice(0,16)}...</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div style={{marginTop:'20px',background:'#0D1120',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'10px',padding:'16px'}}>
              <div style={{fontSize:'11px',fontWeight:700,letterSpacing:'.08em',textTransform:'uppercase',color:'rgba(237,240,247,0.3)',marginBottom:'10px'}}>Verification</div>
              <pre style={{fontFamily:'monospace',fontSize:'11px',color:'rgba(200,212,232,0.8)',lineHeight:1.7,overflow:'auto',margin:0}}>{`import hmac, hashlib, time

def verify_webhook(body: bytes, signature: str, secret: str, timestamp: str) -> bool:
    if abs(time.time() - int(timestamp)) > 300:
        return False  # Reject events older than 5 minutes
    signed = f"{timestamp}.{body.decode()}"
    expected = "sha256=" + hmac.new(secret.encode(), signed.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)`}</pre>
            </div>
          </div>
        )}

        {/* SDK tab */}
        {tab==='sdk' && (
          <div style={{display:'grid',gap:'12px'}}>
            <div style={{background:'rgba(255,92,53,0.05)',border:'1px solid rgba(255,92,53,0.15)',borderRadius:'10px',padding:'14px 16px',fontSize:'13px',color:'rgba(237,240,247,0.7)',lineHeight:1.65}}>
              Two SDKs. One boundary. Use the Client SDK in your browser. Use the Server SDK in your backend.
            </div>
            {[
              { lang:'Client SDK (browser)', code:'npm install @konduyt/sdk
// then:
import { KonduytClient } from '@konduyt/sdk'
const konduyt = new KonduytClient({ publishableKey: '' + (keys?.test?.publishable_key||'pk_test_...') + '' })', badge:'Browser' },
              { lang:'Server SDK (Node.js)', code:'const { KonduytServer } = require('@konduyt/sdk/server')
const konduyt = new KonduytServer({ secretKey: process.env.KONDUYT_SECRET_KEY })', badge:'Server only' },
            ].map(s=>(
              <div key={s.lang} style={{background:'#0D1120',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'10px',padding:'16px'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'10px'}}>
                  <div style={{fontSize:'12px',fontWeight:700,color:'rgba(237,240,247,0.5)',textTransform:'uppercase',letterSpacing:'.06em'}}>{s.lang}</div>
                  <span style={{fontSize:'10px',fontWeight:700,padding:'2px 8px',borderRadius:'100px',background:'rgba(255,255,255,0.06)',color:'rgba(237,240,247,0.5)'}}>{s.badge}</span>
                </div>
                <pre style={{fontFamily:'monospace',fontSize:'12px',color:'rgba(200,212,232,0.85)',background:'rgba(0,0,0,0.3)',padding:'10px 12px',borderRadius:'6px',overflow:'auto',whiteSpace:'pre-wrap',marginBottom:'10px'}}>{s.code}</pre>
                <a href="https://konduyt.dev/docs" target="_blank" rel="noopener" style={{fontSize:'12px',color:'#FF5C35',textDecoration:'none',fontWeight:600}}>View full SDK docs →</a>
              </div>
            ))}
          </div>
        )}
      </div>
    </ProjectLayout>
  )
}
