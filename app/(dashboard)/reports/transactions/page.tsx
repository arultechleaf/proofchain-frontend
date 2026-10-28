'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowDownLeft, ArrowUpRight, History, Receipt, ShoppingCart } from 'lucide-react';
import { reportsApi } from '@/lib/api';
import type { TransactionKind, TransactionRow, TransactionsReport } from '@/models';
import { formatDay, formatMoney, todayIso } from '@/lib/utils';
import {
  Card, Column, DataTable, EmptyState, Field, Grid, Notice, Page, PageHeader, Pager, StatCard, StatusBadge, useAsync,
} from '@/components/ui';

const KINDS: Array<{ value: 'all' | TransactionKind; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'sale', label: 'Sales' },
  { value: 'purchase', label: 'Purchases' },
  { value: 'payment_in', label: 'Payments in' },
  { value: 'payment_out', label: 'Payments out' },
];

const KIND_STYLE: Record<TransactionKind, { label: string; color: string }> = {
  sale: { label: 'Sale', color: '#60a5fa' },
  purchase: { label: 'Purchase', color: '#22d3ee' },
  payment_in: { label: 'Payment in', color: '#34d399' },
  payment_out: { label: 'Payment out', color: '#f87171' },
};

const daysAgo = (n: number) => {
  const d = new Date(todayIso() + 'T00:00:00');
  d.setDate(d.getDate() - n);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

const LIMIT = 20;

export default function TransactionHistoryPage() {
  const [kind, setKind] = useState<'all' | TransactionKind>('all');
  const [from, setFrom] = useState(daysAgo(29));
  const [to, setTo] = useState(todayIso());
  const [page, setPage] = useState(1);

  const { data, loading, error } = useAsync<TransactionsReport>(
    async () => (await reportsApi.transactions({ kind, from, to, page, limit: LIMIT })).data.data,
    [kind, from, to, page],
  );

  const columns: Column<TransactionRow>[] = [
    { header: 'Date', cell: (r) => formatDay(r.date) },
    {
      header: 'Type',
      cell: (r) => <span style={{ color: KIND_STYLE[r.kind]?.color, fontWeight: 600 }}>{KIND_STYLE[r.kind]?.label ?? r.kind}</span>,
    },
    {
      header: 'Reference',
      cell: (r) => (
        <Link href={r.link} style={{ color: '#60a5fa', textDecoration: 'none', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600 }}>
          {r.reference}
        </Link>
      ),
    },
    { header: 'Party', cell: (r) => r.partyName },
    { header: 'Status', cell: (r) => (r.status === 'recorded' ? <span style={{ color: '#64748b' }}>—</span> : <StatusBadge status={r.status} />) },
    { header: 'Amount', align: 'right', cell: (r) => <strong>{formatMoney(r.amount)}</strong> },
  ];

  const change = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPage(1); };
  const t = data?.totals;

  return (
    <Page>
      <PageHeader title="Transaction History" subtitle={data ? `${formatDay(data.from)} – ${formatDay(data.to)} · ${data.total} entries` : undefined} />

      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <Field label="Type">
            <select className="form-input" value={kind} onChange={(e) => change(setKind)(e.target.value as 'all' | TransactionKind)}>
              {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
            </select>
          </Field>
          <Field label="From">
            <input type="date" className="form-input" value={from} max={to} onChange={(e) => change(setFrom)(e.target.value)} />
          </Field>
          <Field label="To">
            <input type="date" className="form-input" value={to} min={from} onChange={(e) => change(setTo)(e.target.value)} />
          </Field>
          {[['7 days', 6], ['30 days', 29], ['90 days', 89]].map(([label, n]) => (
            <button key={label as string} className="btn btn-secondary" onClick={() => { setFrom(daysAgo(n as number)); setTo(todayIso()); setPage(1); }}>
              Last {label}
            </button>
          ))}
        </div>
      </Card>

      {error ? <Notice kind="error">Could not load transactions. Check the date range.</Notice> : null}

      <Grid cols={4} style={{ marginBottom: 20 }}>
        <StatCard label="Sales" value={formatMoney(t?.sale)} color="#60a5fa" icon={Receipt} loading={loading} />
        <StatCard label="Purchases" value={formatMoney(t?.purchase)} color="#22d3ee" icon={ShoppingCart} loading={loading} />
        <StatCard label="Payments in" value={formatMoney(t?.paymentIn)} color="#34d399" icon={ArrowDownLeft} loading={loading} />
        <StatCard label="Payments out" value={formatMoney(t?.paymentOut)} color="#f87171" icon={ArrowUpRight} loading={loading} />
      </Grid>

      <DataTable
        columns={columns}
        rows={data?.rows ?? []}
        loading={loading}
        rowKey={(r) => `${r.kind}-${r.id}`}
        empty={<EmptyState icon={History} title="No transactions in this range" />}
        startIndex={(page - 1) * LIMIT}
        footer={<Pager page={page} total={data?.total ?? 0} limit={LIMIT} onPage={setPage} />}
      />
    </Page>
  );
}
