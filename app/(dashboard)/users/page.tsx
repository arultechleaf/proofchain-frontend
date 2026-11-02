'use client';

import { useState } from 'react';
import Link from 'next/link';
import { KeyRound, Plus, Search, UserCheck, UserX, Users } from 'lucide-react';
import { usersApi } from '@/lib/api';
import type { User } from '@/models';
import { useAuth } from '@/lib/auth';
import { apiError, formatRelative, roleLabel } from '@/lib/utils';
import { Column, DataTable, EmptyState, Notice, Page, PageHeader, RowActions, StatusBadge, actionsColumn, useAsync, Button } from '@/components/ui';

export default function UsersPage() {
  const { user: me } = useAuth();
  const [search, setSearch] = useState('');
  const [pendingOnly, setPendingOnly] = useState(false);
  const isAdmin = me?.role === 'admin';

  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const { data, loading, error, reload } = useAsync<User[]>(async () => (await usersApi.list()).data.data, []);
  const all = data ?? [];
  const pending = all.filter((u) => !u.isActive).length;
  const needle = search.trim().toLowerCase();
  const rows = all
    .filter((u) => !pendingOnly || !u.isActive)
    .filter((u) => !needle || u.name.toLowerCase().includes(needle) || u.email.toLowerCase().includes(needle));

  const setActive = async (u: User, isActive: boolean) => {
    setMessage(null);
    try {
      await usersApi.update(u.id, { isActive });
      setMessage({ kind: 'success', text: `${u.name} ${isActive ? 'activated' : 'deactivated'}` });
      await reload();
    } catch (err) {
      setMessage({ kind: 'error', text: apiError(err, 'Could not update the user') });
    }
  };

  const columns: Column<User>[] = [
    {
      header: 'Name',
      cell: (u) => isAdmin
        ? <Link href={`/users/${u.id}`} style={{ color: '#60a5fa', textDecoration: 'none', fontWeight: 600 }}>{u.name}</Link>
        : <strong>{u.name}</strong>,
    },
    { header: 'Code', cell: (u) => u.userCode ?? '—' },
    { header: 'Email', cell: (u) => u.email },
    { header: 'Mobile', cell: (u) => u.mobile ?? '—' },
    { header: 'Role', cell: (u) => roleLabel(u.role) },
    { header: 'Organization', cell: (u) => u.company?.name ?? '—' },
    { header: 'Joined', cell: (u) => formatRelative(u.createdAt) },
    { header: 'Password', cell: (u) => (u.mustChangePassword ? <span className="badge badge-pending">Temporary</span> : '—') },
    {
      header: 'Status',
      cell: (u) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <StatusBadge status={u.isActive ? 'active' : 'inactive'} />
          {isAdmin && (
            <button
              type="button"
              role="switch"
              aria-checked={u.isActive}
              aria-label={u.isActive ? `Deactivate ${u.name}` : `Activate ${u.name}`}
              title={u.id === me?.id ? 'You cannot deactivate your own account' : u.isActive ? 'Click to deactivate' : 'Click to activate'}
              disabled={u.id === me?.id}
              onClick={() => {
                if (!u.isActive || window.confirm(`Deactivate ${u.name}? They will no longer be able to sign in.`)) void setActive(u, !u.isActive);
              }}
              style={{
                width: 38, height: 22, borderRadius: 11, border: 'none', padding: 2, cursor: u.id === me?.id ? 'not-allowed' : 'pointer',
                background: u.isActive ? '#16a34a' : '#94a3b8', opacity: u.id === me?.id ? 0.5 : 1, transition: 'background .15s',
                display: 'flex', alignItems: 'center', justifyContent: u.isActive ? 'flex-end' : 'flex-start',
              }}
            >
              <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', display: 'block' }} />
            </button>
          )}
        </span>
      ),
    },
    // Users are deactivated, not deleted, so their history in invoices and the audit log stays intact.
    actionsColumn<User>((u) => (
      <RowActions
        view={isAdmin ? `/users/${u.id}` : undefined}
        edit={isAdmin ? `/users/${u.id}` : undefined}
        extra={isAdmin ? (
          <>
            <Link href={`/roles?user=${u.id}`} className="icon-btn icon-view" title="Screen access" aria-label="Screen access"><KeyRound size={15} /></Link>
            {!u.isActive && (
              <button type="button" className="icon-btn icon-view" title="Activate" aria-label="Activate" onClick={() => setActive(u, true)}>
                <UserCheck size={15} />
              </button>
            )}
          </>
        ) : undefined}
        remove={isAdmin && u.isActive ? {
          label: 'Deactivate',
          confirm: `Deactivate ${u.name}? They will no longer be able to sign in.`,
          onConfirm: () => setActive(u, false),
          disabled: u.id === me?.id ? 'You cannot deactivate your own account' : undefined,
        } : undefined}
      />
    )),
  ];

  return (
    <Page>
      <PageHeader
        title="Users"
        subtitle={`${all.length} users`}
        actions={
          <>
            <Link href="/roles" className="btn btn-secondary">Roles &amp; permissions</Link>
            {isAdmin && <Link href="/users/create" className="btn btn-primary"><Plus size={15} /> New User</Link>}
          </>
        }
      />

      {isAdmin && pending > 0 && (
        <Notice kind="info">
          {pending} account{pending > 1 ? 's are' : ' is'} inactive — new registrations stay inactive until you approve them.{' '}
          <Button variant="link" onClick={() => setPendingOnly(!pendingOnly)}>{pendingOnly ? 'Show everyone' : 'Show only inactive'}</Button>
        </Notice>
      )}
      {error ? <Notice kind="error">Could not load users.</Notice> : null}
      {message ? <Notice kind={message.kind}>{message.text}</Notice> : null}

      <div style={{ position: 'relative', maxWidth: 420, marginBottom: 16 }}>
        <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
        <input className="form-input" style={{ paddingLeft: 34 }} placeholder="Search name or email..."
          value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <DataTable columns={columns} rows={rows} loading={loading} rowKey={(u) => u.id}
        empty={<EmptyState icon={pendingOnly ? UserCheck : Users} title={pendingOnly ? 'No pending accounts' : 'No users found'} />} />
    </Page>
  );
}
