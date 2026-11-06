'use client';

import { useEffect, useState } from 'react';

/** Current date and time, ticking every second (rendered after mount to avoid hydration mismatch). */
export function LiveClock({ style }: { style?: React.CSSProperties }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!now) return null;
  return (
    <p style={style}>
      {now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
      {' · '}
      {now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
    </p>
  );
}
