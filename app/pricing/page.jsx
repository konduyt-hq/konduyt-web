import Nav from '../../components/Nav'
import Footer from '../../components/Footer'
import Link from 'next/link'

export const metadata = { title: 'Pricing', description: 'Local is free. Global is paid. Enterprise is custom.' }

const LOCAL = ['Unlimited vendors','Unlimited transactions','SDK access','Unified dashboard','Production mode','Tax calculation','Tax filing guidance — step by step','Automated reconciliation','Konduyt Watchdog','API monitoring','Outage detection','Audit history','1 jurisdiction (home country)']
const GLOBAL = ['Unlimited jurisdictions','Multi-country tax guidance','Cross-border reconciliation','Multi-currency reporting']

export default function PricingPage() {
  return (
    <>
      <Nav />
      <main style={{maxWidth:'1100px',margin:'0 auto',padding:'80px 32px 100px'}}>

        <div style={{textAlign:'center',marginBottom:'64px'}}>
          <h1 style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:'clamp(32px,5vw,52px)',lineHeight:1.15,letterSpacing:'-.025em'}}>
            Local is free.<br/>Global is paid.<br/>Enterprise is custom.
          </h1>
        </div>

        {/* Pricing cards — responsive grid */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'16px',marginBottom:'64px'}} className="pricing-grid">

          {/* LOCAL */}
          <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'14px',padding:'28px'}}>
            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:'18px',marginBottom:'12px'}}>Local</div>
            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:'36px',marginBottom:'4px'}}>$0</div>
            <div style={{fontSize:'13px',color:'var(--text-muted)',marginBottom:'20px'}}>Free forever</div>
            <p style={{fontSize:'13px',color:'var(--text-muted)',marginBottom:'20px',lineHeight:1.6}}>For businesses operating in one country.</p>
            <Link href="/signup" style={{display:'block',padding:'12px',background:'var(--surface-2)',color:'var(--text)',textAlign:'center',fontSize:'14px',fontWeight:600,borderRadius:'8px',border:'1px solid var(--border)',textDecoration:'none',marginBottom:'20px'}}>Start for free</Link>
            <ul style={{listStyle:'none',display:'grid',gap:'8px',borderTop:'1px solid var(--border)',paddingTop:'20px'}}>
              {LOCAL.map(f=><li key={f} style={{fontSize:'13px',color:'var(--text-muted)',display:'flex',gap:'8px',alignItems:'flex-start'}}><span style={{color:'var(--text-dim)',flexShrink:0}}>✓</span>{f}</li>)}
            </ul>
          </div>

          {/* GLOBAL */}
          <div style={{background:'var(--surface)',border:'1px solid var(--accent)',borderRadius:'14px',padding:'28px',position:'relative'}}>
            <div style={{position:'absolute',top:'-12px',left:'50%',transform:'translateX(-50%)',background:'var(--accent)',color:'#fff',fontSize:'11px',fontWeight:700,padding:'3px 12px',borderRadius:'100px',whiteSpace:'nowrap'}}>Most popular</div>
            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:'18px',marginBottom:'12px'}}>Global</div>
            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:'36px',marginBottom:'4px'}}>$49</div>
            <div style={{fontSize:'13px',color:'var(--text-muted)',marginBottom:'20px'}}>per month per project</div>
            <p style={{fontSize:'13px',color:'var(--text-muted)',marginBottom:'20px',lineHeight:1.6}}>For businesses operating across multiple countries.</p>
            <Link href="/signup" style={{display:'block',padding:'12px',background:'var(--accent)',color:'#fff',textAlign:'center',fontSize:'14px',fontWeight:600,borderRadius:'8px',textDecoration:'none',marginBottom:'6px'}}>Start 30-day free trial</Link>
            <p style={{fontSize:'11px',color:'var(--text-muted)',textAlign:'center',marginBottom:'20px'}}>No credit card needed</p>
            <ul style={{listStyle:'none',display:'grid',gap:'8px',borderTop:'1px solid var(--border)',paddingTop:'20px'}}>
              <li style={{fontSize:'12px',fontWeight:700,color:'var(--text)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'4px'}}>Everything in Local, plus:</li>
              {GLOBAL.map(f=><li key={f} style={{fontSize:'13px',color:'var(--text-muted)',display:'flex',gap:'8px',alignItems:'flex-start'}}><span style={{color:'var(--accent)',flexShrink:0}}>✓</span>{f}</li>)}
            </ul>
          </div>

          {/* ENTERPRISE */}
          <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'14px',padding:'28px'}}>
            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:'18px',marginBottom:'12px'}}>Enterprise</div>
            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:'36px',marginBottom:'4px'}}>Custom</div>
            <div style={{fontSize:'13px',color:'var(--text-muted)',marginBottom:'20px'}}>Tailored to your needs</div>
            <p style={{fontSize:'13px',color:'var(--text-muted)',marginBottom:'20px',lineHeight:1.6}}>For organizations whose needs do not fit the standard product.</p>
            <a
              href="mailto:teamkonduyt@gmail.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{display:'block',padding:'12px',background:'var(--surface-2)',color:'var(--text)',textAlign:'center',fontSize:'14px',fontWeight:600,borderRadius:'8px',border:'1px solid var(--border)',textDecoration:'none',marginBottom:'20px'}}
            >
              Email us →
            </a>
            <ul style={{listStyle:'none',display:'grid',gap:'8px',borderTop:'1px solid var(--border)',paddingTop:'20px'}}>
              {['Custom vendor integrations','One invoice for many projects','Migration assistance','Dedicated engineering support','SLA contracts','Procurement compliance'].map(f=><li key={f} style={{fontSize:'13px',color:'var(--text-muted)',display:'flex',gap:'8px',alignItems:'flex-start'}}><span style={{color:'var(--text-dim)',flexShrink:0}}>✓</span>{f}</li>)}
            </ul>
          </div>

        </div>

        <div style={{textAlign:'center',padding:'32px',border:'1px solid var(--border)',borderRadius:'14px',background:'var(--surface)'}}>
          <p style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:'16px',fontStyle:'italic',color:'var(--text-muted)',maxWidth:'600px',margin:'0 auto',lineHeight:1.7}}>
            Every business deserves world-class payment infrastructure in its home market.<br/>We charge only when your business becomes global.
          </p>
        </div>

      </main>

      {/* Mobile responsive styles */}
      <style>{`
        @media (max-width: 900px) {
          .pricing-grid { grid-template-columns: 1fr !important; max-width: 480px; margin-left: auto; margin-right: auto; }
        }
        @media (max-width: 480px) {
          main { padding: 48px 20px 72px !important; }
        }
      `}</style>

      <Footer />
    </>
  )
}
