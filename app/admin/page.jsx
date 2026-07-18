'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, useUser } from '@clerk/nextjs'

const ADMIN_EMAILS = ['nziokaian067@gmail.com', 'ian@konduyt.dev']
const API = process.env.NEXT_PUBLIC_API_URL || 'https://konduyt-api.onrender.com'

export default function AdminPage() {
  const router = useRouter()
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const { user } = useUser()
  const [stats, setStats]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [search, setSearch]   = useState('')

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) { router.push('/login'); return }
    const email = user?.primaryEmailAddress?.emailAddress
    if (!ADMIN_EMAILS.includes(email)) { router.push('/dashboard'); return }
    loadStats()
  }, [isLoaded, isSignedIn, user])

  async function loadStats() {
    try {
      const token = await getToken()
      const res = await fetch(API + '/admin/stats', {
        headers: { Authorization: 'Bearer ' + token }
      })
      if (!res.ok) throw new Error('Failed to load stats')
      setStats(await res.json())
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  if (!isLoaded || loading) return <Loading />
  if (error) return <div style={pageStyle}>Error: {error}</div>

  const filtered = (stats?.orgs || []).filter(o =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    o.owner_email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ minHeight: '100vh', background: '#07090F', color: '#EDF0F7', fontFamily: 'Inter,sans-serif', padding: '32px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '40px' }}>
          <div>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: '24px' }}>
              KONDU<span style={{ color: '#FF5C35' }}>Y</span>T Admin
            </div>
            <div style={{ fontSize: '13px', color: '#8892A4', marginTop: '4px' }}>Mission control</div>
          </div>
          <a href="/dashboard" style={{ fontSize: '13px', color: '#8892A4', background: 'none', border: '1px solid rgba(255,255,255,.07)', padding: '7px 14px', borderRadius: '8px', textDecoration: 'none' }}>
            Back to dashboard
          </a>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '32px' }}>
          {[
            { label: 'Total users',     value: stats?.total_users || 0 },
            { label: 'Total projects',  value: stats?.total_orgs  || 0 },
            { label: 'Paying (Global)', value: stats?.paying_orgs || 0, accent: '#22C55E' },
            { label: 'Free (Local)',    value: stats?.free_orgs   || 0 },
          ].map(s => (
            <div key={s.label} style={{ background: '#0D1120', border: '1px solid rgba(255,255,255,.07)', borderRadius: '12px', padding: '20px' }}>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: '32px', color: s.accent || '#EDF0F7' }}>{s.value}</div>
              <div style={{ fontSize: '13px', color: '#8892A4', marginTop: '4px' }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ background: '#0D1120', border: '1px solid rgba(255,255,255,.07)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: '15px' }}>All projects</div>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
              style={{ padding: '7px 12px', background: '#131928', border: '1px solid rgba(255,255,255,.07)', borderRadius: '7px', color: '#EDF0F7', fontSize: '13px', outline: 'none', width: '220px' }} />
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#131928' }}>
                {['Project','Owner','Plan','Mode','Created'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#8892A4', borderBottom: '1px solid rgba(255,255,255,.07)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((org, i) => (
                <tr key={org.id} style={{ borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                  <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600 }}>{org.name}</td>
                  <td style={{ padding: '12px 16px', fontSize: '12px', color: '#8892A4' }}>{org.owner_email || '—'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '100px', background: org.plan === 'global' ? 'rgba(34,197,94,.1)' : 'rgba(255,255,255,.06)', color: org.plan === 'global' ? '#22C55E' : '#8892A4', textTransform: 'uppercase' }}>
                      {org.plan || 'local'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '12px', color: org.live_mode ? '#22C55E' : '#F59E0B' }}>{org.live_mode ? '● Live' : '○ Sandbox'}</td>
                  <td style={{ padding: '12px 16px', fontSize: '12px', color: '#8892A4' }}>{org.created_at ? new Date(org.created_at).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#8892A4', fontSize: '14px' }}>No projects found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function Loading() {
  return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', color:'#8892A4', fontFamily:'Inter,sans-serif', background:'#07090F' }}>Loading...</div>
}

const pageStyle = { display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', color:'#8892A4', fontFamily:'Inter,sans-serif', background:'#07090F' }
