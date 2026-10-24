'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Users } from 'lucide-react';
import { partiesApi } from '@/lib/api';
import type { Party } from '@/types';
import { useAuth } from '@/lib/auth';
import { formatMoney } from '@/lib/utils';
import {
  Column, DataTable, EmptyState, Notice, Page, PageHeader, Pager, StatusBadge, canWrite, useAsync,
} from '@/components/ui';

const TABS = [
  { key: '', label: 'All' },
  { key: 'customer', label: 'Customers' },
  { key: 'supplier', label: 'Suppliers' },
];

const TYPE_LABEL: Record<string, string> = { customer: 'Customer', supplier: 'Supplier', both: 'Customer & Supplier' };

export default function PartiesPage() {
  const { user } = useAuth();
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const limit = 15;

  const { data, loading, error } = useAsync(
    async () => (await partiesApi.list({ type: type || undefined, search: query || undefined, page, limit })).data,
    [type, query, page],
  );
  const rows: Party[] = data?.data ?? [];
  const total: number = data?.total ?? 0;

  const columns: Column<Party>[] = [
    {
      header: 'Name',
      cell: (p) => (
        <Link href={`/parties/${p.id}`} style={{ color: '#60a5fa', textDecoration: 'none', fontWeight: 600 }}>{p.name}</Link>
      ),
    },
    { header: 'Type', cell: (p) => TYPE_LABEL[p.partyType] ?? p.partyType },
    { header: 'Phone', cell: (p) => p.phone || '—' },
    { header: 'City', cell: (p) => p.city || '—' },
    { header: 'Opening balance', align: 'right', cell: (p) => formatMoney(p.openingBalance) },
    { header: 'Status', cell: (p) => <StatusBadge status={p.isActive ? 'active' : 'inactive'} /> },
  ];

  return (
    <Page>
      <PageHeader
        title="Customers & Suppliers"
        subtitle={`${total} parties`}
        actions={canWrite(user?.role) && (
          <Link href="/parties/create" className="btn btn-primary"><Plus size={15} /> New Party</Link>
        )}
      />

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 4, background: 'rgba(15,23,42,0.7)', borderRadius: 10, padding: 3 }}>
          {TABS.map((t) => (
            <button key={t.key} onClick={() => { setType(t.key); setPage(1); }} style={{
              padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, border: 0, cursor: 'pointer',
              background: type === t.key ? 'rgba(37,99,235,0.25)' : 'transparent',
              color: type === t.key ? '#60a5fa' : '#94a3b8',
            }}>{t.label}</button>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); setQuery(search); setPage(1); }} style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
          <input className="form-input" style={{ paddingLeft: 34 }} placeholder="Search name, phone or email..."
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </form>
      </div>

      {error ? <Notice kind="error">Could not load parties.</Notice> : null}

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        rowKey={(p) => p.id}
        empty={<EmptyState icon={Users} title="No parties found" />}
        footer={<Pager page={page} total={total} limit={limit} onPage={setPage} />}
      />
    </Page>
  );
}
