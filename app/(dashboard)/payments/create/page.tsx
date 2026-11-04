'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { invoicesApi, partiesApi, paymentsApi } from '@/lib/api';
import type { Invoice, Party, PaymentAccount } from '@/models';
import { apiError, formatMoney, todayIso } from '@/lib/utils';
import { Card, Field, Grid, Page, PageHeader, Spinner, Form, useAsync, Tabs, Select } from '@/components/ui';

const METHODS = ['cash', 'bank', 'upi', 'card', 'cheque', 'other'];

function RecordPayment() {
  const router = useRouter();
  const params = useSearchParams();

  const [direction, setDirection] = useState<'in' | 'out'>('in');
  const [partyId, setPartyId] = useState(params.get('partyId') ?? '');
  const [invoiceId, setInvoiceId] = useState(params.get('invoiceId') ?? '');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [accountId, setAccountId] = useState('');
  const [paymentDate, setPaymentDate] = useState(todayIso());
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [openInvoices, setOpenInvoices] = useState<Invoice[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const parties = useAsync<Party[]>(async () => (await partiesApi.list({ limit: 200 })).data.data, []);
  const accounts = useAsync<PaymentAccount[]>(
    async () => (await paymentsApi.accounts()).data.data,
    [],
  );
  const paymentAccounts = (accounts.data ?? []).filter((a) => a.accountType === method);

  // Opening from an invoice: take direction and amount from it.
  useEffect(() => {
    const fromInvoice = params.get('invoiceId');
    if (!fromInvoice) return;
    invoicesApi.get(fromInvoice).then((res) => {
      const inv: Invoice = res.data.data;
      setDirection(inv.type === 'sale' ? 'in' : 'out');
      setPartyId(String(inv.partyId));
      setInvoiceId(String(inv.id));
      setAmount(String(Math.round((inv.total - inv.paidAmount) * 100) / 100));
    }).catch(() => {});
  }, [params]);

  // Unpaid documents for the chosen party and direction.
  useEffect(() => {
    if (!partyId) { setOpenInvoices([]); return; }
    const type = direction === 'in' ? 'sale' : 'purchase';
    invoicesApi.list(type, { partyId, limit: 100 })
      .then((res) => setOpenInvoices((res.data.data as Invoice[]).filter((i) => i.status === 'issued' || i.status === 'partial')))
      .catch(() => setOpenInvoices([]));
  }, [partyId, direction]);

  const selected = openInvoices.find((i) => String(i.id) === invoiceId);
  const due = selected ? Math.round((selected.total - selected.paidAmount) * 100) / 100 : null;

  const changeInvoice = (id: string) => {
    setInvoiceId(id);
    const inv = openInvoices.find((i) => String(i.id) === id);
    if (inv) setAmount(String(Math.round((inv.total - inv.paidAmount) * 100) / 100));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const value = Number(amount);
    if (!partyId) return setError('Select a party');
    if (!(value > 0)) return setError('Enter an amount greater than 0');
    if (due !== null && value > due) return setError(`Amount exceeds the balance due (${formatMoney(due)})`);
    if ((method === 'cash' || method === 'bank') && !accountId) return setError(`Select a ${method} account`);

    setSubmitting(true);
    try {
      await paymentsApi.create({
        partyId,
        invoiceId: invoiceId || undefined,
        direction,
        amount: value,
        method,
        accountId: method === 'cash' || method === 'bank' ? Number(accountId) : undefined,
        paymentDate,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      router.push(invoiceId ? `/${direction === 'in' ? 'sales' : 'purchases'}/${invoiceId}` : '/payments');
    } catch (err) {
      setError(apiError(err, 'Could not record payment'));
      setSubmitting(false);
    }
  };

  if (parties.loading) return <Page narrow><Spinner /></Page>;

  const eligibleParties = (parties.data ?? []).filter((p) =>
    direction === 'in' ? p.partyType !== 'supplier' : p.partyType !== 'customer');

  return (
    <Page narrow>
      <PageHeader title="Record Payment" subtitle="Money received from a customer or paid to a supplier" backHref="/payments" />
      <Card>
        <Form onSubmit={submit} loading={submitting} submitLabel="Save Payment" error={error || undefined}>

          <Tabs fill value={direction}
            onChange={(k) => { setDirection(k); setInvoiceId(''); setPartyId(''); setAmount(''); }}
            options={[{ key: 'in', label: 'Received from customer', tone: 'success' }, { key: 'out', label: 'Paid to supplier', tone: 'danger' }] as const} />

          <Field label={direction === 'in' ? 'Customer' : 'Supplier'} required>
            <Select className="form-input" value={partyId} onChange={(e) => { setPartyId(e.target.value); setInvoiceId(''); }}>
              <option value="">Select...</option>
              {eligibleParties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>

          <Field label="Against" hint="Leave as 'On account' for an advance payment">
            <Select className="form-input" value={invoiceId} onChange={(e) => changeInvoice(e.target.value)} disabled={!partyId}>
              <option value="">On account (no document)</option>
              {openInvoices.map((i) => (
                <option key={i.id} value={i.id}>{i.invoiceNumber} — due {formatMoney(i.total - i.paidAmount)}</option>
              ))}
            </Select>
          </Field>

          <Grid cols={3}>
            <Field label="Amount" required hint={due !== null ? `Balance due ${formatMoney(due)}` : undefined}>
              <input type="number" step="0.01" min="0.01" className="form-input" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </Field>
            <Field label="Method">
              <Select className="form-input" value={method} onChange={(e) => { setMethod(e.target.value); setAccountId(''); }}>
                {METHODS.map((m) => <option key={m} value={m} style={{ textTransform: 'capitalize' }}>{m === 'bank' ? 'Bank transfer' : m}</option>)}
              </Select>
            </Field>
            <Field label="Date" required>
              <input type="date" className="form-input" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} required />
            </Field>
          </Grid>

          {(method === 'cash' || method === 'bank') && (
            <Field label={`${method === 'cash' ? 'Cash' : 'Bank'} account`} required>
              <Select className="form-input" value={accountId} onChange={(e) => setAccountId(e.target.value)} required>
                <option value="">{accounts.loading ? 'Loading accounts…' : 'Select account…'}</option>
                {paymentAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
              </Select>
              {!!accounts.error && <p className="form-hint">Could not load accounts. Refresh the page and try again.</p>}
              {!accounts.loading && !accounts.error && paymentAccounts.length === 0 && (
                <p className="form-hint">No active {method} account. <Link href="/cash-bank" className="auth-link">Create one in Cash &amp; Bank</Link>.</p>
              )}
            </Field>
          )}

          <Field label="Reference" hint="Cheque, UTR or transaction number">
            <input className="form-input" value={reference} onChange={(e) => setReference(e.target.value)} />
          </Field>
          <Field label="Notes">
            <input className="form-input" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </Form>
      </Card>
    </Page>
  );
}

export default function RecordPaymentPage() {
  return (
    <Suspense>
      <RecordPayment />
    </Suspense>
  );
}
