'use client'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import CommandPalette from '../ui/CommandPalette'

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
        {
          label: 'Payments', href: base + '/payments', icon: '⇅',
          children: [
            { label: 'Smart Routing', href: base + '/routing' },
          ]
        },
      ]
    },
    {
      label: 'People',
      items: [
        { label: 'People',    href: base + '/people',    icon: '⊙' },
        { label: 'Customers', href: base + '/customers', icon: '◎' },
      ]
    },
    {
      label: 'Finance',
      items: [
        { label: 'Connections', href: base + '/connections', icon: '∞' },
        { label: 'Taxes',       href: base + '/taxes',       icon: '§' },
        { label: 'Analytics',   href: base + '/analytics',   icon: '▦' },
      ]
    },
    {
      label: 'Developer',
      items: [
        { label: 'Developers', href: base + '/developers', icon: '⌗' },
      ]
    },
    {
      items: [
        { label: 'Settings', href: base + '/settings', icon: '⚙' },
      ]
    },
    {
      label: 'Workspace',
      items: [
        { label: 'Provider Health', href: base + '/providers',    icon: '◉' },
        { label: 'Connections',     href: orgBase + '/connections', icon: '∞' },
        { label: 'Members',         href: orgBase + '/members',     icon: '☺' },
        { label: 'Billing',         href: orgBase + '/billing',     icon: '◉' },
      ]
    },
  ]

  const modeLabel = { build: 'KONDUYTbuild', creator: 'KONDUYTcreator', payroll: 'KONDUYTpayroll' }

  const header = (
    <div>
      <div style={{ fontSize:'10px', fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color: accent + 'bb', marginBottom:'4px' }}>
        {modeLabel[mode] || 'KONDUYTbuild'}
      </div>
      {project && <div style={{ fontSize:'13px', fontWeight:600, color:'#EDF0F7' }}>{project.name}</div>}
      {project && <div style={{ fontSize:'11px', color:'rgba(237,240,247,0.35)', marginTop:'2px' }}>{project.live_mode ? '● Live' : '○ Sandbox'}</div>}
    </div>
  )

  const footer = (
    <div style={{ padding:'4px 0' }}>
      <button
        onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key:'k', metaKey:true, bubbles:true }))}
        style={{ display:'flex', alignItems:'center', gap:'8px', width:'100%', padding:'7px 14px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'6px', cursor:'pointer', fontSize:'12px', color:'rgba(237,240,247,0.45)' }}
      >
        <span>⌕</span>
        <span style={{ flex:1, textAlign:'left' }}>Search...</span>
        <kbd style={{ fontSize:'10px', background:'rgba(255,255,255,0.06)', padding:'1px 5px', borderRadius:'3px' }}>⌘K</kbd>
      </button>
    </div>
  )

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'#07090F' }}>
      <Sidebar sections={sections} accent={accent} header={header} footer={footer} />
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <TopBar org={org} product={mode} accent={accent} badge={project?.live_mode ? null : 'Sandbox'} />
        <main style={{ flex:1, padding:'28px 32px', overflowY:'auto' }}>{children}</main>
      </div>
      <CommandPalette orgId={org?.id || ''} projectId={project?.id || ''} />
    </div>
  )
}
