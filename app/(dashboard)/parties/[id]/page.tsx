'use client';

/** VIEW — one party with its invoices, payments and edit form. */
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FileText, Plus, Receipt, Wallet } from 'lucide-react';
import type { Invoice, Payment } from '@/models';
import { formatDay, formatMoney } from '@/lib/utils';
import {
  Card, Column, DataTable, EmptyState, Grid, Notice, Page, PageHeader, Spinner, StatCard, StatusBadge,
} from '@/components/ui';
import { PartyForm } from '@/components/parties/PartyForm';
import { PARTY_DETAIL_TABS, usePartyDetailController } from '@/controllers/party.controller';
import { balanceInfo, partyToForm } from '@/models/party';

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

export default function PartyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const c = usePartyDetailController(id);

  if (c.loading) return <Page><Spinner /></Page>;
  if (c.notFound || !c.ledger) return <Page><Notice kind="error">Party not found.</Notice></Page>;

  const { party, invoices, payments, summary } = c.ledger;
  const balance = balanceInfo(summary.balance);

  return (
    <Page>
      <PageHeader
        title={party.name}
        subtitle={[party.partyType, party.city, party.phone].filter(Boolean).join(' · ')}
        backHref="/parties"
        actions={c.writable && (
          <>
            <Link href={`/sales/create?partyId=${party.id}`} className="btn btn-secondary"><FileText size={15} /> New Sale</Link>
            <Link href={`/purchases/create?partyId=${party.id}`} className="btn btn-secondary"><Receipt size={15} /> New Purchase</Link>
            <Link href={`/payments/create?partyId=${party.id}`} className="btn btn-primary"><Plus size={15} /> Record Payment</Link>
          </>
        )}
      />

      <Grid cols={4} style={{ marginBottom: 20 }}>
        <StatCard label="Balance" value={formatMoney(Math.abs(summary.balance))} color={balance.color} icon={Wallet} hint={balance.hint} />
        <StatCard label="Total sales" value={formatMoney(summary.totalSales)} color="#60a5fa" hint={`Received ${formatMoney(summary.received)}`} />
        <StatCard label="Total purchases" value={formatMoney(summary.totalPurchases)} color="#22d3ee" hint={`Paid ${formatMoney(summary.paid)}`} />
        <StatCard label="Opening balance" value={formatMoney(summary.openingBalance)} color="#a78bfa" />
      </Grid>

      <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
        {PARTY_DETAIL_TABS.map((t) => (
          <button key={t} onClick={() => c.setTab(t)} style={{
            padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, border: 0, cursor: 'pointer',
            background: c.tab === t ? 'rgba(37,99,235,0.25)' : 'transparent', color: c.tab === t ? '#60a5fa' : '#94a3b8',
          }}>{t}</button>
        ))}
      </div>

      {c.tab === 'Invoices' && (
        <DataTable columns={invoiceColumns} rows={invoices} rowKey={(i) => i.id}
          empty={<EmptyState icon={FileText} title="No invoices for this party yet" />} />
      )}
      {c.tab === 'Payments' && (
        <DataTable columns={paymentColumns} rows={payments} rowKey={(p) => p.id}
          empty={<EmptyState icon={Wallet} title="No payments recorded" />} />
      )}
      {c.tab === 'Details' && (
        <Card style={{ maxWidth: 720 }}>
          {c.message && <Notice kind={c.message.kind}>{c.message.text}</Notice>}
          <PartyForm
            defaultValues={partyToForm(party)}
            readOnly={!c.writable}
            loading={c.saving}
            submitLabel="Save Changes"
            onSubmit={c.save}
          />
        </Card>
      )}
    </Page>
  );
}
