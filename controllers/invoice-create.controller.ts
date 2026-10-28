'use client';

/**
 * CONTROLLER — the GST sales invoice / purchase bill form.
 * Holds the form state, does the live GST calculation (lib/gst.ts), validates, and saves.
 * The server recalculates everything on save, so the numbers on screen are a preview.
 */
import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAsync } from '@/controllers/useAsync';
import { invoicesApi, itemsApi, partiesApi } from '@/lib/api';
import { apiError, todayIso } from '@/lib/utils';
import {
  calcLine, calcTotals, round2, stateCode, supplyKind, type DiscountType,
} from '@/lib/gst';
import type { InvoiceType, Item, Party } from '@/models';

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
const blankLine = (): LineState => ({
  key: nextKey++, itemId: '', name: '', sku: '', hsnCode: '', quantity: '1', unit: 'pcs',
  rate: '', discountType: 'amount', discountValue: '', taxRate: '0',
});

export const num = (s: string) => (s.trim() === '' || Number.isNaN(Number(s)) ? 0 : Number(s));

interface InvoiceContext {
  invoiceNumber: string;
  sellerGstin: string | null;
}

export function useInvoiceCreateController(type: InvoiceType) {
  const router = useRouter();
  const params = useSearchParams();
  const sale = type === 'sale';

  // ── A. invoice details ──
  const [partyId, setPartyId] = useState(params.get('partyId') ?? '');
  const [partyQuery, setPartyQuery] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(todayIso());
  const [dueDate, setDueDate] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerGstin, setCustomerGstin] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [placeOfSupply, setPlaceOfSupply] = useState('');
  const [paymentType, setPaymentTypeState] = useState<PaymentType>('cash');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [editNumber, setEditNumber] = useState(false);

  // ── B. products ──
  const [lines, setLines] = useState<LineState[]>([blankLine()]);

  // ── C. totals ──
  const [roundOffOn, setRoundOffOn] = useState(false);
  const [receivedText, setReceivedText] = useState('');
  const [receivedTouched, setReceivedTouched] = useState(false);
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const parties = useAsync<Party[]>(
    async () => (await partiesApi.list({ type: sale ? 'customer' : 'supplier', limit: 200 })).data.data,
    [type],
  );
  const items = useAsync<Item[]>(async () => (await itemsApi.list({ limit: 500 })).data.data, []);
  // The next number and the seller's GSTIN both come from the database.
  const context = useAsync<InvoiceContext | null>(async () => {
    try {
      return (await invoicesApi.nextNumber(type)).data.data;
    } catch {
      return null;
    }
  }, [type]);

  const partyList = parties.data ?? [];
  const itemList = items.data ?? [];

  const applyParty = (p: Party | undefined) => {
    setPartyId(p?.id ?? '');
    if (p) {
      setPartyQuery(p.name);
      setCustomerMobile(p.phone ?? '');
      setCustomerGstin(p.taxId ?? '');
      setBillingAddress([p.address, p.city].filter(Boolean).join(', '));
    }
  };

  // Preselected customer from ?partyId= (e.g. "New Sale" on a customer page).
  const [preselected, setPreselected] = useState(false);
  if (!preselected && partyId && partyList.length) {
    setPreselected(true);
    applyParty(partyList.find((p) => p.id === partyId));
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
          name: item.name, itemId: item.id, sku: item.sku ?? '', hsnCode: item.hsnCode ?? '', unit: item.unit || 'pcs',
          rate: String(sale ? item.salePrice : item.purchasePrice), taxRate: String(item.taxRate),
        }
      : { name: text, itemId: '' });
  };

  const setPaymentType = (t: PaymentType) => {
    setPaymentTypeState(t);
    setReceivedTouched(false);
    setReceivedText('');
  };

  // ── live calculation ──
  const sellerGstin = context.data?.sellerGstin ?? null;
  const kind = supplyKind(sellerGstin, customerGstin, placeOfSupply);
  const calcs = useMemo(
    () => lines.map((l) => calcLine({
      quantity: num(l.quantity), rate: num(l.rate), taxRate: num(l.taxRate),
      discountType: l.discountType, discountValue: num(l.discountValue),
    })),
    [lines],
  );
  const totals = useMemo(() => calcTotals(calcs, kind, roundOffOn), [calcs, kind, roundOffOn]);

  // Until the user types an amount, a cash / UPI / bank sale is taken as paid in full.
  const received = paymentType === 'credit' ? 0 : receivedTouched ? num(receivedText) : totals.total;
  const balanceDue = round2(totals.total - received);
  const effectiveState = placeOfSupply || stateCode(customerGstin) || stateCode(sellerGstin) || '';

  // Quantity per item across lines, to warn before the API rejects an oversell.
  const stockWarnings = useMemo(() => {
    if (!sale) return [];
    const demand = new Map<string, number>();
    for (const l of lines) if (l.itemId) demand.set(l.itemId, (demand.get(l.itemId) ?? 0) + num(l.quantity));
    return [...demand.entries()].flatMap(([id, qty]) => {
      const item = itemList.find((i) => i.id === id);
      return item && qty > item.stock ? [`${item.name}: only ${item.stock} ${item.unit} in stock (selling ${qty})`] : [];
    });
  }, [lines, itemList, sale]);

  const validate = (): string => {
    if (!partyId) return `Choose a ${sale ? 'customer' : 'supplier'} from the list`;
    if (customerGstin.trim() && !/^[0-9A-Za-z]{15}$/.test(customerGstin.trim())) return 'GSTIN must be 15 letters/digits';
    for (const [i, l] of lines.entries()) {
      if (!l.itemId && !l.name.trim()) return `Line ${i + 1}: choose a product or type a name`;
      if (num(l.quantity) <= 0) return `Line ${i + 1}: quantity must be greater than 0`;
      if (l.rate.trim() === '') return `Line ${i + 1}: enter the price per unit`;
      if (calcs[i].error) return `Line ${i + 1}: ${calcs[i].error}`;
    }
    if (received < 0) return 'Amount received cannot be negative';
    if (received > totals.total + 0.004) return 'Amount received cannot be more than the grand total';
    return '';
  };

  const submit = async () => {
    setError('');
    const problem = validate();
    if (problem) return setError(problem);
    setSubmitting(true);
    try {
      const res = await invoicesApi.create(type, {
        partyId,
        invoiceNumber: editNumber ? invoiceNumber.trim() || undefined : undefined,
        invoiceDate,
        dueDate: dueDate || undefined,
        paymentType,
        amountReceived: received > 0 ? received : undefined,
        customerMobile: customerMobile.trim() || undefined,
        customerGstin: customerGstin.trim().toUpperCase() || undefined,
        billingAddress: billingAddress.trim() || undefined,
        placeOfSupply: placeOfSupply || undefined,
        roundOff: roundOffOn || undefined,
        notes: notes.trim() || undefined,
        lines: lines.map((l) => ({
          itemId: l.itemId || undefined,
          description: l.name.trim() || undefined,
          sku: l.sku.trim() || undefined,
          hsnCode: l.hsnCode.trim() || undefined,
          unit: l.unit.trim() || undefined,
          quantity: num(l.quantity),
          rate: num(l.rate),
          taxRate: num(l.taxRate),
          discountType: l.discountType,
          discountValue: num(l.discountValue) || undefined,
        })),
      });
      router.push(`${sale ? '/sales' : '/purchases'}/${res.data.data.id}`);
    } catch (err) {
      setError(apiError(err, 'Could not create the document'));
      setSubmitting(false);
    }
  };

  return {
    sale,
    loading: parties.loading || items.loading,
    parties: partyList, items: itemList,
    // A
    partyId, partyQuery, pickParty,
    invoiceDate, setInvoiceDate, dueDate, setDueDate,
    customerMobile, setCustomerMobile, customerGstin, setCustomerGstin, billingAddress, setBillingAddress,
    placeOfSupply, setPlaceOfSupply, effectiveState,
    paymentType, setPaymentType,
    nextNumber: context.data?.invoiceNumber ?? null, numberLoading: context.loading,
    editNumber, toggleEditNumber: () => { setEditNumber((v) => !v); setInvoiceNumber(''); },
    invoiceNumber, setInvoiceNumber,
    // B
    lines, calcs,
    updateLine, pickProduct,
    addLine: () => setLines((ls) => [...ls, blankLine()]),
    removeLine: (key: number) => setLines((ls) => (ls.length > 1 ? ls.filter((l) => l.key !== key) : ls)),
    // C
    kind, totals, roundOffOn, setRoundOffOn,
    received, receivedText, setReceived: (v: string) => { setReceivedTouched(true); setReceivedText(v); },
    balanceDue,
    notes, setNotes,
    stockWarnings, submitting, error, submit,
  };
}
