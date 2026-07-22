'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { useApi } from '../../../../../lib/useApi'
import ProjectLayout from '../../../../../components/layouts/ProjectLayout'
import Link from 'next/link'

const CREATE_OPTIONS = [
  { id:'link',         icon:'⇗', title:'Payment Link',   desc:'Share a link and get paid instantly. Works anywhere — social, email, WhatsApp, website.', href:'links', available:true  },
  { id:'subscription', icon:'↻', title:'Subscription',    desc:'Charge a recurring monthly or yearly fee. Perfect for newsletters, courses, communities.', href:'subscriptions', available:false },
  { id:'product',      icon:'◻', title:'Digital Product', desc:'Sell files, templates, guides, or any digital download.', href:'products', available:false },
  { id:'donation',     icon:'♡', title:'Donation Page',   desc:'Let your audience support you with any amount they choose.', href:'links?type=donation', available:false },
]

export default function CreatePage() {
  const { orgId, projectId } = useParams()
  const { isLoaded, isSignedIn } = useAuth()
  const api = useApi()
  const router = useRouter()
  const [org, setOrg]         = useState(null)
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) { router.push('/login'); return }
    Promise.all([
      api.get('/projects/project/' + projectId),
      api.get('/orgs/' + orgId),
    ]).then(([p,o]) => { setProject(p); setOrg(o) }).catch(console.error).finally(()=>setLoading(false))
  }, [isLoaded, isSignedIn])

  const base = '/dashboard/' + orgId + '/' + projectId

  return (
    <ProjectLayout org={org} project={project}>
      <div style={{ maxWidth:'680px' }}>
        <div style={{ marginBottom:'32px' }}>
          <h1 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'22px', color:'#EDF0F7', marginBottom:'6px' }}>Create</h1>
          <p style={{ fontSize:'14px', color:'rgba(237,240,247,0.5)', lineHeight:1.65 }}>
            What do you want to sell or share today?
          </p>
        </div>

        <div style={{ display:'grid', gap:'12px' }}>
          {CREATE_OPTIONS.map(opt => (
            <div
              key={opt.id}
              style={{ display:'flex', alignItems:'center', gap:'16px', padding:'18px 20px', background:'#0D1120', border:'1px solid', borderColor: opt.available?'rgba(255,255,255,0.07)':'rgba(255,255,255,0.04)', borderRadius:'12px', opacity: opt.available ? 1 : 0.55, cursor: opt.available ? 'pointer' : 'default', transition:'border-color .15s' }}
              onClick={() => opt.available && router.push(base + '/' + opt.href)}
            >
              <div style={{ width:'44px', height:'44px', borderRadius:'10px', background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', color:'#F59E0B', flexShrink:0 }}>
                {opt.icon}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px' }}>
                  <div style={{ fontSize:'15px', fontWeight:700, color:'#EDF0F7' }}>{opt.title}</div>
                  {!opt.available && <span style={{ fontSize:'10px', fontWeight:700, padding:'2px 6px', borderRadius:'4px', background:'rgba(245,158,11,0.1)', color:'#F59E0B', letterSpacing:'.04em' }}>SOON</span>}
                </div>
                <div style={{ fontSize:'13px', color:'rgba(237,240,247,0.5)', lineHeight:1.55 }}>{opt.desc}</div>
              </div>
              {opt.available && <span style={{ color:'rgba(237,240,247,0.3)', fontSize:'16px', flexShrink:0 }}>→</span>}
            </div>
          ))}
        </div>

        <div style={{ marginTop:'20px', padding:'14px 16px', background:'rgba(245,158,11,0.05)', border:'1px solid rgba(245,158,11,0.15)', borderRadius:'10px', fontSize:'13px', color:'rgba(237,240,247,0.6)', lineHeight:1.65 }}>
          Payment links are live now. Subscriptions, products, and donation pages coming September 2026.
        </div>
      </div>
    </ProjectLayout>
  )
}
