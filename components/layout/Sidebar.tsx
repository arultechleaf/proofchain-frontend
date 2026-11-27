
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  Cpu,
  LayoutDashboard,
  Package,
  CheckCircle2,
  ShieldCheck,
  Blocks,
  ClipboardList,
  Building2,
  Settings,
  Users,
  Boxes,
  Receipt,
  ReceiptText,
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
  BadgeIndianRupee,
  CalendarCheck,
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
    href: '/non-gst-sales',
    icon: ReceiptText,
    label: 'Non-GST Sales',
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
  {
    href: '/wallet',
    icon: Wallet,
    label: 'Wallet',
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
    href: '/subscription-plans',
    icon: BadgeIndianRupee,
    label: 'Subscription Plans',
    roles: ['admin'],
  },
  {
    href: '/subscription',
    icon: CalendarCheck,
    label: 'My Subscription',
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

/** Icon shown beside each main group title. */
const GROUP_ICONS: Record<string, ElementType> = {
  Main: LayoutDashboard,
  Billing: CreditCard,
  'Parties & Finance': Users,
  'Inventory & Logistics': Boxes,
  Reports: BarChart3,
  'My Company': Building2,
  Blockchain: Cpu,
  Administration: Settings,
};

const OPEN_GROUPS_KEY = 'sidebar.openGroups';

function readOpenGroups(): string[] {
  try {
    const raw = localStorage.getItem(OPEN_GROUPS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

interface SidebarProps {
  collapsed: boolean;
  onNavigate?: () => void;
}

export function Sidebar({ collapsed, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const { user, screens } = useAuth();

  // The menu is built from the screens this user may open (role_permissions in MySQL); the built-in role lists
  // are only a fallback if that list could not be loaded.
  const visibleItems = GROUPED_ITEMS.filter((item) => {
    if (screens) {
      const screen = matchScreen(screens, item.href);
      return !screen || canView(screen.level);
    }
    return !item.roles || (!!user && item.roles.includes(user.role));
  });

  // Only the most specific menu entry is highlighted (/inventory/entry must not also light up /inventory).
  const activeHref = visibleItems
    .map((i) => i.href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];

  // Items gathered under their main title (Billing, Parties & Finance, ...), in menu order.
  const groups: { name: string; items: typeof visibleItems }[] = [];
  for (const item of visibleItems) {
    const last = groups[groups.length - 1];
    if (last && last.name === item.group) last.items.push(item);
    else groups.push({ name: item.group, items: [item] });
  }
  const activeGroup = visibleItems.find((i) => i.href === activeHref)?.group;

  // This is an accordion: hovering or selecting a title opens only that group.
  // The current page's group opens when navigation changes.
  const [openGroups, setOpenGroups] = useState<string[]>([]);
  // Narrow sidebar: the group whose list pops out to the right, and where (the sidebar clips its own overflow,
  // so the pop-out is fixed to the window).
  const [flyout, setFlyout] = useState<{ name: string; top: number; left: number } | null>(null);
  const flyoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keepFlyout = () => {
    if (flyoutTimer.current) clearTimeout(flyoutTimer.current);
  };
  const closeFlyoutSoon = () => {
    keepFlyout();
    flyoutTimer.current = setTimeout(() => setFlyout(null), 150);
  };
  useEffect(() => setFlyout(null), [pathname, collapsed]);
  useEffect(() => {
    setOpenGroups(readOpenGroups());
  }, []);
  useEffect(() => {
    if (activeGroup) setOpenGroups([activeGroup]);
  }, [activeGroup]);
  const toggleGroup = (name: string) => {
    setOpenGroups((prev) => {
      // Selecting a new group replaces the previously open one.
      const next = prev.includes(name) ? [] : [name];
      try {
        localStorage.setItem(OPEN_GROUPS_KEY, JSON.stringify(next));
      } catch {
        // storage unavailable: the menu still works, it just won't remember
      }
      return next;
    });
  };

  // Keep the current page's menu item in view when the menu list is longer than the screen.
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    navRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: 'nearest' });
  }, [activeHref, collapsed]);

  const renderItem = (item: (typeof visibleItems)[number], nested: boolean) => {
    const isActive = item.href === activeHref;
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        title={collapsed ? item.label : undefined}
        aria-current={isActive ? 'page' : undefined}
        onClick={onNavigate}
        style={{ textDecoration: 'none', display: 'block', marginBottom: 2 }}
      >
        <div
          className={isActive ? 'nav-item is-active' : 'nav-item'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: collapsed ? '9px 0' : nested ? '8px 10px 8px 14px' : '9px 10px',
            borderRadius: 8,
            justifyContent: collapsed ? 'center' : 'flex-start',
            background: isActive ? 'rgba(22, 163, 74,0.15)' : 'transparent',
            border: isActive ? '1px solid rgba(34, 197, 94,0.25)' : '1px solid transparent',
            color: isActive ? '#3ddc84' : '#7b8a82',
            transition: 'all 0.15s',
            cursor: 'pointer',
            position: 'relative',
          }}
          onMouseEnter={(event) => {
            if (!isActive) {
              event.currentTarget.style.background = 'rgba(24, 34, 29,0.7)';
              event.currentTarget.style.color = '#e8efeb';
            }
          }}
          onMouseLeave={(event) => {
            if (!isActive) {
              event.currentTarget.style.background = 'transparent';
              event.currentTarget.style.color = '#7b8a82';
            }
          }}
        >
          <Icon size={nested ? 15 : 16} style={{ flexShrink: 0 }} />
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
    );
  };

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
          'linear-gradient(180deg, #0b0f0d 0%, #070a09 100%)',
        borderRight: '1px solid rgba(34, 197, 94,0.12)',
        overflow: 'hidden',
        transition:
          'width 0.3s cubic-bezier(.4,0,.2,1), min-width 0.3s cubic-bezier(.4,0,.2,1)',
        zIndex: 40,
      }}
    >
      {/* Logo */}
      <div
        style={{
          height: 56,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          justifyContent: collapsed ? 'center' : undefined,
          padding: collapsed ? '8px 12px' : '8px 14px',
          borderBottom: '1px solid rgba(34, 197, 94,0.1)',
          flexShrink: 0,
        }}
      >
        <Image src="/A_logo.svg" alt="Inventory Audit" width={40} height={40} className="sidebar-brand-logo" />

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
                color: '#7b8a82',
                fontSize: 11,
                margin: 0,
                lineHeight: 1.4,
              }}
            >
              Blockchain Ledger
            </p>
          </div>
        )}

      </div>

      {/* Navigation */}
      <nav
        ref={navRef}
        className="sidebar-nav"
        aria-label="Main navigation"
        style={{
          flex: 1,
          minHeight: 0,
          display: collapsed ? 'flex' : undefined,
          flexDirection: collapsed ? 'column' : undefined,
          justifyContent: collapsed ? 'space-evenly' : undefined,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '8px 6px',
        }}
      >
        {groups.map((group) => {
          // Collapsed (narrow): one icon per group; hovering it pops the group's pages out to the right.
          if (collapsed) {
            const GroupIcon = GROUP_ICONS[group.name] ?? LayoutDashboard;
            const hasActive = group.name === activeGroup;
            const shown = flyout?.name === group.name;
            const openFlyout = (el: HTMLElement) => {
              keepFlyout();
              const r = el.getBoundingClientRect();
              setFlyout({ name: group.name, top: r.top, left: r.right + 6 });
            };
            return (
              <button
                key={group.name}
                type="button"
                aria-label={group.name}
                aria-haspopup="menu"
                aria-expanded={shown}
                onMouseEnter={(e) => openFlyout(e.currentTarget)}
                onMouseLeave={closeFlyoutSoon}
                onFocus={(e) => openFlyout(e.currentTarget)}
                onClick={(e) => (shown ? setFlyout(null) : openFlyout(e.currentTarget))}
                style={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'center',
                  padding: '10px 0',
                  margin: '4px 0',
                  borderRadius: 8,
                  border: '1px solid transparent',
                  background: hasActive ? '#16a34a' : shown ? 'rgba(24, 34, 29,0.55)' : 'transparent',
                  color: hasActive ? '#ffffff' : '#b9c7bf',
                  cursor: 'pointer',
                }}
              >
                <GroupIcon size={18} />
              </button>
            );
          }

          // Expanded: a clickable main title (Billing, Parties & Finance, ...) that opens its list.
          const pinned = openGroups.includes(group.name);
          const open = pinned;
          const GroupIcon = GROUP_ICONS[group.name] ?? LayoutDashboard;
          const hasActive = group.name === activeGroup;
          const panelId = `nav-group-${group.name.replace(/\W+/g, '-').toLowerCase()}`;

          return (
            <div
              key={group.name}
              style={{ marginBottom: 2 }}
              // Desktop users can reveal a section simply by moving the pointer
              // over it; replacing the array closes the previous section.
              onMouseEnter={() => setOpenGroups([group.name])}
              onMouseLeave={() => setOpenGroups((current) =>
                current.includes(group.name) ? [] : current,
              )}
            >
              <button
                type="button"
                className="nav-group-title"
                aria-expanded={open}
                aria-controls={panelId}
                title={pinned ? 'Click to close' : 'Click to keep open'}
                onClick={() => {
                  toggleGroup(group.name);
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 10px',
                  marginTop: 4,
                  borderRadius: 8,
                  border: '1px solid transparent',
                  background: open ? 'rgba(24, 34, 29,0.55)' : 'transparent',
                  color: hasActive ? '#e8efeb' : '#b9c7bf',
                  fontSize: 13,
                  fontWeight: 600,
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                <GroupIcon size={16} style={{ flexShrink: 0, color: hasActive ? '#3ddc84' : undefined }} />
                <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {group.name}
                </span>
              </button>

              {open && (
                <div
                  id={panelId}
                  role="group"
                  aria-label={group.name}
                  style={{
                    margin: '2px 0 4px 17px',
                    paddingLeft: 6,
                    borderLeft: '1px solid rgba(34, 197, 94,0.15)',
                  }}
                >
                  {group.items.map((item) => renderItem(item, true))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {collapsed && flyout && (() => {
        const group = groups.find((g) => g.name === flyout.name);
        if (!group) return null;
        return (
          <div
            role="menu"
            aria-label={group.name}
            className="sidebar-flyout"
            onMouseEnter={keepFlyout}
            onMouseLeave={closeFlyoutSoon}
            style={{
              position: 'fixed',
              // keep the whole list on screen for groups near the bottom
              top: Math.max(8, Math.min(flyout.top, window.innerHeight - 48 - group.items.length * 36)),
              left: flyout.left,
              zIndex: 70,
              minWidth: 210,
              padding: 6,
              borderRadius: 10,
              background: '#0f1512',
              border: '1px solid rgba(34, 197, 94,0.2)',
              boxShadow: '0 12px 32px rgba(0,0,0,0.45)',
            }}
          >
            <p
              style={{
                margin: '4px 8px 6px',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#b9c7bf',
              }}
            >
              {group.name}
            </p>
            {group.items.map((item) => {
              const isActive = item.href === activeHref;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  role="menuitem"
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => {
                    setFlyout(null);
                    onNavigate?.();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 10px',
                    borderRadius: 8,
                    textDecoration: 'none',
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 500,
                    whiteSpace: 'nowrap',
                    color: isActive ? '#ffffff' : '#c9d4ce',
                    background: isActive ? '#16a34a' : 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'rgba(24, 34, 29,0.9)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <Icon size={15} style={{ flexShrink: 0 }} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        );
      })()}

    </aside>
  );
}
