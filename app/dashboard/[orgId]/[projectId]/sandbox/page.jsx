'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '../../../../../lib/auth-context'
import { useApi } from '../../../../../lib/useApi'
import ProjectLayout from '../../../../../components/layouts/ProjectLayout'

const SCENARIOS = [
  { id:'success',  label:'Success',           color:'#22C55E', desc:'Payment completes immediately' },
  { id:'failure',  label:'Failure',           color:'#EF4444', desc:'Provider declines the payment' },
  { id:'pending',  label:'Pending (async)',   color:'#F59E0B', desc:'Awaiting confirmation (like M-Pesa STK)' },
  { id:'timeout',  label:'Timeout',           color:'#8892A4', desc:'Provider times out — triggers retry' },
  { id:'cancel',   label:'Cancel',            color:'#8892A4', desc:'Payment cancelled before processing' },
]

const WEBHOOK_EVENTS = [
  'payment.created', 'payment.processing', 'payment.succeeded',
  'payment.failed', 'payment.cancelled', 'refund.succeeded', 'refund.failed',
  'vendor.degraded', 'vendor.recovered',
]

const STATUS_COLORS = {
  succeeded: '#22C55E', failed: '#EF4444', pending: '#F59E0B',
  created: '#8892A4', cancelled: '#8892A4', true: '#22C55E', false: '#EF4444',
}

export default function SandboxPage() {
  const { orgId, projectId } = useParams()
  const { isLoaded, isSignedIn } = useAuth()
  const api = useApi()
  const router = useRouter()
  const [org, setOrg]           = useState(null)
  const [project, setProject]   = useState(null)
  const [tab, setTab]           = useState('payment')
  const [loading, setLoading]   = useState(true)

  // Test payment
  const [scenario, setScenario] = useState('success')
  const [amount, setAmount]     = useState('100.00')
  const [currency, setCurrency] = useState('KES')
  const [email, setEmail]       = useState('test@example.com')
  const [paying, setPaying]     = useState(false)
  const [payResult, setPayResult] = useState(null)

  // Webhooks
  const [wEvent, setWEvent]       = useState('payment.succeeded')
  const [wUrl, setWUrl]           = useState('')
  const [triggering, setTriggering] = useState(false)
  const [triggerResult, setTriggerResult] = useState(null)

  // Event inspector
  const [deliveries, setDeliveries] = useState([])
  const [selectedDel, setSelectedDel] = useState(null)
  const [replaying, setReplaying]     = useState(null)

  // Reset
  const [resetting, setResetting] = useState(false)
  const [resetResult, setResetResult] = useState(null)

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) { router.push('/login'); return }
    Promise.all([
      api.get('/projects/project/' + projectId),
      api.get('/orgs/' + orgId),
    ]).then(([p,o]) => { setProject(p); setOrg(o) }).catch(console.error).finally(()=>setLoading(false))
  }, [isLoaded, isSignedIn])

  async function runTestPayment() {
    setPaying(true); setPayResult(null)
    try {
      const r = await api.post('/sandbox/' + projectId + '/test-payment', {
        amount: parseFloat(amount), currency, customer_email: email, scenario
      })
      setPayResult(r)
    } catch(e) { setPayResult({ error: e.message }) }
    finally { setPaying(false) }
  }

  async function triggerWebhook() {
    setTriggering(true); setTriggerResult(null)
    try {
      const r = await api.post('/webhooks/' + projectId + '/trigger', {
        event_type: wEvent, endpoint_url: wUrl || undefined
      })
      setTriggerResult(r)
    } catch(e) { setTriggerResult({ error: e.message }) }
    finally { setTriggering(false) }
  }

  async function loadDeliveries() {
    try {
      const r = await api.get('/webhooks/' + projectId + '/deliveries?limit=30')
      setDeliveries(r.deliveries || [])
    } catch(e) { console.error(e) }
  }

  async function replay(id) {
    setReplaying(id)
    try { await api.post('/webhooks/' + projectId + '/deliveries/' + id + '/replay', {}); await loadDeliveries() }
    catch(e) { alert(e.message) } finally { setReplaying(null) }
  }

  async function resetSandbox() {
    if (!confirm('This will delete ALL test transactions, ledger events, and webhook deliveries for this project. This cannot be undone. Continue?')) return
    setResetting(true); setResetResult(null)
    try { const r = await api.post('/sandbox/' + projectId + '/reset', {}); setResetResult(r) }
    catch(e) { setResetResult({ error: e.message }) } finally { setResetting(false) }
  }

  useEffect(() => { if (tab === 'inspector' && projectId) loadDeliveries() }, [tab])

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:'#07090F',color:'rgba(237,240,247,0.4)'}}>Loading...</div>

  if (project?.live_mode) return (
    <ProjectLayout org={org} project={project}>
      <div style={{maxWidth:'560px'}}>
        <h1 style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:'22px',color:'#EDF0F7',marginBottom:'16px'}}>Sandbox</h1>
        <div style={{background:'rgba(239,68,68,0.06)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:'12px',padding:'20px',fontSize:'13px',color:'rgba(237,240,247,0.7)',lineHeight:1.65}}>
          Sandbox tools are not available in Live mode. These tools only work in test environments to prevent accidental data modification in production.
        </div>
      </div>
    </ProjectLayout>
  )

  const TABS = [
    {id:'payment',   label:'Test Payment'},
    {id:'webhook',   label:'Trigger Webhook'},
    {id:'inspector', label:'Event Inspector'},
    {id:'data',      label:'Test Data'},
  ]

  return (
    <ProjectLayout org={org} project={project}>
      <div style={{maxWidth:'760px'}}>
        <div style={{marginBottom:'24px'}}>
          <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'6px'}}>
            <h1 style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:'22px',color:'#EDF0F7'}}>Sandbox</h1>
            <span style={{fontSize:'11px',fontWeight:700,padding:'2px 8px',borderRadius:'100px',background:'rgba(245,158,11,0.12)',color:'#F59E0B'}}>TEST MODE</span>
          </div>
          <p style={{fontSize:'13px',color:'rgba(237,240,247,0.45)'}}>Build and test your integration without moving real money.</p>
        </div>

        {/* Tabs */}
        <div style={{display:'flex',gap:'0',marginBottom:'24px',background:'#0D1120',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'10px',padding:'4px',width:'fit-content'}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{fontSize:'13px',fontWeight:tab===t.id?600:400,padding:'7px 16px',borderRadius:'7px',border:'none',background:tab===t.id?'rgba(255,255,255,0.08)':'transparent',color:tab===t.id?'#EDF0F7':'rgba(237,240,247,0.45)',cursor:'pointer'}}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Test Payment */}
        {tab==='payment' && (
          <div>
            <div style={{background:'#0D1120',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'12px',padding:'20px',marginBottom:'16px'}}>
              <div style={{fontSize:'13px',fontWeight:700,color:'#EDF0F7',marginBottom:'16px'}}>Create a test payment</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'14px'}}>
                <div>
                  <label style={{fontSize:'11px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',color:'rgba(237,240,247,0.4)',display:'block',marginBottom:'6px'}}>Amount</label>
                  <input value={amount} onChange={e=>setAmount(e.target.value)} type="number" step="0.01"
                    style={{width:'100%',padding:'9px 12px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'7px',color:'#EDF0F7',fontSize:'13px',outline:'none',boxSizing:'border-box'}} />
                </div>
                <div>
                  <label style={{fontSize:'11px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',color:'rgba(237,240,247,0.4)',display:'block',marginBottom:'6px'}}>Currency</label>
                  <select value={currency} onChange={e=>setCurrency(e.target.value)}
                    style={{width:'100%',padding:'9px 12px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'7px',color:'#EDF0F7',fontSize:'13px',outline:'none'}}>
                    {['KES','USD','NGN','GHS','INR','BRL'].map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div style={{marginBottom:'14px'}}>
                <label style={{fontSize:'11px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',color:'rgba(237,240,247,0.4)',display:'block',marginBottom:'6px'}}>Customer email</label>
                <input value={email} onChange={e=>setEmail(e.target.value)}
                  style={{width:'100%',padding:'9px 12px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'7px',color:'#EDF0F7',fontSize:'13px',outline:'none',boxSizing:'border-box'}} />
              </div>
              <div style={{marginBottom:'16px'}}>
                <label style={{fontSize:'11px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',color:'rgba(237,240,247,0.4)',display:'block',marginBottom:'8px'}}>Scenario</label>
                <div style={{display:'grid',gap:'6px'}}>
                  {SCENARIOS.map(s=>(
                    <label key={s.id} style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 12px',borderRadius:'8px',cursor:'pointer',background:scenario===s.id?'rgba(255,255,255,0.04)':'transparent',border:scenario===s.id?'1px solid rgba(255,255,255,0.1)':'1px solid transparent'}}>
                      <input type="radio" name="scenario" value={s.id} checked={scenario===s.id} onChange={()=>setScenario(s.id)} style={{accentColor:s.color}} />
                      <span style={{fontSize:'13px',fontWeight:scenario===s.id?600:400,color:scenario===s.id?s.color:'rgba(237,240,247,0.7)'}}>{s.label}</span>
                      <span style={{fontSize:'12px',color:'rgba(237,240,247,0.4)'}}>{s.desc}</span>
                    </label>
                  ))}
                </div>
              </div>
              <button onClick={runTestPayment} disabled={paying} style={{width:'100%',padding:'12px',background:'#FF5C35',color:'#fff',border:'none',borderRadius:'100px',fontSize:'13px',fontWeight:600,cursor:'pointer',opacity:paying?0.6:1}}>
                {paying ? 'Running...' : 'Run test payment'}
              </button>
            </div>

            {payResult && (
              <div style={{background:'#0D1120',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'12px',overflow:'hidden'}}>
                <div style={{padding:'12px 16px',borderBottom:'1px solid rgba(255,255,255,0.05)',display:'flex',alignItems:'center',gap:'10px'}}>
                  <span style={{fontSize:'8px',color:payResult.error?'#EF4444':STATUS_COLORS[payResult.status]||'#22C55E'}}>●</span>
                  <span style={{fontSize:'13px',fontWeight:600,color:'#EDF0F7'}}>Result</span>
                  {payResult.status && <span style={{fontSize:'11px',fontWeight:700,padding:'2px 8px',borderRadius:'100px',color:STATUS_COLORS[payResult.status],background:STATUS_COLORS[payResult.status]+'18',textTransform:'capitalize'}}>{payResult.status}</span>}
                </div>
                <pre style={{padding:'16px',fontFamily:'monospace',fontSize:'12px',color:'rgba(200,212,232,0.85)',lineHeight:1.7,overflow:'auto',margin:0}}>
                  {JSON.stringify(payResult, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Trigger Webhook */}
        {tab==='webhook' && (
          <div>
            <div style={{background:'#0D1120',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'12px',padding:'20px',marginBottom:'16px'}}>
              <div style={{fontSize:'13px',fontWeight:700,color:'#EDF0F7',marginBottom:'16px'}}>Trigger a webhook event</div>
              <div style={{marginBottom:'12px'}}>
                <label style={{fontSize:'11px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',color:'rgba(237,240,247,0.4)',display:'block',marginBottom:'6px'}}>Event type</label>
                <select value={wEvent} onChange={e=>setWEvent(e.target.value)}
                  style={{width:'100%',padding:'9px 12px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'7px',color:'#EDF0F7',fontSize:'13px',outline:'none'}}>
                  {WEBHOOK_EVENTS.map(e=><option key={e}>{e}</option>)}
                </select>
              </div>
              <div style={{marginBottom:'16px'}}>
                <label style={{fontSize:'11px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',color:'rgba(237,240,247,0.4)',display:'block',marginBottom:'6px'}}>Endpoint URL (blank = send to all configured endpoints)</label>
                <input value={wUrl} onChange={e=>setWUrl(e.target.value)} placeholder="https://yourapp.com/webhooks/konduyt"
                  style={{width:'100%',padding:'9px 12px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'7px',color:'#EDF0F7',fontSize:'13px',outline:'none',boxSizing:'border-box'}} />
              </div>
              <button onClick={triggerWebhook} disabled={triggering} style={{width:'100%',padding:'12px',background:'#FF5C35',color:'#fff',border:'none',borderRadius:'100px',fontSize:'13px',fontWeight:600,cursor:'pointer',opacity:triggering?0.6:1}}>
                {triggering ? 'Sending...' : 'Send webhook'}
              </button>
            </div>
            {triggerResult && (
              <div style={{background:'#0D1120',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'12px',overflow:'hidden'}}>
                <div style={{padding:'12px 16px',borderBottom:'1px solid rgba(255,255,255,0.05)',fontSize:'13px',fontWeight:600,color:'#EDF0F7'}}>Result</div>
                <pre style={{padding:'16px',fontFamily:'monospace',fontSize:'12px',color:'rgba(200,212,232,0.85)',lineHeight:1.7,overflow:'auto',margin:0}}>
                  {JSON.stringify(triggerResult, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Event Inspector */}
        {tab==='inspector' && (
          <div>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'12px'}}>
              <div style={{fontSize:'13px',color:'rgba(237,240,247,0.5)'}}>{deliveries.length} recent deliveries</div>
              <button onClick={loadDeliveries} style={{fontSize:'12px',color:'#FF5C35',background:'none',border:'none',cursor:'pointer',fontWeight:600}}>Refresh</button>
            </div>
            {deliveries.length === 0 ? (
              <div style={{background:'#0D1120',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'12px',padding:'40px',textAlign:'center',color:'rgba(237,240,247,0.35)',fontSize:'13px'}}>
                No webhook deliveries yet. Trigger a webhook or create a test payment.
              </div>
            ) : (
              <div style={{display:'grid',gap:'8px'}}>
                {deliveries.map(d=>(
                  <div key={d.id} style={{background:'#0D1120',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'10px',overflow:'hidden'}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 14px',cursor:'pointer'}} onClick={()=>setSelectedDel(selectedDel===d.id?null:d.id)}>
                      <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                        <span style={{fontSize:'8px',color:d.success?'#22C55E':'#EF4444'}}>●</span>
                        <span style={{fontSize:'12px',fontFamily:'monospace',color:'#EDF0F7'}}>{d.event_type}</span>
                        <span style={{fontSize:'11px',color:'rgba(237,240,247,0.4)'}}>{d.endpoint_url?.slice(0,40)}{d.endpoint_url?.length>40?'...':''}</span>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                        {d.duration_ms && <span style={{fontSize:'11px',color:'rgba(237,240,247,0.4)'}}>{d.duration_ms}ms</span>}
                        {d.response_status && <span style={{fontSize:'11px',fontWeight:700,color:d.success?'#22C55E':'#EF4444'}}>{d.response_status}</span>}
                        <button onClick={e=>{e.stopPropagation();replay(d.id)}} disabled={replaying===d.id} style={{fontSize:'11px',fontWeight:600,color:'rgba(237,240,247,0.5)',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',padding:'3px 10px',borderRadius:'6px',cursor:'pointer'}}>
                          {replaying===d.id?'...':'Replay'}
                        </button>
                      </div>
                    </div>
                    {selectedDel===d.id && (
                      <div style={{borderTop:'1px solid rgba(255,255,255,0.05)',padding:'14px'}}>
                        <div style={{fontSize:'11px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',color:'rgba(237,240,247,0.3)',marginBottom:'8px'}}>Request payload</div>
                        <pre style={{fontFamily:'monospace',fontSize:'11px',color:'rgba(200,212,232,0.8)',background:'rgba(0,0,0,0.3)',padding:'10px',borderRadius:'6px',overflow:'auto',maxHeight:'200px',margin:'0 0 12px'}}>
                          {JSON.stringify(d.request_body,null,2)}
                        </pre>
                        {d.response_body && <>
                          <div style={{fontSize:'11px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',color:'rgba(237,240,247,0.3)',marginBottom:'8px'}}>Response</div>
                          <pre style={{fontFamily:'monospace',fontSize:'11px',color:'rgba(200,212,232,0.8)',background:'rgba(0,0,0,0.3)',padding:'10px',borderRadius:'6px',overflow:'auto',maxHeight:'120px',margin:0}}>
                            {d.response_body}
                          </pre>
                        </>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Test Data */}
        {tab==='data' && (
          <div style={{display:'grid',gap:'12px'}}>
            <div style={{background:'#0D1120',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'12px',padding:'20px'}}>
              <div style={{fontSize:'13px',fontWeight:700,color:'#EDF0F7',marginBottom:'6px'}}>Generate sample data</div>
              <div style={{fontSize:'13px',color:'rgba(237,240,247,0.5)',lineHeight:1.65,marginBottom:'16px'}}>
                Creates realistic test transactions with varied outcomes across multiple currencies and customers.
              </div>
              <button onClick={async()=>{
                try { const r = await api.post('/sandbox/'+projectId+'/generate',{customers:5,transactions:10}); alert(r.transactions+' transactions created.') }
                catch(e){ alert(e.message) }
              }} style={{fontSize:'13px',fontWeight:600,color:'#EDF0F7',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',padding:'10px 20px',borderRadius:'100px',cursor:'pointer'}}>
                Generate sample data
              </button>
            </div>
            <div style={{background:'rgba(239,68,68,0.05)',border:'1px solid rgba(239,68,68,0.15)',borderRadius:'12px',padding:'20px'}}>
              <div style={{fontSize:'13px',fontWeight:700,color:'#EF4444',marginBottom:'6px'}}>Reset sandbox</div>
              <div style={{fontSize:'13px',color:'rgba(237,240,247,0.5)',lineHeight:1.65,marginBottom:'16px'}}>
                Deletes all test transactions, ledger events, and webhook deliveries. No impact on live data. Cannot be undone.
              </div>
              {resetResult && (
                <div style={{fontSize:'12px',color:'rgba(237,240,247,0.6)',background:'rgba(0,0,0,0.2)',borderRadius:'8px',padding:'10px 12px',marginBottom:'12px',fontFamily:'monospace'}}>
                  Deleted: {resetResult.deleted?.transactions} transactions · {resetResult.deleted?.ledger_events} ledger events · {resetResult.deleted?.webhook_deliveries} webhook deliveries
                </div>
              )}
              <button onClick={resetSandbox} disabled={resetting} style={{fontSize:'13px',fontWeight:600,color:'#EF4444',background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)',padding:'10px 20px',borderRadius:'100px',cursor:'pointer',opacity:resetting?0.6:1}}>
                {resetting ? 'Resetting...' : 'Reset sandbox'}
              </button>
            </div>
          </div>
        )}
      </div>
    </ProjectLayout>
  )
}
