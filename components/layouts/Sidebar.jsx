'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Sidebar({ sections, accent = '#FF5C35', header, footer }) {
  const pathname = usePathname()

  function isActive(href, exact) {
    if (!href || href === '#') return false
    return exact ? pathname === href : pathname.startsWith(href)
  }

  return (
    <aside style={{ width:'220px', minHeight:'100vh', background:'#0A0C14', borderRight:'1px solid rgba(255,255,255,0.05)', display:'flex', flexDirection:'column', position:'sticky', top:0, flexShrink:0, overflowY:'auto' }}>
      <div style={{ padding:'16px 14px', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>{header}</div>

      <nav style={{ flex:1, padding:'8px 0' }}>
        {sections.map((section, si) => (
          <div key={si} style={{ marginBottom:'4px' }}>
            {section.label && (
              <div style={{ fontSize:'10px', fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.22)', padding:'8px 22px 4px' }}>
                {section.label}
              </div>
            )}
            {section.items.map(item => {
              const active = isActive(item.href, item.exact)
              const childActive = item.children?.some(c => isActive(c.href, false))
              return (
                <div key={item.label}>
                  <Link href={item.href || '#'} style={{ display:'flex', alignItems:'center', gap:'9px', padding:'7px 14px', margin:'1px 8px', borderRadius:'6px', fontSize:'13px', fontWeight: (active || childActive) ? 600 : 400, color: (active || childActive) ? '#EDF0F7' : 'rgba(237,240,247,0.5)', background: active ? 'rgba(255,255,255,0.07)' : 'transparent', textDecoration:'none', transition:'all .12s', borderLeft: active ? '2px solid ' + accent : '2px solid transparent' }}>
                    <span style={{ fontSize:'14px', opacity: active ? 1 : 0.7, flexShrink:0 }}>{item.icon}</span>
                    <span style={{ flex:1 }}>{item.label}</span>
                    {item.badge && <span style={{ fontSize:'10px', fontWeight:700, padding:'1px 6px', borderRadius:'100px', background:'rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.4)' }}>{item.badge}</span>}
                    {item.soon && <span style={{ fontSize:'9px', fontWeight:700, padding:'1px 5px', borderRadius:'4px', background:'rgba(245,158,11,0.15)', color:'#F59E0B', letterSpacing:'.04em' }}>SOON</span>}
                  </Link>

                  {/* Children — shown when parent or child is active */}
                  {item.children && (active || childActive) && (
                    <div style={{ marginLeft:'8px', paddingLeft:'12px', borderLeft:'1px solid rgba(255,255,255,0.06)', marginRight:'8px', marginBottom:'2px' }}>
                      {item.children.map(child => {
                        const ca = isActive(child.href, false)
                        return (
                          <Link key={child.href} href={child.href} style={{ display:'flex', alignItems:'center', gap:'8px', padding:'6px 12px', borderRadius:'6px', fontSize:'12px', fontWeight: ca ? 600 : 400, color: ca ? '#EDF0F7' : 'rgba(237,240,247,0.45)', background: ca ? 'rgba(255,255,255,0.06)' : 'transparent', textDecoration:'none', transition:'all .12s', borderLeft: ca ? '2px solid ' + accent : '2px solid transparent' }}>
                            {child.label}
                            {child.soon && <span style={{ fontSize:'9px', fontWeight:700, padding:'1px 4px', borderRadius:'4px', background:'rgba(245,158,11,0.15)', color:'#F59E0B' }}>SOON</span>}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </nav>

      {footer && <div style={{ padding:'12px 8px', borderTop:'1px solid rgba(255,255,255,0.05)' }}>{footer}</div>}
    </aside>
  )
}
