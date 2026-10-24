'use client';

import { useState } from 'react';
import { CreditCard } from 'lucide-react';
import { razorpayApi } from '@/lib/api';
import { loadRazorpayCheckout } from '@/lib/razorpay';
import type { Invoice } from '@/types';
import { apiError, formatMoney } from '@/lib/utils';
import { Card, Field, Notice, SubmitButton, useAsync } from '@/components/ui';

interface RazorpayConfig {
  enabled: boolean;
  keyId: string | null;
  mode: 'test' | 'live';
}

/** Collect an online payment for a sales invoice through Razorpay Checkout. */
export function PayOnline({ invoice, balance, onPaid }: { invoice: Invoice; balance: number; onPaid: () => void }) {
  const config = useAsync<RazorpayConfig>(async () => (await razorpayApi.config()).data.data, []);
  const [amount, setAmount] = useState(String(balance));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'success' | 'error' | 'info'; text: string } | null>(null);

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
    const value = Number(amount);
    if (!(value >= 1)) return setMessage({ kind: 'error', text: 'Minimum online payment is ₹1' });
    if (value > balance) return setMessage({ kind: 'error', text: `Amount exceeds the balance due (${formatMoney(balance)})` });

    setBusy(true);
    setMessage(null);
    try {
      const order = (await razorpayApi.createOrder(invoice.id, value)).data.data;
      await loadRazorpayCheckout();

      const checkout = new window.Razorpay!({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: 'ProofChain',
        description: `Invoice ${order.invoiceNumber}`,
        prefill: order.customer,
        theme: { color: '#2563eb' },
        handler: async (response) => {
          try {
            await razorpayApi.verify({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });
            setMessage({ kind: 'success', text: `Payment of ${formatMoney(value)} received and recorded.` });
            onPaid();
          } catch (err) {
            // The customer has paid at this point, so say so plainly and give them the reference.
            setMessage({
              kind: 'error',
              text: `Razorpay took the payment (${response.razorpay_payment_id}) but it could not be confirmed here: ${apiError(err)}. `
                + 'Refresh this page; if it is still unpaid, keep this payment id and contact support.',
            });
          } finally {
            setBusy(false);
          }
        },
        modal: { ondismiss: () => setBusy(false) },
      });
      checkout.on('payment.failed', (r) => {
        setMessage({ kind: 'error', text: `Payment failed: ${r.error.description}` });
        setBusy(false);
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
      <form onSubmit={pay} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="Amount (₹)" hint={`Balance due ${formatMoney(balance)} — pay part or all of it`}>
          <input type="number" step="0.01" min="1" max={balance} className="form-input"
            value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <SubmitButton loading={busy}><CreditCard size={15} /> Pay with Razorpay</SubmitButton>
        <p style={{ fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>
          Cards, UPI, net banking and wallets. The payment is recorded on this invoice automatically once Razorpay confirms it.
        </p>
      </form>
    </Card>
  );
}
