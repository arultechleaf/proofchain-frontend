'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CreditCard, RefreshCw } from 'lucide-react';
import { paymentsApi, razorpayApi } from '@/lib/api';
import { loadRazorpayCheckout } from '@/lib/razorpay';
import type { Invoice, PaymentAccount } from '@/models';
import { apiError, formatMoney } from '@/lib/utils';
import { companyService } from '@/models/company';
import { Card, Field, Grid, Notice, SubmitButton, useAsync, Select } from '@/components/ui';
import { UpiQr } from './UpiQr';

interface RazorpayConfig {
  enabled: boolean;
  keyId: string | null;
  mode: 'test' | 'live';
}

/**
 * A payment Razorpay has taken but that we could not confirm yet (network drop, server restart…).
 * It is kept in localStorage so the customer can retry confirming after a refresh, without paying twice.
 */
interface PendingPayment {
  orderId: string;
  paymentId: string;
  signature: string;
  amount: number;
}

type Message = { kind: 'success' | 'error' | 'info'; text: string };

const pendingKey = (invoiceId: number | string) => `razorpay-pending:${invoiceId}`;

function readPending(invoiceId: number | string): PendingPayment | null {
  try {
    const raw = localStorage.getItem(pendingKey(invoiceId));
    return raw ? (JSON.parse(raw) as PendingPayment) : null;
  } catch {
    return null;
  }
}

function writePending(invoiceId: number | string, value: PendingPayment | null) {
  try {
    if (value) localStorage.setItem(pendingKey(invoiceId), JSON.stringify(value));
    else localStorage.removeItem(pendingKey(invoiceId));
  } catch {
    /* storage unavailable (private mode): the on-screen retry still works until refresh */
  }
}

/** Collect an online payment for a sales invoice through Razorpay Checkout. */
export function PayOnline({ invoice, balance, onPaid }: { invoice: Invoice; balance: number; onPaid: () => void }) {
  const config = useAsync<RazorpayConfig>(async () => (await razorpayApi.config()).data.data, []);
  const accounts = useAsync<PaymentAccount[]>(
    async () => (await paymentsApi.accounts('bank')).data.data,
    [],
  );
  const company = useAsync<{ upiId?: string | null; accountHolder?: string | null; bankName?: string | null } | null>(
    async () => { try { return await companyService.settings(); } catch { return null; } },
    [],
  );
  const [amount, setAmount] = useState(String(balance));
  const [accountId, setAccountId] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [pending, setPending] = useState<PendingPayment | null>(null);

  // Pick up a payment that was taken but not confirmed before a refresh.
  useEffect(() => {
    const saved = readPending(invoice.id);
    if (saved) {
      setPending(saved);
      setMessage({
        kind: 'error',
        text: `A payment of ${formatMoney(saved.amount)} (${saved.paymentId}) was taken but not confirmed yet. Do not pay again — confirm it below.`,
      });
    }
  }, [invoice.id]);

  /** Ask the backend to verify and record a payment Razorpay has already taken. Safe to repeat. */
  const confirm = async (p: PendingPayment) => {
    setBusy(true);
    try {
      await razorpayApi.verify({ orderId: p.orderId, paymentId: p.paymentId, signature: p.signature });
      writePending(invoice.id, null);
      setPending(null);
      setMessage({ kind: 'success', text: `Payment of ${formatMoney(p.amount)} received and recorded.` });
      onPaid();
    } catch (err) {
      // The customer has paid, so keep the details and let them retry instead of paying again.
      writePending(invoice.id, p);
      setPending(p);
      setMessage({
        kind: 'error',
        text: `Razorpay took the payment (${p.paymentId}) but it could not be confirmed yet: ${apiError(err)}. `
          + 'Do not pay again. Use “Retry confirmation”; if it keeps failing, contact support with this payment id.',
      });
    } finally {
      setBusy(false);
    }
  };

  if (config.loading) return null;

  if (!config.data?.enabled) {
    return (
      <Card title="Pay online" icon={CreditCard}>
        <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>
          Online payments are not set up yet. Add <code>RAZORPAY_KEY_ID</code> and <code>RAZORPAY_KEY_SECRET</code> to the
          backend <code>.env</code> and restart it.
        </p>
      </Card>
    );
  }

  const startPayment = async (value: number, acct: string) => {
    setBusy(true);
    setMessage(null);
    try {
      const order = (await razorpayApi.createOrder(invoice.id, Number(acct), value)).data.data;
      await loadRazorpayCheckout();

      let paid = false;
      const checkout = new window.Razorpay!({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: order.merchantName || 'ProofChain',
        description: `Invoice ${order.invoiceNumber}`,
        prefill: order.customer,
        notes: { invoiceNumber: order.invoiceNumber },
        theme: { color: '#2563eb' },
        handler: (response) => {
          paid = true;
          // Save before verifying: if the page is closed mid-request the payment is not lost.
          const taken: PendingPayment = {
            orderId: response.razorpay_order_id,
            paymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature,
            amount: value,
          };
          writePending(invoice.id, taken);
          void confirm(taken);
        },
        modal: {
          ondismiss: () => {
            if (paid) return; // closed after paying; confirm() is already running
            setBusy(false);
            setMessage({ kind: 'info', text: 'Payment window closed. No money was taken.' });
          },
        },
      });
      checkout.on('payment.failed', (r) => {
        // The Checkout window stays open so the customer can try another method.
        setMessage({ kind: 'error', text: `Payment failed: ${r.error.description}${r.error.reason ? ` (${r.error.reason.replace(/_/g, ' ')})` : ''}. You can try another method.` });
      });
      checkout.open();
    } catch (err) {
      setMessage({ kind: 'error', text: apiError(err, 'Could not start the payment') });
      setBusy(false);
    }
  };

  /** The customer scanned the QR code: record the amount as received by UPI (no Razorpay). */
  const recordQrPaid = async () => {
    const value = Number(amount);
    if (!(value >= 1)) return setMessage({ kind: 'error', text: 'Minimum payment is ₹1' });
    if (value > balance) return setMessage({ kind: 'error', text: `Amount exceeds the balance due (${formatMoney(balance)})` });
    setBusy(true);
    setMessage(null);
    try {
      await paymentsApi.create({ partyId: invoice.partyId, invoiceId: invoice.id, direction: 'in', amount: value, method: 'upi', paymentDate: new Date().toISOString().slice(0, 10), notes: 'Paid by UPI QR' });
      setMessage({ kind: 'success', text: `Payment of ${formatMoney(value)} recorded as received by UPI.` });
      onPaid();
    } catch (err) {
      setMessage({ kind: 'error', text: apiError(err, 'Could not record the payment') });
    } finally {
      setBusy(false);
    }
  };

  const pay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pending) return confirm(pending);

    const value = Number(amount);
    if (!(value >= 1)) return setMessage({ kind: 'error', text: 'Minimum online payment is ₹1' });
    if (value > balance) return setMessage({ kind: 'error', text: `Amount exceeds the balance due (${formatMoney(balance)})` });
    if (!accountId) return setMessage({ kind: 'error', text: 'Select the bank account that will receive this payment' });
    return startPayment(value, accountId);
  };

  return (
    <Card
      title="Pay online"
      icon={CreditCard}
      action={config.data.mode === 'test' ? <span className="badge badge-demo">Test mode</span> : undefined}
    >
      {message && <Notice kind={message.kind}>{message.text}</Notice>}
      <form onSubmit={pay} className="form-stack">
        {pending ? (
          <>
            <SubmitButton loading={busy}><RefreshCw size={15} /> Retry confirmation</SubmitButton>
            <p className="form-hint">
              Payment {pending.paymentId} for {formatMoney(pending.amount)} is already taken by Razorpay. This only records it on the invoice.
            </p>
          </>
        ) : (
          <>
            <div className="notice notice-info" style={{ display: 'block' }}>
              <p style={{ fontWeight: 600, marginBottom: 8 }}>Pay with Razorpay (UPI QR, apps, cards)</p>
              <Grid cols={2}>
                <Field label="Bank account to credit" required>
                  <Select className="form-input" value={accountId} onChange={(e) => setAccountId(e.target.value)} required>
                    <option value="">{accounts.loading ? 'Loading accounts…' : 'Select account…'}</option>
                    {(accounts.data ?? []).map((account) => (
                      <option key={account.id} value={account.id}>{account.name}</option>
                    ))}
                  </Select>
                  {!!accounts.error && <p className="form-hint">Could not load bank accounts. Refresh the page and try again.</p>}
                  {!accounts.loading && !accounts.error && accounts.data?.length === 0 && (
                    <p className="form-hint" style={{ color: '#f59e0b' }}>You have no bank account yet, and Razorpay needs one to credit. <Link href="/cash-bank" className="auth-link">Add a bank account in Cash &amp; Bank</Link>, then come back.</p>
                  )}
                </Field>
                <Field label="Amount to pay now (₹)" hint={`Balance due ${formatMoney(balance)}. Less than that is a part payment`}>
                  <input type="number" step="0.01" min="1" max={balance} className="form-input"
                    value={amount} placeholder="0" onChange={(e) => setAmount(e.target.value)} />
                </Field>
              </Grid>
              <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap', margin: '14px 0 4px', padding: 14, borderRadius: 12, border: '1px dashed rgba(96,165,250,0.5)' }}>
                <UpiQr upiId={company.data?.upiId ?? null} payee={company.data?.accountHolder || company.data?.bankName || 'ProofChain'} amount={Number(amount) || 0} note={invoice.invoiceNumber} />
                <div style={{ flex: 1, minWidth: 220 }}>
                  <p style={{ margin: '0 0 6px', fontWeight: 600 }}>Customer scans the QR code?</p>
                  <p className="form-hint" style={{ margin: '0 0 10px' }}>The money goes straight to your UPI ID and is not confirmed automatically. After you see it arrive, record it as received.</p>
                  <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void recordQrPaid()}>
                    Paid by QR: record as received
                  </button>
                </div>
              </div>
            </div>
            <SubmitButton loading={busy}><CreditCard size={15} /> Pay with Razorpay</SubmitButton>
            <p className="form-hint">
              Cards, UPI, net banking and wallets. The payment is recorded on this invoice automatically once Razorpay confirms it.
            </p>
          </>
        )}
      </form>
    </Card>
  );
}
