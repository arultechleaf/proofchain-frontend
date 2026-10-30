'use client';

/**
 * CONTROLLER — add stock from an uploaded invoice PDF. The server reads the PDF's item lines;
 * the user reviews them (which are goods, how many, which stock item) and confirms. Services such
 * as transport or installation are simply left unticked.
 */
import { useMemo, useState } from 'react';
import { useAsync } from '@/controllers/useAsync';
import { useAuth } from '@/lib/auth';
import { itemsApi } from '@/lib/api';
import { apiError } from '@/lib/utils';
import { companyService, type Branch } from '@/models/company';
import { inventoryService, type ParsedInvoice, type StockItem, type StockSummary } from '@/models/inventory';

export const NEW_ITEM = 'new';

export interface ImportRow {
  include: boolean;
  description: string;
  quantity: string;
  unit: string;
  rate: number | null;
  hsnCode: string | null;
  /** An existing item's id, or NEW_ITEM to create one from the description. */
  itemId: string;
}

type Message = { kind: 'success' | 'error'; text: string } | null;

const simplify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** Best existing item for an invoice line: same name, else one name contains the other. */
function matchItem(description: string, items: StockItem[]): StockItem | undefined {
  const d = simplify(description);
  if (!d) return undefined;
  return items.find((i) => simplify(i.name) === d)
    ?? items.find((i) => {
      const n = simplify(i.name);
      return n.length >= 4 && (d.includes(n) || n.includes(d));
    });
}

export function useInvoiceImportController() {
  const { user } = useAuth();
  const branches = useAsync<Branch[]>(() => companyService.branches(), []);
  const activeBranches = (branches.data ?? []).filter((b) => b.isActive);
  const defaultBranch = activeBranches.find((b) => b.isDefault) ?? activeBranches[0];
  const [branchId, setBranchId] = useState('');
  const effectiveBranch = branchId || (defaultBranch ? String(defaultBranch.id) : '');

  const summary = useAsync<StockSummary | null>(
    async () => (user?.companyId ? inventoryService.summary({ companyId: user.companyId }) : null),
    [user?.companyId],
  );
  const items = useMemo(() => (summary.data?.items ?? []).filter((i) => i.isActive), [summary.data]);

  const [fileName, setFileName] = useState('');
  const [invoice, setInvoice] = useState<ParsedInvoice | null>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Message>(null);

  const readFile = async (file: File) => {
    setMessage(null);
    setInvoice(null);
    setRows([]);
    setFileName(file.name);
    if (!/\.pdf$/i.test(file.name)) {
      setMessage({ kind: 'error', text: 'Choose a PDF file' });
      return;
    }
    setReading(true);
    try {
      const parsed = await inventoryService.parseInvoice(file);
      setInvoice(parsed);
      setRows(parsed.lines.map((l) => {
        const match = matchItem(l.description, items);
        return {
          include: !!l.quantity && l.quantity > 0,
          description: l.description,
          quantity: l.quantity != null ? String(l.quantity) : '',
          unit: l.unit ?? '',
          rate: l.rate,
          hsnCode: l.hsnCode,
          itemId: match ? String(match.id) : NEW_ITEM,
        };
      }));
    } catch (err) {
      setMessage({ kind: 'error', text: apiError(err, 'Could not read that PDF') });
    } finally {
      setReading(false);
    }
  };

  const updateRow = (index: number, patch: Partial<ImportRow>) =>
    setRows((current) => current.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  const chosen = rows.filter((r) => r.include);
  const invalid = chosen.some((r) => !(Number(r.quantity) > 0));

  const reset = () => { setInvoice(null); setRows([]); setFileName(''); };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      // create the items that do not exist yet, then add every quantity in one entry
      const quantities = new Map<number, number>();
      let created = 0;
      for (const r of chosen) {
        let id = Number(r.itemId);
        if (r.itemId === NEW_ITEM) {
          const made = (await itemsApi.create({
            name: r.description.slice(0, 150),
            unit: r.unit.slice(0, 20) || undefined,
            hsnCode: r.hsnCode?.slice(0, 20) || undefined,
            purchasePrice: r.rate ?? undefined,
          })).data.data;
          id = made.id;
          created += 1;
        }
        quantities.set(id, (quantities.get(id) ?? 0) + Number(r.quantity));
      }
      const note = `Invoice ${invoice?.invoiceNumber ?? fileName}${invoice?.seller ? ` · ${invoice.seller}` : ''}`.slice(0, 100);
      const res = await inventoryService.entry({
        branchId: effectiveBranch ? Number(effectiveBranch) : undefined,
        reason: 'purchase',
        note,
        lines: [...quantities].map(([itemId, change]) => ({ itemId, change })),
      });
      setMessage({
        kind: 'success',
        text: `Stock added for ${res.lines} item${res.lines === 1 ? '' : 's'} at ${res.branch}${created ? ` (${created} new item${created === 1 ? '' : 's'} created)` : ''}`,
      });
      reset();
      await summary.reload();
    } catch (err) {
      setMessage({ kind: 'error', text: apiError(err, 'Could not add the stock') });
    } finally {
      setSaving(false);
    }
  };

  return {
    branches: activeBranches, branchId: effectiveBranch, setBranchId, items,
    fileName, invoice, rows, updateRow, reading, saving, message, readFile, reset,
    chosenCount: chosen.length, invalid, save,
    ready: !!user?.companyId,
  };
}
