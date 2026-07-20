'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { useApi } from '../../../../../lib/useApi'
import BuildLayout from '../../../../../components/layouts/BuildLayout'

export default function SettingsPage() {
  const { orgId, projectId } = useParams()
  const { isLoaded, isSignedIn } = useAuth()
  const api = useApi()
  const router = useRouter()
  const [org, setOrg]         = useState(null)
  const [project, setProject] = useState(null)
  const [form, setForm]       = useState({ name:'', website:'', jurisdiction:'KE' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [goingLive, setGoingLive] = useState(false)
  const [saved, setSaved]     = useState(false)

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) { router.push('/login'); return }
    Promise.all([
      api.get('/projects/project/' + projectId),
      api.get('/orgs/' + orgId),
    ]).then(([p,o]) => {
      setProject(p); setOrg(o)
      setForm({ name: p.name||'', website: p.website||'', jurisdiction: p.jurisdiction||'KE' })
    }).catch(console.error).finally(()=>setLoading(false))
  }, [isLoaded, isSignedIn])

  async function save(e) {
    e.preventDefault(); setSaving(true)
    try {
      const updated = await api.patch('/projects/project/' + projectId, form)
      setProject(updated); setSaved(true)
      setTimeout(()=>setSaved(false), 2500)
    } catch (e) { alert(e.message) } finally { setSaving(false) }
  }

  async function goLive() {
    if (!confirm('Going live will generate production API keys and enable real payments. Make sure you have completed your integration testing in sandbox mode. Continue?')) return
    setGoingLive(true)
    try {
      const result = await api.post('/projects/project/' + projectId + '/go-live', {})
      alert('You are now live! Your new production keys are in the API Keys tab.')
      const p = await api.get('/projects/project/' + projectId)
      setProject(p)
    } catch (e) { alert(e.message) } finally { setGoingLive(false) }
  }

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:'#07090F',color:'rgba(237,240,247,0.4)'}}>Loading...</div>

  const JURISDICTIONS = [
    {code:'KE',name:'Kenya'},{code:'NG',name:'Nigeria'},{code:'GH',name:'Ghana'},
    {code:'US',name:'United States'},{code:'GB',name:'United Kingdom'},
    {code:'IN',name:'India'},{code:'BR',name:'Brazil'},{code:'SG',name:'Singapore'},
  ]

  return (
    <BuildLayout org={org} project={project}>
      <div style={{maxWidth:'580px'}}>
        <h1 style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:'22px',color:'#EDF0F7',marginBottom:'28px'}}>Project settings</h1>

        <form onSubmit={save} style={{display:'grid',gap:'0'}}>
          <div style={{background:'#0D1120',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'12px',overflow:'hidden',marginBottom:'16px'}}>
            <div style={{padding:'14px 18px',borderBottom:'1px solid rgba(255,255,255,0.05)',fontSize:'12px',fontWeight:700,letterSpacing:'.08em',textTransform:'uppercase',color:'rgba(237,240,247,0.35)'}}>General</div>
            {[
              { key:'name',         label:'Project name',    placeholder:'My App',            type:'text' },
              { key:'website',      label:'Website',         placeholder:'https://myapp.com', type:'url'  },
            ].map(f=>(
              <div key={f.key} style={{padding:'14px 18px',borderBottom:'1px solid rgba(255,255,255,0.04)',display:'flex',alignItems:'center',gap:'16px'}}>
                <label style={{fontSize:'13px',fontWeight:500,color:'rgba(237,240,247,0.7)',width:'140px',flexShrink:0}}>{f.label}</label>
                <input type={f.type} value={form[f.key]||''} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))} placeholder={f.placeholder}
                  style={{flex:1,padding:'8px 10px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'6px',color:'#EDF0F7',fontSize:'13px',outline:'none'}} />
              </div>
            ))}
            <div style={{padding:'14px 18px',display:'flex',alignItems:'center',gap:'16px'}}>
              <label style={{fontSize:'13px',fontWeight:500,color:'rgba(237,240,247,0.7)',width:'140px',flexShrink:0}}>Home jurisdiction</label>
              <select value={form.jurisdiction} onChange={e=>setForm(p=>({...p,jurisdiction:e.target.value}))}
                style={{flex:1,padding:'8px 10px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'6px',color:'#EDF0F7',fontSize:'13px',outline:'none'}}>
                {JURISDICTIONS.map(j=><option key={j.code} value={j.code}>{j.name} ({j.code})</option>)}
              </select>
            </div>
          </div>
          <button type="submit" disabled={saving} style={{padding:'11px',background:'#FF5C35',color:'#fff',border:'none',borderRadius:'100px',fontSize:'13px',fontWeight:600,cursor:'pointer',opacity:saving?0.6:1,marginBottom:'28px'}}>
            {saved?'Saved!':saving?'Saving...':'Save changes'}
          </button>
        </form>

        {/* Go live */}
        {project && !project.live_mode && (
          <div style={{background:'rgba(34,197,94,0.05)',border:'1px solid rgba(34,197,94,0.2)',borderRadius:'12px',padding:'20px'}}>
            <div style={{fontSize:'14px',fontWeight:700,color:'#22C55E',marginBottom:'6px'}}>Go live</div>
            <div style={{fontSize:'13px',color:'rgba(237,240,247,0.6)',lineHeight:1.65,marginBottom:'16px'}}>
              You are currently in sandbox mode. Real payments are not processed. When you are ready, enable live mode to start processing real transactions.
            </div>
            <div style={{fontSize:'12px',color:'rgba(237,240,247,0.5)',marginBottom:'16px'}}>Before going live, make sure you have:
              <ul style={{marginTop:'8px',paddingLeft:'18px',lineHeight:2}}>
                <li>Connected at least one payment provider</li>
                <li>Tested a successful payment in sandbox</li>
                <li>Configured your webhook endpoints</li>
              </ul>
            </div>
            <button onClick={goLive} disabled={goingLive} style={{fontSize:'13px',fontWeight:600,color:'#fff',background:'#22C55E',border:'none',padding:'10px 20px',borderRadius:'100px',cursor:'pointer',opacity:goingLive?0.6:1}}>
              {goingLive?'Enabling live mode...':'Enable live mode'}
            </button>
          </div>
        )}
        {project?.live_mode && (
          <div style={{background:'rgba(34,197,94,0.05)',border:'1px solid rgba(34,197,94,0.25)',borderRadius:'12px',padding:'16px',display:'flex',alignItems:'center',gap:'10px'}}>
            <span style={{fontSize:'16px'}}>●</span>
            <div>
              <div style={{fontSize:'13px',fontWeight:700,color:'#22C55E'}}>Live mode active</div>
              <div style={{fontSize:'12px',color:'rgba(237,240,247,0.5)'}}>Real payments are being processed.</div>
            </div>
          </div>
        )}
      </div>
    </BuildLayout>
  )
}
