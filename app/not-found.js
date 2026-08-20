'use client';

import Link from 'next/link';
import Logo from './Logo';
import { useHomeHref } from './useHomeHref';

export default function NotFound() {
  const homeHref = useHomeHref();

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '24px',
        gap: '16px',
      }}
    >
      <Logo />
      <h1 style={{ fontSize: '72px', margin: 0, fontWeight: 800 }}>404</h1>
      <p style={{ fontSize: '18px', margin: 0, maxWidth: '440px' }}>
        This page does not exist. Maybe it never did. Maybe the link is old.
        Either way, it is not here.
      </p>
      <Link
        href={homeHref}
        style={{
          marginTop: '12px',
          padding: '12px 24px',
          borderRadius: '8px',
          background: '#0a0a0a',
          color: '#fff',
          textDecoration: 'none',
          fontWeight: 600,
        }}
      >
        Take me back
      </Link>
    </main>
  );
}
