'use client';

/**
 * CONTROLLER — the editable list of document lines (item, qty, rate, tax) and its totals.
 * Used by the quotation form; the layout lives in components/billing/LineItemsCard.tsx.
 */
import { useMemo, useState } from 'react';

export interface LineState {
  key: number;
  itemId: string;
  description: string;
  quantity: string;
  rate: string;
  taxRate: string;
}

export interface PriceableItem {
  id: number;
  name: string;
  salePrice: number;
  taxRate: number;
}

let nextKey = 1;
export const blankLine = (): LineState => ({ key: nextKey++, itemId: '', description: '', quantity: '1', rate: '', taxRate: '0' });

export const num = (s: string) => (s.trim() === '' || Number.isNaN(Number(s)) ? 0 : Number(s));
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function useLineItems(items: PriceableItem[], discount: string) {
  const [lines, setLines] = useState<LineState[]>([blankLine()]);
  const byId = useMemo(() => new Map(items.map((i) => [String(i.id), i])), [items]);

  const update = (key: number, patch: Partial<LineState>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const pickItem = (key: number, itemId: string) => {
    const item = byId.get(itemId);
    update(key, item
      ? { itemId, description: item.name, rate: String(item.salePrice), taxRate: String(item.taxRate) }
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

  /** First problem found, or '' when the lines are fine. */
  const validate = (): string => {
    if (num(discount) > totals.subtotal + totals.tax) return 'Discount cannot exceed the total';
    for (const [i, l] of lines.entries()) {
      if (!l.itemId && !l.description.trim()) return `Line ${i + 1}: choose an item or enter a description`;
      if (num(l.quantity) <= 0) return `Line ${i + 1}: quantity must be greater than 0`;
      if (l.rate.trim() === '') return `Line ${i + 1}: enter a rate`;
    }
    return '';
  };

  const payload = () =>
    lines.map((l) => ({
      itemId: l.itemId || undefined,
      description: l.description.trim() || undefined,
      quantity: num(l.quantity),
      rate: num(l.rate),
      taxRate: num(l.taxRate),
    }));

  return {
    lines, update, pickItem, totals, validate, payload,
    add: () => setLines((ls) => [...ls, blankLine()]),
    remove: (key: number) => setLines((ls) => ls.filter((l) => l.key !== key)),
  };
}
