'use client';

import { useSyncExternalStore } from 'react';

/**
 * Labels for dynamic breadcrumb segments (a bill number instead of "6"). A detail page's PageHeader
 * registers its title for the current path; TopNav reads it. Kept outside React state so the two
 * components need no shared parent.
 */
let labels: Record<string, string> = {};
const listeners = new Set<() => void>();

export function setCrumbLabel(path: string, label: string) {
  if (labels[path] === label) return;
  labels = { ...labels, [path]: label };
  listeners.forEach((l) => l());
}

export function useCrumbLabels() {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; },
    () => labels,
    () => labels,
  );
}

/** Numeric ids, UUIDs and 0x hashes — path segments that name a record, not a page. */
export const isRecordSegment = (s: string) =>
  /^\d+$/.test(s) || /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(s) || /^0x[0-9a-f]{16,}$/i.test(s);
