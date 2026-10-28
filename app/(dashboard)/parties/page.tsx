'use client';

/** VIEW — renders the parties list. State and data come from the controller. */
import Link from 'next/link';
import { Plus, Users } from 'lucide-react';
import { formatMoney } from '@/lib/utils';
import {
  Column, DataTable, EmptyState, Notice, Page, PageHeader, Pager, RowActions, SearchInput, StatusBadge, actionsColumn,
} from '@/components/ui';
import { PARTY_TABS, usePartyListController } from '@/controllers/party.controller';
import { PARTY_TYPE_LABEL, type Party } from '@/models/party';

function buildColumns(writable: boolean, remove: (id: string, name: string) => void): Column<Party>[] {
  return [
  {
    header: 'Name',
    cell: (p) => (
      <Link href={`/parties/${p.id}`} style={{ color: '#60a5fa', textDecoration: 'none', fontWeight: 600 }}>{p.name}</Link>
    ),
  },
  { header: 'Type', cell: (p) => PARTY_TYPE_LABEL[p.partyType] ?? p.partyType },
  { header: 'Phone', cell: (p) => p.phone || '—' },
  { header: 'City', cell: (p) => p.city || '—' },
  { header: 'Opening balance', align: 'right', cell: (p) => formatMoney(p.openingBalance) },
  { header: 'Status', cell: (p) => <StatusBadge status={p.isActive ? 'active' : 'inactive'} /> },
  actionsColumn<Party>((p) => (
    <RowActions
      view={`/parties/${p.id}`}
      edit={writable ? `/parties/${p.id}?tab=Details` : undefined}
      remove={writable ? { confirm: `Delete "${p.name}"? This cannot be undone.`, onConfirm: () => remove(p.id, p.name) } : undefined}
    />
  )),
  ];
}

export default function PartiesPage() {
  const c = usePartyListController();
  const columns = buildColumns(c.canCreate, c.remove);

  return (
    <Page>
      <PageHeader
        title="Customers & Suppliers"
        subtitle={`${c.total} parties`}
        actions={c.canCreate && (
          <Link href="/parties/create" className="btn btn-primary"><Plus size={15} /> New Party</Link>
        )}
      />

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 4, background: 'rgba(15,23,42,0.7)', borderRadius: 10, padding: 3 }}>
          {PARTY_TABS.map((t) => (
            <button key={t.key} onClick={() => c.selectType(t.key)} style={{
              padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, border: 0, cursor: 'pointer',
              background: c.type === t.key ? 'rgba(37,99,235,0.25)' : 'transparent',
              color: c.type === t.key ? '#60a5fa' : '#94a3b8',
            }}>{t.label}</button>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); c.submitSearch(); }} style={{ flex: 1, minWidth: 220, display: 'flex' }}>
          <SearchInput placeholder="Search name, phone or email..." value={c.search} onChange={(e) => c.setSearch(e.target.value)} />
        </form>
      </div>

      {c.error ? <Notice kind="error">Could not load parties.</Notice> : null}
      {c.message ? <Notice kind={c.message.kind}>{c.message.text}</Notice> : null}

      <DataTable
        columns={columns}
        rows={c.rows}
        loading={c.loading}
        rowKey={(p) => p.id}
        empty={<EmptyState icon={Users} title="No parties found" />}
        startIndex={(c.page - 1) * c.limit}
        footer={<Pager page={c.page} total={c.total} limit={c.limit} onPage={c.setPage} />}
      />
    </Page>
  );
}
