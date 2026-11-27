'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ChevronDown, ChevronRight, KeyRound, LogOut, Mail, UserRound } from 'lucide-react';
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
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const crumbLabels = useCrumbLabels();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userMenuOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!userMenuRef.current?.contains(event.target as Node)) setUserMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [userMenuOpen]);

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
      <MenuToggle open={!menuCollapsed} onClick={onMenuToggle} />

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
          <div className="topnav-account" ref={userMenuRef}>
            <button
              type="button"
              className="topnav-account-trigger"
              aria-haspopup="menu"
              aria-expanded={userMenuOpen}
              onClick={() => setUserMenuOpen((open) => !open)}
            >
              <span className="topnav-account-avatar">{user.name[0]?.toUpperCase()}</span>
              <span className="topnav-user-text">
                <span className="topnav-account-name">{user.name}</span>
                <span className="topnav-account-role" style={{ color: ROLE_COLORS[user.role] ?? '#7b8a82' }}>
                  {ROLE_LABELS[user.role] ?? roleLabel(user.role)}
                </span>
                <span className="topnav-account-clock">
                  <LiveClock style={{ color: '#7b8a82', fontSize: 10, margin: 0, lineHeight: 1.3, fontVariantNumeric: 'tabular-nums' }} />
                </span>
              </span>
              <ChevronDown size={15} className="topnav-account-chevron" aria-hidden />
            </button>
            {userMenuOpen && (
              <div className="topnav-account-menu" role="menu" aria-label="User account">
                <div className="topnav-account-menu-user">
                  <strong>{user.name}</strong>
                  <span>{user.email}</span>
                  <span className="topnav-account-menu-meta">
                    {[user.company?.name, ROLE_LABELS[user.role] ?? roleLabel(user.role)].filter(Boolean).join(' · ')}
                  </span>
                  <span className="topnav-account-menu-id">User ID: {user.id}</span>
                </div>
                <div className="topnav-account-menu-summary">
                  <span className="topnav-account-menu-avatar">{user.name[0]?.toUpperCase()}</span>
                  <span>
                    <strong>{user.name}</strong>
                    <span className="topnav-account-menu-role">{ROLE_LABELS[user.role] ?? roleLabel(user.role)}</span>
                  </span>
                </div>
                <section className="topnav-account-details" aria-label="Account details">
                  <p>Account details</p>
                  <div><UserRound size={18} aria-hidden /><span>Full Name<strong>{user.name}</strong></span></div>
                  <div><KeyRound size={18} aria-hidden /><span>Designation<strong>{ROLE_LABELS[user.role] ?? roleLabel(user.role)}</strong></span></div>
                  <div><Mail size={18} aria-hidden /><span>Email Address<strong>{user.email}</strong></span></div>
                </section>
                <button
                  type="button"
                  className="topnav-account-logout"
                  role="menuitem"
                  onClick={() => { setUserMenuOpen(false); void logout(); }}
                >
                  <LogOut size={16} aria-hidden />
                  <span>Log out</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
