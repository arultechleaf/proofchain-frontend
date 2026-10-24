'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard, Package, CheckCircle2, ShieldCheck, Blocks,
  ClipboardList, Building2, Settings, LogOut, ChevronLeft, Shield,
  Users, Boxes, Receipt, ShoppingCart, Wallet, Scale, Warehouse,
  BarChart3, Clock, UserCog, KeyRound,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';

interface NavItem {
  href: string;
  icon: React.ElementType;
  label: string;
  roles?: string[];
  /** Heading shown above the first item of each section. */
  section?: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard',            icon: LayoutDashboard, label: 'Dashboard' },

  { href: '/sales',                icon: Receipt,         label: 'Sales',               section: 'Billing' },
  { href: '/purchases',            icon: ShoppingCart,    label: 'Purchases' },
  { href: '/payments',             icon: Wallet,          label: 'Payments' },
  { href: '/parties',              icon: Users,           label: 'Customers & Suppliers' },
  { href: '/items',                icon: Boxes,           label: 'Items' },
  { href: '/inventory',            icon: Warehouse,       label: 'Inventory' },
  { href: '/accounts',             icon: Scale,           label: 'Accounts' },

  { href: '/reports/sales',        icon: BarChart3,       label: 'Sales Report',        section: 'Reports' },
  { href: '/reports/outstanding',  icon: Clock,           label: 'Outstanding' },
  { href: '/reports/stock',        icon: Package,         label: 'Stock Report' },

  { href: '/deliveries',           icon: Package,         label: 'Deliveries',          section: 'Deliveries' },
  { href: '/approvals',            icon: CheckCircle2,    label: 'Approvals',           roles: ['company_b', 'admin'] },
  { href: '/verification',         icon: ShieldCheck,     label: 'Verification' },

  { href: '/explorer',             icon: Blocks,          label: 'Blockchain Explorer', section: 'Blockchain' },
  { href: '/audit',                icon: ClipboardList,   label: 'Audit Logs',          roles: ['auditor', 'admin'] },

  { href: '/organizations',        icon: Building2,       label: 'Organizations',       roles: ['admin', 'auditor'], section: 'Administration' },
  { href: '/users',                icon: UserCog,         label: 'Users',               roles: ['admin', 'auditor'] },
  { href: '/roles',                icon: KeyRound,        label: 'Roles & Permissions', roles: ['admin', 'auditor'] },
  { href: '/settings',             icon: Settings,        label: 'Settings' },
];

// Each item belongs to the section declared at or before it, so a heading survives
// even when the item that declares it is hidden for the current role.
let currentSection = '';
const GROUPED_ITEMS = NAV_ITEMS.map((item) => {
  if (item.section) currentSection = item.section;
  return { ...item, group: currentSection };
});

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

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const visibleItems = GROUPED_ITEMS.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  );

  const W = collapsed ? 72 : 240;

  return (
    <aside style={{
      width: W,
      minWidth: W,
      maxWidth: W,
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      background: 'linear-gradient(180deg, #050d1a 0%, #080f1f 100%)',
      borderRight: '1px solid rgba(59,130,246,0.12)',
      overflow: 'hidden',
      transition: 'width 0.3s cubic-bezier(.4,0,.2,1), min-width 0.3s cubic-bezier(.4,0,.2,1)',
      zIndex: 40,
    }}>

      {/* ── Logo ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '18px 14px 16px',
        borderBottom: '1px solid rgba(59,130,246,0.1)',
        flexShrink: 0,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 20px rgba(37,99,235,0.4)',
        }}>
          <Shield size={18} color="#fff" />
        </div>
        {!collapsed && (
          <div style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
            <p style={{ color: '#fff', fontSize: 13, fontWeight: 700, margin: 0, lineHeight: 1.2 }}>ProofChain</p>
            <p style={{ color: '#64748b', fontSize: 11, margin: 0, lineHeight: 1.4 }}>Blockchain Delivery</p>
          </div>
        )}
        <button onClick={onToggle} style={{
          marginLeft: 'auto', flexShrink: 0,
          width: 28, height: 28, borderRadius: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'transparent', border: 'none',
          color: '#475569', cursor: 'pointer',
          transition: 'background 0.15s, color 0.15s',
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(30,41,59,0.8)'; (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#475569'; }}
        >
          <ChevronLeft size={14} style={{ transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }} />
        </button>
      </div>

      {/* ── User info ── */}
      {user && (
        <div style={{
          padding: collapsed ? '10px 8px' : '10px 12px',
          borderBottom: '1px solid rgba(59,130,246,0.08)',
          flexShrink: 0,
        }}>
          <Link href="/profile" title="My profile" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, justifyContent: collapsed ? 'center' : 'flex-start' }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8, flexShrink: 0,
              background: 'linear-gradient(135deg, #2563eb, #0891b2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 12, fontWeight: 700,
            }}>
              {user.name[0]?.toUpperCase()}
            </div>
            {!collapsed && (
              <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
                <p style={{ color: '#e2e8f0', fontSize: 11, fontWeight: 600, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</p>
                <p style={{ color: ROLE_COLORS[user.role] ?? '#64748b', fontSize: 10, margin: 0 }}>{ROLE_LABELS[user.role] ?? user.role}</p>
              </div>
            )}
          </Link>
        </div>
      )}

      {/* ── Nav ── */}
      <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '8px 6px' }}>
        {visibleItems.map((item, index) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          // A section heading is only shown when this item starts a new section among the visible items.
          const showHeading = index > 0 && item.group !== visibleItems[index - 1].group;
          return (
            <div key={item.href}>
              {showHeading && (collapsed
                ? <div style={{ height: 1, background: 'rgba(59,130,246,0.1)', margin: '8px 10px' }} />
                : <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#334155', margin: '12px 10px 4px' }}>
                    {item.group}
                  </p>)}
            <Link href={item.href} style={{ textDecoration: 'none', display: 'block', marginBottom: 2 }}>
              <div
                title={collapsed ? item.label : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: collapsed ? '9px 0' : '9px 10px',
                  borderRadius: 8,
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  background: isActive ? 'rgba(37,99,235,0.15)' : 'transparent',
                  border: isActive ? '1px solid rgba(59,130,246,0.25)' : '1px solid transparent',
                  color: isActive ? '#60a5fa' : '#64748b',
                  transition: 'all 0.15s',
                  cursor: 'pointer',
                  position: 'relative',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    (e.currentTarget as HTMLDivElement).style.background = 'rgba(30,41,59,0.7)';
                    (e.currentTarget as HTMLDivElement).style.color = '#e2e8f0';
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                    (e.currentTarget as HTMLDivElement).style.color = '#64748b';
                  }
                }}
              >
                <Icon size={16} style={{ flexShrink: 0 }} />
                {!collapsed && (
                  <span style={{ fontSize: 13, fontWeight: isActive ? 600 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.label}
                  </span>
                )}
              </div>
            </Link>
            </div>
          );
        })}
      </nav>

      {/* ── Logout ── */}
      <div style={{ padding: '6px', borderTop: '1px solid rgba(59,130,246,0.08)', flexShrink: 0 }}>
        <button onClick={logout} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          width: '100%', padding: collapsed ? '9px 0' : '9px 10px',
          borderRadius: 8, background: 'transparent', border: 'none',
          color: '#475569', cursor: 'pointer',
          justifyContent: collapsed ? 'center' : 'flex-start',
          fontSize: 13, fontWeight: 500, transition: 'all 0.15s',
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.1)'; (e.currentTarget as HTMLButtonElement).style.color = '#f87171'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#475569'; }}
        >
          <LogOut size={16} style={{ flexShrink: 0 }} />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
