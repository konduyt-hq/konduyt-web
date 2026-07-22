'use client'
import Link from 'next/link'
import { useClerk } from '@clerk/nextjs'
import { useRouter, useParams, usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'

export default function TopBar({ org, product, accent = '#FF5C35', badge }) {
  const { signOut } = useClerk()
  const router   = useRouter()
  const pathname = usePathname()
  const params   = useParams()
  const [notifs, setNotifs]   = useState([])
  const [unread, setUnread]   = useState(0)
  const [open, setOpen]       = useState(false)
  const [loadingN, setLoadingN] = useState(false)
  const bellRef = useRef(null)

  const handleSignOut = async () => { await signOut(); router.push('/') }

  // Load notifications if we have a projectId
  useEffect(() => {
    const projectId = params?.projectId
    if (!projectId) return
    fetch('/api/v1/notifications/' + projectId)
      .catch(() => {})
  }, [params?.projectId])

  // Close on outside click
  useEffect(() => {
    function handleClick(e) { if (bellRef.current && !bellRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

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

        {/* Notification bell */}
        <div ref={bellRef} style={{ position:'relative' }}>
          <button onClick={() => setOpen(o => !o)} style={{ position:'relative', background:'none', border:'none', color:'rgba(237,240,247,0.5)', fontSize:'16px', cursor:'pointer', padding:'4px 6px', borderRadius:'6px', lineHeight:1 }}>
            🔔
            {unread > 0 && (
              <span style={{ position:'absolute', top:'0', right:'0', width:'8px', height:'8px', borderRadius:'50%', background:accent, border:'2px solid #0A0C14' }} />
            )}
          </button>
          {open && (
            <div style={{ position:'absolute', right:0, top:'calc(100% + 8px)', width:'300px', background:'#0D1120', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'12px', boxShadow:'0 20px 60px rgba(0,0,0,0.5)', zIndex:200, overflow:'hidden' }}>
              <div style={{ padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ fontSize:'13px', fontWeight:600, color:'#EDF0F7' }}>Notifications</span>
                {unread > 0 && <button onClick={() => setUnread(0)} style={{ fontSize:'11px', color:accent, background:'none', border:'none', cursor:'pointer' }}>Mark all read</button>}
              </div>
              {notifs.length === 0 ? (
                <div style={{ padding:'32px 16px', textAlign:'center', color:'rgba(237,240,247,0.35)', fontSize:'13px' }}>
                  No notifications yet
                </div>
              ) : notifs.map(n => (
                <div key={n.id} style={{ padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,0.05)', background:n.read?'transparent':'rgba(255,255,255,0.02)' }}>
                  <div style={{ fontSize:'13px', fontWeight:600, color:'#EDF0F7', marginBottom:'3px' }}>{n.title}</div>
                  {n.body && <div style={{ fontSize:'12px', color:'rgba(237,240,247,0.5)' }}>{n.body}</div>}
                  <div style={{ fontSize:'11px', color:'rgba(237,240,247,0.3)', marginTop:'4px' }}>{n.created_at ? new Date(n.created_at).toLocaleString() : ''}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Link href="/pricing" style={{ fontSize:'12px', fontWeight:600, color:accent, background: accent + '18', border:'1px solid ' + accent + '40', padding:'5px 12px', borderRadius:'100px', textDecoration:'none' }}>Upgrade</Link>
        <button onClick={handleSignOut} style={{ fontSize:'12px', color:'rgba(237,240,247,0.4)', background:'none', border:'none', cursor:'pointer', padding:'4px 8px' }}>Sign out</button>
      </div>
    </header>
  )
}
