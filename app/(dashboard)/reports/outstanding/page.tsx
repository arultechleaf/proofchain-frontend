'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowDownLeft, ArrowUpRight, Clock } from 'lucide-react';
import { reportsApi } from '@/lib/api';
import { formatDay, formatMoney } from '@/lib/utils';
import { Column, DataTable, EmptyState, Grid, Notice, Page, PageHeader, StatCard, useAsync, Tabs } from '@/components/ui';

interface OutstandingRow {
  id: string;
  type: 'sale' | 'purchase';
  invoiceNumber: string;
  partyName: string;
  invoiceDate: string;
  dueDate: string | null;
  total: number;
  paidAmount: number;
  balanceDue: number;
  daysOverdue: number;
}

interface Outstanding {
  rows: OutstandingRow[];
  buckets: { current: number; d1_30: number; d31_60: number; d61_90: number; d90plus: number };
  totals: { receivable: number; payable: number };
}

const BUCKETS: Array<[keyof Outstanding['buckets'], string, string]> = [
  ['current', 'Not yet due', '#34d399'],
  ['d1_30', '1–30 days', '#fbbf24'],
  ['d31_60', '31–60 days', '#fb923c'],
  ['d61_90', '61–90 days', '#f87171'],
  ['d90plus', '90+ days', '#ef4444'],
];

export default function OutstandingReportPage() {
  const [type, setType] = useState<'' | 'sale' | 'purchase'>('');
  const { data, loading, error } = useAsync<Outstanding>(
    async () => (await reportsApi.outstanding({ type: type || undefined })).data.data,
    [type],
  );

  const columns: Column<OutstandingRow>[] = [
    {
      header: 'Number',
      cell: (r) => (
        <Link href={`/${r.type === 'sale' ? 'sales' : 'purchases'}/${r.id}`}
          style={{ color: '#60a5fa', textDecoration: 'none', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600 }}>
          {r.invoiceNumber}
        </Link>
      ),
    },
    { header: 'Type', cell: (r) => (r.type === 'sale' ? 'Receivable' : 'Payable') },
    { header: 'Party', cell: (r) => r.partyName },
    { header: 'Due', cell: (r) => formatDay(r.dueDate ?? r.invoiceDate) },
    {
      header: 'Overdue', align: 'right',
      cell: (r) => r.daysOverdue > 0 ? <span style={{ color: '#f87171' }}>{r.daysOverdue} days</span> : <span style={{ color: '#34d399' }}>On time</span>,
    },
    { header: 'Total', align: 'right', cell: (r) => formatMoney(r.total) },
    { header: 'Balance due', align: 'right', cell: (r) => <strong>{formatMoney(r.balanceDue)}</strong> },
  ];

  return (
    <Page>
      <PageHeader title="Outstanding" subtitle="Unpaid invoices and bills, aged from the due date" />

      <div style={{ marginBottom: 18 }}>
        <Tabs value={type} onChange={setType} options={[{ key: '', label: 'All' }, { key: 'sale', label: 'Receivable' }, { key: 'purchase', label: 'Payable' }] as const} />
      </div>

      {error ? <Notice kind="error">Could not load the report.</Notice> : null}

      <Grid cols={2} style={{ marginBottom: 18 }}>
        <StatCard label="Receivable" value={formatMoney(data?.totals.receivable)} color="#34d399" icon={ArrowDownLeft} loading={loading} hint="Customers owe you" />
        <StatCard label="Payable" value={formatMoney(data?.totals.payable)} color="#f87171" icon={ArrowUpRight} loading={loading} hint="You owe suppliers" />
      </Grid>

      <Grid cols={5} gap={12} style={{ marginBottom: 20 }}>
        {BUCKETS.map(([key, label, color]) => (
          <StatCard key={key} label={label} value={formatMoney(data?.buckets[key])} color={color} icon={Clock} loading={loading} />
        ))}
      </Grid>

      <DataTable columns={columns} rows={data?.rows ?? []} loading={loading} rowKey={(r) => r.id}
        empty={<EmptyState icon={Clock} title="Nothing outstanding — all settled" />} />
    </Page>
  );
}
