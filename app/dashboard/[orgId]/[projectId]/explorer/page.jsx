'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '../../../../../lib/auth-context'
import { useApi } from '../../../../../lib/useApi'
import ProjectLayout from '../../../../../components/layouts/ProjectLayout'

const EVENT_COLORS = {
  'payment.created':    '#8892A4', 'payment.processing': '#0BA4DB',
  'payment.succeeded':  '#22C55E', 'payment.failed':     '#EF4444',
  'payment.cancelled':  '#8892A4', 'refund.requested':   '#F59E0B',
  'refund.succeeded':   '#22C55E', 'refund.failed':      '#EF4444',
  'reconciliation.mismatch': '#EF4444',
}

export default function ExplorerPage() {
  const { orgId, projectId } = useParams()
  const { isLoaded, isSignedIn } = useAuth()
  const api = useApi()
  const router = useRouter()
  const [org, setOrg]         = useState(null)
  const [project, setProject] = useState(null)
  const [query, setQuery]     = useState({ request_id:'', transaction_id:'', error_code:'' })
  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) { router.push('/login'); return }
    Promise.all([
      api.get('/projects/project/' + projectId),
      api.get('/orgs/' + orgId),
    ]).then(([p,o]) => { setProject(p); setOrg(o) }).catch(console.error)
  }, [isLoaded, isSignedIn])

  async function search(e) {
    e.preventDefault()
    if (!query.request_id && !query.transaction_id && !query.error_code) return
    setLoading(true); setSearched(true)
    try {
      const params = new URLSearchParams()
      if (query.request_id)     params.set('request_id',     query.request_id.trim())
      if (query.transaction_id) params.set('transaction_id', query.transaction_id.trim())
      if (query.error_code)     params.set('error_code',     query.error_code.trim())
      const d = await api.get('/observe/' + projectId + '/explore?' + params)
      setResult(d)
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  return (
    <ProjectLayout org={org} project={project}>
      <div style={{maxWidth:'800px'}}>
        <div style={{marginBottom:'24px'}}>
          <h1 style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:'22px',color:'#EDF0F7',marginBottom:'6px'}}>Error Explorer</h1>
          <p style={{fontSize:'13px',color:'rgba(237,240,247,0.45)'}}>Search by request ID, transaction ID, or error code to reconstruct what happened.</p>
        </div>

        {/* Search form */}
        <form onSubmit={search} style={{background:'#0D1120',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px',padding:'20px',marginBottom:'24px',display:'grid',gap:'12px'}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'12px'}}>
            {[
              { key:'request_id',     label:'Request ID',     placeholder:'req_4f6e247a...',  mono:true },
              { key:'transaction_id', label:'Transaction ID', placeholder:'uuid...',          mono:true },
              { key:'error_code',     label:'Error Code',     placeholder:'payment_failed',   mono:false },
            ].map(f=>(
              <div key={f.key}>
                <label style={{fontSize:'11px',fontWeight:700,letterSpacing:'.06em',textTransform:'uppercase',color:'rgba(237,240,247,0.4)',display:'block',marginBottom:'6px'}}>{f.label}</label>
                <input
                  value={query[f.key]}
                  onChange={e=>setQuery(q=>({...q,[f.key]:e.target.value}))}
                  placeholder={f.placeholder}
                  style={{width:'100%',padding:'9px 10px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'7px',color:'#EDF0F7',fontSize:'12px',outline:'none',fontFamily:f.mono?'monospace':undefined,boxSizing:'border-box'}}
                />
              </div>
            ))}
          </div>
          <div style={{display:'flex',justifyContent:'flex-end'}}>
            <button type="submit" disabled={loading||(!query.request_id&&!query.transaction_id&&!query.error_code)} style={{fontSize:'13px',fontWeight:600,padding:'9px 20px',background:'#FF5C35',color:'#fff',border:'none',borderRadius:'100px',cursor:'pointer',opacity:(loading||(!query.request_id&&!query.transaction_id&&!query.error_code))?0.5:1}}>
              {loading?'Searching...':'Search'}
            </button>
          </div>
        </form>

        {/* Results */}
        {searched && result && (
          <div style={{display:'grid',gap:'16px'}}>

            {/* Transaction record */}
            {result.transaction && (
              <div style={{background:'#0D1120',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'12px',padding:'18px'}}>
                <div style={{fontSize:'11px',fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',color:'rgba(237,240,247,0.3)',marginBottom:'12px'}}>Transaction</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'10px',marginBottom:'12px'}}>
                  {[
                    {label:'Status',   value:result.transaction.status,   mono:false},
                    {label:'Amount',   value:result.transaction.currency + ' ' + result.transaction.amount?.toLocaleString(), mono:false},
                    {label:'Vendor',   value:result.transaction.vendor,   mono:false},
                    {label:'Customer', value:result.transaction.customer_email||'—', mono:false},
                    {label:'ID',       value:result.transaction.id?.slice(0,16)+'...', mono:true},
                  ].map(f=>(
                    <div key={f.label}>
                      <div style={{fontSize:'10px',fontWeight:700,letterSpacing:'.06em',textTransform:'uppercase',color:'rgba(237,240,247,0.3)',marginBottom:'4px'}}>{f.label}</div>
                      <div style={{fontSize:'13px',color:'#EDF0F7',fontFamily:f.mono?'monospace':undefined}}>{f.value}</div>
                    </div>
                  ))}
                </div>
                {result.transaction.decision_reason && (
                  <div style={{fontSize:'12px',color:'rgba(237,240,247,0.55)',padding:'8px 10px',background:'rgba(255,92,53,0.06)',borderRadius:'6px',borderLeft:'2px solid #FF5C35'}}>
                    <span style={{fontWeight:700,color:'#FF5C35'}}>Decision:</span> {result.transaction.decision_reason}
                  </div>
                )}
              </div>
            )}

            {/* Ledger timeline */}
            {result.timeline?.length > 0 && (
              <div style={{background:'#0D1120',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'12px',overflow:'hidden'}}>
                <div style={{padding:'12px 16px',borderBottom:'1px solid rgba(255,255,255,0.05)',fontSize:'11px',fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',color:'rgba(237,240,247,0.3)'}}>
                  Ledger timeline ({result.timeline.length} events)
                </div>
                {result.timeline.map((evt,i)=>{
                  const color = EVENT_COLORS[evt.event_type] || '#8892A4'
                  return (
                    <div key={evt.id} style={{display:'flex',gap:'12px',padding:'12px 16px',borderBottom:i<result.timeline.length-1?'1px solid rgba(255,255,255,0.03)':'none'}}>
                      <div style={{width:'22px',height:'22px',borderRadius:'50%',background:color+'18',border:'1px solid '+color+'40',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'8px',color,flexShrink:0,marginTop:'1px'}}>●</div>
                      <div style={{flex:1}}>
                        <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'2px'}}>
                          <span style={{fontSize:'12px',fontWeight:600,color:'#EDF0F7',fontFamily:'monospace'}}>{evt.event_type}</span>
                          <span style={{fontSize:'11px',color:'rgba(237,240,247,0.35)'}}>{evt.timestamp?new Date(evt.timestamp).toLocaleTimeString():''}</span>
                        </div>
                        <div style={{fontSize:'11px',color:'rgba(237,240,247,0.4)'}}>{evt.connector}</div>
                        {evt.connector_reference && <div style={{fontSize:'10px',color:'rgba(237,240,247,0.3)',fontFamily:'monospace',marginTop:'2px'}}>ref: {evt.connector_reference}</div>}
                        {evt.metadata && Object.keys(evt.metadata).length > 0 && (
                          <div style={{fontSize:'10px',color:'rgba(237,240,247,0.3)',marginTop:'2px'}}>{Object.entries(evt.metadata).map(([k,v])=>`${k}: ${v}`).join(' · ')}</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* API log entries */}
            {result.logs?.length > 0 && (
              <div style={{background:'#0D1120',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'12px',overflow:'hidden'}}>
                <div style={{padding:'12px 16px',borderBottom:'1px solid rgba(255,255,255,0.05)',fontSize:'11px',fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',color:'rgba(237,240,247,0.3)'}}>
                  API logs ({result.logs.length})
                </div>
                {result.logs.map((l,i)=>(
                  <div key={l.id} style={{display:'flex',alignItems:'center',gap:'12px',padding:'10px 16px',borderBottom:i<result.logs.length-1?'1px solid rgba(255,255,255,0.03)':'none'}}>
                    <span style={{fontSize:'12px',fontWeight:700,color:l.status_code<400?'#22C55E':l.status_code<500?'#F59E0B':'#EF4444',minWidth:'32px'}}>{l.status_code}</span>
                    <span style={{fontSize:'11px',fontFamily:'monospace',color:'rgba(237,240,247,0.5)',minWidth:'40px'}}>{l.method}</span>
                    <span style={{fontSize:'12px',fontFamily:'monospace',color:'rgba(237,240,247,0.7)',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{l.path}</span>
                    {l.error_code && <span style={{fontSize:'11px',fontFamily:'monospace',color:'#EF4444'}}>{l.error_code}</span>}
                    <span style={{fontSize:'11px',color:'rgba(237,240,247,0.3)',flexShrink:0}}>{l.duration_ms}ms</span>
                  </div>
                ))}
              </div>
            )}

            {/* No results */}
            {!result.transaction && !result.timeline?.length && !result.logs?.length && (
              <div style={{background:'#0D1120',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'12px',padding:'48px',textAlign:'center',color:'rgba(237,240,247,0.35)',fontSize:'13px'}}>
                {result.message || 'No matching records found.'}
              </div>
            )}
          </div>
        )}
      </div>
    </ProjectLayout>
  )
}
