/**
 * MODEL — customers & suppliers.
 * Owns the data shapes, the form <-> API mapping and the API calls. No React, no UI.
 */
import { partiesApi, type Id } from '@/lib/api';
import type { Invoice, Party, PartySummary, Payment, PartyType } from '@/models';

export type { Party, PartySummary, PartyType };

export const PARTY_TYPE_LABEL: Record<string, string> = {
  customer: 'Customer',
  supplier: 'Supplier',
  both: 'Customer & Supplier',
};

export interface PartyFormValues {
  name: string;
  partyType: PartyType;
  phone: string;
  email: string;
  taxId: string;
  city: string;
  address: string;
  openingBalance: number;
}

export interface PartyList {
  rows: Party[];
  total: number;
}

export interface PartyLedger {
  party: Party;
  invoices: Invoice[];
  payments: Payment[];
  summary: PartySummary;
}

export interface PartyListQuery {
  type?: string;
  search?: string;
  page: number;
  limit: number;
}

export function partyToForm(p?: Party): PartyFormValues {
  return {
    name: p?.name ?? '',
    partyType: p?.partyType ?? 'customer',
    phone: p?.phone ?? '',
    email: p?.email ?? '',
    taxId: p?.taxId ?? '',
    city: p?.city ?? '',
    address: p?.address ?? '',
    openingBalance: p?.openingBalance ?? 0,
  };
}

/** Empty optional fields are sent as undefined so the API leaves them unset. */
export function formToPartyPayload(v: PartyFormValues) {
  const opt = (s: string) => (s.trim() ? s.trim() : undefined);
  return {
    name: v.name.trim(),
    partyType: v.partyType,
    phone: opt(v.phone),
    email: opt(v.email),
    taxId: opt(v.taxId),
    city: opt(v.city),
    address: opt(v.address),
    openingBalance: Number(v.openingBalance) || 0,
  };
}

/** Positive balance: they owe us. Negative: we owe them. */
export function balanceInfo(balance: number) {
  return {
    color: balance > 0 ? '#34d399' : balance < 0 ? '#f87171' : '#94a3b8',
    hint: balance > 0 ? 'To receive' : balance < 0 ? 'To pay' : 'Settled',
  };
}

export const partyService = {
  async list(q: PartyListQuery): Promise<PartyList> {
    const res = await partiesApi.list({ type: q.type || undefined, search: q.search || undefined, page: q.page, limit: q.limit });
    return { rows: res.data.data ?? [], total: res.data.total ?? 0 };
  },
  async get(id: Id): Promise<PartyLedger> {
    return (await partiesApi.get(id)).data.data;
  },
  async create(values: PartyFormValues): Promise<Party> {
    return (await partiesApi.create(formToPartyPayload(values))).data.data;
  },
  async remove(id: Id): Promise<void> {
    await partiesApi.remove(id);
  },
  async update(id: Id, values: PartyFormValues): Promise<Party> {
    return (await partiesApi.update(id, formToPartyPayload(values))).data.data;
  },
};
