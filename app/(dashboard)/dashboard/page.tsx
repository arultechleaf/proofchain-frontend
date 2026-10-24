'use client';

import { useEffect, useState } from 'react';
import { motion, animate } from 'framer-motion';
import { Package, CheckCircle2, XCircle, Clock, Blocks, TrendingUp, RefreshCw, ArrowUpRight } from 'lucide-react';
import { dashboardApi, reportsApi } from '@/lib/api';
import { formatMoney, formatRelative, statusLabel, todayIso } from '@/lib/utils';
import { StatCard as UiStatCard } from '@/components/ui';
import Link from 'next/link';

// ── Animated counter ──────────────────────────────────────────────────────────
function AnimatedCounter({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const controls = animate(0, value, { duration: 1.0, ease: [0.16, 1, 0.3, 1], onUpdate: (v) => setDisplay(Math.round(v)) });
    return controls.stop;
  }, [value]);
  return <>{display.toLocaleString()}</>;
}

// ── Color map ─────────────────────────────────────────────────────────────────
const COLORS: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  blue:    { bg: 'rgba(37,99,235,0.12)',   border: 'rgba(59,130,246,0.25)',   text: '#60a5fa',  glow: 'rgba(59,130,246,0.2)' },
  emerald: { bg: 'rgba(5,150,105,0.12)',   border: 'rgba(16,185,129,0.25)',  text: '#34d399',  glow: 'rgba(16,185,129,0.2)' },
  amber:   { bg: 'rgba(180,83,9,0.12)',    border: 'rgba(245,158,11,0.25)',  text: '#fbbf24',  glow: 'rgba(245,158,11,0.2)' },
  red:     { bg: 'rgba(185,28,28,0.12)',   border: 'rgba(239,68,68,0.25)',   text: '#f87171',  glow: 'rgba(239,68,68,0.2)'  },
  violet:  { bg: 'rgba(109,40,217,0.12)',  border: 'rgba(139,92,246,0.25)',  text: '#a78bfa',  glow: 'rgba(139,92,246,0.2)' },
  cyan:    { bg: 'rgba(8,145,178,0.12)',   border: 'rgba(6,182,212,0.25)',   text: '#22d3ee',  glow: 'rgba(6,182,212,0.2)'  },
};

const STATUS_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  pending:   { bg: 'rgba(245,158,11,0.1)',  color: '#fbbf24', border: 'rgba(245,158,11,0.25)'  },
  approved:  { bg: 'rgba(16,185,129,0.1)',  color: '#34d399', border: 'rgba(16,185,129,0.25)'  },
  rejected:  { bg: 'rgba(239,68,68,0.1)',   color: '#f87171', border: 'rgba(239,68,68,0.25)'   },
  confirmed: { bg: 'rgba(59,130,246,0.1)',  color: '#60a5fa', border: 'rgba(59,130,246,0.25)'  },
  verified:  { bg: 'rgba(20,184,166,0.1)',  color: '#2dd4bf', border: 'rgba(20,184,166,0.25)'  },
};

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color, delta, suffix, loading }: {
  icon: React.ElementType; label: string; value: number; color: string; delta?: string; suffix?: string; loading?: boolean;
}) {
  const c = COLORS[color] ?? COLORS.blue;
  return (
    <div style={{
      background: c.bg, border: `1px solid ${c.border}`, borderRadius: 14, padding: '20px 22px',
      display: 'flex', flexDirection: 'column', gap: 8, position: 'relative', overflow: 'hidden',
      boxShadow: `0 4px 24px ${c.glow}`,
      transition: 'transform 0.15s, box-shadow 0.15s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: c.bg, border: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} color={c.text} />
        </div>
      </div>
      <div style={{ fontSize: 34, fontWeight: 800, color: '#f1f5f9', lineHeight: 1 }}>
        {loading ? <span style={{ background: 'rgba(30,41,59,0.8)', borderRadius: 6, display: 'inline-block', width: 60, height: 34 }} /> : <><AnimatedCounter value={value} />{suffix && <span style={{ fontSize: 20, marginLeft: 2, color: '#94a3b8' }}>{suffix}</span>}</>}
      </div>
      {delta && <span style={{ fontSize: 11, color: '#34d399', display: 'flex', alignItems: 'center', gap: 3 }}><TrendingUp size={11} /> {delta}</span>}
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────
function Badge({ status }: { status: string }) {
  const s = STATUS_STYLES[status.toLowerCase()] ?? STATUS_STYLES.pending;
  return (
    <span style={{ ...s, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 9999, border: `1px solid ${s.border}`, textTransform: 'capitalize' }}>
      {statusLabel(status)}
    </span>
  );
}

/** The API only returns days that had deliveries; fill the gaps so the last 7 days always show. */
function lastSevenDays(rows: Array<{ date: string; count: number | string }>) {
  const byDate = new Map(rows.map((r) => [String(r.date).slice(0, 10), Number(r.count)]));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const date = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    return { date, count: byDate.get(date) ?? 0 };
  });
}

// ── Main dashboard ────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [summary, setSummary]     = useState<any>(null);
  const [daily, setDaily]         = useState<Array<{ date: string; count: number }>>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [billing, setBilling]     = useState<{ sales: number; purchases: number; receivable: number; payable: number; lowStock: number } | null>(null);
  const [loading, setLoading]     = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sumRes, actRes] = await Promise.all([
        dashboardApi.summary(),
        dashboardApi.activity(),
      ]);
      setSummary(sumRes.data?.data ?? sumRes.data);
      // The API returns { deliveryActivity, recentDeliveries, recentTransactions }.
      const payload = actRes.data?.data ?? actRes.data ?? {};
      const acts: any[] = Array.isArray(payload) ? payload : (payload.recentDeliveries ?? []);
      setDaily(lastSevenDays(Array.isArray(payload) ? [] : (payload.deliveryActivity ?? [])));
      setDeliveries(acts.filter((a: any) => a.deliveryReference).slice(0, 6));

      // Billing snapshot is best-effort; the delivery widgets above don't depend on it.
      const to = todayIso();
      const from30 = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
      Promise.all([
        reportsApi.sales({ type: 'sale', from: from30, to }),
        reportsApi.sales({ type: 'purchase', from: from30, to }),
        reportsApi.outstanding(),
        reportsApi.stock(),
      ]).then(([sales, purchases, outstanding, stock]) => setBilling({
        sales: sales.data.data.totals.total,
        purchases: purchases.data.data.totals.total,
        receivable: outstanding.data.data.totals.receivable,
        payable: outstanding.data.data.totals.payable,
        lowStock: stock.data.data.totals.lowStockCount,
      })).catch(() => setBilling(null));
      setLastUpdated(new Date());
    } catch (e) {
      console.error('Dashboard error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const weekTotal = daily.reduce((n, d) => n + d.count, 0);

  const stats = [
    { icon: Package,    label: 'Total Deliveries',      value: summary?.totalDeliveries ?? 0,       color: 'blue',    delta: weekTotal > 0 ? `${weekTotal} added in the last 7 days` : undefined },
    { icon: CheckCircle2,label: 'Approved',             value: summary?.approvedDeliveries ?? 0,    color: 'emerald' },
    { icon: Clock,      label: 'Pending Approval',      value: summary?.pendingApprovals ?? 0,       color: 'amber' },
    { icon: XCircle,    label: 'Rejected',              value: summary?.rejectedDeliveries ?? 0,     color: 'red' },
    { icon: Blocks,     label: 'Blockchain Txns',       value: summary?.blockchainTransactions ?? 0, color: 'violet' },
    { icon: TrendingUp, label: 'Verification Rate',     value: summary?.verificationSuccessRate ?? 0,color: 'cyan',    suffix: '%' },
  ];

  return (
    <div style={{ padding: '28px 32px', minHeight: '100%', color: '#e2e8f0' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#f1f5f9', margin: 0, lineHeight: 1.2 }}>Dashboard</h1>
          <p style={{ color: '#475569', fontSize: 13, marginTop: 4 }}>Last updated {formatRelative(lastUpdated)}</p>
        </div>
        <button onClick={fetchData} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
          background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(51,65,85,0.6)',
          borderRadius: 8, color: '#94a3b8', fontSize: 13, fontWeight: 500, cursor: 'pointer',
        }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
        {stats.map((s) => <StatCard key={s.label} {...s} loading={loading} />)}
      </div>

      {/* Billing snapshot */}
      {billing && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={{ color: '#94a3b8', fontSize: 12, fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Billing · last 30 days
            </h2>
            <Link href="/reports/sales" style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#60a5fa', fontSize: 12, textDecoration: 'none' }}>
              Reports <ArrowUpRight size={12} />
            </Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
            <UiStatCard label="Sales" value={formatMoney(billing.sales)} color="#60a5fa" />
            <UiStatCard label="Purchases" value={formatMoney(billing.purchases)} color="#22d3ee" />
            <UiStatCard label="To receive" value={formatMoney(billing.receivable)} color="#34d399" hint="Unpaid sales" />
            <UiStatCard label="To pay" value={formatMoney(billing.payable)} color="#f87171" hint="Unpaid purchases" />
            <UiStatCard label="Low stock items" value={billing.lowStock} color={billing.lowStock ? '#fbbf24' : '#34d399'} />
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Recent Deliveries */}
        <div style={{ background: 'rgba(8,15,30,0.8)', border: '1px solid rgba(59,130,246,0.12)', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(59,130,246,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ color: '#f1f5f9', fontSize: 15, fontWeight: 700, margin: 0 }}>Recent Deliveries</h2>
            </div>
            <Link href="/deliveries" style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#60a5fa', fontSize: 12, textDecoration: 'none' }}>
              View all <ArrowUpRight size={12} />
            </Link>
          </div>
          <div style={{ padding: '8px 0' }}>
            {loading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} style={{ padding: '10px 20px', display: 'flex', gap: 12 }}>
                  <div className="skeleton" style={{ width: 90, height: 14, borderRadius: 4 }} />
                  <div className="skeleton" style={{ flex: 1, height: 14, borderRadius: 4 }} />
                  <div className="skeleton" style={{ width: 60, height: 14, borderRadius: 4 }} />
                </div>
              ))
            ) : deliveries.length > 0 ? (
              deliveries.map((d: any) => (
                <Link key={d.id} href={`/deliveries/${d.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{
                    padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 12,
                    borderBottom: '1px solid rgba(30,41,59,0.6)',
                    transition: 'background 0.15s',
                  }}
                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'rgba(30,41,59,0.4)'}
                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
                  >
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#60a5fa', minWidth: 110 }}>{d.deliveryReference}</span>
                    <span style={{ flex: 1, color: '#94a3b8', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.description}</span>
                    <Badge status={d.status} />
                  </div>
                </Link>
              ))
            ) : (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#475569', fontSize: 13 }}>
                No deliveries yet.{' '}
                <Link href="/deliveries/create" style={{ color: '#60a5fa', textDecoration: 'none' }}>Create your first</Link>
              </div>
            )}
          </div>
        </div>

        {/* Activity feed */}
        <div style={{ background: 'rgba(8,15,30,0.8)', border: '1px solid rgba(59,130,246,0.12)', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(59,130,246,0.08)' }}>
            <h2 style={{ color: '#f1f5f9', fontSize: 15, fontWeight: 700, margin: 0 }}>Delivery Activity</h2>
            <p style={{ color: '#475569', fontSize: 12, margin: '2px 0 0' }}>Deliveries created per day, last 7 days</p>
          </div>
          <div style={{ padding: '8px 0' }}>
            {weekTotal > 0 ? (() => {
              const max = Math.max(...daily.map((d) => d.count), 1);
              return daily.map((d) => (
                <div key={d.date} style={{ padding: '9px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ width: 62, color: '#64748b', fontSize: 12 }}>
                    {new Date(d.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })}
                  </span>
                  <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'rgba(30,41,59,0.7)', overflow: 'hidden' }}>
                    <div style={{ width: `${(d.count / max) * 100}%`, height: '100%', borderRadius: 4, background: 'linear-gradient(90deg,#2563eb,#22d3ee)', transition: 'width 0.4s' }} />
                  </div>
                  <span style={{ width: 24, textAlign: 'right', color: d.count ? '#e2e8f0' : '#334155', fontSize: 12, fontWeight: 600 }}>{d.count}</span>
                </div>
              ));
            })() : (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#475569', fontSize: 13 }}>No deliveries in the last 7 days</div>
            )}
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
        {[
          { href: '/sales/create',      label: '+ New Sale',        color: '#60a5fa', bg: 'rgba(37,99,235,0.12)', border: 'rgba(59,130,246,0.25)' },
          { href: '/payments/create',   label: '+ Record Payment',  color: '#34d399', bg: 'rgba(5,150,105,0.12)', border: 'rgba(16,185,129,0.25)' },
          { href: '/deliveries/create', label: '+ New Delivery',    color: '#2563eb', bg: 'rgba(37,99,235,0.15)', border: 'rgba(59,130,246,0.3)' },
          { href: '/approvals',         label: '✓ Approvals Queue', color: '#10b981', bg: 'rgba(5,150,105,0.12)', border: 'rgba(16,185,129,0.25)' },
          { href: '/verification',      label: '⛉ Verify Proof',   color: '#22d3ee', bg: 'rgba(8,145,178,0.12)', border: 'rgba(6,182,212,0.25)' },
          { href: '/explorer',          label: '⬡ Blockchain',      color: '#a78bfa', bg: 'rgba(109,40,217,0.12)',border: 'rgba(139,92,246,0.25)' },
        ].map(q => (
          <Link key={q.href} href={q.href} style={{ textDecoration: 'none' }}>
            <div style={{
              background: q.bg, border: `1px solid ${q.border}`, borderRadius: 10,
              padding: '12px 16px', color: q.color, fontSize: 13, fontWeight: 600,
              textAlign: 'center', transition: 'opacity 0.15s',
            }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.opacity = '0.8'}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.opacity = '1'}
            >
              {q.label}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
