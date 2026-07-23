'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '../../../../../lib/auth-context'
import { useApi } from '../../../../../lib/useApi'
import ProjectLayout from '../../../../../components/layouts/ProjectLayout'

export default function LinksPage() {
  const { orgId, projectId } = useParams()
  const { isLoaded, isSignedIn } = useAuth()
  const api = useApi()
  const router = useRouter()
  const [org, setOrg]         = useState(null)
  const [project, setProject] = useState(null)
  const [links, setLinks]     = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]       = useState({ handle:'', title:'', description:'', currency:'KES', amount:'' })
  const [saving, setSaving]   = useState(false)
  const [copied, setCopied]   = useState(null)

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) { router.push('/login'); return }
    Promise.all([
      api.get('/projects/project/' + projectId),
      api.get('/orgs/' + orgId),
    ]).then(([p,o]) => {
      setProject(p); setOrg(o)
      api.get('/people/' + projectId + '/links').then(setLinks).catch(()=>{})
    }).catch(console.error).finally(()=>setLoading(false))
  }, [isLoaded, isSignedIn])

  async function createLink(e) {
    e.preventDefault(); setSaving(true)
    try {
      const l = await api.post('/people/' + projectId + '/links', {
        ...form, amount: form.amount ? parseFloat(form.amount) : null
      })
      setLinks(prev => [...prev, l])
      setShowForm(false)
      setForm({ handle:'', title:'', description:'', currency:'KES', amount:'' })
    } catch (e) { alert(e.message) } finally { setSaving(false) }
  }

  function copy(url, id) {
    navigator.clipboard.writeText(url)
    setCopied(id); setTimeout(()=>setCopied(null), 2000)
  }

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:'#07090F',color:'rgba(237,240,247,0.4)'}}>Loading...</div>

  return (
    <ProjectLayout org={org} project={project}>
      <div style={{maxWidth:'720px'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'24px',gap:'12px'}}>
          <div>
            <h1 style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:'22px',color:'#EDF0F7',marginBottom:'4px'}}>Payment Links</h1>
            <p style={{fontSize:'13px',color:'rgba(237,240,247,0.45)'}}>Public links anyone can use to pay you. No login required for the payer.</p>
          </div>
          <button onClick={()=>setShowForm(true)} style={{fontSize:'12px',fontWeight:600,color:'#F59E0B',background:'rgba(245,158,11,0.1)',border:'1px solid rgba(245,158,11,0.2)',padding:'8px 16px',borderRadius:'100px',cursor:'pointer'}}>
            + Create link
          </button>
        </div>

        {showForm && (
          <form onSubmit={createLink} style={{background:'#0D1120',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'12px',padding:'20px',marginBottom:'20px',display:'grid',gap:'14px'}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
              <div>
                <label style={{fontSize:'12px',fontWeight:600,color:'rgba(237,240,247,0.55)',textTransform:'uppercase',letterSpacing:'.06em',display:'block',marginBottom:'6px'}}>Handle</label>
                <input required value={form.handle} onChange={e=>setForm(f=>({...f,handle:e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,'')}))} placeholder="your-name"
                  style={{width:'100%',padding:'9px 12px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'7px',color:'#EDF0F7',fontSize:'13px',outline:'none',boxSizing:'border-box'}} />
                {form.handle && <div style={{fontSize:'11px',color:'#F59E0B',marginTop:'4px'}}>konduyt.dev/pay/{form.handle}</div>}
              </div>
              <div>
                <label style={{fontSize:'12px',fontWeight:600,color:'rgba(237,240,247,0.55)',textTransform:'uppercase',letterSpacing:'.06em',display:'block',marginBottom:'6px'}}>Title</label>
                <input required value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Support my work"
                  style={{width:'100%',padding:'9px 12px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'7px',color:'#EDF0F7',fontSize:'13px',outline:'none',boxSizing:'border-box'}} />
              </div>
              <div>
                <label style={{fontSize:'12px',fontWeight:600,color:'rgba(237,240,247,0.55)',textTransform:'uppercase',letterSpacing:'.06em',display:'block',marginBottom:'6px'}}>Amount (leave blank = payer chooses)</label>
                <input type="number" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} placeholder="500"
                  style={{width:'100%',padding:'9px 12px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'7px',color:'#EDF0F7',fontSize:'13px',outline:'none',boxSizing:'border-box'}} />
              </div>
              <div>
                <label style={{fontSize:'12px',fontWeight:600,color:'rgba(237,240,247,0.55)',textTransform:'uppercase',letterSpacing:'.06em',display:'block',marginBottom:'6px'}}>Currency</label>
                <input value={form.currency} onChange={e=>setForm(f=>({...f,currency:e.target.value}))} placeholder="KES" maxLength={3}
                  style={{width:'100%',padding:'9px 12px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'7px',color:'#EDF0F7',fontSize:'13px',outline:'none',boxSizing:'border-box'}} />
              </div>
            </div>
            <div>
              <label style={{fontSize:'12px',fontWeight:600,color:'rgba(237,240,247,0.55)',textTransform:'uppercase',letterSpacing:'.06em',display:'block',marginBottom:'6px'}}>Description (optional)</label>
              <input value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="A message to your supporters"
                style={{width:'100%',padding:'9px 12px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'7px',color:'#EDF0F7',fontSize:'13px',outline:'none',boxSizing:'border-box'}} />
            </div>
            <div style={{display:'flex',gap:'10px',justifyContent:'flex-end'}}>
              <button type="button" onClick={()=>setShowForm(false)} style={{padding:'9px 16px',background:'none',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'7px',color:'rgba(237,240,247,0.5)',fontSize:'13px',cursor:'pointer'}}>Cancel</button>
              <button type="submit" disabled={saving} style={{padding:'9px 20px',background:'#F59E0B',color:'#fff',border:'none',borderRadius:'7px',fontSize:'13px',fontWeight:600,cursor:'pointer',opacity:saving?0.6:1}}>{saving?'Creating...':'Create link'}</button>
            </div>
          </form>
        )}

        {links.length === 0 && !showForm ? (
          <div style={{background:'#0D1120',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'12px',padding:'48px',textAlign:'center',color:'rgba(237,240,247,0.35)',fontSize:'13px'}}>
            No payment links yet. Create one and share it anywhere — social media, email, your website.
          </div>
        ) : (
          <div style={{display:'grid',gap:'10px'}}>
            {links.map(l=>(
              <div key={l.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:'#0D1120',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'10px',padding:'16px 18px',gap:'12px'}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:'13px',fontWeight:600,color:'#EDF0F7',marginBottom:'3px'}}>{l.title}</div>
                  <a href={l.url||('https://konduyt.dev/pay/'+l.handle)} target="_blank" rel="noopener" style={{fontSize:'12px',color:'#F59E0B',textDecoration:'none',display:'block',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    konduyt.dev/pay/{l.handle}
                  </a>
                </div>
                <div style={{fontSize:'13px',color:'rgba(237,240,247,0.55)',whiteSpace:'nowrap'}}>
                  {l.amount ? l.currency + ' ' + l.amount.toLocaleString() : 'Open amount'}
                </div>
                <button onClick={()=>copy(l.url||('https://konduyt.dev/pay/'+l.handle), l.id)}
                  style={{fontSize:'12px',fontWeight:600,color:copied===l.id?'#22C55E':'rgba(237,240,247,0.5)',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',padding:'6px 12px',borderRadius:'6px',cursor:'pointer',flexShrink:0}}>
                  {copied===l.id?'Copied!':'Copy'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </ProjectLayout>
  )
}
