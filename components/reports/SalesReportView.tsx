'use client';

import { useState } from 'react';
import { BarChart3, Coins, Percent, Receipt, Wallet } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { reportsApi } from '@/lib/api';
import { formatDay, formatMoney, todayIso } from '@/lib/utils';
import {
  Card, Column, DataTable, EmptyState, Field, Grid, Notice, Page, PageHeader, StatCard, useAsync,
} from '@/components/ui';

interface SalesReport {
  type: 'sale' | 'purchase';
  from: string;
  to: string;
  totals: { count: number; subtotal: number; tax: number; discount: number; total: number; paid: number; outstanding: number };
  daily: Array<{ date: string; total: number; count: number }>;
  topParties: Array<{ partyId: string; name: string; total: number; count: number }>;
  topItems: Array<{ description: string; quantity: number; amount: number }>;
}

const daysAgo = (n: number) => {
  const d = new Date(todayIso() + 'T00:00:00');
  d.setDate(d.getDate() - n);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

/** Sales or purchase report. `lockType` pins the report to one side and hides the toggle. */
export function SalesReportView({ lockType }: { lockType?: 'sale' | 'purchase' }) {
  const [type, setType] = useState<'sale' | 'purchase'>(lockType ?? 'sale');
  const [from, setFrom] = useState(daysAgo(29));
  const [to, setTo] = useState(todayIso());

  const { data, loading, error } = useAsync<SalesReport>(
    async () => (await reportsApi.sales({ type, from, to })).data.data,
    [type, from, to],
  );
  const word = type === 'sale' ? 'Sales' : 'Purchases';
  const accent = type === 'sale' ? '#60a5fa' : '#22d3ee';
  const t = data?.totals;

  const partyColumns: Column<SalesReport['topParties'][number]>[] = [
    { header: type === 'sale' ? 'Customer' : 'Supplier', cell: (p) => p.name },
    { header: 'Documents', align: 'right', cell: (p) => p.count },
    { header: 'Total', align: 'right', cell: (p) => <strong>{formatMoney(p.total)}</strong> },
  ];
  const itemColumns: Column<SalesReport['topItems'][number]>[] = [
    { header: 'Item', cell: (i) => i.description, nowrap: false },
    { header: 'Qty', align: 'right', cell: (i) => i.quantity },
    { header: 'Amount', align: 'right', cell: (i) => <strong>{formatMoney(i.amount)}</strong> },
  ];

  return (
    <Page>
      <PageHeader title={`${word} Report`} subtitle={data ? `${formatDay(data.from)} – ${formatDay(data.to)}` : undefined} />

      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          {!lockType && <div style={{ display: 'flex', gap: 4, background: 'rgba(15,23,42,0.7)', borderRadius: 10, padding: 3 }}>
            {([['sale', 'Sales'], ['purchase', 'Purchases']] as const).map(([k, label]) => (
              <button key={k} onClick={() => setType(k)} style={{
                padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, border: 0, cursor: 'pointer',
                background: type === k ? 'rgba(37,99,235,0.25)' : 'transparent', color: type === k ? '#60a5fa' : '#94a3b8',
              }}>{label}</button>
            ))}
          </div>}
          <Field label="From">
            <input type="date" className="form-input" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label="To">
            <input type="date" className="form-input" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
          </Field>
          {[['7 days', 6], ['30 days', 29], ['90 days', 89]].map(([label, n]) => (
            <button key={label as string} className="btn btn-secondary" onClick={() => { setFrom(daysAgo(n as number)); setTo(todayIso()); }}>
              Last {label}
            </button>
          ))}
        </div>
      </Card>

      {error ? <Notice kind="error">Could not load the report. Check the date range.</Notice> : null}

      <Grid cols={4} style={{ marginBottom: 20 }}>
        <StatCard label={`Total ${word.toLowerCase()}`} value={formatMoney(t?.total)} color={accent} icon={Coins} loading={loading}
          hint={`${t?.count ?? 0} documents`} />
        <StatCard label="Tax" value={formatMoney(t?.tax)} color="#a78bfa" icon={Percent} loading={loading} hint={`Discounts ${formatMoney(t?.discount)}`} />
        <StatCard label={type === 'sale' ? 'Received' : 'Paid'} value={formatMoney(t?.paid)} color="#34d399" icon={Wallet} loading={loading} />
        <StatCard label="Outstanding" value={formatMoney(t?.outstanding)} color="#fbbf24" icon={Receipt} loading={loading} />
      </Grid>

      <Card title={`Daily ${word.toLowerCase()}`} icon={BarChart3} style={{ marginBottom: 20 }}>
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer>
            <BarChart data={data?.daily ?? []} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="rgba(51,65,85,0.4)" vertical={false} />
              <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} stroke="#64748b" fontSize={11} tickLine={false} minTickGap={16} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} width={56}
                tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
              <Tooltip
                cursor={{ fill: 'rgba(59,130,246,0.08)' }}
                contentStyle={{ background: '#0b1426', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 8, fontSize: 12 }}
                labelFormatter={(d) => formatDay(String(d))}
                formatter={(v) => [formatMoney(Number(v)), word]}
              />
              <Bar dataKey="total" fill={accent} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Grid cols={2} gap={18}>
        <Card title={type === 'sale' ? 'Top customers' : 'Top suppliers'}>
          <DataTable columns={partyColumns} rows={data?.topParties ?? []} loading={loading} rowKey={(p) => p.partyId}
            empty={<EmptyState icon={BarChart3} title="No data in this range" />} />
        </Card>
        <Card title="Top items">
          <DataTable columns={itemColumns} rows={data?.topItems ?? []} loading={loading} rowKey={(i) => i.description}
            empty={<EmptyState icon={BarChart3} title="No data in this range" />} />
        </Card>
      </Grid>
    </Page>
  );
}
