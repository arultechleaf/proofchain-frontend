'use client';

import Link from 'next/link';
import { AlertTriangle, Boxes, Coins, Package } from 'lucide-react';
import { itemsApi } from '@/lib/api';
import type { Item, StockMovement } from '@/models';
import { formatDate, formatMoney } from '@/lib/utils';
import {
  Card, Column, DataTable, EmptyState, Grid, Notice, Page, PageHeader, StatCard, useAsync,
} from '@/components/ui';

interface StockSummary {
  items: Item[];
  totals: { itemCount: number; stockValue: number; retailValue: number; lowStockCount: number };
}

const REASON_LABEL: Record<string, string> = {
  opening: 'Opening stock', sale: 'Sale', purchase: 'Purchase', adjustment: 'Adjustment', cancelled: 'Cancelled',
};

export default function InventoryPage() {
  const summary = useAsync<StockSummary>(async () => (await itemsApi.stockSummary()).data.data, []);
  const moves = useAsync<StockMovement[]>(async () => (await itemsApi.movements()).data.data, []);

  const totals = summary.data?.totals;
  const items = summary.data?.items ?? [];

  const stockColumns: Column<Item>[] = [
    { header: 'Item', cell: (i) => <Link href={`/items/${i.id}`} style={{ color: '#60a5fa', textDecoration: 'none', fontWeight: 600 }}>{i.name}</Link> },
    { header: 'SKU', cell: (i) => i.sku || '—' },
    {
      header: 'In stock', align: 'right',
      cell: (i) => <span style={{ fontWeight: 600, color: i.stock <= i.lowStockLevel ? '#f87171' : '#e2e8f0' }}>{i.stock} {i.unit}</span>,
    },
    { header: 'Alert at', align: 'right', cell: (i) => i.lowStockLevel },
    { header: 'Value', align: 'right', cell: (i) => formatMoney(i.stock * i.purchasePrice) },
    {
      header: 'Status',
      cell: (i) => i.stock <= 0
        ? <span className="badge badge-rejected">Out of stock</span>
        : i.stock <= i.lowStockLevel
          ? <span className="badge badge-pending">Low</span>
          : <span className="badge badge-approved">OK</span>,
    },
  ];

  const moveColumns: Column<StockMovement>[] = [
    { header: 'When', cell: (m) => formatDate(m.createdAt) },
    { header: 'Item', cell: (m) => m.item?.name ?? '—' },
    { header: 'Reason', cell: (m) => REASON_LABEL[m.reason] ?? m.reason },
    { header: 'Reference', cell: (m) => m.reference || '—' },
    {
      header: 'Change', align: 'right',
      cell: (m) => <span style={{ color: m.change < 0 ? '#f87171' : '#34d399', fontWeight: 600 }}>{m.change > 0 ? '+' : ''}{m.change}</span>,
    },
  ];

  return (
    <Page>
      <PageHeader title="Inventory" subtitle="Stock levels and recent movements" actions={<Link href="/items" className="btn btn-secondary">Manage items</Link>} />

      {summary.error ? <Notice kind="error">Could not load inventory.</Notice> : null}

      <Grid cols={4} style={{ marginBottom: 20 }}>
        <StatCard label="Active items" value={totals?.itemCount ?? 0} icon={Package} color="#60a5fa" loading={summary.loading} />
        <StatCard label="Stock value" value={formatMoney(totals?.stockValue)} icon={Coins} color="#34d399" hint="At purchase price" loading={summary.loading} />
        <StatCard label="Retail value" value={formatMoney(totals?.retailValue)} icon={Boxes} color="#a78bfa" hint="At sale price" loading={summary.loading} />
        <StatCard label="Low stock" value={totals?.lowStockCount ?? 0} icon={AlertTriangle}
          color={totals?.lowStockCount ? '#f87171' : '#34d399'} loading={summary.loading} />
      </Grid>

      <Card title="Stock levels" icon={Boxes} style={{ marginBottom: 20 }}>
        <DataTable columns={stockColumns} rows={items} loading={summary.loading} rowKey={(i) => i.id}
          empty={<EmptyState icon={Package} title="No items yet" />} />
      </Card>

      <Card title="Recent movements">
        <DataTable columns={moveColumns} rows={moves.data ?? []} loading={moves.loading} rowKey={(m) => m.id}
          empty={<EmptyState icon={Boxes} title="No movements yet" />} />
      </Card>
    </Page>
  );
}
