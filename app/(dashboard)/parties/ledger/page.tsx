'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowDownLeft, ArrowUpRight, ClipboardList, Scale, Users } from 'lucide-react';
import { partiesApi } from '@/lib/api';
import type { Invoice, Party, PartySummary, Payment } from '@/models';
import { formatDay, formatMoney } from '@/lib/utils';
import {
  Card, Column, DataTable, EmptyState, Field, Grid, Notice, Page, PageHeader, StatCard, useAsync,
} from '@/components/ui';

interface Ledger {
  party: Party;
  invoices: Invoice[];
  payments: Payment[];
  summary: PartySummary;
}

interface Entry {
  key: string;
  date: string;
  description: string;
  href: string;
  /** Increases what the party owes us (sale) or reduces it (purchase bill). */
  debit: number;
  credit: number;
  balance: number;
}

/**
 * Statement in date order. Positive balance = the party owes us, matching the "Accounts" page:
 * sales and payments we make add to it; purchase bills and payments we receive take away.
 */
function buildEntries(l: Ledger): Entry[] {
  const raw: Array<Omit<Entry, 'balance'>> = [];
  for (const i of l.invoices) {
    if (i.status === 'cancelled') continue;
    const sale = i.type === 'sale';
    raw.push({
      key: `i-${i.id}`, date: i.invoiceDate, href: `/${sale ? 'sales' : 'purchases'}/${i.id}`,
      description: `${sale ? 'Invoice' : 'Bill'} ${i.invoiceNumber}`,
      debit: sale ? i.total : 0, credit: sale ? 0 : i.total,
    });
  }
  for (const p of l.payments) {
    const received = p.direction === 'in';
    raw.push({
      key: `p-${p.id}`, date: p.paymentDate, href: '/payments',
      description: `Payment ${received ? 'received' : 'made'} (${p.method})${p.reference ? ` · ${p.reference}` : ''}`,
      debit: received ? 0 : p.amount, credit: received ? p.amount : 0,
    });
  }
  raw.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  let balance = l.party.openingBalance;
  return raw.map((e) => {
    balance += e.debit - e.credit;
    return { ...e, balance: Math.round(balance * 100) / 100 };
  });
}

export default function PartyLedgerPage() {
  const [partyId, setPartyId] = useState('');

  const parties = useAsync<Party[]>(async () => (await partiesApi.list({ limit: 200 })).data.data, []);
  const ledger = useAsync<Ledger | null>(
    async () => (partyId ? (await partiesApi.get(partyId)).data.data : null),
    [partyId],
  );

  const l = ledger.data;
  const entries = l ? buildEntries(l) : [];

  const columns: Column<Entry>[] = [
    { header: 'Date', cell: (e) => formatDay(e.date) },
    {
      header: 'Description',
      cell: (e) => <Link href={e.href} style={{ color: '#60a5fa', textDecoration: 'none' }}>{e.description}</Link>,
      nowrap: false,
    },
    { header: 'Debit', align: 'right', cell: (e) => (e.debit ? formatMoney(e.debit) : '—') },
    { header: 'Credit', align: 'right', cell: (e) => (e.credit ? formatMoney(e.credit) : '—') },
    {
      header: 'Balance', align: 'right',
      cell: (e) => (
        <strong style={{ color: e.balance > 0 ? '#34d399' : e.balance < 0 ? '#f87171' : '#94a3b8' }}>
          {formatMoney(Math.abs(e.balance))} {e.balance > 0 ? 'Dr' : e.balance < 0 ? 'Cr' : ''}
        </strong>
      ),
    },
  ];

  return (
    <Page>
      <PageHeader title="Party Ledger" subtitle="Statement of every invoice, bill and payment for one customer or supplier" />
      {parties.error || ledger.error ? <Notice kind="error">Could not load the ledger.</Notice> : null}

      <Card style={{ marginBottom: 20 }}>
        <div style={{ maxWidth: 420 }}>
          <Field label="Customer / supplier">
            <select className="form-input" value={partyId} onChange={(e) => setPartyId(e.target.value)}>
              <option value="">Select a party…</option>
              {(parties.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.partyType})</option>
              ))}
            </select>
          </Field>
        </div>
      </Card>

      {!partyId ? (
        <EmptyState icon={Users} title="Choose a customer or supplier to see their ledger" />
      ) : (
        <>
          <Grid cols={3} style={{ marginBottom: 20 }}>
            <StatCard label="Total billed" value={formatMoney(l?.summary.totalSales)} color="#60a5fa" icon={ArrowUpRight} loading={ledger.loading}
              hint={`Opening balance ${formatMoney(l?.summary.openingBalance)}`} />
            <StatCard label="Received / paid" value={formatMoney((l?.summary.received ?? 0) + (l?.summary.paid ?? 0))} color="#34d399" icon={ArrowDownLeft} loading={ledger.loading} />
            <StatCard
              label={(l?.summary.balance ?? 0) < 0 ? 'You owe' : 'Owes you'}
              value={formatMoney(Math.abs(l?.summary.balance ?? 0))}
              color={(l?.summary.balance ?? 0) < 0 ? '#f87171' : '#fbbf24'}
              icon={Scale} loading={ledger.loading}
            />
          </Grid>

          <DataTable
            columns={columns}
            rows={entries}
            loading={ledger.loading}
            rowKey={(e) => e.key}
            empty={<EmptyState icon={ClipboardList} title="No transactions for this party yet" />}
          />
        </>
      )}
    </Page>
  );
}
