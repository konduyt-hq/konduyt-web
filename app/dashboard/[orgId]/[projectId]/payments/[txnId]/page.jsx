'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '../../../../../../lib/auth-context'
import { useApi } from '../../../../../../lib/useApi'
import ProjectLayout from '../../../../../../components/layouts/ProjectLayout'
import Link from 'next/link'

const EVENT_ICONS = {
  'payment.created':    { icon:'◈', color:'#8892A4' },
  'payment.authorized': { icon:'◎', color:'#F59E0B' },
  'payment.processing': { icon:'↻', color:'#0BA4DB' },
  'payment.succeeded':  { icon:'✓', color:'#22C55E' },
  'payment.failed':     { icon:'✗', color:'#EF4444' },
  'payment.cancelled':  { icon:'⊘', color:'#8892A4' },
  'refund.requested':   { icon:'↩', color:'#F59E0B' },
  'refund.succeeded':   { icon:'↩', color:'#22C55E' },
  'refund.failed':      { icon:'↩', color:'#EF4444' },
  'webhook.received':   { icon:'⚡', color:'#8892A4' },
  'webhook.verified':   { icon:'⚡', color:'#22C55E' },
  'settlement.recorded': { icon:'$', color:'#22C55E' },
}

const STATE_COLORS = {
  created:       '#8892A4',
  pending:       '#F59E0B',
  processing:    '#0BA4DB',
  succeeded:     '#22C55E',
  failed:        '#EF4444',
  cancelled:     '#8892A4',
  refund_pending:'#F59E0B',
  refunded:      '#22C55E',
  refund_failed: '#EF4444',
}

export default function TransactionDetail() {
  const { orgId, projectId, txnId } = useParams()
  const { isLoaded, isSignedIn } = useAuth()
  const api = useApi()
  const router = useRouter()
  const [org, setOrg]         = useState(null)
  const [project, setProject] = useState(null)
  const [detail, setDetail]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) { router.push('/login'); return }
    Promise.all([
      api.get('/projects/project/' + projectId),
      api.get('/orgs/' + orgId),
      api.get('/ledger/' + projectId + '/transaction/' + txnId),
    ]).then(([p,o,d]) => { setProject(p); setOrg(o); setDetail(d) })
     .catch(console.error).finally(() => setLoading(false))
  }, [isLoaded, isSignedIn])

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:'#07090F',color:'rgba(237,240,247,0.4)'}}>Loading...</div>

  const stateColor = STATE_COLORS[detail?.current_state] || '#8892A4'

  return (
    <ProjectLayout org={org} project={project}>
      <div style={{maxWidth:'680px'}}>

        {/* Breadcrumb */}
        <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'20px',fontSize:'12px',color:'rgba(237,240,247,0.4)'}}>
          <Link href={'/dashboard/' + orgId + '/' + projectId + '/payments'} style={{color:'rgba(237,240,247,0.5)',textDecoration:'none'}}>Payments</Link>
          <span>→</span>
          <span style={{fontFamily:'monospace'}}>{txnId?.slice(0,8)}...</span>
        </div>

        {/* Header */}
        <div style={{background:'#0D1120',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'12px',padding:'20px',marginBottom:'20px'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'16px'}}>
            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:'22px',color:'#EDF0F7'}}>
              {detail?.currency} {detail?.amount?.toLocaleString()}
            </div>
            <span style={{fontSize:'12px',fontWeight:700,padding:'4px 12px',borderRadius:'100px',color:stateColor,background:stateColor+'18',textTransform:'capitalize'}}>
              {detail?.current_state?.replace('_',' ')}
            </span>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
            {[
              { label:'Provider',  value: detail?.vendor },
              { label:'Transaction ID', value: txnId?.slice(0,16) + '...', mono: true },
              { label:'Customer',  value: detail?.decision_reason ? null : '—' },
              { label:'Events',    value: detail?.event_count + ' ledger events' },
            ].filter(r=>r.value).map(r=>(
              <div key={r.label}>
                <div style={{fontSize:'10px',fontWeight:700,letterSpacing:'.08em',textTransform:'uppercase',color:'rgba(237,240,247,0.3)',marginBottom:'4px'}}>{r.label}</div>
                <div style={{fontSize:'13px',color:'rgba(237,240,247,0.8)',fontFamily:r.mono?'monospace':undefined}}>{r.value}</div>
              </div>
            ))}
          </div>
          {detail?.decision_reason && (
            <div style={{marginTop:'14px',padding:'10px 12px',background:'rgba(255,92,53,0.06)',border:'1px solid rgba(255,92,53,0.15)',borderRadius:'8px',fontSize:'12px',color:'rgba(237,240,247,0.65)'}}>
              <span style={{fontWeight:700,color:'#FF5C35'}}>Why {detail.vendor}:</span> {detail.decision_reason}
            </div>
          )}
        </div>

        {/* Event timeline */}
        <div style={{marginBottom:'8px',fontSize:'11px',fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',color:'rgba(237,240,247,0.3)'}}>
          Ledger timeline
        </div>
        <div style={{background:'#0D1120',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'12px',overflow:'hidden'}}>
          {!detail?.timeline?.length ? (
            <div style={{padding:'32px',textAlign:'center',color:'rgba(237,240,247,0.35)',fontSize:'13px'}}>No ledger events found.</div>
          ) : detail.timeline.map((evt, i) => {
            const style = EVENT_ICONS[evt.event_type] || { icon:'●', color:'#8892A4' }
            const isLast = i === detail.timeline.length - 1
            return (
              <div key={evt.id} style={{display:'flex',gap:'14px',padding:'14px 18px',borderBottom:isLast?'none':'1px solid rgba(255,255,255,0.03)'}}>
                {/* Timeline line */}
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',flexShrink:0}}>
                  <div style={{width:'28px',height:'28px',borderRadius:'50%',background:style.color+'18',border:'1px solid '+style.color+'40',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',color:style.color,flexShrink:0}}>
                    {style.icon}
                  </div>
                  {!isLast && <div style={{width:'1px',flex:1,background:'rgba(255,255,255,0.05)',marginTop:'4px',minHeight:'20px'}} />}
                </div>
                {/* Event detail */}
                <div style={{flex:1,paddingTop:'4px'}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'3px'}}>
                    <div style={{fontSize:'13px',fontWeight:600,color:'#EDF0F7',fontFamily:'monospace'}}>{evt.event_type}</div>
                    <div style={{fontSize:'11px',color:'rgba(237,240,247,0.35)'}}>{evt.timestamp ? new Date(evt.timestamp).toLocaleTimeString() : ''}</div>
                  </div>
                  <div style={{fontSize:'12px',color:'rgba(237,240,247,0.45)'}}>{evt.connector}</div>
                  {evt.connector_reference && (
                    <div style={{fontSize:'11px',color:'rgba(237,240,247,0.3)',fontFamily:'monospace',marginTop:'3px'}}>ref: {evt.connector_reference}</div>
                  )}
                  {evt.metadata && Object.keys(evt.metadata).length > 0 && (
                    <div style={{fontSize:'11px',color:'rgba(237,240,247,0.3)',marginTop:'4px'}}>{Object.entries(evt.metadata).map(([k,v])=>`${k}: ${v}`).join(' · ')}</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div style={{marginTop:'16px',padding:'12px 14px',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.05)',borderRadius:'8px',fontSize:'12px',color:'rgba(237,240,247,0.4)',lineHeight:1.65}}>
          The ledger is immutable. Every event above is permanent. Nothing is edited or deleted.
        </div>
      </div>
    </ProjectLayout>
  )
}
