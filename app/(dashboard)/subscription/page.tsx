'use client';

/**
 * VIEW — My subscription: how long the current plan runs, the plans on sale at their latest prices, and the
 * purchase through Razorpay. Users without a running plan are sent here from every other page.
 */
import { useState } from 'react';
import { CalendarCheck, CalendarClock, Check, CreditCard, History } from 'lucide-react';
import { subscriptionPlansApi, subscriptionsApi } from '@/lib/api';
import { loadRazorpayCheckout } from '@/lib/razorpay';
import { useAuth } from '@/lib/auth';
import { apiError, formatDay, formatMoney } from '@/lib/utils';
import {
  Button, Card, Column, DataTable, EmptyState, Notice, Page, PageHeader, StatusBadge, useAsync,
} from '@/components/ui';
import {
  durationLabel, type MySubscription, type SubscriptionOrder, type SubscriptionPlan, type UserSubscription,
} from '@/models/subscription';

type Message = { kind: 'success' | 'error' | 'info'; text: string };

export default function SubscriptionPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const mine = useAsync<MySubscription>(async () => (await subscriptionsApi.me()).data.data, []);
  const plans = useAsync<SubscriptionPlan[]>(async () => (await subscriptionPlansApi.active()).data.data, []);
  const [busyPlan, setBusyPlan] = useState<number | null>(null);
  const [message, setMessage] = useState<Message | null>(null);

  const s = mine.data;
  const active = s?.status === 'active';

  const buy = async (plan: SubscriptionPlan) => {
    setBusyPlan(plan.id);
    setMessage(null);
    try {
      const order = (await subscriptionsApi.order(plan.id)).data.data as SubscriptionOrder;
      await loadRazorpayCheckout();
      let paid = false;
      const checkout = new window.Razorpay!({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: 'ProofChain',
        description: `${order.plan.planName} · ${order.plan.duration}`,
        prefill: order.customer,
        theme: { color: '#16a34a' },
        handler: async (response) => {
          paid = true;
          try {
            await subscriptionsApi.verify({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });
            setMessage({ kind: 'success', text: `Payment received. ${order.plan.planName} is active. Thank you!` });
            await mine.reload();
          } catch (err) {
            setMessage({
              kind: 'error',
              text: `Razorpay took the payment (${response.razorpay_payment_id}) but it could not be confirmed: ${apiError(err)}. `
                + 'Do not pay again. Refresh this page in a minute, or contact support with this payment id.',
            });
          } finally {
            setBusyPlan(null);
          }
        },
        modal: {
          ondismiss: () => {
            if (paid) return;
            setBusyPlan(null);
            setMessage({ kind: 'info', text: 'Payment window closed. No money was taken.' });
          },
        },
      });
      checkout.on('payment.failed', (r) => {
        setMessage({ kind: 'error', text: `Payment failed: ${r.error.description}. You can try another method.` });
      });
      checkout.open();
    } catch (err) {
      setMessage({ kind: 'error', text: apiError(err, 'Could not start the payment') });
      setBusyPlan(null);
    }
  };

  const historyColumns: Column<UserSubscription>[] = [
    { header: 'Plan', cell: (h) => <strong>{h.planName}</strong> },
    { header: 'Duration', cell: (h) => durationLabel(h.durationValue, h.durationType) },
    { header: 'Paid', align: 'right', cell: (h) => formatMoney(h.finalPrice) },
    { header: 'Start', cell: (h) => formatDay(h.startAt) },
    { header: 'End', cell: (h) => formatDay(h.endAt) },
    { header: 'Status', cell: (h) => <StatusBadge status={h.status} /> },
  ];

  return (
    <Page>
      <PageHeader title="My Subscription" />

      {message ? <Notice kind={message.kind} autoHideMs={0}>{message.text}</Notice> : null}
      {mine.error ? <Notice kind="error">{apiError(mine.error, 'Could not load your subscription')}</Notice> : null}

      {s && (
        <div className={`subscription-status ${active ? (s.expiringSoon ? 'is-warning' : 'is-active') : 'is-closed'}`}>
          {active ? <CalendarCheck size={22} /> : <CalendarClock size={22} />}
          <div>
            {active ? (
              <>
                <strong>{s.current?.planName ?? 'Subscription'} is active</strong>
                <p>
                  Valid until {formatDay(s.endAt)} · {s.daysLeft} day{s.daysLeft === 1 ? '' : 's'} left
                  {s.upcoming.length ? ` · ${s.upcoming.length} renewal${s.upcoming.length === 1 ? '' : 's'} queued` : ''}
                </p>
                {s.expiringSoon && <p>Your plan ends soon. Renew now: the new plan starts when this one ends, so you lose no days.</p>}
              </>
            ) : isAdmin ? (
              <>
                <strong>Administrators do not need a subscription</strong>
                <p>Manage prices and subscribers on the Subscription Plans page.</p>
              </>
            ) : (
              <>
                <strong>{s.status === 'expired' ? 'Your subscription has ended' : 'Choose a plan to start'}</strong>
                <p>{s.status === 'expired' ? `It ended on ${formatDay(s.endAt)}. ` : ''}Pick a plan below to use the app.</p>
              </>
            )}
          </div>
        </div>
      )}

      <h2 className="plan-section-title">{active ? 'Renew or upgrade' : 'Plans'}</h2>
      {plans.error ? <Notice kind="error">{apiError(plans.error, 'Could not load the plans')}</Notice> : null}
      {!plans.loading && !plans.data?.length ? <EmptyState icon={CreditCard} title="No plans are on sale right now" /> : null}
      <div className="plan-grid">
        {(plans.data ?? []).map((p) => (
          <div key={p.id} className="glass-card plan-card">
            <div className="plan-card-head">
              <h3>{p.planName}</h3>
              {p.discountPercentage > 0 && <span className="plan-card-off">{p.discountPercentage}% off</span>}
            </div>
            <p className="plan-card-duration">{durationLabel(p.durationValue, p.durationType)}</p>
            <div className="plan-card-price">
              <strong>{formatMoney(p.finalPrice)}</strong>
              {p.discountPercentage > 0 && <s>{formatMoney(p.price)}</s>}
            </div>
            {p.description && <p className="plan-card-desc"><Check size={14} /> {p.description}</p>}
            <Button fullWidth icon={CreditCard} loading={busyPlan === p.id} disabled={busyPlan !== null || isAdmin} onClick={() => void buy(p)}>
              {active ? 'Renew with this plan' : 'Buy now'}
            </Button>
          </div>
        ))}
      </div>

      {!!s?.history.length && (
        <Card title="Subscription history" icon={History} style={{ marginTop: 24 }}>
          <DataTable columns={historyColumns} rows={s.history} rowKey={(h) => h.id} bare />
        </Card>
      )}
    </Page>
  );
}
