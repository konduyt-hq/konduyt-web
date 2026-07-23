'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '../../../../../lib/auth-context'
import { useApi } from '../../../../../lib/useApi'
import BuildLayout from '../../../../../components/layouts/ProjectLayout'

const GUIDANCE = {
  KE: { authority:'Kenya Revenue Authority', portal:'https://itax.kra.go.ke', form:'VAT Return (VAT3)', deadline:'20th of the following month', steps:['Log into iTax at itax.kra.go.ke','Navigate to Returns → File Return → VAT','Enter your output tax amount from Konduyt','Submit and download the acknowledgement','Pay via M-Pesa Paybill 572572 or bank transfer'] },
  NG: { authority:'Federal Inland Revenue Service', portal:'https://taxpromax.firs.gov.ng', form:'VAT Returns (Form 002)', deadline:'21st of the following month', steps:['Log into TaxPro-Max at taxpromax.firs.gov.ng','Select VAT Returns','Enter output and input tax figures','Submit and receive a tax reference number','Pay at any FIRS-appointed bank'] },
  GH: { authority:'Ghana Revenue Authority', portal:'https://taxpayerportal.gra.gov.gh', form:'VAT Standard Rate Return', deadline:'Last day of the following month', steps:['Log into GRA Taxpayer Portal','Select VAT Returns','Enter gross sales and tax collected','Submit and download receipt','Pay at GRA offices or approved banks'] },
}

export default function TaxesPage() {
  const { orgId, projectId } = useParams()
  const { isLoaded, isSignedIn } = useAuth()
  const api = useApi()
  const router = useRouter()
  const [org, setOrg]         = useState(null)
  const [project, setProject] = useState(null)
  const [summary, setSummary] = useState(null)
  const [taxCalc, setTaxCalc] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) { router.push('/login'); return }
    Promise.all([
      api.get('/projects/project/' + projectId),
      api.get('/orgs/' + orgId),
      api.get('/transactions/' + projectId + '/summary'),
    ]).then(([p,o,s]) => {
      setProject(p); setOrg(o); setSummary(s)
      const total = s.vendors?.reduce((a,v)=>a+v.total_processed,0)||0
      if (total > 0) {
        api.post('/tax/calculate', { amount:total, currency:'KES', jurisdiction: p.jurisdiction||'KE' })
          .then(setTaxCalc).catch(()=>{})
      }
    }).catch(console.error).finally(()=>setLoading(false))
  }, [isLoaded, isSignedIn])

  const jurisdiction = project?.jurisdiction || 'KE'
  const guidance = GUIDANCE[jurisdiction] || GUIDANCE.KE

  return (
    <ProjectLayout org={org} project={project}>
      <div style={{maxWidth:'720px'}}>
        <h1 style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:'22px',color:'#EDF0F7',marginBottom:'8px'}}>Taxes</h1>
        <p style={{fontSize:'14px',color:'rgba(237,240,247,0.5)',lineHeight:1.65,marginBottom:'28px'}}>
          Konduyt calculates what you owe and shows you exactly where to pay it. We do not file on your behalf — you stay in control.
        </p>

        {/* Tax summary cards */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'28px'}}>
          <div style={{background:'#0D1120',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'12px',padding:'18px'}}>
            <div style={{fontSize:'11px',fontWeight:700,letterSpacing:'.08em',textTransform:'uppercase',color:'rgba(237,240,247,0.35)',marginBottom:'10px'}}>Total revenue this period</div>
            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:'26px',color:'#EDF0F7',marginBottom:'4px'}}>
              KES {(summary?.vendors?.reduce((a,v)=>a+v.total_processed,0)||0).toLocaleString()}
            </div>
          </div>
          <div style={{background:'#0D1120',border:'1px solid rgba(255,92,53,0.2)',borderRadius:'12px',padding:'18px'}}>
            <div style={{fontSize:'11px',fontWeight:700,letterSpacing:'.08em',textTransform:'uppercase',color:'rgba(237,240,247,0.35)',marginBottom:'10px'}}>Estimated tax owed</div>
            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:'26px',color:'#FF5C35',marginBottom:'4px'}}>
              KES {(taxCalc?.total_owed||0).toLocaleString()}
            </div>
            <div style={{fontSize:'12px',color:'rgba(237,240,247,0.4)'}}>{guidance.deadline}</div>
          </div>
        </div>

        {/* Tax breakdown */}
        {taxCalc?.taxes?.length > 0 && (
          <div style={{background:'#0D1120',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'12px',overflow:'hidden',marginBottom:'24px'}}>
            <div style={{padding:'14px 18px',borderBottom:'1px solid rgba(255,255,255,0.05)',fontSize:'12px',fontWeight:700,letterSpacing:'.08em',textTransform:'uppercase',color:'rgba(237,240,247,0.35)'}}>Breakdown</div>
            {taxCalc.taxes.map((t,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 18px',borderBottom:'1px solid rgba(255,255,255,0.03)'}}>
                <div>
                  <div style={{fontSize:'13px',fontWeight:500,color:'#EDF0F7'}}>{t.name} ({t.abbreviation})</div>
                  <div style={{fontSize:'11px',color:'rgba(237,240,247,0.4)',marginTop:'2px'}}>{(t.rate*100).toFixed(1)}% · Due: {t.filing_deadline}</div>
                </div>
                <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:'16px',color:'#FF5C35'}}>
                  KES {t.amount_owed?.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Filing guidance */}
        <div style={{background:'#0D1120',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'12px',overflow:'hidden'}}>
          <div style={{padding:'14px 18px',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
            <div style={{fontSize:'13px',fontWeight:700,color:'#EDF0F7',marginBottom:'2px'}}>How to pay — {jurisdiction}</div>
            <div style={{fontSize:'12px',color:'rgba(237,240,247,0.45)'}}>{guidance.authority} · {guidance.form}</div>
          </div>
          <div style={{padding:'18px',display:'grid',gap:'10px'}}>
            {guidance.steps.map((step,i)=>(
              <div key={i} style={{display:'flex',gap:'12px',alignItems:'flex-start'}}>
                <span style={{width:'22px',height:'22px',borderRadius:'50%',background:'rgba(255,92,53,0.1)',border:'1px solid rgba(255,92,53,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'11px',fontWeight:700,color:'#FF5C35',flexShrink:0}}>{i+1}</span>
                <span style={{fontSize:'13px',color:'rgba(237,240,247,0.7)',lineHeight:1.6,paddingTop:'1px'}}>{step}</span>
              </div>
            ))}
            <a href={guidance.portal} target="_blank" rel="noopener" style={{display:'inline-flex',alignItems:'center',gap:'6px',marginTop:'8px',fontSize:'13px',fontWeight:600,color:'#FF5C35',textDecoration:'none'}}>
              Open {guidance.authority} portal →
            </a>
          </div>
        </div>
      </div>
    </ProjectLayout>
  )
}
