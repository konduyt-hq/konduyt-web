'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { useApi } from '../../../../../lib/useApi'
import ProjectLayout from '../../../../../components/layouts/ProjectLayout'
import EmptyState from '../../../../../components/ui/EmptyState'
import Link from 'next/link'

const RUN_STATUS_COLORS = {
  draft:     '#8892A4',
  pending:   '#F59E0B',
  approved:  '#0BA4DB',
  processing:'#0BA4DB',
  completed: '#22C55E',
  failed:    '#EF4444',
  cancelled: '#8892A4',
}

export default function PayrollRunsPage() {
  const { orgId, projectId } = useParams()
  const { isLoaded, isSignedIn } = useAuth()
  const api = useApi()
  const router = useRouter()
  const [org, setOrg]     = useState(null)
  const [project, setProject] = useState(null)
  const [runs, setRuns]   = useState([])
  const [people, setPeople] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) { router.push('/login'); return }
    Promise.all([
      api.get('/projects/project/' + projectId),
      api.get('/orgs/' + orgId),
    ]).then(([p, o]) => {
      setProject(p); setOrg(o)
      return Promise.allSettled([
        api.get('/people/' + projectId + '/payroll-runs'),
        api.get('/people/' + projectId + '/list'),
      ])
    }).then(([r, pe]) => {
      if (r.status  === 'fulfilled') setRuns(r.value.runs   || r.value || [])
      if (pe.status === 'fulfilled') setPeople(pe.value.people || pe.value || [])
    }).catch(console.error).finally(() => setLoading(false))
  }, [isLoaded, isSignedIn])

  const base = '/dashboard/' + orgId + '/' + projectId
  const pendingApproval = runs.filter(r => r.status === 'pending')
  const totalPaid       = runs.filter(r => r.status === 'completed').reduce((a, r) => a + (r.total_amount || 0), 0)

  return (
    <ProjectLayout org={org} project={project}>
      <div style={{ maxWidth:'820px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'28px', flexWrap:'wrap', gap:'12px' }}>
          <div>
            <h1 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'22px', color:'#EDF0F7', marginBottom:'4px' }}>Payroll Runs</h1>
            <p style={{ fontSize:'13px', color:'rgba(237,240,247,0.45)' }}>Prepare and approve payments to your people.</p>
          </div>
          <Link href={base + '/people'} style={{ fontSize:'13px', fontWeight:600, color:'#fff', background:'#0BA4DB', padding:'10px 20px', borderRadius:'100px', textDecoration:'none' }}>
            + New Run
          </Link>
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px', marginBottom:'24px' }}>
          {[
            { label:'Pending approval',  value: pendingApproval.length,                              color: pendingApproval.length > 0 ? '#F59E0B' : '#EDF0F7' },
            { label:'People on payroll', value: people.length,                                       color:'#EDF0F7' },
            { label:'Total paid out',    value: totalPaid > 0 ? 'KES ' + totalPaid.toLocaleString() : '—', color:'#22C55E' },
          ].map(s => (
            <div key={s.label} style={{ background:'#0D1120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'10px', padding:'14px 16px' }}>
              <div style={{ fontSize:'10px', fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'rgba(237,240,247,0.3)', marginBottom:'8px' }}>{s.label}</div>
              <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'20px', color:s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Architecture note — visible in dev */}
        <div style={{ background:'rgba(11,164,219,0.06)', border:'1px solid rgba(11,164,219,0.15)', borderRadius:'10px', padding:'14px 16px', marginBottom:'20px', fontSize:'13px', color:'rgba(237,240,247,0.6)', lineHeight:1.65 }}>
          <span style={{ fontWeight:700, color:'#0BA4DB' }}>Payroll principle:</span> Code prepares. Humans approve. Payroll runs never execute without explicit approval. No <code style={{ color:'#0BA4DB' }}>konduyt.payroll.run()</code> via SDK — approval only happens here.
        </div>

        {/* Runs list */}
        {loading ? (
          <div style={{ padding:'40px', textAlign:'center', color:'rgba(237,240,247,0.4)', fontSize:'13px' }}>Loading…</div>
        ) : runs.length === 0 ? (
          <EmptyState icon="▶" title="No payroll runs yet"
            desc="Add your people first, then create a payroll run. KONDUYT will recommend the best payment route for each person."
            actions={[{ label:'Add people', href: base + '/people' }]} />
        ) : (
          <div style={{ background:'#0D1120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'12px', overflow:'hidden' }}>
            {runs.map((run, i) => {
              const color = RUN_STATUS_COLORS[run.status] || '#8892A4'
              return (
                <div key={run.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px', borderBottom: i < runs.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none', gap:'12px' }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:'13px', fontWeight:600, color:'#EDF0F7', marginBottom:'3px' }}>{run.name || 'Payroll Run'}</div>
                    <div style={{ fontSize:'11px', color:'rgba(237,240,247,0.4)' }}>
                      {run.people_count || '?'} people · {run.currency || 'KES'} {(run.total_amount || 0).toLocaleString()}
                    </div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:'10px', flexShrink:0 }}>
                    {run.status === 'pending' && (
                      <button style={{ fontSize:'12px', fontWeight:600, color:'#fff', background:'#0BA4DB', border:'none', padding:'6px 14px', borderRadius:'100px', cursor:'pointer' }}>
                        Approve
                      </button>
                    )}
                    <span style={{ fontSize:'11px', fontWeight:700, padding:'2px 8px', borderRadius:'100px', color, background: color + '18', textTransform:'capitalize' }}>{run.status}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </ProjectLayout>
  )
}
