'use client';

/** VIEW — add stock from an invoice PDF: upload, review the lines the server found, confirm. */
import { useRef } from 'react';
import { FileUp, PackagePlus } from 'lucide-react';
import { Button, Card, Column, DataTable, EmptyState, Notice, Page, PageHeader, Spinner } from '@/components/ui';
import { NEW_ITEM, useInvoiceImportController, type ImportRow } from '@/controllers/invoice-import.controller';
import { formatMoney } from '@/lib/utils';

export default function ImportInvoicePage() {
  const c = useInvoiceImportController();
  const fileInput = useRef<HTMLInputElement>(null);

  const columns: Column<ImportRow>[] = [
    {
      header: 'Add', width: 50,
      cell: (r) => {
        const index = c.rows.indexOf(r);
        return <input type="checkbox" checked={r.include} aria-label={`Add ${r.description}`} onChange={(e) => c.updateRow(index, { include: e.target.checked })} />;
      },
    },
    { header: 'Material on the invoice', cell: (r) => <span title={r.description}>{r.description.length > 90 ? `${r.description.slice(0, 90)}…` : r.description}</span> },
    {
      header: 'Quantity', width: 150,
      cell: (r) => {
        const index = c.rows.indexOf(r);
        return (
          <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
            <input type="number" step="any" min={0} className="form-input" style={{ width: 90 }} aria-label={`Quantity for ${r.description}`}
              value={r.quantity} onChange={(e) => c.updateRow(index, { quantity: e.target.value })} />
            <span className="text-muted">{r.unit}</span>
          </span>
        );
      },
    },
    { header: 'Rate', align: 'right', cell: (r) => (r.rate != null ? formatMoney(r.rate) : '—') },
    {
      header: 'Stock item', width: 260,
      cell: (r) => {
        const index = c.rows.indexOf(r);
        return (
          <select className="form-input" value={r.itemId} aria-label={`Stock item for ${r.description}`} onChange={(e) => c.updateRow(index, { itemId: e.target.value })}>
            <option value={NEW_ITEM}>+ Create as a new item</option>
            {c.items.map((i) => <option key={i.id} value={i.id}>{i.name}{i.sku ? ` (${i.sku})` : ''}</option>)}
          </select>
        );
      },
    },
  ];

  return (
    <Page narrow>
      <PageHeader title="Add stock from an invoice PDF" backHref="/inventory/entry" />

      {c.message ? <Notice kind={c.message.kind}>{c.message.text}</Notice> : null}
      {!c.ready && <Notice kind="info">Stock can only be added for your own company. Your account is not linked to one.</Notice>}

      <Card title="1. Upload the invoice" icon={FileUp}>
        <div className="toolbar">
          <input ref={fileInput} type="file" accept="application/pdf,.pdf" hidden
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void c.readFile(f); e.target.value = ''; }} />
          <Button icon={FileUp} loading={c.reading} disabled={!c.ready} onClick={() => fileInput.current?.click()}>
            {c.invoice ? 'Choose another PDF' : 'Choose invoice PDF'}
          </Button>
          {c.fileName && <span className="text-muted">{c.fileName}</span>}
        </div>
        <p className="form-hint">
          Works with text PDFs exported from billing software (Tally, Zoho, Busy and similar), up to 5 MB. Scanned images cannot be read.
          The file is read on your own server and is not stored.
        </p>
        {c.reading && <Spinner label="Reading the invoice…" />}
      </Card>

      {c.invoice && (
        <Card title="2. Check what was read" icon={PackagePlus}>
          <p style={{ marginBottom: 12 }}>
            <strong>Invoice {c.invoice.invoiceNumber ?? '—'}</strong> · {c.invoice.invoiceDate ?? 'no date found'}
            {c.invoice.seller && <> · From <strong>{c.invoice.seller}</strong></>}
            {c.invoice.buyer && <> · To {c.invoice.buyer}</>}
          </p>
          {c.invoice.warnings.map((w) => <Notice key={w} kind="error">{w}</Notice>)}

          <div className="toolbar">
            <select className="form-input" style={{ width: 260 }} value={c.branchId} onChange={(e) => c.setBranchId(e.target.value)} aria-label="Branch">
              {c.branches.map((b) => <option key={b.id} value={b.id}>{b.name} ({b.code}){b.isDefault ? ' · default' : ''}</option>)}
            </select>
          </div>

          <DataTable bare columns={columns} rows={c.rows} rowKey={(r) => c.rows.indexOf(r)}
            empty={<EmptyState icon={FileUp} title="No item lines were found in this PDF" />} />

          <p className="form-hint">
            Tick only goods you received. Services such as transport or installation do not belong in stock, so leave them unticked.
            Choose an existing item to add to it, or create a new item from the invoice text.
          </p>
          {c.invalid && <Notice kind="error">Every ticked line needs a quantity above zero.</Notice>}
          <div className="toolbar">
            <Button icon={PackagePlus} loading={c.saving} disabled={!c.chosenCount || c.invalid} onClick={() => void c.save()}>
              Add {c.chosenCount || ''} item{c.chosenCount === 1 ? '' : 's'} to stock
            </Button>
            <Button variant="ghost" onClick={c.reset}>Cancel</Button>
          </div>
        </Card>
      )}
    </Page>
  );
}
