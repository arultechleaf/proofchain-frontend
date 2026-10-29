'use client';

/** VIEW — renders the parties list. State and data come from the controller. */
import Link from 'next/link';
import { Plus, Users } from 'lucide-react';
import { formatMoney } from '@/lib/utils';
import { Column, DataTable, EmptyState, Notice, Page, PageHeader, Pager, RowActions, SearchInput, StatusBadge, actionsColumn, Tabs } from '@/components/ui';
import { PARTY_TABS, usePartyListController } from '@/controllers/party.controller';
import { PARTY_TYPE_LABEL, type Party } from '@/models/party';

function buildColumns(writable: boolean, remove: (id: number, name: string) => void): Column<Party>[] {
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
        <Tabs value={c.type} onChange={c.selectType} options={PARTY_TABS} />
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
