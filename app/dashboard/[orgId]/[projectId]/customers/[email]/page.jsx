'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '../../../../../../lib/auth-context'
import { useApi } from '../../../../../../lib/useApi'
import ProjectLayout from '../../../../../../components/layouts/ProjectLayout'
import Link from 'next/link'

export default function CustomerProfile() {
  const { orgId, projectId, email } = useParams()
  const { isLoaded, isSignedIn } = useAuth()
  const api = useApi()
  const router = useRouter()
  const [org, setOrg]         = useState(null)
  const [project, setProject] = useState(null)
  const [txns, setTxns]       = useState([])
  const [loading, setLoading] = useState(true)

  const decodedEmail = decodeURIComponent(email)

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) { router.push('/login'); return }
    Promise.all([
      api.get('/projects/project/' + projectId),
      api.get('/orgs/' + orgId),
      api.get('/transactions/' + projectId + '/list?search=' + encodeURIComponent(decodedEmail) + '&limit=100'),
    ]).then(([p,o,t]) => { setProject(p); setOrg(o); setTxns(t.transactions||[]) })
     .catch(console.error).finally(()=>setLoading(false))
  }, [isLoaded, isSignedIn])

  const succeeded   = txns.filter(t => t.status==='succeeded')
  const totalSpend  = succeeded.reduce((a,t)=>a+t.amount, 0)
  const currencies  = [...new Set(txns.map(t=>t.currency))]
  const firstPurchase = txns.length > 0 ? new Date(txns[txns.length-1].created_at) : null
  const lastPurchase  = txns.length > 0 ? new Date(txns[0].created_at) : null
  const base = '/dashboard/' + orgId + '/' + projectId

  return (
    <ProjectLayout org={org} project={project}>
      <div style={{ maxWidth:'680px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'20px', fontSize:'12px', color:'rgba(237,240,247,0.4)' }}>
          <Link href={base + '/customers'} style={{ color:'rgba(237,240,247,0.5)', textDecoration:'none' }}>Customers</Link>
          <span>→</span>
          <span>{decodedEmail}</span>
        </div>

        {/* Profile header */}
        <div style={{ display:'flex', alignItems:'center', gap:'16px', marginBottom:'24px', background:'#0D1120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'14px', padding:'20px' }}>
          <div style={{ width:'48px', height:'48px', borderRadius:'50%', background:'rgba(245,158,11,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', fontWeight:700, color:'#F59E0B', flexShrink:0 }}>
            {decodedEmail[0]?.toUpperCase()}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:'16px', fontWeight:700, color:'#EDF0F7', marginBottom:'3px' }}>{decodedEmail}</div>
            <div style={{ fontSize:'12px', color:'rgba(237,240,247,0.4)' }}>
              {firstPurchase ? `Customer since ${firstPurchase.toLocaleDateString()}` : 'No purchases yet'}
            </div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'22px', color:'#F59E0B' }}>{currencies[0]||'KES'} {totalSpend.toLocaleString()}</div>
            <div style={{ fontSize:'12px', color:'rgba(237,240,247,0.4)' }}>lifetime value</div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'10px', marginBottom:'20px' }}>
          {[
            { label:'Total purchases', value: succeeded.length },
            { label:'Total spent',     value: (currencies[0]||'KES')+' '+(totalSpend||0).toLocaleString() },
            { label:'Currencies',      value: currencies.join(', ') || '—' },
            { label:'Last purchase',   value: lastPurchase?.toLocaleDateString() || '—' },
          ].map(s => (
            <div key={s.label} style={{ background:'#0D1120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'10px', padding:'14px' }}>
              <div style={{ fontSize:'10px', fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'rgba(237,240,247,0.3)', marginBottom:'6px' }}>{s.label}</div>
              <div style={{ fontSize:'14px', fontWeight:600, color:'#EDF0F7' }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Purchase history */}
        <div style={{ background:'#0D1120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'12px', overflow:'hidden' }}>
          <div style={{ padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,0.05)', fontSize:'12px', fontWeight:600, color:'rgba(237,240,247,0.6)' }}>Purchase history</div>
          {loading ? (
            <div style={{ padding:'32px', textAlign:'center', color:'rgba(237,240,247,0.35)', fontSize:'13px' }}>Loading...</div>
          ) : txns.length===0 ? (
            <div style={{ padding:'40px', textAlign:'center', color:'rgba(237,240,247,0.35)', fontSize:'13px' }}>No purchases found.</div>
          ) : txns.map(t => (
            <div key={t.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,0.03)' }}>
              <div>
                <div style={{ fontSize:'13px', color:'#EDF0F7', fontWeight:500 }}>via {t.vendor}</div>
                <div style={{ fontSize:'11px', color:'rgba(237,240,247,0.4)' }}>{t.created_at ? new Date(t.created_at).toLocaleDateString() : ''}</div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'14px', color: t.status==='succeeded'?'#F59E0B':'rgba(237,240,247,0.4)' }}>{t.currency} {t.amount?.toLocaleString()}</span>
                <span style={{ fontSize:'11px', fontWeight:700, padding:'2px 7px', borderRadius:'100px', color:t.status==='succeeded'?'#22C55E':'#EF4444', background:t.status==='succeeded'?'rgba(34,197,94,0.1)':'rgba(239,68,68,0.1)', textTransform:'capitalize' }}>{t.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ProjectLayout>
  )
}
