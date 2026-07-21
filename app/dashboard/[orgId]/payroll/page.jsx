'use client'
import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function Redirect() {
  const { orgId } = useParams()
  const router = useRouter()
  useEffect(() => { router.replace('/dashboard/' + orgId) }, [])
  return null
}
