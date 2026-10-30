'use client';

/** VIEW — the company's branches and godowns (warehouses). */
import { MapPin, Plus, Warehouse } from 'lucide-react';
import {
  Button, Card, Column, DataTable, EmptyState, Field, Form, Grid, Notice, Page, PageHeader, RowActions, StatusBadge, actionsColumn,
} from '@/components/ui';
import { useBranchesController } from '@/controllers/company.controller';
import { GST_STATES } from '@/lib/gst';
import type { Branch } from '@/models/company';

export default function BranchesPage() {
  const c = useBranchesController();

  const columns: Column<Branch>[] = [
    { header: 'Code', cell: (b) => <strong>{b.code}</strong> },
    { header: 'Name', cell: (b) => <>{b.name} {b.isDefault && <span className="badge badge-approved">Default</span>}</> },
    { header: 'Type', cell: (b) => (b.kind === 'godown' ? 'Godown' : 'Branch') },
    { header: 'City', cell: (b) => b.city || '—' },
    { header: 'Phone', cell: (b) => b.phone || '—' },
    { header: 'Contact', cell: (b) => b.contactPerson || '—' },
    { header: 'Status', cell: (b) => <StatusBadge status={b.isActive ? 'active' : 'inactive'} /> },
    actionsColumn<Branch>((b) => (
      <RowActions
        edit={c.writable ? () => c.open(b) : undefined}
        remove={c.writable ? { confirm: `Delete "${b.name}"?`, onConfirm: () => c.remove(b) } : undefined}
      />
    )),
  ];

  const set = (k: string, v: string | boolean) => c.setForm({ ...c.form, [k]: v });

  return (
    <Page>
      <PageHeader
        title="Branches & godowns"
        actions={c.writable && !c.showForm && <Button icon={Plus} onClick={() => c.open()}>Add branch</Button>}
      />
      {c.error ? <Notice kind="error">Could not load the branches.</Notice> : null}
      {c.message ? <Notice kind={c.message.kind}>{c.message.text}</Notice> : null}

      {c.showForm && (
        <Card title={c.editingId ? 'Edit branch' : 'New branch'} icon={MapPin} style={{ marginBottom: 20 }}>
          <Form onSubmit={() => c.submit()} loading={c.saving} submitLabel={c.editingId ? 'Save changes' : 'Add branch'} onCancel={c.close}>
            <Grid cols={3}>
              <Field label="Name" required><input className="form-input" value={c.form.name} onChange={(e) => set('name', e.target.value)} required /></Field>
              <Field label="Code" required hint="Short and unique, for example MAIN or GDN-2">
                <input className="form-input" value={c.form.code} maxLength={20} onChange={(e) => set('code', e.target.value.toUpperCase())} required />
              </Field>
              <Field label="Type">
                <select className="form-input" value={c.form.kind} onChange={(e) => set('kind', e.target.value)}>
                  <option value="branch">Branch / shop / office</option>
                  <option value="godown">Godown / warehouse</option>
                </select>
              </Field>
            </Grid>
            <Field label="Address">
              <textarea className="form-input" rows={2} style={{ resize: 'none' }} value={c.form.address} onChange={(e) => set('address', e.target.value)} />
            </Field>
            <Grid cols={3}>
              <Field label="City / town"><input className="form-input" value={c.form.city} onChange={(e) => set('city', e.target.value)} /></Field>
              <Field label="State">
                <select className="form-input" value={c.form.state} onChange={(e) => set('state', e.target.value)}>
                  <option value="">Select...</option>
                  {GST_STATES.map(([code, name]) => <option key={code} value={name}>{name}</option>)}
                </select>
              </Field>
              <Field label="Pincode"><input className="form-input" inputMode="numeric" maxLength={6} value={c.form.pincode} onChange={(e) => set('pincode', e.target.value)} /></Field>
            </Grid>
            <Grid cols={3}>
              <Field label="Phone"><input className="form-input" inputMode="tel" value={c.form.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
              <Field label="Email"><input type="email" className="form-input" value={c.form.email} onChange={(e) => set('email', e.target.value)} /></Field>
              <Field label="Person in charge"><input className="form-input" value={c.form.contactPerson} onChange={(e) => set('contactPerson', e.target.value)} /></Field>
            </Grid>
            <label className="form-check"><input type="checkbox" checked={c.form.isDefault} onChange={(e) => set('isDefault', e.target.checked)} /> Default branch</label>
            <label className="form-check"><input type="checkbox" checked={c.form.isActive} onChange={(e) => set('isActive', e.target.checked)} /> Active</label>
          </Form>
        </Card>
      )}

      <DataTable columns={columns} rows={c.rows} loading={c.loading} rowKey={(b) => b.id}
        empty={<EmptyState icon={Warehouse} title="No branches yet" />} />
    </Page>
  );
}
