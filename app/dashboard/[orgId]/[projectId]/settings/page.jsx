'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { useApi } from '../../../../../lib/useApi'
import ProjectLayout from '../../../../../components/layouts/ProjectLayout'

const JURISDICTIONS = [
  {code:'KE',name:'Kenya'},{code:'NG',name:'Nigeria'},{code:'GH',name:'Ghana'},
  {code:'US',name:'United States'},{code:'GB',name:'United Kingdom'},
  {code:'IN',name:'India'},{code:'BR',name:'Brazil'},{code:'SG',name:'Singapore'},
  {code:'ZA',name:'South Africa'},{code:'EG',name:'Egypt'},
]

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
  const [saved, setSaved]     = useState(false)
  const [goingLive, setGoingLive] = useState(false)
  const [tab, setTab]         = useState('general')

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) { router.push('/login'); return }
    Promise.all([
      api.get('/projects/project/' + projectId),
      api.get('/orgs/' + orgId),
    ]).then(([p,o]) => {
      setProject(p); setOrg(o)
      setForm({ name:p.name||'', website:p.website||'', jurisdiction:p.jurisdiction||'KE' })
    }).catch(console.error).finally(()=>setLoading(false))
  }, [isLoaded, isSignedIn])

  async function save(e) {
    e.preventDefault(); setSaving(true)
    try {
      const p = await api.patch('/projects/project/' + projectId, form)
      setProject(p); setSaved(true); setTimeout(()=>setSaved(false), 2500)
    } catch (e) { alert(e.message) } finally { setSaving(false) }
  }

  async function goLive() {
    if (!confirm('This will enable real payment processing. Make sure you have tested your integration in sandbox mode first. Continue?')) return
    setGoingLive(true)
    try {
      await api.post('/projects/project/' + projectId + '/go-live', {})
      const p = await api.get('/projects/project/' + projectId)
      setProject(p)
      alert('Live mode enabled. Get your new production keys from the Developers tab.')
    } catch (e) { alert(e.message) } finally { setGoingLive(false) }
  }

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:'#07090F',color:'rgba(237,240,247,0.4)'}}>Loading...</div>

  const mode = project?.mode || 'build'

  const tabs = [
    { id:'general',  label:'General' },
    { id:'team',     label:'Team' },
    ...(mode==='build'   ? [{id:'developer', label:'Developer'}] : []),
    ...(mode==='creator' ? [{id:'creator',   label:'Creator'}]   : []),
    ...(mode==='payroll' ? [{id:'payroll',   label:'Payroll'}]   : []),
    { id:'danger',   label:'Danger zone' },
  ]

  return (
    <ProjectLayout org={org} project={project}>
      <div style={{maxWidth:'640px'}}>
        <h1 style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:'22px',color:'#EDF0F7',marginBottom:'24px'}}>Settings</h1>

        {/* Tabs */}
        <div style={{display:'flex',gap:'0',marginBottom:'24px',background:'#0D1120',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'10px',padding:'4px',width:'fit-content',flexWrap:'wrap'}}>
          {tabs.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{fontSize:'13px',fontWeight:tab===t.id?600:400,padding:'7px 16px',borderRadius:'7px',border:'none',background:tab===t.id?'rgba(255,255,255,0.08)':'transparent',color:tab===t.id?'#EDF0F7':'rgba(237,240,247,0.45)',cursor:'pointer',transition:'all .15s'}}>
              {t.label}
            </button>
          ))}
        </div>

        {/* General tab */}
        {tab==='general' && (
          <form onSubmit={save} style={{display:'grid',gap:'12px'}}>
            <div style={{background:'#0D1120',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'12px',overflow:'hidden',marginBottom:'4px'}}>
              {[
                { key:'name',         label:'Project name',  placeholder:'My App',             type:'text' },
                { key:'website',      label:'Website',       placeholder:'https://myapp.com',  type:'url'  },
              ].map((f,i)=>(
                <div key={f.key} style={{padding:'14px 18px',borderBottom:'1px solid rgba(255,255,255,0.04)',display:'flex',alignItems:'center',gap:'16px'}}>
                  <label style={{fontSize:'13px',fontWeight:500,color:'rgba(237,240,247,0.65)',width:'130px',flexShrink:0}}>{f.label}</label>
                  <input type={f.type} value={form[f.key]||''} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))} placeholder={f.placeholder}
                    style={{flex:1,padding:'8px 10px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'6px',color:'#EDF0F7',fontSize:'13px',outline:'none'}} />
                </div>
              ))}
              <div style={{padding:'14px 18px',display:'flex',alignItems:'center',gap:'16px'}}>
                <label style={{fontSize:'13px',fontWeight:500,color:'rgba(237,240,247,0.65)',width:'130px',flexShrink:0}}>Home jurisdiction</label>
                <select value={form.jurisdiction} onChange={e=>setForm(p=>({...p,jurisdiction:e.target.value}))}
                  style={{flex:1,padding:'8px 10px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'6px',color:'#EDF0F7',fontSize:'13px',outline:'none'}}>
                  {JURISDICTIONS.map(j=><option key={j.code} value={j.code}>{j.name} ({j.code})</option>)}
                </select>
              </div>
            </div>
            <button type="submit" disabled={saving} style={{padding:'11px',background:'#FF5C35',color:'#fff',border:'none',borderRadius:'100px',fontSize:'13px',fontWeight:600,cursor:'pointer',opacity:saving?0.6:1}}>
              {saved?'Saved!':saving?'Saving...':'Save changes'}
            </button>

            {/* Live mode */}
            {!project?.live_mode ? (
              <div style={{background:'rgba(34,197,94,0.05)',border:'1px solid rgba(34,197,94,0.18)',borderRadius:'12px',padding:'18px',marginTop:'8px'}}>
                <div style={{fontSize:'13px',fontWeight:700,color:'#22C55E',marginBottom:'6px'}}>Go live</div>
                <div style={{fontSize:'12px',color:'rgba(237,240,247,0.55)',lineHeight:1.65,marginBottom:'14px'}}>
                  Currently in sandbox mode — no real money moves. When you are ready, enable live mode to process real payments.
                </div>
                <button onClick={goLive} disabled={goingLive} style={{fontSize:'12px',fontWeight:600,color:'#fff',background:'#22C55E',border:'none',padding:'9px 18px',borderRadius:'100px',cursor:'pointer',opacity:goingLive?0.6:1}}>
                  {goingLive?'Enabling...':'Enable live mode'}
                </button>
              </div>
            ) : (
              <div style={{background:'rgba(34,197,94,0.05)',border:'1px solid rgba(34,197,94,0.2)',borderRadius:'10px',padding:'14px',display:'flex',gap:'10px',alignItems:'center'}}>
                <span style={{color:'#22C55E',fontSize:'16px'}}>●</span>
                <div style={{fontSize:'13px',fontWeight:600,color:'#22C55E'}}>Live mode active — real payments are being processed.</div>
              </div>
            )}
          </form>
        )}

        {/* Team tab */}
        {tab==='team' && (
          <div style={{background:'#0D1120',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'12px',padding:'20px'}}>
            <div style={{fontSize:'13px',fontWeight:600,color:'#EDF0F7',marginBottom:'6px'}}>Team members</div>
            <div style={{fontSize:'13px',color:'rgba(237,240,247,0.5)',marginBottom:'18px',lineHeight:1.65}}>Invite teammates to collaborate on this project. Managed at the organization level.</div>
            <a href={'/dashboard/'+orgId+'/members'} style={{fontSize:'13px',fontWeight:600,color:'#FF5C35',textDecoration:'none'}}>Manage organization members →</a>
          </div>
        )}

        {/* Developer tab */}
        {tab==='developer' && (
          <div style={{background:'#0D1120',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'12px',padding:'20px'}}>
            <div style={{fontSize:'13px',fontWeight:600,color:'#EDF0F7',marginBottom:'6px'}}>Developer settings</div>
            <div style={{fontSize:'13px',color:'rgba(237,240,247,0.5)',marginBottom:'18px',lineHeight:1.65}}>API configuration, key management, and webhook settings.</div>
            <a href={'/dashboard/'+orgId+'/'+projectId+'/developers'} style={{fontSize:'13px',fontWeight:600,color:'#FF5C35',textDecoration:'none'}}>Go to Developers →</a>
          </div>
        )}

        {/* Creator tab */}
        {tab==='creator' && (
          <div style={{background:'#0D1120',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'12px',padding:'20px'}}>
            <div style={{fontSize:'13px',fontWeight:600,color:'#EDF0F7',marginBottom:'6px'}}>Creator settings</div>
            <div style={{fontSize:'13px',color:'rgba(237,240,247,0.5)',marginBottom:'6px',lineHeight:1.65}}>Profile, branding, and creator-specific configuration.</div>
            <div style={{fontSize:'11px',fontWeight:700,padding:'3px 10px',borderRadius:'100px',background:'rgba(245,158,11,0.1)',color:'#F59E0B',display:'inline-block',letterSpacing:'.04em'}}>IN DEVELOPMENT</div>
          </div>
        )}

        {/* Payroll tab */}
        {tab==='payroll' && (
          <div style={{background:'#0D1120',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'12px',padding:'20px'}}>
            <div style={{fontSize:'13px',fontWeight:600,color:'#EDF0F7',marginBottom:'6px'}}>Payroll settings</div>
            <div style={{fontSize:'13px',color:'rgba(237,240,247,0.5)',marginBottom:'6px',lineHeight:1.65}}>Pay cycles, default currencies, and compliance configuration.</div>
            <div style={{fontSize:'11px',fontWeight:700,padding:'3px 10px',borderRadius:'100px',background:'rgba(34,197,94,0.1)',color:'#22C55E',display:'inline-block',letterSpacing:'.04em'}}>IN DEVELOPMENT</div>
          </div>
        )}

        {/* Danger zone */}
        {tab==='danger' && (
          <div style={{background:'rgba(239,68,68,0.04)',border:'1px solid rgba(239,68,68,0.15)',borderRadius:'12px',padding:'20px'}}>
            <div style={{fontSize:'13px',fontWeight:600,color:'#EF4444',marginBottom:'6px'}}>Danger zone</div>
            <div style={{fontSize:'13px',color:'rgba(237,240,247,0.5)',lineHeight:1.65,marginBottom:'16px'}}>These actions are irreversible. Make sure you understand the consequences before proceeding.</div>
            <button onClick={()=>alert('Contact teamkonduyt@gmail.com to delete this project.')} style={{fontSize:'13px',fontWeight:600,color:'#EF4444',background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)',padding:'9px 18px',borderRadius:'100px',cursor:'pointer'}}>
              Delete project
            </button>
          </div>
        )}
      </div>
    </ProjectLayout>
  )
}
