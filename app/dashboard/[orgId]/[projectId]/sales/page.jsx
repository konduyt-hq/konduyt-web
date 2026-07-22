'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { useApi } from '../../../../../lib/useApi'
import ProjectLayout from '../../../../../components/layouts/ProjectLayout'
import EmptyState from '../../../../../components/ui/EmptyState'
import Link from 'next/link'

export default function SalesPage() {
  const { orgId, projectId } = useParams()
  const { isLoaded, isSignedIn } = useAuth()
  const api = useApi()
  const router = useRouter()
  const [org, setOrg]     = useState(null)
  const [project, setProject] = useState(null)
  const [links, setLinks] = useState([])
  const [loading, setLoading] = useState(true)
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

  const base = '/dashboard/' + orgId + '/' + projectId

  function copy(url, id) {
    navigator.clipboard.writeText(url)
    setCopied(id); setTimeout(()=>setCopied(null),2000)
  }

  return (
    <ProjectLayout org={org} project={project}>
      <div style={{ maxWidth:'720px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'24px', gap:'12px', flexWrap:'wrap' }}>
          <div>
            <h1 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'22px', color:'#EDF0F7', marginBottom:'4px' }}>Sales</h1>
            <p style={{ fontSize:'13px', color:'rgba(237,240,247,0.45)' }}>Your payment links — share them anywhere.</p>
          </div>
          <Link href={base + '/create'} style={{ fontSize:'13px', fontWeight:600, color:'#fff', background:'#F59E0B', padding:'10px 20px', borderRadius:'100px', textDecoration:'none' }}>
            + Create
          </Link>
        </div>

        {links.length===0 ? (
          <EmptyState
            icon="⇗"
            title="Nothing to sell yet"
            desc="Create a payment link and share it with your audience. They pay, you earn. Simple."
            actions={[{ label:'Create your first link', href: base+'/create' }]}
          />
        ) : (
          <div style={{ display:'grid', gap:'10px' }}>
            {links.map(l => (
              <div key={l.id} style={{ display:'flex', alignItems:'center', gap:'14px', background:'#0D1120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'10px', padding:'16px 18px' }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:'14px', fontWeight:600, color:'#EDF0F7', marginBottom:'3px' }}>{l.title}</div>
                  <a href={l.url||('https://konduyt.dev/pay/'+l.handle)} target="_blank" rel="noopener" style={{ fontSize:'12px', color:'#F59E0B', textDecoration:'none' }}>konduyt.dev/pay/{l.handle}</a>
                </div>
                <div style={{ fontSize:'13px', color:'rgba(237,240,247,0.55)', whiteSpace:'nowrap' }}>
                  {l.amount ? l.currency+' '+l.amount.toLocaleString() : 'Open amount'}
                </div>
                <button onClick={()=>copy(l.url||('https://konduyt.dev/pay/'+l.handle), l.id)}
                  style={{ fontSize:'12px', fontWeight:600, color:copied===l.id?'#22C55E':'rgba(237,240,247,0.5)', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', padding:'7px 14px', borderRadius:'6px', cursor:'pointer', flexShrink:0 }}>
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
