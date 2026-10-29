'use client';

import Link from 'next/link';
import { Lock } from 'lucide-react';
import { EmptyState } from '@/components/ui';

/** Shown instead of a page when the user's role has no access to that screen. */
export function AccessDenied({ screen }: { screen?: string }) {
  return (
    <div className="page">
      <EmptyState
        icon={Lock}
        title={screen ? `Your role does not have access to ${screen}` : 'Your role does not have access to this page'}
        action={<Link href="/dashboard" className="btn btn-secondary">Back to dashboard</Link>}
      />
    </div>
  );
}
