'use client';

/** VIEW — stock per company and branch, low-stock list with suggested orders, and filterable stock history. */
import Link from 'next/link';
import { AlertTriangle, Boxes, Coins, Download, Package, Warehouse } from 'lucide-react';
import { formatDate, formatMoney } from '@/lib/utils';
import {
  Button, Card, Column, DataTable, EmptyState, Grid, Notice, Page, PageHeader, Pager, StatCard,
} from '@/components/ui';
import { MOVE_PAGE_SIZE, useInventoryController } from '@/controllers/inventory.controller';
import { REASON_LABEL, type Movement, type StockItem } from '@/models/inventory';
import { ExportButtons } from '@/components/ui/ExportButtons';

export default function InventoryPage() {
  const c = useInventoryController();
  const totals = c.summary?.totals;
  const branchName = (id: number | null) => c.branches.find((b) => b.id === id)?.name;

  const stockColumns: Column<StockItem>[] = [
    { header: 'Item', cell: (i) => <Link href={`/items/${i.id}`} className="link-strong">{i.name}</Link> },
    ...(c.acrossCompanies ? [{ header: 'Company', cell: (i: StockItem) => i.companyName ?? '—' } as Column<StockItem>] : []),
    { header: 'SKU', cell: (i) => i.sku || '—' },
    {
      header: c.branchId ? 'At this branch' : 'In stock', align: 'right',
      cell: (i) => <span style={{ fontWeight: 600, color: i.lowStock ? '#f87171' : '#e2e8f0' }}>{i.stock} {i.unit}</span>,
    },
    { header: 'Alert at', align: 'right', cell: (i) => i.lowStockLevel },
    { header: 'Value', align: 'right', cell: (i) => formatMoney(i.stock * i.purchasePrice) },
    {
      header: 'Status',
      cell: (i) => i.stock <= 0
        ? <span className="badge badge-rejected">Out of stock</span>
        : i.lowStock
          ? <span className="badge badge-pending">Low{i.reorderQuantity ? ` · order ${i.reorderQuantity}` : ''}</span>
          : <span className="badge badge-approved">OK</span>,
    },
  ];

  const moveColumns: Column<Movement>[] = [
    { header: 'When', cell: (m) => formatDate(m.createdAt) },
    { header: 'Item', cell: (m) => m.item?.name ?? '—' },
    { header: 'Branch', cell: (m) => m.branchName ?? '—' },
    { header: 'Reason', cell: (m) => REASON_LABEL[m.reason] ?? m.reason },
    { header: 'Reference', cell: (m) => m.reference || '—' },
    {
      header: 'Change', align: 'right',
      cell: (m) => <span style={{ color: m.change < 0 ? '#f87171' : '#34d399', fontWeight: 600 }}>{m.change > 0 ? '+' : ''}{m.change}</span>,
    },
  ];

  return (
    <Page>
      <PageHeader
        title="Inventory"
        actions={(
          <>
            {c.canEnterStock && <Link href="/inventory/entry" className="btn btn-primary">Stock entry, transfer &amp; returns</Link>}
            <Link href="/items" className="btn btn-secondary">Manage items</Link>
          </>
        )}
      />

      {c.failed ? <Notice kind="error">Could not load inventory.</Notice> : null}
      {c.error ? <Notice kind="error">{c.error}</Notice> : null}

      {/* who and where */}
      <div className="toolbar">
        {c.acrossCompanies && (
          <select className="form-input" style={{ width: 220 }} value={c.companyId} onChange={(e) => c.setCompanyId(e.target.value)} aria-label="Company">
            <option value="">All companies</option>
            {c.companies.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        )}
        <select className="form-input" style={{ width: 220 }} value={c.branchId} onChange={(e) => c.setBranchId(e.target.value)} aria-label="Branch">
          <option value="">All branches / godowns</option>
          {c.branches.map((b) => <option key={b.id} value={b.id}>{b.name} ({b.code})</option>)}
        </select>
      </div>

      <Grid cols={4} style={{ marginBottom: 20 }}>
        <StatCard label="Active items" value={totals?.itemCount ?? 0} icon={Package} color="#60a5fa" loading={c.loading} />
        <StatCard label="Stock value" value={formatMoney(totals?.stockValue)} icon={Coins} color="#34d399" hint="At purchase price" loading={c.loading} />
        <StatCard label="Retail value" value={formatMoney(totals?.retailValue)} icon={Boxes} color="#a78bfa" hint="At sale price" loading={c.loading} />
        <StatCard label="Low stock" value={totals?.lowStockCount ?? 0} icon={AlertTriangle}
          color={totals?.lowStockCount ? '#f87171' : '#34d399'} loading={c.loading} />
      </Grid>

      {c.branches.length > 0 && (
        <Card title="By branch / godown" icon={Warehouse} style={{ marginBottom: 20 }}>
          <div className="branch-cards">
            {c.branches.map((b) => (
              <button key={b.id} type="button" className={`branch-card${String(b.id) === c.branchId ? ' active' : ''}${b.isActive ? '' : ' inactive'}`}
                onClick={() => c.setBranchId(String(b.id) === c.branchId ? '' : String(b.id))}>
                <span className="branch-card-name">{b.name} <span className="text-muted">{b.code}</span></span>
                <span className="branch-card-meta">{b.kind === 'godown' ? 'Godown' : 'Branch'}{b.isDefault ? ' · default' : ''}{b.isActive ? '' : ' · inactive'}</span>
                <span className="branch-card-value">{formatMoney(b.stockValue)}</span>
                <span className="branch-card-meta">{b.itemCount} item{b.itemCount === 1 ? '' : 's'} in stock</span>
              </button>
            ))}
          </div>
        </Card>
      )}

      <Card title={c.branchId ? `Stock at ${branchName(Number(c.branchId)) ?? 'branch'}` : 'Stock levels'} icon={Boxes} style={{ marginBottom: 20 }}>
        <DataTable columns={stockColumns} rows={c.items} loading={c.loading} rowKey={(i) => i.id}
          empty={<EmptyState icon={Package} title="No items yet" />} />
      </Card>

      <Card title="Stock history">
        <div className="toolbar">
          <select className="form-input" style={{ width: 170 }} value={c.reason} onChange={(e) => c.setReason(e.target.value)} aria-label="Reason">
            <option value="">All reasons</option>
            {Object.entries(REASON_LABEL).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </select>
          <select className="form-input" style={{ width: 200 }} value={c.itemId} onChange={(e) => c.setItemId(e.target.value)} aria-label="Item">
            <option value="">All items</option>
            {c.items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
          <input type="date" className="form-input" style={{ width: 150 }} value={c.from} max={c.to || undefined} onChange={(e) => c.setFrom(e.target.value)} aria-label="From" />
          <input type="date" className="form-input" style={{ width: 150 }} value={c.to} min={c.from || undefined} onChange={(e) => c.setTo(e.target.value)} aria-label="To" />
          {(c.reason || c.itemId || c.from || c.to) && <Button variant="ghost" size="sm" onClick={c.clearFilters}>Clear</Button>}
          <Button variant="secondary" size="sm" icon={Download} loading={c.exporting} onClick={c.exportCsv}>Export CSV</Button>
          <ExportButtons onExport={c.exportFile} disabled={c.movesLoading || !c.movesTotal} />
        </div>
        <DataTable bare columns={moveColumns} rows={c.moves} loading={c.movesLoading} rowKey={(m) => m.id}
          empty={<EmptyState icon={Boxes} title="No movements match" />}
          footer={<Pager page={c.page} total={c.movesTotal} limit={MOVE_PAGE_SIZE} onPage={c.setPage} />} />
      </Card>
    </Page>
  );
}
