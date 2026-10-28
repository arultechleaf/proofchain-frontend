'use client';

import { useEffect, useState } from 'react';
import { CreditCard, RefreshCw } from 'lucide-react';
import { razorpayApi } from '@/lib/api';
import { loadRazorpayCheckout } from '@/lib/razorpay';
import type { Invoice } from '@/models';
import { apiError, formatMoney } from '@/lib/utils';
import { Card, Field, Notice, SubmitButton, useAsync } from '@/components/ui';

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

const pendingKey = (invoiceId: string) => `razorpay-pending:${invoiceId}`;

function readPending(invoiceId: string): PendingPayment | null {
  try {
    const raw = localStorage.getItem(pendingKey(invoiceId));
    return raw ? (JSON.parse(raw) as PendingPayment) : null;
  } catch {
    return null;
  }
}

function writePending(invoiceId: string, value: PendingPayment | null) {
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
  const [amount, setAmount] = useState(String(balance));
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

  const pay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pending) return confirm(pending);

    const value = Number(amount);
    if (!(value >= 1)) return setMessage({ kind: 'error', text: 'Minimum online payment is ₹1' });
    if (value > balance) return setMessage({ kind: 'error', text: `Amount exceeds the balance due (${formatMoney(balance)})` });

    setBusy(true);
    setMessage(null);
    try {
      const order = (await razorpayApi.createOrder(invoice.id, value)).data.data;
      await loadRazorpayCheckout();

      let paid = false;
      const checkout = new window.Razorpay!({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: 'ProofChain',
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
        setMessage({ kind: 'error', text: `Payment failed: ${r.error.description}. You can try another method.` });
      });
      checkout.open();
    } catch (err) {
      setMessage({ kind: 'error', text: apiError(err, 'Could not start the payment') });
      setBusy(false);
    }
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
            <Field label="Amount (₹)" hint={`Balance due ${formatMoney(balance)} — pay part or all of it`}>
              <input type="number" step="0.01" min="1" max={balance} className="form-input"
                value={amount} onChange={(e) => setAmount(e.target.value)} />
            </Field>
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
