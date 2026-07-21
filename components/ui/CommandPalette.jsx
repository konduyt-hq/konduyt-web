'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

const STATIC_COMMANDS = [
  { icon:'◈', label:'Go to Overview',    group:'Navigate', action:null },
  { icon:'⇅', label:'Go to Payments',    group:'Navigate', action:null },
  { icon:'⊙', label:'Go to People',      group:'Navigate', action:null },
  { icon:'◎', label:'Go to Customers',   group:'Navigate', action:null },
  { icon:'∞', label:'Go to Connections', group:'Navigate', action:null },
  { icon:'§', label:'Go to Taxes',       group:'Navigate', action:null },
  { icon:'▦', label:'Go to Analytics',   group:'Navigate', action:null },
  { icon:'⌗', label:'Go to Developers',  group:'Navigate', action:null },
  { icon:'⚙', label:'Go to Settings',    group:'Navigate', action:null },
]

export default function CommandPalette({ orgId, projectId }) {
  const [open, setOpen]       = useState(false)
  const [query, setQuery]     = useState('')
  const [idx, setIdx]         = useState(0)
  const inputRef = useRef(null)
  const router   = useRouter()

  const base = '/dashboard/' + orgId + '/' + projectId

  const NAV_ITEMS = [
    { icon:'◈', label:'Overview',    href: base,               group:'Navigate' },
    { icon:'⇅', label:'Payments',    href: base + '/payments', group:'Navigate' },
    { icon:'⇢', label:'Smart Routing', href: base + '/routing',group:'Navigate' },
    { icon:'⊙', label:'People',      href: base + '/people',   group:'Navigate' },
    { icon:'◎', label:'Customers',   href: base + '/customers',group:'Navigate' },
    { icon:'∞', label:'Connections', href: base + '/connections',group:'Navigate' },
    { icon:'§', label:'Taxes',       href: base + '/taxes',    group:'Navigate' },
    { icon:'▦', label:'Analytics',   href: base + '/analytics',group:'Navigate' },
    { icon:'⌗', label:'Developers',  href: base + '/developers',group:'Navigate' },
    { icon:'⚙', label:'Settings',    href: base + '/settings', group:'Navigate' },
  ]

  const filtered = query
    ? NAV_ITEMS.filter(i => i.label.toLowerCase().includes(query.toLowerCase()))
    : NAV_ITEMS

  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault(); setOpen(o => !o); setQuery(''); setIdx(0)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  function handleKey(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIdx(i => Math.min(i+1, filtered.length-1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setIdx(i => Math.max(i-1, 0)) }
    if (e.key === 'Enter' && filtered[idx]) { router.push(filtered[idx].href); setOpen(false) }
  }

  function select(item) {
    router.push(item.href); setOpen(false)
  }

  if (!open) return null

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:1000, display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'80px 20px' }} onClick={()=>setOpen(false)}>
      <div style={{ width:'100%', maxWidth:'560px', background:'#0D1120', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'14px', overflow:'hidden', boxShadow:'0 32px 80px rgba(0,0,0,0.6)' }} onClick={e=>e.stopPropagation()}>

        {/* Search input */}
        <div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'14px 16px', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
          <span style={{ fontSize:'14px', color:'rgba(237,240,247,0.35)' }}>⌕</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e=>{ setQuery(e.target.value); setIdx(0) }}
            onKeyDown={handleKey}
            placeholder="Search pages, transactions, people..."
            style={{ flex:1, background:'none', border:'none', outline:'none', fontSize:'14px', color:'#EDF0F7' }}
          />
          <kbd style={{ fontSize:'11px', color:'rgba(237,240,247,0.3)', background:'rgba(255,255,255,0.06)', padding:'2px 6px', borderRadius:'4px' }}>ESC</kbd>
        </div>

        {/* Results */}
        <div style={{ maxHeight:'340px', overflowY:'auto', padding:'6px' }}>
          {filtered.length === 0 ? (
            <div style={{ padding:'24px', textAlign:'center', fontSize:'13px', color:'rgba(237,240,247,0.35)' }}>No results for "{query}"</div>
          ) : filtered.map((item, i) => (
            <button key={item.href} onClick={()=>select(item)} style={{ width:'100%', display:'flex', alignItems:'center', gap:'10px', padding:'9px 12px', borderRadius:'8px', border:'none', background: i===idx?'rgba(255,255,255,0.08)':'transparent', color: i===idx?'#EDF0F7':'rgba(237,240,247,0.65)', cursor:'pointer', textAlign:'left', transition:'background .1s', fontSize:'13px' }}>
              <span style={{ fontSize:'14px', width:'18px', textAlign:'center', flexShrink:0 }}>{item.icon}</span>
              <span style={{ flex:1 }}>{item.label}</span>
              <span style={{ fontSize:'11px', color:'rgba(237,240,247,0.25)' }}>{item.group}</span>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding:'8px 16px', borderTop:'1px solid rgba(255,255,255,0.07)', display:'flex', gap:'16px', fontSize:'11px', color:'rgba(237,240,247,0.25)' }}>
          <span><kbd style={{ background:'rgba(255,255,255,0.06)', padding:'1px 5px', borderRadius:'3px' }}>↑↓</kbd> navigate</span>
          <span><kbd style={{ background:'rgba(255,255,255,0.06)', padding:'1px 5px', borderRadius:'3px' }}>↵</kbd> open</span>
          <span><kbd style={{ background:'rgba(255,255,255,0.06)', padding:'1px 5px', borderRadius:'3px' }}>⌘K</kbd> toggle</span>
        </div>
      </div>
    </div>
  )
}
