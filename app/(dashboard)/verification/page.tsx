'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Shield, Search, CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react';
import { deliveriesApi, verificationApi } from '@/lib/api';
import type { VerificationResult, Delivery } from '@/models';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui';

const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; border: string; label: string }> = {
  verified:  { icon: CheckCircle2, color: '#34d399', bg: 'rgba(5,150,105,0.12)',   border: 'rgba(16,185,129,0.3)',  label: 'VERIFIED' },
  mismatch:  { icon: XCircle,      color: '#f87171', bg: 'rgba(185,28,28,0.12)',   border: 'rgba(239,68,68,0.3)',   label: 'HASH MISMATCH' },
  not_found: { icon: AlertCircle,  color: '#fbbf24', bg: 'rgba(180,83,9,0.12)',    border: 'rgba(245,158,11,0.3)',  label: 'NOT FOUND' },
  pending:   { icon: Clock,        color: '#60a5fa', bg: 'rgba(37,99,235,0.12)',   border: 'rgba(59,130,246,0.3)',  label: 'PENDING' },
  error:     { icon: AlertCircle,  color: '#f87171', bg: 'rgba(185,28,28,0.12)',   border: 'rgba(239,68,68,0.3)',   label: 'ERROR' },
};

const card: React.CSSProperties = {
  background: 'rgba(8,15,30,0.85)', border: '1px solid rgba(59,130,246,0.12)',
  borderRadius: 14, padding: '20px 24px', marginBottom: 16,
};

export default function VerificationPage() {
  const [query, setQuery]         = useState('');
  const [searching, setSearching] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [delivery, setDelivery]   = useState<Delivery | null>(null);
  const [result, setResult]       = useState<VerificationResult | null>(null);
  const [error, setError]         = useState('');

  const searchDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true); setError(''); setDelivery(null); setResult(null);
    try {
      const res = await deliveriesApi.list({ search: query, limit: 1 });
      const found = res.data.data?.[0];
      if (found) setDelivery(found);
      else setError('No delivery found matching that reference or ID');
    } catch { setError('Search failed'); } finally { setSearching(false); }
  };

  const runVerification = async () => {
    if (!delivery) return;
    setVerifying(true); setResult(null);
    try {
      const res = await verificationApi.verify(delivery.id);
      setResult(res.data.data);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Verification failed');
    } finally { setVerifying(false); }
  };

  const sc = result ? (STATUS_CONFIG[result.status] ?? STATUS_CONFIG.error) : null;

  return (
    <div className="page" style={{ maxWidth: 780 }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#f1f5f9', margin: 0 }}>Verification</h1>
        <p style={{ color: '#475569', fontSize: 13, marginTop: 4 }}>Verify delivery proof integrity against blockchain records</p>
      </div>

      {/* Search card */}
      <div style={card}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600, color: '#cbd5e1', margin: '0 0 14px' }}>
          <Search size={15} color="#60a5fa" /> Find Delivery
        </h2>
        <form onSubmit={searchDelivery} style={{ display: 'flex', gap: 10 }}>
          <input
            className="form-input form-input-sm"
            placeholder="Delivery reference (e.g. DEL-2024-001) or ID..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <Button type="submit" icon={Search} loading={searching}>{searching ? 'Searching...' : 'Search'}</Button>
        </form>
        {error && (
          <p style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#f87171', fontSize: 13, marginTop: 10 }}>
            <AlertCircle size={14} /> {error}
          </p>
        )}
      </div>

      {/* Delivery found */}
      {delivery && (
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}>
            <div>
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#60a5fa', fontWeight: 700, margin: '0 0 4px' }}>
                {delivery.deliveryReference}
              </p>
              <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>{delivery.description}</p>
            </div>
            <Button icon={Shield} loading={verifying} onClick={runVerification}>{verifying ? 'Verifying...' : 'Verify Now'}</Button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              ['Sender',     delivery.senderCompany?.name   ?? '—'],
              ['Receiver',   delivery.receiverCompany?.name ?? '—'],
              ['Status',     delivery.status],
              ['Blockchain', delivery.blockchainStatus],
            ].map(([k, v]) => (
              <div key={k} style={{ background: 'rgba(15,23,42,0.6)', borderRadius: 8, padding: '10px 14px' }}>
                <p style={{ color: '#475569', fontSize: 11, margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k}</p>
                <p style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 500, margin: 0, textTransform: 'capitalize' }}>{v}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Verification result */}
      {result && sc && (
        <div style={{ ...card, background: sc.bg, border: `1px solid ${sc.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
            <sc.icon size={32} color={sc.color} />
            <div>
              <p style={{ fontSize: 20, fontWeight: 800, color: sc.color, margin: 0 }}>{sc.label}</p>
              <p style={{ color: '#64748b', fontSize: 12, margin: 0 }}>Verified at {formatDate(result.verifiedAt)} · <Link href={`/verification/${result.deliveryId}`} style={{ color: '#60a5fa' }}>Full report</Link></p>
            </div>
            {result.blockchainMode === 'demo' && (
              <span style={{ marginLeft: 'auto', padding: '3px 10px', borderRadius: 9999, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: '#fbbf24', fontSize: 11 }}>
                ⚠ Demo Mode
              </span>
            )}
          </div>

          {/* Hash match rows */}
          {[
            { label: 'Hash Match',     ok: result.hashMatch,     value: result.hashMatch ? '✓ Payload matches registered proof' : '✗ Hash mismatch detected' },
            { label: 'On-Chain Match', ok: result.blockchainMode === 'demo' || result.blockchainRecord?.onChainMatch, value: result.blockchainMode === 'demo' ? 'N/A (Demo Mode)' : result.blockchainRecord?.onChainMatch ? '✓ Confirmed on-chain' : '✗ Not found on chain' },
          ].map(r => (
            <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ color: '#94a3b8', fontSize: 13 }}>{r.label}</span>
              <span style={{ color: r.ok ? '#34d399' : '#f87171', fontSize: 13, fontWeight: 600 }}>{r.value}</span>
            </div>
          ))}

          {/* Hashes */}
          {result.expectedHash && (
            <div style={{ marginTop: 14 }}>
              <p style={{ color: '#64748b', fontSize: 11, marginBottom: 4, textTransform: 'uppercase' }}>Expected Hash</p>
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#60a5fa', wordBreak: 'break-all', margin: 0 }}>{result.expectedHash}</p>
            </div>
          )}
          {result.blockchainRecord?.transactionHash && (
            <div style={{ marginTop: 10 }}>
              <p style={{ color: '#64748b', fontSize: 11, marginBottom: 4, textTransform: 'uppercase' }}>Transaction Hash</p>
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#60a5fa', wordBreak: 'break-all', margin: 0 }}>{result.blockchainRecord.transactionHash}</p>
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div style={card}>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', margin: '0 0 14px' }}>Verification Status Guide</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => {
            const Icon = v.icon;
            return (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: v.bg, border: `1px solid ${v.border}`, borderRadius: 8 }}>
                <Icon size={16} color={v.color} />
                <span style={{ color: v.color, fontSize: 12, fontWeight: 600 }}>{v.label}</span>
              </div>
            );
          })}
        </div>
        <p style={{ color: '#334155', fontSize: 12, margin: 0, paddingTop: 12, borderTop: '1px solid rgba(30,41,59,0.8)', lineHeight: 1.6 }}>
          Note: Blockchain timestamps prove when a record was registered, not the physical truth of a delivery.
          A VERIFIED status means the payload hash matches the registered proof — it does not guarantee physical delivery occurred.
        </p>
      </div>
    </div>
  );
}
