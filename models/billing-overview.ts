/**
 * MODEL — billing overview (the /billing hub).
 * Combines the invoice, payment and report endpoints into the one shape the page needs.
 */
import { api, paymentsApi, reportsApi } from '@/lib/api';
import type { Invoice, Payment } from '@/models';

export interface AgingBuckets {
  current: number;
  d1_30: number;
  d31_60: number;
  d61_90: number;
  d90plus: number;
}

export interface BillingOverview {
  days: number;
  sales: { total: number; count: number; paid: number };
  purchases: { total: number; count: number; paid: number };
  receivable: number;
  payable: number;
  overdue: number;
  buckets: AgingBuckets;
  recentInvoices: Invoice[];
  recentPayments: Payment[];
}

export const AGING_LABELS: Array<{ key: keyof AgingBuckets; label: string; color: string }> = [
  { key: 'current', label: 'Not due', color: '#34d399' },
  { key: 'd1_30', label: '1–30 days', color: '#fbbf24' },
  { key: 'd31_60', label: '31–60 days', color: '#fb923c' },
  { key: 'd61_90', label: '61–90 days', color: '#f87171' },
  { key: 'd90plus', label: '90+ days', color: '#ef4444' },
];

const isoDaysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

export const billingOverviewService = {
  async load(days: number): Promise<BillingOverview> {
    const from = isoDaysAgo(days - 1);
    const to = isoDaysAgo(0);

    const [sales, purchases, outstanding, invoices, payments] = await Promise.all([
      reportsApi.sales({ type: 'sale', from, to }),
      reportsApi.sales({ type: 'purchase', from, to }),
      reportsApi.outstanding(),
      api.get('/invoices', { params: { limit: 6 } }),
      paymentsApi.list({ limit: 6 }),
    ]);

    const buckets: AgingBuckets = outstanding.data.data.buckets;
    return {
      days,
      sales: sales.data.data.totals,
      purchases: purchases.data.data.totals,
      receivable: outstanding.data.data.totals.receivable,
      payable: outstanding.data.data.totals.payable,
      overdue: buckets.d1_30 + buckets.d31_60 + buckets.d61_90 + buckets.d90plus,
      buckets,
      recentInvoices: invoices.data.data ?? [],
      recentPayments: payments.data.data ?? [],
    };
  },
};
