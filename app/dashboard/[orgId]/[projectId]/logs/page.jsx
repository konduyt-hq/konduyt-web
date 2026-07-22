'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { useApi } from '../../../../../lib/useApi'
import ProjectLayout from '../../../../../components/layouts/ProjectLayout'

const METHOD_COLORS = { GET:'#8892A4', POST:'#22C55E', DELETE:'#EF4444', PATCH:'#F59E0B' }
const TYPE_LABELS   = { api:'API', connector:'Connector', auth:'Auth', webhook:'Webhook' }

export default function LogsPage() {
  const { orgId, projectId } = useParams()
  const { isLoaded, isSignedIn } = useAuth()
  const api = useApi()
  const router = useRouter()
  const [org, setOrg]         = useState(null)
  const [project, setProject] = useState(null)
  const [logs, setLogs]       = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [errorsOnly, setErrorsOnly] = useState(false)
  const [logType, setLogType]       = useState(null)

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) { router.push('/login'); return }
    Promise.all([
      api.get('/projects/project/' + projectId),
      api.get('/orgs/' + orgId),
    ]).then(([p,o]) => { setProject(p); setOrg(o) }).catch(console.error)
    api.get('/logs/' + projectId + '/summary').then(setSummary).catch(()=>{})
  }, [isLoaded, isSignedIn])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (errorsOnly)    params.set('errors_only', 'true')
      if (logType)       params.set('log_type', logType)
      const d = await api.get('/logs/' + projectId + '/entries?' + params)
      setLogs(d.entries || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [projectId, errorsOnly, logType])

  useEffect(() => { if (projectId) load() }, [load])

  return (
    <ProjectLayout org={org} project={project}>
      <div style={{maxWidth:'960px'}}>
        <div style={{marginBottom:'24px'}}>
          <h1 style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:'22px',color:'#EDF0F7',marginBottom:'4px'}}>Logs</h1>
          <p style={{fontSize:'13px',color:'rgba(237,240,247,0.45)'}}>API requests, connector events, authentication activity. Last 24h summary below.</p>
        </div>

        {/* 24h summary */}
        {summary && (
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'10px',marginBottom:'20px'}}>
            {[
              {label:'Requests (24h)',  value:summary.last_24h?.total_requests||0,   color:'#EDF0F7'},
              {label:'Success rate',   value:(summary.last_24h?.success_rate||100)+'%', color: (summary.last_24h?.success_rate||100) > 95 ? '#22C55E' : '#F59E0B'},
              {label:'Errors',         value:summary.last_24h?.errors||0,            color:(summary.last_24h?.errors||0)>0?'#EF4444':'#22C55E'},
              {label:'Connector errors', value:summary.last_24h?.connector_errors||0, color:(summary.last_24h?.connector_errors||0)>0?'#F59E0B':'#22C55E'},
            ].map(s=>(
              <div key={s.label} style={{background:'#0D1120',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'10px',padding:'14px'}}>
                <div style={{fontSize:'10px',fontWeight:700,letterSpacing:'.08em',textTransform:'uppercase',color:'rgba(237,240,247,0.3)',marginBottom:'6px'}}>{s.label}</div>
                <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:'20px',color:s.color}}>{s.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div style={{display:'flex',gap:'8px',marginBottom:'14px',flexWrap:'wrap',alignItems:'center'}}>
          {[null,'api','connector','auth','webhook'].map(t=>(
            <button key={t||'all'} onClick={()=>setLogType(t)} style={{fontSize:'12px',fontWeight:600,padding:'5px 12px',borderRadius:'100px',border:'1px solid',borderColor:logType===t?'rgba(255,92,53,0.5)':'rgba(255,255,255,0.08)',background:logType===t?'rgba(255,92,53,0.1)':'transparent',color:logType===t?'#FF5C35':'rgba(237,240,247,0.5)',cursor:'pointer'}}>
              {t ? TYPE_LABELS[t] : 'All'}
            </button>
          ))}
          <label style={{display:'flex',alignItems:'center',gap:'8px',marginLeft:'auto',fontSize:'12px',color:'rgba(237,240,247,0.6)',cursor:'pointer'}}>
            <input type="checkbox" checked={errorsOnly} onChange={e=>setErrorsOnly(e.target.checked)} style={{accentColor:'#FF5C35'}} />
            Errors only
          </label>
        </div>

        {/* Log table */}
        <div style={{background:'#0D1120',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'12px',overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr style={{background:'#131928'}}>
                {['Time','Method','Path','Status','Duration','Type','Request ID'].map(h=>(
                  <th key={h} style={{textAlign:'left',padding:'9px 12px',fontSize:'10px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',color:'rgba(237,240,247,0.3)',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{padding:'40px',textAlign:'center',color:'rgba(237,240,247,0.35)',fontSize:'13px'}}>Loading...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={7} style={{padding:'40px',textAlign:'center',color:'rgba(237,240,247,0.35)',fontSize:'13px'}}>No log entries. Errors and payment operations are logged automatically.</td></tr>
              ) : logs.map(l=>(
                <tr key={l.id} style={{borderBottom:'1px solid rgba(255,255,255,0.03)',background:l.is_error?'rgba(239,68,68,0.03)':'transparent'}}>
                  <td style={{padding:'9px 12px',fontSize:'11px',color:'rgba(237,240,247,0.4)'}}>{l.created_at?new Date(l.created_at).toLocaleTimeString():''}</td>
                  <td style={{padding:'9px 12px'}}>
                    <span style={{fontSize:'11px',fontWeight:700,color:METHOD_COLORS[l.method]||'#8892A4',fontFamily:'monospace'}}>{l.method}</span>
                  </td>
                  <td style={{padding:'9px 12px',fontSize:'12px',color:'rgba(237,240,247,0.7)',fontFamily:'monospace',maxWidth:'260px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{l.path}</td>
                  <td style={{padding:'9px 12px'}}>
                    <span style={{fontSize:'12px',fontWeight:700,color:l.status_code<400?'#22C55E':l.status_code<500?'#F59E0B':'#EF4444'}}>{l.status_code}</span>
                  </td>
                  <td style={{padding:'9px 12px',fontSize:'12px',color:'rgba(237,240,247,0.45)'}}>{l.duration_ms?l.duration_ms+'ms':'—'}</td>
                  <td style={{padding:'9px 12px'}}>
                    <span style={{fontSize:'10px',fontWeight:700,padding:'2px 6px',borderRadius:'4px',background:'rgba(255,255,255,0.05)',color:'rgba(237,240,247,0.45)'}}>{TYPE_LABELS[l.log_type]||l.log_type}</span>
                  </td>
                  <td style={{padding:'9px 12px',fontSize:'11px',color:'rgba(237,240,247,0.3)',fontFamily:'monospace'}}>{l.request_id||'—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Recent errors detail */}
        {summary?.recent_errors?.length > 0 && (
          <div style={{marginTop:'20px'}}>
            <div style={{fontSize:'11px',fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',color:'rgba(239,68,68,0.7)',marginBottom:'10px'}}>Recent errors</div>
            <div style={{display:'grid',gap:'8px'}}>
              {summary.recent_errors.map(e=>(
                <div key={e.id} style={{background:'rgba(239,68,68,0.05)',border:'1px solid rgba(239,68,68,0.15)',borderRadius:'8px',padding:'12px 14px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'4px'}}>
                    <span style={{fontSize:'11px',fontWeight:700,fontFamily:'monospace',color:'#EF4444'}}>{e.method} {e.path}</span>
                    <span style={{fontSize:'11px',color:'rgba(237,240,247,0.4)'}}>{e.status_code}</span>
                  </div>
                  {e.error_code && <div style={{fontSize:'12px',color:'rgba(237,240,247,0.7)',fontFamily:'monospace'}}>{e.error_code}: {e.error_message}</div>}
                  <div style={{fontSize:'11px',color:'rgba(237,240,247,0.3)',marginTop:'4px',fontFamily:'monospace'}}>{e.request_id}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ProjectLayout>
  )
}
