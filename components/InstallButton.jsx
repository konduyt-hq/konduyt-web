'use client'
import { useState, useEffect } from 'react'

export default function InstallButton() {
  const [prompt, setPrompt]       = useState(null)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setPrompt(e) }
    const installed = () => { setInstalled(true); setPrompt(null) }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', installed)
    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', installed)
    }
  }, [])

  if (!prompt || installed) return null

  return (
    <button
      onClick={async () => {
        prompt.prompt()
        const { outcome } = await prompt.userChoice
        if (outcome === 'accepted') setPrompt(null)
      }}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        fontSize: '13px', fontWeight: 600,
        color: 'var(--accent)', background: 'var(--accent-bg)',
        border: '1px solid var(--accent-border)',
        padding: '7px 14px', borderRadius: 'var(--radius-sm)',
        cursor: 'pointer', transition: 'background 0.15s',
        fontFamily: "'Inter', sans-serif",
      }}
      aria-label="Install Konduyt app"
    >
      ↓ Install app
    </button>
  )
}
