'use client'
import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function IntegrationsRedirect() {
  const { orgId, projectId } = useParams()
  const router = useRouter()
  useEffect(() => { router.replace('/dashboard/' + orgId + '/' + projectId + '/connections') }, [])
  return null
}
