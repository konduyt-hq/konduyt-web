'use client'
import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
export default function Redirect() {
  const p = useParams(); const r = useRouter()
  useEffect(() => { r.replace('/dashboard/' + p.orgId + '/' + p.projectId + '/payments') }, [])
  return null
}
