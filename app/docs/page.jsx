import Nav from '../../components/Nav'
import Footer from '../../components/Footer'
import Link from 'next/link'

export const metadata = { title: 'Docs', description: 'Konduyt SDK documentation and API reference.' }

export default function DocsPage() {
  return (
    <>
      <Nav />
      <main style={{maxWidth:'760px',margin:'80px auto',padding:'0 32px',textAlign:'center'}}>
        <h1 style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:'clamp(32px,5vw,48px)',marginBottom:'20px',lineHeight:1.15}}>Docs coming soon</h1>
        <p style={{fontSize:'16px',color:'var(--text-muted)',lineHeight:1.7,marginBottom:'40px'}}>Full documentation is being written. In the meantime, explore the live API reference below.</p>
        <div style={{display:'flex',gap:'12px',justifyContent:'center',flexWrap:'wrap'}}>
          <a href="https://konduyt-api.onrender.com/docs" target="_blank" rel="noopener" style={{fontSize:'14px',fontWeight:600,color:'#fff',background:'var(--accent)',padding:'12px 24px',borderRadius:'8px',textDecoration:'none'}}>View API reference →</a>
          <Link href="/" style={{fontSize:'14px',fontWeight:500,color:'var(--text-muted)',background:'var(--surface)',border:'1px solid var(--border)',padding:'12px 20px',borderRadius:'8px',textDecoration:'none'}}>Back to home</Link>
        </div>
      </main>
      <Footer />
    </>
  )
}
