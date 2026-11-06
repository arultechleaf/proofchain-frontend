'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { setCrumbLabel } from '@/lib/breadcrumb';
import { createPortal } from 'react-dom';
import { Children, cloneElement, forwardRef, isValidElement, useCallback, useEffect, useId, useRef, useState } from 'react';
import { AlertCircle, ArrowLeft, CheckCircle2, Eye, Info, Loader2, MoreVertical, Pencil, Search, Trash2 } from 'lucide-react';
import { statusColor, statusLabel } from '@/lib/utils';

/* ── Layout ─────────────────────────────────────────────────────────────── */
/* Styles for everything in this file live in app/globals.css. */

export function Page({ children, narrow }: { children: React.ReactNode; narrow?: boolean }) {
  return <div className={`page${narrow ? ' page-narrow' : ''}`}>{children}</div>;
}

export function PageHeader({
  title, backHref, actions,
}: {
  title: string;
  /** Accepted for compatibility but no longer shown under the title. */
  subtitle?: React.ReactNode;
  backHref?: string;
  actions?: React.ReactNode;
}) {
  const pathname = usePathname();
  // On a record page (/sales/6) the title — e.g. the bill number — becomes the breadcrumb label.
  useEffect(() => { setCrumbLabel(pathname, title); }, [pathname, title]);
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
          {Icon && <Icon size={15} color="#3ddc84" />}
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
  // Up to `cols` columns, but fewer when the container is narrow (e.g. with the menu open), so content never gets squeezed.
  const MIN_COL: Record<number, number> = { 2: 340, 3: 240, 4: 190 };
  const template = typeof cols === 'number'
    ? (MIN_COL[cols] ? `repeat(auto-fit, minmax(max(min(100%, ${MIN_COL[cols]}px), calc((100% - ${gap * (cols - 1)}px) / ${cols})), 1fr))` : `repeat(${cols}, minmax(0, 1fr))`)
    : cols;
  // data-cols lets the stylesheet reflow the grid on tablets and phones.
  return <div className="grid-layout" data-cols={typeof cols === 'number' ? cols : 'custom'} style={{ gridTemplateColumns: template, gap, ...style }}>{children}</div>;
}

/* ── Feedback ───────────────────────────────────────────────────────────── */

const NOTICE_ICON = { error: AlertCircle, success: CheckCircle2, info: Info };

/** A success notice with plain text goes away by itself after 10 seconds (errors and info stay until the page changes them). */
export function Notice({ kind = 'info', children, autoHideMs = kind === 'success' ? 10000 : 0 }: { kind?: keyof typeof NOTICE_ICON; children: React.ReactNode; autoHideMs?: number }) {
  const Icon = NOTICE_ICON[kind];
  const text = typeof children === 'string' ? children : null;
  const [hiddenText, setHiddenText] = useState<string | null>(null);
  useEffect(() => {
    if (!autoHideMs || text === null) return;
    const timer = setTimeout(() => setHiddenText(text), autoHideMs);
    return () => clearTimeout(timer);
  }, [text, autoHideMs]);
  if (text !== null && hiddenText === text) return null;
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
      <Icon size={38} color="#2d3b34" className="empty-state-icon" />
      <p className={`empty-state-title${action ? ' has-action' : ''}`}>{title}</p>
      {action}
    </div>
  );
}

export function StatCard({
  label, value, color = '#3ddc84', icon: Icon, hint, loading,
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
 * The Actions cell of a table: one "⋮" button that opens a list with View, Edit, any extras and Delete.
 * A string target is a link, a function is a click handler. Delete always asks for confirmation first; pass
 * `disabled` with a reason to show it greyed out with that reason as its tooltip.
 */
export function RowActions({ view, edit, remove, extra }: {
  view?: ActionTarget;
  edit?: ActionTarget;
  remove?: { label?: string; confirm: string; onConfirm: () => void | Promise<void>; disabled?: string };
  extra?: React.ReactNode;
}) {
  const { confirm, dialog } = useConfirm();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; up: boolean } | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  const place = useCallback(() => {
    const r = trigger.current?.getBoundingClientRect();
    if (!r) return;
    const up = window.innerHeight - r.bottom < 220 && r.top > window.innerHeight - r.bottom;
    setPos({ top: up ? r.top - 6 : r.bottom + 6, left: Math.max(8, r.right - 190), up });
  }, []);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (!menu.current?.contains(e.target as Node) && !trigger.current?.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); trigger.current?.focus(); } };
    const close = () => setOpen(false);
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', key);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('mousedown', away);
      document.removeEventListener('keydown', key);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [open]);

  const item = (kind: 'view' | 'edit', label: string, target: ActionTarget, Icon: React.ElementType) =>
    typeof target === 'string' ? (
      <Link href={target} className={`row-menu-item row-menu-${kind}`} role="menuitem"><Icon size={15} />{label}</Link>
    ) : (
      <button type="button" className={`row-menu-item row-menu-${kind}`} role="menuitem" onClick={target}><Icon size={15} />{label}</button>
    );

  return (
    <span className="row-actions">
      <button
        type="button" ref={trigger} className="icon-btn" title="Actions" aria-label="Actions" aria-haspopup="menu" aria-expanded={open}
        onClick={() => { if (open) setOpen(false); else { place(); setOpen(true); } }}
      >
        <MoreVertical size={16} />
      </button>
      {open && pos && createPortal(
        <div
          ref={menu} role="menu" className="sel-menu row-menu" onClick={() => setOpen(false)}
          style={{ left: pos.left, width: 190, ...(pos.up ? { bottom: window.innerHeight - pos.top } : { top: pos.top }) }}
        >
          {view && item('view', 'View', view, Eye)}
          {edit && item('edit', 'Edit', edit, Pencil)}
          {extra && <div className="row-menu-extra">{extra}</div>}
          {remove && (
            <button
              type="button" role="menuitem" className="row-menu-item row-menu-delete"
              title={remove.disabled} disabled={!!remove.disabled}
              onClick={async () => {
                if (await confirm({ title: 'Delete this record?', message: remove.confirm, confirmLabel: 'Yes, delete' })) void remove.onConfirm();
              }}
            >
              <Trash2 size={15} />{remove.label ?? 'Delete'}
            </button>
          )}
        </div>,
        document.body,
      )}
      {dialog}
    </span>
  );
}

/** A ready-made "Actions" column for DataTable. */
export function actionsColumn<T>(render: (row: T) => React.ReactNode, width = 70): Column<T> {
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
  rowKey: (row: T) => string | number;
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
export { canWrite, canUse } from '@/lib/roles';

/* ── Confirm dialog (replaces window.confirm) ───────────────────────────── */

export type ConfirmOptions = {
  title?: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red confirm button for destructive actions (default true). */
  danger?: boolean;
};

function ConfirmDialog({ title, message, confirmLabel, cancelLabel, danger = true, onClose }: ConfirmOptions & { onClose: (ok: boolean) => void }) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-overlay" onClick={() => onClose(false)}>
      <div className={`modal ${danger ? 'modal-error' : ''}`} role="alertdialog" aria-modal="true" aria-labelledby="confirm-title"
        onClick={(e) => e.stopPropagation()}>
        {danger && <span className="status-icon"><AlertCircle size={26} /></span>}
        <h3 id="confirm-title" className="modal-title">{title ?? 'Are you sure?'}</h3>
        <p className="modal-text">{message}</p>
        <div className="modal-actions">
          <button ref={cancelRef} type="button" className="btn btn-secondary" onClick={() => onClose(false)}>{cancelLabel ?? 'No, keep it'}</button>
          <button type="button" className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={() => onClose(true)}>{confirmLabel ?? 'Yes, continue'}</button>
        </div>
      </div>
    </div>
  );
}

/**
 * Promise-based confirmation: `const { confirm, dialog } = useConfirm();` render `{dialog}` once,
 * then `if (await confirm({ message: '…' })) doIt();`
 */
export function useConfirm() {
  const [req, setReq] = useState<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(null);
  const confirm = useCallback((o: ConfirmOptions) => new Promise<boolean>((resolve) => setReq({ ...o, resolve })), []);
  const close = useCallback((ok: boolean) => { setReq((r) => { r?.resolve(ok); return null; }); }, []);
  const dialog = req ? <ConfirmDialog {...req} onClose={close} /> : null;
  return { confirm, dialog };
}

/** Mouse drag-to-scroll for a sideways-scrolling box whose scrollbar is hidden (touch already swipes). */
function useDragScroll() {
  const state = useRef({ down: false, moved: false, startX: 0, startLeft: 0 });
  return {
    onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      const el = e.currentTarget;
      if (el.scrollWidth <= el.clientWidth) return;
      state.current = { down: true, moved: false, startX: e.clientX, startLeft: el.scrollLeft };
    },
    onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
      const st = state.current;
      if (!st.down) return;
      const dx = e.clientX - st.startX;
      if (!st.moved && Math.abs(dx) < 5) return;
      if (!st.moved) { st.moved = true; e.currentTarget.classList.add('is-dragging'); }
      e.currentTarget.scrollLeft = st.startLeft - dx;
    },
    onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
      state.current.down = false;
      e.currentTarget.classList.remove('is-dragging');
    },
    onPointerLeave(e: React.PointerEvent<HTMLDivElement>) {
      state.current.down = false;
      e.currentTarget.classList.remove('is-dragging');
    },
    onClickCapture(e: React.MouseEvent<HTMLDivElement>) {
      // a drag must not also count as a click on a link or button under the pointer
      if (state.current.moved) { e.preventDefault(); e.stopPropagation(); state.current.moved = false; }
    },
  };
}

export { Select } from "./Select";
export { Combobox } from "./Combobox";
export { BankIcon } from "./BankIcon";
