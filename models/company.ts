/** MODEL — the signed-in user's own company: profile, bank & invoice settings, branches, team. */
import { companyApi, type Id } from '@/lib/api';
import type { User } from '@/models';
import type { UserAccess, AccessLevel } from '@/models/role-permission';

export interface CompanyProfile {
  id: number;
  name: string;
  organizationCode: string;
  organizationType: string;
  description: string | null;
  gstin: string | null;
  pan: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logoUrl: string | null;
}

export interface CompanySettings {
  bankName: string | null;
  accountHolder: string | null;
  accountNumber: string | null;
  ifscCode: string | null;
  bankBranch: string | null;
  upiId: string | null;
  salesPrefix: string;
  purchasePrefix: string;
  defaultTaxRate: number;
  currency: string;
  paymentTermsDays: number;
  terms: string | null;
  invoiceNotes: string | null;
  invoiceFooter: string | null;
}

export interface Branch {
  id: number;
  name: string;
  code: string;
  kind: 'branch' | 'godown';
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  phone: string | null;
  email: string | null;
  contactPerson: string | null;
  isDefault: boolean;
  isActive: boolean;
}

export type BranchForm = {
  name: string; code: string; kind: string; address: string; city: string; state: string; pincode: string;
  phone: string; email: string; contactPerson: string; isDefault: boolean; isActive: boolean;
};

export const blankBranch = (): BranchForm => ({
  name: '', code: '', kind: 'branch', address: '', city: '', state: '', pincode: '', phone: '', email: '', contactPerson: '', isDefault: false, isActive: true,
});

export const branchToForm = (b: Branch): BranchForm => ({
  name: b.name, code: b.code, kind: b.kind, address: b.address ?? '', city: b.city ?? '', state: b.state ?? '', pincode: b.pincode ?? '',
  phone: b.phone ?? '', email: b.email ?? '', contactPerson: b.contactPerson ?? '', isDefault: b.isDefault, isActive: b.isActive,
});

export interface TeamRole { id: number; key: string; name: string; isSystem: boolean }

/** Blank strings are sent as '' so a value can be cleared. */
const text = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v]));

export const companyService = {
  async profile(): Promise<CompanyProfile> { return (await companyApi.profile()).data.data; },
  async saveProfile(v: Partial<CompanyProfile>): Promise<CompanyProfile> {
    const { id: _i, organizationCode: _c, organizationType: _t, ...rest } = v;
    return (await companyApi.updateProfile(text(Object.fromEntries(Object.entries(rest).map(([k, x]) => [k, x ?? ''])) as Record<string, unknown>))).data.data;
  },
  async settings(): Promise<CompanySettings> { return (await companyApi.settings()).data.data; },
  async saveSettings(v: Partial<CompanySettings>): Promise<CompanySettings> {
    const body = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, x ?? '']));
    return (await companyApi.updateSettings(text(body))).data.data;
  },
  async branches(): Promise<Branch[]> { return (await companyApi.branches()).data.data; },
  async saveBranch(id: Id | null, v: BranchForm): Promise<Branch> {
    const body = text(v as unknown as Record<string, unknown>);
    return (id ? await companyApi.updateBranch(id, body) : await companyApi.createBranch(body)).data.data;
  },
  async removeBranch(id: Id): Promise<void> { await companyApi.removeBranch(id); },
  async team(): Promise<User[]> { return (await companyApi.team()).data.data; },
  async teamRoles(): Promise<TeamRole[]> { return (await companyApi.teamRoles()).data.data; },
  async addMember(body: Record<string, unknown>) { return (await companyApi.addMember(body)).data.data; },
  async updateMember(id: Id, body: Record<string, unknown>) { return (await companyApi.updateMember(id, body)).data.data; },
  async memberAccess(id: Id): Promise<UserAccess> { return (await companyApi.memberAccess(id)).data.data; },
  async saveMemberAccess(id: Id, screens: Array<{ key: string; level: AccessLevel | null }>): Promise<UserAccess> {
    return (await companyApi.saveMemberAccess(id, screens)).data.data;
  },
};
