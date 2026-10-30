'use client';

/** CONTROLLER — the Inventory page: stock per company / branch, low stock, and filterable stock history. */
import { useState } from 'react';
import { useAsync } from '@/controllers/useAsync';
import { useAuth } from '@/lib/auth';
import { canWrite } from '@/lib/roles';
import { apiError, downloadBlob } from '@/lib/utils';
import { inventoryService, type StockSummary } from '@/models/inventory';

export const MOVE_PAGE_SIZE = 15;

export function useInventoryController() {
  const { user } = useAuth();
  const acrossCompanies = user?.role === 'admin' || user?.role === 'auditor';

  const [companyId, setCompanyId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [reason, setReason] = useState('');
  const [itemId, setItemId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  const summary = useAsync<StockSummary>(() => inventoryService.summary({ companyId, branchId }), [companyId, branchId]);
  const moves = useAsync(
    () => inventoryService.movements({ companyId, branchId, reason, itemId, from, to, page, limit: MOVE_PAGE_SIZE }),
    [companyId, branchId, reason, itemId, from, to, page],
  );

  const data = summary.data;
  // branches offered in the filter: only those of the chosen company
  const branches = (data?.branches ?? []).filter((b) => !companyId || String(b.companyId) === companyId);
  const items = (data?.items ?? []).filter((i) => !companyId || String(i.companyId) === companyId);

  const exportCsv = async () => {
    setExporting(true);
    setError('');
    try {
      downloadBlob(await inventoryService.movementsCsv({ companyId, branchId, reason, itemId, from, to }), `stock-history-${Date.now()}.csv`);
    } catch (err) {
      setError(apiError(err, 'Could not export the stock history'));
    } finally {
      setExporting(false);
    }
  };

  const reset = (setter: (v: string) => void) => (v: string) => { setter(v); setPage(1); };

  return {
    summary: data, items, branches, loading: summary.loading, failed: !!summary.error,
    moves: moves.data?.rows ?? [], movesTotal: moves.data?.total ?? 0, movesLoading: moves.loading, page, setPage,
    acrossCompanies, canEnterStock: canWrite(user?.role), companies: data?.companies ?? [],
    companyId, branchId, reason, itemId, from, to,
    setCompanyId: (v: string) => { setCompanyId(v); setBranchId(''); setItemId(''); setPage(1); },
    setBranchId: reset(setBranchId), setReason: reset(setReason), setItemId: reset(setItemId), setFrom: reset(setFrom), setTo: reset(setTo),
    clearFilters: () => { setReason(''); setItemId(''); setFrom(''); setTo(''); setPage(1); },
    exportCsv, exporting, error,
  };
}

/** My Company > My inventory: the signed-in user's own company only, a short overview. */
export function useCompanyInventoryController() {
  const { user } = useAuth();
  const companyId = user?.companyId ?? '';
  const summary = useAsync<StockSummary | null>(async () => (companyId ? inventoryService.summary({ companyId }) : null), [companyId]);
  const moves = useAsync(async () => (companyId ? inventoryService.movements({ companyId, limit: 8 }) : { rows: [], total: 0 }), [companyId]);
  const data = summary.data;
  const lowItems = (data?.items ?? []).filter((i) => i.isActive && i.lowStock);
  return {
    summary: data, loading: summary.loading, failed: !!summary.error, lowItems, branches: data?.branches ?? [],
    moves: moves.data?.rows ?? [], movesLoading: moves.loading, canEnterStock: canWrite(user?.role), linked: !!companyId,
  };
}
