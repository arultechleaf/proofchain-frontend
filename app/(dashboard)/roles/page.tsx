'use client';

/** VIEW — role permission matrix, read from MySQL; administrators can change it. */
import { Save, ShieldCheck } from 'lucide-react';
import { roleLabel } from '@/lib/utils';
import { Card, Column, DataTable, Notice, Page, PageHeader } from '@/components/ui';
import { useRolePermissionController } from '@/controllers/role-permission.controller';
import { LEVEL_INFO, type AccessLevel } from '@/models/role-permission';

type Row = { area: string; label: string; levels: Record<string, AccessLevel> };

export default function RolesPage() {
  const c = useRolePermissionController();
  const matrix = c.matrix;

  const columns: Column<Row>[] = matrix
    ? [
        { header: 'Area', cell: (r) => r.label },
        ...matrix.roles.map((role): Column<Row> => ({
          id: role,
          align: 'center',
          header: <span className={role === c.currentRole ? 'perm-current' : undefined}>{roleLabel(role)}</span>,
          cell: (r) => {
            const level = c.levelOf(role, r.area);
            if (!c.isAdmin) {
              return <span style={{ color: LEVEL_INFO[level].color, fontSize: 12 }}>{LEVEL_INFO[level].label}</span>;
            }
            return (
              <span className="perm-cell">
                <select className="form-input" value={level} aria-label={`${roleLabel(role)} — ${r.label}`}
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

  return (
    <Page>
      <PageHeader
        title="Roles & Permissions"
        subtitle="What each role can do in ProofChain"
        actions={c.isAdmin && (
          <>
            {c.dirty > 0 && <button className="btn btn-ghost" onClick={c.discard}>Discard changes</button>}
            <button className="btn btn-primary" disabled={!c.dirty || c.saving} onClick={c.save}>
              <Save size={14} /> {c.saving ? 'Saving…' : c.dirty ? `Save ${c.dirty} change${c.dirty > 1 ? 's' : ''}` : 'Save'}
            </button>
          </>
        )}
      />

      {c.currentRole && <Notice kind="info">You are signed in as <strong>{roleLabel(c.currentRole)}</strong>.</Notice>}
      {c.error ? <Notice kind="error">Could not load the permission matrix.</Notice> : null}
      {c.message ? <Notice kind={c.message.kind}>{c.message.text}</Notice> : null}

      <Card title="Permission matrix" icon={ShieldCheck}>
        <DataTable bare serial={false} minWidth={760} columns={columns} rows={matrix?.rows ?? []} loading={c.loading} skeletonRows={8} rowKey={(r) => r.area} />
        <p className="form-hint" style={{ marginTop: 14, lineHeight: 1.6 }}>
          &quot;Own organization&quot; means records are limited to the user&apos;s own company; auditors can read across companies but cannot change anything.
          {c.isAdmin
            ? ' Changes are saved to the database. The server currently enforces access with fixed rules, so this matrix records and displays the intended policy; it does not yet switch server-side checks on or off.'
            : ' Only an administrator can change these settings.'}
        </p>
      </Card>
    </Page>
  );
}
