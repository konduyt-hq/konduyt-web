'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function OnboardingBanner({ api, projectId, base }) {
  const [status, setStatus] = useState(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!projectId || !api) return
    api.get('/creator/' + projectId + '/onboarding')
      .then(setStatus)
      .catch(() => {})
  }, [projectId])

  if (!status || status.complete || dismissed) return null

  const next = status.steps.find(s => !s.done)

  return (
    <div style={{ background:'rgba(245,158,11,0.06)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:'14px', padding:'20px', marginBottom:'24px' }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'12px', marginBottom:'16px' }}>
        <div>
          <div style={{ fontSize:'13px', fontWeight:700, color:'#F59E0B', marginBottom:'4px' }}>
            Get set up — {status.completed}/{status.total} done
          </div>
          <div style={{ fontSize:'13px', color:'rgba(237,240,247,0.6)' }}>
            Complete these steps to start earning.
          </div>
        </div>
        <button onClick={() => setDismissed(true)} style={{ background:'none', border:'none', color:'rgba(237,240,247,0.3)', fontSize:'18px', cursor:'pointer', flexShrink:0, lineHeight:1 }}>×</button>
      </div>

      {/* Progress bar */}
      <div style={{ height:'3px', background:'rgba(255,255,255,0.06)', borderRadius:'100px', marginBottom:'16px' }}>
        <div style={{ height:'100%', background:'#F59E0B', borderRadius:'100px', width:(status.completed/status.total*100)+'%', transition:'width .3s' }} />
      </div>

      <div style={{ display:'grid', gap:'8px' }}>
        {status.steps.map(step => (
          <Link key={step.id} href={step.done ? '#' : base + step.href}
            style={{ display:'flex', alignItems:'center', gap:'12px', padding:'10px 12px', background:'rgba(255,255,255,0.03)', borderRadius:'8px', textDecoration:'none', opacity: step.done ? 0.5 : 1 }}>
            <div style={{ width:'22px', height:'22px', borderRadius:'50%', border:'1px solid', borderColor:step.done?'#22C55E':'rgba(245,158,11,0.4)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', color:step.done?'#22C55E':'#F59E0B', flexShrink:0 }}>
              {step.done ? '✓' : '○'}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:'13px', fontWeight:600, color:'#EDF0F7' }}>{step.title}</div>
              <div style={{ fontSize:'11px', color:'rgba(237,240,247,0.4)' }}>{step.desc}</div>
            </div>
            {!step.done && <span style={{ color:'rgba(237,240,247,0.3)', fontSize:'12px', flexShrink:0 }}>→</span>}
          </Link>
        ))}
      </div>
    </div>
  )
}
