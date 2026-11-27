'use client';

/**
 * VIEW — Subscription plans (administrators only). Add, change and delete plans; every price or discount change
 * is kept in the price history. Below: every user's subscription, with "Give plan" for offline payments.
 */
import { useState } from 'react';
import { BadgePercent, CalendarClock, History, Plus, RefreshCw, UserPlus, Users, XCircle } from 'lucide-react';
import { subscriptionPlansApi, subscriptionsApi, usersApi } from '@/lib/api';
import { apiError, formatDay, formatMoney } from '@/lib/utils';
import {
  Button, Card, Column, DataTable, EmptyState, Field, Form, Grid, Notice, Page, PageHeader, Pager, RowActions, Select,
  StatusBadge, Tabs, actionsColumn, useAsync, useConfirm,
} from '@/components/ui';
import {
  DURATION_TYPES, EMPTY_PLAN_FORM, durationLabel, finalPriceOf,
  type PlanForm, type PlanPriceChange, type SubscriptionPlan, type UserSubscription,
} from '@/models/subscription';
import type { User } from '@/models';

type Message = { kind: 'success' | 'error' | 'info'; text: string };
type StatusFilter = '' | 'active' | 'expired' | 'cancelled';

export default function SubscriptionPlansPage() {
  const plans = useAsync<SubscriptionPlan[]>(async () => (await subscriptionPlansApi.all()).data.data, []);
  const [message, setMessage] = useState<Message | null>(null);
  const { confirm, dialog } = useConfirm();

  // ── plan form ──
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<PlanForm>(EMPTY_PLAN_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const price = Number(form.price || 0);
  const discount = Number(form.discountPercentage || 0);
  const livePrice = finalPriceOf(price, discount);

  const openNew = () => {
    setEditingId(null); setForm(EMPTY_PLAN_FORM); setFormError(''); setShowForm(true);
  };
  const openEdit = (p: SubscriptionPlan) => {
    setEditingId(p.id);
    setForm({
      planName: p.planName, planCode: p.planCode, durationValue: String(p.durationValue), durationType: p.durationType,
      price: String(p.price), discountPercentage: String(p.discountPercentage), description: p.description ?? '', status: p.status,
    });
    setFormError('');
    setShowForm(true);
  };

  const save = async () => {
    if (!(price >= 0) || !(discount >= 0 && discount <= 100)) return setFormError('Discount must be between 0 and 100');
    setSaving(true);
    setFormError('');
    const body = {
      planName: form.planName,
      planCode: form.planCode.trim() || undefined,
      durationValue: Number(form.durationValue),
      durationType: form.durationType,
      price,
      discountPercentage: discount,
      description: form.description,
      status: form.status,
    };
    try {
      if (editingId) await subscriptionPlansApi.update(editingId, body);
      else await subscriptionPlansApi.create(body);
      setMessage({ kind: 'success', text: `${form.planName} ${editingId ? 'updated' : 'added'}. New subscribers see the new price now; existing subscribers keep what they paid.` });
      setShowForm(false);
      if (historyPlan && editingId === historyPlan.id) history.reload();
      await plans.reload();
    } catch (err) {
      setFormError(apiError(err, 'Could not save the plan'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p: SubscriptionPlan) => {
    try {
      const res = (await subscriptionPlansApi.remove(p.id)).data.data as { deleted: boolean; hidden: boolean };
      setMessage(res.deleted
        ? { kind: 'success', text: `${p.planName} deleted.` }
        : { kind: 'info', text: `${p.planName} has subscribers, so it was hidden instead of deleted. Their subscriptions are not affected.` });
      if (historyPlan?.id === p.id) setHistoryPlan(null);
      await plans.reload();
    } catch (err) {
      setMessage({ kind: 'error', text: apiError(err, 'Could not delete the plan') });
    }
  };

  const toggleStatus = async (p: SubscriptionPlan) => {
    try {
      await subscriptionPlansApi.update(p.id, { status: p.status === 1 ? 0 : 1 });
      setMessage({ kind: 'success', text: `${p.planName} is now ${p.status === 1 ? 'hidden from customers' : 'on sale'}.` });
      await plans.reload();
    } catch (err) {
      setMessage({ kind: 'error', text: apiError(err) });
    }
  };

  // ── price history ──
  const [historyPlan, setHistoryPlan] = useState<SubscriptionPlan | null>(null);
  const history = useAsync<PlanPriceChange[]>(
    async () => (historyPlan ? (await subscriptionPlansApi.history(historyPlan.id)).data.data : []),
    [historyPlan?.id],
  );

  // ── subscribers ──
  const [status, setStatus] = useState<StatusFilter>('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const subs = useAsync<{ data: UserSubscription[]; total: number }>(
    async () => (await subscriptionsApi.list({ page, limit, status: status || undefined })).data,
    [page, limit, status],
  );

  const [showAssign, setShowAssign] = useState(false);
  const users = useAsync<User[]>(async () => (showAssign ? (await usersApi.list()).data.data : []), [showAssign]);
  const [assign, setAssign] = useState({ userId: '', planId: '', amountPaid: '', note: '' });
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState('');
  const assignPlan = plans.data?.find((p) => String(p.id) === assign.planId);

  const submitAssign = async () => {
    setAssigning(true);
    setAssignError('');
    try {
      await subscriptionsApi.assign({
        userId: Number(assign.userId),
        planId: Number(assign.planId),
        amountPaid: assign.amountPaid === '' ? undefined : Number(assign.amountPaid),
        note: assign.note || undefined,
      });
      const who = users.data?.find((u) => String(u.id) === assign.userId);
      setMessage({ kind: 'success', text: `${assignPlan?.planName ?? 'Plan'} given to ${who?.name ?? 'the user'}. They have been notified.` });
      setShowAssign(false);
      setAssign({ userId: '', planId: '', amountPaid: '', note: '' });
      await subs.reload();
    } catch (err) {
      setAssignError(apiError(err, 'Could not give the plan'));
    } finally {
      setAssigning(false);
    }
  };

  const cancelSub = async (s: UserSubscription) => {
    try {
      await subscriptionsApi.cancel(s.id);
      setMessage({ kind: 'success', text: `${s.user?.name ?? 'User'}'s ${s.planName} subscription cancelled.` });
      await subs.reload();
    } catch (err) {
      setMessage({ kind: 'error', text: apiError(err) });
    }
  };

  const [checking, setChecking] = useState(false);
  const runChecks = async () => {
    setChecking(true);
    try {
      const r = (await subscriptionsApi.runChecks()).data.data as { reminded: number; expired: number };
      setMessage({ kind: 'info', text: `Reminders sent: ${r.reminded}. Subscriptions expired: ${r.expired}. (This also runs every hour by itself.)` });
      await subs.reload();
    } catch (err) {
      setMessage({ kind: 'error', text: apiError(err) });
    } finally {
      setChecking(false);
    }
  };

  // ── tables ──
  const planColumns: Column<SubscriptionPlan>[] = [
    { header: 'Plan', cell: (p) => <div><strong>{p.planName}</strong><div className="text-muted" style={{ fontSize: 12 }}>{p.planCode}</div></div> },
    { header: 'Duration', cell: (p) => durationLabel(p.durationValue, p.durationType) },
    { header: 'Price', align: 'right', cell: (p) => formatMoney(p.price) },
    { header: 'Discount', align: 'right', cell: (p) => (p.discountPercentage ? `${p.discountPercentage}%` : '—') },
    { header: 'Final price', align: 'right', cell: (p) => <strong>{formatMoney(p.finalPrice)}</strong> },
    { header: 'Status', cell: (p) => <StatusBadge status={p.status === 1 ? 'active' : 'inactive'} /> },
    { header: 'Updated', cell: (p) => formatDay(p.updatedAt) },
    actionsColumn<SubscriptionPlan>((p) => (
      <RowActions
        edit={() => openEdit(p)}
        extra={(
          <>
            <button type="button" role="menuitem" className="row-menu-item" onClick={() => setHistoryPlan(p)}><History size={15} />Price history</button>
            <button type="button" role="menuitem" className="row-menu-item" onClick={() => void toggleStatus(p)}>
              <BadgePercent size={15} />{p.status === 1 ? 'Hide from customers' : 'Put on sale'}
            </button>
          </>
        )}
        remove={{
          confirm: `Delete ${p.planName}? If anyone has bought it, it is hidden instead so their subscription stays intact.`,
          onConfirm: () => remove(p),
        }}
      />
    ), 100),
  ];

  const historyColumns: Column<PlanPriceChange>[] = [
    { header: 'Changed', cell: (h) => new Date(h.changedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) },
    { header: 'Price', align: 'right', cell: (h) => (h.oldPrice === null ? formatMoney(h.newPrice) : <>{formatMoney(h.oldPrice)} → <strong>{formatMoney(h.newPrice)}</strong></>) },
    { header: 'Discount', align: 'right', cell: (h) => (h.oldDiscount === null ? `${h.newDiscount}%` : `${h.oldDiscount}% → ${h.newDiscount}%`) },
    { header: 'Final price', align: 'right', cell: (h) => (h.oldFinalPrice === null ? formatMoney(h.newFinalPrice) : <>{formatMoney(h.oldFinalPrice)} → <strong>{formatMoney(h.newFinalPrice)}</strong></>) },
    { header: 'By', cell: (h) => (h.oldPrice === null ? <span className="text-muted">Created{h.changedByName ? ` by ${h.changedByName}` : ''}</span> : h.changedByName ?? '—') },
  ];

  const subColumns: Column<UserSubscription>[] = [
    { header: 'User', cell: (s) => <div><strong>{s.user?.name ?? `#${s.userId}`}</strong><div className="text-muted" style={{ fontSize: 12 }}>{s.user?.email}</div></div> },
    { header: 'Plan', cell: (s) => <div>{s.planName}<div className="text-muted" style={{ fontSize: 12 }}>{durationLabel(s.durationValue, s.durationType)}</div></div> },
    { header: 'Paid', align: 'right', cell: (s) => <div>{formatMoney(s.finalPrice)}<div className="text-muted" style={{ fontSize: 12 }}>{s.assignedBy ? 'Given by admin' : 'Online'}</div></div> },
    { header: 'Start', cell: (s) => formatDay(s.startAt) },
    { header: 'End', cell: (s) => formatDay(s.endAt) },
    { header: 'Status', cell: (s) => <StatusBadge status={s.status} /> },
    actionsColumn<UserSubscription>((s) => (
      s.status === 'active' ? (
        <RowActions
          extra={(
            <button
              type="button" role="menuitem" className="row-menu-item row-menu-delete"
              onClick={async () => {
                const ok = await confirm({
                  title: 'Cancel this subscription?',
                  message: `${s.user?.name ?? 'This user'}'s ${s.planName} subscription ends now. They lose access unless another plan is running.`,
                  confirmLabel: 'Yes, cancel it', cancelLabel: 'No, keep it',
                });
                if (ok) void cancelSub(s);
              }}
            ><XCircle size={15} />Cancel subscription</button>
          )}
        />
      ) : null
    ), 90),
  ];

  return (
    <Page>
      <PageHeader
        title="Subscription Plans"
        actions={<Button icon={Plus} onClick={openNew}>New plan</Button>}
      />

      {message ? <Notice kind={message.kind}>{message.text}</Notice> : null}
      {plans.error ? <Notice kind="error">{apiError(plans.error, 'Could not load the plans')}</Notice> : null}

      {showForm && (
        <Card title={editingId ? 'Edit plan' : 'New plan'} icon={CalendarClock} style={{ marginBottom: 20 }}>
          <Form onSubmit={save} loading={saving} submitLabel={editingId ? 'Save changes' : 'Add plan'} onCancel={() => setShowForm(false)} error={formError}>
            <Grid cols={3}>
              <Field label="Plan name" required>
                <input className="form-input" value={form.planName} maxLength={100} required placeholder="Premium"
                  onChange={(e) => setForm({ ...form, planName: e.target.value })} />
              </Field>
              <Field label="Plan code" hint="Leave empty to make one from the name">
                <input className="form-input" value={form.planCode} maxLength={50} placeholder="PREMIUM_1Y"
                  onChange={(e) => setForm({ ...form, planCode: e.target.value.toUpperCase() })} />
              </Field>
              <Field label="Shown to customers">
                <Select className="form-input" value={String(form.status)} onChange={(e) => setForm({ ...form, status: Number(e.target.value) })}>
                  <option value="1">Yes, on sale</option>
                  <option value="0">No, hidden</option>
                </Select>
              </Field>
            </Grid>
            <Grid cols={4}>
              <Field label="Duration" required>
                <input type="number" min={1} max={3650} step={1} className="form-input" value={form.durationValue} required
                  onChange={(e) => setForm({ ...form, durationValue: e.target.value })} />
              </Field>
              <Field label="Duration in">
                <Select className="form-input" value={form.durationType} onChange={(e) => setForm({ ...form, durationType: e.target.value as PlanForm['durationType'] })}>
                  {DURATION_TYPES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                </Select>
              </Field>
              <Field label="Original price (₹)" required>
                <input type="number" min={0} step="0.01" className="form-input" value={form.price} required placeholder="9999"
                  onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </Field>
              <Field label="Discount (%)">
                <input type="number" min={0} max={100} step="0.01" className="form-input" value={form.discountPercentage}
                  onChange={(e) => setForm({ ...form, discountPercentage: e.target.value })} />
              </Field>
            </Grid>
            <Field label="Description">
              <textarea className="form-input" rows={2} maxLength={2000} value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
            <div className="plan-live-price">
              <span>Final price</span>
              <strong>{formatMoney(livePrice)}</strong>
              <span className="text-muted">
                {discount > 0 ? `${formatMoney(price)} − ${discount}% · ` : ''}
                {durationLabel(Number(form.durationValue) || 0, form.durationType)}
                {editingId ? ' · existing subscribers keep the price they paid' : ''}
              </span>
            </div>
          </Form>
        </Card>
      )}

      <DataTable
        columns={planColumns}
        rows={plans.data ?? []}
        loading={plans.loading}
        rowKey={(p) => p.id}
        empty={<EmptyState icon={CalendarClock} title="No plans yet" action={<Button icon={Plus} onClick={openNew}>Add the first plan</Button>} />}
      />

      {historyPlan && (
        <Card
          title={`Price history — ${historyPlan.planName}`}
          icon={History}
          style={{ marginTop: 20 }}
          action={<Button variant="ghost" size="sm" onClick={() => setHistoryPlan(null)}>Close</Button>}
        >
          <DataTable columns={historyColumns} rows={history.data ?? []} loading={history.loading} rowKey={(h) => h.id} bare
            empty={<EmptyState icon={History} title="No price changes yet" />} />
        </Card>
      )}

      <Card
        title="Subscribers"
        icon={Users}
        style={{ marginTop: 20 }}
        action={(
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button variant="secondary" size="sm" icon={RefreshCw} iconSpin={checking} disabled={checking} onClick={() => void runChecks()}>Run reminders now</Button>
            <Button size="sm" icon={UserPlus} onClick={() => { setAssignError(''); setShowAssign((v) => !v); }}>Give plan</Button>
          </div>
        )}
      >
        {showAssign && (
          <div style={{ marginBottom: 16 }}>
            <Form onSubmit={submitAssign} loading={assigning} submitLabel="Give plan" onCancel={() => setShowAssign(false)} error={assignError}>
              <Grid cols={4}>
                <Field label="User" required>
                  <Select className="form-input" value={assign.userId} required onChange={(e) => setAssign({ ...assign, userId: e.target.value })}>
                    <option value="">{users.loading ? 'Loading…' : 'Select a user'}</option>
                    {(users.data ?? []).filter((u) => u.isActive).map((u) => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
                  </Select>
                </Field>
                <Field label="Plan" required>
                  <Select className="form-input" value={assign.planId} required onChange={(e) => setAssign({ ...assign, planId: e.target.value, amountPaid: '' })}>
                    <option value="">Select a plan</option>
                    {(plans.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.planName} · {durationLabel(p.durationValue, p.durationType)} · {formatMoney(p.finalPrice)}{p.status === 1 ? '' : ' (hidden)'}</option>)}
                  </Select>
                </Field>
                <Field label="Amount paid (₹)" hint={assignPlan ? `Leave empty for ${formatMoney(assignPlan.finalPrice)}; 0 = free` : 'Cash, bank transfer…'}>
                  <input type="number" min={0} step="0.01" className="form-input" value={assign.amountPaid}
                    placeholder={assignPlan ? String(assignPlan.finalPrice) : ''} onChange={(e) => setAssign({ ...assign, amountPaid: e.target.value })} />
                </Field>
                <Field label="Note">
                  <input className="form-input" maxLength={255} value={assign.note} placeholder="Paid by UPI, ref …"
                    onChange={(e) => setAssign({ ...assign, note: e.target.value })} />
                </Field>
              </Grid>
            </Form>
          </div>
        )}

        <div style={{ marginBottom: 12 }}>
          <Tabs<StatusFilter>
            value={status}
            onChange={(v) => { setStatus(v); setPage(1); }}
            options={[{ key: '', label: 'All' }, { key: 'active', label: 'Active' }, { key: 'expired', label: 'Expired' }, { key: 'cancelled', label: 'Cancelled' }]}
          />
        </div>
        <DataTable
          columns={subColumns}
          rows={subs.data?.data ?? []}
          loading={subs.loading}
          rowKey={(s) => s.id}
          bare
          empty={<EmptyState icon={Users} title="No subscriptions yet" />}
          startIndex={(page - 1) * limit}
          footer={<Pager page={page} total={subs.data?.total ?? 0} limit={limit} onPage={setPage} onLimit={(n) => { setLimit(n); setPage(1); }} />}
        />
      </Card>
      {dialog}
    </Page>
  );
}
