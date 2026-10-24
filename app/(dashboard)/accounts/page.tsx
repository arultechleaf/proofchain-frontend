'use client';

import Link from 'next/link';
import { ArrowDownLeft, ArrowUpRight, Scale, Users } from 'lucide-react';
import { partiesApi } from '@/lib/api';
import type { Party, PartySummary } from '@/types';
import { formatMoney } from '@/lib/utils';
import {
  Column, DataTable, EmptyState, Grid, Notice, Page, PageHeader, StatCard, useAsync,
} from '@/components/ui';

type Row = PartySummary & { party: Party };
interface Accounts {
  rows: Row[];
  totals: { toReceive: number; toPay: number };
}

export default function AccountsPage() {
  const { data, loading, error } = useAsync<Accounts>(async () => (await partiesApi.accounts()).data.data, []);
  const rows = (data?.rows ?? []).filter((r) => r.balance !== 0 || r.totalSales > 0 || r.totalPurchases > 0);

  const columns: Column<Row>[] = [
    {
      header: 'Party',
      cell: (r) => <Link href={`/parties/${r.party.id}`} style={{ color: '#60a5fa', textDecoration: 'none', fontWeight: 600 }}>{r.party.name}</Link>,
    },
    { header: 'Sales', align: 'right', cell: (r) => formatMoney(r.totalSales) },
    { header: 'Received', align: 'right', cell: (r) => formatMoney(r.received) },
    { header: 'Purchases', align: 'right', cell: (r) => formatMoney(r.totalPurchases) },
    { header: 'Paid', align: 'right', cell: (r) => formatMoney(r.paid) },
    {
      header: 'Balance', align: 'right',
      cell: (r) => (
        <strong style={{ color: r.balance > 0 ? '#34d399' : r.balance < 0 ? '#f87171' : '#94a3b8' }}>
          {formatMoney(Math.abs(r.balance))}
          <span style={{ fontWeight: 500, fontSize: 11, marginLeft: 6 }}>
            {r.balance > 0 ? 'to receive' : r.balance < 0 ? 'to pay' : 'settled'}
          </span>
        </strong>
      ),
    },
  ];

  return (
    <Page>
      <PageHeader title="Accounts" subtitle="What each customer owes you and what you owe each supplier" />
      {error ? <Notice kind="error">Could not load accounts.</Notice> : null}

      <Grid cols={3} style={{ marginBottom: 20 }}>
        <StatCard label="To receive" value={formatMoney(data?.totals.toReceive)} color="#34d399" icon={ArrowDownLeft} loading={loading} />
        <StatCard label="To pay" value={formatMoney(data?.totals.toPay)} color="#f87171" icon={ArrowUpRight} loading={loading} />
        <StatCard label="Net position" value={formatMoney((data?.totals.toReceive ?? 0) - (data?.totals.toPay ?? 0))}
          color="#60a5fa" icon={Scale} loading={loading} hint="Receivable minus payable" />
      </Grid>

      <DataTable columns={columns} rows={rows} loading={loading} rowKey={(r) => r.party.id}
        empty={<EmptyState icon={Users} title="No account activity yet" />} />
    </Page>
  );
}
