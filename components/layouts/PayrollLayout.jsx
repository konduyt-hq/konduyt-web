'use client'
import Sidebar from './Sidebar'
import TopBar from './TopBar'

export default function PayrollLayout({ children, org }) {
  const base = '/dashboard/' + (org?.id || '') + '/payroll'
  const orgBase = '/dashboard/' + (org?.id || '')

  const sections = [
    {
      items: [
        { label: 'Dashboard',     href: base,                     icon: '◈', exact: true },
      ]
    },
    {
      label: 'People',
      items: [
        { label: 'People',        href: base + '/people',         icon: '⊙' },
        { label: 'Payroll Runs',  href: base + '/runs',           icon: '↻' },
        { label: 'Schedules',     href: base + '/schedules',      icon: '◷' },
      ]
    },
    {
      label: 'Money',
      items: [
        { label: 'Payments',      href: base + '/payments',       icon: '⇅' },
        { label: 'Payment Methods', href: base + '/methods',      icon: '∞' },
        { label: 'Taxes',         href: base + '/taxes',          icon: '§' },
      ]
    },
    {
      label: 'Insights',
      items: [
        { label: 'Analytics',     href: base + '/analytics',      icon: '▦' },
        { label: 'Integrations',  href: base + '/integrations',   icon: '⊕', soon: true },
      ]
    },
    {
      label: 'Account',
      items: [
        { label: 'Settings',      href: base + '/settings',       icon: '⚙' },
        { label: 'Connections',   href: orgBase + '/connections', icon: '∞' },
      ]
    },
  ]

  const header = (
    <div>
      <div style={{ fontSize:'11px', fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'rgba(34,197,94,0.7)', marginBottom:'4px' }}>KONDUYTpayroll</div>
      {org && <div style={{ fontSize:'13px', fontWeight:600, color:'#EDF0F7' }}>{org.name}</div>}
    </div>
  )

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'#07090F' }}>
      <Sidebar sections={sections} accent="#22C55E" header={header} />
      <div style={{ flex:1, display:'flex', flexDirection:'column' }}>
        <TopBar org={org} product="payroll" accent="#22C55E" />
        <main style={{ flex:1, padding:'28px 32px', overflowY:'auto' }}>{children}</main>
      </div>
    </div>
  )
}
