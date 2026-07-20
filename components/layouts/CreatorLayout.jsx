'use client'
import Sidebar from './Sidebar'
import TopBar from './TopBar'

export default function CreatorLayout({ children, org }) {
  const base = '/dashboard/' + (org?.id || '') + '/creator'
  const orgBase = '/dashboard/' + (org?.id || '')

  const sections = [
    {
      items: [
        { label: 'Home',            href: base,                     icon: '◈', exact: true },
      ]
    },
    {
      label: 'Earn',
      items: [
        { label: 'Payment Links',   href: base + '/links',          icon: '⇗' },
        { label: 'Supporters',      href: base + '/supporters',     icon: '♡' },
        { label: 'Payments',        href: base + '/payments',       icon: '⇅' },
        { label: 'Subscriptions',   href: base + '/subscriptions',  icon: '◉' },
        { label: 'Products',        href: base + '/products',       icon: '⊞', soon: true },
      ]
    },
    {
      label: 'Money',
      items: [
        { label: 'Connected Accounts', href: base + '/accounts',   icon: '∞' },
        { label: 'Taxes',           href: base + '/taxes',         icon: '§' },
        { label: 'Analytics',       href: base + '/analytics',     icon: '▦' },
      ]
    },
    {
      label: 'Account',
      items: [
        { label: 'Settings',        href: base + '/settings',      icon: '⚙' },
        { label: 'Connections',     href: orgBase + '/connections', icon: '∞' },
      ]
    },
  ]

  const header = (
    <div>
      <div style={{ fontSize:'11px', fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'rgba(245,158,11,0.7)', marginBottom:'4px' }}>KONDUYTcreator</div>
      {org && <div style={{ fontSize:'13px', fontWeight:600, color:'#EDF0F7' }}>{org.name}</div>}
    </div>
  )

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'#07090F' }}>
      <Sidebar sections={sections} accent="#F59E0B" header={header} />
      <div style={{ flex:1, display:'flex', flexDirection:'column' }}>
        <TopBar org={org} product="creator" accent="#F59E0B" />
        <main style={{ flex:1, padding:'28px 32px', overflowY:'auto' }}>{children}</main>
      </div>
    </div>
  )
}
