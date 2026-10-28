'use client';

/** VIEW — new quotation form. */
import { Suspense } from 'react';
import Link from 'next/link';
import { FileText } from 'lucide-react';
import { formatMoney } from '@/lib/utils';
import { Card, Field, Grid, Notice, Page, PageHeader, Spinner, SubmitButton } from '@/components/ui';
import { LineItemsCard } from '@/components/billing/LineItemsCard';
import { useCreateQuotationController } from '@/controllers/quotation.controller';

function CreateQuotationForm() {
  const c = useCreateQuotationController();
  const { totals } = c.lines;

  if (c.loading) return <Page><Spinner /></Page>;

  return (
    <Page>
      <PageHeader title="New Quotation" subtitle="Send an estimate; convert it to a sales invoice once the customer accepts" backHref="/quotations" />
      <form onSubmit={(e) => { e.preventDefault(); c.submit(); }}>
        {c.error && <Notice kind="error">{c.error}</Notice>}

        <Card style={{ marginBottom: 18 }}>
          <Grid cols={3}>
            <Field label="Customer" required>
              <select className="form-input" value={c.partyId} onChange={(e) => c.setPartyId(e.target.value)}>
                <option value="">Select…</option>
                {c.parties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {c.parties.length === 0 && (
                <p className="form-hint">No customers yet — <Link href="/parties/create" className="auth-link">add one</Link></p>
              )}
            </Field>
            <Field label="Date" required>
              <input type="date" className="form-input" value={c.quotationDate} onChange={(e) => c.setQuotationDate(e.target.value)} required />
            </Field>
            <Field label="Valid until">
              <input type="date" className="form-input" value={c.validUntil} min={c.quotationDate} onChange={(e) => c.setValidUntil(e.target.value)} />
            </Field>
          </Grid>
        </Card>

        <LineItemsCard
          items={c.items}
          lines={c.lines.lines}
          onUpdate={c.lines.update}
          onPickItem={c.lines.pickItem}
          onAdd={c.lines.add}
          onRemove={c.lines.remove}
        />

        <Grid cols="1.4fr 1fr" gap={18}>
          <Card title="Notes">
            <textarea className="form-input" rows={4} placeholder="Terms, delivery time, validity…" value={c.notes} onChange={(e) => c.setNotes(e.target.value)} />
          </Card>
          <Card>
            <div className="form-stack" style={{ fontSize: 14 }}>
              <div className="totals-row"><span>Subtotal</span><span>{formatMoney(totals.subtotal)}</span></div>
              <div className="totals-row"><span>Tax</span><span>{formatMoney(totals.tax)}</span></div>
              <div className="totals-row">
                <span>Discount</span>
                <input type="number" step="0.01" min="0" className="form-input" style={{ width: 120, textAlign: 'right' }}
                  value={c.discount} onChange={(e) => c.setDiscount(e.target.value)} aria-label="Discount" />
              </div>
              <div className="totals-divider totals-row strong"><span>Total</span><span>{formatMoney(totals.total)}</span></div>
              <SubmitButton loading={c.submitting}><FileText size={15} /> Save quotation</SubmitButton>
            </div>
          </Card>
        </Grid>
      </form>
    </Page>
  );
}

export default function CreateQuotationPage() {
  // useSearchParams (preselected customer) needs a Suspense boundary in the app router.
  return <Suspense fallback={<Page><Spinner /></Page>}><CreateQuotationForm /></Suspense>;
}
