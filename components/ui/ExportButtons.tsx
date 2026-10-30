'use client';

import { useState } from 'react';
import { FileSpreadsheet, FileText } from 'lucide-react';
import { apiError } from '@/lib/utils';
import type { ExportFormat } from '@/lib/export';

/**
 * PDF and Excel download buttons. `onExport` builds and downloads the file; it can fetch
 * extra rows first (e.g. every page of a paged list), so the buttons show a busy state.
 */
export function ExportButtons({ onExport, disabled }: {
  onExport: (format: ExportFormat) => Promise<void>;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState<ExportFormat | null>(null);
  const [error, setError] = useState('');

  const run = async (format: ExportFormat) => {
    setBusy(format);
    setError('');
    try {
      await onExport(format);
    } catch (err) {
      setError(apiError(err, 'Could not create the file'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <button type="button" className="btn btn-secondary" disabled={disabled || !!busy} onClick={() => run('pdf')}>
        <FileText size={15} /> {busy === 'pdf' ? 'Preparing…' : 'PDF'}
      </button>
      <button type="button" className="btn btn-secondary" disabled={disabled || !!busy} onClick={() => run('xlsx')}>
        <FileSpreadsheet size={15} /> {busy === 'xlsx' ? 'Preparing…' : 'Excel'}
      </button>
      {error && <span className="form-error">{error}</span>}
    </span>
  );
}
