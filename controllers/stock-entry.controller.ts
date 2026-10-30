'use client';

/** CONTROLLER — stock entry (many items at once), transfers between branches, and returns. */
import { useMemo, useState } from 'react';
import { useAsync } from '@/controllers/useAsync';
import { useAuth } from '@/lib/auth';
import { apiError } from '@/lib/utils';
import { companyService, type Branch } from '@/models/company';
import { inventoryService, type StockSummary } from '@/models/inventory';

type Message = { kind: 'success' | 'error'; text: string } | null;

export function useStockEntryController() {
  const { user } = useAuth();
  const branches = useAsync<Branch[]>(() => companyService.branches(), []);
  const active = (branches.data ?? []).filter((b) => b.isActive);
  const defaultBranch = active.find((b) => b.isDefault) ?? active[0];

  const [branchId, setBranchId] = useState('');
  const effectiveBranch = branchId || (defaultBranch ? String(defaultBranch.id) : '');

  // Items of the signed-in user's own company, with the quantity at the chosen branch.
  const summary = useAsync<StockSummary | null>(
    async () => (user?.companyId ? inventoryService.summary({ companyId: user.companyId, branchId: effectiveBranch }) : null),
    [effectiveBranch, user?.companyId],
  );
  const items = useMemo(() => (summary.data?.items ?? []).filter((i) => i.isActive), [summary.data]);

  const [message, setMessage] = useState<Message>(null);
  const [saving, setSaving] = useState(false);

  const run = async (work: () => Promise<string>) => {
    setSaving(true);
    setMessage(null);
    try {
      setMessage({ kind: 'success', text: await work() });
      await summary.reload();
      return true;
    } catch (err) {
      setMessage({ kind: 'error', text: apiError(err, 'Could not save') });
      return false;
    } finally {
      setSaving(false);
    }
  };

  // ── bulk entry ──
  const [reason, setReason] = useState<'purchase' | 'adjustment' | 'opening'>('purchase');
  const [note, setNote] = useState('');
  const [qty, setQty] = useState<Record<number, string>>({});
  const [search, setSearch] = useState('');

  const filtered = items.filter((i) => !search.trim() || i.name.toLowerCase().includes(search.trim().toLowerCase()) || (i.sku ?? '').toLowerCase().includes(search.trim().toLowerCase()));
  const entered = Object.entries(qty).filter(([, v]) => v.trim() !== '' && Number(v) !== 0 && !Number.isNaN(Number(v)));

  const saveEntry = () => run(async () => {
    const res = await inventoryService.entry({
      branchId: effectiveBranch ? Number(effectiveBranch) : undefined, reason, note: note.trim() || undefined,
      lines: entered.map(([id, v]) => ({ itemId: Number(id), change: Number(v) })),
    });
    setQty({});
    return `${res.lines} item${res.lines === 1 ? '' : 's'} updated at ${res.branch}`;
  });

  // ── transfer ──
  const [tr, setTr] = useState({ itemId: '', toBranchId: '', quantity: '', note: '' });
  const saveTransfer = () => run(async () => {
    const r = await inventoryService.transfer({
      itemId: Number(tr.itemId), fromBranchId: Number(effectiveBranch), toBranchId: Number(tr.toBranchId), quantity: Number(tr.quantity), note: tr.note.trim() || undefined,
    });
    setTr({ itemId: '', toBranchId: '', quantity: '', note: '' });
    return `Moved. Now: ${r.branches.map((b) => `${b.code} ${b.quantity}`).join(' · ')}`;
  });

  // ── returns ──
  const [rt, setRt] = useState({ kind: 'sale' as 'sale' | 'purchase', itemId: '', quantity: '', reference: '', note: '' });
  const saveReturn = () => run(async () => {
    await inventoryService.returns({
      itemId: Number(rt.itemId), kind: rt.kind, quantity: Number(rt.quantity), branchId: effectiveBranch ? Number(effectiveBranch) : undefined,
      reference: rt.reference.trim() || undefined, note: rt.note.trim() || undefined,
    });
    setRt({ ...rt, itemId: '', quantity: '', reference: '', note: '' });
    return rt.kind === 'sale' ? 'Sale return recorded: stock added back' : 'Purchase return recorded: stock removed';
  });

  return {
    branches: active, branchId: effectiveBranch, setBranchId, loading: summary.loading || branches.loading, items, filtered,
    message, saving, clearMessage: () => setMessage(null),
    reason, setReason, note, setNote, qty, setQty, search, setSearch, entered: entered.length, saveEntry,
    tr, setTr, saveTransfer, rt, setRt, saveReturn,
  };
}
