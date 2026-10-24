'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Ban, CheckCircle2, Plus, ShieldCheck, XCircle } from 'lucide-react';
import { invoicesApi } from '@/lib/api';
import type { Invoice, InvoiceLine, InvoiceType, InvoiceVerification } from '@/types';
import { useAuth } from '@/lib/auth';
import { apiError, formatDay, formatMoney, truncateHash } from '@/lib/utils';
import {
  Card, Column, DataTable, Grid, KeyValue, Notice, Page, PageHeader, Spinner, StatusBadge, canWrite, useAsync,
} from '@/components/ui';
import { INVOICE_COPY } from './InvoiceList';
import { PayOnline } from './PayOnline';

export function InvoiceDetail({ type }: { type: InvoiceType }) {
  const copy = INVOICE_COPY[type];
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const writable = canWrite(user?.role);

  const [verifying, setVerifying] = useState(false);
  const [verification, setVerification] = useState<InvoiceVerification | null>(null);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const { data: invoice, loading, error, reload } = useAsync<Invoice>(async () => (await invoicesApi.get(id)).data.data, [id]);

  if (loading && !invoice) return <Page><Spinner /></Page>;
  if (error || !invoice) return <Page><Notice kind="error">Document not found.</Notice></Page>;

  const balance = invoice.status === 'cancelled' ? 0 : invoice.total - invoice.paidAmount;
  const canPay = writable && balance > 0;
  const tx = invoice.transaction;

  const verify = async () => {
    setVerifying(true);
    setMessage(null);
    try {
      setVerification((await invoicesApi.verify(id)).data.data);
    } catch (err) {
      setMessage({ kind: 'error', text: apiError(err, 'Verification failed') });
    } finally {
      setVerifying(false);
    }
  };

  const cancel = async () => {
    if (!window.confirm(`Cancel ${invoice.invoiceNumber}? Stock will be restored.`)) return;
    try {
      await invoicesApi.cancel(id);
      setMessage({ kind: 'success', text: 'Document cancelled' });
      await reload();
    } catch (err) {
      setMessage({ kind: 'error', text: apiError(err, 'Could not cancel') });
    }
  };

  const columns: Column<InvoiceLine>[] = [
    { header: '#', cell: (l) => l.position + 1, width: 40 },
    { header: 'Description', cell: (l) => l.description, nowrap: false },
    { header: 'Qty', align: 'right', cell: (l) => l.quantity },
    { header: 'Rate', align: 'right', cell: (l) => formatMoney(l.rate) },
    { header: 'Tax', align: 'right', cell: (l) => `${l.taxRate}%` },
    { header: 'Amount', align: 'right', cell: (l) => formatMoney(l.amount) },
  ];

  return (
    <Page>
      <PageHeader
        title={invoice.invoiceNumber}
        subtitle={<><StatusBadge status={invoice.status} /> &nbsp;{formatDay(invoice.invoiceDate)}</>}
        backHref={copy.base}
        actions={
          <>
            {canPay && (
              <Link href={`/payments/create?partyId=${invoice.partyId}&invoiceId=${invoice.id}`} className="btn btn-primary">
                <Plus size={15} /> Record Payment
              </Link>
            )}
            <button className="btn btn-secondary" onClick={verify} disabled={verifying}>
              <ShieldCheck size={15} /> {verifying ? 'Verifying...' : 'Verify on blockchain'}
            </button>
            {writable && invoice.status !== 'cancelled' && invoice.paidAmount === 0 && (
              <button className="btn btn-danger" onClick={cancel}><Ban size={15} /> Cancel</button>
            )}
          </>
        }
      />

      {message && <Notice kind={message.kind}>{message.text}</Notice>}
      {verification && <VerificationResult v={verification} />}

      <Grid cols="2fr 1fr" gap={18}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <DataTable columns={columns} rows={invoice.lines} rowKey={(l) => l.id} />
          {invoice.notes && <Card title="Notes"><p style={{ fontSize: 13, color: '#94a3b8', whiteSpace: 'pre-wrap' }}>{invoice.notes}</p></Card>}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Card title={copy.party}>
            <Link href={`/parties/${invoice.partyId}`} style={{ color: '#60a5fa', textDecoration: 'none', fontWeight: 600 }}>
              {invoice.party?.name ?? '—'}
            </Link>
            <KeyValue rows={[['Due date', formatDay(invoice.dueDate)]]} />
          </Card>

          <Card title="Amounts">
            <KeyValue rows={[
              ['Subtotal', formatMoney(invoice.subtotal)],
              ['Tax', formatMoney(invoice.taxTotal)],
              ['Discount', formatMoney(invoice.discount)],
              ['Total', <strong key="t">{formatMoney(invoice.total)}</strong>],
              [type === 'sale' ? 'Received' : 'Paid', formatMoney(invoice.paidAmount)],
              ['Balance due', <strong key="b" style={{ color: balance > 0 ? '#fbbf24' : '#34d399' }}>{formatMoney(balance)}</strong>],
            ]} />
          </Card>

          {type === 'sale' && canPay && <PayOnline invoice={invoice} balance={balance} onPaid={reload} />}

          <Card title="Blockchain proof" icon={ShieldCheck}>
            <KeyValue rows={[
              ['Status', <StatusBadge key="s" status={invoice.blockchainStatus} />],
              ['Block', tx?.blockNumber ?? '—'],
              ['Transaction', tx?.transactionHash
                ? <Link key="t" href={`/explorer/${tx.transactionHash}`} className="hash-display" style={{ fontSize: 12 }}>{truncateHash(tx.transactionHash, 10, 8)}</Link>
                : '—'],
            ]} />
            {invoice.payloadHash && (
              <div style={{ marginTop: 12 }}>
                <p style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>SHA-256 hash</p>
                <p className="hash-display" style={{ fontSize: 11, wordBreak: 'break-all' }}>{invoice.payloadHash}</p>
              </div>
            )}
          </Card>
        </div>
      </Grid>
    </Page>
  );
}

function VerificationResult({ v }: { v: InvoiceVerification }) {
  const ok = v.status === 'verified';
  const Icon = ok ? CheckCircle2 : XCircle;
  const color = ok ? '#34d399' : v.status === 'pending' ? '#fbbf24' : '#f87171';
  return (
    <div style={{
      display: 'flex', gap: 14, alignItems: 'flex-start', padding: '14px 18px', borderRadius: 12, marginBottom: 18,
      background: `${color}12`, border: `1px solid ${color}40`,
    }}>
      <Icon size={22} color={color} style={{ flexShrink: 0 }} />
      <div style={{ minWidth: 0 }}>
        <p style={{ fontWeight: 700, color, fontSize: 15, textTransform: 'uppercase' }}>{v.status.replace('_', ' ')}</p>
        <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 2 }}>
          {ok
            ? 'The document matches the hash registered on the blockchain. It has not been changed since it was issued.'
            : v.status === 'mismatch'
              ? 'The stored document no longer matches its registered hash — it may have been altered.'
              : 'No complete proof is available to verify against.'}
        </p>
        <p style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>
          Hash match: {v.hashMatch ? 'yes' : 'no'} · Mode: {v.blockchainMode}
          {v.blockchainMode === 'demo' && ' (simulated chain — hash comparison only)'}
        </p>
      </div>
    </div>
  );
}
