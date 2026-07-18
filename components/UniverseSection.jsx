import Link from 'next/link'

const PRODUCTS = [
  {
    id: 'build',
    name: 'KONDUYTbuild',
    accent: '#FF5C35',
    accentBg: 'rgba(255,92,53,0.10)',
    accentBorder: 'rgba(255,92,53,0.30)',
    status: 'Available now',
    statusColor: '#22C55E',
    statusBg: 'rgba(34,197,94,0.10)',
    tagline: 'For developers',
    desc: 'One integration for every payment method in your website, app, or marketplace. Stripe, PayPal, M-Pesa, Flutterwave — unified behind a single SDK with tax guidance built in.',
    features: [
      'Every payment method, one line of code',
      'Works in websites, apps, and marketplaces',
      'Tax guidance for every jurisdiction',
      'Sandbox included — test before going live',
      'Free in your home country',
    ],
    cta: { text: 'Start building free →', href: '/signup', primary: true },
    dim: false,
  },
  {
    id: 'creator',
    name: 'KONDUYTcreator',
    accent: '#F59E0B',
    accentBg: 'rgba(245,158,11,0.08)',
    accentBorder: 'rgba(245,158,11,0.25)',
    status: 'In development · September 2026',
    statusColor: '#F59E0B',
    statusBg: 'rgba(245,158,11,0.10)',
    tagline: 'For creators',
    desc: 'Accept tips, memberships, and payments from fans anywhere in the world — in their currency, tracked in one dashboard. Built for streamers, YouTubers, and independent creators earning globally.',
    features: [
      'No-code tip widget for any platform',
      'Multi-currency, one payout',
      'Track all income in one place',
      'Tax guidance per country',
    ],
    cta: { text: 'Get notified when live →', href: 'mailto:teamkonduyt@gmail.com', primary: false },
    dim: true,
  },
  {
    id: 'payroll',
    name: 'KONDUYTpayroll',
    accent: '#22C55E',
    accentBg: 'rgba(34,197,94,0.08)',
    accentBorder: 'rgba(34,197,94,0.25)',
    status: 'In development · September 2026',
    statusColor: '#22C55E',
    statusBg: 'rgba(34,197,94,0.10)',
    tagline: 'For businesses',
    desc: 'Pay your global team in their local currency, on time, with correct tax deductions — automatically. One click. Every country. Replaces Deel and Remote.com at a fraction of the cost.',
    features: [
      'Pay in any local currency or rail',
      'Correct tax deductions per country',
      'M-Pesa, UPI, PIX, bank transfer',
      '85% cheaper than Deel',
    ],
    cta: { text: 'Get notified when live →', href: 'mailto:teamkonduyt@gmail.com', primary: false },
    dim: true,
  },
]

export default function UniverseSection() {
  return (
    <section style={{ padding:'80px 32px', background:'var(--surface)', borderTop:'1px solid var(--border)', borderBottom:'1px solid var(--border)' }}>
      <div style={{ maxWidth:'1200px', margin:'0 auto' }}>

        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:'52px' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:'8px', fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'11px', letterSpacing:'.14em', textTransform:'uppercase', color:'var(--accent)', background:'var(--accent-dim)', border:'1px solid var(--accent-border)', padding:'4px 14px', borderRadius:'100px', marginBottom:'20px' }}>
            Choose your universe
          </div>
          <h2 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'clamp(28px,4vw,44px)', letterSpacing:'-.025em', margin:0 }}>
            One platform. Three tools.
          </h2>
          <p style={{ fontSize:'16px', color:'var(--text-muted)', marginTop:'12px', maxWidth:'480px', margin:'12px auto 0', lineHeight:1.65 }}>
            Pick the tool that fits where you are right now.
          </p>
        </div>

        {/* Cards */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'16px' }}>
          {PRODUCTS.map(p => (
            <div key={p.id} style={{
              background: p.dim ? 'var(--bg)' : 'var(--bg)',
              border: `1px solid ${p.accentBorder}`,
              borderRadius:'16px',
              padding:'28px',
              position:'relative',
              opacity: p.dim ? 0.8 : 1,
              transition:'transform .2s, box-shadow .2s',
              display:'flex', flexDirection:'column',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow=`0 12px 40px ${p.accentBg}` }}
            onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='none' }}
            >
              {/* Top accent bar */}
              <div style={{ position:'absolute', top:0, left:0, right:0, height:'3px', background:p.accent, borderRadius:'16px 16px 0 0' }} />

              {/* Status */}
              <div style={{ display:'inline-flex', alignItems:'center', gap:'6px', fontSize:'11px', fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:p.statusColor, background:p.statusBg, padding:'3px 10px', borderRadius:'100px', width:'fit-content', marginBottom:'20px', marginTop:'8px' }}>
                <span style={{ width:'5px', height:'5px', borderRadius:'50%', background:p.statusColor, display:'inline-block', animation: p.dim ? 'none' : 'blink 2s ease-in-out infinite' }} />
                {p.status}
              </div>

              {/* Tag */}
              <div style={{ fontSize:'12px', fontWeight:600, color:p.accent, letterSpacing:'.06em', textTransform:'uppercase', marginBottom:'6px' }}>{p.tagline}</div>

              {/* Name */}
              <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'20px', letterSpacing:'.02em', color:'var(--text)', marginBottom:'14px' }}>{p.name}</div>

              {/* Description */}
              <p style={{ fontSize:'13px', color:'var(--text-muted)', lineHeight:1.65, marginBottom:'20px', flexGrow:1 }}>{p.desc}</p>

              {/* Features */}
              <ul style={{ listStyle:'none', display:'grid', gap:'7px', marginBottom:'24px' }}>
                {p.features.map(f => (
                  <li key={f} style={{ fontSize:'13px', color:'var(--text-muted)', display:'flex', alignItems:'flex-start', gap:'8px' }}>
                    <span style={{ color:p.accent, flexShrink:0, fontWeight:700 }}>✓</span>{f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {p.cta.primary
                ? <Link href={p.cta.href} style={{ display:'block', padding:'12px', background:p.accent, color:'#fff', textAlign:'center', fontSize:'14px', fontWeight:600, borderRadius:'9px', textDecoration:'none', transition:'opacity .15s' }}>
                    {p.cta.text}
                  </Link>
                : <a href={p.cta.href} style={{ display:'block', padding:'12px', background:p.accentBg, color:p.accent, textAlign:'center', fontSize:'14px', fontWeight:600, borderRadius:'9px', textDecoration:'none', border:`1px solid ${p.accentBorder}` }}>
                    {p.cta.text}
                  </a>
              }
            </div>
          ))}
        </div>

      </div>

      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @media(max-width:900px) {
          .universe-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  )
}
