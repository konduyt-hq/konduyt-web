'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { useApi } from '../../../../../lib/useApi'
import BuildLayout from '../../../../../components/layouts/ProjectLayout'

export default function KeysPage() {
  const { orgId, projectId } = useParams()
  const { isLoaded, isSignedIn } = useAuth()
  const api = useApi()
  const router = useRouter()
  const [org, setOrg]           = useState(null)
  const [project, setProject]   = useState(null)
  const [keys, setKeys]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [rotating, setRotating] = useState(false)
  const [copied, setCopied]     = useState(null)

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) { router.push('/login'); return }
    Promise.all([
      api.get('/projects/project/' + projectId),
      api.get('/orgs/' + orgId),
      api.get('/projects/project/' + projectId + '/keys'),
    ]).then(([p,o,k]) => { setProject(p); setOrg(o); setKeys(k) })
     .catch(console.error).finally(() => setLoading(false))
  }, [isLoaded, isSignedIn])

  async function rotate() {
    if (!confirm('Rotating keys will invalidate your current secret key. Any integrations using the old key will break. Continue?')) return
    setRotating(true)
    try { const k = await api.post('/projects/project/' + projectId + '/keys/rotate', {}); setKeys(k) }
    catch (e) { alert(e.message) } finally { setRotating(false) }
  }

  function copy(val, label) {
    navigator.clipboard.writeText(val)
    setCopied(label)
    setTimeout(() => setCopied(null), 2000)
  }

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:'#07090F',color:'rgba(237,240,247,0.4)'}}>Loading...</div>

  return (
    <ProjectLayout org={org} project={project}>
      <div style={{maxWidth:'680px'}}>
        <div style={{marginBottom:'32px'}}>
          <h1 style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:'22px',color:'#EDF0F7',marginBottom:'8px'}}>API Keys</h1>
          <p style={{fontSize:'14px',color:'rgba(237,240,247,0.5)',lineHeight:1.65}}>
            Use these keys to authenticate API requests from your application.
            Keep your secret key private — never expose it in client-side code.
          </p>
        </div>

        <div style={{display:'grid',gap:'12px',marginBottom:'28px'}}>
          {keys && [
            { label:'Publishable key', value:keys.publishable_key, hint:'Safe to use in client-side code and mobile apps.', secret:false },
            { label:'Secret key',      value:keys.secret_key,      hint:'Keep this private. Use only in server-side code.', secret:true },
          ].map(k=>(
            <div key={k.label} style={{background:'#0D1120',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'12px',padding:'18px'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'10px'}}>
                <div>
                  <div style={{fontSize:'13px',fontWeight:600,color:'#EDF0F7',marginBottom:'3px'}}>{k.label}</div>
                  <div style={{fontSize:'12px',color:'rgba(237,240,247,0.4)'}}>{k.hint}</div>
                </div>
                <button onClick={()=>copy(k.value,k.label)} style={{fontSize:'12px',fontWeight:600,color:copied===k.label?'#22C55E':'rgba(237,240,247,0.5)',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',padding:'6px 12px',borderRadius:'6px',cursor:'pointer',flexShrink:0}}>
                  {copied===k.label?'Copied!':'Copy'}
                </button>
              </div>
              <div style={{fontFamily:'monospace',fontSize:'12px',color:'rgba(237,240,247,0.7)',background:'rgba(0,0,0,0.3)',padding:'10px 12px',borderRadius:'6px',wordBreak:'break-all',letterSpacing:'.02em'}}>
                {k.secret ? k.value.slice(0,16) + '•'.repeat(20) : k.value}
              </div>
            </div>
          ))}
        </div>

        <div style={{background:'rgba(239,68,68,0.06)',border:'1px solid rgba(239,68,68,0.15)',borderRadius:'12px',padding:'18px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:'16px'}}>
          <div>
            <div style={{fontSize:'13px',fontWeight:600,color:'#EDF0F7',marginBottom:'4px'}}>Rotate keys</div>
            <div style={{fontSize:'12px',color:'rgba(237,240,247,0.5)',lineHeight:1.55}}>Generates new keys and immediately invalidates the current ones. Update your integration before rotating.</div>
          </div>
          <button onClick={rotate} disabled={rotating} style={{fontSize:'12px',fontWeight:600,color:'#EF4444',background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.25)',padding:'9px 16px',borderRadius:'100px',cursor:'pointer',flexShrink:0,opacity:rotating?0.6:1}}>
            {rotating?'Rotating...':'Rotate keys'}
          </button>
        </div>

        {project && !project.live_mode && (
          <div style={{marginTop:'20px',padding:'16px',background:'rgba(245,158,11,0.06)',border:'1px solid rgba(245,158,11,0.15)',borderRadius:'10px',fontSize:'13px',color:'rgba(237,240,247,0.6)',lineHeight:1.65}}>
            You are in sandbox mode. These are test keys. Go live in Settings to get production keys.
          </div>
        )}
      </div>
    </ProjectLayout>
  )
}
