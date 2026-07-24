'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://konduyt-api.onrender.com'

export default function ResetPasswordPage() {
  const router  = useRouter()
  const params  = useSearchParams()
  const token   = params.get('token') || ''
  const [password,  setPassword]  = useState('')
  const [password2, setPassword2] = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [done,      setDone]      = useState(false)

  useEffect(() => {
    if (!token) setError('Invalid reset link. Please request a new one.')
  }, [token])

  async function handleSubmit(e) {
    e.preventDefault(); setError('')
    if (password !== password2) { setError('Passwords do not match'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true)
    try {
      const r = await fetch(`${API}/v1/auth/reset-password`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ token, password }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error?.message || d.detail || 'Reset failed')
      setDone(true)
      setTimeout(() => router.push('/login'), 3000)
    } catch(e) { setError(e.message) } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight:'100vh', background:'#07090F', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Inter,sans-serif', padding:'20px' }}>
      <div style={{ width:'100%', maxWidth:'380px' }}>
        <div style={{ textAlign:'center', marginBottom:'32px' }}>
          <div style={{ fontFamily:'"Space Grotesk",sans-serif', fontWeight:700, fontSize:'22px', letterSpacing:'.05em', color:'#EDF0F7', marginBottom:'6px' }}>
            KONDU<span style={{color:'#FF5C35'}}>Y</span>T
          </div>
          <div style={{ fontSize:'14px', color:'rgba(237,240,247,0.5)' }}>Set a new password</div>
        </div>

        <div style={{ background:'#0D1120', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'14px', padding:'28px' }}>
          {done ? (
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:'32px', marginBottom:'12px' }}>✓</div>
              <div style={{ fontSize:'15px', fontWeight:600, color:'#22C55E', marginBottom:'8px' }}>Password updated</div>
              <div style={{ fontSize:'13px', color:'rgba(237,240,247,0.5)' }}>Redirecting to login…</div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display:'grid', gap:'12px' }}>
              <input type="password" required value={password} onChange={e=>setPassword(e.target.value)}
                placeholder="New password (8+ characters)" autoComplete="new-password"
                style={{ padding:'12px 14px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', color:'#EDF0F7', fontSize:'14px', outline:'none', width:'100%', boxSizing:'border-box' }} />
              <input type="password" required value={password2} onChange={e=>setPassword2(e.target.value)}
                placeholder="Confirm new password" autoComplete="new-password"
                style={{ padding:'12px 14px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', color:'#EDF0F7', fontSize:'14px', outline:'none', width:'100%', boxSizing:'border-box' }} />
              {error && <div style={{ fontSize:'13px', color:'#EF4444', padding:'8px 12px', background:'rgba(239,68,68,0.08)', borderRadius:'8px' }}>{error}</div>}
              <button type="submit" disabled={loading || !token}
                style={{ padding:'13px', background:'#FF5C35', color:'#fff', border:'none', borderRadius:'10px', fontSize:'14px', fontWeight:700, cursor:'pointer', opacity:(loading||!token)?0.6:1 }}>
                {loading ? 'Updating…' : 'Update password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
