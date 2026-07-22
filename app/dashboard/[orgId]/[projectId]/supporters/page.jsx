'use client'
import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
export default function SupportersRedirect() {
  const { orgId, projectId } = useParams()
  const router = useRouter()
  useEffect(() => { router.replace('/dashboard/' + orgId + '/' + projectId + '/customers') }, [])
  return null
}
