'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Package, Plus, Search } from 'lucide-react';
import { itemsApi } from '@/lib/api';
import type { Item } from '@/types';
import { useAuth } from '@/lib/auth';
import { formatMoney } from '@/lib/utils';
import {
  Column, DataTable, EmptyState, Notice, Page, PageHeader, Pager, canWrite, useAsync,
} from '@/components/ui';

export default function ItemsPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 15;

  const { data, loading, error } = useAsync(
    async () => (await itemsApi.list({ search: query || undefined, lowStock: lowOnly || undefined, page, limit })).data,
    [query, lowOnly, page],
  );
  const rows: Item[] = data?.data ?? [];
  const total: number = data?.total ?? 0;

  const columns: Column<Item>[] = [
    {
      header: 'Item',
      cell: (i) => <Link href={`/items/${i.id}`} style={{ color: '#60a5fa', textDecoration: 'none', fontWeight: 600 }}>{i.name}</Link>,
    },
    { header: 'SKU', cell: (i) => i.sku || '—' },
    { header: 'Sale price', align: 'right', cell: (i) => formatMoney(i.salePrice) },
    { header: 'Purchase price', align: 'right', cell: (i) => formatMoney(i.purchasePrice) },
    { header: 'Tax', align: 'right', cell: (i) => `${i.taxRate}%` },
    {
      header: 'In stock',
      align: 'right',
      cell: (i) => {
        const low = i.stock <= i.lowStockLevel;
        return <span style={{ color: low ? '#f87171' : '#e2e8f0', fontWeight: 600 }}>{i.stock} {i.unit}{low && ' ⚠'}</span>;
      },
    },
  ];

  return (
    <Page>
      <PageHeader
        title="Items"
        subtitle={`${total} items`}
        actions={
          <>
            <Link href="/inventory" className="btn btn-secondary">Inventory</Link>
            {canWrite(user?.role) && <Link href="/items/create" className="btn btn-primary"><Plus size={15} /> New Item</Link>}
          </>
        }
      />

      <div style={{ display: 'flex', gap: 14, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <form onSubmit={(e) => { e.preventDefault(); setQuery(search); setPage(1); }} style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
          <input className="form-input" style={{ paddingLeft: 34 }} placeholder="Search name or SKU..."
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </form>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: '#94a3b8', cursor: 'pointer' }}>
          <input type="checkbox" checked={lowOnly} onChange={(e) => { setLowOnly(e.target.checked); setPage(1); }} />
          Low stock only
        </label>
      </div>

      {error ? <Notice kind="error">Could not load items.</Notice> : null}

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        rowKey={(i) => i.id}
        empty={<EmptyState icon={Package} title="No items found" />}
        footer={<Pager page={page} total={total} limit={limit} onPage={setPage} />}
      />
    </Page>
  );
}
