'use client';

/** VIEW — GST sales invoice / purchase bill form. State and calculations live in the controller. */
import { Suspense } from 'react';
import Link from 'next/link';
import { Plus, Receipt, Trash2 } from 'lucide-react';
import type { InvoiceType } from '@/models';
import { formatMoney } from '@/lib/utils';
import { GST_RATES, GST_STATES, UNITS, stateName } from '@/lib/gst';
import { Card, Field, Grid, Notice, Page, PageHeader, Spinner, SubmitButton } from '@/components/ui';
import { PAYMENT_TYPES, useInvoiceCreateController } from '@/controllers/invoice-create.controller';
import { INVOICE_COPY } from './InvoiceList';

function InvoiceForm({ type }: { type: InvoiceType }) {
  const copy = INVOICE_COPY[type];
  const c = useInvoiceCreateController(type);
  const t = c.totals;
  const partyWord = copy.party.toLowerCase();

  if (c.loading) return <Page><Spinner /></Page>;

  return (
    <Page>
      <PageHeader title={copy.newLabel} subtitle="GST invoice. A tamper-proof hash of it is registered on the blockchain when you save" backHref={copy.base} />
      <form onSubmit={(e) => { e.preventDefault(); c.submit(); }}>
        {c.error && <Notice kind="error">{c.error}</Notice>}
        {c.stockWarnings.map((w) => <Notice key={w} kind="info">{w}</Notice>)}

        {/* ── A. Invoice details ── */}
        <Card title="Invoice details" icon={Receipt} style={{ marginBottom: 18 }}>
          <Grid cols={4}>
            <Field label="Invoice number" hint={c.editNumber ? 'Must be unused. Leave empty to use the automatic number.' : 'Created automatically'}>
              <input className="form-input" autoComplete="off" readOnly={!c.editNumber}
                value={c.editNumber ? c.invoiceNumber : (c.numberLoading ? '' : c.nextNumber ?? '')}
                placeholder={c.numberLoading ? 'Loading…' : 'Auto'}
                onChange={(e) => c.setInvoiceNumber(e.target.value)} />
            </Field>
            <Field label="Invoice date" required>
              <input type="date" className="form-input" value={c.invoiceDate} onChange={(e) => c.setInvoiceDate(e.target.value)} required />
            </Field>
            <Field label={`${copy.party} name`} required>
              <input className="form-input" list="party-list" autoComplete="off" placeholder={`Search ${partyWord}…`}
                value={c.partyQuery} onChange={(e) => c.pickParty(e.target.value)} />
              <datalist id="party-list">{c.parties.map((p) => <option key={p.id} value={p.name} />)}</datalist>
              {c.parties.length === 0 && (
                <p className="form-hint">No {partyWord}s yet — <Link href="/parties/create" className="auth-link">add one</Link></p>
              )}
              {c.partyQuery && !c.partyId && <p className="form-hint">Pick one from the list</p>}
            </Field>
            <Field label="Due date">
              <input type="date" className="form-input" value={c.dueDate} min={c.invoiceDate} onChange={(e) => c.setDueDate(e.target.value)} />
            </Field>
          </Grid>

          <Grid cols={4} style={{ marginTop: 14 }}>
            <Field label={`${copy.party} mobile`}>
              <input className="form-input" value={c.customerMobile} onChange={(e) => c.setCustomerMobile(e.target.value)} placeholder="98450 00000" />
            </Field>
            <Field label={`${copy.party} GSTIN`} hint="Leave empty for an unregistered customer">
              <input className="form-input uppercase-input" maxLength={15} value={c.customerGstin}
                onChange={(e) => c.setCustomerGstin(e.target.value)} placeholder="29ABCDE1234F1Z5" />
            </Field>
            <Field label="Place of supply" hint={c.effectiveState ? `Using ${stateName(c.effectiveState) || c.effectiveState}` : 'Defaults to your own state'}>
              <select className="form-input" value={c.placeOfSupply} onChange={(e) => c.setPlaceOfSupply(e.target.value)}>
                <option value="">Auto (from GSTIN)</option>
                {GST_STATES.map(([code, name]) => <option key={code} value={code}>{code} · {name}</option>)}
              </select>
            </Field>
            <Field label="Payment type" required>
              <div className="seg">
                {PAYMENT_TYPES.map((p) => (
                  <button type="button" key={p.key} className={c.paymentType === p.key ? 'active' : undefined} onClick={() => c.setPaymentType(p.key)}>
                    {p.label}
                  </button>
                ))}
              </div>
            </Field>
          </Grid>

          <div style={{ marginTop: 14 }}>
            <Field label="Billing address">
              <textarea className="form-input" rows={2} value={c.billingAddress} onChange={(e) => c.setBillingAddress(e.target.value)} />
            </Field>
          </div>
          <button type="button" className="btn btn-ghost" style={{ marginTop: 6, padding: '2px 6px', fontSize: 12 }} onClick={c.toggleEditNumber}>
            {c.editNumber ? 'Use automatic number' : 'Change invoice number'}
          </button>
        </Card>

        {/* ── B. Product details ── */}
        <Card title="Product details" style={{ marginBottom: 18 }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="gst-table">
              <thead>
                <tr>
                  <th style={{ width: 200 }}>Product name</th>
                  <th style={{ width: 90 }}>SKU</th>
                  <th style={{ width: 90 }}>HSN / SAC</th>
                  <th style={{ width: 70 }}>Qty</th>
                  <th style={{ width: 80 }}>Unit</th>
                  <th style={{ width: 100 }}>Price / unit</th>
                  <th style={{ width: 130 }}>Discount</th>
                  <th style={{ width: 80 }}>GST %</th>
                  <th className="r" style={{ width: 100 }}>Taxable</th>
                  <th className="r" style={{ width: 90 }}>GST amt</th>
                  <th className="r" style={{ width: 110 }}>Line total</th>
                  <th style={{ width: 36 }} />
                </tr>
              </thead>
              <tbody>
                {c.lines.map((l, i) => {
                  const calc = c.calcs[i];
                  const rates = GST_RATES.includes(Number(l.taxRate)) ? GST_RATES : [...GST_RATES, Number(l.taxRate)];
                  const units = UNITS.includes(l.unit) ? UNITS : [...UNITS, l.unit];
                  return (
                    <tr key={l.key}>
                      <td>
                        <input className="cell-input" list="product-list" autoComplete="off" placeholder="Search product…" aria-label="Product name"
                          value={l.name} onChange={(e) => c.pickProduct(l.key, e.target.value)} />
                      </td>
                      <td><input className="cell-input" aria-label="SKU" value={l.sku} onChange={(e) => c.updateLine(l.key, { sku: e.target.value })} /></td>
                      <td><input className="cell-input" aria-label="HSN or SAC code" value={l.hsnCode} onChange={(e) => c.updateLine(l.key, { hsnCode: e.target.value })} /></td>
                      <td><input type="number" step="any" min="0" className="cell-input" aria-label="Quantity" value={l.quantity} onChange={(e) => c.updateLine(l.key, { quantity: e.target.value })} /></td>
                      <td>
                        <select className="cell-input" aria-label="Unit" value={l.unit} onChange={(e) => c.updateLine(l.key, { unit: e.target.value })}>
                          {units.map((u) => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </td>
                      <td><input type="number" step="0.01" min="0" className="cell-input" aria-label="Price per unit" value={l.rate} onChange={(e) => c.updateLine(l.key, { rate: e.target.value })} /></td>
                      <td>
                        <div className="disc-cell">
                          <input type="number" step="0.01" min="0" className="cell-input" aria-label="Discount" value={l.discountValue}
                            onChange={(e) => c.updateLine(l.key, { discountValue: e.target.value })} />
                          <select className="cell-input" aria-label="Discount type" value={l.discountType}
                            onChange={(e) => c.updateLine(l.key, { discountType: e.target.value as 'amount' | 'percent' })}>
                            <option value="amount">₹</option>
                            <option value="percent">%</option>
                          </select>
                        </div>
                        {calc.error && <p className="cell-error">{calc.error}</p>}
                      </td>
                      <td>
                        <select className="cell-input" aria-label="GST rate" value={l.taxRate} onChange={(e) => c.updateLine(l.key, { taxRate: e.target.value })}>
                          {rates.map((r) => <option key={r} value={String(r)}>{r}%</option>)}
                        </select>
                      </td>
                      <td className="r">{formatMoney(calc.taxableAmount)}</td>
                      <td className="r">{formatMoney(calc.gstAmount)}</td>
                      <td className="r strong">{formatMoney(calc.lineTotal)}</td>
                      <td>
                        {c.lines.length > 1 && (
                          <button type="button" className="btn btn-ghost" onClick={() => c.removeLine(l.key)} aria-label="Remove line">
                            <Trash2 size={15} color="#f87171" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <datalist id="product-list">{c.items.map((i) => <option key={i.id} value={i.name}>{i.sku ?? ''}</option>)}</datalist>
          <button type="button" className="btn btn-secondary" style={{ marginTop: 6 }} onClick={c.addLine}><Plus size={14} /> Add product</button>
        </Card>

        {/* ── C. Invoice totals ── */}
        <Grid cols="1.2fr 1fr" gap={18}>
          <Card title="Notes">
            <textarea className="form-input" rows={5} placeholder="Terms, delivery notes…" value={c.notes} onChange={(e) => c.setNotes(e.target.value)} />
            <p className="form-hint" style={{ marginTop: 10 }}>
              {c.kind === 'intra'
                ? 'Same state: GST is split into CGST + SGST.'
                : `Different state (${stateName(c.effectiveState) || c.effectiveState}): GST is charged as IGST.`}
            </p>
          </Card>
          <Card title="Totals">
            <div className="form-stack" style={{ fontSize: 14, gap: 9 }}>
              <div className="totals-row"><span>Subtotal</span><span>{formatMoney(t.subtotal)}</span></div>
              <div className="totals-row"><span>Discount</span><span>− {formatMoney(t.discount)}</span></div>
              <div className="totals-row"><span>Taxable value</span><span>{formatMoney(t.taxableValue)}</span></div>
              {c.kind === 'intra' ? (
                <>
                  <div className="totals-row"><span>CGST</span><span>{formatMoney(t.cgst)}</span></div>
                  <div className="totals-row"><span>SGST</span><span>{formatMoney(t.sgst)}</span></div>
                </>
              ) : (
                <div className="totals-row"><span>IGST</span><span>{formatMoney(t.igst)}</span></div>
              )}
              <div className="totals-row">
                <label className="form-check"><input type="checkbox" checked={c.roundOffOn} onChange={(e) => c.setRoundOffOn(e.target.checked)} /> Round off</label>
                <span>{t.roundOff >= 0 ? '+' : '−'} {formatMoney(Math.abs(t.roundOff))}</span>
              </div>
              <div className="totals-divider totals-row strong"><span>Grand total</span><span>{formatMoney(t.total)}</span></div>
              <div className="totals-row">
                <span>Amount {c.sale ? 'received' : 'paid'}</span>
                {c.paymentType === 'credit' ? (
                  <span className="text-muted">Credit — pay later</span>
                ) : (
                  <input type="number" step="0.01" min="0" max={t.total} className="form-input" style={{ width: 130, textAlign: 'right' }}
                    value={c.receivedText === '' ? String(c.received) : c.receivedText} onChange={(e) => c.setReceived(e.target.value)} aria-label="Amount received" />
                )}
              </div>
              <div className="totals-row strong"><span>Balance due</span><span style={{ color: c.balanceDue > 0 ? '#fbbf24' : '#34d399' }}>{formatMoney(c.balanceDue)}</span></div>
              <SubmitButton loading={c.submitting}><Receipt size={15} /> Save &amp; register proof</SubmitButton>
            </div>
          </Card>
        </Grid>
      </form>
    </Page>
  );
}

export function InvoiceCreate({ type }: { type: InvoiceType }) {
  // useSearchParams (preselected customer) needs a Suspense boundary in the app router.
  return <Suspense fallback={<Page><Spinner /></Page>}><InvoiceForm type={type} /></Suspense>;
}
