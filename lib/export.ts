/**
 * Table export to PDF and Excel. Each screen passes the same rows it shows plus plain-text
 * columns, so what you download matches the table. The libraries load on click only.
 */
import { downloadBlob } from '@/lib/utils';

export type ExportFormat = 'pdf' | 'xlsx';

export interface ExportColumn<T> {
  header: string;
  /** Plain text or number for the cell. Numbers stay numeric in Excel. */
  value: (row: T) => string | number | null | undefined;
  /** How the cell reads in the PDF (e.g. formatted money); defaults to the plain value. */
  display?: (row: T) => string;
  align?: 'left' | 'right';
}

export interface ExportOptions<T> {
  /** Heading printed on the PDF and used as the sheet name. */
  title: string;
  /** File name without extension; the date is appended. */
  filename: string;
  columns: ExportColumn<T>[];
  rows: T[];
  /** Extra lines under the PDF title, e.g. active filters or totals. */
  notes?: string[];
}

const stamp = () => new Date().toISOString().slice(0, 10);
const cell = (v: string | number | null | undefined) => (v === null || v === undefined || v === '' ? '—' : v);

export async function exportRows<T>(format: ExportFormat, opts: ExportOptions<T>): Promise<void> {
  const file = `${opts.filename}-${stamp()}`;
  if (format === 'xlsx') {
    const XLSX = await import('xlsx');
    const data = opts.rows.map((r) => Object.fromEntries(opts.columns.map((c) => [c.header, c.value(r) ?? ''])));
    const sheet = XLSX.utils.json_to_sheet(data, { header: opts.columns.map((c) => c.header) });
    sheet['!cols'] = opts.columns.map((c) => ({
      wch: Math.min(40, Math.max(c.header.length, ...opts.rows.map((r) => String(c.value(r) ?? '').length)) + 2),
    }));
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, opts.title.slice(0, 31).replace(/[\\/?*[\]:]/g, ' '));
    const bytes = XLSX.write(book, { type: 'array', bookType: 'xlsx' });
    downloadBlob(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${file}.xlsx`);
    return;
  }

  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const doc = new jsPDF({ orientation: opts.columns.length > 6 ? 'landscape' : 'portrait', unit: 'pt', format: 'a4' });
  doc.setFontSize(15);
  doc.text(opts.title, 40, 40);
  doc.setFontSize(9);
  doc.setTextColor(100);
  const lines = [`Generated ${new Date().toLocaleString()}`, ...(opts.notes ?? [])];
  lines.forEach((line, i) => doc.text(line, 40, 56 + i * 12));
  autoTable(doc, {
    startY: 62 + lines.length * 12,
    head: [opts.columns.map((c) => c.header)],
    body: opts.rows.map((r) => opts.columns.map((c) => String(c.display ? c.display(r) : cell(c.value(r))))),
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [18, 122, 82] },
    columnStyles: Object.fromEntries(opts.columns.map((c, i) => [i, { halign: c.align ?? 'left' }])),
    margin: { left: 40, right: 40 },
  });
  downloadBlob(doc.output('blob'), `${file}.pdf`);
}
