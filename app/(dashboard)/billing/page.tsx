'use client';

/** VIEW — billing overview: money in and out, what is overdue, and the latest documents. */
import Link from 'next/link';
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
        style={{ color: '#60a5fa', textDecoration: 'none', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600 }}>
        {i.invoiceNumber}
      </Link>
    ),
  },
  { header: 'Party', cell: (i) => i.party?.name ?? '—' },
  { header: 'Date', cell: (i) => formatDay(i.invoiceDate) },
  { header: 'Total', align: 'right', cell: (i) => formatMoney(i.total) },
  { header: 'Status', cell: (i) => <StatusBadge status={i.status} /> },
];

const paymentColumns: Column<Payment>[] = [
  { header: 'Date', cell: (p) => formatDay(p.paymentDate) },
  { header: 'Party', cell: (p) => p.party?.name ?? '—' },
  {
    header: 'Direction',
    cell: (p) => <span style={{ color: p.direction === 'in' ? '#34d399' : '#f87171' }}>{p.direction === 'in' ? 'Received' : 'Paid'}</span>,
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
            <Button variant="ghost" iconOnly icon={RefreshCw} iconSpin={c.loading} aria-label="Refresh" onClick={c.reload} />
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
        <StatCard label="Sales" value={formatMoney(d?.sales.total)} color="#60a5fa" icon={Receipt} loading={c.loading}
          hint={`${d?.sales.count ?? 0} invoices · received ${formatMoney(d?.sales.paid)}`} />
        <StatCard label="Purchases" value={formatMoney(d?.purchases.total)} color="#22d3ee" icon={ShoppingCart} loading={c.loading}
          hint={`${d?.purchases.count ?? 0} bills · paid ${formatMoney(d?.purchases.paid)}`} />
        <StatCard label="To receive" value={formatMoney(d?.receivable)} color="#34d399" icon={ArrowDownLeft} loading={c.loading} hint="Unpaid sales" />
        <StatCard label="To pay" value={formatMoney(d?.payable)} color="#f87171" icon={ArrowUpRight} loading={c.loading} hint="Unpaid purchases" />
        <StatCard label="Overdue" value={formatMoney(d?.overdue)} color={d?.overdue ? '#fbbf24' : '#34d399'} icon={AlertTriangle} loading={c.loading}
          hint="Past due date" />
      </div>

      <Card title="Outstanding by age" icon={AlertTriangle} style={{ marginBottom: 24 }}>
        {agingTotal === 0 ? (
          <p style={{ color: '#64748b', fontSize: 13 }}>Nothing outstanding right now.</p>
        ) : (
          <>
            <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', background: 'rgba(30,41,59,0.7)', marginBottom: 14 }}>
              {AGING_LABELS.map((b) => (
                <div key={b.key} title={`${b.label}: ${formatMoney(d?.buckets[b.key])}`}
                  style={{ width: `${((d?.buckets[b.key] ?? 0) / agingTotal) * 100}%`, background: b.color }} />
              ))}
            </div>
            <Grid cols="repeat(auto-fit, minmax(130px, 1fr))" gap={12}>
              {AGING_LABELS.map((b) => (
                <div key={b.key}>
                  <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>
                    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: b.color, marginRight: 6 }} />
                    {b.label}
                  </p>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0', margin: '2px 0 0' }}>{formatMoney(d?.buckets[b.key])}</p>
                </div>
              ))}
            </Grid>
          </>
        )}
        <p style={{ marginTop: 14, fontSize: 12 }}>
          <Link href="/reports/outstanding" className="auth-link">Open the outstanding report →</Link>
        </p>
      </Card>

      <Grid cols={2} gap={20}>
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
