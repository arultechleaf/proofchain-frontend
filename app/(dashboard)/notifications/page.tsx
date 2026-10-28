'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, CheckCircle2, CreditCard, FileText, Package, Trash2, X } from 'lucide-react';
import { notificationsApi } from '@/lib/api';
import type { AppNotification, NotificationType } from '@/models';
import { apiError, formatRelative } from '@/lib/utils';
import { Card, EmptyState, Notice, Page, PageHeader, Pager, Spinner, useAsync } from '@/components/ui';

interface NotificationList {
  data: AppNotification[];
  total: number;
  unread: number;
}

const TYPE_ICON: Record<NotificationType, { icon: React.ElementType; color: string }> = {
  delivery: { icon: Package, color: '#60a5fa' },
  approval: { icon: CheckCircle2, color: '#34d399' },
  invoice: { icon: FileText, color: '#a78bfa' },
  payment: { icon: CreditCard, color: '#fbbf24' },
  system: { icon: Bell, color: '#94a3b8' },
};

const LIMIT = 15;

export default function NotificationsPage() {
  const router = useRouter();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState('');

  const { data, loading, error, reload } = useAsync<NotificationList>(
    async () => (await notificationsApi.list({ page, limit: LIMIT, unread: unreadOnly || undefined })).data,
    [page, unreadOnly],
  );

  const run = async (fn: () => Promise<unknown>) => {
    setActionError('');
    try {
      await fn();
      await reload();
      window.dispatchEvent(new Event('notifications:changed'));
    } catch (err) {
      setActionError(apiError(err, 'Action failed'));
    }
  };

  const open = async (n: AppNotification) => {
    if (!n.isRead) await run(() => notificationsApi.markRead(n.id));
    if (n.link) router.push(n.link);
  };

  const items = data?.data ?? [];

  return (
    <Page narrow>
      <PageHeader
        title="Notifications"
     //   subtitle={data ? `${data.unread} unread · ${data.total} ${unreadOnly ? 'unread shown' : 'total'}` : undefined}
     //   actions={
     //     <>
     //       <button className="btn btn-secondary" disabled={!data?.unread} onClick={() => run(() => notificationsApi.markAllRead())}>
     //         <CheckCheck size={14} /> Mark all read
     //       </button>
     //       <button className="btn btn-ghost" onClick={() => run(() => notificationsApi.clearRead())}>
     //         <Trash2 size={14} /> Clear read
     //       </button>
    //      </>
    //    }
      />

      {error ? <Notice kind="error">Could not load notifications.</Notice> : null}
      {actionError ? <Notice kind="error">{actionError}</Notice> : null}

      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {([[false, 'All'], [true, 'Unread']] as const).map(([v, label]) => (
          <button key={label} className={unreadOnly === v ? 'btn btn-primary' : 'btn btn-secondary'}
            onClick={() => { setUnreadOnly(v); setPage(1); }}>
            {label}
          </button>
        ))}
      </div>

      <Card style={{ padding: 0 }}>
        {loading && !data ? (
          <Spinner />
        ) : items.length === 0 ? (
          <EmptyState icon={Bell} title={unreadOnly ? 'No unread notifications' : "You're all caught up"} />
        ) : (
          items.map((n) => {
            const t = TYPE_ICON[n.type] ?? TYPE_ICON.system;
            const Icon = t.icon;
            return (
              <div key={n.id} style={{
                display: 'flex', gap: 12, alignItems: 'flex-start', padding: '14px 18px',
                borderBottom: '1px solid rgba(30,41,59,0.6)',
                background: n.isRead ? 'transparent' : 'rgba(37,99,235,0.06)',
              }}>
                <span style={{
                  width: 34, height: 34, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `${t.color}1f`,
                }}>
                  <Icon size={16} color={t.color} />
                </span>
                <button onClick={() => open(n)} style={{ flex: 1, minWidth: 0, textAlign: 'left', background: 'none', border: 0, cursor: n.link ? 'pointer' : 'default', padding: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: n.isRead ? 500 : 700, color: n.isRead ? '#cbd5e1' : '#f1f5f9' }}>
                    {n.title}
                    {!n.isRead && <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#60a5fa', marginLeft: 8 }} />}
                  </p>
                  <p style={{ margin: '3px 0 0', fontSize: 12, color: '#94a3b8', wordBreak: 'break-word' }}>{n.message}</p>
                  <p style={{ margin: '4px 0 0', fontSize: 11, color: '#475569' }}>{formatRelative(n.createdAt)}</p>
                </button>
                <button aria-label="Delete notification" onClick={() => run(() => notificationsApi.remove(n.id))}
                  style={{ background: 'none', border: 0, cursor: 'pointer', color: '#475569', padding: 4 }}>
                  <X size={14} />
                </button>
              </div>
            );
          })
        )}
        <Pager page={page} total={data?.total ?? 0} limit={LIMIT} onPage={setPage} />
      </Card>
    </Page>
  );
}
