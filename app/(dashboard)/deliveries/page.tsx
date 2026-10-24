'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, RefreshCw, Package, ChevronLeft, ChevronRight } from 'lucide-react';
import { deliveriesApi } from '@/lib/api';
import type { Delivery } from '@/types';
import { formatRelative, statusLabel } from '@/lib/utils';

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

const TH: React.CSSProperties = {
  textAlign: 'left', padding: '12px 16px',
  fontSize: 11, color: '#64748b', fontWeight: 600,
  textTransform: 'uppercase', letterSpacing: '0.06em',
  whiteSpace: 'nowrap', borderBottom: '1px solid rgba(59,130,246,0.1)',
  background: 'rgba(5,13,26,0.6)',
};

export default function DeliveriesPage() {
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

  const inputStyle: React.CSSProperties = {
    background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(51,65,85,0.6)',
    borderRadius: 8, color: '#e2e8f0', fontSize: 13, padding: '7px 12px',
    outline: 'none', width: '100%',
  };

  return (
    <div style={{ padding: '28px 32px', minHeight: '100%', color: '#e2e8f0' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#f1f5f9', margin: 0 }}>Deliveries</h1>
          <p style={{ color: '#475569', fontSize: 13, marginTop: 3 }}>{total} total records</p>
        </div>
        <Link href="/deliveries/create" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '9px 18px', borderRadius: 8,
          background: '#2563eb', color: '#fff', fontSize: 13, fontWeight: 600,
          textDecoration: 'none', boxShadow: '0 4px 12px rgba(37,99,235,0.3)',
        }}>
          <Plus size={15} /> New Delivery
        </Link>
      </div>

      {/* Filters – always single row */}
      <form onSubmit={handleSearch} style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto auto auto',
        gap: 10, marginBottom: 20, alignItems: 'center',
      }}>
        {/* Search input */}
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#475569', pointerEvents: 'none' }} />
          <input
            style={{ ...inputStyle, paddingLeft: 34, height: 38, width: '100%' }}
            placeholder="Search reference or description..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          style={{ ...inputStyle, width: 150, height: 38, cursor: 'pointer' }}
        >
          <option value="">All Statuses</option>
          {['pending', 'approved', 'rejected', 'draft'].map(s => (
            <option key={s} value={s}>{statusLabel(s)}</option>
          ))}
        </select>

        {/* Search button */}
        <button type="submit" style={{ height: 38, padding: '0 18px', background: 'rgba(37,99,235,0.2)', border: '1px solid rgba(59,130,246,0.4)', borderRadius: 8, color: '#60a5fa', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          Search
        </button>

        {/* Refresh */}
        <button type="button" onClick={fetchDeliveries} title="Refresh" style={{ width: 38, height: 38, background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(51,65,85,0.5)', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <RefreshCw size={14} color="#64748b" style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </form>


      {/* Table */}
      <div style={{ background: 'rgba(8,15,30,0.8)', border: '1px solid rgba(59,130,246,0.12)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['Reference', 'Description', 'Sender', 'Receiver', 'Qty', 'Status', 'Blockchain', 'Created'].map(h => (
                  <th key={h} style={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(30,41,59,0.5)' }}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} style={{ padding: '12px 16px' }}>
                        <div className="skeleton" style={{ height: 13, borderRadius: 4, width: j === 1 ? 160 : 80 }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : deliveries.length > 0 ? (
                deliveries.map((d) => (
                  <tr
                    key={d.id}
                    style={{ borderBottom: '1px solid rgba(30,41,59,0.5)', transition: 'background 0.12s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(30,41,59,0.4)'}
                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                  >
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', minWidth: 140 }}>
                      <Link href={`/deliveries/${d.id}`} style={{ color: '#60a5fa', textDecoration: 'none', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600 }}>
                        {d.deliveryReference}
                      </Link>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#cbd5e1', maxWidth: 200 }}>
                      <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.description}</span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: 12, whiteSpace: 'nowrap' }}>{d.senderCompany?.name ?? '—'}</td>
                    <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: 12, whiteSpace: 'nowrap' }}>{d.receiverCompany?.name ?? '—'}</td>
                    <td style={{ padding: '12px 16px', color: '#e2e8f0', textAlign: 'right', fontWeight: 600 }}>{d.quantity?.toLocaleString()}</td>
                    <td style={{ padding: '12px 16px' }}><Badge status={d.status} /></td>
                    <td style={{ padding: '12px 16px' }}><Badge status={d.blockchainStatus} /></td>
                    <td style={{ padding: '12px 16px', color: '#64748b', fontSize: 12, whiteSpace: 'nowrap' }}>{formatRelative(d.createdAt)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <Package size={40} color="#334155" style={{ margin: '0 auto 12px', display: 'block' }} />
                    <p style={{ color: '#475569', fontSize: 14, marginBottom: 12 }}>No deliveries found</p>
                    <Link href="/deliveries/create" style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '8px 16px', borderRadius: 8, background: '#2563eb',
                      color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none',
                    }}>
                      <Plus size={14} /> Create Delivery
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > limit && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: '1px solid rgba(59,130,246,0.08)' }}>
            <span style={{ color: '#64748b', fontSize: 12 }}>
              Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { label: '← Prev', action: () => setPage(p => Math.max(1, p - 1)), disabled: page === 1 },
                { label: 'Next →', action: () => setPage(p => p + 1), disabled: page * limit >= total },
              ].map(btn => (
                <button key={btn.label} onClick={btn.action} disabled={btn.disabled} style={{
                  padding: '6px 12px', borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: btn.disabled ? 'not-allowed' : 'pointer',
                  background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(51,65,85,0.6)', color: btn.disabled ? '#334155' : '#94a3b8',
                  opacity: btn.disabled ? 0.5 : 1,
                }}>
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
