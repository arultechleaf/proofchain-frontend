
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  CheckCircle2,
  ShieldCheck,
  Blocks,
  ClipboardList,
  Building2,
  Settings,
  LogOut,
  ChevronLeft,
  Users,
  Boxes,
  Receipt,
  ShoppingCart,
  Wallet,
  Scale,
  Warehouse,
  BarChart3,
  Clock,
  UserCog,
  KeyRound,
  FileText,
  Landmark,
  MapPin,
  Bell,
  History,
  CreditCard,
  TrendingDown,
} from 'lucide-react';
import type { ElementType } from 'react';
import { useAuth } from '@/lib/auth';
import { canView, matchScreen } from '@/lib/access';

interface NavItem {
  href: string;
  icon: ElementType;
  label: string;
  roles?: string[];
  section?: string;
}

const NAV_ITEMS: NavItem[] = [
  // MAIN
  {
    href: '/dashboard',
    icon: LayoutDashboard,
    label: 'Dashboard',
    section: 'Main',
  },
  {
    href: '/notifications',
    icon: Bell,
    label: 'Notifications',
  },

  // BILLING
  {
    href: '/billing',
    icon: CreditCard,
    label: 'Billing Overview',
    section: 'Billing',
  },
  {
    href: '/sales',
    icon: Receipt,
    label: 'Sales',
  },
  {
    href: '/quotations',
    icon: FileText,
    label: 'Quotations & Estimates',
  },
  {
    href: '/purchases',
    icon: ShoppingCart,
    label: 'Purchases',
  },
  {
    href: '/payments',
    icon: Wallet,
    label: 'Payments',
  },

  // PARTIES & FINANCE
  {
    href: '/parties',
    icon: Users,
    label: 'Customers & Suppliers',
    section: 'Parties & Finance',
  },
  {
    href: '/parties/ledger',
    icon: ClipboardList,
    label: 'Party Ledger',
  },
  {
    href: '/reports/outstanding',
    icon: Clock,
    label: 'Outstanding',
  },
  {
    href: '/expenses',
    icon: TrendingDown,
    label: 'Expenses',
  },
  {
    href: '/cash-bank',
    icon: Landmark,
    label: 'Cash & Bank',
  },
  {
    href: '/accounts',
    icon: Scale,
    label: 'Accounts',
  },

  // INVENTORY & LOGISTICS
  {
    href: '/items',
    icon: Boxes,
    label: 'Items',
    section: 'Inventory & Logistics',
  },
  {
    href: '/inventory',
    icon: Warehouse,
    label: 'Inventory',
  },
  {
    href: '/inventory/entry',
    icon: ClipboardList,
    label: 'Stock Entry & Transfer',
  },
  {
    href: '/deliveries',
    icon: Package,
    label: 'Deliveries',
  },
  {
    href: '/approvals',
    icon: CheckCircle2,
    label: 'Approvals',
    roles: ['company_b', 'admin'],
  },

  // REPORTS
  {
    href: '/reports/sales',
    icon: BarChart3,
    label: 'Sales Report',
    section: 'Reports',
  },
  {
    href: '/reports/purchases',
    icon: ShoppingCart,
    label: 'Purchase Report',
  },
  {
    href: '/reports/stock',
    icon: Package,
    label: 'Stock Report',
  },
  {
    href: '/reports/transactions',
    icon: History,
    label: 'Transaction History',
  },

  // MY COMPANY
  {
    href: '/company',
    icon: Building2,
    label: 'Company Profile',
    section: 'My Company',
  },
  {
    href: '/company/team',
    icon: Users,
    label: 'My Team',
  },
  {
    href: '/company/settings',
    icon: Landmark,
    label: 'Bank & Invoice Settings',
  },
  {
    href: '/company/branches',
    icon: MapPin,
    label: 'Branches & Godowns',
  },
  {
    href: '/company/inventory',
    icon: Warehouse,
    label: 'My Inventory',
  },

  // BLOCKCHAIN
  {
    href: '/verification',
    icon: ShieldCheck,
    label: 'Verification',
    section: 'Blockchain',
  },
  {
    href: '/explorer',
    icon: Blocks,
    label: 'Blockchain Explorer',
  },

  // ADMINISTRATION
  {
    href: '/audit',
    icon: ClipboardList,
    label: 'Audit Logs',
    roles: ['auditor', 'admin'],
    section: 'Administration',
  },
  {
    href: '/organizations',
    icon: Building2,
    label: 'Organizations',
    roles: ['admin', 'auditor'],
  },
  {
    href: '/users',
    icon: UserCog,
    label: 'Users',
    roles: ['admin', 'auditor'],
  },
  {
    href: '/roles',
    icon: KeyRound,
    label: 'Roles & Permissions',
    roles: ['admin', 'auditor'],
  },
  {
    href: '/settings',
    icon: Settings,
    label: 'Settings',
  },
];

// Assign each item to its declared section.
const GROUPED_ITEMS = (() => {
  let currentSection = '';

  return NAV_ITEMS.map((item) => {
    if (item.section) currentSection = item.section;

    return {
      ...item,
      group: currentSection,
    };
  });
})();

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout, screens } = useAuth();

  // The menu is built from the screens this user may open (role_permissions in MySQL); the built-in role lists
  // are only a fallback if that list could not be loaded.
  const visibleItems = GROUPED_ITEMS.filter((item) => {
    if (screens) {
      const screen = matchScreen(screens, item.href);
      return !screen || canView(screen.level);
    }
    return !item.roles || (!!user && item.roles.includes(user.role));
  });

  const width = collapsed ? 72 : 240;

  return (
    <aside
      className="app-sidebar"
      data-collapsed={collapsed}
      style={{
        width,
        minWidth: width,
        maxWidth: width,
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        background:
          'linear-gradient(180deg, #050d1a 0%, #080f1f 100%)',
        borderRight: '1px solid rgba(59,130,246,0.12)',
        overflow: 'hidden',
        transition:
          'width 0.3s cubic-bezier(.4,0,.2,1), min-width 0.3s cubic-bezier(.4,0,.2,1)',
        zIndex: 40,
      }}
    >
      {/* Logo */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '18px 14px 16px',
          borderBottom: '1px solid rgba(59,130,246,0.1)',
          flexShrink: 0,
        }}
      >
        <img
          src="/A_logo.svg"
          alt="Inventory Audit"
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            flexShrink: 0,
            objectFit: 'contain',
            background: '#fff',
            boxShadow: '0 0 20px rgba(34,168,102,0.35)',
          }}
        />

        {!collapsed && (
          <div style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
            <p
              style={{
                color: '#fff',
                fontSize: 13,
                fontWeight: 700,
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              Inventory Audit
            </p>
            <p
              style={{
                color: '#64748b',
                fontSize: 11,
                margin: 0,
                lineHeight: 1.4,
              }}
            >
              Blockchain Ledger
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            marginLeft: 'auto',
            flexShrink: 0,
            width: 28,
            height: 28,
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            color: '#475569',
            cursor: 'pointer',
            transition: 'background 0.15s, color 0.15s',
          }}
          onMouseEnter={(event) => {
            event.currentTarget.style.background =
              'rgba(30,41,59,0.8)';
            event.currentTarget.style.color = '#94a3b8';
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.background = 'transparent';
            event.currentTarget.style.color = '#475569';
          }}
        >
          <ChevronLeft
            size={14}
            style={{
              transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s',
            }}
          />
        </button>
      </div>

      {/* Navigation */}
      <nav
        aria-label="Main navigation"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '8px 6px',
        }}
      >
        {visibleItems.map((item, index) => {
          const isActive =
            pathname === item.href ||
            pathname.startsWith(`${item.href}/`);

          const Icon = item.icon;

          const showHeading =
            index === 0 ||
            item.group !== visibleItems[index - 1]?.group;

          return (
            <div key={item.href}>
              {showHeading &&
                (collapsed ? (
                  <div
                    style={{
                      height: 1,
                      background: 'rgba(59,130,246,0.1)',
                      margin: '8px 10px',
                    }}
                  />
                ) : (
                  <p
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: '#334155',
                      margin: '12px 10px 4px',
                    }}
                  >
                    {item.group}
                  </p>
                ))}

              <Link
                href={item.href}
                title={collapsed ? item.label : undefined}
                aria-current={isActive ? 'page' : undefined}
                style={{
                  textDecoration: 'none',
                  display: 'block',
                  marginBottom: 2,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: collapsed ? '9px 0' : '9px 10px',
                    borderRadius: 8,
                    justifyContent: collapsed
                      ? 'center'
                      : 'flex-start',
                    background: isActive
                      ? 'rgba(37,99,235,0.15)'
                      : 'transparent',
                    border: isActive
                      ? '1px solid rgba(59,130,246,0.25)'
                      : '1px solid transparent',
                    color: isActive ? '#60a5fa' : '#64748b',
                    transition: 'all 0.15s',
                    cursor: 'pointer',
                    position: 'relative',
                  }}
                  onMouseEnter={(event) => {
                    if (!isActive) {
                      event.currentTarget.style.background =
                        'rgba(30,41,59,0.7)';
                      event.currentTarget.style.color = '#e2e8f0';
                    }
                  }}
                  onMouseLeave={(event) => {
                    if (!isActive) {
                      event.currentTarget.style.background = 'transparent';
                      event.currentTarget.style.color = '#64748b';
                    }
                  }}
                >
                  <Icon size={16} style={{ flexShrink: 0 }} />

                  {!collapsed && (
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: isActive ? 600 : 500,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {item.label}
                    </span>
                  )}
                </div>
              </Link>
            </div>
          );
        })}
      </nav>

      {/* Sign Out */}
      <div
        style={{
          padding: 6,
          borderTop: '1px solid rgba(59,130,246,0.08)',
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={logout}
          title={collapsed ? 'Sign Out' : undefined}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            width: '100%',
            padding: collapsed ? '9px 0' : '9px 10px',
            borderRadius: 8,
            background: 'transparent',
            border: 'none',
            color: '#475569',
            cursor: 'pointer',
            justifyContent: collapsed ? 'center' : 'flex-start',
            fontSize: 13,
            fontWeight: 500,
            transition: 'all 0.15s',
          }}
          onMouseEnter={(event) => {
            event.currentTarget.style.background =
              'rgba(239,68,68,0.1)';
            event.currentTarget.style.color = '#f87171';
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.background = 'transparent';
            event.currentTarget.style.color = '#475569';
          }}
        >
          <LogOut size={16} style={{ flexShrink: 0 }} />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
