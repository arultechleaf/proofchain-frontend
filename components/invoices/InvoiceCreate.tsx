'use client';

/** VIEW — GST sales invoice / purchase bill form. State and calculations live in the controller. */
import { Suspense, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Plus, Receipt, Trash2 } from 'lucide-react';
import type { InvoiceScreen } from '@/lib/api';
import { formatMoney } from '@/lib/utils';
import { GST_RATES, GST_STATES, UNITS, stateName } from '@/lib/gst';
import { Card, Field, Grid, Notice, Page, PageHeader, Spinner, SubmitButton, Select, Combobox } from '@/components/ui';
import { PAYMENT_TYPES, useInvoiceCreateController } from '@/controllers/invoice-create.controller';
import { INVOICE_COPY } from './InvoiceList';
import { UpiQr } from './UpiQr';

function InvoiceForm({ type }: { type: InvoiceScreen }) {
  const copy = INVOICE_COPY[type];
  const c = useInvoiceCreateController(type);
  const t = c.totals;
  const partyWord = copy.party.toLowerCase();

  // The error banner sits at the top of a long form: bring it into view so a failed payment is never silent.
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (c.error) errorRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, [c.error]);

  if (c.loading) return <Page><Spinner /></Page>;

  return (
    <Page>
      <PageHeader title={copy.newLabel} subtitle={c.gst ? 'GST invoice. A tamper-proof hash of it is registered on the blockchain when you save' : 'Non-GST sale: no tax is charged. A tamper-proof hash of it is registered on the blockchain when you save'} backHref={copy.base} />
      <form onSubmit={(e) => { e.preventDefault(); c.submit(); }}>
        <div ref={errorRef}>{c.error && <Notice kind="error">{c.error}</Notice>}</div>
        {c.paidSale && (
          <Notice kind="info">
            A payment of {formatMoney(c.paidSale.amount)} ({c.paidSale.paymentId}) is already taken by Razorpay. Do not pay again: press
            <strong> Save the paid sale</strong> to record it.
          </Notice>
        )}
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
              <Combobox className="form-input" placeholder={`Search ${partyWord}…`} value={c.partyQuery} onChange={c.pickParty}
                options={c.parties.map((p) => ({ value: p.name, hint: p.phone }))} />
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
            {c.gst && <Field label={`${copy.party} GSTIN`} hint="Leave empty for an unregistered customer">
              <input className="form-input uppercase-input" maxLength={15} value={c.customerGstin}
                onChange={(e) => c.setCustomerGstin(e.target.value)} placeholder="29ABCDE1234F1Z5" />
            </Field>}
            {c.gst && <Field label="Place of supply" hint={c.effectiveState ? `Using ${stateName(c.effectiveState) || c.effectiveState}` : 'Defaults to your own state'}>
              <Select className="form-input" value={c.placeOfSupply} onChange={(e) => c.setPlaceOfSupply(e.target.value)}>
                <option value="">Auto (from GSTIN)</option>
                {GST_STATES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
              </Select>
            </Field>}
            <Field label="Payment type" required>
              <div className="seg">
                {PAYMENT_TYPES.map((p) => (
                  <button type="button" key={p.key} className={c.paymentType === p.key ? 'active' : undefined} onClick={() => (p.key === 'upi' ? c.chooseUpi() : c.setPaymentType(p.key))}>
                    {p.label}
                  </button>
                ))}
              </div>
            </Field>
          </Grid>

          {c.online && (
            <div className="notice notice-info" style={{ display: 'block', marginTop: 14 }}>
              <p style={{ fontWeight: 600, marginBottom: 8 }}>Pay with Razorpay (UPI QR, apps, cards)</p>
              <Grid cols={3}>
                <Field label="Bank account to credit" required>
                  <Select className="form-input" value={c.accountId} onChange={(e) => c.setAccountId(e.target.value)} required>
                    <option value="">{c.accountsLoading ? 'Loading accounts…' : 'Select account…'}</option>
                    {c.paymentAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                  </Select>
                  {!c.accountsLoading && !c.accountsError && c.paymentAccounts.length === 0 && (
                    <p className="form-hint" style={{ color: '#f59e0b' }}>You have no bank account yet, and Razorpay needs one to credit. <Link href="/cash-bank" className="auth-link">Add a bank account in Cash &amp; Bank</Link>, then come back.</p>
                  )}
                </Field>
                <Field label="Amount to pay now (₹)" hint="Less than the total to take a part payment">
                  <input type="number" step="0.01" min="1" max={t.total} className="form-input"
                    value={c.onlineField} placeholder="0" onChange={(e) => c.setReceived(e.target.value)} />
                </Field>
              </Grid>
              <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap', margin: '14px 0 4px', padding: 14, borderRadius: 12, border: '1px dashed rgba(96,165,250,0.5)' }}>
                <UpiQr upiId={c.upiId} payee={c.upiPayee} amount={c.onlineAmount} note={c.nextNumber ?? 'Sale'} />
                <div style={{ flex: 1, minWidth: 220 }}>
                  <p style={{ margin: '0 0 6px', fontWeight: 600 }}>Customer scans the QR code?</p>
                  <p className="form-hint" style={{ margin: '0 0 10px' }}>The money goes straight to your UPI ID and is not confirmed automatically. After you see it arrive, save the sale as received.</p>
                  <button type="button" className="btn btn-secondary" disabled={c.submitting} onClick={() => void c.saveQrPaid()}>
                    Paid by QR: save sale as received
                  </button>
                </div>
              </div>
              <p className="form-hint" style={{ marginTop: 6 }}>Razorpay opens as soon as the customer, products and bank account are filled in (or press <strong>Pay with Razorpay &amp; save</strong> at the bottom). The sale is saved the moment the payment succeeds.</p>
            </div>
          )}

          {c.razorpayOff && (
            <Notice kind="info">
              Razorpay is not set up, so no payment window opens for UPI. Add <code>RAZORPAY_KEY_ID</code> and <code>RAZORPAY_KEY_SECRET</code> to
              the backend <code>.env</code> and restart it. Until then the UPI amount is recorded as received when you save.
            </Notice>
          )}

          {c.branches.length > 1 && (
            <div style={{ marginTop: 14 }}>
              <Field label={c.sale ? 'Stock goes out of' : 'Stock comes into'} hint="The branch or godown whose stock changes">
                <Select className="form-input" value={c.branchId} onChange={(e) => c.setBranchId(e.target.value)}>
                  <option value="">Default branch</option>
                  {c.branches.map((b) => <option key={b.id} value={b.id}>{b.name} ({b.code}){b.isDefault ? ' · default' : ''}</option>)}
                </Select>
              </Field>
            </div>
          )}

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
                  {c.gst && <th style={{ width: 90 }}>HSN / SAC</th>}
                  <th style={{ width: 70 }}>Qty</th>
                  <th style={{ width: 80 }}>Unit</th>
                  <th style={{ width: 100 }}>Price / unit</th>
                  <th style={{ width: 130 }}>Discount</th>
                  {c.gst && <th style={{ width: 80 }}>GST %</th>}
                  {c.gst && <th className="r" style={{ width: 100 }}>Taxable</th>}
                  {c.gst && <th className="r" style={{ width: 90 }}>GST amt</th>}
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
                      <td data-label="Product name">
                        <Combobox className="cell-input" placeholder="Search product…" aria-label="Product name" value={l.name}
                          onChange={(text) => c.pickProduct(l.key, text)} options={c.items.map((i) => ({ value: i.name, hint: i.sku }))} />
                      </td>
                      <td data-label="SKU"><input className="cell-input" aria-label="SKU" value={l.sku} onChange={(e) => c.updateLine(l.key, { sku: e.target.value })} /></td>
                      {c.gst && <td data-label="HSN / SAC"><input className="cell-input" aria-label="HSN or SAC code" value={l.hsnCode} onChange={(e) => c.updateLine(l.key, { hsnCode: e.target.value })} /></td>}
                      <td data-label="Qty"><input type="number" step="any" min="0" className="cell-input" aria-label="Quantity" value={l.quantity} onChange={(e) => c.updateLine(l.key, { quantity: e.target.value })} /></td>
                      <td data-label="Unit">
                        <Select className="cell-input" aria-label="Unit" value={l.unit} onChange={(e) => c.updateLine(l.key, { unit: e.target.value })}>
                          {units.map((u) => <option key={u} value={u}>{u}</option>)}
                        </Select>
                      </td>
                      <td data-label="Price / unit"><input type="number" step="0.01" min="0" className="cell-input" aria-label="Price per unit" value={l.rate} onChange={(e) => c.updateLine(l.key, { rate: e.target.value })} /></td>
                      <td data-label="Discount">
                        <div className="disc-cell">
                          <input type="number" step="0.01" min="0" className="cell-input" aria-label="Discount" value={l.discountValue}
                            onChange={(e) => c.updateLine(l.key, { discountValue: e.target.value })} />
                          <Select className="cell-input" aria-label="Discount type" value={l.discountType}
                            onChange={(e) => c.updateLine(l.key, { discountType: e.target.value as 'amount' | 'percent' })}>
                            <option value="amount">₹</option>
                            <option value="percent">%</option>
                          </Select>
                        </div>
                        {calc.error && <p className="cell-error">{calc.error}</p>}
                      </td>
                      {c.gst && <td data-label="GST %">
                        <Select className="cell-input" aria-label="GST rate" value={l.taxRate} onChange={(e) => c.updateLine(l.key, { taxRate: e.target.value })}>
                          {rates.map((r) => <option key={r} value={String(r)}>{r}%</option>)}
                        </Select>
                      </td>}
                      {c.gst && <td className="r" data-label="Taxable">{formatMoney(calc.taxableAmount)}</td>}
                      {c.gst && <td className="r" data-label="GST amt">{formatMoney(calc.gstAmount)}</td>}
                      <td className="r strong" data-label="Line total">{formatMoney(calc.lineTotal)}</td>
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
          <button type="button" className="btn btn-secondary" style={{ marginTop: 6 }} onClick={c.addLine}><Plus size={14} /> Add product</button>
        </Card>

        {/* ── C. Invoice totals ── */}
        <Grid cols="1.2fr 1fr" gap={18}>
          <Card title="Notes">
            <textarea className="form-input" rows={5} placeholder="Terms, delivery notes…" value={c.notes} onChange={(e) => c.setNotes(e.target.value)} />
            <p className="form-hint" style={{ marginTop: 10 }}>
              {!c.gst
                ? 'Non-GST sale: no tax is added. It is numbered separately from GST invoices.'
                : c.kind === 'intra'
                  ? 'Same state: GST is split into CGST + SGST.'
                  : `Different state (${stateName(c.effectiveState) || c.effectiveState}): GST is charged as IGST.`}
            </p>
          </Card>
          <Card title="Totals">
            <div className="form-stack" style={{ fontSize: 14, gap: 9 }}>
              <div className="totals-row"><span>Subtotal</span><span>{formatMoney(t.subtotal)}</span></div>
              <div className="totals-row"><span>Discount</span><span>− {formatMoney(t.discount)}</span></div>
              {c.gst && <div className="totals-row"><span>Taxable value</span><span>{formatMoney(t.taxableValue)}</span></div>}
              {!c.gst ? null : c.kind === 'intra' ? (
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
                ) : c.online ? (
                  <span className="text-muted">{formatMoney(c.onlineAmount)} via Razorpay after saving</span>
                ) : (
                  <input type="number" step="0.01" min="0" max={t.total} className="form-input" style={{ width: 130, textAlign: 'right' }}
                    value={c.receivedField} placeholder="0" onChange={(e) => c.setReceived(e.target.value)} aria-label="Amount received" />
                )}
              </div>
              {c.received > 0 && (c.paymentType === 'cash' || c.paymentType === 'bank') && (
                <Field label={`${c.paymentType === 'cash' ? 'Cash' : 'Bank'} account`} required>
                  <Select className="form-input" value={c.accountId} onChange={(e) => c.setAccountId(e.target.value)} required>
                    <option value="">{c.accountsLoading ? 'Loading accounts…' : 'Select account…'}</option>
                    {c.paymentAccounts.map((account) => (
                      <option key={account.id} value={account.id}>{account.name}</option>
                    ))}
                  </Select>
                  {c.accountsError && <p className="form-hint">Could not load accounts. Refresh the page and try again.</p>}
                  {!c.accountsLoading && !c.accountsError && c.paymentAccounts.length === 0 && (
                    <p className="form-hint">No active {c.paymentType} account. <Link href="/cash-bank" className="auth-link">Create one in Cash &amp; Bank</Link>.</p>
                  )}
                </Field>
              )}
              <div className="totals-row strong"><span>Balance due</span><span style={{ color: c.balanceDue > 0 ? '#fbbf24' : '#34d399' }}>{formatMoney(c.balanceDue)}</span></div>
              {c.error && <p className="form-hint" style={{ color: '#f87171', margin: 0 }}>{c.error}</p>}
              <SubmitButton loading={c.submitting}><Receipt size={15} /> {c.paidSale ? 'Save the paid sale' : c.online ? 'Pay with Razorpay & save' : 'Save & register proof'}</SubmitButton>
            </div>
          </Card>
        </Grid>
      </form>
    </Page>
  );
}

export function InvoiceCreate({ type }: { type: InvoiceScreen }) {
  // useSearchParams (preselected customer) needs a Suspense boundary in the app router.
  return <Suspense fallback={<Page><Spinner /></Page>}><InvoiceForm type={type} /></Suspense>;
}
