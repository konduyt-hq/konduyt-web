'use client'
import { useState } from 'react'
import Link from 'next/link'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://konduyt-api.onrender.com'

export default function ForgotPasswordPage() {
  const [email,     setEmail]     = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [devUrl,    setDevUrl]    = useState('')

  async function handleSubmit(e) {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const r = await fetch(`${API}/v1/auth/forgot-password`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ email }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error?.message || 'Request failed')
      setSubmitted(true)
      // Dev mode: backend returns the URL directly when no email configured
      if (d.dev_reset_url) setDevUrl(d.dev_reset_url)
    } catch(e) { setError(e.message) } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight:'100vh', background:'#07090F', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Inter,sans-serif', padding:'20px' }}>
      <div style={{ width:'100%', maxWidth:'380px' }}>
        <div style={{ textAlign:'center', marginBottom:'32px' }}>
          <div style={{ fontFamily:'"Space Grotesk",sans-serif', fontWeight:700, fontSize:'22px', letterSpacing:'.05em', color:'#EDF0F7', marginBottom:'6px' }}>
            KONDU<span style={{color:'#FF5C35'}}>Y</span>T
          </div>
          <div style={{ fontSize:'14px', color:'rgba(237,240,247,0.5)' }}>Reset your password</div>
        </div>

        <div style={{ background:'#0D1120', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'14px', padding:'28px' }}>
          {submitted ? (
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:'32px', marginBottom:'12px' }}>📬</div>
              <div style={{ fontSize:'15px', fontWeight:600, color:'#EDF0F7', marginBottom:'8px' }}>Check your email</div>
              <div style={{ fontSize:'13px', color:'rgba(237,240,247,0.5)', lineHeight:1.65, marginBottom:'20px' }}>
                If an account exists for <strong style={{color:'#EDF0F7'}}>{email}</strong>, a reset link has been sent.
              </div>
              {devUrl && (
                <div style={{ background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:'8px', padding:'12px', marginBottom:'16px', textAlign:'left' }}>
                  <div style={{ fontSize:'11px', fontWeight:700, color:'#F59E0B', marginBottom:'6px' }}>DEV MODE — No email configured</div>
                  <a href={devUrl} style={{ fontSize:'12px', color:'#F59E0B', wordBreak:'break-all', textDecoration:'none' }}>{devUrl}</a>
                </div>
              )}
              <Link href="/login" style={{ fontSize:'13px', color:'#FF5C35', textDecoration:'none', fontWeight:600 }}>← Back to login</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display:'grid', gap:'14px' }}>
              <div style={{ fontSize:'13px', color:'rgba(237,240,247,0.6)', lineHeight:1.65 }}>
                Enter your email and we'll send you a link to reset your password.
              </div>
              <input type="email" required value={email} onChange={e=>setEmail(e.target.value)}
                placeholder="Email address" autoComplete="email"
                style={{ padding:'12px 14px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', color:'#EDF0F7', fontSize:'14px', outline:'none', width:'100%', boxSizing:'border-box' }} />
              {error && <div style={{ fontSize:'13px', color:'#EF4444', padding:'8px 12px', background:'rgba(239,68,68,0.08)', borderRadius:'8px' }}>{error}</div>}
              <button type="submit" disabled={loading}
                style={{ padding:'13px', background:'#FF5C35', color:'#fff', border:'none', borderRadius:'10px', fontSize:'14px', fontWeight:700, cursor:'pointer', opacity:loading?0.6:1 }}>
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
              <div style={{ textAlign:'center' }}>
                <Link href="/login" style={{ fontSize:'13px', color:'rgba(237,240,247,0.4)', textDecoration:'none' }}>← Back to login</Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
