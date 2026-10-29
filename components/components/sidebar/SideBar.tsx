"use client";

import React, { useEffect, useState } from "react";
import styles from "./SideBar.module.css";

/* ==========================================================================
   TYPES
   ========================================================================== */
export type SidebarSubItem = {
  id: string;
  label: string;
  href?: string;
  onClick?: () => void;
};

export type SidebarItem = SidebarSubItem & {
  icon?: React.ReactNode;
  children?: SidebarSubItem[];
};

type SideBarProps = {
  items: SidebarItem[];
  activeId?: string;
  onSelect?: (id: string) => void;
  sidebarWidth?: string;
  headerCenter?: React.ReactNode;
  cartCount?: number;
  onCartClick?: () => void;
  avatarSrc?: string;
  avatarAlt?: string;
  avatarFallback?: string;
  onAvatarClick?: () => void;
  children?: React.ReactNode;
  className?: string;
};

/* ==========================================================================
   ICONS
   ========================================================================== */
const menuIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

const cartIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 3h3l2.6 12.2h11l2-8.2H6" />
    <circle cx="9.5" cy="20" r="1.4" fill="currentColor" />
    <circle cx="17.5" cy="20" r="1.4" fill="currentColor" />
  </svg>
);

const arrowIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 5l7 7-7 7" />
  </svg>
);

/* ==========================================================================
   HELPERS
   ========================================================================== */
const cx = (...classes: (string | false | undefined)[]) =>
  classes.filter(Boolean).join(" ");

const isPhone = () => window.matchMedia("(max-width: 768px)").matches;

/* ==========================================================================
   COMPONENT
   ========================================================================== */
const SideBar = ({
  items,
  activeId,
  onSelect,
  sidebarWidth,
  headerCenter,
  cartCount,
  onCartClick,
  avatarSrc,
  avatarAlt = "Profile",
  avatarFallback = "U",
  onAvatarClick,
  children,
  className,
}: SideBarProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [openDropdowns, setOpenDropdowns] = useState<string[]>(() =>
    items
      .filter((item) => item.children?.some((child) => child.id === activeId))
      .map((item) => item.id)
  );

  const [animationsOn, setAnimationsOn] = useState(false);

  useEffect(() => {
    if (isPhone()) setSidebarOpen(false);

    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => setAnimationsOn(true));
    });
    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
    };
  }, []);

  const toggleSidebar = () => setSidebarOpen((open) => !open);

  const isDropdownOpen = (id: string) => openDropdowns.includes(id);

  const handleDropdownClick = (id: string) => {
    if (sidebarOpen) {
      setOpenDropdowns((prev) =>
        prev.includes(id) ? prev.filter((openId) => openId !== id) : [...prev, id]
      );
    } else {
      setSidebarOpen(true);
      setOpenDropdowns((prev) => (prev.includes(id) ? prev : [...prev, id]));
    }
  };

  const handleLinkClick = (event: React.MouseEvent, entry: SidebarSubItem) => {
    if (!entry.href) event.preventDefault();
    entry.onClick?.();
    onSelect?.(entry.id);
    if (isPhone()) setSidebarOpen(false);
  };

  const linkClass = (id: string, isSubLink = false) =>
    cx(
      styles.sidebar_nav_row,
      isSubLink && styles.sidebar_nav_row_child,
      id === activeId && styles.sidebar_nav_row_active
    );

  const tooltip = (label: string) => (sidebarOpen ? undefined : label);

  const shellStyle = sidebarWidth
    ? ({ "--sidebar-width": sidebarWidth } as React.CSSProperties)
    : undefined;

  return (
    <div
      style={shellStyle}
      className={cx(
        styles.sidebar_shell,
        !sidebarOpen && styles.sidebar_shell_collapsed,
        animationsOn && styles.sidebar_shell_animated,
        className
      )}
    >
      {/* ===================== HEADER ===================== */}
      <header className={styles.sidebar_header}>
        <div className={styles.sidebar_header_left}>
          <button
            type="button"
            className={styles.sidebar_header_menu}
            onClick={toggleSidebar}
            aria-label="Toggle menu"
            aria-expanded={sidebarOpen}
          >
            {menuIcon}
          </button>
        </div>

        <div className={styles.sidebar_header_center}>{headerCenter}</div>

        <div className={styles.sidebar_header_right}>
          <button
            type="button"
            className={styles.sidebar_header_cart}
            onClick={onCartClick}
            aria-label={cartCount ? `Cart, ${cartCount} items` : "Cart"}
          >
            <span className={styles.sidebar_header_cart_icon}>
              {cartIcon}
              {!!cartCount && (
                <span className={styles.sidebar_header_badge}>{cartCount > 99 ? "99+" : cartCount}</span>
              )}
            </span>
            <span className={styles.sidebar_header_cart_label}>Cart</span>
          </button>

          <button
            type="button"
            className={styles.sidebar_header_avatar}
            onClick={onAvatarClick}
            aria-label="Open profile"
          >
            {avatarSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarSrc} alt={avatarAlt} />
            ) : (
              <span>{avatarFallback}</span>
            )}
          </button>
        </div>
      </header>

      {/* ====================== BODY ====================== */}
      <div className={styles.sidebar_body}>
        <div className={styles.sidebar_overlay} onClick={() => setSidebarOpen(false)} aria-hidden="true" />

        {/* ---------- sidebar ---------- */}
        <aside className={styles.sidebar_aside}>
          <nav className={styles.sidebar_nav} aria-label="Sidebar">
            <ul className={styles.sidebar_nav_list}>
              {items.map((item) => (
                <li key={item.id}>
                  {item.children?.length ? (
                    <>
                      <button
                        type="button"
                        className={cx(
                          styles.sidebar_nav_row,
                          item.children.some((child) => child.id === activeId) &&
                            styles.sidebar_nav_row_parent_active
                        )}
                        title={tooltip(item.label)}
                        aria-expanded={sidebarOpen && isDropdownOpen(item.id)}
                        aria-controls={`sidebar-panel-${item.id}`}
                        onClick={() => handleDropdownClick(item.id)}
                      >
                        {item.icon && <span className={styles.sidebar_nav_icon}>{item.icon}</span>}
                        <span className={styles.sidebar_nav_label}>{item.label}</span>
                        <span
                          className={cx(
                            styles.sidebar_nav_arrow,
                            isDropdownOpen(item.id) && styles.sidebar_nav_arrow_open
                          )}
                        >
                          {arrowIcon}
                        </span>
                      </button>

                      <div
                        id={`sidebar-panel-${item.id}`}
                        className={cx(
                          styles.sidebar_nav_panel,
                          isDropdownOpen(item.id) && styles.sidebar_nav_panel_open
                        )}
                      >
                        <ul className={styles.sidebar_nav_sublist}>
                          {item.children.map((child) => (
                            <li key={child.id}>
                              <a
                                href={child.href ?? "#"}
                                className={linkClass(child.id, true)}
                                aria-current={child.id === activeId ? "page" : undefined}
                                onClick={(event) => handleLinkClick(event, child)}
                              >
                                <span className={styles.sidebar_nav_label}>{child.label}</span>
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </>
                  ) : (
                    <a
                      href={item.href ?? "#"}
                      className={linkClass(item.id)}
                      title={tooltip(item.label)}
                      aria-current={item.id === activeId ? "page" : undefined}
                      onClick={(event) => handleLinkClick(event, item)}
                    >
                      {item.icon && <span className={styles.sidebar_nav_icon}>{item.icon}</span>}
                      <span className={styles.sidebar_nav_label}>{item.label}</span>
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* ---------- page content ---------- */}
        <main className={styles.sidebar_content}>{children}</main>
      </div>
    </div>
  );
};

export default SideBar;