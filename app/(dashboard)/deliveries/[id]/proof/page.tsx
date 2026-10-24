'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Printer, ShieldCheck } from 'lucide-react';
import { approvalsApi, deliveriesApi } from '@/lib/api';
import type { Approval, Delivery, ProofRecord } from '@/types';
import { formatDate, truncateHash } from '@/lib/utils';
import { Card, Grid, KeyValue, Notice, Page, PageHeader, Spinner, StatusBadge, useAsync } from '@/components/ui';

interface Bundle {
  delivery: Delivery;
  proof: ProofRecord | null;
  approvals: Approval[];
}

export default function DeliveryProofPage() {
  const { id } = useParams<{ id: string }>();
  const { data, loading, error } = useAsync<Bundle>(async () => {
    const [d, p, a] = await Promise.all([deliveriesApi.get(id), deliveriesApi.getProof(id), approvalsApi.list(id)]);
    return { delivery: d.data.data, proof: p.data.data ?? null, approvals: a.data.data ?? [] };
  }, [id]);

  if (loading && !data) return <Page narrow><Spinner /></Page>;
  if (error || !data) return <Page narrow><Notice kind="error">Delivery not found.</Notice></Page>;

  const { delivery, proof, approvals } = data;
  const tx = proof?.blockchainTransaction;

  return (
    <Page narrow>
      <PageHeader
        title="Delivery Proof Certificate"
        subtitle={<span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{delivery.deliveryReference}</span>}
        backHref={`/deliveries/${id}`}
        actions={
          <>
            <Link href={`/verification/${id}`} className="btn btn-secondary"><ShieldCheck size={15} /> Verify now</Link>
            <button className="btn btn-primary" onClick={() => window.print()}><Printer size={15} /> Print</button>
          </>
        }
      />

      <Card title="Delivery">
        <KeyValue rows={[
          ['Reference', delivery.deliveryReference],
          ['From', delivery.senderCompany?.name ?? '—'],
          ['To', delivery.receiverCompany?.name ?? '—'],
          ['Description', delivery.description],
          ['Quantity', delivery.quantity.toLocaleString()],
          ['Status', <StatusBadge key="s" status={delivery.status} />],
          ['Created', formatDate(delivery.createdAt)],
        ]} />
      </Card>

      <Grid cols={2} style={{ marginTop: 18 }}>
        <Card title="Blockchain proof" icon={ShieldCheck}>
          {proof ? (
            <>
              <KeyValue rows={[
                ['Algorithm', proof.algorithm],
                ['Registration', <StatusBadge key="r" status={tx?.status ?? 'pending'} />],
                ['Verification', <StatusBadge key="v" status={proof.verificationStatus} />],
                ['Block', tx?.blockNumber ?? '—'],
                ['Transaction', tx?.transactionHash
                  ? <Link key="t" href={`/explorer/${tx.transactionHash}`} className="hash-display" style={{ fontSize: 12 }}>{truncateHash(tx.transactionHash, 10, 8)}</Link>
                  : '—'],
                ['Last verified', proof.verifiedAt ? formatDate(proof.verifiedAt) : 'Never'],
              ]} />
              <p style={{ fontSize: 11, color: '#64748b', margin: '12px 0 4px' }}>Payload hash</p>
              <p className="hash-display" style={{ fontSize: 11, wordBreak: 'break-all' }}>{proof.payloadHash}</p>
            </>
          ) : (
            <p style={{ fontSize: 13, color: '#64748b' }}>No proof has been registered for this delivery.</p>
          )}
        </Card>

        <Card title="Approvals">
          {approvals.length === 0 ? (
            <p style={{ fontSize: 13, color: '#64748b' }}>No decisions recorded yet.</p>
          ) : approvals.map((a) => (
            <div key={a.id} style={{ padding: '10px 0', borderBottom: '1px solid rgba(30,41,59,0.6)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <StatusBadge status={a.decision} />
                <span style={{ fontSize: 11, color: '#64748b' }}>{formatDate(a.createdAt)}</span>
              </div>
              <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>
                {a.reviewer?.name ?? 'Reviewer'}{a.comment ? ` — “${a.comment}”` : ''}
              </p>
            </div>
          ))}
        </Card>
      </Grid>
    </Page>
  );
}
