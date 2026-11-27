'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { subscriptionsApi } from '@/lib/api';
import { formatDay } from '@/lib/utils';
import type { MySubscription } from '@/models/subscription';

/** A strip above every page in the last days of a subscription (the same days the reminder notification is sent). */
export function SubscriptionBanner({ role }: { role?: string }) {
  const pathname = usePathname();
  const [sub, setSub] = useState<MySubscription | null>(null);

  useEffect(() => {
    if (!role || role === 'admin') return;
    let cancelled = false;
    subscriptionsApi.me()
      .then((res) => { if (!cancelled) setSub(res.data.data); })
      .catch(() => { /* the page itself reports problems */ });
    return () => { cancelled = true; };
  }, [role]);

  if (!sub?.expiringSoon || pathname === '/subscription') return null;
  return (
    <div className="subscription-banner" role="status">
      <CalendarClock size={16} />
      <span>
        Your {sub.current?.planName ?? ''} subscription ends on <strong>{formatDay(sub.endAt)}</strong>
        {' '}({sub.daysLeft} day{sub.daysLeft === 1 ? '' : 's'} left).
      </span>
      <Link href="/subscription" className="btn btn-primary btn-sm">Renew now</Link>
    </div>
  );
}
