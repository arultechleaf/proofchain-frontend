'use client';

import Link from 'next/link';
import { Children, cloneElement, forwardRef, isValidElement, useCallback, useEffect, useId, useRef, useState } from 'react';
import { AlertCircle, ArrowLeft, CheckCircle2, Eye, Info, Loader2, Pencil, Search, Trash2 } from 'lucide-react';
import { statusColor, statusLabel } from '@/lib/utils';

/* ── Layout ─────────────────────────────────────────────────────────────── */
/* Styles for everything in this file live in app/globals.css. */

export function Page({ children, narrow }: { children: React.ReactNode; narrow?: boolean }) {
  return <div className={`page${narrow ? ' page-narrow' : ''}`}>{children}</div>;
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
    <div className="page-header">
      <div className="page-header-main">
        {backHref && (
          <Link href={backHref} className="page-header-back" aria-label="Back">
            <ArrowLeft size={16} />
          </Link>
        )}
        <div>
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
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
    <div className="glass-card card" style={style}>
      {(title || action) && (
        <div className="card-header">
          {Icon && <Icon size={15} color="#60a5fa" />}
          {title && <h2 className="card-title">{title}</h2>}
          {action && <div className="card-action">{action}</div>}
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
  // data-cols lets the stylesheet reflow the grid on tablets and phones.
  return <div className="grid-layout" data-cols={typeof cols === 'number' ? cols : 'custom'} style={{ gridTemplateColumns: template, gap, ...style }}>{children}</div>;
}

/* ── Feedback ───────────────────────────────────────────────────────────── */

const NOTICE_ICON = { error: AlertCircle, success: CheckCircle2, info: Info };

export function Notice({ kind = 'info', children }: { kind?: keyof typeof NOTICE_ICON; children: React.ReactNode }) {
  const Icon = NOTICE_ICON[kind];
  return (
    <div role={kind === 'error' ? 'alert' : 'status'} className={`notice notice-${kind}`}>
      <Icon size={16} className="notice-icon" />
      <div className="notice-body">{children}</div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return <span className={`badge ${statusColor(status)}`}>{statusLabel(status)}</span>;
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="spinner-block">
      <Loader2 size={18} className="spin" /> {label ?? 'Loading...'}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, action }: { icon: React.ElementType; title: string; action?: React.ReactNode }) {
  return (
    <div className="empty-state">
      <Icon size={38} color="#334155" className="empty-state-icon" />
      <p className={`empty-state-title${action ? ' has-action' : ''}`}>{title}</p>
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
    <div className="glass-card stat-card" style={{ '--stat-color': color } as React.CSSProperties}>
      <div className="stat-card-top">
        <span className="stat-card-label">{label}</span>
        {Icon && (
          <span className="stat-card-icon">
            <Icon size={15} color={color} />
          </span>
        )}
      </div>
      {loading
        ? <div className="skeleton stat-card-skeleton" />
        : <p className="stat-card-value">{value}</p>}
      {hint && <p className="stat-card-hint">{hint}</p>}
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
      {hint && !error && <p className="form-hint">{hint}</p>}
      {error && <p className="form-error">{error}</p>}
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
    <button type={type} onClick={onClick} disabled={loading || disabled} className="btn btn-primary btn-block">
      {loading && <Loader2 size={15} className="spin" />}
      {children}
    </button>
  );
}

/**
 * The one form wrapper every form uses: a vertical stack of fields, an optional error line, and a row with
 * the submit button (and Cancel). `readOnly` disables every field and hides the buttons.
 */
export function Form({
  onSubmit, loading, submitLabel, readOnly, onCancel, cancelLabel = 'Cancel', error, post, children,
}: {
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void | Promise<void>;
  loading?: boolean;
  /** Omit to render no buttons (for forms with their own). */
  submitLabel?: React.ReactNode;
  readOnly?: boolean;
  onCancel?: () => void;
  cancelLabel?: string;
  error?: string;
  /** Posts instead of GET if JavaScript has not loaded yet (keeps passwords out of the URL). */
  post?: boolean;
  children: React.ReactNode;
}) {
  return (
    <form className="form-stack" method={post ? 'post' : undefined} onSubmit={(e) => { e.preventDefault(); void onSubmit(e); }}>
      <fieldset className="form-fieldset" disabled={readOnly}>{children}</fieldset>
      {error ? <Notice kind="error">{error}</Notice> : null}
      {!readOnly && submitLabel != null && (
        <div className="form-actions">
          <SubmitButton loading={loading}>{submitLabel}</SubmitButton>
          {onCancel && <button type="button" className="btn btn-ghost" onClick={onCancel}>{cancelLabel}</button>}
        </div>
      )}
    </form>
  );
}

/* ── Buttons & tabs ─────────────────────────────────────────────────────── */

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost' | 'link';

/** The one button. Looks come from the .btn-* rules in globals.css. */
export function Button({
  variant = 'primary', size = 'md', icon: Icon, iconSpin, iconOnly, loading, fullWidth, type = 'button',
  className, disabled, children, ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: 'sm' | 'md';
  icon?: React.ElementType;
  /** Spin the icon (e.g. a refresh icon while reloading). */
  iconSpin?: boolean;
  /** Square button with just the icon; give it an aria-label. */
  iconOnly?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
}) {
  const classes = ['btn', 'btn-' + variant, size === 'sm' && 'btn-sm', iconOnly && 'btn-icon', fullWidth && 'btn-block btn-full', className]
    .filter(Boolean).join(' ');
  const iconSize = size === 'sm' ? 14 : 15;
  return (
    <button type={type} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <Loader2 size={iconSize} className="spin" /> : Icon ? <Icon size={iconSize} className={iconSpin ? 'spin' : undefined} /> : null}
      {children}
    </button>
  );
}

/** A row of switch buttons (filters, tabs). tone colours the active button; fill stretches them evenly. */
export function Tabs<K extends string | number>({
  value, onChange, options, fill,
}: {
  value: K;
  onChange: (key: K) => void;
  options: ReadonlyArray<{ key: K; label: React.ReactNode; tone?: 'success' | 'danger' }>;
  fill?: boolean;
}) {
  return (
    <div className={'seg' + (fill ? ' seg-fill' : '')} role="tablist">
      {options.map((o) => (
        <button
          key={String(o.key)} type="button" role="tab" aria-selected={value === o.key}
          className={[value === o.key && 'active', o.tone && 'tone-' + o.tone].filter(Boolean).join(' ') || undefined}
          onClick={() => onChange(o.key)}
        >{o.label}</button>
      ))}
    </div>
  );
}

/** Text input with a leading icon (search boxes, comment boxes). Extra props go to the input. */
export function SearchInput({
  icon: Icon = Search, small, ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { icon?: React.ElementType; small?: boolean }) {
  return (
    <div className="input-icon-wrap">
      <Icon size={14} />
      <input {...props} className={['form-input', small && 'form-input-sm', props.className].filter(Boolean).join(' ')} />
    </div>
  );
}

/** Checkbox + label row. Extra props go to the input (works with react-hook-form register). */
export const CheckField = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode }>(
  function CheckField({ label, ...props }, ref) {
    return (
      <label className="form-check">
        <input type="checkbox" ref={ref} {...props} /> {label}
      </label>
    );
  },
);

/* ── Row action icons ───────────────────────────────────────────────────── */

type ActionTarget = string | (() => void);

/**
 * The view / edit / delete icons shown in a table's Actions column. A string target is a link,
 * a function is a click handler. Delete always asks for confirmation first; pass `disabled` with
 * a reason to show the icon greyed out with that reason as its tooltip.
 */
export function RowActions({ view, edit, remove, extra }: {
  view?: ActionTarget;
  edit?: ActionTarget;
  remove?: { label?: string; confirm: string; onConfirm: () => void | Promise<void>; disabled?: string };
  extra?: React.ReactNode;
}) {
  const icon = (kind: 'view' | 'edit', label: string, target: ActionTarget, Icon: React.ElementType) =>
    typeof target === 'string' ? (
      <Link href={target} className={`icon-btn icon-${kind}`} title={label} aria-label={label}><Icon size={15} /></Link>
    ) : (
      <button type="button" className={`icon-btn icon-${kind}`} title={label} aria-label={label} onClick={target}><Icon size={15} /></button>
    );
  return (
    <span className="row-actions">
      {view && icon('view', 'View', view, Eye)}
      {edit && icon('edit', 'Edit', edit, Pencil)}
      {extra}
      {remove && (
        <button
          type="button"
          className="icon-btn icon-delete"
          title={remove.disabled ?? remove.label ?? 'Delete'}
          aria-label={remove.label ?? 'Delete'}
          disabled={!!remove.disabled}
          onClick={() => { if (window.confirm(remove.confirm)) void remove.onConfirm(); }}
        >
          <Trash2 size={15} />
        </button>
      )}
    </span>
  );
}

/** A ready-made "Actions" column for DataTable. */
export function actionsColumn<T>(render: (row: T) => React.ReactNode, width = 130): Column<T> {
  return { header: 'Actions', id: 'actions', align: 'center', width, cell: render };
}

/* ── Tables ─────────────────────────────────────────────────────────────── */

export interface Column<T> {
  header: React.ReactNode;
  /** Stable key; needed only when `header` is not a plain string. */
  id?: string;
  cell: (row: T) => React.ReactNode;
  align?: 'left' | 'right' | 'center';
  width?: number | string;
  nowrap?: boolean;
}

const colKey = <T,>(c: Column<T>) => c.id ?? String(c.header);

/** Shared table; all styling lives in the `.data-table*` rules in globals.css. */
export function DataTable<T>({
  columns, rows, loading, rowKey, empty, footer, compact, bare, minWidth, skeletonRows = 5,
  serial = true, startIndex = 0,
}: {
  columns: Column<T>[];
  rows: T[];
  loading?: boolean;
  rowKey: (row: T) => string;
  empty?: React.ReactNode;
  footer?: React.ReactNode;
  compact?: boolean;
  /** Drop the outer bordered wrapper (e.g. when already inside a Card). */
  bare?: boolean;
  minWidth?: number;
  skeletonRows?: number;
  /** Show an S.No column (default). */
  serial?: boolean;
  /** Rows already shown on earlier pages, so page 2 of 15 starts at 16. */
  startIndex?: number;
}) {
  const align = (c: Column<T>) => `col-${c.align ?? 'left'}`;
  const table = (
    <div className="data-table-scroll">
      <table className={`data-table${compact ? ' data-table-compact' : ''}`} style={minWidth ? { minWidth } : undefined}>
        <thead>
          <tr>
            {serial && <th className="col-center col-serial">S.No</th>}
            {columns.map((c) => (
              <th key={colKey(c)} className={align(c)} style={{ width: c.width }}>{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: skeletonRows }).map((_, i) => (
                <tr key={i}>
                  {serial && <td className="col-serial"><div className="skeleton data-table-skeleton" /></td>}
                  {columns.map((c) => (
                    <td key={colKey(c)}>
                      <div className="skeleton data-table-skeleton" />
                    </td>
                  ))}
                </tr>
              ))
            : rows.length === 0
            ? (
              <tr className="data-table-empty"><td colSpan={columns.length + (serial ? 1 : 0)}>{empty}</td></tr>
            )
            : rows.map((row, index) => (
                <tr key={rowKey(row)}>
                  {serial && <td className="col-center col-serial" data-label="S.No">{startIndex + index + 1}</td>}
                  {columns.map((c) => (
                    <td key={colKey(c)} className={`${align(c)}${c.nowrap === false ? ' col-wrap' : ''}`} data-label={c.id === 'actions' || typeof c.header !== 'string' ? undefined : c.header}>
                      {c.cell(row)}
                    </td>
                  ))}
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  );
  if (bare) return <>{table}{footer}</>;
  return <div className="data-table-wrap">{table}{footer}</div>;
}

export function Pager({ page, total, limit, onPage }: { page: number; total: number; limit: number; onPage: (p: number) => void }) {
  if (total <= limit) return null;
  const btn = (label: string, to: number, disabled: boolean) => (
    <button key={label} onClick={() => onPage(to)} disabled={disabled} className="pager-btn">
      {label}
    </button>
  );
  return (
    <div className="pager">
      <span className="pager-info">
        Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
      </span>
      <div className="pager-buttons">
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
        <div key={k} className="kv-row">
          <span className="kv-key">{k}</span>
          <span className="kv-value">{v ?? '—'}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Data loading & roles (implemented in hooks/ and lib/, re-exported for convenience) ── */

export { useAsync } from '@/controllers/useAsync';
export { canWrite } from '@/lib/roles';
