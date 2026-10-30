/** MODEL — stock per branch / godown: summary, history, transfers, returns and bulk entry. */
import { itemsApi, type Id } from '@/lib/api';
import type { Item, StockMovement } from '@/models';

export interface BranchSummary {
  id: number;
  name: string;
  code: string;
  kind: 'branch' | 'godown';
  isDefault: boolean;
  isActive: boolean;
  companyId: number;
  itemCount: number;
  stockValue: number;
  retailValue: number;
}

export interface StockItem extends Item {
  reorderQuantity: number;
  /** Stock shown: the branch's quantity when a branch is chosen, otherwise the total. */
  totalStock: number;
  companyName: string | null;
  branchStock: Array<{ branchId: number; quantity: number }>;
  lowStock: boolean;
}

export interface StockSummary {
  items: StockItem[];
  totals: { itemCount: number; stockValue: number; retailValue: number; lowStockCount: number };
  branches: BranchSummary[];
  companies: Array<{ id: number; name: string }>;
}

export interface Movement extends Omit<StockMovement, 'reason'> {
  reason: string;
  branchId: number | null;
  branchName: string | null;
}

export interface MovementQuery {
  itemId?: number | string;
  branchId?: number | string;
  companyId?: number | string;
  reason?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface ItemBranches {
  itemId: number;
  total: number;
  unit: string;
  branches: Array<{ branchId: number; name: string; code: string; kind: string; isDefault: boolean; isActive: boolean; quantity: number }>;
}

export const REASON_LABEL: Record<string, string> = {
  opening: 'Opening stock', sale: 'Sale', purchase: 'Purchase', adjustment: 'Adjustment', cancelled: 'Cancelled',
  sale_return: 'Sale return', purchase_return: 'Purchase return', transfer_in: 'Transfer in', transfer_out: 'Transfer out',
};

/** Drop empty filters so they are not sent. */
const clean = (q: object) => Object.fromEntries(Object.entries(q).filter(([, v]) => v !== '' && v != null));

export const inventoryService = {
  async summary(q: { companyId?: number | string; branchId?: number | string } = {}): Promise<StockSummary> {
    return (await itemsApi.stockSummary(clean(q))).data.data;
  },
  async movements(q: MovementQuery = {}): Promise<{ rows: Movement[]; total: number }> {
    const res = await itemsApi.movements(clean(q));
    return { rows: res.data.data ?? [], total: res.data.total ?? 0 };
  },
  async movementsCsv(q: MovementQuery = {}): Promise<Blob> {
    return (await itemsApi.movementsCsv(clean({ ...q, page: undefined, limit: undefined }))).data;
  },
  async byBranch(itemId: Id): Promise<ItemBranches> {
    return (await itemsApi.branches(itemId)).data.data;
  },
  async transfer(body: { itemId: number; fromBranchId: number; toBranchId: number; quantity: number; note?: string }): Promise<ItemBranches> {
    return (await itemsApi.transfer(body)).data.data;
  },
  async returns(body: { itemId: number; kind: 'sale' | 'purchase'; quantity: number; branchId?: number; reference?: string; note?: string }) {
    return (await itemsApi.returns(body)).data.data;
  },
  async entry(body: { branchId?: number; reason: 'purchase' | 'adjustment' | 'opening'; note?: string; lines: Array<{ itemId: number; change: number }> }) {
    return (await itemsApi.entry(body)).data.data as { branch: string; lines: number };
  },
};
