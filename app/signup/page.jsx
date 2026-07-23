'use client'
import { useState, useEffect } from 'react'
import { useRouter }          from 'next/navigation'
import { useAuth }            from '../../lib/auth-context'
import Link                    from 'next/link'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://konduyt-api.onrender.com'

export default function SignupPage() {
  const router = useRouter()
  const { isLoaded, isSignedIn, login } = useAuth()
  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  useEffect(() => {
    if (isLoaded && isSignedIn) router.replace('/dashboard')
  }, [isLoaded, isSignedIn])

  async function handleSubmit(e) {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const r = await fetch(`${API}/v1/auth/signup`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ name, email, password }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error?.message || d.detail || 'Signup failed')
      login(d.token, d.user)
      router.replace('/dashboard')
    } catch(e) { setError(e.message) } finally { setLoading(false) }
  }

  async function signInWithGoogle() {
    const r = await fetch(`${API}/v1/auth/google?redirect_uri=${encodeURIComponent(window.location.origin + '/auth/callback')}`)
    const d = await r.json()
    if (d.url) window.location.href = d.url
  }

  return (
    <div style={{ minHeight:'100vh', background:'#07090F', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Inter,sans-serif', padding:'20px' }}>
      <div style={{ width:'100%', maxWidth:'380px' }}>
        <div style={{ textAlign:'center', marginBottom:'32px' }}>
          <div style={{ fontFamily:'"Space Grotesk",sans-serif', fontWeight:700, fontSize:'22px', letterSpacing:'.05em', color:'#EDF0F7', marginBottom:'6px' }}>
            KONDU<span style={{color:'#FF5C35'}}>Y</span>T
          </div>
          <div style={{ fontSize:'14px', color:'rgba(237,240,247,0.5)' }}>Create your free account</div>
        </div>

        <div style={{ background:'#0D1120', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'14px', padding:'28px' }}>
          
      <button type="button" onClick={signInWithGoogle}
        style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:'10px', padding:'13px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'10px', color:'#EDF0F7', fontSize:'14px', fontWeight:600, cursor:'pointer', marginBottom:'16px' }}>
        <svg width="18" height="18" viewBox="0 0 48 48">
          <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.9 32.6 29.4 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.6-8 19.6-20 0-1.3-.1-2.7-.4-4z"/>
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 18.9 13 24 13c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.1l-6.2-5.2C29.4 35.3 26.8 36 24 36c-5.4 0-9.9-3.4-11.3-8H6.3C9.7 35.7 16.3 40 24 40v4z"/>
          <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.5-2.6 4.6-4.8 6.1l6.2 5.2C40 36 44 30.4 44 24c0-1.3-.1-2.7-.4-4z"/>
        </svg>
        Continue with Google
      </button>
      <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'16px' }}>
        <div style={{ flex:1, height:'1px', background:'rgba(255,255,255,0.08)' }} />
        <span style={{ fontSize:'12px', color:'rgba(237,240,247,0.3)' }}>or</span>
        <div style={{ flex:1, height:'1px', background:'rgba(255,255,255,0.08)' }} />
      </div>

          <form onSubmit={handleSubmit} style={{ display:'grid', gap:'12px' }}>
            <input value={name} onChange={e=>setName(e.target.value)}
              placeholder="Your name" autoComplete="name"
              style={{ padding:'12px 14px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', color:'#EDF0F7', fontSize:'14px', outline:'none', width:'100%', boxSizing:'border-box' }} />
            <input type="email" required value={email} onChange={e=>setEmail(e.target.value)}
              placeholder="Email address" autoComplete="email"
              style={{ padding:'12px 14px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', color:'#EDF0F7', fontSize:'14px', outline:'none', width:'100%', boxSizing:'border-box' }} />
            <input type="password" required value={password} onChange={e=>setPassword(e.target.value)}
              placeholder="Password (8+ characters)" autoComplete="new-password"
              style={{ padding:'12px 14px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', color:'#EDF0F7', fontSize:'14px', outline:'none', width:'100%', boxSizing:'border-box' }} />

            {error && <div style={{ fontSize:'13px', color:'#EF4444', padding:'8px 12px', background:'rgba(239,68,68,0.08)', borderRadius:'8px' }}>{error}</div>}

            <button type="submit" disabled={loading}
              style={{ padding:'13px', background:'#FF5C35', color:'#fff', border:'none', borderRadius:'10px', fontSize:'14px', fontWeight:700, cursor:'pointer', opacity:loading?0.6:1 }}>
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <div style={{ textAlign:'center', marginTop:'16px', fontSize:'13px', color:'rgba(237,240,247,0.4)' }}>
            Already have an account? <Link href="/login" style={{color:'#FF5C35', textDecoration:'none', fontWeight:600}}>Sign in</Link>
          </div>

          <div style={{ textAlign:'center', marginTop:'12px', fontSize:'11px', color:'rgba(237,240,247,0.25)', lineHeight:1.55 }}>
            By signing up you agree to our <Link href="/terms" style={{color:'rgba(237,240,247,0.4)', textDecoration:'none'}}>Terms</Link> and <Link href="/privacy" style={{color:'rgba(237,240,247,0.4)', textDecoration:'none'}}>Privacy Policy</Link>.
          </div>
        </div>
      </div>
    </div>
  )
}
