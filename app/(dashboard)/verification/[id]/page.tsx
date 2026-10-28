'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AlertCircle, CheckCircle2, Clock, RefreshCw, XCircle } from 'lucide-react';
import { verificationApi } from '@/lib/api';
import type { VerificationResult } from '@/models';
import { formatDate, truncateHash } from '@/lib/utils';
import { Card, Grid, KeyValue, Notice, Page, PageHeader, Spinner, useAsync } from '@/components/ui';

const STATUS: Record<string, { icon: React.ElementType; color: string; label: string; text: string }> = {
  verified: { icon: CheckCircle2, color: '#34d399', label: 'Verified', text: 'The delivery matches the proof registered on the blockchain. Nothing has changed since it was recorded.' },
  mismatch: { icon: XCircle, color: '#f87171', label: 'Hash mismatch', text: 'The delivery data no longer matches its registered proof. The record may have been altered.' },
  not_found: { icon: AlertCircle, color: '#fbbf24', label: 'Not found', text: 'No proof was found for this delivery, so there is nothing to compare against.' },
  pending: { icon: Clock, color: '#60a5fa', label: 'Pending', text: 'The on-chain check could not be completed yet. Try again shortly.' },
  error: { icon: AlertCircle, color: '#f87171', label: 'Error', text: 'The verification could not be completed.' },
};

export default function VerificationReportPage() {
  const { id } = useParams<{ id: string }>();
  const { data: result, loading, error, reload } = useAsync<VerificationResult>(
    async () => (await verificationApi.verify(id)).data.data,
    [id],
  );

  if (loading && !result) return <Page narrow><Spinner label="Verifying against the blockchain..." /></Page>;
  if (error || !result) return <Page narrow><Notice kind="error">Verification failed. The delivery may not exist.</Notice></Page>;

  const s = STATUS[result.status] ?? STATUS.error;
  const Icon = s.icon;
  const chain = result.blockchainRecord;

  return (
    <Page narrow>
      <PageHeader
        title="Verification Report"
        subtitle={<span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{result.deliveryReference}</span>}
        backHref="/verification"
        actions={
          <>
            <Link href={`/deliveries/${id}/proof`} className="btn btn-secondary">Proof certificate</Link>
            <button className="btn btn-primary" onClick={reload} disabled={loading}><RefreshCw size={15} /> Re-verify</button>
          </>
        }
      />

      <div style={{
        display: 'flex', gap: 16, alignItems: 'center', padding: '20px 22px', borderRadius: 16, marginBottom: 18,
        background: `${s.color}12`, border: `1px solid ${s.color}40`,
      }}>
        <Icon size={38} color={s.color} style={{ flexShrink: 0 }} />
        <div>
          <p style={{ fontSize: 20, fontWeight: 800, color: s.color, textTransform: 'uppercase' }}>{s.label}</p>
          <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>{s.text}</p>
        </div>
      </div>

      <Grid cols={2}>
        <Card title="Hash comparison">
          <KeyValue rows={[['Hashes match', result.hashMatch ? 'Yes' : 'No']]} />
          <p style={{ fontSize: 11, color: '#64748b', margin: '12px 0 4px' }}>Stored hash</p>
          <p className="hash-display" style={{ fontSize: 11, wordBreak: 'break-all' }}>{result.expectedHash ?? '—'}</p>
          <p style={{ fontSize: 11, color: '#64748b', margin: '12px 0 4px' }}>Recalculated hash</p>
          <p className="hash-display" style={{ fontSize: 11, wordBreak: 'break-all' }}>{result.calculatedHash ?? '—'}</p>
        </Card>

        <Card title="On-chain record">
          <KeyValue rows={[
            ['Mode', result.blockchainMode === 'demo' ? 'Demo (simulated)' : 'Live'],
            ['On-chain match', chain.onChainMatch ? 'Yes' : result.blockchainMode === 'demo' ? 'n/a in demo' : 'No'],
            ['Block', chain.blockNumber ?? '—'],
            ['Transaction', chain.transactionHash
              ? <Link key="t" href={`/explorer/${chain.transactionHash}`} className="hash-display" style={{ fontSize: 12 }}>{truncateHash(chain.transactionHash, 10, 8)}</Link>
              : '—'],
            ['Verified at', formatDate(result.verifiedAt)],
          ]} />
          {chain.error && result.blockchainMode !== 'demo' && <p style={{ fontSize: 12, color: '#fbbf24', marginTop: 10 }}>{chain.error}</p>}
        </Card>
      </Grid>
    </Page>
  );
}
