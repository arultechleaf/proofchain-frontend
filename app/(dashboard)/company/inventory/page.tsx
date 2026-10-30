'use client';

/** VIEW — the signed-in user's own company: stock value per branch, what is running low, and recent movements. */
import Link from 'next/link';
import { AlertTriangle, Boxes, Coins, Package, Warehouse } from 'lucide-react';
import { formatDate, formatMoney } from '@/lib/utils';
import { Card, Column, DataTable, EmptyState, Grid, Notice, Page, PageHeader, StatCard } from '@/components/ui';
import { useCompanyInventoryController } from '@/controllers/inventory.controller';
import { REASON_LABEL, type Movement, type StockItem } from '@/models/inventory';

export default function CompanyInventoryPage() {
  const c = useCompanyInventoryController();
  const totals = c.summary?.totals;

  const lowColumns: Column<StockItem>[] = [
    { header: 'Item', cell: (i) => <Link href={`/items/${i.id}`} className="link-strong">{i.name}</Link> },
    { header: 'In stock', align: 'right', cell: (i) => <span style={{ color: '#f87171', fontWeight: 600 }}>{i.stock} {i.unit}</span> },
    { header: 'Alert at', align: 'right', cell: (i) => i.lowStockLevel },
    { header: 'Suggested order', align: 'right', cell: (i) => (i.reorderQuantity ? `${i.reorderQuantity} ${i.unit}` : '—') },
  ];
  const moveColumns: Column<Movement>[] = [
    { header: 'When', cell: (m) => formatDate(m.createdAt) },
    { header: 'Item', cell: (m) => m.item?.name ?? '—' },
    { header: 'Branch', cell: (m) => m.branchName ?? '—' },
    { header: 'Reason', cell: (m) => REASON_LABEL[m.reason] ?? m.reason },
    { header: 'Change', align: 'right', cell: (m) => <span style={{ color: m.change < 0 ? '#f87171' : '#34d399', fontWeight: 600 }}>{m.change > 0 ? '+' : ''}{m.change}</span> },
  ];

  return (
    <Page>
      <PageHeader
        title="My inventory"
        actions={(
          <>
            {c.canEnterStock && <Link href="/inventory/entry" className="btn btn-primary">Stock entry</Link>}
            <Link href="/inventory" className="btn btn-secondary">Full inventory</Link>
          </>
        )}
      />
      {!c.linked ? <Notice kind="error">Your account is not linked to an organization.</Notice> : null}
      {c.failed ? <Notice kind="error">Could not load your inventory.</Notice> : null}

      <Grid cols={4} style={{ marginBottom: 20 }}>
        <StatCard label="Active items" value={totals?.itemCount ?? 0} icon={Package} color="#60a5fa" loading={c.loading} />
        <StatCard label="Stock value" value={formatMoney(totals?.stockValue)} icon={Coins} color="#34d399" hint="At purchase price" loading={c.loading} />
        <StatCard label="Retail value" value={formatMoney(totals?.retailValue)} icon={Boxes} color="#a78bfa" hint="At sale price" loading={c.loading} />
        <StatCard label="Low stock" value={totals?.lowStockCount ?? 0} icon={AlertTriangle} color={totals?.lowStockCount ? '#f87171' : '#34d399'} loading={c.loading} />
      </Grid>

      <Card title="Stock by branch / godown" icon={Warehouse} style={{ marginBottom: 20 }}>
        {c.branches.length === 0 && !c.loading ? <EmptyState icon={Warehouse} title="No branches yet" /> : (
          <div className="branch-cards">
            {c.branches.map((b) => (
              <Link key={b.id} href="/inventory" className={`branch-card${b.isActive ? '' : ' inactive'}`}>
                <span className="branch-card-name">{b.name} <span className="text-muted">{b.code}</span></span>
                <span className="branch-card-meta">{b.kind === 'godown' ? 'Godown' : 'Branch'}{b.isDefault ? ' · default' : ''}{b.isActive ? '' : ' · inactive'}</span>
                <span className="branch-card-value">{formatMoney(b.stockValue)}</span>
                <span className="branch-card-meta">{b.itemCount} item{b.itemCount === 1 ? '' : 's'} in stock</span>
              </Link>
            ))}
          </div>
        )}
      </Card>

      <Grid cols={2} gap={18}>
        <Card title="Needs reordering" icon={AlertTriangle}>
          <DataTable bare serial={false} columns={lowColumns} rows={c.lowItems} loading={c.loading} rowKey={(i) => i.id}
            empty={<EmptyState icon={Package} title="Nothing is running low" />} />
        </Card>
        <Card title="Recent movements" icon={Boxes}>
          <DataTable bare serial={false} columns={moveColumns} rows={c.moves} loading={c.movesLoading} rowKey={(m) => m.id}
            empty={<EmptyState icon={Boxes} title="No movements yet" />} />
        </Card>
      </Grid>
    </Page>
  );
}
