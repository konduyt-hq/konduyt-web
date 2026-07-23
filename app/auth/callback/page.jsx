'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '../../../lib/auth-context'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://konduyt-api.onrender.com'

export default function AuthCallback() {
  const router       = useRouter()
  const params       = useSearchParams()
  const { login }    = useAuth()
  const [error, setError] = useState('')

  useEffect(() => {
    const code  = params.get('code')
    const state = params.get('state')
    const err   = params.get('error')

    if (err) { setError('Google sign-in was cancelled.'); return }
    if (!code) { setError('No auth code received.'); return }

    // Exchange code with our backend
    fetch(`${API}/v1/auth/google/exchange`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        redirect_uri: window.location.origin + '/auth/callback',
      }),
    })
      .then(r => r.ok ? r.json() : r.json().then(d => Promise.reject(d.error?.message || 'Auth failed')))
      .then(d => { login(d.token, d.user); router.replace('/dashboard') })
      .catch(e => setError(typeof e === 'string' ? e : 'Authentication failed. Please try again.'))
  }, [])

  if (error) return (
    <div style={{ minHeight:'100vh', background:'#07090F', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'16px', padding:'20px', fontFamily:'Inter,sans-serif' }}>
      <div style={{ fontSize:'24px' }}>✗</div>
      <div style={{ fontSize:'16px', fontWeight:600, color:'#EDF0F7' }}>Sign-in failed</div>
      <div style={{ fontSize:'14px', color:'rgba(237,240,247,0.5)' }}>{error}</div>
      <button onClick={() => router.replace('/login')}
        style={{ padding:'10px 20px', background:'#FF5C35', color:'#fff', border:'none', borderRadius:'100px', fontSize:'13px', fontWeight:600, cursor:'pointer' }}>
        Back to login
      </button>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'#07090F', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'16px', fontFamily:'Inter,sans-serif' }}>
      <div style={{ width:'36px', height:'36px', border:'2px solid rgba(255,92,53,0.3)', borderTopColor:'#FF5C35', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <div style={{ fontSize:'14px', color:'rgba(237,240,247,0.5)' }}>Signing you in…</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
