'use client';

import { usePathname } from 'next/navigation';
import { ChevronRight, Menu } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { NotificationBell } from '@/components/layout/NotificationBell';

const BREADCRUMBS: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/deliveries': 'Deliveries',
  '/deliveries/create': 'Create Delivery',
  '/approvals': 'Approvals',
  '/verification': 'Verification',
  '/explorer': 'Blockchain Explorer',
  '/audit': 'Audit Logs',
  '/organizations': 'Organizations',
  '/settings': 'Settings',
  '/sales': 'Sales',
  '/purchases': 'Purchases',
  '/payments': 'Payments',
  '/parties': 'Customers & Suppliers',
  '/items': 'Items',
  '/inventory': 'Inventory',
  '/accounts': 'Accounts',
  '/reports': 'Reports',
  '/reports/sales': 'Sales Report',
  '/reports/outstanding': 'Outstanding',
  '/reports/stock': 'Stock Report',
  '/reports/purchases': 'Purchase Report',
  '/reports/transactions': 'Transaction History',
  '/notifications': 'Notifications',
  '/billing': 'Billing',
  '/quotations': 'Quotations & Estimates',
  '/quotations/create': 'New Quotation',
  '/expenses': 'Expenses',
  '/cash-bank': 'Cash & Bank',
  '/parties/ledger': 'Party Ledger',
  '/users': 'Users',
  '/roles': 'Roles & Permissions',
  '/profile': 'My Profile',
};

/** Path segments that are record IDs or hashes rather than page names. */
const isIdSegment = (s: string) => /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(s) || /^0x[0-9a-f]{16,}$/i.test(s);

const ROLE_COLORS: Record<string, string> = {
  admin: '#a78bfa',
  company_a: '#60a5fa',
  company_b: '#22d3ee',
  auditor: '#fbbf24',
};
const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrator',
  company_a: 'Company A',
  company_b: 'Company B',
  auditor: 'Auditor',
};

interface TopNavProps {
  onMenuToggle?: () => void;
}

export function TopNav({ onMenuToggle }: TopNavProps) {
  const { user } = useAuth();
  const pathname = usePathname();

  const crumbs = pathname
    .split('/')
    .filter(Boolean)
    .reduce<Array<{ label: string; href: string }>>((acc, segment, i, arr) => {
      const href = '/' + arr.slice(0, i + 1).join('/');
      const label = BREADCRUMBS[href] ?? (isIdSegment(segment) ? 'Details' : segment.charAt(0).toUpperCase() + segment.slice(1));
      acc.push({ label, href });
      return acc;
    }, []);

  return (
    <header style={{
      height: 56,
      minHeight: 56,
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      padding: '0 24px',
      borderBottom: '1px solid rgba(59,130,246,0.1)',
      background: 'rgba(5,13,26,0.85)',
      backdropFilter: 'blur(12px)',
      flexShrink: 0,
    }}>
      {/* Mobile menu */}
      <button
        onClick={onMenuToggle}
        style={{ color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {/* Breadcrumbs */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, flex: 1, overflow: 'hidden' }}>
        {crumbs.map((crumb, i) => (
          <span key={crumb.href} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {i > 0 && <ChevronRight size={12} color="#334155" />}
            <span style={{
              color: i === crumbs.length - 1 ? '#e2e8f0' : '#475569',
              fontWeight: i === crumbs.length - 1 ? 600 : 400,
              whiteSpace: 'nowrap',
            }}>
              {crumb.label}
            </span>
          </span>
        ))}
      </nav>

      {/* Right actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto', flexShrink: 0 }}>
        {/* Demo badge 
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '2px 10px', borderRadius: 9999,
          background: 'rgba(245,158,11,0.1)', color: '#fbbf24',
          border: '1px solid rgba(245,158,11,0.2)',
          fontSize: 11, fontWeight: 500,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fbbf24', display: 'inline-block' }} />
          Demo Mode
        </span>*/}

        {/* Notifications */}
        <NotificationBell enabled={!!user} />

        {/* User chip */}
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 7, flexShrink: 0,
              background: 'linear-gradient(135deg, #2563eb, #0891b2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 11, fontWeight: 700,
            }}>
              {user.name[0]?.toUpperCase()}
            </div>
            <div>
              <p style={{ color: '#e2e8f0', fontSize: 12, fontWeight: 600, margin: 0, lineHeight: 1.2 }}>{user.name}</p>
              <p style={{ color: ROLE_COLORS[user.role] ?? '#64748b', fontSize: 10, margin: 0, lineHeight: 1.3 }}>{ROLE_LABELS[user.role] ?? user.role}</p>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
