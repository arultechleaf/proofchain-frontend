'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { invoicesApi, itemsApi, partiesApi } from '@/lib/api';
import type { InvoiceType, Item, Party } from '@/types';
import { apiError, formatMoney, todayIso } from '@/lib/utils';
import {
  Card, Field, Grid, Notice, Page, PageHeader, Spinner, SubmitButton, useAsync,
} from '@/components/ui';
import { INVOICE_COPY } from './InvoiceList';

interface LineState {
  key: number;
  itemId: string;
  description: string;
  quantity: string;
  rate: string;
  taxRate: string;
}

let nextKey = 1;
const blankLine = (): LineState => ({ key: nextKey++, itemId: '', description: '', quantity: '1', rate: '', taxRate: '0' });

const num = (s: string) => (s.trim() === '' || Number.isNaN(Number(s)) ? 0 : Number(s));
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function InvoiceCreate({ type }: { type: InvoiceType }) {
  const copy = INVOICE_COPY[type];
  const router = useRouter();
  const params = useSearchParams();

  const [partyId, setPartyId] = useState(params.get('partyId') ?? '');
  const [invoiceDate, setInvoiceDate] = useState(todayIso());
  const [dueDate, setDueDate] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [discount, setDiscount] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<LineState[]>([blankLine()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const parties = useAsync<Party[]>(
    async () => (await partiesApi.list({ type: type === 'sale' ? 'customer' : 'supplier', limit: 200 })).data.data,
    [type],
  );
  const items = useAsync<Item[]>(async () => (await itemsApi.list({ limit: 500 })).data.data, []);
  const itemById = useMemo(() => new Map((items.data ?? []).map((i) => [i.id, i])), [items.data]);

  const updateLine = (key: number, patch: Partial<LineState>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const pickItem = (key: number, itemId: string) => {
    const item = itemById.get(itemId);
    updateLine(key, item
      ? {
          itemId,
          description: item.name,
          rate: String(type === 'sale' ? item.salePrice : item.purchasePrice),
          taxRate: String(item.taxRate),
        }
      : { itemId: '' });
  };

  const totals = useMemo(() => {
    let subtotal = 0;
    let tax = 0;
    for (const l of lines) {
      const amount = round2(num(l.quantity) * num(l.rate));
      subtotal += amount;
      tax += round2((amount * num(l.taxRate)) / 100);
    }
    subtotal = round2(subtotal);
    tax = round2(tax);
    return { subtotal, tax, total: round2(subtotal + tax - num(discount)) };
  }, [lines, discount]);

  // Quantity per item across lines, to warn before the API rejects an oversell.
  const stockWarnings = useMemo(() => {
    if (type !== 'sale') return [];
    const demand = new Map<string, number>();
    for (const l of lines) if (l.itemId) demand.set(l.itemId, (demand.get(l.itemId) ?? 0) + num(l.quantity));
    return [...demand.entries()].flatMap(([id, qty]) => {
      const item = itemById.get(id);
      return item && qty > item.stock ? [`${item.name}: only ${item.stock} ${item.unit} in stock (selling ${qty})`] : [];
    });
  }, [lines, itemById, type]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!partyId) return setError(`Select a ${copy.party.toLowerCase()}`);
    if (num(discount) > totals.subtotal + totals.tax) return setError('Discount cannot exceed the invoice total');
    for (const [i, l] of lines.entries()) {
      if (!l.itemId && !l.description.trim()) return setError(`Line ${i + 1}: choose an item or enter a description`);
      if (num(l.quantity) <= 0) return setError(`Line ${i + 1}: quantity must be greater than 0`);
      if (l.rate.trim() === '') return setError(`Line ${i + 1}: enter a rate`);
    }

    setSubmitting(true);
    try {
      const res = await invoicesApi.create(type, {
        partyId,
        invoiceNumber: invoiceNumber.trim() || undefined,
        invoiceDate,
        dueDate: dueDate || undefined,
        discount: num(discount) || undefined,
        notes: notes.trim() || undefined,
        lines: lines.map((l) => ({
          itemId: l.itemId || undefined,
          description: l.description.trim() || undefined,
          quantity: num(l.quantity),
          rate: num(l.rate),
          taxRate: num(l.taxRate),
        })),
      });
      router.push(`${copy.base}/${res.data.data.id}`);
    } catch (err) {
      setError(apiError(err, 'Could not create the document'));
      setSubmitting(false);
    }
  };

  if (parties.loading || items.loading) return <Page><Spinner /></Page>;

  return (
    <Page>
      <PageHeader title={copy.newLabel} subtitle="A tamper-proof hash of this document is registered on the blockchain when you save" backHref={copy.base} />
      <form onSubmit={submit}>
        {error && <Notice kind="error">{error}</Notice>}
        {stockWarnings.map((w) => <Notice key={w} kind="info">{w}</Notice>)}

        <Card style={{ marginBottom: 18 }}>
          <Grid cols={4}>
            <Field label={copy.party} required>
              <select className="form-input" value={partyId} onChange={(e) => setPartyId(e.target.value)}>
                <option value="">Select...</option>
                {(parties.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {(parties.data ?? []).length === 0 && (
                <p style={{ fontSize: 12, color: '#fbbf24', marginTop: 4 }}>
                  No {copy.party.toLowerCase()}s yet — <Link href="/parties/create" style={{ color: '#60a5fa' }}>add one</Link>
                </p>
              )}
            </Field>
            <Field label="Date" required>
              <input type="date" className="form-input" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} required />
            </Field>
            <Field label="Due date">
              <input type="date" className="form-input" value={dueDate} min={invoiceDate} onChange={(e) => setDueDate(e.target.value)} />
            </Field>
            <Field label="Number" hint="Leave blank to auto-number">
              <input className="form-input" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
            </Field>
          </Grid>
        </Card>

        <Card title="Items" style={{ marginBottom: 18 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
              <thead>
                <tr style={{ color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left' }}>
                  <th style={{ padding: '0 8px 8px 0', width: '24%' }}>Item</th>
                  <th style={{ padding: '0 8px 8px 0' }}>Description</th>
                  <th style={{ padding: '0 8px 8px 0', width: 90 }}>Qty</th>
                  <th style={{ padding: '0 8px 8px 0', width: 110 }}>Rate</th>
                  <th style={{ padding: '0 8px 8px 0', width: 80 }}>Tax %</th>
                  <th style={{ padding: '0 8px 8px 0', width: 120, textAlign: 'right' }}>Amount</th>
                  <th style={{ width: 36 }} />
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.key}>
                    <td style={{ padding: '0 8px 8px 0' }}>
                      <select className="form-input" value={l.itemId} onChange={(e) => pickItem(l.key, e.target.value)} aria-label="Item">
                        <option value="">Custom line</option>
                        {(items.data ?? []).map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '0 8px 8px 0' }}>
                      <input className="form-input" value={l.description} onChange={(e) => updateLine(l.key, { description: e.target.value })} aria-label="Description" />
                    </td>
                    <td style={{ padding: '0 8px 8px 0' }}>
                      <input type="number" step="any" min="0" className="form-input" value={l.quantity} onChange={(e) => updateLine(l.key, { quantity: e.target.value })} aria-label="Quantity" />
                    </td>
                    <td style={{ padding: '0 8px 8px 0' }}>
                      <input type="number" step="0.01" min="0" className="form-input" value={l.rate} onChange={(e) => updateLine(l.key, { rate: e.target.value })} aria-label="Rate" />
                    </td>
                    <td style={{ padding: '0 8px 8px 0' }}>
                      <input type="number" step="0.01" min="0" max="100" className="form-input" value={l.taxRate} onChange={(e) => updateLine(l.key, { taxRate: e.target.value })} aria-label="Tax percent" />
                    </td>
                    <td style={{ padding: '0 8px 8px 0', textAlign: 'right', color: '#e2e8f0', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {formatMoney(round2(num(l.quantity) * num(l.rate)))}
                    </td>
                    <td style={{ paddingBottom: 8 }}>
                      {lines.length > 1 && (
                        <button type="button" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}
                          aria-label="Remove line" style={{ background: 'none', border: 0, cursor: 'pointer', color: '#f87171', padding: 6 }}>
                          <Trash2 size={15} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" className="btn btn-secondary" style={{ marginTop: 6 }} onClick={() => setLines((ls) => [...ls, blankLine()])}>
            <Plus size={14} /> Add line
          </button>
        </Card>

        <Grid cols="1.4fr 1fr" gap={18}>
          <Card title="Notes">
            <textarea className="form-input" rows={4} style={{ resize: 'none' }} placeholder="Payment terms, delivery notes..."
              value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Card>
          <Card>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14 }}>
              <Row label="Subtotal" value={formatMoney(totals.subtotal)} />
              <Row label="Tax" value={formatMoney(totals.tax)} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <span style={{ color: '#94a3b8' }}>Discount</span>
                <input type="number" step="0.01" min="0" className="form-input" style={{ width: 120, textAlign: 'right' }}
                  value={discount} onChange={(e) => setDiscount(e.target.value)} aria-label="Discount" />
              </div>
              <div style={{ borderTop: '1px solid rgba(51,65,85,0.6)', paddingTop: 10, marginTop: 4 }}>
                <Row label="Total" value={formatMoney(totals.total)} strong />
              </div>
              <SubmitButton loading={submitting}><ShieldCheck size={15} /> Save &amp; register proof</SubmitButton>
            </div>
          </Card>
        </Grid>
      </form>
    </Page>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ color: '#94a3b8' }}>{label}</span>
      <span style={{ color: '#f1f5f9', fontWeight: strong ? 800 : 600, fontSize: strong ? 20 : 14 }}>{value}</span>
    </div>
  );
}
