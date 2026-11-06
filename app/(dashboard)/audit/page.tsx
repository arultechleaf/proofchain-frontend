'use client';

import { useEffect, useState } from 'react';
import { ClipboardList, Download, RefreshCw } from 'lucide-react';
import { auditApi } from '@/lib/api';
import type { AuditLog } from '@/models';
import { formatDate, downloadBlob } from '@/lib/utils';
import { Column, DataTable, EmptyState, Pager, Button, Page, PageHeader, Select } from '@/components/ui';

const ACTION_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  CREATE_DELIVERY:    { color: '#3ddc84', bg: 'rgba(22, 163, 74,0.1)',  border: 'rgba(34, 197, 94,0.25)' },
  DELIVERY_APPROVED:  { color: '#4ade80', bg: 'rgba(22, 163, 74,0.1)', border: 'rgba(34, 197, 94,0.25)' },
  DELIVERY_REJECTED:  { color: '#f87171', bg: 'rgba(185,28,28,0.1)', border: 'rgba(239,68,68,0.25)'  },
  VERIFY_DELIVERY:    { color: '#3ddc84', bg: 'rgba(22, 101, 52,0.1)', border: 'rgba(34, 197, 94,0.25)'  },
  LOGIN:              { color: '#a78bfa', bg: 'rgba(109,40,217,0.1)',border: 'rgba(139,92,246,0.25)' },
  LOGOUT:             { color: '#9aa9a1', bg: 'rgba(24, 34, 29,0.4)',  border: 'rgba(40, 56, 48,0.4)'   },
};

const inputStyle: React.CSSProperties = {
  background: 'rgba(17, 24, 21,0.7)', border: '1px solid rgba(40, 56, 48,0.6)',
  borderRadius: 8, color: '#e8efeb', fontSize: 13, outline: 'none',
};

const humanize = (s: string) =>
  s.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase());

const detailValue = (v: unknown): string =>
  v == null ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v);

/** One readable line per entry: "Delivery reference: DEL-001 · Status: approved". */
function Details({ value }: { value: unknown }) {
  if (value == null || value === '') return <span className="text-muted">—</span>;
  const text = typeof value !== 'object' || Array.isArray(value)
    ? detailValue(value)
    : Object.entries(value as Record<string, unknown>)
        .filter(([, v]) => v != null && v !== '')
        .map(([k, v]) => `${humanize(k)}: ${detailValue(v)}`)
        .join(' · ');
  return <span className="audit-detail-text">{text || '—'}</span>;
}

const columns: Column<AuditLog>[] = [
  {
    header: 'When', width: 170,
    cell: (l) => <span style={{ color: '#9aa9a1', whiteSpace: 'nowrap' }}>{formatDate(l.createdAt)}</span>,
  },
  {
    header: 'Who', width: 150,
    cell: (l) => <strong style={{ fontWeight: 600, color: '#e8efeb' }}>{l.actor?.name ?? (l.actorId ? '#' + l.actorId : 'System')}</strong>,
  },
  {
    header: 'What happened', width: 240,
    nowrap: false,
    cell: (l) => {
      const as = ACTION_STYLE[l.action] ?? ACTION_STYLE.LOGOUT;
      return (
        <div>
          <span style={{ ...as, padding: '3px 10px', borderRadius: 9999, border: `1px solid ${as.border}`, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
            {humanize(l.action)}
          </span>
          <p style={{ margin: '6px 0 0', fontSize: 12, color: '#9aa9a1' }}>
            <span style={{ textTransform: 'capitalize' }}>{l.resourceType}</span>
            {l.resourceId ? <span title={l.resourceId} style={{ fontFamily: 'JetBrains Mono, monospace' }}> · {l.resourceId.length > 12 ? l.resourceId.slice(0, 8) + '…' : l.resourceId}</span> : null}
          </p>
        </div>
      );
    },
  },
  { header: 'Details', nowrap: false, cell: (l) => <Details value={l.details} /> },
];

export default function AuditPage() {
  const [logs, setLogs]             = useState<AuditLog[]>([]);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [exporting, setExporting]   = useState(false);
  const [resourceType, setResourceType] = useState('');
  const [page, setPage]             = useState(1);
  const limit = 50;

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await auditApi.logs({ page, limit, resourceType: resourceType || undefined });
      setLogs(res.data.data ?? []);
      setTotal(res.data.total ?? 0);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { fetchLogs(); }, [page, resourceType]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await auditApi.export();
      downloadBlob(res.data, `proofchain-audit-${Date.now()}.csv`);
    } catch { } finally { setExporting(false); }
  };


  return (
    <Page>
      <PageHeader
        title="Audit Logs"
        subtitle={`${total} total entries`}
        backHref="/dashboard"
        actions={
          <>
            <Select
              className="form-input form-input-sm" style={{ width: 140 }}
              value={resourceType} aria-label="Resource type"
              onChange={e => { setResourceType(e.target.value); setPage(1); }}
            >
              <option value="">All Types</option>
              <option value="delivery">Delivery</option>
              <option value="user">User</option>
              <option value="auth">Auth</option>
            </Select>
            {resourceType && <Button variant="secondary" size="sm" onClick={() => { setResourceType(''); setPage(1); }}>Clear</Button>}
            <Button variant="secondary" size="sm" iconOnly icon={RefreshCw} iconSpin={loading} aria-label="Refresh" title="Refresh" onClick={fetchLogs} />
            <Button variant="secondary" size="sm" icon={Download} loading={exporting} onClick={handleExport}>Export CSV</Button>
          </>
        }
      />

      <DataTable
        columns={columns}
        rows={logs}
        loading={loading}
        skeletonRows={8}
        rowKey={(l) => l.id}
        empty={<EmptyState icon={ClipboardList} title="No audit logs found" />}
        startIndex={(page - 1) * limit}
        footer={<Pager page={page} total={total} limit={limit} onPage={setPage} />}
      />
    </Page>
  );
}
