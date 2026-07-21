'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { useApi } from '../../../../../lib/useApi'
import BuildLayout from '../../../../../components/layouts/ProjectLayout'

const ALL_EVENTS = ['payment.success','payment.failed','payment.refunded','vendor.degraded','vendor.recovered']

export default function WebhooksPage() {
  const { orgId, projectId } = useParams()
  const { isLoaded, isSignedIn } = useAuth()
  const api = useApi()
  const router = useRouter()
  const [org, setOrg]         = useState(null)
  const [project, setProject] = useState(null)
  const [endpoints, setEndpoints] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]       = useState({ url:'', events:['payment.success','payment.failed'] })
  const [saving, setSaving]   = useState(false)

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) { router.push('/login'); return }
    Promise.all([
      api.get('/projects/project/' + projectId),
      api.get('/orgs/' + orgId),
    ]).then(([p,o]) => { setProject(p); setOrg(o) })
     .catch(console.error)

    api.get('/webhooks/' + projectId + '/list').then(setEndpoints).catch(()=>setEndpoints([]))
    setLoading(false)
  }, [isLoaded, isSignedIn])

  async function addEndpoint(e) {
    e.preventDefault(); setSaving(true)
    try {
      await api.post('/webhooks/' + projectId + '/endpoints', form)
      const updated = await api.get('/webhooks/' + projectId + '/list')
      setEndpoints(updated); setShowForm(false); setForm({ url:'', events:['payment.success','payment.failed'] })
    } catch (e) { alert(e.message) } finally { setSaving(false) }
  }

  function toggleEvent(ev) {
    setForm(f => ({ ...f, events: f.events.includes(ev) ? f.events.filter(e=>e!==ev) : [...f.events, ev] }))
  }

  return (
    <ProjectLayout org={org} project={project}>
      <div style={{maxWidth:'720px'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'24px',gap:'12px'}}>
          <div>
            <h1 style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:'22px',color:'#EDF0F7',marginBottom:'4px'}}>Webhooks</h1>
            <p style={{fontSize:'13px',color:'rgba(237,240,247,0.45)'}}>Receive events when payments change status.</p>
          </div>
          <button onClick={()=>setShowForm(true)} style={{fontSize:'12px',fontWeight:600,color:'#FF5C35',background:'rgba(255,92,53,0.1)',border:'1px solid rgba(255,92,53,0.2)',padding:'8px 16px',borderRadius:'100px',cursor:'pointer'}}>
            + Add endpoint
          </button>
        </div>

        {showForm && (
          <form onSubmit={addEndpoint} style={{background:'#0D1120',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'12px',padding:'20px',marginBottom:'20px',display:'grid',gap:'16px'}}>
            <div>
              <label style={{fontSize:'12px',fontWeight:600,color:'rgba(237,240,247,0.5)',textTransform:'uppercase',letterSpacing:'.06em',display:'block',marginBottom:'6px'}}>Endpoint URL</label>
              <input required value={form.url} onChange={e=>setForm(f=>({...f,url:e.target.value}))} placeholder="https://yourapp.com/webhooks/konduyt"
                style={{width:'100%',padding:'10px 12px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'8px',color:'#EDF0F7',fontSize:'13px',outline:'none',boxSizing:'border-box'}} />
            </div>
            <div>
              <label style={{fontSize:'12px',fontWeight:600,color:'rgba(237,240,247,0.5)',textTransform:'uppercase',letterSpacing:'.06em',display:'block',marginBottom:'10px'}}>Events to send</label>
              <div style={{display:'grid',gap:'8px'}}>
                {ALL_EVENTS.map(ev=>(
                  <label key={ev} style={{display:'flex',alignItems:'center',gap:'10px',cursor:'pointer'}}>
                    <input type="checkbox" checked={form.events.includes(ev)} onChange={()=>toggleEvent(ev)} style={{accentColor:'#FF5C35'}} />
                    <span style={{fontSize:'13px',color:'rgba(237,240,247,0.7)',fontFamily:'monospace'}}>{ev}</span>
                  </label>
                ))}
              </div>
            </div>
            <div style={{display:'flex',gap:'10px',justifyContent:'flex-end'}}>
              <button type="button" onClick={()=>setShowForm(false)} style={{fontSize:'13px',padding:'9px 16px',background:'none',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'8px',color:'rgba(237,240,247,0.5)',cursor:'pointer'}}>Cancel</button>
              <button type="submit" disabled={saving} style={{fontSize:'13px',fontWeight:600,padding:'9px 20px',background:'#FF5C35',color:'#fff',border:'none',borderRadius:'8px',cursor:'pointer',opacity:saving?0.6:1}}>{saving?'Adding...':'Add endpoint'}</button>
            </div>
          </form>
        )}

        {endpoints.length === 0 && !showForm ? (
          <div style={{background:'#0D1120',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'12px',padding:'48px',textAlign:'center',color:'rgba(237,240,247,0.35)',fontSize:'13px'}}>
            No webhook endpoints yet. Add one to receive payment events.
          </div>
        ) : (
          <div style={{display:'grid',gap:'10px'}}>
            {endpoints.map((ep,i)=>(
              <div key={i} style={{background:'#0D1120',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'10px',padding:'16px'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'10px'}}>
                  <div style={{fontFamily:'monospace',fontSize:'13px',color:'#EDF0F7'}}>{ep.url}</div>
                  <span style={{fontSize:'10px',fontWeight:700,padding:'2px 8px',borderRadius:'100px',color:'#22C55E',background:'rgba(34,197,94,0.1)'}}>ACTIVE</span>
                </div>
                <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
                  {(ep.events||[]).map(ev=>(
                    <span key={ev} style={{fontSize:'11px',fontFamily:'monospace',color:'rgba(237,240,247,0.5)',background:'rgba(255,255,255,0.05)',padding:'2px 8px',borderRadius:'4px'}}>{ev}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Payload reference */}
        <div style={{marginTop:'28px',background:'#0D1120',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'12px',padding:'18px'}}>
          <div style={{fontSize:'12px',fontWeight:700,letterSpacing:'.08em',textTransform:'uppercase',color:'rgba(237,240,247,0.35)',marginBottom:'12px'}}>Example payload</div>
          <pre style={{fontFamily:'monospace',fontSize:'12px',color:'rgba(200,212,232,0.85)',lineHeight:1.7,overflow:'auto',margin:0}}>{JSON.stringify({event:"payment.success",data:{transaction_id:"txn_4f6e247a",amount:2000,currency:"KES",vendor:"mpesa",status:"success",customer_email:"user@example.com"}},null,2)}</pre>
        </div>
      </div>
    </ProjectLayout>
  )
}
