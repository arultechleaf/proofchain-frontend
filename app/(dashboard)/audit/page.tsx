'use client';

import { useEffect, useState } from 'react';
import { ClipboardList, Download, RefreshCw } from 'lucide-react';
import { auditApi } from '@/lib/api';
import type { AuditLog } from '@/models';
import { formatDate, downloadBlob } from '@/lib/utils';
import { Column, DataTable, EmptyState, Pager, Button, Page, PageHeader } from '@/components/ui';

const ACTION_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  CREATE_DELIVERY:    { color: '#60a5fa', bg: 'rgba(37,99,235,0.1)',  border: 'rgba(59,130,246,0.25)' },
  DELIVERY_APPROVED:  { color: '#34d399', bg: 'rgba(5,150,105,0.1)', border: 'rgba(16,185,129,0.25)' },
  DELIVERY_REJECTED:  { color: '#f87171', bg: 'rgba(185,28,28,0.1)', border: 'rgba(239,68,68,0.25)'  },
  VERIFY_DELIVERY:    { color: '#22d3ee', bg: 'rgba(8,145,178,0.1)', border: 'rgba(6,182,212,0.25)'  },
  LOGIN:              { color: '#a78bfa', bg: 'rgba(109,40,217,0.1)',border: 'rgba(139,92,246,0.25)' },
  LOGOUT:             { color: '#94a3b8', bg: 'rgba(30,41,59,0.4)',  border: 'rgba(51,65,85,0.4)'   },
};

const inputStyle: React.CSSProperties = {
  background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(51,65,85,0.6)',
  borderRadius: 8, color: '#e2e8f0', fontSize: 13, outline: 'none',
};

const columns: Column<AuditLog>[] = [
  { header: 'Time', cell: (l) => <span style={{ color: '#64748b' }}>{formatDate(l.createdAt)}</span> },
  { header: 'Actor', cell: (l) => l.actor?.name ?? (l.actorId ? l.actorId.slice(0, 8) + '…' : 'System') },
  {
    header: 'Action',
    cell: (l) => {
      const as = ACTION_STYLE[l.action] ?? ACTION_STYLE.LOGOUT;
      return (
        <span style={{ ...as, padding: '2px 8px', borderRadius: 9999, border: `1px solid ${as.border}`, fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 600 }}>
          {l.action}
        </span>
      );
    },
  },
  { header: 'Type', cell: (l) => <span style={{ color: '#94a3b8', textTransform: 'capitalize' }}>{l.resourceType}</span> },
  {
    header: 'Resource ID',
    cell: (l) => (
      <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#475569', fontSize: 11 }}>
        {l.resourceId ? l.resourceId.slice(0, 8) + '…' : '—'}
      </span>
    ),
  },
  {
    header: 'Details',
    cell: (l) => (
      <span className="audit-details">
        {l.details ? JSON.stringify(l.details).slice(0, 80) : '—'}
      </span>
    ),
  },
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
        actions={
          <>
            <select
              className="form-input form-input-sm" style={{ width: 140 }}
              value={resourceType} aria-label="Resource type"
              onChange={e => { setResourceType(e.target.value); setPage(1); }}
            >
              <option value="">All Types</option>
              <option value="delivery">Delivery</option>
              <option value="user">User</option>
              <option value="auth">Auth</option>
            </select>
            <Button variant="secondary" size="sm" iconOnly icon={RefreshCw} iconSpin={loading} aria-label="Refresh" title="Refresh" onClick={fetchLogs} />
            <Button variant="secondary" size="sm" icon={Download} loading={exporting} onClick={handleExport}>Export CSV</Button>
          </>
        }
      />

      <DataTable
        compact
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
