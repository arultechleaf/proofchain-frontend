'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FileText, Plus, Receipt, Wallet } from 'lucide-react';
import { partiesApi } from '@/lib/api';
import type { Invoice, Party, PartySummary, Payment } from '@/types';
import { useAuth } from '@/lib/auth';
import { apiError, formatDay, formatMoney } from '@/lib/utils';
import {
  Card, Column, DataTable, EmptyState, Grid, Notice, Page, PageHeader, Spinner, StatCard, StatusBadge,
  canWrite, useAsync,
} from '@/components/ui';
import { PartyForm, formToPartyPayload, partyToForm } from '@/components/parties/PartyForm';

interface Ledger {
  party: Party;
  invoices: Invoice[];
  payments: Payment[];
  summary: PartySummary;
}

const TABS = ['Invoices', 'Payments', 'Details'] as const;

export default function PartyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [tab, setTab] = useState<(typeof TABS)[number]>('Invoices');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const { data, loading, error, reload } = useAsync<Ledger>(async () => (await partiesApi.get(id)).data.data, [id]);

  if (loading && !data) return <Page><Spinner /></Page>;
  if (error || !data) return <Page><Notice kind="error">Party not found.</Notice></Page>;

  const { party, invoices, payments, summary } = data;
  const writable = canWrite(user?.role);
  // Positive balance: they owe us. Negative: we owe them.
  const balanceColor = summary.balance > 0 ? '#34d399' : summary.balance < 0 ? '#f87171' : '#94a3b8';
  const balanceHint = summary.balance > 0 ? 'To receive' : summary.balance < 0 ? 'To pay' : 'Settled';

  const invoiceColumns: Column<Invoice>[] = [
    {
      header: 'Number',
      cell: (i) => (
        <Link href={`/${i.type === 'sale' ? 'sales' : 'purchases'}/${i.id}`}
          style={{ color: '#60a5fa', textDecoration: 'none', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600 }}>
          {i.invoiceNumber}
        </Link>
      ),
    },
    { header: 'Type', cell: (i) => (i.type === 'sale' ? 'Sale' : 'Purchase') },
    { header: 'Date', cell: (i) => formatDay(i.invoiceDate) },
    { header: 'Total', align: 'right', cell: (i) => formatMoney(i.total) },
    { header: 'Paid', align: 'right', cell: (i) => formatMoney(i.paidAmount) },
    { header: 'Status', cell: (i) => <StatusBadge status={i.status} /> },
  ];

  const paymentColumns: Column<Payment>[] = [
    { header: 'Date', cell: (p) => formatDay(p.paymentDate) },
    { header: 'Direction', cell: (p) => (p.direction === 'in' ? 'Received' : 'Paid') },
    { header: 'Method', cell: (p) => p.method },
    { header: 'Reference', cell: (p) => p.reference || '—' },
    { header: 'Amount', align: 'right', cell: (p) => formatMoney(p.amount) },
  ];

  return (
    <Page>
      <PageHeader
        title={party.name}
        subtitle={[party.partyType, party.city, party.phone].filter(Boolean).join(' · ')}
        backHref="/parties"
        actions={writable && (
          <>
            <Link href={`/sales/create?partyId=${party.id}`} className="btn btn-secondary"><FileText size={15} /> New Sale</Link>
            <Link href={`/purchases/create?partyId=${party.id}`} className="btn btn-secondary"><Receipt size={15} /> New Purchase</Link>
            <Link href={`/payments/create?partyId=${party.id}`} className="btn btn-primary"><Plus size={15} /> Record Payment</Link>
          </>
        )}
      />

      <Grid cols={4} style={{ marginBottom: 20 }}>
        <StatCard label="Balance" value={formatMoney(Math.abs(summary.balance))} color={balanceColor} icon={Wallet} hint={balanceHint} />
        <StatCard label="Total sales" value={formatMoney(summary.totalSales)} color="#60a5fa" hint={`Received ${formatMoney(summary.received)}`} />
        <StatCard label="Total purchases" value={formatMoney(summary.totalPurchases)} color="#22d3ee" hint={`Paid ${formatMoney(summary.paid)}`} />
        <StatCard label="Opening balance" value={formatMoney(summary.openingBalance)} color="#a78bfa" />
      </Grid>

      <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, border: 0, cursor: 'pointer',
            background: tab === t ? 'rgba(37,99,235,0.25)' : 'transparent', color: tab === t ? '#60a5fa' : '#94a3b8',
          }}>{t}</button>
        ))}
      </div>

      {tab === 'Invoices' && (
        <DataTable columns={invoiceColumns} rows={invoices} rowKey={(i) => i.id}
          empty={<EmptyState icon={FileText} title="No invoices for this party yet" />} />
      )}
      {tab === 'Payments' && (
        <DataTable columns={paymentColumns} rows={payments} rowKey={(p) => p.id}
          empty={<EmptyState icon={Wallet} title="No payments recorded" />} />
      )}
      {tab === 'Details' && (
        <Card style={{ maxWidth: 720 }}>
          {message && <Notice kind={message.kind}>{message.text}</Notice>}
          <PartyForm
            defaultValues={partyToForm(party)}
            readOnly={!writable}
            loading={saving}
            submitLabel="Save Changes"
            onSubmit={async (v) => {
              setSaving(true);
              setMessage(null);
              try {
                await partiesApi.update(party.id, formToPartyPayload(v));
                setMessage({ kind: 'success', text: 'Party updated' });
                await reload();
              } catch (err) {
                setMessage({ kind: 'error', text: apiError(err, 'Could not update party') });
              } finally {
                setSaving(false);
              }
            }}
          />
        </Card>
      )}
    </Page>
  );
}
