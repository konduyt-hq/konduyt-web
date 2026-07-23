'use client'
import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
export default function DiagnosticsRedirect() {
  const { orgId, projectId } = useParams()
  const router = useRouter()
  useEffect(() => { router.replace('/dashboard/' + orgId + '/' + projectId + '/logs') }, [])
  return null
}
