import Nav from '../../components/Nav'
import Footer from '../../components/Footer'

export const metadata = { title: 'Privacy Policy', description: 'How Konduyt handles your data.' }

export default function PrivacyPage() {
  const sections = [
    ['What we collect','We collect your email for authentication, government ID for KYC, and transaction data. We do not collect card details — those go directly to your vendor.'],
    ['How we use it','To provide authentication, project management, tax calculation, and transaction logging. We do not sell your data.'],
    ['Storage','Data stored on Supabase (EU). KYC documents in private Supabase Storage.'],
    ['Your rights','Request account deletion anytime by emailing team@konduyt.dev. Processed within 30 days.'],
    ['Contact','team@konduyt.dev'],
  ]
  return (
    <>
      <Nav />
      <main style={{maxWidth:'720px',margin:'60px auto',padding:'0 32px'}}>
        <h1 style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:'36px',marginBottom:'8px'}}>Privacy Policy</h1>
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
