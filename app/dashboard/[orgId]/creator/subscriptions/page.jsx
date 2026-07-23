'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '../../../../../lib/auth-context'
import { useApi } from '../../../../../lib/useApi'
import CreatorLayout from '../../../../../components/layouts/CreatorLayout'

export default function Page() {
  const params  = useParams()
  const { isLoaded, isSignedIn } = useAuth()
  const api     = useApi()
  const router  = useRouter()
  const [org, setOrg]         = useState(null)
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) { router.push('/login'); return }
    const promises = [api.get('/orgs/' + params.orgId)]
    if (params.projectId) promises.push(api.get('/projects/project/' + params.projectId))
    Promise.all(promises)
      .then(([o, p]) => { setOrg(o); if (p) setProject(p) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [isLoaded, isSignedIn])

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#07090F', color:'rgba(237,240,247,0.4)' }}>Loading...</div>

  return (
    <CreatorLayout org={org} project={project}>
      <div style={{ maxWidth:'720px' }}>
        <h1 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'22px', color:'#EDF0F7', marginBottom:'8px' }}>Subscriptions</h1>
        <p style={{ fontSize:'14px', color:'rgba(237,240,247,0.5)', lineHeight:1.65, marginBottom:'32px' }}>Monthly and recurring supporters. Manage tiers and access.</p>
        <div style={{{{ display:"inline-flex", alignItems:"center", gap:"6px", fontSize:"11px", fontWeight:700, padding:"4px 12px", borderRadius:"100px", background:"rgba(245,158,11,0.1)", color:"#F59E0B", letterSpacing:".06em", marginBottom:"24px" }}}}>IN DEVELOPMENT · SEPTEMBER 2026</div>
        <div style={{ background:'#0D1120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'12px', padding:'40px', textAlign:'center', color:'rgba(237,240,247,0.35)', fontSize:'13px' }}>
          This feature is in development and will be available September 2026.
        </div>
      </div>
    </CreatorLayout>
  )
}
