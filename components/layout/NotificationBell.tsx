'use client';

/**
 * The bell in the header. Clicking it opens a small pop-up with the latest notifications
 * (instead of leaving the page); "View all" opens the full Notifications page.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, CheckCheck, CheckCircle2, CreditCard, FileText, Package } from 'lucide-react';
import { notificationsApi } from '@/lib/api';
import { formatRelative } from '@/lib/utils';
import type { AppNotification, NotificationType } from '@/models';

const POPUP_SIZE = 8;

const TYPE_ICON: Record<NotificationType, { icon: React.ElementType; color: string }> = {
  delivery: { icon: Package, color: '#60a5fa' },
  approval: { icon: CheckCircle2, color: '#34d399' },
  invoice: { icon: FileText, color: '#a78bfa' },
  payment: { icon: CreditCard, color: '#fbbf24' },
  system: { icon: Bell, color: '#94a3b8' },
};

export function NotificationBell({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const refreshCount = useCallback(async () => {
    try {
      setUnread((await notificationsApi.unreadCount()).data.data.unread ?? 0);
    } catch {
      /* the badge is best-effort */
    }
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const res = await notificationsApi.list({ page: 1, limit: POPUP_SIZE });
      setItems(res.data.data ?? []);
      setUnread(res.data.unread ?? 0);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Keep the badge fresh: on every page change, every minute, and when another part of the app changes notifications.
  useEffect(() => {
    if (!enabled) return;
    refreshCount();
    const onChanged = () => { refreshCount(); if (open) loadList(); };
    const timer = setInterval(refreshCount, 60000);
    window.addEventListener('notifications:changed', onChanged);
    return () => {
      clearInterval(timer);
      window.removeEventListener('notifications:changed', onChanged);
    };
  }, [enabled, pathname, open, refreshCount, loadList]);

  // Close on outside click, Escape, or navigating somewhere else.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  useEffect(() => { setOpen(false); }, [pathname]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) loadList();
  };

  const openItem = async (n: AppNotification) => {
    setOpen(false);
    if (!n.isRead) {
      try {
        await notificationsApi.markRead(n.id);
        window.dispatchEvent(new Event('notifications:changed'));
      } catch { /* still follow the link */ }
    }
    if (n.link) router.push(n.link);
  };

  const markAll = async () => {
    try {
      await notificationsApi.markAllRead();
      setItems((list) => list.map((n) => ({ ...n, isRead: true })));
      setUnread(0);
      window.dispatchEvent(new Event('notifications:changed'));
    } catch { /* leave the list as it is */ }
  };

  return (
    <div className="notif-bell" ref={rootRef}>
      <button
        type="button"
        className={`notif-bell-btn${unread ? ' has-unread' : ''}`}
        onClick={toggle}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`}
      >
        <Bell size={16} />
        {unread > 0 && <span className="notif-badge">{unread > 99 ? '99+' : unread}</span>}
      </button>

      {open && (
        <div className="notif-pop" role="dialog" aria-label="Notifications">
          <div className="notif-pop-head">
            <strong>Notifications</strong>
            <button type="button" className="notif-link-btn" onClick={markAll} disabled={!unread}>
              <CheckCheck size={13} /> Mark all read
            </button>
          </div>

          <div className="notif-pop-list">
            {loading && items.length === 0 && <p className="notif-pop-empty">Loading…</p>}
            {failed && <p className="notif-pop-empty">Could not load notifications.</p>}
            {!loading && !failed && items.length === 0 && <p className="notif-pop-empty">You&apos;re all caught up</p>}
            {items.map((n) => {
              const t = TYPE_ICON[n.type] ?? TYPE_ICON.system;
              const Icon = t.icon;
              return (
                <button key={n.id} type="button" className={`notif-item${n.isRead ? '' : ' unread'}`} onClick={() => openItem(n)}>
                  <span className="notif-item-icon" style={{ background: `${t.color}1f` }}><Icon size={14} color={t.color} /></span>
                  <span className="notif-item-body">
                    <span className="notif-item-title">{n.title}{!n.isRead && <i className="notif-dot" />}</span>
                    <span className="notif-item-msg">{n.message}</span>
                    <span className="notif-item-time">{formatRelative(n.createdAt)}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <Link href="/notifications" className="notif-pop-foot" onClick={() => setOpen(false)}>View all notifications</Link>
        </div>
      )}
    </div>
  );
}
