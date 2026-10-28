'use client';

/** VIEW — one quotation with its lines and the status / convert actions. */
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowRightCircle, Check, Send, X } from 'lucide-react';
import { formatDay, formatMoney } from '@/lib/utils';
import {
  Card, Column, DataTable, Grid, KeyValue, Notice, Page, PageHeader, Spinner, StatusBadge,
} from '@/components/ui';
import { useQuotationDetailController } from '@/controllers/quotation.controller';
import type { QuotationLine } from '@/models/quotation';

const columns: Column<QuotationLine>[] = [
  { header: 'Description', nowrap: false, cell: (l) => l.description },
  { header: 'Qty', align: 'right', cell: (l) => l.quantity },
  { header: 'Rate', align: 'right', cell: (l) => formatMoney(l.rate) },
  { header: 'Tax %', align: 'right', cell: (l) => l.taxRate },
  { header: 'Amount', align: 'right', cell: (l) => <strong>{formatMoney(l.amount)}</strong> },
];

export default function QuotationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const c = useQuotationDetailController(id);

  if (c.loading) return <Page><Spinner /></Page>;
  if (c.notFound || !c.quotation) return <Page><Notice kind="error">Quotation not found.</Notice></Page>;

  const q = c.quotation;
  const locked = q.status === 'converted';
  const canConvert = c.writable && !locked && q.status !== 'rejected';

  return (
    <Page>
      <PageHeader
        title={q.quotationNumber}
        subtitle={<>for {q.party?.name ?? '—'} · <StatusBadge status={q.status} /></>}
        backHref="/quotations"
        actions={c.writable && !locked && (
          <>
            {q.status === 'draft' && <button className="btn btn-secondary" disabled={c.busy} onClick={() => c.setStatus('sent')}><Send size={14} /> Mark sent</button>}
            {(q.status === 'draft' || q.status === 'sent') && (
              <>
                <button className="btn btn-secondary" disabled={c.busy} onClick={() => c.setStatus('accepted')}><Check size={14} /> Accepted</button>
                <button className="btn btn-danger" disabled={c.busy} onClick={() => c.setStatus('rejected')}><X size={14} /> Rejected</button>
              </>
            )}
            {canConvert && (
              <button className="btn btn-primary" disabled={c.busy} onClick={c.convert}><ArrowRightCircle size={15} /> Convert to invoice</button>
            )}
          </>
        )}
      />

      {c.message ? <Notice kind={c.message.kind}>{c.message.text}</Notice> : null}
      {locked && q.convertedInvoiceId && (
        <Notice kind="success">Converted to a sales invoice. <Link href={`/sales/${q.convertedInvoiceId}`} className="auth-link">Open the invoice →</Link></Notice>
      )}

      <Grid cols="2fr 1fr" gap={18}>
        <Card title="Items">
          <DataTable bare columns={columns} rows={q.lines} rowKey={(l) => l.id} />
          {q.notes && <p className="form-hint" style={{ marginTop: 12 }}>{q.notes}</p>}
        </Card>
        <Card title="Summary">
          <KeyValue rows={[
            ['Date', formatDay(q.quotationDate)],
            ['Valid until', q.validUntil ? formatDay(q.validUntil) : '—'],
            ['Subtotal', formatMoney(q.subtotal)],
            ['Tax', formatMoney(q.taxTotal)],
            ['Discount', formatMoney(q.discount)],
            ['Total', <strong key="t">{formatMoney(q.total)}</strong>],
          ]} />
        </Card>
      </Grid>
    </Page>
  );
}
