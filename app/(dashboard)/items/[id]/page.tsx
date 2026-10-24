'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Boxes, History } from 'lucide-react';
import { itemsApi } from '@/lib/api';
import type { Item, StockMovement } from '@/types';
import { useAuth } from '@/lib/auth';
import { apiError, formatDate, formatMoney } from '@/lib/utils';
import {
  Card, Column, DataTable, EmptyState, Field, Grid, Notice, Page, PageHeader, Spinner, StatCard,
  SubmitButton, canWrite, useAsync,
} from '@/components/ui';
import { ItemForm, formToItemPayload, itemToForm } from '@/components/items/ItemForm';

const REASON_LABEL: Record<string, string> = {
  opening: 'Opening stock', sale: 'Sale', purchase: 'Purchase', adjustment: 'Adjustment', cancelled: 'Invoice cancelled',
};

export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const writable = canWrite(user?.role);
  const [saving, setSaving] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const [change, setChange] = useState('');
  const [note, setNote] = useState('');
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const item = useAsync<Item>(async () => (await itemsApi.get(id)).data.data, [id]);
  const moves = useAsync<StockMovement[]>(async () => (await itemsApi.movements(id)).data.data, [id]);

  if (item.loading && !item.data) return <Page><Spinner /></Page>;
  if (item.error || !item.data) return <Page><Notice kind="error">Item not found.</Notice></Page>;
  const it = item.data;

  const columns: Column<StockMovement>[] = [
    { header: 'When', cell: (m) => formatDate(m.createdAt) },
    { header: 'Reason', cell: (m) => REASON_LABEL[m.reason] ?? m.reason },
    { header: 'Reference', cell: (m) => m.reference || '—' },
    {
      header: 'Change', align: 'right',
      cell: (m) => <span style={{ color: m.change < 0 ? '#f87171' : '#34d399', fontWeight: 600 }}>{m.change > 0 ? '+' : ''}{m.change}</span>,
    },
    { header: 'Balance', align: 'right', cell: (m) => m.balanceAfter },
  ];

  const adjust = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(change);
    if (!amount) { setMessage({ kind: 'error', text: 'Enter a non-zero quantity (use a minus sign to remove stock)' }); return; }
    setAdjusting(true);
    setMessage(null);
    try {
      await itemsApi.adjust(id, { change: amount, note: note.trim() || undefined });
      setChange('');
      setNote('');
      setMessage({ kind: 'success', text: 'Stock updated' });
      await Promise.all([item.reload(), moves.reload()]);
    } catch (err) {
      setMessage({ kind: 'error', text: apiError(err, 'Could not adjust stock') });
    } finally {
      setAdjusting(false);
    }
  };

  const low = it.stock <= it.lowStockLevel;

  return (
    <Page>
      <PageHeader title={it.name} subtitle={[it.sku, it.unit].filter(Boolean).join(' · ')} backHref="/items" />
      {message && <Notice kind={message.kind}>{message.text}</Notice>}

      <Grid cols={4} style={{ marginBottom: 20 }}>
        <StatCard label="In stock" value={`${it.stock} ${it.unit}`} color={low ? '#f87171' : '#34d399'} icon={Boxes}
          hint={low ? `Low — alert level ${it.lowStockLevel}` : `Alert level ${it.lowStockLevel}`} />
        <StatCard label="Sale price" value={formatMoney(it.salePrice)} color="#60a5fa" />
        <StatCard label="Purchase price" value={formatMoney(it.purchasePrice)} color="#22d3ee" />
        <StatCard label="Stock value" value={formatMoney(it.stock * it.purchasePrice)} color="#a78bfa" hint="At purchase price" />
      </Grid>

      <Grid cols="1.2fr 1fr" gap={18}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Card title="Item details">
            <ItemForm
              defaultValues={itemToForm(it)}
              readOnly={!writable}
              loading={saving}
              submitLabel="Save Changes"
              onSubmit={async (v) => {
                setSaving(true);
                setMessage(null);
                try {
                  await itemsApi.update(id, formToItemPayload(v, false));
                  setMessage({ kind: 'success', text: 'Item updated' });
                  await item.reload();
                } catch (err) {
                  setMessage({ kind: 'error', text: apiError(err, 'Could not update item') });
                } finally {
                  setSaving(false);
                }
              }}
            />
          </Card>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {writable && (
            <Card title="Adjust stock" icon={Boxes}>
              <form onSubmit={adjust} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Field label="Quantity change" hint="e.g. 10 to add, -3 to remove">
                  <input type="number" step="any" className="form-input" value={change} onChange={(e) => setChange(e.target.value)} />
                </Field>
                <Field label="Note">
                  <input className="form-input" placeholder="Stock count correction" value={note} onChange={(e) => setNote(e.target.value)} />
                </Field>
                <div><SubmitButton loading={adjusting}>Update Stock</SubmitButton></div>
              </form>
            </Card>
          )}
        </div>
      </Grid>

      <h2 style={{ fontSize: 15, fontWeight: 600, margin: '24px 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <History size={15} color="#60a5fa" /> Stock history
      </h2>
      <DataTable columns={columns} rows={moves.data ?? []} loading={moves.loading} rowKey={(m) => m.id}
        empty={<EmptyState icon={History} title="No stock movements yet" />} />
    </Page>
  );
}
