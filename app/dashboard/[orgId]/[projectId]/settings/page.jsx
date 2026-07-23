'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '../../../../../lib/auth-context'
import { useApi } from '../../../../../lib/useApi'
import ProjectLayout from '../../../../../components/layouts/ProjectLayout'

const TABS_BUILD   = ['General','Danger']
const TABS_CREATOR = ['Profile','Payout Accounts','Tax Information','General','Danger']
const TABS_PAYROLL = ['General','Danger']

const SOCIAL_FIELDS = [
  { key:'website',   label:'Website',   placeholder:'https://yoursite.com' },
  { key:'twitter',   label:'Twitter / X', placeholder:'https://twitter.com/yourhandle' },
  { key:'instagram', label:'Instagram', placeholder:'https://instagram.com/yourhandle' },
  { key:'youtube',   label:'YouTube',   placeholder:'https://youtube.com/@yourchannel' },
  { key:'tiktok',    label:'TikTok',    placeholder:'https://tiktok.com/@yourhandle' },
]

const ACCENT_COLORS = ['#F59E0B','#FF5C35','#22C55E','#0BA4DB','#635BFF','#EC4899','#EF4444','#EDF0F7']

export default function SettingsPage() {
  const { orgId, projectId } = useParams()
  const { isLoaded, isSignedIn } = useAuth()
  const api = useApi()
  const router = useRouter()
  const [org, setOrg]         = useState(null)
  const [project, setProject] = useState(null)
  const [tab, setTab]         = useState('General')
  const [profile, setProfile] = useState(null)
  const [profileForm, setProfileForm] = useState({ username:'', display_name:'', bio:'', website:'', twitter:'', instagram:'', youtube:'', tiktok:'', contact_email:'', show_contact:false, accent_color:'#F59E0B' })
  const [saving, setSaving]   = useState(false)
  const [msg, setMsg]         = useState(null)

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) { router.push('/login'); return }
    Promise.all([
      api.get('/projects/project/' + projectId),
      api.get('/orgs/' + orgId),
    ]).then(([p,o]) => {
      setProject(p); setOrg(o)
      if (p.mode === 'creator') {
        setTab('Profile')
        api.get('/creator/' + projectId + '/profile').then(prof => {
          setProfile(prof)
          setProfileForm({ username:prof.username||'', display_name:prof.display_name||'', bio:prof.bio||'', website:prof.social?.website||'', twitter:prof.social?.twitter||'', instagram:prof.social?.instagram||'', youtube:prof.social?.youtube||'', tiktok:prof.social?.tiktok||'', contact_email:prof.contact_email||'', show_contact:prof.show_contact||false, accent_color:prof.accent_color||'#F59E0B' })
        }).catch(() => {})
      }
    }).catch(console.error)
  }, [isLoaded, isSignedIn])

  async function saveProfile(e) {
    e.preventDefault(); setSaving(true); setMsg(null)
    try {
      if (profile) {
        const updated = await api.patch('/creator/' + projectId + '/profile', profileForm)
        setProfile(updated)
      } else {
        const created = await api.post('/creator/' + projectId + '/profile', profileForm)
        setProfile(created)
      }
      setMsg({ type:'ok', text:'Profile saved. Your page is live at konduyt.dev/@' + profileForm.username })
    } catch (e) { setMsg({ type:'err', text: e.message || 'Save failed' }) } finally { setSaving(false) }
  }

  const mode = project?.mode || 'build'
  const tabs = mode === 'creator' ? TABS_CREATOR : TABS_BUILD

  return (
    <ProjectLayout org={org} project={project}>
      <div style={{ maxWidth:'680px' }}>
        <h1 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'22px', color:'#EDF0F7', marginBottom:'20px' }}>Settings</h1>

        {/* Tab nav */}
        <div style={{ display:'flex', gap:'0', marginBottom:'24px', background:'#0D1120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'10px', padding:'4px', width:'fit-content', flexWrap:'wrap' }}>
          {tabs.map(t => (
            <button key={t} onClick={()=>setTab(t)} style={{ fontSize:'13px', fontWeight:tab===t?600:400, padding:'7px 16px', borderRadius:'7px', border:'none', background:tab===t?'rgba(255,255,255,0.08)':'transparent', color:tab===t?'#EDF0F7':'rgba(237,240,247,0.45)', cursor:'pointer' }}>
              {t}
            </button>
          ))}
        </div>

        {/* Profile tab (creator only) */}
        {tab === 'Profile' && mode === 'creator' && (
          <form onSubmit={saveProfile} style={{ display:'grid', gap:'16px' }}>
            <div style={{ background:'rgba(245,158,11,0.06)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:'10px', padding:'14px 16px', fontSize:'13px', color:'rgba(237,240,247,0.65)', lineHeight:1.6 }}>
              Your public profile is at <strong style={{ color:'#F59E0B' }}>konduyt.dev/@{profileForm.username || 'username'}</strong>.
              Customers see your name, bio, and all your active offers here.
            </div>

            {/* Username */}
            <div>
              <label style={{ fontSize:'12px', fontWeight:700, letterSpacing:'.06em', textTransform:'uppercase', color:'rgba(237,240,247,0.5)', display:'block', marginBottom:'8px' }}>Username *</label>
              <div style={{ position:'relative' }}>
                <span style={{ position:'absolute', left:'14px', top:'50%', transform:'translateY(-50%)', fontSize:'14px', color:'rgba(237,240,247,0.4)' }}>@</span>
                <input required value={profileForm.username} onChange={e=>setProfileForm(f=>({...f,username:e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,'')}))}
                  placeholder="yourname" maxLength={30} disabled={!!profile}
                  style={{ width:'100%', padding:'11px 14px 11px 32px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', color:'#EDF0F7', fontSize:'14px', outline:'none', boxSizing:'border-box', opacity:profile?0.6:1 }} />
              </div>
              {profile && <div style={{ fontSize:'11px', color:'rgba(237,240,247,0.3)', marginTop:'4px' }}>Username cannot be changed after creation.</div>}
            </div>

            {/* Display name */}
            <div>
              <label style={{ fontSize:'12px', fontWeight:700, letterSpacing:'.06em', textTransform:'uppercase', color:'rgba(237,240,247,0.5)', display:'block', marginBottom:'8px' }}>Display name</label>
              <input value={profileForm.display_name} onChange={e=>setProfileForm(f=>({...f,display_name:e.target.value}))} placeholder="Your name or brand name"
                style={{ width:'100%', padding:'11px 14px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', color:'#EDF0F7', fontSize:'14px', outline:'none', boxSizing:'border-box' }} />
            </div>

            {/* Bio */}
            <div>
              <label style={{ fontSize:'12px', fontWeight:700, letterSpacing:'.06em', textTransform:'uppercase', color:'rgba(237,240,247,0.5)', display:'block', marginBottom:'8px' }}>Bio</label>
              <textarea value={profileForm.bio} onChange={e=>setProfileForm(f=>({...f,bio:e.target.value}))} placeholder="Tell your customers what you do or create..."
                rows={3} maxLength={280} style={{ width:'100%', padding:'11px 14px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', color:'#EDF0F7', fontSize:'14px', outline:'none', resize:'vertical', boxSizing:'border-box' }} />
              <div style={{ fontSize:'11px', color:'rgba(237,240,247,0.3)', marginTop:'4px' }}>{profileForm.bio.length}/280</div>
            </div>

            {/* Accent color */}
            <div>
              <label style={{ fontSize:'12px', fontWeight:700, letterSpacing:'.06em', textTransform:'uppercase', color:'rgba(237,240,247,0.5)', display:'block', marginBottom:'8px' }}>Brand color</label>
              <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                {ACCENT_COLORS.map(c => (
                  <button key={c} type="button" onClick={()=>setProfileForm(f=>({...f,accent_color:c}))}
                    style={{ width:'32px', height:'32px', borderRadius:'50%', background:c, border:`2px solid ${profileForm.accent_color===c?'#EDF0F7':'transparent'}`, cursor:'pointer', flexShrink:0, outline:'none' }} />
                ))}
              </div>
            </div>

            {/* Social links */}
            <div>
              <label style={{ fontSize:'12px', fontWeight:700, letterSpacing:'.06em', textTransform:'uppercase', color:'rgba(237,240,247,0.5)', display:'block', marginBottom:'10px' }}>Social links</label>
              <div style={{ display:'grid', gap:'8px' }}>
                {SOCIAL_FIELDS.map(f => (
                  <input key={f.key} value={profileForm[f.key]} onChange={e=>setProfileForm(p=>({...p,[f.key]:e.target.value}))}
                    placeholder={f.placeholder}
                    style={{ width:'100%', padding:'10px 14px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'8px', color:'#EDF0F7', fontSize:'13px', outline:'none', boxSizing:'border-box' }} />
                ))}
              </div>
            </div>

            {/* Contact */}
            <div style={{ background:'#0D1120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'10px', padding:'16px', display:'grid', gap:'10px' }}>
              <div style={{ fontSize:'13px', fontWeight:600, color:'#EDF0F7' }}>Contact email</div>
              <input value={profileForm.contact_email} onChange={e=>setProfileForm(f=>({...f,contact_email:e.target.value}))} placeholder="you@example.com" type="email"
                style={{ width:'100%', padding:'10px 14px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'8px', color:'#EDF0F7', fontSize:'13px', outline:'none', boxSizing:'border-box' }} />
              <label style={{ display:'flex', alignItems:'center', gap:'10px', cursor:'pointer', fontSize:'13px', color:'rgba(237,240,247,0.65)' }}>
                <input type="checkbox" checked={profileForm.show_contact} onChange={e=>setProfileForm(f=>({...f,show_contact:e.target.checked}))} style={{ accentColor:'#F59E0B' }} />
                Show contact email on your public profile
              </label>
            </div>

            {msg && (
              <div style={{ padding:'12px 14px', borderRadius:'8px', fontSize:'13px', background:msg.type==='ok'?'rgba(34,197,94,0.08)':'rgba(239,68,68,0.08)', border:`1px solid ${msg.type==='ok'?'rgba(34,197,94,0.2)':'rgba(239,68,68,0.2)'}`, color:msg.type==='ok'?'#22C55E':'#EF4444' }}>
                {msg.text}
              </div>
            )}

            <button type="submit" disabled={saving} style={{ padding:'12px', background:'#F59E0B', color:'#fff', border:'none', borderRadius:'100px', fontSize:'14px', fontWeight:600, cursor:'pointer', opacity:saving?0.6:1 }}>
              {saving ? 'Saving…' : profile ? 'Save profile' : 'Create profile'}
            </button>

            {profile && (
              <a href={`https://konduyt.dev/@${profile.username}`} target="_blank" rel="noopener"
                style={{ textAlign:'center', fontSize:'13px', color:'rgba(237,240,247,0.45)', textDecoration:'none', display:'block' }}>
                View your public profile →
              </a>
            )}
          </form>
        )}

        {/* General tab */}
        {tab === 'General' && (
          <div style={{ display:'grid', gap:'16px' }}>
            <div style={{ background:'#0D1120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'10px', padding:'16px' }}>
              <div style={{ fontSize:'13px', fontWeight:600, color:'#EDF0F7', marginBottom:'8px' }}>Project name</div>
              <div style={{ fontSize:'14px', color:'rgba(237,240,247,0.6)' }}>{project?.name}</div>
            </div>
            <div style={{ background:'#0D1120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'10px', padding:'16px' }}>
              <div style={{ fontSize:'13px', fontWeight:600, color:'#EDF0F7', marginBottom:'8px' }}>Mode</div>
              <div style={{ fontSize:'14px', color:'rgba(237,240,247,0.6)', textTransform:'capitalize' }}>{project?.mode}</div>
            </div>
            <div style={{ background:'#0D1120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'10px', padding:'16px' }}>
              <div style={{ fontSize:'13px', fontWeight:600, color:'#EDF0F7', marginBottom:'8px' }}>Environment</div>
              <div style={{ fontSize:'14px', color: project?.live_mode?'#22C55E':'#F59E0B' }}>{project?.live_mode ? '● Live' : '○ Sandbox'}</div>
            </div>
          </div>
        )}

        {/* Danger tab */}
        {tab === 'Danger' && (
          <div style={{ background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:'12px', padding:'20px' }}>
            <div style={{ fontSize:'14px', fontWeight:700, color:'#EF4444', marginBottom:'6px' }}>Danger Zone</div>
            <div style={{ fontSize:'13px', color:'rgba(237,240,247,0.6)', marginBottom:'14px', lineHeight:1.6 }}>
              These actions are permanent. Contact support before proceeding.
            </div>
            <button style={{ fontSize:'13px', fontWeight:600, color:'#EF4444', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', padding:'10px 18px', borderRadius:'100px', cursor:'pointer' }}>
              Archive project
            </button>
          </div>
        )}

        {/* Payout Accounts + Tax tabs — placeholder for now */}
        {(tab === 'Payout Accounts') && (
          <div style={{ textAlign:'center', padding:'40px', color:'rgba(237,240,247,0.4)', fontSize:'13px', background:'#0D1120', borderRadius:'12px', border:'1px solid rgba(255,255,255,0.06)' }}>
            Manage your payout accounts in the <a href="../accounts" style={{ color:'#F59E0B', textDecoration:'none', fontWeight:600 }}>Money Destinations</a> page.
          </div>
        )}
        {tab === 'Tax Information' && (
          <div style={{ textAlign:'center', padding:'40px', color:'rgba(237,240,247,0.4)', fontSize:'13px', background:'#0D1120', borderRadius:'12px', border:'1px solid rgba(255,255,255,0.06)' }}>
            Tax information and filing guidance are in the <a href="../taxes" style={{ color:'#F59E0B', textDecoration:'none', fontWeight:600 }}>Taxes</a> page.
          </div>
        )}
      </div>
    </ProjectLayout>
  )
}
