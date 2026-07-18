'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { useApi } from '../../../../../lib/useApi'
import DashboardLayout from '../../../../../components/dashboard/DashboardLayout'
import TransactionsTab from '../../../../../components/dashboard/TransactionsTab'

export default function TransactionsPage() {
  const router = useRouter()
  const { orgId, projectId } = useParams()
  const { isLoaded, isSignedIn } = useAuth()
  const api = useApi()
  const [project, setProject] = useState(null)
  const [org, setOrg]         = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) { router.push('/login'); return }
    Promise.all([
      api.get('/projects/project/' + projectId),
      api.get('/orgs/' + orgId),
    ]).then(([p, o]) => { setProject(p); setOrg(o) })
      .catch(e => console.error(e))
      .finally(() => setLoading(false))
  }, [isLoaded, isSignedIn, projectId, orgId])

  if (!isLoaded || loading) return <Loading />
  return <DashboardLayout org={org} project={project}><TransactionsTab projectId={projectId} /></DashboardLayout>
}

function Loading() {
  return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', color:'var(--text-muted)', background:'var(--bg)' }}>Loading...</div>
}
