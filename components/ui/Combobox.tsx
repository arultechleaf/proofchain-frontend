'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface ComboOption { value: string; hint?: string | null }

/**
 * A text box with the app's dropdown list under it (same look as Select). The user can pick a suggestion or
 * type something new, so it replaces <input list="…"> + <datalist>. onChange receives the text, typed or picked.
 */
export function Combobox({
  value, onChange, options, placeholder, className, style, required, id, name, disabled, ...aria
}: {
  value: string;
  onChange: (text: string) => void;
  options: ComboOption[];
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  required?: boolean;
  id?: string;
  name?: string;
  disabled?: boolean;
  'aria-label'?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; up: boolean; max: number } | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const listId = useId();

  const shown = useMemo(() => {
    const q = value.trim().toLowerCase();
    const list = q ? options.filter((o) => o.value.toLowerCase().includes(q) || (o.hint ?? '').toLowerCase().includes(q)) : options;
    return list.slice(0, 60);
  }, [options, value]);

  const place = useCallback(() => {
    const el = input.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const below = window.innerHeight - r.bottom - 12;
    const above = r.top - 12;
    const up = below < 200 && above > below;
    setPos({ top: up ? r.top - 6 : r.bottom + 6, left: r.left, width: Math.max(r.width, 200), up, max: Math.max(140, Math.min(300, up ? above : below)) });
  }, []);

  const show = () => { if (disabled) return; place(); setOpen(true); };
  const pick = (o: ComboOption) => { onChange(o.value); setOpen(false); };

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (!menu.current?.contains(e.target as Node) && !input.current?.contains(e.target as Node)) setOpen(false);
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
  }, [open, place]);

  useEffect(() => {
    if (open) menu.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (!open) show(); else setActive((a) => Math.min(shown.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === 'Enter' && open && shown[active]) { e.preventDefault(); pick(shown[active]); }
    else if (e.key === 'Escape' || e.key === 'Tab') setOpen(false);
  };

  return (
    <div className="sel" style={style}>
      <input
        ref={input} id={id} name={name} className={className} value={value} placeholder={placeholder} required={required} disabled={disabled}
        autoComplete="off" role="combobox" aria-expanded={open} aria-controls={open ? listId : undefined} aria-autocomplete="list" aria-label={aria['aria-label']}
        onFocus={show} onClick={show} onKeyDown={onKey}
        onChange={(e) => { onChange(e.target.value); setActive(0); if (!open) show(); }}
      />
      {open && pos && shown.length > 0 && createPortal(
        <div
          ref={menu} id={listId} role="listbox" className="sel-menu"
          style={{ left: pos.left, width: pos.width, maxHeight: pos.max, ...(pos.up ? { bottom: window.innerHeight - pos.top } : { top: pos.top }) }}
        >
          {shown.map((o, i) => (
            <div
              key={`${o.value}-${i}`} role="option" aria-selected={o.value === value} data-active={i === active}
              className={`sel-option${o.value === value ? ' is-selected' : ''}${i === active ? ' is-active' : ''}`}
              onMouseEnter={() => setActive(i)} onMouseDown={(e) => { e.preventDefault(); pick(o); }}
            >
              <span>{o.value}</span>
              {o.hint ? <span className="sel-hint">{o.hint}</span> : null}
            </div>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
}
