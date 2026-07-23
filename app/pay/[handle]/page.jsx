'use client'
import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://konduyt-api.onrender.com'

const PAYMENT_METHODS = [
  { id:'mpesa',    label:'M-Pesa',  icon:'M', color:'#00A550', field:'phone', placeholder:'07XXXXXXXX' },
  { id:'stripe',   label:'Card',    icon:'💳', color:'#635BFF', field:'card',  placeholder:null },
  { id:'paystack', label:'Paystack',icon:'PS', color:'#0BA4DB', field:'email', placeholder:'your@email.com' },
]

export default function CheckoutPage() {
  const { handle } = useParams()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [step, setStep]       = useState('pay')  // pay | processing | success | failed
  const [amount, setAmount]   = useState('')
  const [email, setEmail]     = useState('')
  const [phone, setPhone]     = useState('')
  const [method, setMethod]   = useState(null)
  const [paying, setPaying]   = useState(false)
  const [result, setResult]   = useState(null)
  const [error, setError]     = useState(null)

  useEffect(() => {
    fetch(`${API}/v1/p/offer/${handle}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(d => {
        setData(d)
        if (d.offer.amount) setAmount(d.offer.amount.toString())
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [handle])

  async function pay() {
    if (!method) return
    setPaying(true); setStep('processing')
    try {
      const body = {
        amount:         parseFloat(amount),
        currency:       data.offer.currency,
        vendor:         method,
        customer_email: email || undefined,
        customer_phone: phone || undefined,
        metadata: { offer_handle: handle, offer_title: data.offer.title },
      }
      // Use the public checkout endpoint
      const r = await fetch(`${API}/v1/checkout/${data.offer.project_id}/charge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const res = await r.json()
      if (res.status === 'success' || res.status === 'pending') {
        setResult(res); setStep('success')
      } else {
        setError(res.error?.message || 'Payment failed'); setStep('failed')
      }
    } catch (e) {
      setError(e.message); setStep('failed')
    } finally {
      setPaying(false)
    }
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'#07090F', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:'32px', height:'32px', border:'2px solid rgba(237,240,247,0.1)', borderTopColor:'#F59E0B', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (notFound) return (
    <div style={{ minHeight:'100vh', background:'#07090F', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:'12px', padding:'20px' }}>
      <div style={{ fontSize:'32px' }}>∅</div>
      <div style={{ fontSize:'16px', fontWeight:600, color:'#EDF0F7' }}>Offer not found</div>
      <div style={{ fontSize:'14px', color:'rgba(237,240,247,0.45)' }}>This payment link may have expired or been removed.</div>
    </div>
  )

  const { offer, creator } = data
  const accent = creator?.accent_color || '#F59E0B'
  const displayName = creator?.display_name || 'Creator'
  const username = creator?.username

  // ── Success ────────────────────────────────────────────────────────────────
  if (step === 'success') return (
    <div style={{ minHeight:'100vh', background:'#07090F', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
      <div style={{ maxWidth:'400px', width:'100%', textAlign:'center' }}>
        <div style={{ width:'64px', height:'64px', borderRadius:'50%', background:'rgba(34,197,94,0.15)', border:'2px solid rgba(34,197,94,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'28px', margin:'0 auto 20px' }}>✓</div>
        <h1 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'22px', color:'#EDF0F7', marginBottom:'6px' }}>Payment successful</h1>
        <p style={{ fontSize:'14px', color:'rgba(237,240,247,0.55)', marginBottom:'24px' }}>
          {result?.status === 'pending' ? "We're confirming your payment. You'll receive confirmation shortly." : `Thank you for your purchase.`}
        </p>
        {result?.transaction_id && (
          <div style={{ background:'#0D1120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'10px', padding:'14px', marginBottom:'20px', fontSize:'12px', color:'rgba(237,240,247,0.5)' }}>
            Receipt: <Link href={`/receipt/${result.transaction_id}`} style={{ color:accent, textDecoration:'none', fontWeight:600 }}>View receipt →</Link>
          </div>
        )}
        {username && (
          <Link href={`/@${username}`} style={{ fontSize:'13px', color:'rgba(237,240,247,0.4)', textDecoration:'none' }}>← Back to {displayName}</Link>
        )}
      </div>
    </div>
  )

  // ── Failed ─────────────────────────────────────────────────────────────────
  if (step === 'failed') return (
    <div style={{ minHeight:'100vh', background:'#07090F', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
      <div style={{ maxWidth:'400px', width:'100%', textAlign:'center' }}>
        <div style={{ width:'64px', height:'64px', borderRadius:'50%', background:'rgba(239,68,68,0.12)', border:'2px solid rgba(239,68,68,0.25)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'24px', margin:'0 auto 20px' }}>✗</div>
        <h1 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'22px', color:'#EDF0F7', marginBottom:'6px' }}>Payment failed</h1>
        <p style={{ fontSize:'14px', color:'rgba(237,240,247,0.55)', marginBottom:'24px', lineHeight:1.6 }}>{error || 'Something went wrong. No money was taken.'}</p>
        <button onClick={() => { setStep('pay'); setError(null) }}
          style={{ padding:'12px 28px', background:accent, color:'#fff', border:'none', borderRadius:'100px', fontSize:'14px', fontWeight:600, cursor:'pointer' }}>
          Try again
        </button>
      </div>
    </div>
  )

  // ── Processing ─────────────────────────────────────────────────────────────
  if (step === 'processing') return (
    <div style={{ minHeight:'100vh', background:'#07090F', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'16px', padding:'20px' }}>
      <div style={{ width:'48px', height:'48px', border:`3px solid ${accent}30`, borderTopColor:accent, borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <div style={{ fontSize:'16px', fontWeight:600, color:'#EDF0F7' }}>Processing payment…</div>
      {method === 'mpesa' && (
        <div style={{ fontSize:'14px', color:'rgba(237,240,247,0.5)', textAlign:'center', maxWidth:'280px', lineHeight:1.6 }}>
          Check your phone for an M-Pesa prompt and enter your PIN to complete.
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  // ── Checkout form ──────────────────────────────────────────────────────────
  const canPay = method && amount && parseFloat(amount) > 0 && (method !== 'mpesa' || phone) && (method !== 'paystack' || email)

  return (
    <div style={{ minHeight:'100vh', background:'#07090F', fontFamily:'Inter,sans-serif' }}>
      <div style={{ height:'3px', background:`linear-gradient(90deg,${accent},${accent}66)` }} />

      <div style={{ maxWidth:'440px', margin:'0 auto', padding:'32px 20px 80px' }}>

        {/* Creator info */}
        {creator && (
          <Link href={`/@${username}`} style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'28px', textDecoration:'none' }}>
            <div style={{ width:'36px', height:'36px', borderRadius:'50%', background:`${accent}20`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', fontWeight:700, color:accent, flexShrink:0 }}>
              {displayName[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize:'13px', fontWeight:600, color:'#EDF0F7' }}>{displayName}</div>
              <div style={{ fontSize:'11px', color:'rgba(237,240,247,0.4)' }}>@{username}</div>
            </div>
          </Link>
        )}

        {/* Offer */}
        <div style={{ marginBottom:'24px' }}>
          <h1 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'22px', color:'#EDF0F7', marginBottom:'6px', lineHeight:1.3 }}>{offer.title}</h1>
          {offer.description && (
            <p style={{ fontSize:'14px', color:'rgba(237,240,247,0.55)', lineHeight:1.65, marginBottom:'0' }}>{offer.description}</p>
          )}
        </div>

        {/* Amount */}
        <div style={{ marginBottom:'20px' }}>
          <label style={{ fontSize:'11px', fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'rgba(237,240,247,0.4)', display:'block', marginBottom:'8px' }}>
            Amount ({offer.currency})
          </label>
          {offer.amount ? (
            <div style={{ padding:'16px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'12px', fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'24px', color:accent }}>
              {offer.currency} {offer.amount.toLocaleString()}
            </div>
          ) : (
            <div style={{ position:'relative' }}>
              <span style={{ position:'absolute', left:'16px', top:'50%', transform:'translateY(-50%)', fontSize:'16px', fontWeight:600, color:'rgba(237,240,247,0.4)' }}>{offer.currency}</span>
              <input type="number" value={amount} onChange={e=>setAmount(e.target.value)}
                placeholder={offer.min_amount ? `Min ${offer.min_amount}` : '0.00'} min={offer.min_amount||0} step="1"
                style={{ width:'100%', padding:'16px 16px 16px 56px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'12px', color:'#EDF0F7', fontSize:'20px', fontWeight:700, outline:'none', boxSizing:'border-box' }} />
            </div>
          )}
        </div>

        {/* Payment method */}
        <div style={{ marginBottom:'20px' }}>
          <label style={{ fontSize:'11px', fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'rgba(237,240,247,0.4)', display:'block', marginBottom:'8px' }}>
            Pay with
          </label>
          <div style={{ display:'grid', gap:'8px' }}>
            {PAYMENT_METHODS.map(m => (
              <button key={m.id} onClick={() => setMethod(m.id)}
                style={{ display:'flex', alignItems:'center', gap:'12px', padding:'14px 16px', background: method===m.id?`${m.color}12`:'rgba(255,255,255,0.03)', border:'1px solid', borderColor:method===m.id?`${m.color}50`:'rgba(255,255,255,0.07)', borderRadius:'10px', cursor:'pointer', textAlign:'left', width:'100%' }}>
                <div style={{ width:'32px', height:'32px', borderRadius:'8px', background:`${m.color}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:700, color:m.color, flexShrink:0 }}>
                  {m.icon}
                </div>
                <span style={{ fontSize:'14px', fontWeight:600, color:'#EDF0F7' }}>{m.label}</span>
                {method===m.id && <span style={{ marginLeft:'auto', fontSize:'16px', color:m.color }}>●</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Contact details — conditional on method */}
        {method && (
          <div style={{ marginBottom:'20px', display:'grid', gap:'10px' }}>
            {(method === 'mpesa') && (
              <div>
                <label style={{ fontSize:'11px', fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'rgba(237,240,247,0.4)', display:'block', marginBottom:'8px' }}>M-Pesa phone number *</label>
                <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="07XXXXXXXX" type="tel"
                  style={{ width:'100%', padding:'13px 14px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', color:'#EDF0F7', fontSize:'15px', outline:'none', boxSizing:'border-box' }} />
              </div>
            )}
            <div>
              <label style={{ fontSize:'11px', fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'rgba(237,240,247,0.4)', display:'block', marginBottom:'8px' }}>Email (for receipt)</label>
              <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="your@email.com" type="email"
                style={{ width:'100%', padding:'13px 14px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', color:'#EDF0F7', fontSize:'15px', outline:'none', boxSizing:'border-box' }} />
            </div>
          </div>
        )}

        {/* Pay button */}
        <button onClick={pay} disabled={!canPay||paying}
          style={{ width:'100%', padding:'16px', background: canPay?accent:'rgba(255,255,255,0.08)', color: canPay?'#fff':'rgba(237,240,247,0.3)', border:'none', borderRadius:'100px', fontSize:'16px', fontWeight:700, cursor:canPay?'pointer':'default', transition:'background .15s', marginBottom:'16px' }}>
          {paying ? 'Processing…' : amount ? `Pay ${offer.currency} ${parseFloat(amount||0).toLocaleString()}` : 'Enter amount'}
        </button>

        <div style={{ textAlign:'center', fontSize:'12px', color:'rgba(237,240,247,0.25)', lineHeight:1.6 }}>
          Secured by <a href="https://konduyt.dev" style={{ color:accent, textDecoration:'none', fontWeight:600 }}>Konduyt</a> · Your payment details are encrypted
        </div>
      </div>
    </div>
  )
}
