'use client';

/** CONTROLLER — billing overview: period selection, loading and permissions. */
import { useState } from 'react';
import { useAsync } from '@/controllers/useAsync';
import { useAuth } from '@/lib/auth';
import { canWrite } from '@/lib/roles';
import { billingOverviewService, type BillingOverview } from '@/models/billing-overview';

export const BILLING_PERIODS = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
];

export function useBillingOverviewController() {
  const { user } = useAuth();
  const [days, setDays] = useState(30);
  const { data, loading, error, reload } = useAsync<BillingOverview>(() => billingOverviewService.load(days), [days]);

  return { data, loading, error: !!error, days, setDays, reload, canCreate: canWrite(user?.role) };
}
