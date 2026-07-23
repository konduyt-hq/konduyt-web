'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '../../../../../lib/auth-context'
import { useApi } from '../../../../../lib/useApi'
import ProjectLayout from '../../../../../components/layouts/ProjectLayout'

const STATUS_COLOR = { success:'#22C55E', failed:'#EF4444', pending:'#F59E0B', refunded:'#8892A4' }

const TABS = [
  { id:'all',      label:'All' },
  { id:'incoming', label:'Incoming',  desc:'Payments received from customers and supporters' },
  { id:'outgoing', label:'Outgoing',  desc:'Payroll and people payments sent out' },
]

export default function PaymentsPage() {
  const { orgId, projectId } = useParams()
  const { isLoaded, isSignedIn } = useAuth()
  const api = useApi()
  const router = useRouter()
  const [org, setOrg]         = useState(null)
  const [project, setProject] = useState(null)
  const [data, setData]       = useState({ total:0, transactions:[] })
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch]   = useState('')
  const [refunding, setRefunding] = useState(null)

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) { router.push('/login'); return }
    Promise.all([
      api.get('/projects/project/' + projectId),
      api.get('/orgs/' + orgId),
    ]).then(([p,o]) => { setProject(p); setOrg(o) }).catch(console.error)
  }, [isLoaded, isSignedIn])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (search)                 params.set('search', search)
      const d = await api.get('/transactions/' + projectId + '/list?' + params)

      // Split into incoming vs outgoing based on metadata
      const all = d.transactions || []
      const incoming = all.filter(t => !t.metadata?.purpose || t.metadata.purpose === 'payment')
      const outgoing  = all.filter(t => t.metadata?.purpose === 'payroll')

      if (tab === 'incoming') setData({ total: incoming.length, transactions: incoming })
      else if (tab === 'outgoing') setData({ total: outgoing.length, transactions: outgoing })
      else setData(d)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [projectId, tab, statusFilter, search])

  useEffect(() => { if (projectId) load() }, [load])

  async function refund(txnId) {
    if (!confirm('Refund this payment?')) return
    setRefunding(txnId)
    try { await api.post('/transactions/' + projectId + '/refund/' + txnId, {}); load() }
    catch (e) { alert(e.message) } finally { setRefunding(null) }
  }

  function exportCSV() {
    const rows = [['ID','Type','Amount','Currency','Vendor','Status','Customer','Date']]
    data.transactions.forEach(t => rows.push([
      t.id, t.metadata?.purpose||'incoming', t.amount, t.currency,
      t.vendor, t.status, t.customer_email||'', t.created_at||''
    ]))
    const blob = new Blob([rows.map(r=>r.join(',')).join('
')], {type:'text/csv'})
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = 'payments.csv'; a.click()
  }

  const totalIn  = data.transactions.filter(t=>!t.metadata?.purpose||t.metadata.purpose==='payment').reduce((a,t)=>a+(t.status==='success'?t.amount:0),0)
  const totalOut = data.transactions.filter(t=>t.metadata?.purpose==='payroll').reduce((a,t)=>a+(t.status==='success'?t.amount:0),0)

  return (
    <ProjectLayout org={org} project={project}>
      <div style={{maxWidth:'960px'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'20px',flexWrap:'wrap',gap:'12px'}}>
          <h1 style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:'22px',color:'#EDF0F7'}}>Payments</h1>
          <button onClick={exportCSV} style={{fontSize:'12px',fontWeight:600,color:'rgba(237,240,247,0.6)',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',padding:'7px 14px',borderRadius:'100px',cursor:'pointer'}}>Export CSV</button>
        </div>

        {/* Summary cards */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'12px',marginBottom:'20px'}}>
          {[
            { label:'Total incoming', value:'KES ' + totalIn.toLocaleString(),  color:'#22C55E' },
            { label:'Total outgoing', value:'KES ' + totalOut.toLocaleString(), color:'#FF5C35' },
            { label:'Net',            value:'KES ' + (totalIn - totalOut).toLocaleString(), color:'#EDF0F7' },
          ].map(s=>(
            <div key={s.label} style={{background:'#0D1120',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'10px',padding:'16px'}}>
              <div style={{fontSize:'11px',fontWeight:700,letterSpacing:'.08em',textTransform:'uppercase',color:'rgba(237,240,247,0.35)',marginBottom:'8px'}}>{s.label}</div>
              <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:'20px',color:s.color}}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{display:'flex',gap:'0',marginBottom:'16px',background:'#0D1120',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'10px',padding:'4px',width:'fit-content'}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{fontSize:'13px',fontWeight:tab===t.id?600:400,padding:'7px 16px',borderRadius:'7px',border:'none',background:tab===t.id?'rgba(255,255,255,0.08)':'transparent',color:tab===t.id?'#EDF0F7':'rgba(237,240,247,0.45)',cursor:'pointer',transition:'all .15s'}}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div style={{display:'flex',gap:'8px',marginBottom:'14px',flexWrap:'wrap',alignItems:'center'}}>
          {['all','success','failed','pending','refunded'].map(f=>(
            <button key={f} onClick={()=>setStatusFilter(f)} style={{fontSize:'12px',fontWeight:600,padding:'5px 12px',borderRadius:'100px',border:'1px solid',borderColor:statusFilter===f?'rgba(255,92,53,0.5)':'rgba(255,255,255,0.08)',background:statusFilter===f?'rgba(255,92,53,0.1)':'transparent',color:statusFilter===f?'#FF5C35':'rgba(237,240,247,0.5)',cursor:'pointer',textTransform:'capitalize'}}>
              {f}
            </button>
          ))}
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by ID, email..."
            style={{marginLeft:'auto',padding:'6px 12px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'8px',color:'#EDF0F7',fontSize:'12px',outline:'none',width:'200px'}} />
        </div>

        {/* Table */}
        <div style={{background:'#0D1120',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'12px',overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr style={{background:'#131928'}}>
                {['ID','Type','Amount','Vendor','Customer','Status','Date',''].map(h=>(
                  <th key={h} style={{textAlign:'left',padding:'10px 14px',fontSize:'10px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',color:'rgba(237,240,247,0.35)',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{padding:'40px',textAlign:'center',color:'rgba(237,240,247,0.35)',fontSize:'13px'}}>Loading...</td></tr>
              ) : data.transactions.length === 0 ? (
                <tr><td colSpan={8} style={{padding:'40px',textAlign:'center',color:'rgba(237,240,247,0.35)',fontSize:'13px'}}>No payments found.</td></tr>
              ) : data.transactions.map(t=>{
                const isOut = t.metadata?.purpose === 'payroll'
                return (
                  <tr key={t.id} style={{borderBottom:'1px solid rgba(255,255,255,0.03)'}}>
                    <td style={{padding:'11px 14px',fontSize:'11px',color:'rgba(237,240,247,0.4)',fontFamily:'monospace'}}>{t.id.slice(0,8)}</td>
                    <td style={{padding:'11px 14px'}}>
                      <span style={{fontSize:'11px',fontWeight:700,padding:'2px 7px',borderRadius:'100px',color:isOut?'#F59E0B':'#22C55E',background:isOut?'rgba(245,158,11,0.1)':'rgba(34,197,94,0.1)'}}>
                        {isOut ? '↑ Out' : '↓ In'}
                      </span>
                    </td>
                    <td style={{padding:'11px 14px',fontSize:'13px',fontWeight:600,color:'#EDF0F7'}}>{t.currency} {t.amount?.toLocaleString()}</td>
                    <td style={{padding:'11px 14px',fontSize:'12px',color:'rgba(237,240,247,0.6)',textTransform:'capitalize'}}>{t.vendor}</td>
                    <td style={{padding:'11px 14px',fontSize:'12px',color:'rgba(237,240,247,0.5)'}}>{t.customer_email||t.customer_phone||t.metadata?.person_name||'—'}</td>
                    <td style={{padding:'11px 14px'}}>
                      <span style={{fontSize:'11px',fontWeight:700,padding:'2px 8px',borderRadius:'100px',color:STATUS_COLOR[t.status]||'#8892A4',background:(STATUS_COLOR[t.status]||'#8892A4')+'18',textTransform:'capitalize'}}>{t.status}</span>
                    </td>
                    <td style={{padding:'11px 14px',fontSize:'11px',color:'rgba(237,240,247,0.35)'}}>{t.created_at?new Date(t.created_at).toLocaleDateString():''}</td>
                    <td style={{padding:'11px 14px'}}>
                      {t.status==='success'&&!isOut&&(
                        <button onClick={()=>refund(t.id)} disabled={refunding===t.id} style={{fontSize:'11px',fontWeight:600,color:'rgba(237,240,247,0.45)',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.07)',padding:'4px 10px',borderRadius:'6px',cursor:'pointer',opacity:refunding===t.id?0.5:1}}>
                          {refunding===t.id?'...':'Refund'}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </ProjectLayout>
  )
}
