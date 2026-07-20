'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { useApi } from '../../../../lib/useApi'
import CreatorLayout from '../../../../components/layouts/CreatorLayout'
import Link from 'next/link'

export default function CreatorHome() {
  const { orgId } = useParams()
  const { isLoaded, isSignedIn } = useAuth()
  const api = useApi()
  const router = useRouter()
  const [org, setOrg]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) { router.push('/login'); return }
    api.get('/orgs/' + orgId).then(setOrg).catch(console.error).finally(() => setLoading(false))
  }, [isLoaded, isSignedIn, orgId])

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#07090F', color:'rgba(237,240,247,0.4)' }}>Loading...</div>

  return (
    <CreatorLayout org={org}>
      <div style={{ maxWidth:'760px' }}>
        <div style={{ marginBottom:'32px' }}>
          <div style={{ fontSize:'11px', fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'rgba(245,158,11,0.7)', marginBottom:'8px' }}>KONDUYTcreator</div>
          <h1 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'22px', color:'#EDF0F7', marginBottom:'6px' }}>Creator dashboard</h1>
          <p style={{ fontSize:'14px', color:'rgba(237,240,247,0.5)', lineHeight:1.65 }}>Accept payments from anyone, anywhere. Track your income. Understand your taxes.</p>
        </div>

        {/* Coming soon notice */}
        <div style={{ background:'rgba(245,158,11,0.06)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:'12px', padding:'24px', marginBottom:'28px' }}>
          <div style={{ fontSize:'14px', fontWeight:700, color:'#F59E0B', marginBottom:'6px' }}>In development</div>
          <div style={{ fontSize:'13px', color:'rgba(237,240,247,0.6)', lineHeight:1.65, marginBottom:'16px' }}>
            KONDUYTcreator is launching September 2026. The payment engine is already built — we are now building the creator-specific interface on top of it.
          </div>
          <a href="mailto:teamkonduyt@gmail.com" style={{ fontSize:'13px', fontWeight:600, color:'#F59E0B', textDecoration:'none', border:'1px solid rgba(245,158,11,0.3)', padding:'8px 16px', borderRadius:'100px' }}>
            Get notified when live →
          </a>
        </div>

        {/* Preview cards */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', opacity:0.5 }}>
          {[
            { label:"Today's earnings",    value:'—',   icon:'$' },
            { label:'Active payment links', value:'0',   icon:'⇗' },
            { label:'Total supporters',    value:'0',   icon:'♡' },
            { label:'Tax estimate',        value:'—',   icon:'§' },
          ].map(s => (
            <div key={s.label} style={{ background:'#0D1120', border:'1px solid rgba(255,255,255,0.05)', borderRadius:'10px', padding:'16px' }}>
              <div style={{ fontSize:'11px', fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'rgba(237,240,247,0.3)', marginBottom:'8px' }}>{s.icon} {s.label}</div>
              <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'24px', color:'rgba(237,240,247,0.4)' }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>
    </CreatorLayout>
  )
}
