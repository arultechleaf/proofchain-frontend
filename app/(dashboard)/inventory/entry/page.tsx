'use client';

/** VIEW — stock entry for many items at once, transfers between branches, and returns. */
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeftRight, ClipboardList, FileUp, Undo2 } from 'lucide-react';
import { Card, Field, Form, Grid, Notice, Page, PageHeader, SearchInput, Spinner, Tabs } from '@/components/ui';
import { useStockEntryController } from '@/controllers/stock-entry.controller';

type Tab = 'entry' | 'transfer' | 'returns';

export default function StockEntryPage() {
  const c = useStockEntryController();
  const [tab, setTab] = useState<Tab>('entry');
  const atBranch = c.branches.find((b) => String(b.id) === c.branchId);

  return (
    <Page narrow>
      <PageHeader title="Stock entry, transfer & returns" backHref="/inventory"
        actions={<Link href="/inventory/entry/import" className="btn btn-secondary"><FileUp size={15} /> Add from invoice PDF</Link>} />

      <div className="toolbar">
        <select className="form-input" style={{ width: 260 }} value={c.branchId} onChange={(e) => c.setBranchId(e.target.value)} aria-label="Branch">
          {c.branches.map((b) => <option key={b.id} value={b.id}>{b.name} ({b.code}){b.isDefault ? ' · default' : ''}</option>)}
        </select>
        <Tabs<Tab> value={tab} onChange={(k) => { setTab(k); c.clearMessage(); }}
          options={[{ key: 'entry', label: 'Stock entry' }, { key: 'transfer', label: 'Transfer' }, { key: 'returns', label: 'Returns' }]} />
      </div>

      {c.message ? <Notice kind={c.message.kind}>{c.message.text}</Notice> : null}
      {c.loading && c.items.length === 0 && <Card><Spinner /></Card>}

      {/* ── stock entry ── */}
      {tab === 'entry' && (
        <Card title={`Stock entry at ${atBranch?.name ?? 'branch'}`} icon={ClipboardList}>
          <Form onSubmit={async () => { await c.saveEntry(); }} loading={c.saving} submitLabel={`Save ${c.entered || ''} line${c.entered === 1 ? '' : 's'}`.replace('Save  ', 'Save ')}
            readOnly={false}>
            <Grid cols={2}>
              <Field label="Reason">
                <select className="form-input" value={c.reason} onChange={(e) => c.setReason(e.target.value as 'purchase' | 'adjustment' | 'opening')}>
                  <option value="purchase">Stock received (adds)</option>
                  <option value="adjustment">Count correction (add or remove)</option>
                  <option value="opening">Opening stock (adds)</option>
                </select>
              </Field>
              <Field label="Note"><input className="form-input" value={c.note} placeholder="Supplier, GRN number…" onChange={(e) => c.setNote(e.target.value)} /></Field>
            </Grid>
            <SearchInput placeholder="Search item or SKU…" value={c.search} onChange={(e) => c.setSearch(e.target.value)} />
            <div className="entry-grid">
              <div className="entry-head"><span>Item</span><span>Now here</span><span>{c.reason === 'adjustment' ? 'Add (+) or remove (−)' : 'Quantity to add'}</span></div>
              {c.filtered.map((i) => (
                <div key={i.id} className="entry-row">
                  <span><strong>{i.name}</strong> <span className="text-muted">{i.sku ?? ''}</span></span>
                  <span>{i.stock} {i.unit}</span>
                  <input type="number" step="any" className="form-input" aria-label={`Quantity for ${i.name}`} placeholder="0"
                    min={c.reason === 'adjustment' ? undefined : 0}
                    value={c.qty[i.id] ?? ''} onChange={(e) => c.setQty({ ...c.qty, [i.id]: e.target.value })} />
                </div>
              ))}
              {c.filtered.length === 0 && !c.loading && <p className="form-hint">No items found.</p>}
            </div>
            <p className="form-hint">Only the lines you fill in are saved. They are saved together, or not at all.</p>
          </Form>
        </Card>
      )}

      {/* ── transfer ── */}
      {tab === 'transfer' && (
        <Card title={`Move stock out of ${atBranch?.name ?? 'branch'}`} icon={ArrowLeftRight}>
          <Form onSubmit={async () => { await c.saveTransfer(); }} loading={c.saving} submitLabel="Move stock">
            <Grid cols={2}>
              <Field label="Item" required>
                <select className="form-input" required value={c.tr.itemId} onChange={(e) => c.setTr({ ...c.tr, itemId: e.target.value })}>
                  <option value="">Select…</option>
                  {c.items.filter((i) => i.stock > 0).map((i) => <option key={i.id} value={i.id}>{i.name} — {i.stock} {i.unit} here</option>)}
                </select>
              </Field>
              <Field label="Move to" required>
                <select className="form-input" required value={c.tr.toBranchId} onChange={(e) => c.setTr({ ...c.tr, toBranchId: e.target.value })}>
                  <option value="">Select…</option>
                  {c.branches.filter((b) => String(b.id) !== c.branchId).map((b) => <option key={b.id} value={b.id}>{b.name} ({b.code})</option>)}
                </select>
              </Field>
            </Grid>
            <Grid cols={2}>
              <Field label="Quantity" required>
                <input type="number" step="any" min="0" className="form-input" required value={c.tr.quantity} onChange={(e) => c.setTr({ ...c.tr, quantity: e.target.value })} />
              </Field>
              <Field label="Note"><input className="form-input" value={c.tr.note} onChange={(e) => c.setTr({ ...c.tr, note: e.target.value })} /></Field>
            </Grid>
            {c.branches.length < 2 && <Notice kind="info">Add a second branch or godown under My Company to move stock between places.</Notice>}
          </Form>
        </Card>
      )}

      {/* ── returns ── */}
      {tab === 'returns' && (
        <Card title={`Record a return at ${atBranch?.name ?? 'branch'}`} icon={Undo2}>
          <Form onSubmit={async () => { await c.saveReturn(); }} loading={c.saving} submitLabel="Record return">
            <Grid cols={2}>
              <Field label="Type">
                <select className="form-input" value={c.rt.kind} onChange={(e) => c.setRt({ ...c.rt, kind: e.target.value as 'sale' | 'purchase' })}>
                  <option value="sale">Sale return: a customer sends goods back (stock goes up)</option>
                  <option value="purchase">Purchase return: goods go back to a supplier (stock goes down)</option>
                </select>
              </Field>
              <Field label="Item" required>
                <select className="form-input" required value={c.rt.itemId} onChange={(e) => c.setRt({ ...c.rt, itemId: e.target.value })}>
                  <option value="">Select…</option>
                  {c.items.map((i) => <option key={i.id} value={i.id}>{i.name} — {i.stock} {i.unit} here</option>)}
                </select>
              </Field>
            </Grid>
            <Grid cols={3}>
              <Field label="Quantity" required>
                <input type="number" step="any" min="0" className="form-input" required value={c.rt.quantity} onChange={(e) => c.setRt({ ...c.rt, quantity: e.target.value })} />
              </Field>
              <Field label="Invoice / bill number"><input className="form-input" value={c.rt.reference} onChange={(e) => c.setRt({ ...c.rt, reference: e.target.value })} /></Field>
              <Field label="Note"><input className="form-input" value={c.rt.note} onChange={(e) => c.setRt({ ...c.rt, note: e.target.value })} /></Field>
            </Grid>
            <p className="form-hint">This records the stock movement only. It does not change an invoice, a payment or any amount.</p>
          </Form>
        </Card>
      )}
    </Page>
  );
}
