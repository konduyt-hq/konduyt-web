'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '../../../../../lib/supabase'
import { get } from '../../../../../lib/api'
import DashboardLayout from '../../../../../components/dashboard/DashboardLayout'
import SettingsTab from '../../../../../components/dashboard/SettingsTab'

export default function SettingsPage() {
  const router    = useRouter()
  const params    = useParams()
  const { orgId, projectId } = params
  const [project, setProject] = useState(null)
  const [org, setOrg]         = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.push('/login'); return }
      Promise.all([
        get(`/projects/project/${projectId}`),
        get(`/orgs/${orgId}`)
      ]).then(([p, o]) => { setProject(p); setOrg(o); setLoading(false) })
        .catch(() => setLoading(false))
    })
  }, [projectId, orgId])

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',color:'var(--text-muted)'}}>Loading…</div>

  return (
    <DashboardLayout org={org} project={project}>
      <SettingsTab project={project} org={org} />
    </DashboardLayout>
  )
}
