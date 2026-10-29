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
  const { user, refreshScreens } = useAuth();
  const { data, loading, error, reload } = useAsync<PermissionMatrix>(() => rolePermissionService.matrix(), []);
  const [edits, setEdits] = useState<Record<string, AccessLevel>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const key = (role: string, area: string) => `${role}|${area}`;
  const isAdmin = user?.role === 'admin';
  const [newRole, setNewRole] = useState({ key: '', name: '' });
  const [busy, setBusy] = useState(false);

  const roleName = (role: string) => data?.roleInfo.find((r) => r.key === role)?.name ?? role;
  const isSystem = (role: string) => data?.roleInfo.find((r) => r.key === role)?.isSystem ?? true;
  const groups = Array.from(new Set((data?.rows ?? []).map((r) => r.group)));

  const createRole = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await rolePermissionService.createRole(newRole.key.trim(), newRole.name.trim());
      setNewRole({ key: '', name: '' });
      setMessage({ kind: 'success', text: 'Role created. It starts with no access, so set what it may open below.' });
      await reload();
    } catch (err) {
      setMessage({ kind: 'error', text: apiError(err, 'Could not create the role') });
    } finally {
      setBusy(false);
    }
  };

  const deleteRole = async (role: string) => {
    setBusy(true);
    setMessage(null);
    try {
      await rolePermissionService.deleteRole(role);
      setMessage({ kind: 'success', text: 'Role deleted' });
      await reload();
    } catch (err) {
      setMessage({ kind: 'error', text: apiError(err, 'Could not delete the role') });
    } finally {
      setBusy(false);
    }
  };


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
      void refreshScreens(); // the menu of the signed-in administrator follows right away
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
    isAdmin, roleName, isSystem, groups, newRole, setNewRole, createRole, deleteRole, busy, levelOf, setLevel, dirty: Object.keys(edits).length, save, discard: () => setEdits({}), saving, message,
  };
}
