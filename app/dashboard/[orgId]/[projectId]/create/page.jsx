'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { useApi } from '../../../../../lib/useApi'
import ProjectLayout from '../../../../../components/layouts/ProjectLayout'

const OFFER_TYPES = [
  { id:'payment_link', icon:'⇗', title:'Payment Link', desc:'Share a link and get paid instantly. Works anywhere — social, email, WhatsApp, your website.', available:true },
  { id:'subscription',  icon:'↻', title:'Subscription',  desc:'Charge a recurring monthly or yearly fee. Perfect for newsletters, courses, communities.',  available:false },
  { id:'product',       icon:'◻', title:'Digital Product', desc:'Sell files, templates, guides, or any digital download.',                                  available:false },
  { id:'donation',      icon:'♡', title:'Donation Page', desc:'Let your audience support you with any amount they choose.',                                  available:false },
  { id:'invoice',       icon:'▤', title:'Invoice',       desc:'Send a bill to a specific customer. Track payment status.',                                   available:false },
]

const CURRENCIES = ['KES','USD','NGN','GHS','ZAR','EUR','GBP']

export default function CreatePage() {
  const { orgId, projectId } = useParams()
  const { isLoaded, isSignedIn } = useAuth()
  const api = useApi()
  const router = useRouter()
  const [org, setOrg]         = useState(null)
  const [project, setProject] = useState(null)
  const [step, setStep]       = useState('choose')  // choose | configure | done
  const [selectedType, setSelectedType] = useState(null)
  const [form, setForm]       = useState({ title:'', description:'', amount:'', currency:'KES', interval:'' })
  const [saving, setSaving]   = useState(false)
  const [created, setCreated] = useState(null)
  const [copied, setCopied]   = useState(false)

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) { router.push('/login'); return }
    Promise.all([
      api.get('/projects/project/' + projectId),
      api.get('/orgs/' + orgId),
    ]).then(([p,o]) => { setProject(p); setOrg(o) }).catch(console.error)
  }, [isLoaded, isSignedIn])

  function selectType(type) {
    if (!type.available) return
    setSelectedType(type); setStep('configure')
  }

  async function create(e) {
    e.preventDefault(); setSaving(true)
    try {
      const payload = {
        type:        selectedType.id,
        title:       form.title,
        description: form.description || undefined,
        amount:      form.amount ? parseFloat(form.amount) : undefined,
        currency:    form.currency,
        interval:    selectedType.id === 'subscription' ? form.interval : undefined,
      }
      const offer = await api.post('/creator/' + projectId + '/offers', payload)
      setCreated(offer); setStep('done')
    } catch (e) { alert(e.message) } finally { setSaving(false) }
  }

  function copy() {
    navigator.clipboard.writeText(created?.url || '')
    setCopied(true); setTimeout(()=>setCopied(false), 2000)
  }

  const base = '/dashboard/' + orgId + '/' + projectId

  return (
    <ProjectLayout org={org} project={project}>
      <div style={{ maxWidth:'640px' }}>

        {/* Step: Choose what to sell */}
        {step === 'choose' && (
          <>
            <div style={{ marginBottom:'28px' }}>
              <h1 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'22px', color:'#EDF0F7', marginBottom:'6px' }}>What do you want to sell?</h1>
              <p style={{ fontSize:'14px', color:'rgba(237,240,247,0.5)' }}>Choose how you want to earn.</p>
            </div>
            <div style={{ display:'grid', gap:'10px' }}>
              {OFFER_TYPES.map(opt => (
                <button key={opt.id} onClick={() => selectType(opt)} disabled={!opt.available}
                  style={{ display:'flex', alignItems:'center', gap:'16px', padding:'18px 20px', background:'#0D1120', border:'1px solid', borderColor: opt.available?'rgba(255,255,255,0.08)':'rgba(255,255,255,0.04)', borderRadius:'12px', textAlign:'left', cursor: opt.available?'pointer':'default', opacity: opt.available?1:0.5, transition:'border-color .15s', width:'100%' }}>
                  <div style={{ width:'44px', height:'44px', borderRadius:'10px', background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', color:'#F59E0B', flexShrink:0 }}>
                    {opt.icon}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px' }}>
                      <span style={{ fontSize:'15px', fontWeight:700, color:'#EDF0F7' }}>{opt.title}</span>
                      {!opt.available && <span style={{ fontSize:'10px', fontWeight:700, padding:'2px 6px', borderRadius:'4px', background:'rgba(245,158,11,0.1)', color:'#F59E0B' }}>SOON</span>}
                    </div>
                    <div style={{ fontSize:'13px', color:'rgba(237,240,247,0.5)', lineHeight:1.55 }}>{opt.desc}</div>
                  </div>
                  {opt.available && <span style={{ color:'rgba(237,240,247,0.3)', fontSize:'16px', flexShrink:0 }}>→</span>}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Step: Configure the offer */}
        {step === 'configure' && selectedType && (
          <>
            <div style={{ marginBottom:'24px' }}>
              <button onClick={()=>setStep('choose')} style={{ fontSize:'12px', color:'rgba(237,240,247,0.4)', background:'none', border:'none', cursor:'pointer', marginBottom:'12px', padding:0 }}>← Back</button>
              <h1 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'22px', color:'#EDF0F7', marginBottom:'4px' }}>
                {selectedType.icon} {selectedType.title}
              </h1>
              <p style={{ fontSize:'14px', color:'rgba(237,240,247,0.5)' }}>{selectedType.desc}</p>
            </div>
            <form onSubmit={create} style={{ display:'grid', gap:'16px' }}>
              <div>
                <label style={{ fontSize:'12px', fontWeight:700, letterSpacing:'.06em', textTransform:'uppercase', color:'rgba(237,240,247,0.5)', display:'block', marginBottom:'8px' }}>Title *</label>
                <input required value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="e.g. My Photography Preset Pack"
                  style={{ width:'100%', padding:'12px 14px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', color:'#EDF0F7', fontSize:'15px', outline:'none', boxSizing:'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize:'12px', fontWeight:700, letterSpacing:'.06em', textTransform:'uppercase', color:'rgba(237,240,247,0.5)', display:'block', marginBottom:'8px' }}>Description</label>
                <textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Tell customers what they're getting..."
                  rows={3} style={{ width:'100%', padding:'12px 14px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', color:'#EDF0F7', fontSize:'14px', outline:'none', resize:'vertical', boxSizing:'border-box' }} />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:'12px' }}>
                <div>
                  <label style={{ fontSize:'12px', fontWeight:700, letterSpacing:'.06em', textTransform:'uppercase', color:'rgba(237,240,247,0.5)', display:'block', marginBottom:'8px' }}>Price (leave blank = customer chooses)</label>
                  <input type="number" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} placeholder="0.00" min="0" step="0.01"
                    style={{ width:'100%', padding:'12px 14px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', color:'#EDF0F7', fontSize:'15px', outline:'none', boxSizing:'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize:'12px', fontWeight:700, letterSpacing:'.06em', textTransform:'uppercase', color:'rgba(237,240,247,0.5)', display:'block', marginBottom:'8px' }}>Currency</label>
                  <select value={form.currency} onChange={e=>setForm(f=>({...f,currency:e.target.value}))}
                    style={{ width:'100%', padding:'12px 14px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', color:'#EDF0F7', fontSize:'14px', outline:'none', boxSizing:'border-box' }}>
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" disabled={saving||!form.title} style={{ padding:'14px', background:'#F59E0B', color:'#fff', border:'none', borderRadius:'100px', fontSize:'15px', fontWeight:700, cursor:'pointer', opacity:saving||!form.title?0.5:1, marginTop:'4px' }}>
                {saving ? 'Creating...' : `Create ${selectedType.title}`}
              </button>
            </form>
          </>
        )}

        {/* Step: Done — share it */}
        {step === 'done' && created && (
          <div>
            <div style={{ textAlign:'center', marginBottom:'28px' }}>
              <div style={{ fontSize:'40px', marginBottom:'12px' }}>🎉</div>
              <h1 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'22px', color:'#EDF0F7', marginBottom:'6px' }}>Your offer is live</h1>
              <p style={{ fontSize:'14px', color:'rgba(237,240,247,0.5)' }}>Share this link and start earning.</p>
            </div>

            <div style={{ background:'#0D1120', border:'1px solid rgba(245,158,11,0.3)', borderRadius:'14px', padding:'24px', textAlign:'center', marginBottom:'20px' }}>
              <div style={{ fontSize:'15px', fontWeight:700, color:'#EDF0F7', marginBottom:'8px' }}>{created.title}</div>
              {created.amount && <div style={{ fontSize:'22px', fontWeight:700, color:'#F59E0B', marginBottom:'12px' }}>{created.currency} {created.amount.toLocaleString()}</div>}
              <div style={{ fontFamily:'monospace', fontSize:'14px', color:'#F59E0B', marginBottom:'16px', wordBreak:'break-all' }}>{created.url}</div>
              <button onClick={copy} style={{ fontSize:'14px', fontWeight:700, padding:'12px 28px', background:'#F59E0B', color:'#fff', border:'none', borderRadius:'100px', cursor:'pointer' }}>
                {copied ? '✓ Copied!' : 'Copy link'}
              </button>
            </div>

            <div style={{ display:'grid', gap:'10px' }}>
              <button onClick={()=>{setStep('choose');setForm({title:'',description:'',amount:'',currency:'KES',interval:''});setCreated(null)}}
                style={{ padding:'12px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'100px', color:'rgba(237,240,247,0.7)', fontSize:'13px', fontWeight:600, cursor:'pointer' }}>
                Create another
              </button>
              <button onClick={()=>router.push(base+'/sales')}
                style={{ padding:'12px', background:'none', border:'none', color:'rgba(237,240,247,0.4)', fontSize:'13px', cursor:'pointer' }}>
                View all sales →
              </button>
            </div>
          </div>
        )}
      </div>
    </ProjectLayout>
  )
}
