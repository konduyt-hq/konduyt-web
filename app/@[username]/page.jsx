import { notFound } from 'next/navigation'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://konduyt-api.onrender.com'

async function getCreatorData(username) {
  try {
    const r = await fetch(`${API}/v1/p/profile/@${username}`, { next: { revalidate: 60 } })
    if (!r.ok) return null
    return r.json()
  } catch { return null }
}

export async function generateMetadata({ params }) {
  const data = await getCreatorData(params.username)
  if (!data) return { title: 'Creator not found' }
  return {
    title: `${data.profile.display_name || '@' + params.username} on Konduyt`,
    description: data.profile.bio || `${data.profile.display_name} accepts payments on Konduyt`,
  }
}

const SOCIAL_ICONS = {
  website: '🌐', twitter: '𝕏', instagram: '📷', youtube: '▶', tiktok: '♪'
}

export default async function CreatorPage({ params }) {
  const data = await getCreatorData(params.username)
  if (!data) notFound()

  const { profile, offers } = data
  const accent = profile.accent_color || '#F59E0B'

  return (
    <div style={{ minHeight:'100vh', background:'#07090F', fontFamily:'Inter,sans-serif' }}>
      {/* Header strip */}
      <div style={{ height:'4px', background:`linear-gradient(90deg, ${accent}, ${accent}88)` }} />

      <div style={{ maxWidth:'560px', margin:'0 auto', padding:'32px 20px 80px' }}>

        {/* Profile section */}
        <div style={{ textAlign:'center', marginBottom:'32px' }}>
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.display_name}
              style={{ width:'72px', height:'72px', borderRadius:'50%', objectFit:'cover', marginBottom:'14px', border:`2px solid ${accent}40` }} />
          ) : (
            <div style={{ width:'72px', height:'72px', borderRadius:'50%', background:`${accent}20`, border:`2px solid ${accent}40`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'28px', fontWeight:700, color:accent, margin:'0 auto 14px' }}>
              {(profile.display_name || params.username)[0].toUpperCase()}
            </div>
          )}
          <h1 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'22px', color:'#EDF0F7', marginBottom:'4px' }}>
            {profile.display_name || '@' + params.username}
          </h1>
          <div style={{ fontSize:'13px', color:'rgba(237,240,247,0.4)', marginBottom:'10px' }}>@{params.username}</div>
          {profile.bio && (
            <p style={{ fontSize:'14px', color:'rgba(237,240,247,0.65)', lineHeight:1.65, maxWidth:'380px', margin:'0 auto 14px' }}>
              {profile.bio}
            </p>
          )}

          {/* Social links */}
          {Object.keys(profile.social || {}).length > 0 && (
            <div style={{ display:'flex', gap:'10px', justifyContent:'center', flexWrap:'wrap' }}>
              {Object.entries(profile.social).map(([platform, url]) => (
                <a key={platform} href={url.startsWith('http') ? url : 'https://' + url}
                  target="_blank" rel="noopener"
                  style={{ fontSize:'12px', color:'rgba(237,240,247,0.5)', textDecoration:'none', padding:'5px 10px', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'100px', display:'flex', alignItems:'center', gap:'5px' }}>
                  <span>{SOCIAL_ICONS[platform]}</span>
                  <span style={{ textTransform:'capitalize' }}>{platform}</span>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Offers */}
        {offers.length === 0 ? (
          <div style={{ textAlign:'center', color:'rgba(237,240,247,0.3)', fontSize:'14px', padding:'40px 0' }}>
            Nothing for sale yet.
          </div>
        ) : (
          <div style={{ display:'grid', gap:'10px' }}>
            {offers.map(offer => (
              <a key={offer.id} href={`/pay/${offer.handle}`}
                style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 20px', background:'#0D1120', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'14px', textDecoration:'none', transition:'border-color .15s', cursor:'pointer' }}>
                <div style={{ flex:1, marginRight:'16px' }}>
                  <div style={{ fontSize:'15px', fontWeight:600, color:'#EDF0F7', marginBottom:'4px' }}>{offer.title}</div>
                  {offer.description && (
                    <div style={{ fontSize:'13px', color:'rgba(237,240,247,0.45)', lineHeight:1.5, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                      {offer.description}
                    </div>
                  )}
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'16px', color:accent }}>
                    {offer.amount ? `${offer.currency} ${offer.amount.toLocaleString()}` : 'Open'}
                  </div>
                  <div style={{ fontSize:'11px', color:'rgba(237,240,247,0.3)', marginTop:'2px' }}>Get →</div>
                </div>
              </a>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign:'center', marginTop:'48px' }}>
          <a href="https://konduyt.dev" style={{ fontSize:'12px', color:'rgba(237,240,247,0.25)', textDecoration:'none' }}>
            Powered by <span style={{ color:accent, fontWeight:600 }}>Konduyt</span>
          </a>
        </div>
      </div>
    </div>
  )
}
