'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FileText, Plus, Search } from 'lucide-react';
import { invoicesApi } from '@/lib/api';
import type { Invoice, InvoiceType } from '@/models';
import { useAuth } from '@/lib/auth';
import { apiError, formatDay, formatMoney } from '@/lib/utils';
import {
  Column, DataTable, EmptyState, Notice, Page, PageHeader, Pager, RowActions, StatusBadge, actionsColumn, canUse, canWrite, useAsync,
} from '@/components/ui';

export const INVOICE_COPY: Record<InvoiceType, { base: string; title: string; noun: string; newLabel: string; party: string }> = {
  sale: { base: '/sales', title: 'Sales Invoices', noun: 'invoices', newLabel: 'New Sale', party: 'Customer' },
  purchase: { base: '/purchases', title: 'Purchase Bills', noun: 'bills', newLabel: 'New Purchase', party: 'Supplier' },
};

export function InvoiceList({ type }: { type: InvoiceType }) {
  const copy = INVOICE_COPY[type];
  const { user } = useAuth();
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const limit = 15;

  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const { data, loading, error, reload } = useAsync(
    async () => (await invoicesApi.list(type, { status: status || undefined, search: query || undefined, page, limit })).data,
    [type, status, query, page],
  );
  const rows: Invoice[] = data?.data ?? [];
  const total: number = data?.total ?? 0;

  const writable = canWrite(user?.role);
  const cancel = async (i: Invoice) => {
    setMessage(null);
    try {
      await invoicesApi.cancel(i.id);
      setMessage({ kind: 'success', text: `${i.invoiceNumber} cancelled` });
      await reload();
    } catch (err) {
      setMessage({ kind: 'error', text: apiError(err, 'Could not cancel') });
    }
  };

  const columns: Column<Invoice>[] = [
    {
      header: 'Number',
      cell: (i) => (
        <Link href={`${copy.base}/${i.id}`} style={{ color: '#60a5fa', textDecoration: 'none', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600 }}>
          {i.invoiceNumber}
        </Link>
      ),
    },
    { header: copy.party, cell: (i) => i.party?.name ?? '—' },
    { header: 'Date', cell: (i) => formatDay(i.invoiceDate) },
    { header: 'Due', cell: (i) => formatDay(i.dueDate) },
    { header: 'Total', align: 'right', cell: (i) => <strong>{formatMoney(i.total)}</strong> },
    { header: 'Balance', align: 'right', cell: (i) => formatMoney(i.status === 'cancelled' ? 0 : i.total - i.paidAmount) },
    { header: 'Status', cell: (i) => <StatusBadge status={i.status} /> },
    { header: 'Proof', cell: (i) => <StatusBadge status={i.blockchainStatus} /> },
    // Invoices carry a tamper-proof hash, so they cannot be edited: cancel (which restores stock) instead.
    actionsColumn<Invoice>((i) => (
      <RowActions
        view={`${copy.base}/${i.id}`}
        remove={writable && i.status !== 'cancelled' ? {
          label: 'Cancel',
          confirm: `Cancel ${i.invoiceNumber}? Stock is put back and it no longer counts in reports.`,
          onConfirm: () => cancel(i),
          disabled: i.paidAmount > 0 ? 'Has payments, so it cannot be cancelled' : undefined,
        } : undefined}
      />
    )),
  ];

  return (
    <Page>
      <PageHeader
        title={copy.title}
  //      subtitle={`${total} ${copy.noun}`}
        actions={canUse(type === 'sale' ? 'sales_create' : 'purchases_create', user?.role) && (
          <Link href={`${copy.base}/create`} className="btn btn-primary"><Plus size={15} /> {copy.newLabel}</Link>
        )}
      />

      <form onSubmit={(e) => { e.preventDefault(); setQuery(search); setPage(1); }}
        style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
          <input className="form-input" style={{ paddingLeft: 34 }} placeholder={`Search number or ${copy.party.toLowerCase()}...`}
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="form-input" style={{ width: 160 }} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          <option value="issued">Issued</option>
          <option value="partial">Partially paid</option>
          <option value="paid">Paid</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button type="submit" className="btn btn-secondary">Search</button>
      </form>

      {error ? <Notice kind="error">Could not load {copy.noun}.</Notice> : null}
      {message ? <Notice kind={message.kind}>{message.text}</Notice> : null}

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        rowKey={(i) => i.id}
        empty={
          <EmptyState icon={FileText} title={`No ${copy.noun} found`}
            action={canUse(type === 'sale' ? 'sales_create' : 'purchases_create', user?.role) ? <Link href={`${copy.base}/create`} className="btn btn-primary"><Plus size={14} /> {copy.newLabel}</Link> : undefined} />
        }
        startIndex={(page - 1) * limit}
        footer={<Pager page={page} total={total} limit={limit} onPage={setPage} />}
      />
    </Page>
  );
}
