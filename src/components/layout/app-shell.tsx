'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { useAuthStore } from '@/store/use-auth-store';
import { useAppStore, type AppPage } from '@/store/use-app-store';
import { AppHeader } from './app-header';
import { AppSidebarDesktop, AppSidebarMobile } from './app-sidebar';
import { CommandPalette } from '@/components/shared/command-palette';

// ── Lazy Page Imports ─────────────────────────────────────────────
import { ExecutiveDashboard } from '@/components/dashboard/executive-dashboard';
import ApplicationWizard from '@/components/applications/application-wizard';
import ApplicationsList from '@/components/pages/applications-list';
import ApplicationDetail from '@/components/pages/application-detail';
import BeneficiariesList from '@/components/pages/beneficiaries-list';
import BeneficiaryDetail from '@/components/pages/beneficiary-detail';
import ModelMonitoring from '@/components/pages/model-monitoring';
import FairnessDashboard from '@/components/pages/fairness-dashboard';
import AuditLogs from '@/components/pages/audit-logs';
import AdminUsers from '@/components/pages/admin-users';
import AdminSettings from '@/components/pages/admin-settings';
import Reports from '@/components/pages/reports';
import PartnerPortal from '@/components/pages/partner-portal';

// ── Page Registry ─────────────────────────────────────────────────

const PAGE_COMPONENTS: Record<AppPage, React.ComponentType> = {
  login: () => null, // Handled at the root level
  dashboard: ExecutiveDashboard,
  applications: ApplicationsList,
  'application-new': ApplicationWizard,
  'application-detail': ApplicationDetail,
  beneficiaries: BeneficiariesList,
  'beneficiary-detail': BeneficiaryDetail,
  'model-monitoring': ModelMonitoring,
  fairness: FairnessDashboard,
  'audit-logs': AuditLogs,
  'admin-users': AdminUsers,
  'admin-settings': AdminSettings,
  reports: Reports,
  'partner-portal': PartnerPortal,
};

// ── Page Transition Variants ──────────────────────────────────────

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

// ── App Shell Component ───────────────────────────────────────────

export default function AppShell() {
  const { currentPage, sidebarOpen, setSidebarOpen, commandOpen, setCommandOpen } = useAppStore();
  const { token } = useAuthStore();

  // Close sidebar on navigation (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [currentPage, setSidebarOpen]);

  // If no token, don't render app shell
  useEffect(() => {
    if (!token) {
      useAppStore.getState().navigate('login');
    }
  }, [token]);

  const PageComponent = PAGE_COMPONENTS[currentPage];

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop Sidebar */}
      <AppSidebarDesktop />

      {/* Mobile Sidebar */}
      <AppSidebarMobile open={sidebarOpen} onOpenChange={setSidebarOpen} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen md:ml-64">
        <AppHeader />

        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="mx-auto max-w-[1600px] w-full"
            >
              <PageComponent />
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Sticky Footer */}
        <footer className="mt-auto border-t bg-card/50 backdrop-blur-sm px-4 md:px-6 py-3">
          <div className="mx-auto max-w-[1600px] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>© {new Date().getFullYear()} Arogya FinScore. All rights reserved.</span>
            <div className="flex items-center gap-4">
              <span className="hidden sm:inline">v2.4.1-ensemble</span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                All systems operational
              </span>
            </div>
          </div>
        </footer>
      </div>

      {/* Command Palette */}
      <Command />
    </div>
  );
}

// ── Command Palette Wrapper ───────────────────────────────────────

function Command() {
  const { commandOpen, setCommandOpen } = useAppStore();
  return (
    <CommandPalette
      open={commandOpen}
      onOpenChange={setCommandOpen}
    />
  );
}
