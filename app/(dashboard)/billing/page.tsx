'use client';

/** VIEW — billing overview: money in and out, what is overdue, and the latest documents. */
import Link from 'next/link';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, Plus, Receipt, RefreshCw, ShoppingCart, Wallet } from 'lucide-react';
import type { Invoice, Payment } from '@/models';
import { formatDay, formatMoney } from '@/lib/utils';
import { Card, Column, DataTable, EmptyState, Grid, Notice, Page, PageHeader, StatCard, StatusBadge, Tabs, Button } from '@/components/ui';
import { BILLING_PERIODS, useBillingOverviewController } from '@/controllers/billing.controller';
import { AGING_LABELS } from '@/models/billing-overview';

const invoiceColumns: Column<Invoice>[] = [
  {
    header: 'Number',
    cell: (i) => (
      <Link href={`/${i.type === 'sale' ? 'sales' : 'purchases'}/${i.id}`}
        style={{ color: '#2dd4bf', textDecoration: 'none', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600 }}>
        {i.invoiceNumber}
      </Link>
    ),
  },
  { header: 'Party', nowrap: false, cell: (i) => i.party?.name ?? '—' },
  { header: 'Date', cell: (i) => formatDay(i.invoiceDate) },
  { header: 'Total', align: 'right', cell: (i) => formatMoney(i.total) },
  { header: 'Status', cell: (i) => <StatusBadge status={i.status} /> },
];

const paymentColumns: Column<Payment>[] = [
  { header: 'Date', cell: (p) => formatDay(p.paymentDate) },
  { header: 'Party', nowrap: false, cell: (p) => p.party?.name ?? '—' },
  {
    header: 'Direction',
    cell: (p) => <span style={{ color: p.direction === 'in' ? '#4ade80' : '#f87171' }}>{p.direction === 'in' ? 'Received' : 'Paid'}</span>,
  },
  { header: 'Method', cell: (p) => p.method },
  { header: 'Amount', align: 'right', cell: (p) => formatMoney(p.amount) },
];

export default function BillingPage() {
  const c = useBillingOverviewController();
  const d = c.data;
  const agingTotal = d ? Object.values(d.buckets).reduce((n, v) => n + v, 0) : 0;

  return (
    <Page>
      <PageHeader
        title="Billing"
        subtitle={`Overview of the last ${c.days} days`}
        actions={
          <>
            <Tabs value={c.days} onChange={c.setDays} options={BILLING_PERIODS.map((p) => ({ key: p.days, label: p.label }))} />
          </>
        }
      />

      {c.error ? <Notice kind="error">Could not load the billing overview.</Notice> : null}

      {c.canCreate && (
        <div className="page-header-actions" style={{ marginBottom: 20 }}>
          <Link href="/sales/create" className="btn btn-primary"><Plus size={15} /> New Sale</Link>
          <Link href="/purchases/create" className="btn btn-secondary"><Plus size={15} /> New Purchase</Link>
          <Link href="/payments/create" className="btn btn-secondary"><Wallet size={15} /> Record Payment</Link>
        </div>
      )}

      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <StatCard label="Sales" value={formatMoney(d?.sales.total)} color="#2dd4bf" icon={Receipt} loading={c.loading}
          hint={`${d?.sales.count ?? 0} invoices · received ${formatMoney(d?.sales.paid)}`} />
        <StatCard label="Purchases" value={formatMoney(d?.purchases.total)} color="#2dd4bf" icon={ShoppingCart} loading={c.loading}
          hint={`${d?.purchases.count ?? 0} bills · paid ${formatMoney(d?.purchases.paid)}`} />
        <StatCard label="To receive" value={formatMoney(d?.receivable)} color="#4ade80" icon={ArrowDownLeft} loading={c.loading} hint="Unpaid sales" />
        <StatCard label="To pay" value={formatMoney(d?.payable)} color="#f87171" icon={ArrowUpRight} loading={c.loading} hint="Unpaid purchases" />
        <StatCard label="Overdue" value={formatMoney(d?.overdue)} color={d?.overdue ? '#fbbf24' : '#4ade80'} icon={AlertTriangle} loading={c.loading}
          hint="Past due date" />
      </div>

      <Card title="Outstanding by age" icon={AlertTriangle} style={{ marginBottom: 24 }}>
        {agingTotal === 0 ? (
          <p style={{ color: '#6b8a96', fontSize: 13 }}>Nothing outstanding right now.</p>
        ) : (
          <>
            <div style={{ width: '100%', height: 130, marginBottom: 12 }}>
              <ResponsiveContainer>
                <AreaChart data={AGING_LABELS.map((b) => ({ label: b.label, amount: d?.buckets[b.key] ?? 0 }))} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="agingFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#14b8a6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="rgba(100, 138, 150,0.3)" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#6b8a96' }} />
                  <YAxis tickLine={false} axisLine={false} width={40} tickCount={3} tick={{ fontSize: 11, fill: '#6b8a96' }}
                    tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
                  <Tooltip
                    cursor={{ stroke: '#94b2bd', strokeWidth: 1 }}
                    formatter={(v) => [formatMoney(Number(v)), 'Outstanding']}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Area type="monotone" dataKey="amount" stroke="#14b8a6" strokeWidth={2} fill="url(#agingFill)"
                    dot={{ r: 3, fill: '#14b8a6', strokeWidth: 0 }} activeDot={{ r: 5, fill: '#14b8a6', stroke: '#fff', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <Grid cols="repeat(auto-fit, minmax(130px, 1fr))" gap={12}>
              {AGING_LABELS.map((b) => (
                <div key={b.key}>
                  <p style={{ fontSize: 11, color: '#6b8a96', margin: 0 }}>
                    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: b.color, marginRight: 6 }} />
                    {b.label}
                  </p>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#e0eef2', margin: '2px 0 0' }}>{formatMoney(d?.buckets[b.key])}</p>
                  <p style={{ fontSize: 11, color: '#6b8a96', margin: '2px 0 0' }}>{Math.round(((d?.buckets[b.key] ?? 0) / agingTotal) * 100)}% of total</p>
                </div>
              ))}
            </Grid>
          </>
        )}
        <p style={{ marginTop: 14, fontSize: 12 }}>
          <Link href="/reports/outstanding" className="auth-link">Open the outstanding report →</Link>
        </p>
      </Card>

      <Grid cols="repeat(auto-fit, minmax(min(100%, 540px), 1fr))" gap={20}>
        <Card title="Latest invoices & bills" icon={Receipt}
          action={<Link href="/reports/transactions" className="auth-link" style={{ fontSize: 12 }}>All transactions</Link>}>
          <DataTable bare compact columns={invoiceColumns} rows={d?.recentInvoices ?? []} loading={c.loading} skeletonRows={4}
            rowKey={(i) => i.id} empty={<EmptyState icon={Receipt} title="No invoices yet" />} />
        </Card>
        <Card title="Latest payments" icon={Wallet}
          action={<Link href="/payments" className="auth-link" style={{ fontSize: 12 }}>All payments</Link>}>
          <DataTable bare compact columns={paymentColumns} rows={d?.recentPayments ?? []} loading={c.loading} skeletonRows={4}
            rowKey={(p) => p.id} empty={<EmptyState icon={Wallet} title="No payments yet" />} />
        </Card>
      </Grid>
    </Page>
  );
}
