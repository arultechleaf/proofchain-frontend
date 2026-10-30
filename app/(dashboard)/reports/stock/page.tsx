'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Boxes, Coins, Package } from 'lucide-react';
import { reportsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { StockItem, StockSummary } from '@/models/inventory';
import { formatMoney } from '@/lib/utils';
import {
  Column, DataTable, EmptyState, Grid, Notice, Page, PageHeader, StatCard, useAsync,
} from '@/components/ui';

export default function StockReportPage() {
  const { user } = useAuth();
  const acrossCompanies = user?.role === 'admin' || user?.role === 'auditor';
  const [companyId, setCompanyId] = useState('');
  const [branchId, setBranchId] = useState('');

  const { data, loading, error } = useAsync<StockSummary>(
    async () => (await reportsApi.stock({ companyId: companyId || undefined, branchId: branchId || undefined })).data.data,
    [companyId, branchId],
  );
  const t = data?.totals;
  const branches = (data?.branches ?? []).filter((b) => !companyId || String(b.companyId) === companyId);
  const items = (data?.items ?? []).filter((i) => !companyId || String(i.companyId) === companyId)
    .sort((a, b) => b.stock * b.purchasePrice - a.stock * a.purchasePrice);
  const potential = (t?.retailValue ?? 0) - (t?.stockValue ?? 0);

  const columns: Column<StockItem>[] = [
    { header: 'Item', cell: (i) => <Link href={`/items/${i.id}`} style={{ color: '#60a5fa', textDecoration: 'none', fontWeight: 600 }}>{i.name}</Link> },
    ...(acrossCompanies ? [{ header: 'Company', cell: (i: StockItem) => i.companyName ?? '—' } as Column<StockItem>] : []),
    { header: 'SKU', cell: (i) => i.sku || '—' },
    { header: branchId ? 'At this branch' : 'In stock', align: 'right', cell: (i) => `${i.stock} ${i.unit}` },
    { header: 'Purchase price', align: 'right', cell: (i) => formatMoney(i.purchasePrice) },
    { header: 'Stock value', align: 'right', cell: (i) => <strong>{formatMoney(i.stock * i.purchasePrice)}</strong> },
    { header: 'Retail value', align: 'right', cell: (i) => formatMoney(i.stock * i.salePrice) },
    {
      header: 'Status',
      cell: (i) => i.stock <= 0
        ? <span className="badge badge-rejected">Out of stock</span>
        : i.lowStock ? <span className="badge badge-pending">Low{i.reorderQuantity ? ` · order ${i.reorderQuantity}` : ''}</span> : <span className="badge badge-approved">OK</span>,
    },
  ];

  return (
    <Page>
      <PageHeader title="Stock Report" />
      {error ? <Notice kind="error">Could not load the report.</Notice> : null}

      <div className="toolbar">
        {acrossCompanies && (
          <select className="form-input" style={{ width: 220 }} value={companyId} onChange={(e) => { setCompanyId(e.target.value); setBranchId(''); }} aria-label="Company">
            <option value="">All companies</option>
            {(data?.companies ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
        <select className="form-input" style={{ width: 220 }} value={branchId} onChange={(e) => setBranchId(e.target.value)} aria-label="Branch">
          <option value="">All branches / godowns</option>
          {branches.map((b) => <option key={b.id} value={b.id}>{b.name} ({b.code})</option>)}
        </select>
      </div>

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
