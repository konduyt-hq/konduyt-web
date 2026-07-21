import styles from './Skeleton.module.css'

export function Skeleton({ width = '100%', height = '14px', radius = '4px', style = {} }) {
  return <div className={styles.skeleton} style={{ width, height, borderRadius: radius, ...style }} />
}

export function SkeletonText({ lines = 3, lastWidth = '60%' }) {
  return (
    <div style={{ display:'grid', gap:'8px' }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} width={i === lines - 1 ? lastWidth : '100%'} height="13px" />
      ))}
    </div>
  )
}

export function SkeletonCard({ height = '80px' }) {
  return (
    <div style={{ background:'#0D1120', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'10px', padding:'16px', height }}>
      <Skeleton width="40%" height="11px" style={{ marginBottom:'10px' }} />
      <Skeleton width="60%" height="22px" style={{ marginBottom:'8px' }} />
      <Skeleton width="30%" height="11px" />
    </div>
  )
}

export function SkeletonRow() {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'14px', padding:'11px 14px', borderBottom:'1px solid rgba(255,255,255,0.03)' }}>
      <Skeleton width="72px" height="12px" />
      <Skeleton width="90px" height="12px" />
      <Skeleton width="60px" height="12px" style={{ marginLeft:'auto' }} />
    </div>
  )
}
