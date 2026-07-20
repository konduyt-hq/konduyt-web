'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { useApi } from '../../../../../lib/useApi'
import BuildLayout from '../../../../../components/layouts/BuildLayout'
import PeopleTab from '../../../../../components/dashboard/PeopleTab'

export default function PeoplePage() {
  const { orgId, projectId } = useParams()
  const { isLoaded, isSignedIn } = useAuth()
  const api = useApi()
  const router = useRouter()
  const [org, setOrg]         = useState(null)
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) { router.push('/login'); return }
    Promise.all([
      api.get('/projects/project/' + projectId),
      api.get('/orgs/' + orgId),
    ]).then(([p,o]) => { setProject(p); setOrg(o) })
     .catch(console.error).finally(() => setLoading(false))
  }, [isLoaded, isSignedIn])

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:'#07090F',color:'rgba(237,240,247,0.4)'}}>Loading...</div>

  return (
    <BuildLayout org={org} project={project}>
      <div style={{maxWidth:'900px'}}>
        <h1 style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:'22px',color:'#EDF0F7',marginBottom:'6px'}}>People</h1>
        <p style={{fontSize:'14px',color:'rgba(237,240,247,0.5)',marginBottom:'28px',lineHeight:1.65}}>
          Employees, contractors, freelancers, affiliates. Pay anyone, anywhere. Create public payment links for tips and memberships.
        </p>
        <PeopleTab projectId={projectId} />
      </div>
    </BuildLayout>
  )
}
