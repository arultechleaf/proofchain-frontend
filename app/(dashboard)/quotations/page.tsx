'use client';

/** VIEW — list of quotations / estimates. */
import Link from 'next/link';
import { FileText, Plus } from 'lucide-react';
import { formatDay, formatMoney } from '@/lib/utils';
import { Column, DataTable, EmptyState, Notice, Page, PageHeader, Pager, RowActions, SearchInput, StatusBadge, actionsColumn } from '@/components/ui';
import { useQuotationListController } from '@/controllers/quotation.controller';
import { QUOTATION_STATUS_TABS, type Quotation } from '@/models/quotation';

function buildColumns(writable: boolean, remove: (q: Quotation) => void): Column<Quotation>[] {
  return [
  { header: 'Number', cell: (q) => <Link href={`/quotations/${q.id}`} className="link-mono">{q.quotationNumber}</Link> },
  { header: 'Customer', cell: (q) => q.party?.name ?? '—' },
  { header: 'Date', cell: (q) => formatDay(q.quotationDate) },
  { header: 'Valid until', cell: (q) => (q.validUntil ? formatDay(q.validUntil) : '—') },
  { header: 'Total', align: 'right', cell: (q) => <strong>{formatMoney(q.total)}</strong> },
  { header: 'Status', cell: (q) => <StatusBadge status={q.status} /> },
  actionsColumn<Quotation>((q) => (
    <RowActions
      view={`/quotations/${q.id}`}
      remove={writable && q.status !== 'converted' ? { confirm: `Delete ${q.quotationNumber}?`, onConfirm: () => remove(q) } : undefined}
    />
  ), 100),
  ];
}

export default function QuotationsPage() {
  const c = useQuotationListController();
  const columns = buildColumns(c.canCreate, c.remove);

  return (
    <Page>
      <PageHeader
        title="Quotations & Estimates"
        subtitle={`${c.total} quotations`}
        actions={c.canCreate && <Link href="/quotations/create" className="btn btn-primary"><Plus size={15} /> New Quotation</Link>}
      />

      <div className="toolbar">
        <div className="seg">
          {QUOTATION_STATUS_TABS.map((t) => (
            <button key={t.key} className={c.status === t.key ? 'active' : undefined} onClick={() => c.selectStatus(t.key)}>{t.label}</button>
          ))}
        </div>
        <form className="toolbar-grow" onSubmit={(e) => { e.preventDefault(); c.submitSearch(); }}>
          <SearchInput placeholder="Search number or customer…" value={c.search} onChange={(e) => c.setSearch(e.target.value)} />
        </form>
      </div>

      {c.error ? <Notice kind="error">Could not load quotations.</Notice> : null}
      {c.message ? <Notice kind={c.message.kind}>{c.message.text}</Notice> : null}

      <DataTable
        columns={columns}
        rows={c.rows}
        loading={c.loading}
        rowKey={(q) => q.id}
        empty={<EmptyState icon={FileText} title="No quotations found" />}
        startIndex={(c.page - 1) * c.limit}
        footer={<Pager page={c.page} total={c.total} limit={c.limit} onPage={c.setPage} />}
      />
    </Page>
  );
}
