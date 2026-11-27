'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopNav } from '@/components/layout/TopNav';
import { AccessDenied } from '@/components/layout/AccessDenied';
import { Footer } from '@/components/layout/Footer';
import { SubscriptionBanner } from '@/components/layout/SubscriptionBanner';
import { canView, matchScreen } from '@/lib/access';
import { useAuth } from '@/lib/auth';
import LoadSpinner from '@/components/components/loadspinner/LoadSpinner';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Starts closed on every screen size (after login too); the menu button in the header opens it.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const { isAuthenticated, isLoading, accessLoading, screens, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Close the navigation when the window shrinks to phone/tablet size (never opens it by itself).
  useEffect(() => {
    const mobileViewport = window.matchMedia('(max-width: 900px)');
    const updateSidebarForViewport = () => {
      if (mobileViewport.matches) setSidebarCollapsed(true);
    };
    mobileViewport.addEventListener('change', updateSidebarForViewport);
    return () => mobileViewport.removeEventListener('change', updateSidebarForViewport);
  }, []);

  // On phones and tablets the sidebar is a slide-over: close it after choosing a page.
  useEffect(() => {
    if (window.matchMedia('(max-width: 900px)').matches) queueMicrotask(() => setSidebarCollapsed(true));
  }, [pathname]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    } else if (user?.mustChangePassword) {
      router.replace('/change-password');
    }
  }, [isAuthenticated, isLoading, router, user?.mustChangePassword]);

  if (isLoading || (isAuthenticated && accessLoading)) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <LoadSpinner size="lg" />
          <p style={{ color: '#55655d', fontSize: 13 }}>Loading ProofChain...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.mustChangePassword) return null;

  // Route guard: a page is only shown when the user's role may open its screen (role_permissions in MySQL).
  const screen = screens ? matchScreen(screens, pathname) : undefined;
  const blocked = !!screen && !canView(screen.level);

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'transparent' }}>
      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        // Choosing a page closes the sidebar on every screen size (desktop: back to icons;
        // mobile: the drawer hides). A click can target the page that is already open,
        // so pathname alone is not enough.
        onNavigate={() => setSidebarCollapsed(true)}
      />

      <div className="sidebar-backdrop" data-open={!sidebarCollapsed} onClick={() => setSidebarCollapsed(true)} aria-hidden="true" />

      {/* Main area */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, overflow: 'hidden' }}>
        <TopNav menuCollapsed={sidebarCollapsed} onMenuToggle={() => setSidebarCollapsed(collapsed => !collapsed)} />

        {/* Page content */}
        <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}
          >
            <SubscriptionBanner role={user?.role} />
            <div style={{ flex: 1 }}>{blocked ? <AccessDenied screen={screen?.label} /> : children}</div>
            <Footer />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
