'use client';

/**
 * CONTROLLER — the GST sales invoice / purchase bill form.
 * Holds the form state, does the live GST calculation (lib/gst.ts), validates, and saves.
 * The server recalculates everything on save, so the numbers on screen are a preview.
 */
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAsync } from '@/controllers/useAsync';
import { invoicesApi, itemsApi, partiesApi, paymentsApi, razorpayApi, type InvoiceScreen } from '@/lib/api';
import { apiError, formatMoney, todayIso } from '@/lib/utils';
import { loadRazorpayCheckout } from '@/lib/razorpay';
import {
  calcLine, calcTotals, round2, stateCode, supplyKind, type DiscountType,
} from '@/lib/gst';
import type { Item, Party, PaymentAccount } from '@/models';
import { companyService, type Branch } from '@/models/company';

export type PaymentType = 'cash' | 'upi' | 'bank' | 'credit';
export const PAYMENT_TYPES: Array<{ key: PaymentType; label: string }> = [
  { key: 'cash', label: 'Cash' },
  { key: 'upi', label: 'UPI' },
  { key: 'bank', label: 'Bank' },
  { key: 'credit', label: 'Credit' },
];

export interface LineState {
  key: number;
  itemId: string;
  /** What the user typed or picked in the Product Name box. */
  name: string;
  sku: string;
  hsnCode: string;
  quantity: string;
  unit: string;
  rate: string;
  discountType: DiscountType;
  discountValue: string;
  /** GST rate in percent. */
  taxRate: string;
}

let nextKey = 1;
const blankLine = (taxRate = '0'): LineState => ({
  key: nextKey++, itemId: '', name: '', sku: '', hsnCode: '', quantity: '1', unit: 'pcs',
  rate: '', discountType: 'amount', discountValue: '', taxRate,
});

/**
 * A sale Razorpay has been paid for but that could not be saved yet (network drop, stock changed…).
 * It is kept in localStorage so a refresh never makes the customer pay twice: saving is simply retried.
 */
interface PaidSale { screen: InvoiceScreen; payload: Record<string, unknown>; paymentId: string; amount: number }
const PAID_SALE_KEY = 'razorpay-unsaved-sale';
function readPaidSale(screen: InvoiceScreen): PaidSale | null {
  try {
    const saved = JSON.parse(localStorage.getItem(PAID_SALE_KEY) ?? 'null') as PaidSale | null;
    return saved && saved.screen === screen ? saved : null;
  } catch { return null; }
}
function writePaidSale(value: PaidSale | null) {
  try { if (value) localStorage.setItem(PAID_SALE_KEY, JSON.stringify(value)); else localStorage.removeItem(PAID_SALE_KEY); } catch { /* private mode */ }
}

export const num = (s: string) => (s.trim() === '' || Number.isNaN(Number(s)) ? 0 : Number(s));

interface InvoiceContext {
  invoiceNumber: string;
  sellerGstin: string | null;
}

export function useInvoiceCreateController(type: InvoiceScreen) {
  const router = useRouter();
  const params = useSearchParams();
  const sale = type !== 'purchase';
  /** A Non-GST sale has no GSTIN, HSN, place of supply or tax. */
  const gst = type !== 'non_gst_sale';

  // ── A. invoice details ──
  const [partyId, setPartyId] = useState(params.get('partyId') ?? '');
  const [partyQuery, setPartyQuery] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(todayIso());
  const [dueDate, setDueDate] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerGstin, setCustomerGstinState] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [placeOfSupply, setPlaceOfSupply] = useState('');
  const [paymentType, setPaymentTypeState] = useState<PaymentType>('cash');
  const [accountId, setAccountId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [editNumber, setEditNumber] = useState(false);

  // ── B. products ──
  const [lines, setLines] = useState<LineState[]>([blankLine()]);

  // ── C. totals ──
  const [roundOffOn, setRoundOffOn] = useState(false);
  const [receivedText, setReceivedText] = useState('');
  const [receivedTouched, setReceivedTouched] = useState(false);
  const [notes, setNotes] = useState('');
  const [branchId, setBranchId] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [paidSale, setPaidSale] = useState<PaidSale | null>(() => (typeof window === 'undefined' ? null : readPaidSale(type)));

  const parties = useAsync<Party[]>(
    async () => (await partiesApi.list({ type: sale ? 'customer' : 'supplier', limit: 200 })).data.data,
    [type],
  );
  const accounts = useAsync<PaymentAccount[]>(
    async () => (await paymentsApi.accounts()).data.data,
    [],
  );
  // With Razorpay set up, choosing UPI on a sale means "pay online": the sale is saved, then Razorpay Checkout opens.
  const razorpay = useAsync<{ enabled: boolean } | null>(async () => { try { return (await razorpayApi.config()).data.data; } catch { return null; } }, []);
  const items = useAsync<Item[]>(async () => (await itemsApi.list({ limit: 500 })).data.data, []);
  // The next number and the seller's GSTIN both come from the database.
  const context = useAsync<InvoiceContext | null>(async () => {
    try {
      return (await invoicesApi.nextNumber(type)).data.data;
    } catch {
      return null;
    }
  }, [type]);

  // GST % a blank line starts with (My company > Bank & invoice settings); applied once to the untouched first line
  const companySettings = useAsync<{ defaultTaxRate: number; upiId?: string | null; accountHolder?: string | null; bankName?: string | null } | null>(async () => { try { return await companyService.settings(); } catch { return null; } }, []);
  const defaultTax = String(companySettings.data?.defaultTaxRate ?? 0);
  const [taxApplied, setTaxApplied] = useState(false);
  if (!taxApplied && companySettings.data) {
    setTaxApplied(true);
    if (companySettings.data.defaultTaxRate) setLines((ls) => ls.map((l) => (!l.name && !l.rate && l.taxRate === '0' ? { ...l, taxRate: defaultTax } : l)));
  }

  // where the stock moves: the default branch unless the company has several and one is chosen
  const branchesList = useAsync<Branch[]>(async () => { try { return (await companyService.branches()).filter((b) => b.isActive); } catch { return []; } }, []);

  const partyList = parties.data ?? [];
  const itemList = items.data ?? [];

  const setCustomerGstin = setCustomerGstinState;
  const applyParty = (p: Party | undefined) => {
    setPartyId(p ? String(p.id) : '');
    if (p) {
      setPartyQuery(p.name);
      setCustomerMobile(p.phone ?? '');
      setCustomerGstin(gst ? (p.taxId ?? '') : '');
      setBillingAddress([p.address, p.city].filter(Boolean).join(', '));
    }
  };

  // Preselected customer from ?partyId= (e.g. "New Sale" on a customer page).
  const [preselected, setPreselected] = useState(false);
  if (!preselected && partyId && partyList.length) {
    setPreselected(true);
    applyParty(partyList.find((p) => String(p.id) === partyId));
  }

  const pickParty = (text: string) => {
    setPartyQuery(text);
    const match = partyList.find((p) => p.name.toLowerCase() === text.trim().toLowerCase());
    if (match) applyParty(match);
    else setPartyId('');
  };

  const updateLine = (key: number, patch: Partial<LineState>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  /** Typing a product name: an exact match fills SKU, HSN, unit, price and GST from the item. */
  const pickProduct = (key: number, text: string) => {
    const item = itemList.find((i) => i.name.toLowerCase() === text.trim().toLowerCase());
    updateLine(key, item
      ? {
          name: item.name, itemId: String(item.id), sku: item.sku ?? '', hsnCode: item.hsnCode ?? '', unit: item.unit || 'pcs',
          rate: String(sale ? item.salePrice : item.purchasePrice), taxRate: gst ? String(item.taxRate) : '0',
        }
      : { name: text, itemId: '' });
  };

  const setPaymentType = (t: PaymentType) => {
    setPaymentTypeState(t);
    setAccountId('');
    setReceivedTouched(false);
    setReceivedText('');
  };

  // ── live calculation ──
  const sellerGstin = context.data?.sellerGstin ?? null;
  const kind = supplyKind(sellerGstin, customerGstin, placeOfSupply);
  const calcs = useMemo(
    () => lines.map((l) => calcLine({
      quantity: num(l.quantity), rate: num(l.rate), taxRate: gst ? num(l.taxRate) : 0,
      discountType: l.discountType, discountValue: num(l.discountValue),
    })),
    [lines, gst],
  );
  const totals = useMemo(() => calcTotals(calcs, kind, roundOffOn), [calcs, kind, roundOffOn]);

  // Until the user types an amount, a cash / UPI / bank sale is taken as paid in full.
  const online = sale && paymentType === 'upi' && !!razorpay.data?.enabled;
  // load checkout.js as soon as UPI is chosen, so the window opens without a delay after saving
  useEffect(() => { if (online) loadRazorpayCheckout().catch(() => undefined); }, [online]);
  // a single bank account is chosen for the user
  const bankAccounts = (accounts.data ?? []).filter((a) => a.accountType === 'bank');
  if (online && !accountId && bankAccounts.length === 1) setAccountId(String(bankAccounts[0].id));
  // what Razorpay is asked to collect now: the full total unless the user types a smaller amount
  const onlineAmount = round2(receivedTouched ? num(receivedText) : totals.total);
  const received = paymentType === 'credit' || online ? 0 : receivedTouched ? num(receivedText) : totals.total;
  const balanceDue = round2(totals.total - received);
  const effectiveState = placeOfSupply || stateCode(customerGstin) || stateCode(sellerGstin) || '';

  // Quantity per item across lines, to warn before the API rejects an oversell.
  const stockWarnings = useMemo(() => {
    if (!sale) return [];
    const demand = new Map<string, number>();
    for (const l of lines) if (l.itemId) demand.set(l.itemId, (demand.get(l.itemId) ?? 0) + num(l.quantity));
    return [...demand.entries()].flatMap(([id, qty]) => {
      const item = itemList.find((i) => String(i.id) === id);
      return item && qty > item.stock ? [`${item.name}: only ${item.stock} ${item.unit} in stock (selling ${qty})`] : [];
    });
  }, [lines, itemList, sale]);

  const validate = (opts: { qr?: boolean } = {}): string => {
    if (!partyId) return `Choose a ${sale ? 'customer' : 'supplier'} from the list`;
    if (gst && customerGstin.trim() && !/^[0-9A-Za-z]{15}$/.test(customerGstin.trim())) return 'GSTIN must be 15 letters/digits';
    for (const [i, l] of lines.entries()) {
      if (!l.itemId && !l.name.trim()) return `Line ${i + 1}: choose a product or type a name`;
      if (num(l.quantity) <= 0) return `Line ${i + 1}: quantity must be greater than 0`;
      if (l.rate.trim() === '') return `Line ${i + 1}: enter the price per unit`;
      if (calcs[i].error) return `Line ${i + 1}: ${calcs[i].error}`;
    }
    if (online && !opts.qr && !accountId) return 'Select the bank account that will receive the UPI payment';
    if (online && onlineAmount < 1) return 'Minimum online payment is ₹1';
    if (online && onlineAmount > totals.total + 0.004) return 'The online amount cannot be more than the grand total';
    if (received < 0) return 'Amount received cannot be negative';
    if (received > totals.total + 0.004) return 'Amount received cannot be more than the grand total';
    if (received > 0 && (paymentType === 'cash' || paymentType === 'bank') && !accountId) {
      return `Select a ${paymentType} account for this payment`;
    }
    return '';
  };

  const buildPayload = (): Record<string, unknown> => ({
    partyId,
    invoiceNumber: editNumber ? invoiceNumber.trim() || undefined : undefined,
    invoiceDate,
    dueDate: dueDate || undefined,
    paymentType,
    accountId: received > 0 && (paymentType === 'cash' || paymentType === 'bank') ? Number(accountId) : undefined,
    amountReceived: received > 0 ? received : undefined,
    customerMobile: customerMobile.trim() || undefined,
    customerGstin: gst ? customerGstin.trim().toUpperCase() || undefined : undefined,
    billingAddress: billingAddress.trim() || undefined,
    placeOfSupply: gst ? placeOfSupply || undefined : undefined,
    roundOff: roundOffOn || undefined,
    notes: notes.trim() || undefined,
    branchId: branchId ? Number(branchId) : undefined,
    lines: lines.map((l) => ({
      itemId: l.itemId || undefined,
      description: l.name.trim() || undefined,
      sku: l.sku.trim() || undefined,
      hsnCode: gst ? l.hsnCode.trim() || undefined : undefined,
      unit: l.unit.trim() || undefined,
      quantity: num(l.quantity),
      rate: num(l.rate),
      taxRate: gst ? num(l.taxRate) : 0,
      discountType: l.discountType,
      discountValue: num(l.discountValue) || undefined,
    })),
  });

  const saveInvoice = async (payload: Record<string, unknown>) => {
    const res = await invoicesApi.create(type, payload);
    writePaidSale(null);
    setPaidSale(null);
    const base = type === 'purchase' ? '/purchases' : gst ? '/sales' : '/non-gst-sales';
    router.push(`${base}/${res.data.data.id}`);
  };

  /** Save a sale that is already paid for, with the payment details kept from before. Safe to repeat. */
  const savePaidSale = async (taken: PaidSale) => {
    setSubmitting(true);
    try {
      await saveInvoice(taken.payload);
    } catch (err) {
      setError(`Razorpay took ${formatMoney(taken.amount)} (${taken.paymentId}) but the sale could not be saved: ${apiError(err)}. Do not pay again. Fix the problem and press "Save the paid sale".`);
      setSubmitting(false);
    }
  };

  /** The customer paid by scanning the UPI QR code: save the sale as already received by UPI (no Razorpay). */
  const saveQrPaid = async () => {
    setError('');
    const problem = validate({ qr: true });
    if (problem) return setError(problem);
    setSubmitting(true);
    try {
      await saveInvoice({ ...buildPayload(), paymentType: 'upi', accountId: undefined, amountReceived: onlineAmount });
    } catch (err) {
      setError(apiError(err, 'Could not create the document'));
      setSubmitting(false);
    }
  };

  const submit = async (): Promise<void> => {
    setError('');
    if (paidSale) return savePaidSale(paidSale);
    const problem = validate();
    if (problem) return setError(problem);
    setSubmitting(true);
    try {
      const payload = buildPayload();
      if (!online) return await saveInvoice(payload);

      // Pay first: Razorpay opens now, and the sale is saved the moment the payment succeeds.
      const order = (await razorpayApi.createDraftOrder({ partyId: Number(partyId), accountId: Number(accountId), amount: onlineAmount })).data.data;
      await loadRazorpayCheckout();
      let paid = false;
      const checkout = new window.Razorpay!({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: order.merchantName || 'ProofChain',
        description: 'New sale',
        prefill: order.customer,
        theme: { color: '#2563eb' },
        handler: (response) => {
          paid = true;
          // kept before saving: if the page closes mid-request the payment is not lost
          const taken: PaidSale = {
            screen: type, paymentId: response.razorpay_payment_id, amount: onlineAmount,
            payload: {
              ...payload,
              paymentType: 'upi', accountId: undefined, amountReceived: undefined,
              razorpay: { orderId: response.razorpay_order_id, paymentId: response.razorpay_payment_id, signature: response.razorpay_signature },
            },
          };
          writePaidSale(taken);
          setPaidSale(taken);
          void savePaidSale(taken);
        },
        modal: {
          ondismiss: () => {
            if (paid) return; // closed after paying; saving is already running
            setSubmitting(false);
            setError('Payment window closed. No money was taken and nothing was saved.');
          },
        },
      });
      checkout.on('payment.failed', (r) => {
        // the window stays open so the customer can try another method
        setError(`Payment failed: ${r.error.description}${r.error.reason ? ` (${r.error.reason.replace(/_/g, ' ')})` : ''}. You can try another method.`);
      });
      checkout.open();
    } catch (err) {
      setError(apiError(err, 'Could not create the document'));
      setSubmitting(false);
    }
  };

  // Clicking UPI opens Razorpay straight away when the sale is ready (customer, products and bank account filled in).
  // Otherwise nothing opens and no error is shown; the Pay button at the bottom does it once the form is filled in.
  const [payRequested, setPayRequested] = useState(false);
  useEffect(() => {
    if (!payRequested || razorpay.loading) return;
    setPayRequested(false);
    // clicking UPI on an unfinished form is not an error: only open Razorpay when the sale is complete
    if (online && !submitting && !validate()) void submit();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payRequested, razorpay.loading, online]);
  const chooseUpi = () => { setPaymentType('upi'); if (sale && !paidSale) setPayRequested(true); };

  return {
    sale, gst, online, onlineAmount, paidSale, chooseUpi, saveQrPaid,
    upiId: companySettings.data?.upiId ?? null,
    upiPayee: companySettings.data?.accountHolder || companySettings.data?.bankName || 'ProofChain',
    /** UPI chosen but Razorpay keys are missing on the server, so no payment window can open. */
    razorpayOff: sale && paymentType === 'upi' && !razorpay.loading && !razorpay.data?.enabled,
    loading: parties.loading || items.loading,
    parties: partyList, items: itemList,
    // A
    partyId, partyQuery, pickParty,
    invoiceDate, setInvoiceDate, dueDate, setDueDate,
    customerMobile, setCustomerMobile, customerGstin, setCustomerGstin, billingAddress, setBillingAddress,
    placeOfSupply, setPlaceOfSupply, effectiveState,
    paymentType, setPaymentType,
    accountId, setAccountId,
    paymentAccounts: (accounts.data ?? []).filter((a) => a.accountType === (paymentType === 'cash' ? 'cash' : 'bank')),
    accountsLoading: accounts.loading,
    accountsError: !!accounts.error,
    nextNumber: context.data?.invoiceNumber ?? null, numberLoading: context.loading,
    editNumber, toggleEditNumber: () => { setEditNumber((v) => !v); setInvoiceNumber(''); },
    invoiceNumber, setInvoiceNumber,
    // B
    lines, calcs,
    updateLine, pickProduct,
    addLine: () => setLines((ls) => [...ls, blankLine(defaultTax)]),
    removeLine: (key: number) => setLines((ls) => (ls.length > 1 ? ls.filter((l) => l.key !== key) : ls)),
    // C
    kind, totals, roundOffOn, setRoundOffOn,
    // what the amount boxes show: the figure until the user types, then exactly what they typed (so it can be cleared)
    receivedField: receivedTouched ? receivedText : (received > 0 ? String(received) : ''),
    onlineField: receivedTouched ? receivedText : (onlineAmount > 0 ? String(onlineAmount) : ''),
    received, receivedText, setReceived: (v: string) => { setReceivedTouched(true); setReceivedText(v); },
    balanceDue,
    notes, setNotes,
    branches: branchesList.data ?? [], branchId, setBranchId,
    stockWarnings, submitting, error, submit,
  };
}
