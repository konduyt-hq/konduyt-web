'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { useApi } from '../../../../../lib/useApi'
import ProjectLayout from '../../../../../components/layouts/ProjectLayout'

const OFFER_TYPES = [
  { id:'payment_link', icon:'⇗', title:'Payment Link',    desc:'Share a link, get paid. Works anywhere.', color:'#F59E0B', available:true },
  { id:'product',      icon:'◻', title:'Digital Product', desc:'Sell a file, template, or guide.',         color:'#22C55E', available:false },
  { id:'service',      icon:'◎', title:'Service',         desc:'Consultations, coaching, bookings.',       color:'#0BA4DB', available:false },
  { id:'subscription', icon:'↻', title:'Subscription',    desc:'Recurring monthly or yearly income.',      color:'#635BFF', available:false },
  { id:'donation',     icon:'♡', title:'Donation',        desc:'Let supporters pay what they choose.',     color:'#EF4444', available:false },
]

const CURRENCIES = ['KES','USD','NGN','GHS','GBP','EUR','ZAR','INR','BRL']

export default function CreatePage() {
  const { orgId, projectId } = useParams()
  const { isLoaded, isSignedIn } = useAuth()
  const api = useApi()
  const router = useRouter()
  const [org, setOrg]         = useState(null)
  const [project, setProject] = useState(null)
  const [selected, setSelected] = useState('payment_link')
  const [form, setForm]       = useState({ title:'', description:'', price:'', currency:'KES', handle:'' })
  const [saving, setSaving]   = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) { router.push('/login'); return }
    Promise.all([
      api.get('/projects/project/' + projectId),
      api.get('/orgs/' + orgId),
    ]).then(([p,o]) => { setProject(p); setOrg(o) }).catch(console.error).finally(()=>setLoading(false))
  }, [isLoaded, isSignedIn])

  async function create(e) {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    try {
      const offer = await api.post('/offers/' + projectId, {
        type:        selected,
        title:       form.title,
        description: form.description || null,
        price:       form.price ? parseFloat(form.price) : null,
        currency:    form.currency,
        handle:      form.handle || null,
      })
      router.push('/dashboard/' + orgId + '/' + projectId + '/sales')
    } catch (e) { alert(e.message) } finally { setSaving(false) }
  }

  const selectedType = OFFER_TYPES.find(t => t.id === selected)

  return (
    <ProjectLayout org={org} project={project}>
      <div style={{ maxWidth:'720px' }}>
        <div style={{ marginBottom:'28px' }}>
          <h1 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'22px', color:'#EDF0F7', marginBottom:'6px' }}>Create</h1>
          <p style={{ fontSize:'14px', color:'rgba(237,240,247,0.5)' }}>What do you want to sell?</p>
        </div>

        {/* Type selector */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'8px', marginBottom:'24px' }}>
          {OFFER_TYPES.map(t => (
            <button key={t.id} onClick={() => t.available && setSelected(t.id)} style={{ padding:'12px 8px', background: selected===t.id?'rgba(245,158,11,0.12)':'#0D1120', border:'1px solid', borderColor:selected===t.id?'rgba(245,158,11,0.4)':'rgba(255,255,255,0.06)', borderRadius:'10px', cursor:t.available?'pointer':'not-allowed', textAlign:'center', opacity:t.available?1:0.45, transition:'all .15s', position:'relative' }}>
              <div style={{ fontSize:'18px', marginBottom:'4px' }}>{t.icon}</div>
              <div style={{ fontSize:'11px', fontWeight:600, color:selected===t.id?'#F59E0B':'#EDF0F7' }}>{t.title}</div>
              {!t.available && <div style={{ fontSize:'9px', fontWeight:700, color:'#F59E0B', marginTop:'3px' }}>SOON</div>}
            </button>
          ))}
        </div>

        {/* Form */}
        {selectedType?.available && (
          <form onSubmit={create} style={{ background:'#0D1120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'14px', padding:'22px', display:'grid', gap:'16px' }}>
            <div>
              <label style={{ fontSize:'12px', fontWeight:600, color:'rgba(237,240,247,0.55)', textTransform:'uppercase', letterSpacing:'.06em', display:'block', marginBottom:'7px' }}>Title *</label>
              <input required value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="e.g. 1-hour strategy session, UI kit, Beat pack vol.2..."
                style={{ width:'100%', padding:'11px 14px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:'9px', color:'#EDF0F7', fontSize:'14px', outline:'none', boxSizing:'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize:'12px', fontWeight:600, color:'rgba(237,240,247,0.55)', textTransform:'uppercase', letterSpacing:'.06em', display:'block', marginBottom:'7px' }}>Description (optional)</label>
              <textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="What does the buyer get? Be specific."
                rows={3} style={{ width:'100%', padding:'11px 14px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:'9px', color:'#EDF0F7', fontSize:'14px', outline:'none', resize:'vertical', boxSizing:'border-box', fontFamily:'inherit' }} />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
              <div>
                <label style={{ fontSize:'12px', fontWeight:600, color:'rgba(237,240,247,0.55)', textTransform:'uppercase', letterSpacing:'.06em', display:'block', marginBottom:'7px' }}>Price (blank = buyer chooses)</label>
                <input type="number" min="0" step="any" value={form.price} onChange={e=>setForm(f=>({...f,price:e.target.value}))} placeholder="500"
                  style={{ width:'100%', padding:'11px 14px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:'9px', color:'#EDF0F7', fontSize:'14px', outline:'none', boxSizing:'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize:'12px', fontWeight:600, color:'rgba(237,240,247,0.55)', textTransform:'uppercase', letterSpacing:'.06em', display:'block', marginBottom:'7px' }}>Currency</label>
                <select value={form.currency} onChange={e=>setForm(f=>({...f,currency:e.target.value}))}
                  style={{ width:'100%', padding:'11px 14px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:'9px', color:'#EDF0F7', fontSize:'14px', outline:'none', boxSizing:'border-box' }}>
                  {CURRENCIES.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={{ fontSize:'12px', fontWeight:600, color:'rgba(237,240,247,0.55)', textTransform:'uppercase', letterSpacing:'.06em', display:'block', marginBottom:'7px' }}>Link handle (optional — auto-generated if blank)</label>
              <div style={{ display:'flex', alignItems:'center', gap:'0', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:'9px', overflow:'hidden' }}>
                <span style={{ padding:'11px 10px 11px 14px', fontSize:'13px', color:'rgba(237,240,247,0.4)', whiteSpace:'nowrap' }}>konduyt.dev/pay/</span>
                <input value={form.handle} onChange={e=>setForm(f=>({...f,handle:e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,'')}))} placeholder="your-name"
                  style={{ flex:1, padding:'11px 14px 11px 0', background:'none', border:'none', color:'#EDF0F7', fontSize:'14px', outline:'none' }} />
              </div>
            </div>
            <button type="submit" disabled={saving||!form.title.trim()} style={{ padding:'14px', background:'#F59E0B', color:'#fff', border:'none', borderRadius:'100px', fontSize:'14px', fontWeight:600, cursor:'pointer', opacity:(saving||!form.title.trim())?0.5:1, marginTop:'4px' }}>
              {saving ? 'Creating...' : 'Create ' + selectedType.title + ' →'}
            </button>
          </form>
        )}
      </div>
    </ProjectLayout>
  )
}
