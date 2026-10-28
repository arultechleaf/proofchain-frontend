'use client';

/** CONTROLLER — roles & permissions: load the matrix, collect edits, save them. */
import { useState } from 'react';
import { useAsync } from '@/controllers/useAsync';
import { useAuth } from '@/lib/auth';
import { apiError } from '@/lib/utils';
import {
  rolePermissionService, type AccessLevel, type PermissionChange, type PermissionMatrix,
} from '@/models/role-permission';

export function useRolePermissionController() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useAsync<PermissionMatrix>(() => rolePermissionService.matrix(), []);
  const [edits, setEdits] = useState<Record<string, AccessLevel>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const key = (role: string, area: string) => `${role}|${area}`;
  const isAdmin = user?.role === 'admin';

  const levelOf = (role: string, area: string): AccessLevel =>
    edits[key(role, area)] ?? data?.rows.find((r) => r.area === area)?.levels[role] ?? 'none';

  const setLevel = (role: string, area: string, level: AccessLevel) => {
    const saved = data?.rows.find((r) => r.area === area)?.levels[role];
    setEdits((e) => {
      const next = { ...e };
      if (level === saved) delete next[key(role, area)];
      else next[key(role, area)] = level;
      return next;
    });
  };

  const save = async () => {
    const changes: PermissionChange[] = Object.entries(edits).map(([k, level]) => {
      const [role, area] = k.split('|');
      return { role, area, level };
    });
    if (!changes.length) return;
    setSaving(true);
    setMessage(null);
    try {
      await rolePermissionService.save(changes);
      setEdits({});
      setMessage({ kind: 'success', text: `${changes.length} permission${changes.length > 1 ? 's' : ''} saved` });
      await reload();
    } catch (err) {
      setMessage({ kind: 'error', text: apiError(err, 'Could not save the permissions') });
    } finally {
      setSaving(false);
    }
  };

  return {
    matrix: data, loading, error: !!error, currentRole: user?.role,
    isAdmin, levelOf, setLevel, dirty: Object.keys(edits).length, save, discard: () => setEdits({}), saving, message,
  };
}
