'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// Konduyt wordmark that routes intelligently: signed-in users go to the
// dashboard, everyone else to the landing page. Avoids the "bounced to landing,
// click Go to console again" frustration.
export default function Logo({ className = '' }) {
  const [href, setHref] = useState('/');
  useEffect(() => {
    try {
      if (localStorage.getItem('kdu_token')) setHref('/dashboard/');
    } catch (e) {}
  }, []);
  return <Link href={href} className={className}>Konduyt</Link>;
}
