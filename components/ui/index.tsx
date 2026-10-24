'use client';

import Link from 'next/link';
import { Children, cloneElement, isValidElement, useCallback, useEffect, useId, useRef, useState } from 'react';
import { AlertCircle, ArrowLeft, CheckCircle2, Info, Loader2 } from 'lucide-react';
import { statusColor, statusLabel } from '@/lib/utils';

/* ── Layout ─────────────────────────────────────────────────────────────── */

export function Page({ children, narrow }: { children: React.ReactNode; narrow?: boolean }) {
  return (
    <div style={{ padding: '28px 32px', maxWidth: narrow ? 760 : 1280, margin: '0 auto', color: '#e2e8f0' }}>
      {children}
    </div>
  );
}

export function PageHeader({
  title, subtitle, backHref, actions,
}: {
  title: string;
  subtitle?: React.ReactNode;
  backHref?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 22, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {backHref && (
          <Link href={backHref} style={{ padding: 8, borderRadius: 8, color: '#64748b', display: 'flex' }} aria-label="Back">
            <ArrowLeft size={16} />
          </Link>
        )}
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#f1f5f9', margin: 0, lineHeight: 1.2 }}>{title}</h1>
          {subtitle && <p style={{ color: '#64748b', fontSize: 13, marginTop: 3 }}>{subtitle}</p>}
        </div>
      </div>
      {actions && <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>{actions}</div>}
    </div>
  );
}

export function Card({
  title, icon: Icon, action, children, style,
}: {
  title?: string;
  icon?: React.ElementType;
  action?: React.ReactNode;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div className="glass-card" style={{ borderRadius: 16, padding: '20px 22px', ...style }}>
      {(title || action) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          {Icon && <Icon size={15} color="#60a5fa" />}
          {title && <h2 style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0', margin: 0 }}>{title}</h2>}
          {action && <div style={{ marginLeft: 'auto' }}>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

export function Grid({ cols, gap = 16, children, style }: {
  cols: number | string; gap?: number; children: React.ReactNode; style?: React.CSSProperties;
}) {
  const template = typeof cols === 'number' ? `repeat(${cols}, minmax(0, 1fr))` : cols;
  return <div style={{ display: 'grid', gridTemplateColumns: template, gap, ...style }}>{children}</div>;
}

/* ── Feedback ───────────────────────────────────────────────────────────── */

const NOTICE = {
  error: { icon: AlertCircle, color: '#f87171', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)' },
  success: { icon: CheckCircle2, color: '#34d399', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)' },
  info: { icon: Info, color: '#60a5fa', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.25)' },
};

export function Notice({ kind = 'info', children }: { kind?: keyof typeof NOTICE; children: React.ReactNode }) {
  const n = NOTICE[kind];
  const Icon = n.icon;
  return (
    <div role={kind === 'error' ? 'alert' : 'status'} style={{
      display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 14px', borderRadius: 10,
      background: n.bg, border: `1px solid ${n.border}`, color: n.color, fontSize: 13, marginBottom: 14,
    }}>
      <Icon size={16} style={{ flexShrink: 0, marginTop: 1 }} />
      <div style={{ minWidth: 0, wordBreak: 'break-word' }}>{children}</div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return <span className={`badge ${statusColor(status)}`}>{statusLabel(status)}</span>;
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 48, color: '#64748b', fontSize: 13 }}>
      <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> {label ?? 'Loading...'}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, action }: { icon: React.ElementType; title: string; action?: React.ReactNode }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 20px' }}>
      <Icon size={38} color="#334155" style={{ margin: '0 auto 12px', display: 'block' }} />
      <p style={{ color: '#64748b', fontSize: 14, marginBottom: action ? 14 : 0 }}>{title}</p>
      {action}
    </div>
  );
}

export function StatCard({
  label, value, color = '#60a5fa', icon: Icon, hint, loading,
}: {
  label: string;
  value: React.ReactNode;
  color?: string;
  icon?: React.ElementType;
  hint?: string;
  loading?: boolean;
}) {
  return (
    <div className="glass-card" style={{ borderRadius: 16, padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>{label}</span>
        {Icon && (
          <span style={{ width: 30, height: 30, borderRadius: 9, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={15} color={color} />
          </span>
        )}
      </div>
      {loading
        ? <div className="skeleton" style={{ height: 26, width: 110, borderRadius: 6 }} />
        : <p style={{ fontSize: 22, fontWeight: 700, color, margin: 0, lineHeight: 1.1 }}>{value}</p>}
      {hint && <p style={{ fontSize: 11, color: '#475569', marginTop: 6 }}>{hint}</p>}
    </div>
  );
}

/* ── Forms ──────────────────────────────────────────────────────────────── */

export function Field({
  label, error, hint, children, required,
}: {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  // Tie the label to its control so clicking it focuses the input and screen readers announce it.
  const autoId = useId();
  const nodes = Children.toArray(children);
  const control = nodes.find(
    (n): n is React.ReactElement<{ id?: string }> =>
      isValidElement(n) && (n.type === 'input' || n.type === 'select' || n.type === 'textarea'),
  );
  const controlId = control?.props.id ?? autoId;
  return (
    <div>
      <label className="form-label" htmlFor={control ? controlId : undefined}>{label}{required && ' *'}</label>
      {control ? nodes.map((n) => (n === control ? cloneElement(control, { id: controlId, key: controlId }) : n)) : children}
      {hint && !error && <p style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>{hint}</p>}
      {error && <p style={{ fontSize: 12, color: '#f87171', marginTop: 4 }}>{error}</p>}
    </div>
  );
}

export function SubmitButton({
  loading, children, disabled, onClick, type = 'submit',
}: {
  loading?: boolean;
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'submit' | 'button';
}) {
  return (
    <button type={type} onClick={onClick} disabled={loading || disabled} className="btn btn-primary"
      style={{ justifyContent: 'center', opacity: loading || disabled ? 0.6 : 1 }}>
      {loading && <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />}
      {children}
    </button>
  );
}

/* ── Tables ─────────────────────────────────────────────────────────────── */

export interface Column<T> {
  header: string;
  cell: (row: T) => React.ReactNode;
  align?: 'left' | 'right' | 'center';
  width?: number | string;
  nowrap?: boolean;
}

const TH: React.CSSProperties = {
  padding: '12px 16px', fontSize: 11, color: '#64748b', fontWeight: 600,
  textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap',
  borderBottom: '1px solid rgba(59,130,246,0.1)', background: 'rgba(5,13,26,0.6)',
};

export function DataTable<T>({
  columns, rows, loading, rowKey, empty, footer,
}: {
  columns: Column<T>[];
  rows: T[];
  loading?: boolean;
  rowKey: (row: T) => string;
  empty?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div style={{ background: 'rgba(8,15,30,0.8)', border: '1px solid rgba(59,130,246,0.12)', borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.header} style={{ ...TH, textAlign: c.align ?? 'left', width: c.width }}>{c.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(30,41,59,0.5)' }}>
                    {columns.map((c) => (
                      <td key={c.header} style={{ padding: '13px 16px' }}>
                        <div className="skeleton" style={{ height: 13, borderRadius: 4, width: '70%' }} />
                      </td>
                    ))}
                  </tr>
                ))
              : rows.length === 0
              ? (
                <tr><td colSpan={columns.length}>{empty}</td></tr>
              )
              : rows.map((row) => (
                  <tr key={rowKey(row)} style={{ borderBottom: '1px solid rgba(30,41,59,0.5)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(30,41,59,0.4)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                    {columns.map((c) => (
                      <td key={c.header} style={{
                        padding: '12px 16px', textAlign: c.align ?? 'left', color: '#cbd5e1',
                        whiteSpace: c.nowrap === false ? 'normal' : 'nowrap',
                      }}>
                        {c.cell(row)}
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
      {footer}
    </div>
  );
}

export function Pager({ page, total, limit, onPage }: { page: number; total: number; limit: number; onPage: (p: number) => void }) {
  if (total <= limit) return null;
  const btn = (label: string, to: number, disabled: boolean) => (
    <button key={label} onClick={() => onPage(to)} disabled={disabled} style={{
      padding: '6px 12px', borderRadius: 7, fontSize: 12, fontWeight: 500,
      cursor: disabled ? 'not-allowed' : 'pointer', background: 'rgba(30,41,59,0.8)',
      border: '1px solid rgba(51,65,85,0.6)', color: disabled ? '#334155' : '#94a3b8', opacity: disabled ? 0.5 : 1,
    }}>
      {label}
    </button>
  );
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: '1px solid rgba(59,130,246,0.08)' }}>
      <span style={{ color: '#64748b', fontSize: 12 }}>
        Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
      </span>
      <div style={{ display: 'flex', gap: 8 }}>
        {btn('← Prev', page - 1, page === 1)}
        {btn('Next →', page + 1, page * limit >= total)}
      </div>
    </div>
  );
}

export function KeyValue({ rows }: { rows: Array<[string, React.ReactNode]> }) {
  return (
    <div>
      {rows.map(([k, v]) => (
        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '9px 0', borderBottom: '1px solid rgba(30,41,59,0.6)', fontSize: 13 }}>
          <span style={{ color: '#64748b', flexShrink: 0 }}>{k}</span>
          <span style={{ color: '#e2e8f0', textAlign: 'right', wordBreak: 'break-word' }}>{v ?? '—'}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Data loading ───────────────────────────────────────────────────────── */

/** Run an async loader on mount and whenever `deps` change; exposes reload. */
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await loaderRef.current());
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { reload(); }, deps);

  return { data, loading, error, reload };
}

/** Role helpers used to hide actions the API would reject anyway. */
export function canWrite(role?: string) {
  return role === 'admin' || role === 'company_a' || role === 'company_b';
}
