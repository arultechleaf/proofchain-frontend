'use client';

import Link from 'next/link';
import { AlertTriangle, Boxes, Coins, Package } from 'lucide-react';
import { reportsApi } from '@/lib/api';
import type { Item } from '@/types';
import { formatMoney } from '@/lib/utils';
import {
  Column, DataTable, EmptyState, Grid, Notice, Page, PageHeader, StatCard, useAsync,
} from '@/components/ui';

interface StockReport {
  items: Item[];
  totals: { itemCount: number; stockValue: number; retailValue: number; lowStockCount: number };
}

export default function StockReportPage() {
  const { data, loading, error } = useAsync<StockReport>(async () => (await reportsApi.stock()).data.data, []);
  const t = data?.totals;
  const items = [...(data?.items ?? [])].sort((a, b) => b.stock * b.purchasePrice - a.stock * a.purchasePrice);
  const potential = (t?.retailValue ?? 0) - (t?.stockValue ?? 0);

  const columns: Column<Item>[] = [
    { header: 'Item', cell: (i) => <Link href={`/items/${i.id}`} style={{ color: '#60a5fa', textDecoration: 'none', fontWeight: 600 }}>{i.name}</Link> },
    { header: 'SKU', cell: (i) => i.sku || '—' },
    { header: 'In stock', align: 'right', cell: (i) => `${i.stock} ${i.unit}` },
    { header: 'Purchase price', align: 'right', cell: (i) => formatMoney(i.purchasePrice) },
    { header: 'Stock value', align: 'right', cell: (i) => <strong>{formatMoney(i.stock * i.purchasePrice)}</strong> },
    { header: 'Retail value', align: 'right', cell: (i) => formatMoney(i.stock * i.salePrice) },
    {
      header: 'Status',
      cell: (i) => i.stock <= 0
        ? <span className="badge badge-rejected">Out of stock</span>
        : i.stock <= i.lowStockLevel ? <span className="badge badge-pending">Low</span> : <span className="badge badge-approved">OK</span>,
    },
  ];

  return (
    <Page>
      <PageHeader title="Stock Report" subtitle="Inventory valuation, largest holdings first" />
      {error ? <Notice kind="error">Could not load the report.</Notice> : null}

      <Grid cols={4} style={{ marginBottom: 20 }}>
        <StatCard label="Active items" value={t?.itemCount ?? 0} color="#60a5fa" icon={Package} loading={loading} />
        <StatCard label="Stock value" value={formatMoney(t?.stockValue)} color="#34d399" icon={Coins} loading={loading} hint="At purchase price" />
        <StatCard label="Potential profit" value={formatMoney(potential)} color="#a78bfa" icon={Boxes} loading={loading} hint="Retail minus cost" />
        <StatCard label="Low stock" value={t?.lowStockCount ?? 0} color={t?.lowStockCount ? '#f87171' : '#34d399'} icon={AlertTriangle} loading={loading} />
      </Grid>

      <DataTable columns={columns} rows={items} loading={loading} rowKey={(i) => i.id}
        empty={<EmptyState icon={Package} title="No items yet" />} />
    </Page>
  );
}
