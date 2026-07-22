'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useApi } from '../../lib/useApi'

const STEPS = [
  { id:'welcome',  title:'Welcome to KONDUYTcreator', emoji:'🎉' },
  { id:'account',  title:'Where should we send your money?', emoji:'💳' },
  { id:'offer',    title:'What do you want to sell?', emoji:'✨' },
  { id:'share',    title:"You're ready to earn", emoji:'🚀' },
]

export default function OnboardingWizard({ orgId, projectId, onComplete }) {
  const api = useApi()
  const router = useRouter()
  const [step, setStep]     = useState(0)
  const [offer, setOffer]   = useState({ type:'payment_link', title:'', price:'', currency:'KES' })
  const [created, setCreated] = useState(null)
  const [saving, setSaving] = useState(false)

  const base = '/dashboard/' + orgId + '/' + projectId

  async function createOffer() {
    if (!offer.title.trim()) return
    setSaving(true)
    try {
      const o = await api.post('/offers/' + projectId, {
        type:     offer.type,
        title:    offer.title,
        price:    offer.price ? parseFloat(offer.price) : null,
        currency: offer.currency,
      })
      setCreated(o)
      setStep(3)
    } catch (e) { alert(e.message) } finally { setSaving(false) }
  }

  function finish() {
    localStorage.setItem('konduyt_onboarded_' + projectId, '1')
    onComplete?.()
    router.push(base)
  }

  const progress = ((step) / (STEPS.length - 1)) * 100

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(7,9,15,0.95)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'20px' }}>
      <div style={{ width:'100%', maxWidth:'500px', background:'#0D1120', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'20px', overflow:'hidden' }}>

        {/* Progress bar */}
        <div style={{ height:'3px', background:'rgba(255,255,255,0.06)' }}>
          <div style={{ height:'100%', background:'#F59E0B', width:progress+'%', transition:'width .4s' }} />
        </div>

        {/* Step indicator */}
        <div style={{ padding:'20px 24px 0', display:'flex', gap:'8px' }}>
          {STEPS.map((s, i) => (
            <div key={s.id} style={{ flex:1, height:'3px', borderRadius:'2px', background: i <= step ? '#F59E0B' : 'rgba(255,255,255,0.1)', transition:'background .3s' }} />
          ))}
        </div>

        <div style={{ padding:'28px 28px 24px' }}>
          <div style={{ fontSize:'28px', marginBottom:'12px' }}>{STEPS[step].emoji}</div>
          <h2 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'20px', color:'#EDF0F7', marginBottom:'8px' }}>{STEPS[step].title}</h2>

          {/* Step 0: Welcome */}
          {step === 0 && (
            <div>
              <p style={{ fontSize:'14px', color:'rgba(237,240,247,0.6)', lineHeight:1.7, marginBottom:'24px' }}>
                KONDUYTcreator is your personal business operating system. Sell your work, get paid your way, manage everything you earn — without thinking about payment providers, APIs, or technical complexity.
              </p>
              <p style={{ fontSize:'13px', color:'rgba(237,240,247,0.45)', marginBottom:'24px' }}>
                This takes about 2 minutes. Let's get your first sale ready.
              </p>
              <button onClick={() => setStep(1)} style={{ width:'100%', padding:'14px', background:'#F59E0B', color:'#fff', border:'none', borderRadius:'12px', fontSize:'14px', fontWeight:600, cursor:'pointer' }}>
                Let's go →
              </button>
            </div>
          )}

          {/* Step 1: Connect payout account */}
          {step === 1 && (
            <div>
              <p style={{ fontSize:'14px', color:'rgba(237,240,247,0.6)', lineHeight:1.65, marginBottom:'20px' }}>
                Connect where you want to receive your earnings. You can add more accounts later.
              </p>
              <div style={{ display:'grid', gap:'10px', marginBottom:'20px' }}>
                {[
                  { id:'mpesa',  name:'M-Pesa',  desc:'Kenya — instant mobile money', color:'#00A550' },
                  { id:'paypal', name:'PayPal',  desc:'Global — works in 200+ countries', color:'#009CDE' },
                  { id:'stripe', name:'Stripe',  desc:'Global cards + bank transfers', color:'#635BFF' },
                ].map(acc => (
                  <button key={acc.id} onClick={() => router.push(base + '/accounts')} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'14px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'10px', cursor:'pointer', textAlign:'left' }}>
                    <div style={{ width:'32px', height:'32px', borderRadius:'8px', background:acc.color+'20', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:700, color:acc.color, flexShrink:0 }}>
                      {acc.id[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize:'13px', fontWeight:600, color:'#EDF0F7' }}>{acc.name}</div>
                      <div style={{ fontSize:'11px', color:'rgba(237,240,247,0.45)' }}>{acc.desc}</div>
                    </div>
                    <span style={{ marginLeft:'auto', color:'rgba(237,240,247,0.3)' }}>→</span>
                  </button>
                ))}
              </div>
              <button onClick={() => setStep(2)} style={{ width:'100%', padding:'12px', background:'transparent', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'12px', color:'rgba(237,240,247,0.6)', fontSize:'13px', cursor:'pointer' }}>
                Skip for now — I'll connect an account later
              </button>
            </div>
          )}

          {/* Step 2: Create first offer */}
          {step === 2 && (
            <div>
              <p style={{ fontSize:'14px', color:'rgba(237,240,247,0.6)', lineHeight:1.65, marginBottom:'20px' }}>
                What do you want to sell? You can change this later or add more offers.
              </p>
              <div style={{ display:'grid', gap:'12px', marginBottom:'20px' }}>
                <div>
                  <label style={{ fontSize:'12px', fontWeight:600, color:'rgba(237,240,247,0.55)', textTransform:'uppercase', letterSpacing:'.06em', display:'block', marginBottom:'6px' }}>What are you selling?</label>
                  <input value={offer.title} onChange={e=>setOffer(o=>({...o,title:e.target.value}))} placeholder="e.g. Design consultation, Ebook, Beat pack, Photo presets..."
                    style={{ width:'100%', padding:'11px 14px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'9px', color:'#EDF0F7', fontSize:'14px', outline:'none', boxSizing:'border-box' }} />
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                  <div>
                    <label style={{ fontSize:'12px', fontWeight:600, color:'rgba(237,240,247,0.55)', textTransform:'uppercase', letterSpacing:'.06em', display:'block', marginBottom:'6px' }}>Price (leave blank = open)</label>
                    <input type="number" value={offer.price} onChange={e=>setOffer(o=>({...o,price:e.target.value}))} placeholder="2000"
                      style={{ width:'100%', padding:'11px 14px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'9px', color:'#EDF0F7', fontSize:'14px', outline:'none', boxSizing:'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize:'12px', fontWeight:600, color:'rgba(237,240,247,0.55)', textTransform:'uppercase', letterSpacing:'.06em', display:'block', marginBottom:'6px' }}>Currency</label>
                    <select value={offer.currency} onChange={e=>setOffer(o=>({...o,currency:e.target.value}))}
                      style={{ width:'100%', padding:'11px 14px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'9px', color:'#EDF0F7', fontSize:'14px', outline:'none', boxSizing:'border-box' }}>
                      {['KES','USD','NGN','GHS','GBP','EUR','ZAR'].map(c=><option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <button onClick={createOffer} disabled={saving||!offer.title.trim()} style={{ width:'100%', padding:'14px', background:'#F59E0B', color:'#fff', border:'none', borderRadius:'12px', fontSize:'14px', fontWeight:600, cursor:'pointer', opacity:(saving||!offer.title.trim())?0.5:1, marginBottom:'10px' }}>
                {saving ? 'Creating...' : 'Create my offer →'}
              </button>
              <button onClick={() => setStep(3)} style={{ width:'100%', padding:'12px', background:'transparent', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'12px', color:'rgba(237,240,247,0.6)', fontSize:'13px', cursor:'pointer' }}>
                Skip — I'll create an offer later
              </button>
            </div>
          )}

          {/* Step 3: Done */}
          {step === 3 && (
            <div>
              <p style={{ fontSize:'14px', color:'rgba(237,240,247,0.6)', lineHeight:1.65, marginBottom:'20px' }}>
                {created ? `Your offer "${created.title}" is live.` : "You're set up."} Share the link below and start earning.
              </p>
              {created && (
                <div style={{ background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.25)', borderRadius:'10px', padding:'14px 16px', marginBottom:'20px' }}>
                  <div style={{ fontSize:'11px', fontWeight:700, color:'rgba(245,158,11,0.7)', marginBottom:'6px', letterSpacing:'.08em', textTransform:'uppercase' }}>Your payment link</div>
                  <div style={{ fontFamily:'monospace', fontSize:'13px', color:'#F59E0B', marginBottom:'10px' }}>{created.payment_url}</div>
                  <button onClick={() => { navigator.clipboard.writeText(created.payment_url) }} style={{ fontSize:'12px', fontWeight:600, color:'#fff', background:'#F59E0B', border:'none', padding:'7px 14px', borderRadius:'6px', cursor:'pointer' }}>
                    Copy link
                  </button>
                </div>
              )}
              <p style={{ fontSize:'12px', color:'rgba(237,240,247,0.4)', marginBottom:'20px', lineHeight:1.6 }}>
                Share it on social media, in an email, via WhatsApp — anywhere. When someone pays, you'll see it in your dashboard.
              </p>
              <button onClick={finish} style={{ width:'100%', padding:'14px', background:'#F59E0B', color:'#fff', border:'none', borderRadius:'12px', fontSize:'14px', fontWeight:600, cursor:'pointer' }}>
                Go to my dashboard →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
