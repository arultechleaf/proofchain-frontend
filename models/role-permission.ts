/** MODEL — roles, screens and role permissions (what each role may do on each screen). Stored in MySQL. */
import { rolesApi } from '@/lib/api';
import type { AccessLevel } from '@/lib/access';

export type { AccessLevel };

export interface RoleInfo {
  id: number;
  key: string;
  name: string;
  description: string | null;
  isSystem: boolean;
}

export interface PermissionMatrix {
  roles: string[];
  roleInfo: RoleInfo[];
  levels: AccessLevel[];
  /** One row per screen; `area` is the screen key. */
  rows: Array<{ area: string; label: string; group: string; path: string; levels: Record<string, AccessLevel> }>;
}

export interface PermissionChange {
  role: string;
  area: string;
  level: AccessLevel;
}

export const LEVEL_INFO: Record<AccessLevel, { label: string; color: string }> = {
  full: { label: 'Full access', color: '#34d399' },
  own: { label: 'Own organization', color: '#60a5fa' },
  read: { label: 'Read only', color: '#fbbf24' },
  none: { label: 'No access', color: '#475569' },
};

export const rolePermissionService = {
  async matrix(): Promise<PermissionMatrix> {
    return (await rolesApi.permissions()).data.data;
  },
  async save(changes: PermissionChange[]): Promise<PermissionMatrix> {
    return (await rolesApi.updatePermissions(changes)).data.data;
  },
  async list(): Promise<RoleInfo[]> {
    return (await rolesApi.list()).data.data;
  },
  async createRole(key: string, name: string, description?: string): Promise<PermissionMatrix> {
    return (await rolesApi.create({ key, name, description })).data.data;
  },
  async deleteRole(key: string): Promise<PermissionMatrix> {
    return (await rolesApi.remove(key)).data.data;
  },
};
