'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Package, Plus } from 'lucide-react';
import { itemsApi } from '@/lib/api';
import type { Item } from '@/models';
import { useAuth } from '@/lib/auth';
import { apiError, formatMoney } from '@/lib/utils';
import {
  CheckField, Column, DataTable, EmptyState, Notice, Page, PageHeader, Pager, RowActions, SearchInput, actionsColumn, canWrite, useAsync,
} from '@/components/ui';

export default function ItemsPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 15;

  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const { data, loading, error, reload } = useAsync(
    async () => (await itemsApi.list({ search: query || undefined, lowStock: lowOnly || undefined, page, limit })).data,
    [query, lowOnly, page],
  );
  const rows: Item[] = data?.data ?? [];
  const total: number = data?.total ?? 0;

  const writable = canWrite(user?.role);
  const remove = async (item: Item) => {
    setMessage(null);
    try {
      await itemsApi.remove(item.id);
      setMessage({ kind: 'success', text: `"${item.name}" deleted` });
      await reload();
    } catch (err) {
      setMessage({ kind: 'error', text: apiError(err, 'Could not delete the item') });
    }
  };

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
    actionsColumn<Item>((i) => (
      <RowActions
        view={`/items/${i.id}`}
        edit={writable ? `/items/${i.id}` : undefined}
        remove={writable ? { confirm: `Delete "${i.name}"? Its stock history is removed too.`, onConfirm: () => remove(i) } : undefined}
      />
    )),
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
        <form onSubmit={(e) => { e.preventDefault(); setQuery(search); setPage(1); }} style={{ flex: 1, minWidth: 220, display: 'flex' }}>
          <SearchInput placeholder="Search name or SKU..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </form>
        <CheckField label="Low stock only" checked={lowOnly} onChange={(e) => { setLowOnly(e.target.checked); setPage(1); }} />
      </div>

      {error ? <Notice kind="error">Could not load items.</Notice> : null}
      {message ? <Notice kind={message.kind}>{message.text}</Notice> : null}

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        rowKey={(i) => i.id}
        empty={<EmptyState icon={Package} title="No items found" />}
        startIndex={(page - 1) * limit}
        footer={<Pager page={page} total={total} limit={limit} onPage={setPage} />}
      />
    </Page>
  );
}
