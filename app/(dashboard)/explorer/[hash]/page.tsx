'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Blocks, Copy } from 'lucide-react';
import { blockchainApi, invoicesApi } from '@/lib/api';
import type { BlockchainTransaction, Invoice } from '@/types';
import { copyToClipboard, formatDate } from '@/lib/utils';
import { Card, KeyValue, Notice, Page, PageHeader, Spinner, StatusBadge, useAsync } from '@/components/ui';

interface TxDetail {
  tx: BlockchainTransaction;
  invoice: Invoice | null;
}

export default function TransactionPage() {
  const { hash } = useParams<{ hash: string }>();
  const { data, loading, error } = useAsync<TxDetail>(async () => {
    const tx: BlockchainTransaction = (await blockchainApi.transaction(hash)).data.data;
    if (!tx) throw new Error('not found');
    let invoice: Invoice | null = null;
    if (tx.invoiceId) {
      try { invoice = (await invoicesApi.get(tx.invoiceId)).data.data; } catch { /* other company's invoice */ }
    }
    return { tx, invoice };
  }, [hash]);

  if (loading && !data) return <Page narrow><Spinner /></Page>;
  if (error || !data) {
    return (
      <Page narrow>
        <PageHeader title="Transaction" backHref="/explorer" />
        <Notice kind="error">No transaction with that hash was found.</Notice>
      </Page>
    );
  }

  const { tx, invoice } = data;
  const subject = tx.delivery
    ? <Link href={`/deliveries/${tx.delivery.id}`} style={{ color: '#60a5fa' }}>Delivery {tx.delivery.deliveryReference}</Link>
    : invoice
      ? <Link href={`/${invoice.type === 'sale' ? 'sales' : 'purchases'}/${invoice.id}`} style={{ color: '#60a5fa' }}>
          {invoice.type === 'sale' ? 'Invoice' : 'Bill'} {invoice.invoiceNumber}
        </Link>
      : '—';

  return (
    <Page narrow>
      <PageHeader title="Transaction" subtitle={tx.transactionType.replace(/_/g, ' ')} backHref="/explorer" />

      <Card title="Details" icon={Blocks}>
        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Transaction hash</p>
          <p className="hash-display" style={{ fontSize: 12, wordBreak: 'break-all' }}>
            {tx.transactionHash}{' '}
            <button aria-label="Copy hash" onClick={() => tx.transactionHash && copyToClipboard(tx.transactionHash)}
              style={{ background: 'none', border: 0, cursor: 'pointer', color: '#64748b', verticalAlign: 'middle' }}>
              <Copy size={13} />
            </button>
          </p>
        </div>
        <KeyValue rows={[
          ['Status', <StatusBadge key="s" status={tx.status} />],
          ['Registers', subject],
          ['Block number', tx.blockNumber ?? '—'],
          ['Contract', tx.contractAddress ? <span key="c" className="hash-display" style={{ fontSize: 11 }}>{tx.contractAddress}</span> : '—'],
          ['Gas used', tx.gasUsed ?? '—'],
          ['Retries', tx.retryCount],
          ['Submitted', formatDate(tx.createdAt)],
        ]} />
        {tx.errorMessage && (
          <p style={{ fontSize: 12, color: tx.errorMessage.startsWith('[DEMO]') ? '#fbbf24' : '#f87171', marginTop: 12 }}>{tx.errorMessage}</p>
        )}
      </Card>
    </Page>
  );
}
