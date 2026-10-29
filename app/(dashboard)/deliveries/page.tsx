'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, RefreshCw, Package } from 'lucide-react';
import { deliveriesApi } from '@/lib/api';
import type { Delivery } from '@/models';
import { formatRelative, statusLabel } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { canUse } from '@/lib/roles';
import { Column, DataTable, EmptyState, Pager, RowActions, SearchInput, actionsColumn, Button } from '@/components/ui';

const STATUS_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  pending:   { bg: 'rgba(245,158,11,0.1)',  color: '#fbbf24', border: 'rgba(245,158,11,0.25)'  },
  approved:  { bg: 'rgba(16,185,129,0.1)',  color: '#34d399', border: 'rgba(16,185,129,0.25)'  },
  rejected:  { bg: 'rgba(239,68,68,0.1)',   color: '#f87171', border: 'rgba(239,68,68,0.25)'   },
  confirmed: { bg: 'rgba(59,130,246,0.1)',  color: '#60a5fa', border: 'rgba(59,130,246,0.25)'  },
  draft:     { bg: 'rgba(100,116,139,0.1)', color: '#94a3b8', border: 'rgba(100,116,139,0.25)' },
};

function Badge({ status }: { status: string }) {
  const s = STATUS_STYLE[status?.toLowerCase()] ?? STATUS_STYLE.draft;
  return (
    <span style={{ ...s, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 9999, border: `1px solid ${s.border}`, textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
      {statusLabel(status)}
    </span>
  );
}

const columns: Column<Delivery>[] = [
  {
    header: 'Reference',
    cell: (d) => (
      <Link href={`/deliveries/${d.id}`} style={{ color: '#60a5fa', textDecoration: 'none', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600 }}>
        {d.deliveryReference}
      </Link>
    ),
  },
  {
    header: 'Description',
    cell: (d) => (
      <span style={{ display: 'block', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.description}</span>
    ),
  },
  { header: 'Sender', cell: (d) => <span style={{ color: '#94a3b8', fontSize: 12 }}>{d.senderCompany?.name ?? '—'}</span> },
  { header: 'Receiver', cell: (d) => <span style={{ color: '#94a3b8', fontSize: 12 }}>{d.receiverCompany?.name ?? '—'}</span> },
  { header: 'Qty', align: 'right', cell: (d) => <strong style={{ color: '#e2e8f0' }}>{d.quantity?.toLocaleString()}</strong> },
  { header: 'Status', cell: (d) => <Badge status={d.status} /> },
  { header: 'Blockchain', cell: (d) => <Badge status={d.blockchainStatus} /> },
  { header: 'Created', cell: (d) => <span style={{ color: '#64748b', fontSize: 12 }}>{formatRelative(d.createdAt)}</span> },
  // Deliveries are proven on the blockchain, so they are view-only: no edit or delete.
  actionsColumn<Delivery>((d) => <RowActions view={`/deliveries/${d.id}`} />, 80),
];

export default function DeliveriesPage() {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const limit = 10;

  const fetchDeliveries = async () => {
    setLoading(true);
    try {
      const res = await deliveriesApi.list({ page, limit, search: search || undefined, status: statusFilter || undefined });
      setDeliveries(res.data.data ?? []);
      setTotal(res.data.total ?? 0);
    } catch { setDeliveries([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchDeliveries(); }, [page, statusFilter]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); fetchDeliveries(); };

  return (
    <div className="page">

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#f1f5f9', margin: 0 }}>Deliveries</h1>
        </div>
        {canUse('deliveries_create', user?.role) && <Link href="/deliveries/create" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '9px 18px', borderRadius: 8,
          background: '#2563eb', color: '#fff', fontSize: 13, fontWeight: 600,
          textDecoration: 'none', boxShadow: '0 4px 12px rgba(37,99,235,0.3)',
        }}>
          <Plus size={15} /> New Delivery
        </Link>}
      </div>

      {/* Filters – always single row */}
      <form onSubmit={handleSearch} style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto auto auto',
        gap: 10, marginBottom: 20, alignItems: 'center',
      }}>
        {/* Search input */}
        <SearchInput
            small placeholder="Search reference or description..." value={search} onChange={e => setSearch(e.target.value)} />

        {/* Status filter */}
        <select
          className="form-input form-input-sm" style={{ width: 150 }}
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Statuses</option>
          {['pending', 'approved', 'rejected', 'draft'].map(s => (
            <option key={s} value={s}>{statusLabel(s)}</option>
          ))}
        </select>

        {/* Search button */}
        <Button type="submit">Search</Button>

        {/* Refresh */}
        <Button variant="secondary" iconOnly icon={RefreshCw} iconSpin={loading} aria-label="Refresh" title="Refresh" onClick={fetchDeliveries} />
      </form>


      <DataTable
        columns={columns}
        rows={deliveries}
        loading={loading}
        rowKey={(d) => d.id}
        empty={
          <EmptyState icon={Package} title="No deliveries found" action={
            <Link href="/deliveries/create" className="btn btn-primary"><Plus size={14} /> Create Delivery</Link>
          } />
        }
        startIndex={(page - 1) * limit}
        footer={<Pager page={page} total={total} limit={limit} onPage={setPage} />}
      />
    </div>
  );
}
