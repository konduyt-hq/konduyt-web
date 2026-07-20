'use client'
import Sidebar from './Sidebar'
import TopBar from './TopBar'

export default function BuildLayout({ children, org, project }) {
  const base = '/dashboard/' + (org?.id || '') + '/' + (project?.id || '')
  const orgBase = '/dashboard/' + (org?.id || '')

  const sections = [
    {
      items: [
        { label: 'Overview',      href: base,                    icon: '◈', exact: true },
        { label: 'Projects',      href: orgBase,                 icon: '⊞', exact: true },
      ]
    },
    {
      label: 'Payments',
      items: [
        { label: 'Transactions',  href: base + '/transactions',  icon: '⇅' },
        { label: 'Customers',     href: base + '/customers',     icon: '◎' },
      ]
    },
    {
      label: 'Infrastructure',
      items: [
        { label: 'Integrations',  href: base + '/integrations',  icon: '⊕' },
        { label: 'Smart Routing', href: base + '/routing',       icon: '⇢' },
        { label: 'Webhooks',      href: base + '/webhooks',      icon: '⚡' },
        { label: 'API Keys',      href: base + '/keys',          icon: '⌗' },
      ]
    },
    {
      label: 'Intelligence',
      items: [
        { label: 'Analytics',     href: base + '/analytics',     icon: '▦' },
        { label: 'Taxes',         href: base + '/taxes',         icon: '§' },
      ]
    },
    {
      label: 'Team',
      items: [
        { label: 'People',        href: base + '/people',        icon: '⊙' },
        { label: 'Settings',      href: base + '/settings',      icon: '⚙' },
      ]
    },
    {
      label: 'Organization',
      items: [
        { label: 'Connections',   href: orgBase + '/connections', icon: '∞' },
        { label: 'Members',       href: orgBase + '/members',    icon: '☺' },
        { label: 'Billing',       href: orgBase + '/billing',    icon: '◉' },
      ]
    },
  ]

  const header = (
    <div>
      <div style={{ fontSize:'11px', fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'rgba(255,92,53,0.7)', marginBottom:'4px' }}>KONDUYTbuild</div>
      {project && <div style={{ fontSize:'13px', fontWeight:600, color:'#EDF0F7' }}>{project.name}</div>}
      {project && <div style={{ fontSize:'11px', color:'rgba(237,240,247,0.35)', marginTop:'2px' }}>{project.live_mode ? '● Live' : '○ Sandbox'}</div>}
    </div>
  )

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'#07090F' }}>
      <Sidebar sections={sections} accent="#FF5C35" header={header} />
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <TopBar org={org} product="build" accent="#FF5C35" badge={project?.live_mode ? null : 'Sandbox'} />
        <main style={{ flex:1, padding:'28px 32px', overflowY:'auto' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
