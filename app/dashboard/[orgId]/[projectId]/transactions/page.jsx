'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { useApi } from '../../../../../lib/useApi'
import BuildLayout from '../../../../../components/layouts/BuildLayout'

const STATUS_COLORS = { success:'#22C55E', failed:'#EF4444', pending:'#F59E0B', refunded:'#8892A4' }

export default function TransactionsPage() {
  const { orgId, projectId } = useParams()
  const { isLoaded, isSignedIn } = useAuth()
  const api = useApi()
  const router = useRouter()
  const [org, setOrg]             = useState(null)
  const [project, setProject]     = useState(null)
  const [data, setData]           = useState({ total:0, transactions:[] })
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState('all')
  const [search, setSearch]       = useState('')
  const [refunding, setRefunding] = useState(null)

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) { router.push('/login'); return }
    Promise.all([
      api.get('/projects/project/' + projectId),
      api.get('/orgs/' + orgId),
    ]).then(([p,o]) => { setProject(p); setOrg(o) }).catch(console.error)
  }, [isLoaded, isSignedIn])

  const loadTxns = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter !== 'all') params.set('status', filter)
      if (search)           params.set('search', search)
      const d = await api.get('/transactions/' + projectId + '/list?' + params)
      setData(d)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [projectId, filter, search])

  useEffect(() => { if (projectId) loadTxns() }, [loadTxns])

  async function refund(txnId) {
    if (!confirm('Refund this transaction?')) return
    setRefunding(txnId)
    try { await api.post('/transactions/' + projectId + '/refund/' + txnId, {}); loadTxns() }
    catch (e) { alert(e.message) } finally { setRefunding(null) }
  }

  function exportCSV() {
    const rows = [['ID','Amount','Currency','Vendor','Status','Customer','Date']]
    data.transactions.forEach(t => rows.push([t.id, t.amount, t.currency, t.vendor, t.status, t.customer_email||'', t.created_at||'']))
    const blob = new Blob([rows.map(r=>r.join(',')).join('\n')], {type:'text/csv'})
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download='transactions.csv'; a.click()
  }

  return (
    <BuildLayout org={org} project={project}>
      <div style={{maxWidth:'960px'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'24px',flexWrap:'wrap',gap:'12px'}}>
          <div>
            <h1 style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:'22px',color:'#EDF0F7',marginBottom:'4px'}}>Transactions</h1>
            <p style={{fontSize:'13px',color:'rgba(237,240,247,0.45)'}}>{data.total} total</p>
          </div>
          <button onClick={exportCSV} style={{fontSize:'12px',fontWeight:600,color:'rgba(237,240,247,0.6)',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',padding:'8px 14px',borderRadius:'100px',cursor:'pointer'}}>
            Export CSV
          </button>
        </div>

        {/* Filters */}
        <div style={{display:'flex',gap:'8px',marginBottom:'16px',flexWrap:'wrap',alignItems:'center'}}>
          {['all','success','failed','pending','refunded'].map(f=>(
            <button key={f} onClick={()=>setFilter(f)} style={{fontSize:'12px',fontWeight:600,padding:'6px 14px',borderRadius:'100px',border:'1px solid',borderColor:filter===f?'rgba(255,92,53,0.5)':'rgba(255,255,255,0.08)',background:filter===f?'rgba(255,92,53,0.1)':'transparent',color:filter===f?'#FF5C35':'rgba(237,240,247,0.5)',cursor:'pointer',textTransform:'capitalize'}}>
              {f}
            </button>
          ))}
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by ID, email..." style={{marginLeft:'auto',padding:'7px 12px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'8px',color:'#EDF0F7',fontSize:'12px',outline:'none',width:'220px'}} />
        </div>

        {/* Table */}
        <div style={{background:'#0D1120',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'12px',overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr style={{background:'#131928'}}>
                {['ID','Amount','Vendor','Customer','Status','Date',''].map(h=>(
                  <th key={h} style={{textAlign:'left',padding:'10px 14px',fontSize:'10px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',color:'rgba(237,240,247,0.35)',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{padding:'40px',textAlign:'center',color:'rgba(237,240,247,0.35)',fontSize:'13px'}}>Loading...</td></tr>
              ) : data.transactions.length === 0 ? (
                <tr><td colSpan={7} style={{padding:'40px',textAlign:'center',color:'rgba(237,240,247,0.35)',fontSize:'13px'}}>No transactions found.</td></tr>
              ) : data.transactions.map(t=>(
                <tr key={t.id} style={{borderBottom:'1px solid rgba(255,255,255,0.03)'}}>
                  <td style={{padding:'11px 14px',fontSize:'11px',color:'rgba(237,240,247,0.45)',fontFamily:'monospace'}}>{t.id.slice(0,8)}</td>
                  <td style={{padding:'11px 14px',fontSize:'13px',fontWeight:600,color:'#EDF0F7'}}>{t.currency} {t.amount?.toLocaleString()}</td>
                  <td style={{padding:'11px 14px',fontSize:'12px',color:'rgba(237,240,247,0.6)',textTransform:'capitalize'}}>{t.vendor}</td>
                  <td style={{padding:'11px 14px',fontSize:'12px',color:'rgba(237,240,247,0.5)'}}>{t.customer_email||t.customer_phone||'—'}</td>
                  <td style={{padding:'11px 14px'}}>
                    <span style={{fontSize:'11px',fontWeight:700,padding:'2px 8px',borderRadius:'100px',color:STATUS_COLORS[t.status]||'#8892A4',background:(STATUS_COLORS[t.status]||'#8892A4')+'18',textTransform:'capitalize'}}>{t.status}</span>
                  </td>
                  <td style={{padding:'11px 14px',fontSize:'11px',color:'rgba(237,240,247,0.35)'}}>{t.created_at?new Date(t.created_at).toLocaleDateString():''}</td>
                  <td style={{padding:'11px 14px'}}>
                    {t.status==='success' && (
                      <button onClick={()=>refund(t.id)} disabled={refunding===t.id} style={{fontSize:'11px',fontWeight:600,color:'rgba(237,240,247,0.45)',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.07)',padding:'4px 10px',borderRadius:'6px',cursor:'pointer',opacity:refunding===t.id?0.5:1}}>
                        {refunding===t.id?'...':'Refund'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </BuildLayout>
  )
}
