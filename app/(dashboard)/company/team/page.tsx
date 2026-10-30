'use client';

/** VIEW — the people of the signed-in user's company: add staff, switch them on or off, choose their screens. */
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Check, Copy, KeyRound, Plus, UserCheck, UserX, Users } from 'lucide-react';
import {
  Button, Card, Column, DataTable, EmptyState, Field, Form, Grid, KeyValue, Notice, Page, PageHeader, RowActions, StatusBadge, Tabs, actionsColumn,
} from '@/components/ui';
import { useTeamController } from '@/controllers/company.controller';
import { UserAccessPanel } from '@/components/roles/UserAccessPanel';
import { ProfileFields, emptyProfile, profilePayload, type ProfileValues } from '@/components/account/ProfileFields';
import { roleLabel } from '@/lib/utils';
import type { User } from '@/models';

type AddValues = ProfileValues & { email: string; role: string; password: string };

function AddPersonForm({ roles, saving, error, onAdd, onCancel }: {
  roles: Array<{ key: string; name: string }>; saving: boolean; error: string; onAdd: (b: Record<string, unknown>) => Promise<boolean>; onCancel: () => void;
}) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<AddValues>({ defaultValues: { ...emptyProfile(), email: '', role: 'user', password: '' } });
  return (
    <Form post onSubmit={handleSubmit(async (v) => {
      await onAdd({ ...profilePayload(v), email: v.email.trim(), role: v.role, password: v.password || undefined });
    })} loading={saving} submitLabel="Add person" onCancel={onCancel} error={error || undefined}>
      <ProfileFields register={register} errors={errors} watch={watch} />
      <h3 className="form-section">Account</h3>
      <Grid cols={2}>
        <Field label="Email" required error={errors.email?.message}>
          <input type="email" className="form-input" {...register('email', { required: 'Email is required', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' } })} />
        </Field>
        <Field label="Role">
          <select className="form-input" {...register('role')}>
            {roles.map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}
          </select>
        </Field>
      </Grid>
      <Field label="Temporary password" error={errors.password?.message}
        hint="Leave blank to generate one. It is shown once after saving; the person must change it at first sign-in.">
        <input type="password" autoComplete="new-password" className="form-input"
          {...register('password', { minLength: { value: 8, message: 'At least 8 characters' } })} />
      </Field>
    </Form>
  );
}

export default function TeamPage() {
  const c = useTeamController();
  const [tab, setTab] = useState<'people' | 'access'>('people');
  const [adding, setAdding] = useState(false);
  const [copied, setCopied] = useState(false);

  const columns: Column<User>[] = [
    { header: 'Code', cell: (u) => u.userCode ?? '—' },
    { header: 'Name', cell: (u) => <strong>{u.name}</strong> },
    { header: 'Role', cell: (u) => roleLabel(u.role) },
    { header: 'Designation', cell: (u) => u.designation || '—' },
    { header: 'Mobile', cell: (u) => u.mobile || '—' },
    { header: 'Password', cell: (u) => (u.mustChangePassword ? <span className="badge badge-pending">Temporary</span> : '—') },
    { header: 'Status', cell: (u) => <StatusBadge status={u.isActive ? 'active' : 'inactive'} /> },
    actionsColumn<User>((u) => {
      const editable = c.writable && u.role !== 'admin' && u.role !== 'auditor' && u.id !== c.me?.id;
      return (
        <RowActions extra={editable ? (
          <>
            <button type="button" className="icon-btn icon-view" title="Screen access" aria-label="Screen access" onClick={() => setTab('access')}><KeyRound size={15} /></button>
            <button type="button" className="icon-btn icon-view" title={u.isActive ? 'Deactivate' : 'Activate'} aria-label={u.isActive ? 'Deactivate' : 'Activate'}
              onClick={() => c.setActive(u, !u.isActive)}>
              {u.isActive ? <UserX size={15} /> : <UserCheck size={15} />}
            </button>
          </>
        ) : undefined} />
      );
    }),
  ];

  // The temporary password exists in plain text only in this response; it is not stored and cannot be shown again.
  if (c.created) {
    return (
      <Page narrow>
        <PageHeader title="Person added" />
        <Card title="Temporary password" icon={KeyRound}>
          <Notice kind="info">
            Give this password to {c.created.name} securely. It is shown only once, expires
            {c.created.passwordExpiryAt ? ` on ${new Date(c.created.passwordExpiryAt).toLocaleString()}` : ' soon'}, and they must choose their
            own password the first time they sign in.
          </Notice>
          <KeyValue rows={[
            ['User code', c.created.userCode],
            ['Email', c.created.email],
            ['Temporary password', <code key="p" style={{ fontSize: 15 }}>{c.created.temporaryPassword}</code>],
          ]} />
          <div className="form-actions" style={{ marginTop: 16 }}>
            <Button icon={copied ? Check : Copy} onClick={async () => {
              try { await navigator.clipboard.writeText(c.created!.temporaryPassword); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* visible on screen */ }
            }}>{copied ? 'Copied' : 'Copy password'}</Button>
            <Button variant="secondary" onClick={() => { c.clearCreated(); setAdding(false); }}>Back to my team</Button>
          </div>
        </Card>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        title="My team"
        actions={c.writable && tab === 'people' && !adding && <Button icon={Plus} onClick={() => setAdding(true)}>Add person</Button>}
      />
      <div style={{ marginBottom: 16 }}>
        <Tabs<'people' | 'access'> value={tab} onChange={setTab} options={[{ key: 'people', label: 'People' }, ...(c.writable ? [{ key: 'access' as const, label: 'Screen access' }] : [])]} />
      </div>
      {c.error ? <Notice kind="error">Could not load your team.</Notice> : null}
      {c.message ? <Notice kind={c.message.kind}>{c.message.text}</Notice> : null}

      {tab === 'access' && c.writable ? <UserAccessPanel scope="team" /> : (
        <>
          {adding && (
            <Card title="Add a person" icon={Users} style={{ marginBottom: 20 }}>
              <AddPersonForm roles={c.roles} saving={c.saving} error={c.addError} onAdd={c.add} onCancel={() => setAdding(false)} />
            </Card>
          )}
          <DataTable columns={columns} rows={c.rows} loading={c.loading} rowKey={(u) => u.id}
            empty={<EmptyState icon={Users} title="No one in your company yet" />} />
        </>
      )}
    </Page>
  );
}
