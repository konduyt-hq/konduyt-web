'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Sidebar({ sections, product, accent, header, footer }) {
  const pathname = usePathname()

  return (
    <aside style={{
      width: '220px', minHeight: '100vh', background: '#0A0C14',
      borderRight: '1px solid rgba(255,255,255,0.05)',
      display: 'flex', flexDirection: 'column',
      position: 'sticky', top: 0, flexShrink: 0, overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{ padding: '16px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        {header}
      </div>

      {/* Nav sections */}
      <nav style={{ flex: 1, padding: '8px 0' }}>
        {sections.map((section, si) => (
          <div key={si} style={{ marginBottom: '4px' }}>
            {section.label && (
              <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', padding: '8px 22px 4px' }}>
                {section.label}
              </div>
            )}
            {section.items.map(item => {
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
              return (
                <Link key={item.href} href={item.href} style={{
                  display: 'flex', alignItems: 'center', gap: '9px',
                  padding: '7px 14px', margin: '1px 8px', borderRadius: '6px',
                  fontSize: '13px', fontWeight: active ? 600 : 400,
                  color: active ? '#EDF0F7' : 'rgba(237,240,247,0.5)',
                  background: active ? 'rgba(255,255,255,0.07)' : 'transparent',
                  textDecoration: 'none', transition: 'all .12s',
                  borderLeft: active ? '2px solid ' + accent : '2px solid transparent',
                }}>
                  <span style={{ fontSize: '14px', opacity: active ? 1 : 0.7 }}>{item.icon}</span>
                  {item.label}
                  {item.badge && (
                    <span style={{ marginLeft: 'auto', fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '100px', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      {footer && (
        <div style={{ padding: '12px 8px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {footer}
        </div>
      )}
    </aside>
  )
}
