'use client';

import { Children, Fragment, isValidElement, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search } from 'lucide-react';

interface Opt { value: string; label: React.ReactNode; text: string; disabled?: boolean; group?: string }

const textOf = (node: React.ReactNode) =>
  Children.toArray(node).map((c) => (typeof c === 'string' || typeof c === 'number' ? String(c) : '')).join('');

/** Read <option>/<optgroup> children, so the component can be used exactly like a native <select>. */
function collect(children: React.ReactNode, group: string | undefined, out: Opt[]) {
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as React.ReactElement<{ children?: React.ReactNode; value?: string | number; disabled?: boolean; label?: string }>;
    if (el.type === Fragment) return collect(el.props.children, group, out);
    if (el.type === 'optgroup') return collect(el.props.children, el.props.label, out);
    if (el.type === 'option') {
      const text = textOf(el.props.children);
      out.push({ value: el.props.value !== undefined ? String(el.props.value) : text, label: el.props.children, text, disabled: el.props.disabled, group });
    }
  });
}

type Props = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'defaultValue'> & {
  value?: string | number | readonly string[];
  defaultValue?: string | number;
};

/**
 * The app's one dropdown. A drop-in for <select>: same props, same <option> children, same onChange
 * (e.target.value), but a styled list that shows a search box when it is long and is never clipped by a table or card.
 */
export function Select({
  value, defaultValue, onChange, children, className, style, disabled, required, name, id, title,
  'aria-label': ariaLabel,
}: Props) {
  const [inner, setInner] = useState(String(defaultValue ?? ''));
  const current = value !== undefined ? String(Array.isArray(value) ? value[0] ?? '' : value) : inner;

  const options = useMemo(() => { const out: Opt[] = []; collect(children, undefined, out); return out; }, [children]);
  const selected = options.find((o) => o.value === current) ?? (value === undefined && !current ? options[0] : undefined);
  const searchable = options.length > 8;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; up: boolean; max: number } | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const listId = useId();

  const shown = useMemo(
    () => (query.trim() ? options.filter((o) => o.text.toLowerCase().includes(query.trim().toLowerCase())) : options),
    [options, query],
  );

  const place = useCallback(() => {
    const el = trigger.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const below = window.innerHeight - r.bottom - 12;
    const above = r.top - 12;
    const up = below < 220 && above > below;
    const max = Math.max(160, Math.min(320, up ? above : below));
    setPos({ top: up ? r.top - 6 : r.bottom + 6, left: r.left, width: Math.max(r.width, 160), up, max });
  }, []);

  const close = useCallback(() => { setOpen(false); setQuery(''); }, []);

  const openMenu = () => {
    if (disabled) return;
    place();
    setActive(Math.max(0, options.findIndex((o) => o.value === current)));
    setOpen(true);
  };

  const choose = (o: Opt) => {
    if (o.disabled) return;
    if (value === undefined) setInner(o.value);
    onChange?.({ target: { value: o.value, name }, currentTarget: { value: o.value, name } } as unknown as React.ChangeEvent<HTMLSelectElement>);
    close();
    trigger.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (!menu.current?.contains(e.target as Node) && !trigger.current?.contains(e.target as Node)) close();
    };
    const reflow = () => place();
    document.addEventListener('mousedown', away);
    window.addEventListener('resize', reflow);
    window.addEventListener('scroll', reflow, true);
    return () => {
      document.removeEventListener('mousedown', away);
      window.removeEventListener('resize', reflow);
      window.removeEventListener('scroll', reflow, true);
    };
  }, [open, close, place]);

  useEffect(() => {
    if (open) menu.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  const onKey = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openMenu(); }
      return;
    }
    if (e.key === 'Escape') { e.preventDefault(); close(); trigger.current?.focus(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(shown.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (shown[active]) choose(shown[active]); }
    else if (e.key === 'Tab') close();
  };

  const empty = !selected || selected.value === '';
  let lastGroup: string | undefined;

  return (
    <div className="sel" style={style}>
      <button
        type="button" ref={trigger} id={id} title={title} disabled={disabled} aria-label={ariaLabel}
        aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? listId : undefined}
        className={`${className ?? ''} sel-trigger`} onClick={() => (open ? close() : openMenu())} onKeyDown={onKey}
      >
        <span className={`sel-value${empty ? ' sel-placeholder' : ''}`}>{selected ? selected.label : ' '}</span>
        <ChevronDown size={16} className="sel-chevron" aria-hidden />
      </button>
      {/* a hidden field lets the browser's own "required" check keep working */}
      {required && <input className="sel-required" tabIndex={-1} aria-hidden required value={current} onChange={() => undefined} name={name} />}

      {open && pos && createPortal(
        <div
          ref={menu} className="sel-menu" id={listId} role="listbox" onKeyDown={onKey}
          style={{ left: pos.left, width: pos.width, maxHeight: pos.max, ...(pos.up ? { bottom: window.innerHeight - pos.top } : { top: pos.top }) }}
        >
          {searchable && (
            <div className="sel-search">
              <Search size={14} aria-hidden />
              <input autoFocus placeholder="Search…" value={query} onChange={(e) => { setQuery(e.target.value); setActive(0); }} onKeyDown={onKey} />
            </div>
          )}
          {shown.length === 0 && <p className="sel-empty">No match</p>}
          {shown.map((o, i) => {
            const header = o.group && o.group !== lastGroup ? <p className="sel-group">{o.group}</p> : null;
            lastGroup = o.group;
            const isSelected = o.value === current;
            return (
              <Fragment key={`${o.value}-${i}`}>
                {header}
                <div
                  role="option" aria-selected={isSelected} aria-disabled={o.disabled} data-active={i === active}
                  className={`sel-option${isSelected ? ' is-selected' : ''}${i === active ? ' is-active' : ''}${o.disabled ? ' is-disabled' : ''}`}
                  onMouseEnter={() => setActive(i)} onMouseDown={(e) => { e.preventDefault(); choose(o); }}
                >
                  <span>{o.label}</span>
                  {isSelected && <Check size={15} aria-hidden />}
                </div>
              </Fragment>
            );
          })}
        </div>,
        document.body,
      )}
    </div>
  );
}
