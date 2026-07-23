'use client'
import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth, UserButton } from '@clerk/nextjs'

/**
 * ProjectLayout — Unified adaptive layout for all three KONDUYT products.
 *
 * Sidebar structure adapts to project mode:
 *   build   — Developer/payments infrastructure nav
 *   creator — Creator business operating system nav
 *   payroll — Payroll intelligence nav
 *
 * Terminology is intentional:
 *   build:   Providers (not Connections), Activity (not Payments), Diagnostics (not Logs)
 *   creator: Audience (not Customers), Money (earnings focus, not payment processing)
 *   payroll: People (not Employees), Payroll Runs (approval-gated), Reports (not Analytics)
 *
 * The common foundation across all three: People → Money → Providers → Intelligence
 */

const MODE_COLORS = {
  build:   { accent:'#FF5C35', badge:'KONDUYTbuild',   badgeColor:'#FF5C35' },
  creator: { accent:'#F59E0B', badge:'KONDUYTcreator', badgeColor:'#F59E0B' },
  payroll: { accent:'#0BA4DB', badge:'KONDUYTpayroll', badgeColor:'#0BA4DB' },
}

function buildNav(base) {
  return [
    {
      items: [
        { label:'Home',        href: base,                     icon:'◈' },
      ]
    },
    {
      label: 'Payments',
      items: [
        { label:'Activity',    href: base + '/payments',       icon:'↕' },
        { label:'Providers',   href: base + '/connections',    icon:'⬡' },
        { label:'Smart Routing', href: base + '/routing',      icon:'⇢', sub:true },
      ]
    },
    {
      label: 'People',
      items: [
        { label:'Customers',   href: base + '/customers',      icon:'⊙' },
        { label:'People',      href: base + '/people',         icon:'◎' },
      ]
    },
    {
      label: 'Finance',
      items: [
        { label:'Taxes',       href: base + '/taxes',          icon:'§' },
        { label:'Reconciliation', href: base + '/reconciliation', icon:'↔' },
      ]
    },
    {
      label: 'Developer',
      items: [
        { label:'API Keys',    href: base + '/developers',     icon:'⌗' },
        { label:'Events',      href: base + '/webhooks',       icon:'⚡', sub:true },
        { label:'Diagnostics', href: base + '/logs',           icon:'◳' },
        { label:'Explorer',    href: base + '/explorer',       icon:'⌕', sub:true },
      ]
    },
    {
      label: 'Workspace',
      items: [
        { label:'Provider Health', href: base + '/providers',  icon:'♡' },
        { label:'Users',       href: base + '/members',        icon:'◎' },
        { label:'Billing',     href: base + '/billing',        icon:'$' },
        { label:'Settings',    href: base + '/settings',       icon:'◱' },
      ]
    },
  ]
}

function creatorNav(base) {
  return [
    {
      items: [
        { label:'Home',        href: base,                     icon:'◈' },
        { label:'Create',      href: base + '/create',         icon:'+', highlight:true },
      ]
    },
    {
      label: 'Selling',
      items: [
        { label:'Sales',       href: base + '/sales',          icon:'◎' },
        { label:'Audience',    href: base + '/audience',       icon:'⊙' },
        { label:'Subscriptions', href: base + '/subscriptions',icon:'↻', soon:true },
      ]
    },
    {
      label: 'Money',
      items: [
        { label:'Earnings',    href: base + '/money',          icon:'$' },
        { label:'Payout Accounts', href: base + '/accounts',  icon:'∞' },
        { label:'Taxes',       href: base + '/taxes',          icon:'§' },
      ]
    },
    {
      label: 'Account',
      items: [
        { label:'Diagnostics', href: base + '/logs',           icon:'◳' },
        { label:'Settings',    href: base + '/settings',       icon:'◱' },
      ]
    },
  ]
}

function payrollNav(base) {
  return [
    {
      items: [
        { label:'Home',        href: base,                     icon:'◈' },
      ]
    },
    {
      label: 'Operations',
      items: [
        { label:'People',      href: base + '/people',         icon:'◎' },
        { label:'Payroll Runs',href: base + '/runs',           icon:'▶' },
        { label:'Payments',    href: base + '/payments',       icon:'↕' },
      ]
    },
    {
      label: 'Finance',
      items: [
        { label:'Taxes',       href: base + '/taxes',          icon:'§' },
        { label:'Reports',     href: base + '/analytics',      icon:'◧' },
      ]
    },
    {
      label: 'Account',
      items: [
        { label:'Providers',   href: base + '/connections',    icon:'⬡' },
        { label:'Settings',    href: base + '/settings',       icon:'◱' },
      ]
    },
  ]
}

function NavItem({ item, accent, pathname }) {
  const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href + '/') && item.href.split('/').length >= 6)
  const isExact  = pathname === item.href

  return (
    <Link href={item.href} style={{
      display:'flex', alignItems:'center', gap:'10px',
      padding: item.sub ? '5px 8px 5px 24px' : '7px 10px',
      borderRadius:'8px', textDecoration:'none',
      background: isActive ? (item.highlight ? accent + '20' : 'rgba(255,255,255,0.07)') : 'transparent',
      borderLeft: isActive && !item.sub ? `2px solid ${item.highlight ? accent : 'rgba(255,255,255,0.25)'}` : '2px solid transparent',
      marginBottom:'1px', transition:'background .1s',
    }}>
      <span style={{ fontSize:'12px', color: isActive ? (item.highlight ? accent : '#EDF0F7') : 'rgba(237,240,247,0.35)', flexShrink:0, width:'14px', textAlign:'center' }}>
        {item.icon}
      </span>
      <span style={{ fontSize:item.sub?'12px':'13px', fontWeight: isActive ? 600 : 400, color: isActive ? (item.highlight ? accent : '#EDF0F7') : 'rgba(237,240,247,0.55)', flex:1 }}>
        {item.label}
      </span>
      {item.soon && (
        <span style={{ fontSize:'9px', fontWeight:700, color:'rgba(237,240,247,0.3)', letterSpacing:'.06em', border:'1px solid rgba(255,255,255,0.1)', padding:'1px 5px', borderRadius:'4px' }}>SOON</span>
      )}
    </Link>
  )
}

export default function ProjectLayout({ org, project, children }) {
  const pathname  = usePathname()
  const { orgId } = (pathname?.match(/\/dashboard\/([^\/]+)/) || [])
  const mode      = project?.mode || 'build'
  const modeStyle = MODE_COLORS[mode] || MODE_COLORS.build
  const { accent } = modeStyle

  // Derive base path from pathname
  const baseMatch = pathname?.match(/(\/dashboard\/[^\/]+\/[^\/]+)/)
  const base      = baseMatch ? baseMatch[1] : ''
  const orgBase   = base.split('/').slice(0, 4).join('/')  // /dashboard/orgId

  const navGroups = mode === 'creator' ? creatorNav(base)
                  : mode === 'payroll' ? payrollNav(base)
                  : buildNav(base)

  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'#07090F', fontFamily:'Inter,sans-serif' }}>

      {/* Sidebar */}
      <aside style={{
        width:'220px', flexShrink:0,
        background:'#0A0D18', borderRight:'1px solid rgba(255,255,255,0.05)',
        display:'flex', flexDirection:'column',
        position:'sticky', top:0, height:'100vh', overflowY:'auto',
      }}>
        {/* Logo / product badge */}
        <div style={{ padding:'16px 14px 12px', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
          <Link href="/dashboard" style={{ textDecoration:'none', display:'block', marginBottom:'10px' }}>
            <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'16px', letterSpacing:'.05em', color:'#EDF0F7' }}>
              KONDU<span style={{ color:accent }}>Y</span>T
            </span>
          </Link>
          {project && (
            <div>
              <div style={{ fontSize:'11px', fontWeight:700, color:accent, marginBottom:'2px', letterSpacing:'.04em' }}>
                {modeStyle.badge}
              </div>
              <div style={{ fontSize:'12px', fontWeight:600, color:'#EDF0F7', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                {project.name}
              </div>
              <div style={{ fontSize:'10px', color: project.live_mode?'#22C55E':'rgba(237,240,247,0.3)', marginTop:'2px' }}>
                {project.live_mode ? '● Live' : '○ Sandbox'}
              </div>
            </div>
          )}
        </div>

        {/* Nav groups */}
        <nav style={{ flex:1, padding:'10px 8px', overflowY:'auto' }}>
          {navGroups.map((group, gi) => (
            <div key={gi} style={{ marginBottom:'14px' }}>
              {group.label && (
                <div style={{ fontSize:'10px', fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'rgba(237,240,247,0.2)', padding:'4px 10px 6px', marginTop:'4px' }}>
                  {group.label}
                </div>
              )}
              {group.items.map(item => (
                <NavItem key={item.href} item={item} accent={accent} pathname={pathname} />
              ))}
            </div>
          ))}
        </nav>

        {/* Footer — org switcher */}
        <div style={{ padding:'12px 10px', borderTop:'1px solid rgba(255,255,255,0.05)' }}>
          {org && (
            <Link href={orgBase || '/dashboard'} style={{ display:'flex', alignItems:'center', gap:'8px', padding:'7px 8px', borderRadius:'8px', textDecoration:'none', marginBottom:'8px' }}>
              <div style={{ width:'24px', height:'24px', borderRadius:'6px', background:'rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px', fontWeight:700, color:'rgba(237,240,247,0.6)', flexShrink:0 }}>
                {(org.name || 'O')[0].toUpperCase()}
              </div>
              <div style={{ minWidth:0, flex:1 }}>
                <div style={{ fontSize:'11px', fontWeight:600, color:'rgba(237,240,247,0.6)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{org.name}</div>
              </div>
            </Link>
          )}
          <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'4px 8px' }}>
            <UserButton afterSignOutUrl="/" />
            <span style={{ fontSize:'11px', color:'rgba(237,240,247,0.3)' }}>Account</span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex:1, minWidth:0, overflowX:'hidden' }}>
        {/* Top bar */}
        <div style={{ borderBottom:'1px solid rgba(255,255,255,0.05)', padding:'12px 28px', display:'flex', alignItems:'center', justifyContent:'space-between', background:'#0A0D18', position:'sticky', top:0, zIndex:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'12px', color:'rgba(237,240,247,0.4)' }}>
            <Link href="/dashboard" style={{ color:'rgba(237,240,247,0.4)', textDecoration:'none' }}>Home</Link>
            {org && <><span>·</span><Link href={orgBase || '/dashboard'} style={{ color:'rgba(237,240,247,0.4)', textDecoration:'none' }}>{org.name}</Link></>}
            {project && <><span>·</span><span style={{ color:'rgba(237,240,247,0.7)' }}>{project.name}</span></>}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
            {mode === 'creator' && (
              <Link href={base + '/create'} style={{ fontSize:'12px', fontWeight:700, padding:'6px 14px', background:accent, color:'#fff', borderRadius:'100px', textDecoration:'none' }}>
                + Create
              </Link>
            )}
          </div>
        </div>

        {/* Page content */}
        <div style={{ padding:'28px' }}>
          {children}
        </div>
      </main>
    </div>
  )
}
