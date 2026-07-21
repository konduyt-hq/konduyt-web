import Link from 'next/link'

export default function EmptyState({ icon = '◎', title, desc, actions = [] }) {
  return (
    <div style={{ padding:'64px 20px', textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap:'12px' }}>
      <div style={{ fontSize:'32px', opacity:0.4 }}>{icon}</div>
      <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'15px', color:'#EDF0F7' }}>{title}</div>
      <div style={{ fontSize:'13px', color:'rgba(237,240,247,0.45)', lineHeight:1.65, maxWidth:'360px' }}>{desc}</div>
      {actions.length > 0 && (
        <div style={{ display:'flex', gap:'10px', flexWrap:'wrap', justifyContent:'center', marginTop:'8px' }}>
          {actions.map((a, i) => (
            a.href
              ? <Link key={a.label} href={a.href} style={{ fontSize:'13px', fontWeight:600, padding:'9px 18px', borderRadius:'100px', textDecoration:'none', color: i===0?'#fff':'rgba(237,240,247,0.7)', background: i===0?'#FF5C35':'rgba(255,255,255,0.07)', border: i===0?'none':'1px solid rgba(255,255,255,0.1)' }}>
                {a.label}
              </Link>
              : <button key={a.label} onClick={a.onClick} style={{ fontSize:'13px', fontWeight:600, padding:'9px 18px', borderRadius:'100px', cursor:'pointer', color: i===0?'#fff':'rgba(237,240,247,0.7)', background: i===0?'#FF5C35':'rgba(255,255,255,0.07)', border: i===0?'none':'1px solid rgba(255,255,255,0.1)' }}>
                {a.label}
              </button>
          ))}
        </div>
      )}
    </div>
  )
}
