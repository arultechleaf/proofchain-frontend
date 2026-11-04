'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Ban, CheckCircle2, Plus, ShieldCheck, XCircle } from 'lucide-react';
import { invoicesApi } from '@/lib/api';
import type { Invoice, InvoiceLine, InvoiceType, InvoiceVerification } from '@/models';
import { useAuth } from '@/lib/auth';
import { apiError, formatDay, formatMoney, truncateHash } from '@/lib/utils';
import { stateName } from '@/lib/gst';
import {
  Card, Column, DataTable, Grid, KeyValue, Notice, Page, PageHeader, Spinner, StatusBadge, canWrite, useAsync, useConfirm,
} from '@/components/ui';
import { INVOICE_COPY } from './InvoiceList';
import { companyService, type CompanySettings } from '@/models/company';
import { PayOnline } from './PayOnline';

export function InvoiceDetail({ type }: { type: InvoiceType }) {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const writable = canWrite(user?.role);

  const { confirm, dialog } = useConfirm();
  const [verifying, setVerifying] = useState(false);
  const [verification, setVerification] = useState<InvoiceVerification | null>(null);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const { data: invoice, loading, error, reload } = useAsync<Invoice>(async () => (await invoicesApi.get(id)).data.data, [id]);
  // Bank details and terms come from My company > Bank & invoice settings (only shown on your own company's documents)
  const company = useAsync<CompanySettings | null>(async () => { try { return await companyService.settings(); } catch { return null; } }, []);

  if (loading && !invoice) return <Page><Spinner /></Page>;
  if (error || !invoice) return <Page><Notice kind="error">Document not found.</Notice></Page>;

  const nonGst = type === 'sale' && invoice.isGst === false;
  const copy = INVOICE_COPY[nonGst ? 'non_gst_sale' : type];
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
    if (!(await confirm({
      title: `Cancel ${invoice.invoiceNumber}?`, message: 'Stock will be restored. This cannot be undone.',
      confirmLabel: 'Yes, cancel it', cancelLabel: 'No, keep it',
    }))) return;
    try {
      await invoicesApi.cancel(id);
      setMessage({ kind: 'success', text: 'Document cancelled' });
      await reload();
    } catch (err) {
      setMessage({ kind: 'error', text: apiError(err, 'Could not cancel') });
    }
  };

  // Invoices made before GST support have no taxable value, so they keep the simple layout.
  const gst = !nonGst && invoice.taxableValue != null;
  const intra = (invoice.igst ?? 0) === 0;

  const columns: Column<InvoiceLine>[] = nonGst
    ? [
        { header: 'Product', cell: (l) => <>{l.description}{l.sku ? <span className="text-muted"> · {l.sku}</span> : null}</>, nowrap: false },
        { header: 'Qty', align: 'right', cell: (l) => <>{l.quantity}{l.unit ? ` ${l.unit}` : ''}</> },
        { header: 'Price', align: 'right', cell: (l) => formatMoney(l.rate) },
        { header: 'Discount', align: 'right', cell: (l) => ((l.discountAmount ?? 0) > 0 ? formatMoney(l.discountAmount) : '—') },
        { header: 'Total', align: 'right', cell: (l) => <strong>{formatMoney(l.lineTotal ?? l.amount)}</strong> },
      ]
    : gst
    ? [
        { header: 'Product', cell: (l) => <>{l.description}{l.sku ? <span className="text-muted"> · {l.sku}</span> : null}</>, nowrap: false },
        { header: 'HSN / SAC', cell: (l) => l.hsnCode || '—' },
        { header: 'Qty', align: 'right', cell: (l) => <>{l.quantity}{l.unit ? ` ${l.unit}` : ''}</> },
        { header: 'Price', align: 'right', cell: (l) => formatMoney(l.rate) },
        { header: 'Discount', align: 'right', cell: (l) => ((l.discountAmount ?? 0) > 0 ? formatMoney(l.discountAmount) : '—') },
        { header: 'Taxable', align: 'right', cell: (l) => formatMoney(l.taxableAmount ?? l.amount) },
        { header: 'GST', align: 'right', cell: (l) => <>{formatMoney(l.gstAmount ?? 0)} <span className="text-muted">({l.taxRate}%)</span></> },
        { header: 'Total', align: 'right', cell: (l) => <strong>{formatMoney(l.lineTotal ?? l.amount)}</strong> },
      ]
    : [
        { header: 'Description', cell: (l) => l.description, nowrap: false },
        { header: 'Qty', align: 'right', cell: (l) => l.quantity },
        { header: 'Rate', align: 'right', cell: (l) => formatMoney(l.rate) },
        { header: 'Tax', align: 'right', cell: (l) => `${l.taxRate}%` },
        { header: 'Amount', align: 'right', cell: (l) => formatMoney(l.amount) },
      ];

  const amountRows: Array<[string, React.ReactNode]> = gst
    ? [
        ['Subtotal', formatMoney(invoice.subtotal)],
        ['Discount', formatMoney(invoice.discount)],
        ['Taxable value', formatMoney(invoice.taxableValue)],
        ...(intra
          ? [['CGST', formatMoney(invoice.cgst)], ['SGST', formatMoney(invoice.sgst)]] as Array<[string, React.ReactNode]>
          : [['IGST', formatMoney(invoice.igst)]] as Array<[string, React.ReactNode]>),
        ...((invoice.roundOff ?? 0) !== 0 ? [['Round off', formatMoney(invoice.roundOff)]] as Array<[string, React.ReactNode]> : []),
        ['Grand total', <strong key="t">{formatMoney(invoice.total)}</strong>],
      ]
    : [
        ['Subtotal', formatMoney(invoice.subtotal)],
        ...(nonGst ? [] : [['Tax', formatMoney(invoice.taxTotal)]] as Array<[string, React.ReactNode]>),
        ['Discount', formatMoney(invoice.discount)],
        ['Total', <strong key="t">{formatMoney(invoice.total)}</strong>],
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

      {dialog}
      {message && <Notice kind={message.kind}>{message.text}</Notice>}
      {verification && <VerificationResult v={verification} />}

      <div className="invoice-summary">
        <SummaryTile label="Grand total" value={formatMoney(invoice.total)} />
        <SummaryTile label={type === 'sale' ? 'Received' : 'Paid'} value={formatMoney(invoice.paidAmount)} />
        <SummaryTile label="Balance due" value={formatMoney(balance)} tone={balance > 0 ? 'warn' : 'ok'} />
        <SummaryTile label="Payment type" value={invoice.paymentType ? invoice.paymentType.replace(/^./, (c) => c.toUpperCase()) : '—'} small />
      </div>

      <div className="glass-card" style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 18 }}>
        <DataTable bare columns={columns} rows={invoice.lines} rowKey={(l) => l.id} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 24px 14px', borderTop: '1px solid rgba(30,41,59,0.6)' }}>
          <div style={{ width: 'min(100%, 300px)' }}>
            {amountRows.map(([k, v], i) => (
              <div key={k} style={{
                display: 'flex', justifyContent: 'space-between', gap: 24, padding: '7px 0', fontSize: 13,
                fontVariantNumeric: 'tabular-nums',
                ...(i === amountRows.length - 1 ? { borderTop: '1px solid rgba(100,116,139,0.35)', marginTop: 4, paddingTop: 10 } : null),
              }}>
                <span style={{ color: '#94a3b8' }}>{k}</span>
                <span style={{ color: '#e2e8f0', textAlign: 'right' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Grid cols="repeat(auto-fit, minmax(320px, 1fr))" gap={18}>
        <Card title={copy.party}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <span style={{
              width: 40, height: 40, borderRadius: '50%', display: 'grid', placeItems: 'center', flexShrink: 0,
              background: 'rgba(96,165,250,0.15)', color: '#60a5fa', fontWeight: 700, fontSize: 13,
            }}>{initials(invoice.party?.name)}</span>
            <div style={{ minWidth: 0 }}>
              <Link href={`/parties/${invoice.partyId}`} style={{ color: '#60a5fa', textDecoration: 'none', fontWeight: 600 }}>
                {invoice.party?.name ?? '—'}
              </Link>
              {gst && invoice.customerGstin && <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>GSTIN {invoice.customerGstin}</p>}
            </div>
          </div>
          <KeyValue rows={[
            ...(gst ? [
              ['Mobile', invoice.customerMobile || '—'],
              ['Place of supply', invoice.placeOfSupply ? `${invoice.placeOfSupply} · ${stateName(invoice.placeOfSupply)}` : '—'],
              ['Billing', invoice.billingAddress || '—'],
            ] as Array<[string, React.ReactNode]> : []),
            ['Due date', formatDay(invoice.dueDate)],
          ]} />
        </Card>

        <Card title="Blockchain proof" icon={ShieldCheck} action={<StatusBadge status={invoice.blockchainStatus} />}>
          <KeyValue rows={[
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

        {type === 'sale' && canPay && <PayOnline invoice={invoice} balance={balance} onPaid={reload} />}

        {type === 'sale' && company.data && invoice.companyId === user?.companyId && (company.data.bankName || company.data.upiId || company.data.terms) && (
          <Card title="Pay to">
            <KeyValue rows={[
              ...(company.data.bankName ? [['Bank', [company.data.bankName, company.data.bankBranch].filter(Boolean).join(', ')]] : []),
              ...(company.data.accountHolder ? [['Account holder', company.data.accountHolder]] : []),
              ...(company.data.accountNumber ? [['Account number', company.data.accountNumber]] : []),
              ...(company.data.ifscCode ? [['IFSC', company.data.ifscCode]] : []),
              ...(company.data.upiId ? [['UPI', company.data.upiId]] : []),
            ] as Array<[string, React.ReactNode]>} />
            {company.data.terms && <p style={{ fontSize: 12, color: '#94a3b8', whiteSpace: 'pre-wrap', marginTop: 10 }}>{company.data.terms}</p>}
            {company.data.invoiceFooter && <p style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>{company.data.invoiceFooter}</p>}
          </Card>
        )}

        {invoice.notes && <Card title="Notes"><p style={{ fontSize: 13, color: '#94a3b8', whiteSpace: 'pre-wrap' }}>{invoice.notes}</p></Card>}
      </Grid>
    </Page>
  );
}

const initials = (name?: string) =>
  (name ?? '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';

function SummaryTile({ label, value, tone, small }: { label: string; value: React.ReactNode; tone?: 'warn' | 'ok'; small?: boolean }) {
  const warn = tone === 'warn';
  return (
    <div className="glass-card" style={{
      borderRadius: 14, padding: '14px 18px',
      ...(warn ? { background: 'rgba(251,191,36,0.16)', borderColor: 'rgba(251,191,36,0.45)' } : null),
    }}>
      <p style={{ fontSize: 12, color: warn ? '#fbbf24' : '#64748b', margin: 0 }}>{label}</p>
      <p style={{
        fontSize: small ? 16 : 22, fontWeight: 700, margin: '4px 0 0', fontVariantNumeric: 'tabular-nums',
        color: tone === 'ok' ? '#34d399' : '#e2e8f0',
      }}>{value}</p>
    </div>
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
