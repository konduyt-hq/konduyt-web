'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://konduyt-api.onrender.com'

export default function PublicPayPage() {
  const { handle } = useParams()
  const [link, setLink]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [amount, setAmount]   = useState('')
  const [paying, setPaying]   = useState(false)
  const [done, setDone]       = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => {
    fetch(API + '/people/public/' + handle)
      .then(r => { if (!r.ok) throw new Error('Not found'); return r.json() })
      .then(d => { setLink(d); if (d.amount) setAmount(d.amount) })
      .catch(() => setError('This payment link does not exist.'))
      .finally(() => setLoading(false))
  }, [handle])

  async function handlePay(e) {
    e.preventDefault(); setPaying(true); setError('')
    try {
      const res = await fetch(API + '/transactions/charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Konduyt-Key': 'pk_test_public_link' },
        body: JSON.stringify({ amount: parseFloat(amount), currency: link.currency, metadata: { link_handle: handle } }),
      })
      const data = await res.json()
      if (data.status === 'success' || data.status === 'pending') setDone(true)
      else setError(data.error?.message || 'Payment failed')
    } catch (e) { setError(e.message) }
    finally { setPaying(false) }
  }

  if (loading) return <Wrapper><p style={{color:'#8892A4'}}>Loading...</p></Wrapper>
  if (error && !link) return <Wrapper><p style={{color:'#EF4444'}}>{error}</p><Link href="/" style={{color:'#FF5C35',fontSize:'13px'}}>Go to konduyt.dev</Link></Wrapper>

  if (done) return (
    <Wrapper>
      <div style={{fontSize:'48px',marginBottom:'16px'}}>✓</div>
      <h1 style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:'22px',marginBottom:'8px'}}>Payment sent</h1>
      <p style={{fontSize:'14px',color:'#8892A4'}}>Thank you for supporting {link.title}.</p>
    </Wrapper>
  )

  return (
    <Wrapper>
      <div style={{marginBottom:'8px',fontSize:'11px',fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',color:'#FF5C35'}}>
        KONDUYT PAYMENT
      </div>
      <h1 style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:'22px',marginBottom:'8px'}}>{link.title}</h1>
      {link.description && <p style={{fontSize:'14px',color:'#8892A4',marginBottom:'24px'}}>{link.description}</p>}

      <form onSubmit={handlePay} style={{display:'grid',gap:'12px',width:'100%',maxWidth:'340px'}}>
        {!link.amount && (
          <div style={{display:'grid',gap:'6px'}}>
            <label style={{fontSize:'12px',fontWeight:600,color:'#8892A4',textTransform:'uppercase',letterSpacing:'.06em'}}>Amount ({link.currency})</label>
            <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} required min="1" placeholder="500"
              style={{padding:'12px 14px',background:'#131928',border:'1px solid rgba(255,255,255,.07)',borderRadius:'9px',color:'#EDF0F7',fontSize:'16px',fontFamily:"'Space Grotesk',sans-serif",outline:'none'}} />
          </div>
        )}

        {link.amount && (
          <div style={{background:'#131928',border:'1px solid rgba(255,255,255,.07)',borderRadius:'9px',padding:'14px',textAlign:'center'}}>
            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:'28px'}}>{link.currency} {link.amount.toLocaleString()}</div>
          </div>
        )}

        {error && <p style={{fontSize:'13px',color:'#EF4444'}}>{error}</p>}

        <button type="submit" disabled={paying || !amount}
          style={{padding:'14px',background:'#FF5C35',color:'#fff',border:'none',borderRadius:'9px',fontSize:'15px',fontWeight:600,cursor:'pointer',opacity:paying?0.6:1}}>
          {paying ? 'Processing...' : 'Pay ' + link.currency + ' ' + (amount || '—')}
        </button>

        <p style={{fontSize:'11px',color:'rgba(255,255,255,.3)',textAlign:'center'}}>
          Optimized by <a href="https://konduyt.dev" style={{color:'#FF5C35'}}>Konduyt</a>
        </p>
      </form>
    </Wrapper>
  )
}

function Wrapper({ children }) {
  return (
    <div style={{minHeight:'100vh',background:'#07090F',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'32px',fontFamily:'Inter,sans-serif',color:'#EDF0F7',gap:'12px',textAlign:'center'}}>
      {children}
    </div>
  )
}
