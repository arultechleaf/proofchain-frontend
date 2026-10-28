/**
 * GST invoice arithmetic for the live preview on the invoice form.
 * This is a mirror of backend/src/invoices/gst.ts, which is the authority: the server recalculates
 * everything when the invoice is saved. Keep the two in step.
 */
export type DiscountType = 'amount' | 'percent';
export type SupplyKind = 'intra' | 'inter';

export const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

export interface LineInput {
  quantity: number;
  rate: number;
  taxRate: number;
  discountType: DiscountType;
  discountValue: number;
}

export interface LineCalc {
  amount: number;
  discountAmount: number;
  taxableAmount: number;
  gstAmount: number;
  lineTotal: number;
  /** Set when the line cannot be calculated (e.g. discount above the line amount). */
  error?: string;
}

export function calcLine(l: LineInput): LineCalc {
  const amount = round2(l.quantity * l.rate);
  const value = l.discountValue || 0;
  let error: string | undefined;
  if (value < 0) error = 'Discount cannot be negative';
  else if (l.discountType === 'percent' && value > 100) error = 'Discount cannot be more than 100%';
  const raw = l.discountType === 'percent' ? (amount * value) / 100 : value;
  const discountAmount = round2(Math.min(Math.max(raw, 0), amount));
  if (!error && raw > amount + 0.004) error = 'Discount is more than the line amount';
  const taxableAmount = round2(amount - discountAmount);
  const gstAmount = round2((taxableAmount * l.taxRate) / 100);
  return { amount, discountAmount, taxableAmount, gstAmount, lineTotal: round2(taxableAmount + gstAmount), error };
}

export function stateCode(gstin?: string | null): string | null {
  const g = (gstin ?? '').trim();
  return /^\d{2}[0-9A-Za-z]{13}$/.test(g) ? g.slice(0, 2) : null;
}

/** Same state → CGST + SGST; different states → IGST. Unknown states count as the seller's own state. */
export function supplyKind(sellerGstin?: string | null, customerGstin?: string | null, placeOfSupply?: string | null): SupplyKind {
  const seller = stateCode(sellerGstin);
  const buyer = placeOfSupply?.trim() || stateCode(customerGstin);
  return seller && buyer && seller !== buyer ? 'inter' : 'intra';
}

export interface Totals {
  subtotal: number;
  discount: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  taxTotal: number;
  roundOff: number;
  total: number;
}

export function calcTotals(lines: LineCalc[], kind: SupplyKind, roundOffOn: boolean): Totals {
  const subtotal = round2(lines.reduce((s, l) => s + l.amount, 0));
  const discount = round2(lines.reduce((s, l) => s + l.discountAmount, 0));
  const taxableValue = round2(subtotal - discount);
  const gst = round2(lines.reduce((s, l) => s + l.gstAmount, 0));
  const cgst = kind === 'intra' ? round2(gst / 2) : 0;
  const sgst = kind === 'intra' ? round2(gst - cgst) : 0;
  const igst = kind === 'inter' ? gst : 0;
  const before = round2(taxableValue + gst);
  const roundOff = roundOffOn ? round2(Math.round(before) - before) : 0;
  return { subtotal, discount, taxableValue, cgst, sgst, igst, taxTotal: gst, roundOff, total: round2(before + roundOff) };
}

/** State names for the place-of-supply picker (GST state codes). */
export const GST_STATES: Array<[string, string]> = [
  ['01', 'Jammu & Kashmir'], ['02', 'Himachal Pradesh'], ['03', 'Punjab'], ['04', 'Chandigarh'], ['05', 'Uttarakhand'],
  ['06', 'Haryana'], ['07', 'Delhi'], ['08', 'Rajasthan'], ['09', 'Uttar Pradesh'], ['10', 'Bihar'], ['11', 'Sikkim'],
  ['12', 'Arunachal Pradesh'], ['13', 'Nagaland'], ['14', 'Manipur'], ['15', 'Mizoram'], ['16', 'Tripura'],
  ['17', 'Meghalaya'], ['18', 'Assam'], ['19', 'West Bengal'], ['20', 'Jharkhand'], ['21', 'Odisha'],
  ['22', 'Chhattisgarh'], ['23', 'Madhya Pradesh'], ['24', 'Gujarat'], ['26', 'Dadra & Nagar Haveli and Daman & Diu'],
  ['27', 'Maharashtra'], ['29', 'Karnataka'], ['30', 'Goa'], ['31', 'Lakshadweep'], ['32', 'Kerala'],
  ['33', 'Tamil Nadu'], ['34', 'Puducherry'], ['35', 'Andaman & Nicobar'], ['36', 'Telangana'], ['37', 'Andhra Pradesh'],
  ['38', 'Ladakh'],
];

export const stateName = (code?: string | null): string => GST_STATES.find(([c]) => c === code)?.[1] ?? '';

export const GST_RATES = [0, 0.25, 3, 5, 12, 18, 28];
export const UNITS = ['pcs', 'kg', 'g', 'ltr', 'ml', 'mtr', 'box', 'set', 'dozen', 'pack'];
