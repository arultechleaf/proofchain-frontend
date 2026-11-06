'use client';

import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { MenuToggle } from './MenuToggle';
import { LiveClock } from './LiveClock';
import { useAuth } from '@/lib/auth';
import { roleLabel } from '@/lib/utils';
import { isRecordSegment, useCrumbLabels } from '@/lib/breadcrumb';
import { NotificationBell } from '@/components/layout/NotificationBell';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

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
  '/non-gst-sales': 'Non-GST Sales',
  '/purchases': 'Purchases',
  '/payments': 'Payments',
  '/parties': 'Customers & Suppliers',
  '/items': 'Items',
  '/inventory': 'Inventory',
  '/inventory/entry': 'Stock Entry, Transfer & Returns',
  '/inventory/entry/import': 'Add Stock from Invoice PDF',
  '/company/inventory': 'My Inventory',
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
  '/company': 'Company Profile',
  '/company/team': 'My Team',
  '/company/settings': 'Bank & Invoice Settings',
  '/company/branches': 'Branches & Godowns',
  '/users': 'Users',
  '/roles': 'Roles & Permissions',
  '/profile': 'My Profile',
};


const ROLE_COLORS: Record<string, string> = {
  admin: '#a78bfa',
  company_a: '#3ddc84',
  company_b: '#3ddc84',
  auditor: '#fbbf24',
  manager: '#4ade80',
  user: '#9aa9a1',
};
const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrator',
  company_a: 'Company A',
  company_b: 'Company B',
  auditor: 'Auditor',
  manager: 'Manager',
  user: 'User',
};

interface TopNavProps {
  onMenuToggle?: () => void;
  menuCollapsed?: boolean;
}

export function TopNav({ onMenuToggle, menuCollapsed = false }: TopNavProps) {
  const { user } = useAuth();
  const pathname = usePathname();
  const crumbLabels = useCrumbLabels();

  const crumbs = pathname
    .split('/')
    .filter(Boolean)
    .reduce<Array<{ label: string; href: string }>>((acc, segment, i, arr) => {
      const href = '/' + arr.slice(0, i + 1).join('/');
      const label = BREADCRUMBS[href]
        ?? (isRecordSegment(segment) ? (crumbLabels[href] ?? 'Details') : segment.charAt(0).toUpperCase() + segment.slice(1));
      acc.push({ label, href });
      return acc;
    }, []);

  return (
    <header className="topnav" style={{
      height: 56,
      minHeight: 56,
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      padding: '0 24px',
      borderBottom: '1px solid rgba(34, 197, 94,0.1)',
      background: 'rgba(11, 15, 13,0.85)',
      backdropFilter: 'blur(12px)',
      flexShrink: 0,
    }}>
      {/* Mobile menu */}
      <span className="only-mobile" style={{ display: 'none' }}><MenuToggle open={!menuCollapsed} onClick={onMenuToggle} /></span>
      <img src="/A_logo.svg" alt="Inventory Audit" className="only-desktop topnav-logo" />

      {/* Breadcrumbs */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, flex: 1, overflow: 'hidden' }}>
        {crumbs.map((crumb, i) => (
          <span key={crumb.href} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {i > 0 && <ChevronRight size={12} color="#2d3b34" />}
            <span style={{
              color: i === crumbs.length - 1 ? '#e8efeb' : '#55655d',
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

        <ThemeToggle />

        {/* Notifications */}
        <NotificationBell enabled={!!user} />

        {/* User chip */}
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 8 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 9, flexShrink: 0,
              background: 'linear-gradient(135deg, #16a34a, #166534)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 14, fontWeight: 700,
            }}>
              {user.name[0]?.toUpperCase()}
            </div>
            <div className="topnav-user-text" style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 1, textAlign: "left", whiteSpace: "nowrap" }}>
              <p style={{ color: '#e8efeb', fontSize: 13, fontWeight: 600, margin: 0, lineHeight: 1.2 }}>{user.name}</p>
              <p style={{ color: ROLE_COLORS[user.role] ?? '#7b8a82', fontSize: 10, margin: 0, lineHeight: 1.3 }}>{ROLE_LABELS[user.role] ?? roleLabel(user.role)}</p>
              <LiveClock style={{ color: '#7b8a82', fontSize: 10, margin: 0, lineHeight: 1.3, fontVariantNumeric: 'tabular-nums' }} />
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
