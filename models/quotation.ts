/** MODEL — quotations / estimates. */
import { quotationsApi } from '@/lib/api';
import type { Invoice, Party } from '@/models';

export type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'converted';

export interface QuotationLine {
  id: string;
  itemId?: string | null;
  description: string;
  quantity: number;
  rate: number;
  taxRate: number;
  amount: number;
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  partyId: string;
  party?: Party;
  quotationDate: string;
  validUntil?: string | null;
  lines: QuotationLine[];
  subtotal: number;
  taxTotal: number;
  discount: number;
  total: number;
  status: QuotationStatus;
  notes?: string | null;
  convertedInvoiceId?: string | null;
}

export interface QuotationList {
  rows: Quotation[];
  total: number;
}

export const QUOTATION_STATUS_TABS: Array<{ key: string; label: string }> = [
  { key: '', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'sent', label: 'Sent' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'converted', label: 'Converted' },
];

export interface QuotationPayload {
  partyId: string;
  quotationDate: string;
  validUntil?: string;
  discount?: number;
  notes?: string;
  lines: Array<{ itemId?: string; description?: string; quantity: number; rate: number; taxRate: number }>;
}

export const quotationService = {
  async list(q: { status?: string; search?: string; page: number; limit: number }): Promise<QuotationList> {
    const res = await quotationsApi.list({ status: q.status || undefined, search: q.search || undefined, page: q.page, limit: q.limit });
    return { rows: res.data.data ?? [], total: res.data.total ?? 0 };
  },
  async get(id: string): Promise<Quotation> {
    return (await quotationsApi.get(id)).data.data;
  },
  async create(payload: QuotationPayload): Promise<Quotation> {
    return (await quotationsApi.create(payload)).data.data;
  },
  async setStatus(id: string, status: Exclude<QuotationStatus, 'converted'>): Promise<Quotation> {
    return (await quotationsApi.setStatus(id, status)).data.data;
  },
  async remove(id: string): Promise<void> {
    await quotationsApi.remove(id);
  },
  async convert(id: string): Promise<{ quotation: Quotation; invoice: Invoice }> {
    return (await quotationsApi.convert(id)).data.data;
  },
};
