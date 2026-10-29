'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowDownLeft, ArrowUpRight, Plus, Wallet } from 'lucide-react';
import { paymentsApi } from '@/lib/api';
import type { Payment } from '@/models';
import { useAuth } from '@/lib/auth';
import { apiError, formatDay, formatMoney } from '@/lib/utils';
import { Column, DataTable, EmptyState, Grid, Notice, Page, PageHeader, Pager, RowActions, StatCard, actionsColumn, canWrite, useAsync, Tabs } from '@/components/ui';

const TABS = [
  { key: '', label: 'All' },
  { key: 'in', label: 'Received' },
  { key: 'out', label: 'Paid' },
];

export default function PaymentsPage() {
  const { user } = useAuth();
  const [direction, setDirection] = useState('');
  const [page, setPage] = useState(1);
  const limit = 15;

  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const { data, loading, error, reload } = useAsync(
    async () => (await paymentsApi.list({ direction: direction || undefined, page, limit })).data,
    [direction, page],
  );
  const rows: Payment[] = data?.data ?? [];
  const total: number = data?.total ?? 0;

  const writable = canWrite(user?.role);
  const remove = async (p: Payment) => {
    setMessage(null);
    try {
      await paymentsApi.remove(p.id);
      setMessage({ kind: 'success', text: 'Payment deleted and taken off the invoice' });
      await reload();
    } catch (err) {
      setMessage({ kind: 'error', text: apiError(err, 'Could not delete the payment') });
    }
  };

  const columns: Column<Payment>[] = [
    { header: 'Date', cell: (p) => formatDay(p.paymentDate) },
    {
      header: 'Party',
      cell: (p) => <Link href={`/parties/${p.partyId}`} style={{ color: '#60a5fa', textDecoration: 'none', fontWeight: 600 }}>{p.party?.name ?? '—'}</Link>,
    },
    {
      header: 'Invoice',
      cell: (p) => p.invoice
        ? <Link href={`/${p.invoice.type === 'sale' ? 'sales' : 'purchases'}/${p.invoice.id}`} style={{ color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{p.invoice.invoiceNumber}</Link>
        : <span style={{ color: '#475569' }}>On account</span>,
    },
    { header: 'Method', cell: (p) => <span style={{ textTransform: 'capitalize' }}>{p.method}</span> },
    { header: 'Reference', cell: (p) => p.reference || '—' },
    {
      header: 'Amount', align: 'right',
      cell: (p) => (
        <strong style={{ color: p.direction === 'in' ? '#34d399' : '#f87171' }}>
          {p.direction === 'in' ? '+' : '−'}{formatMoney(p.amount)}
        </strong>
      ),
    },
    actionsColumn<Payment>((p) => (
      <RowActions
        view={`/parties/${p.partyId}`}
        remove={writable ? {
          confirm: `Delete this ${formatMoney(p.amount)} payment? ${p.invoice ? `${p.invoice.invoiceNumber} goes back to unpaid / part-paid.` : ''}`,
          onConfirm: () => remove(p),
          disabled: p.method === 'razorpay' ? 'Online payments cannot be deleted' : undefined,
        } : undefined}
      />
    ), 110),
  ];

  return (
    <Page>
      <PageHeader
        title="Payments"
        subtitle={`${total} payments`}
        actions={canWrite(user?.role) && <Link href="/payments/create" className="btn btn-primary"><Plus size={15} /> Record Payment</Link>}
      />

      <Grid cols={3} style={{ marginBottom: 20 }}>
        <StatCard label="Received" value={formatMoney(data?.totals?.received)} color="#34d399" icon={ArrowDownLeft} loading={loading && !data} />
        <StatCard label="Paid out" value={formatMoney(data?.totals?.paid)} color="#f87171" icon={ArrowUpRight} loading={loading && !data} />
        <StatCard label="Net cash flow" value={formatMoney((data?.totals?.received ?? 0) - (data?.totals?.paid ?? 0))} color="#60a5fa" icon={Wallet} loading={loading && !data} />
      </Grid>

      <div style={{ marginBottom: 16 }}>
        <Tabs value={direction} onChange={(k) => { setDirection(k); setPage(1); }} options={TABS} />
      </div>

      {error ? <Notice kind="error">Could not load payments.</Notice> : null}
      {message ? <Notice kind={message.kind}>{message.text}</Notice> : null}

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        rowKey={(p) => p.id}
        empty={<EmptyState icon={Wallet} title="No payments recorded" />}
        startIndex={(page - 1) * limit}
        footer={<Pager page={page} total={total} limit={limit} onPage={setPage} />}
      />
    </Page>
  );
}
