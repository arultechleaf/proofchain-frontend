'use client';

import { useCallback, useSyncExternalStore } from 'react';

/** Rows-per-page choices offered by the pager. */
export const PAGE_SIZES = [5, 10, 15, 25, 50] as const;

const KEY = 'page-size';
const EVENT = 'page-size:changed';

const subscribe = (cb: () => void) => {
  window.addEventListener(EVENT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener('storage', cb);
  };
};
const read = () => {
  try { return localStorage.getItem(KEY) ?? ''; } catch { return ''; }
};

/** Rows per page: starts at the page's own default; once the user picks a size it is remembered for every table. */
export function usePageSize(defaultSize: number): [number, (size: number) => void] {
  const stored = useSyncExternalStore(subscribe, read, () => '');
  const size = Number(stored);
  const limit = (PAGE_SIZES as readonly number[]).includes(size) ? size : defaultSize;
  const setLimit = useCallback((next: number) => {
    try { localStorage.setItem(KEY, String(next)); } catch { /* private mode: keeps the default */ }
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return [limit, setLimit];
}
