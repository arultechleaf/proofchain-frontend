'use client';

/**
 * CONTROLLER — which screens each user can open. An administrator picks a user, ticks the screens (many at once),
 * chooses how much access each tick gives, and saves. Screens left as the role gives them are not stored.
 */
import { useMemo, useState } from 'react';
import { useAsync } from '@/controllers/useAsync';
import { usersApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { apiError } from '@/lib/utils';
import { rolePermissionService, type AccessLevel, type UserAccess, type UserScreen } from '@/models/role-permission';
import { companyService } from '@/models/company';
import type { User } from '@/models';

/** Administrators can never lose these two, or nobody could fix the settings. */
const LOCKED_FOR_ADMIN = new Set(['roles', 'users']);

/** 'all' = an administrator editing anyone; 'team' = a manager editing the people of their own company. */
export type AccessScope = 'all' | 'team';

export function useUserAccessController(scope: AccessScope = 'all') {
  const { user: me, refreshScreens } = useAuth();
  // /roles?user=3 opens the editor with that user already chosen (the key icon on the Users list)
  const [selectedId, setSelectedId] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null;
    const n = Number(new URLSearchParams(window.location.search).get('user'));
    return Number.isInteger(n) && n > 0 ? n : null;
  });
  const [search, setSearch] = useState('');
  const [edits, setEdits] = useState<Record<string, AccessLevel>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const users = useAsync<User[]>(async () => (scope === 'team' ? companyService.team() : (await usersApi.list()).data.data), [scope]);
  const access = useAsync<UserAccess | null>(
    async () => (selectedId ? (scope === 'team' ? companyService.memberAccess(selectedId) : rolePermissionService.userAccess(selectedId)) : null),
    [selectedId, scope],
  );

  const screens: UserScreen[] = access.data?.screens ?? [];
  const target = access.data?.user;
  const isLocked = (key: string) => target?.role === 'admin' && LOCKED_FOR_ADMIN.has(key);

  const levelOf = (s: UserScreen): AccessLevel => (isLocked(s.key) ? 'full' : edits[s.key] ?? s.level);
  const allowed = (s: UserScreen) => levelOf(s) !== 'none';

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (users.data ?? []).filter((u) => !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.userCode ?? '').toLowerCase().includes(q));
  }, [users.data, search]);

  const groups = useMemo(() => Array.from(new Set(screens.map((s) => s.group))), [screens]);

  /** The level a freshly ticked screen gets: what the role gives, or read-only if the role gives nothing. */
  const grantLevel = (s: UserScreen): AccessLevel => (s.roleLevel !== 'none' ? s.roleLevel : 'read');

  const setLevel = (s: UserScreen, level: AccessLevel) => {
    if (isLocked(s.key)) return;
    setEdits((e) => {
      const next = { ...e };
      if (level === s.level) delete next[s.key];
      else next[s.key] = level;
      return next;
    });
  };
  const toggle = (s: UserScreen, on: boolean) => setLevel(s, on ? grantLevel(s) : 'none');

  const setMany = (list: UserScreen[], on: boolean) => list.forEach((s) => toggle(s, on));
  const selectAll = (group?: string) => setMany(screens.filter((s) => !group || s.group === group), true);
  const clearAll = (group?: string) => setMany(screens.filter((s) => !group || s.group === group), false);
  const resetToRole = () => screens.forEach((s) => setLevel(s, s.roleLevel));

  const select = (id: number) => { setSelectedId(id); setEdits({}); setMessage(null); };

  const save = async () => {
    if (!target) return;
    const changes = screens
      .filter((s) => edits[s.key] !== undefined)
      .map((s) => ({ key: s.key, level: edits[s.key] === s.roleLevel ? null : edits[s.key] }));
    if (!changes.length) return;
    setSaving(true);
    setMessage(null);
    try {
      await (scope === 'team' ? companyService.saveMemberAccess(target.id, changes) : rolePermissionService.saveUserAccess(target.id, changes));
      setEdits({});
      setMessage({ kind: 'success', text: `Access for ${target.name} saved (${changes.length} screen${changes.length > 1 ? 's' : ''})` });
      await access.reload();
      if (target.id === me?.id) await refreshScreens();
    } catch (err) {
      setMessage({ kind: 'error', text: apiError(err, 'Could not save the access') });
    } finally {
      setSaving(false);
    }
  };

  return {
    users: filteredUsers, usersLoading: users.loading, usersError: !!users.error,
    search, setSearch, selectedId, select,
    target, screens, groups, loading: access.loading && !!selectedId, error: !!access.error,
    levelOf, allowed, isLocked, setLevel, toggle, selectAll, clearAll, resetToRole,
    dirty: Object.keys(edits).length, discard: () => setEdits({}), save, saving, message,
    allowedCount: screens.filter(allowed).length,
  };
}
