import Nav from '../../components/Nav'
import Footer from '../../components/Footer'

export const metadata = { title: 'Terms of Service', description: 'Konduyt terms of service.' }

export default function TermsPage() {
  const sections = [
    ['Acceptance','By using Konduyt, you agree to these terms.'],
    ['What Konduyt provides','A payment infrastructure SDK that unifies multiple payment vendors. We are not a payment processor or financial institution.'],
    ['Your responsibility','You are responsible for complying with tax and financial regulations in your jurisdiction and for the legality of transactions processed through your integration.'],
    ['Service availability','Konduyt is provided as-is. We aim for high availability but do not guarantee uptime.'],
    ['Contact','team@konduyt.dev'],
  ]
  return (
    <>
      <Nav />
      <main style={{maxWidth:'720px',margin:'60px auto',padding:'0 32px'}}>
        <h1 style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:'36px',marginBottom:'8px'}}>Terms of Service</h1>
        <p style={{fontSize:'13px',color:'var(--text-muted)',marginBottom:'40px'}}>Last updated: July 2026</p>
        {sections.map(([t,b]) => (
          <div key={t} style={{marginBottom:'32px'}}>
            <h2 style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:'18px',marginBottom:'10px'}}>{t}</h2>
            <p style={{fontSize:'15px',color:'var(--text-muted)',lineHeight:1.7}}>{b}</p>
          </div>
        ))}
      </main>
      <Footer />
    </>
  )
}
