'use client'
import Link from 'next/link'
import { useClerk } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'

export default function TopBar({ org, product, accent = '#FF5C35', badge }) {
  const { signOut } = useClerk()
  const router = useRouter()
  const handleSignOut = async () => { await signOut(); router.push('/') }
  return (
    <header style={{ height:'52px', borderBottom:'1px solid rgba(255,255,255,0.05)', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 20px', background:'#0A0C14', flexShrink:0 }}>
      <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
        <Link href="/" style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'15px', letterSpacing:'.05em', color:'#EDF0F7', textDecoration:'none', flexShrink:0 }}>
          KONDU<span style={{ color:accent }}>Y</span>T
        </Link>
        {product && (
          <><span style={{ color:'rgba(255,255,255,0.2)', fontSize:'14px' }}>/</span>
          <span style={{ fontSize:'12px', fontWeight:700, color:accent, letterSpacing:'.04em', textTransform:'uppercase' }}>{product}</span></>
        )}
        {org && (
          <><span style={{ color:'rgba(255,255,255,0.2)', fontSize:'14px' }}>/</span>
          <Link href={'/dashboard/' + org.id} style={{ fontSize:'13px', color:'rgba(237,240,247,0.7)', textDecoration:'none' }}>{org.name}</Link></>
        )}
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
        {badge && <span style={{ fontSize:'11px', fontWeight:700, padding:'3px 8px', borderRadius:'100px', background:'rgba(245,158,11,0.15)', color:'#F59E0B' }}>{badge}</span>}
        <Link href="/pricing" style={{ fontSize:'12px', fontWeight:600, color:accent, background:'rgba(255,92,53,0.1)', border:'1px solid rgba(255,92,53,0.25)', padding:'5px 12px', borderRadius:'100px', textDecoration:'none' }}>Upgrade</Link>
        <button onClick={handleSignOut} style={{ fontSize:'12px', color:'rgba(237,240,247,0.4)', background:'none', border:'none', cursor:'pointer', padding:'4px 8px' }}>Sign out</button>
      </div>
    </header>
  )
}
