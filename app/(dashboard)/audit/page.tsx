'use client';

import { useEffect, useState } from 'react';
import { ClipboardList, Download, RefreshCw } from 'lucide-react';
import { auditApi } from '@/lib/api';
import type { AuditLog } from '@/types';
import { formatDate, downloadBlob } from '@/lib/utils';

const ACTION_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  CREATE_DELIVERY:    { color: '#60a5fa', bg: 'rgba(37,99,235,0.1)',  border: 'rgba(59,130,246,0.25)' },
  DELIVERY_APPROVED:  { color: '#34d399', bg: 'rgba(5,150,105,0.1)', border: 'rgba(16,185,129,0.25)' },
  DELIVERY_REJECTED:  { color: '#f87171', bg: 'rgba(185,28,28,0.1)', border: 'rgba(239,68,68,0.25)'  },
  VERIFY_DELIVERY:    { color: '#22d3ee', bg: 'rgba(8,145,178,0.1)', border: 'rgba(6,182,212,0.25)'  },
  LOGIN:              { color: '#a78bfa', bg: 'rgba(109,40,217,0.1)',border: 'rgba(139,92,246,0.25)' },
  LOGOUT:             { color: '#94a3b8', bg: 'rgba(30,41,59,0.4)',  border: 'rgba(51,65,85,0.4)'   },
};

const TH: React.CSSProperties = {
  textAlign: 'left', padding: '11px 16px',
  fontSize: 11, color: '#64748b', fontWeight: 600,
  textTransform: 'uppercase', letterSpacing: '0.06em',
  borderBottom: '1px solid rgba(59,130,246,0.1)',
  background: 'rgba(5,13,26,0.5)', whiteSpace: 'nowrap',
};

const inputStyle: React.CSSProperties = {
  background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(51,65,85,0.6)',
  borderRadius: 8, color: '#e2e8f0', fontSize: 13, outline: 'none',
};

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

  const btnStyle: React.CSSProperties = { ...inputStyle, height: 36, padding: '0 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500 };

  return (
    <div style={{ padding: '28px 32px', color: '#e2e8f0' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#f1f5f9', margin: 0 }}>Audit Logs</h1>
          <p style={{ color: '#475569', fontSize: 13, marginTop: 4 }}>{total} total entries</p>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select
            value={resourceType}
            onChange={e => { setResourceType(e.target.value); setPage(1); }}
            style={{ ...inputStyle, height: 36, padding: '0 10px', width: 140, cursor: 'pointer' }}
          >
            <option value="">All Types</option>
            <option value="delivery">Delivery</option>
            <option value="user">User</option>
            <option value="auth">Auth</option>
          </select>
          <button onClick={fetchLogs} style={btnStyle} title="Refresh">
            <RefreshCw size={13} color="#94a3b8" style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
          <button onClick={handleExport} disabled={exporting} style={{ ...btnStyle, color: '#94a3b8' }}>
            <Download size={13} /> Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: 'rgba(8,15,30,0.85)', border: '1px solid rgba(59,130,246,0.12)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                {['Time', 'Actor', 'Action', 'Type', 'Resource ID', 'Details'].map(h => (
                  <th key={h} style={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(30,41,59,0.5)' }}>
                    {[140, 110, 150, 70, 80, 180].map((w, j) => (
                      <td key={j} style={{ padding: '11px 16px' }}>
                        <div className="skeleton" style={{ height: 12, borderRadius: 4, width: w }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : logs.length > 0 ? (
                logs.map((log) => {
                  const as = ACTION_STYLE[log.action] ?? ACTION_STYLE.LOGOUT;
                  return (
                    <tr key={log.id}
                      style={{ borderBottom: '1px solid rgba(30,41,59,0.4)', transition: 'background 0.12s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(30,41,59,0.3)'}
                      onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                    >
                      <td style={{ padding: '11px 16px', color: '#64748b', whiteSpace: 'nowrap' }}>{formatDate(log.createdAt)}</td>
                      <td style={{ padding: '11px 16px', color: '#cbd5e1', whiteSpace: 'nowrap' }}>
                        {log.actor?.name ?? (log.actorId ? log.actorId.slice(0, 8) + '…' : 'System')}
                      </td>
                      <td style={{ padding: '11px 16px', whiteSpace: 'nowrap' }}>
                        <span style={{
                          ...as, padding: '2px 8px', borderRadius: 9999,
                          border: `1px solid ${as.border}`,
                          fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 600,
                        }}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ padding: '11px 16px', color: '#94a3b8', textTransform: 'capitalize' }}>{log.resourceType}</td>
                      <td style={{ padding: '11px 16px', fontFamily: 'JetBrains Mono, monospace', color: '#475569', fontSize: 11 }}>
                        {log.resourceId ? log.resourceId.slice(0, 8) + '…' : '—'}
                      </td>
                      <td style={{ padding: '11px 16px', color: '#475569', maxWidth: 260 }}>
                        <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {log.details ? JSON.stringify(log.details).slice(0, 80) : '—'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <ClipboardList size={40} color="#334155" style={{ margin: '0 auto 12px', display: 'block' }} />
                    <p style={{ color: '#475569', fontSize: 14, margin: 0 }}>No audit logs found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > limit && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: '1px solid rgba(59,130,246,0.08)' }}>
            <span style={{ color: '#64748b', fontSize: 12 }}>
              Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { label: '← Prev', act: () => setPage(p => Math.max(1, p - 1)), dis: page === 1 },
                { label: 'Next →', act: () => setPage(p => p + 1),              dis: page * limit >= total },
              ].map(b => (
                <button key={b.label} onClick={b.act} disabled={b.dis} style={{ ...btnStyle, opacity: b.dis ? 0.4 : 1, cursor: b.dis ? 'not-allowed' : 'pointer' }}>
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
