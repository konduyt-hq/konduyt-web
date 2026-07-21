'use client'
import Sidebar from './Sidebar'
import TopBar from './TopBar'

const ACCENTS = { build: '#FF5C35', creator: '#F59E0B', payroll: '#22C55E' }

export default function ProjectLayout({ children, org, project }) {
  const mode    = project?.mode || 'build'
  const accent  = ACCENTS[mode] || '#FF5C35'
  const base    = '/dashboard/' + (org?.id || '') + '/' + (project?.id || '')
  const orgBase = '/dashboard/' + (org?.id || '')

  const sections = [
    {
      items: [
        { label: 'Overview', href: base, icon: '◈', exact: true },
      ]
    },
    {
      label: 'Money',
      items: [
        { label: 'Transactions',  href: base + '/transactions',  icon: '⇅' },
        { label: 'Smart Routing', href: base + '/routing',       icon: '⇢' },
      ]
    },
    ...(mode === 'creator' ? [{
      label: 'Earn',
      items: [
        { label: 'Payment Links',  href: base + '/links',         icon: '⇗' },
        { label: 'Supporters',     href: base + '/supporters',    icon: '♡' },
        { label: 'Subscriptions',  href: base + '/subscriptions', icon: '◉', soon: true },
      ]
    }] : []),
    {
      label: 'People',
      items: [
        { label: 'People',       href: base + '/people',    icon: '⊙' },
        ...(mode === 'payroll' ? [
          { label: 'Payroll Runs', href: base + '/runs',      icon: '↻' },
          { label: 'Schedules',   href: base + '/schedules', icon: '◷' },
        ] : []),
      ]
    },
    {
      label: 'Customers',
      items: [
        { label: 'Customers', href: base + '/customers', icon: '◎' },
      ]
    },
    {
      label: 'Connections',
      items: [
        { label: 'Connections', href: base + '/connections', icon: '∞' },
      ]
    },
    {
      label: 'Finance',
      items: [
        { label: 'Taxes',     href: base + '/taxes',     icon: '§' },
        { label: 'Analytics', href: base + '/analytics', icon: '▦' },
      ]
    },
    ...(mode === 'build' ? [{
      label: 'Developers',
      items: [
        { label: 'API Keys', href: base + '/keys',     icon: '⌗' },
        { label: 'Webhooks', href: base + '/webhooks', icon: '⚡' },
      ]
    }] : []),
    {
      items: [
        { label: 'Settings', href: base + '/settings', icon: '⚙' },
      ]
    },
    {
      label: 'Organization',
      items: [
        { label: 'Connections', href: orgBase + '/connections', icon: '∞' },
        { label: 'Members',     href: orgBase + '/members',     icon: '☺' },
        { label: 'Billing',     href: orgBase + '/billing',     icon: '◉' },
      ]
    },
  ]

  const modeLabel = { build: 'KONDUYTbuild', creator: 'KONDUYTcreator', payroll: 'KONDUYTpayroll' }

  const header = (
    <div>
      <div style={{ fontSize:'10px', fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color: accent + 'aa', marginBottom:'4px' }}>
        {modeLabel[mode] || 'KONDUYTbuild'}
      </div>
      {project && <div style={{ fontSize:'13px', fontWeight:600, color:'#EDF0F7' }}>{project.name}</div>}
      {project && (
        <div style={{ fontSize:'11px', color:'rgba(237,240,247,0.35)', marginTop:'2px' }}>
          {project.live_mode ? '● Live' : '○ Sandbox'}
        </div>
      )}
    </div>
  )

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'#07090F' }}>
      <Sidebar sections={sections} accent={accent} header={header} />
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <TopBar org={org} product={mode} accent={accent} badge={project?.live_mode ? null : 'Sandbox'} />
        <main style={{ flex:1, padding:'28px 32px', overflowY:'auto' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
