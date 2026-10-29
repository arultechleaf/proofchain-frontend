'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, XCircle, MessageSquare, Package, Building2, Hash, Calendar } from 'lucide-react';
import { SearchInput, Button } from '@/components/ui';
import { deliveriesApi, approvalsApi } from '@/lib/api';
import type { Delivery } from '@/models';
import { formatRelative, statusLabel } from '@/lib/utils';
import { useAuth } from '@/lib/auth';

const BC_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  pending:   { bg: 'rgba(245,158,11,0.1)',  color: '#fbbf24', border: 'rgba(245,158,11,0.25)' },
  confirmed: { bg: 'rgba(59,130,246,0.1)',  color: '#60a5fa', border: 'rgba(59,130,246,0.25)' },
  failed:    { bg: 'rgba(239,68,68,0.1)',   color: '#f87171', border: 'rgba(239,68,68,0.25)'  },
};

export default function ApprovalsPage() {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading]       = useState(true);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [comments, setComments]     = useState<Record<number, string>>({});

  useEffect(() => {
    deliveriesApi.list({ status: 'pending', limit: 50 })
      .then(r => setDeliveries(r.data.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleAction = async (deliveryId: number, decision: 'approved' | 'rejected') => {
    setApprovingId(deliveryId);
    try {
      await approvalsApi.create(deliveryId, { decision, comment: comments[deliveryId] });
      setDeliveries(prev => prev.filter(d => d.id !== deliveryId));
    } catch { } finally { setApprovingId(null); }
  };

  return (
    <div className="page" style={{ maxWidth: 900 }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#f1f5f9', margin: 0 }}>Approvals</h1>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton" style={{ height: 140, borderRadius: 14 }} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && deliveries.length === 0 && (
        <div style={{
          background: 'rgba(8,15,30,0.8)', border: '1px solid rgba(59,130,246,0.12)',
          borderRadius: 14, padding: '64px 32px', textAlign: 'center',
        }}>
          <CheckCircle2 size={48} color="#34d399" style={{ margin: '0 auto 12px', opacity: 0.5, display: 'block' }} />
          <p style={{ color: '#cbd5e1', fontWeight: 600, fontSize: 16, margin: 0 }}>All deliveries reviewed</p>
          <p style={{ color: '#475569', fontSize: 13, marginTop: 4 }}>No pending approvals at this time</p>
        </div>
      )}

      {/* Delivery cards */}
      {!loading && deliveries.map((d) => {
        const bcStyle = BC_STYLE[d.blockchainStatus?.toLowerCase()] ?? BC_STYLE.pending;
        const isBusy = approvingId === d.id;

        return (
          <div key={d.id} style={{
            background: 'rgba(8,15,30,0.8)',
            border: '1px solid rgba(59,130,246,0.12)',
            borderRadius: 14, marginBottom: 16, overflow: 'hidden',
          }}>
            {/* Card header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(59,130,246,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                {/* Left: title + meta */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Reference */}
                  <Link href={`/deliveries/${d.id}`} style={{
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 12,
                    color: '#60a5fa', textDecoration: 'none', fontWeight: 600,
                  }}>
                    {d.deliveryReference}
                  </Link>

                  {/* Description */}
                  <p style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 600, margin: '4px 0 10px' }}>
                    {d.description}
                  </p>

                  {/* Meta row – properly spaced */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#64748b', fontSize: 12 }}>
                      <Building2 size={12} color="#475569" />
                      From: <span style={{ color: '#94a3b8', marginLeft: 3 }}>{d.senderCompany?.name ?? '—'}</span>
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#64748b', fontSize: 12 }}>
                      <Package size={12} color="#475569" />
                      Qty: <span style={{ color: '#94a3b8', marginLeft: 3, fontWeight: 600 }}>{d.quantity?.toLocaleString()}</span>
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#64748b', fontSize: 12 }}>
                      <Calendar size={12} color="#475569" />
                      <span>{formatRelative(d.createdAt)}</span>
                    </span>
                  </div>
                </div>

                {/* Right: blockchain badge */}
                <span style={{
                  ...bcStyle, fontSize: 11, fontWeight: 600,
                  padding: '3px 10px', borderRadius: 9999,
                  border: `1px solid ${bcStyle.border}`,
                  whiteSpace: 'nowrap', flexShrink: 0,
                }}>
                  {statusLabel(d.blockchainStatus)}
                </span>
              </div>
            </div>

            {/* Card actions */}
            <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(5,13,26,0.4)' }}>
              {/* Comment input */}
              <SearchInput small icon={MessageSquare}
                  placeholder="Optional comment..."
                  value={comments[d.id] ?? ''}
                  onChange={e => setComments(prev => ({ ...prev, [d.id]: e.target.value }))}
                />

              {/* Approve */}
              <Button variant="success" icon={CheckCircle2} disabled={isBusy} onClick={() => handleAction(d.id, 'approved')}>Approve</Button>

              {/* Reject */}
              <Button variant="danger" icon={XCircle} disabled={isBusy} onClick={() => handleAction(d.id, 'rejected')}>Reject</Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
