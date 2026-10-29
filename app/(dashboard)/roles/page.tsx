'use client';

/** VIEW — role → screen permission matrix, read from MySQL; administrators can change it and add roles. */
import { Plus, Save, ShieldCheck, Trash2, UserCog } from 'lucide-react';
import { Button, Card, Column, DataTable, Field, Form, Notice, Page, PageHeader } from '@/components/ui';
import { useRolePermissionController } from '@/controllers/role-permission.controller';
import { LEVEL_INFO, type AccessLevel } from '@/models/role-permission';

type Row = { area: string; label: string; group: string; path: string; levels: Record<string, AccessLevel> };

export default function RolesPage() {
  const c = useRolePermissionController();
  const matrix = c.matrix;

  const columns: Column<Row>[] = matrix
    ? [
        { header: 'Screen', cell: (r) => <><strong>{r.label}</strong> <span className="text-muted">{r.path}</span></> },
        ...matrix.roles.map((role): Column<Row> => ({
          id: role,
          align: 'center',
          header: <span className={role === c.currentRole ? 'perm-current' : undefined}>{c.roleName(role)}</span>,
          cell: (r) => {
            const level = c.levelOf(role, r.area);
            if (!c.isAdmin) {
              return <span style={{ color: LEVEL_INFO[level].color, fontSize: 12 }}>{LEVEL_INFO[level].label}</span>;
            }
            return (
              <span className="perm-cell">
                <select className="form-input" value={level} aria-label={`${c.roleName(role)} — ${r.label}`}
                  style={{ color: LEVEL_INFO[level].color }}
                  onChange={(e) => c.setLevel(role, r.area, e.target.value as AccessLevel)}>
                  {matrix.levels.map((l) => <option key={l} value={l}>{LEVEL_INFO[l].label}</option>)}
                </select>
              </span>
            );
          },
        })),
      ]
    : [];

  const customRoles = (matrix?.roleInfo ?? []).filter((r) => !r.isSystem);

  return (
    <Page>
      <PageHeader
        title="Roles & Permissions"
        actions={c.isAdmin && (
          <>
            {c.dirty > 0 && <Button variant="ghost" onClick={c.discard}>Discard changes</Button>}
            <Button disabled={!c.dirty || c.saving} loading={c.saving} icon={Save} onClick={c.save}>
              {c.saving ? 'Saving…' : c.dirty ? `Save ${c.dirty} change${c.dirty > 1 ? 's' : ''}` : 'Save'}
            </Button>
          </>
        )}
      />

      {c.currentRole && <Notice kind="info">You are signed in as <strong>{c.roleName(c.currentRole)}</strong>.</Notice>}
      {c.error ? <Notice kind="error">Could not load the permission matrix.</Notice> : null}
      {c.message ? <Notice kind={c.message.kind}>{c.message.text}</Notice> : null}

      {c.groups.length === 0 && c.loading && (
        <Card title="Permission matrix" icon={ShieldCheck}>
          <DataTable bare serial={false} columns={columns} rows={[]} loading rowKey={(r) => r.area} skeletonRows={8} />
        </Card>
      )}

      {c.groups.map((group) => (
        <Card key={group} title={group} icon={ShieldCheck} style={{ marginBottom: 18 }}>
          <DataTable bare serial={false} minWidth={820} columns={columns}
            rows={(matrix?.rows ?? []).filter((r) => r.group === group)} rowKey={(r) => r.area} />
        </Card>
      ))}

      <Card title="How access works" icon={UserCog} style={{ marginBottom: 18 }}>
        <p className="form-hint" style={{ lineHeight: 1.7 }}>
          Every screen in the app is listed above. The menu, the page guard and the API all read this table, so a role with
          &quot;No access&quot; does not see the screen in the menu, cannot open it by typing its address, and is refused by the server.
          &quot;Read only&quot; allows viewing but not changing. &quot;Own organization&quot; and &quot;Full access&quot; allow changes; own-organization
          roles only ever see their company&apos;s records, and auditors read across companies but cannot change anything.
          {c.isAdmin ? ' Changes are saved to the database and apply on the next page load.' : ' Only an administrator can change these settings.'}
        </p>
      </Card>

      {c.isAdmin && (
        <Card title="Add a role" icon={Plus}>
          <Form onSubmit={c.createRole} loading={c.busy} submitLabel="Create role">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
              <Field label="Key" required hint="Lowercase letters, digits, underscore (for example, store_manager)">
                <input className="form-input" value={c.newRole.key} onChange={(e) => c.setNewRole({ ...c.newRole, key: e.target.value })} required />
              </Field>
              <Field label="Name" required>
                <input className="form-input" value={c.newRole.name} onChange={(e) => c.setNewRole({ ...c.newRole, name: e.target.value })} required />
              </Field>
            </div>
          </Form>

          {customRoles.length > 0 && (
            <div className="toolbar" style={{ marginTop: 16, marginBottom: 0 }}>
              {customRoles.map((r) => (
                <span key={r.key} className="badge badge-pending" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  {r.name}
                  <Button variant="link" size="sm" iconOnly icon={Trash2} aria-label={`Delete ${r.name}`} disabled={c.busy}
                    onClick={() => { if (window.confirm(`Delete the role "${r.name}"?`)) void c.deleteRole(r.key); }} />
                </span>
              ))}
            </div>
          )}
        </Card>
      )}
    </Page>
  );
}
