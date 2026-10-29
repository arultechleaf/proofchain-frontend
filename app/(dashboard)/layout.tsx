'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopNav } from '@/components/layout/TopNav';
import { AccessDenied } from '@/components/layout/AccessDenied';
import { canView, matchScreen } from '@/lib/access';
import { useAuth } from '@/lib/auth';
import { Loader2 } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { isAuthenticated, isLoading, accessLoading, screens, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // On phones the sidebar is a slide-over: start closed, and close it again after choosing a page.
  useEffect(() => {
    if (window.matchMedia('(max-width: 768px)').matches) queueMicrotask(() => setSidebarCollapsed(true));
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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050d1a' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <Loader2 style={{ width: 32, height: 32, color: '#60a5fa', animation: 'spin 1s linear infinite' }} />
          <p style={{ color: '#475569', fontSize: 13 }}>Loading ProofChain...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.mustChangePassword) return null;

  // Route guard: a page is only shown when the user's role may open its screen (role_permissions in MySQL).
  const screen = screens ? matchScreen(screens, pathname) : undefined;
  const blocked = !!screen && !canView(screen.level);

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#050d1a' }}>
      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div className="sidebar-backdrop" data-open={!sidebarCollapsed} onClick={() => setSidebarCollapsed(true)} aria-hidden="true" />

      {/* Main area */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, overflow: 'hidden' }}>
        <TopNav onMenuToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />

        {/* Page content */}
        <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            style={{ minHeight: '100%' }}
          >
            {blocked ? <AccessDenied screen={screen?.label} /> : children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
