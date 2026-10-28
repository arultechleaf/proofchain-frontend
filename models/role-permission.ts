/** MODEL — role permissions (what each role may do in each area of the app). */
import { rolesApi } from '@/lib/api';

export type AccessLevel = 'full' | 'own' | 'read' | 'none';

export interface PermissionMatrix {
  roles: string[];
  levels: AccessLevel[];
  rows: Array<{ area: string; label: string; levels: Record<string, AccessLevel> }>;
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
};
