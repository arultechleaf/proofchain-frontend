import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(date));
}

export function formatRelative(date: string | Date): string {
  const now = Date.now();
  const d = new Date(date).getTime();
  const diff = now - d;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export function truncateHash(hash: string, start = 8, end = 6): string {
  if (!hash) return '';
  if (hash.length <= start + end + 3) return hash;
  return `${hash.slice(0, start)}...${hash.slice(-end)}`;
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    pending: 'badge-pending',
    approved: 'badge-approved',
    rejected: 'badge-rejected',
    confirmed: 'badge-confirmed',
    failed: 'badge-rejected',
    verified: 'badge-verified',
    mismatch: 'badge-mismatch',
    not_found: 'badge-mismatch',
    not_submitted: 'badge-pending',
    draft: 'badge-pending',
    completed: 'badge-approved',
    issued: 'badge-confirmed',
    partial: 'badge-pending',
    paid: 'badge-approved',
    cancelled: 'badge-rejected',
    active: 'badge-approved',
    inactive: 'badge-rejected',
  };
  return map[status?.toLowerCase()] ?? 'badge-pending';
}

export function statusLabel(status: string): string {
  return status?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) ?? 'Unknown';
}

export function roleLabel(role: string): string {
  const map: Record<string, string> = {
    admin: 'Administrator',
    company_a: 'Company A (Sender)',
    company_b: 'Company B (Receiver)',
    auditor: 'Auditor',
  };
  return map[role] ?? role;
}

export function roleColor(role: string): string {
  const map: Record<string, string> = {
    admin: 'text-violet-400',
    company_a: 'text-blue-400',
    company_b: 'text-cyan-400',
    auditor: 'text-amber-400',
  };
  return map[role] ?? 'text-slate-400';
}

const moneyFormat = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

export function formatMoney(value: number | null | undefined): string {
  return moneyFormat.format(value ?? 0);
}

/** Format a YYYY-MM-DD string (or Date) as e.g. "11 Oct 2026". */
export function formatDay(date: string | Date | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' && date.length === 10 ? new Date(date + 'T00:00:00') : new Date(date);
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
}

/** Today's date in the user's timezone as YYYY-MM-DD. */
export function todayIso(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

/** Message from an API error response, falling back to a default. */
export function apiError(err: unknown, fallback = 'Something went wrong'): string {
  const res = (err as any)?.response;
  // No response at all: the request never reached a working server (backend down, wrong address, offline).
  if (!res) {
    const code = (err as any)?.code;
    return code === 'ECONNABORTED'
      ? 'The server took too long to answer. Try again.'
      : 'Cannot reach the server. Check that the backend is running and that you are online.';
  }
  const msg = res.data?.message;
  if (Array.isArray(msg)) return msg.join(', ');
  if (typeof msg === 'string' && msg) return msg;
  // The proxy answered but the backend behind it did not (it returns an HTML/empty error page).
  if (res.status >= 500) return `The server had a problem (HTTP ${res.status}). Check that the backend is running.`;
  return fallback;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
