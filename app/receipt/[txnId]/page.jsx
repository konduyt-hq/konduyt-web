'use client'
import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://konduyt-api.onrender.com'

export default function ReceiptPage() {
  const { txnId }     = useParams()
  const searchParams  = useSearchParams()
  const receiptToken  = searchParams.get('token') || ''
  const [receipt, setReceipt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    if (!receiptToken) {
      setError('Invalid receipt link — missing verification token.')
      setLoading(false)
      return
    }
    fetch(`${API}/v1/receipt/${txnId}?token=${encodeURIComponent(receiptToken)}`)
      .then(r => r.ok ? r.json() : Promise.reject('Receipt not found'))
      .then(setReceipt)
      .catch(() => setError('Receipt not found or link has expired.'))
      .finally(() => setLoading(false))
  }, [txnId, receiptToken])

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'#07090F', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(237,240,247,0.4)', fontFamily:'Inter,sans-serif' }}>
      Loading receipt…
    </div>
  )

  if (error) return (
    <div style={{ minHeight:'100vh', background:'#07090F', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'12px', fontFamily:'Inter,sans-serif', padding:'20px' }}>
      <div style={{ fontSize:'32px' }}>∅</div>
      <div style={{ fontSize:'16px', fontWeight:600, color:'#EDF0F7' }}>Receipt not found</div>
      <div style={{ fontSize:'14px', color:'rgba(237,240,247,0.45)', textAlign:'center', maxWidth:'320px' }}>{error}</div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'#07090F', fontFamily:'Inter,sans-serif', padding:'32px 20px 80px' }}>
      <div style={{ maxWidth:'480px', margin:'0 auto' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'24px' }}>
          <div style={{ fontSize:'13px', color:'rgba(237,240,247,0.4)' }}>Receipt</div>
          <button onClick={() => window.print()}
            style={{ fontSize:'12px', fontWeight:600, padding:'7px 14px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'100px', color:'rgba(237,240,247,0.7)', cursor:'pointer' }}>
            Print / Save
          </button>
        </div>

        <div style={{ background:'#0D1120', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'16px', overflow:'hidden' }}>
          <div style={{ padding:'24px', borderBottom:'1px solid rgba(255,255,255,0.06)', textAlign:'center' }}>
            <div style={{ fontFamily:'"Space Grotesk",sans-serif', fontWeight:700, fontSize:'14px', color:'rgba(237,240,247,0.6)', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:'4px' }}>
              {receipt?.creator?.display_name || 'Konduyt'}
            </div>
            {receipt?.creator?.username && (
              <div style={{ fontSize:'12px', color:'rgba(237,240,247,0.3)' }}>@{receipt.creator.username}</div>
            )}
          </div>

          <div style={{ padding:'28px 24px', borderBottom:'1px solid rgba(255,255,255,0.06)', textAlign:'center' }}>
            <div style={{ fontFamily:'"Space Grotesk",sans-serif', fontWeight:700, fontSize:'36px', color:'#22C55E', marginBottom:'4px' }}>
              {receipt?.currency} {receipt?.amount?.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}
            </div>
            <div style={{ fontSize:'13px', color:'rgba(237,240,247,0.4)' }}>Payment confirmed</div>
          </div>

          <div style={{ padding:'20px 24px' }}>
            {[
              { label:'Receipt',      value: receipt?.receipt_id },
              { label:'Date',         value: receipt?.date ? new Date(receipt.date).toLocaleString() : '—' },
              { label:'Status',       value: 'Paid', color:'#22C55E' },
              { label:'Paid via',     value: receipt?.vendor, capitalize:true },
              { label:'Reference',    value: receipt?.vendor_reference || receipt?.transaction_id?.slice(0,16) + '…' },
              { label:'Customer',     value: receipt?.customer?.email || receipt?.customer?.phone || '—' },
            ].map(row => (
              <div key={row.label} style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ fontSize:'13px', color:'rgba(237,240,247,0.45)', minWidth:'110px' }}>{row.label}</span>
                <span style={{ fontSize:'13px', fontFamily:'monospace', color:row.color||'rgba(237,240,247,0.8)', textAlign:'right', textTransform:row.capitalize?'capitalize':undefined }}>{row.value}</span>
              </div>
            ))}
          </div>

          <div style={{ padding:'14px 24px', background:'rgba(255,255,255,0.02)', textAlign:'center', fontSize:'12px', color:'rgba(237,240,247,0.25)' }}>
            Payments by Konduyt · konduyt.dev
          </div>
        </div>

        {receipt?.creator?.username && (
          <div style={{ textAlign:'center', marginTop:'20px' }}>
            <Link href={`/@${receipt.creator.username}`} style={{ fontSize:'13px', color:'rgba(237,240,247,0.4)', textDecoration:'none' }}>
              ← Back to {receipt.creator.display_name}
            </Link>
          </div>
        )}
      </div>
      <style>{`@media print { button { display:none !important } body { background: white !important } }`}</style>
    </div>
  )
}
