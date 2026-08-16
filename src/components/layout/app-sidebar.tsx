'use client';

import { useState } from 'react';
import {
  Shield,
  LayoutDashboard,
  FileText,
  FilePlus,
  Users,
  Brain,
  Scale,
  ScrollText,
  Settings,
  BarChart3,
  ChevronDown,
  ChevronRight,
  LogOut,
  Menu,
  Flag,
} from 'lucide-react';

import { useAppStore, type AppPage } from '@/store/use-app-store';
import { useAuthStore } from '@/store/use-auth-store';
import { useIsMobile } from '@/hooks/use-mobile';
import { ROLE_LABELS } from '@/lib/auth';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

import type { UserRole } from '@/lib/auth';

// ── Navigation Config ───────────────────────────────────────────────

interface NavItem {
  page: AppPage;
  label: string;
  icon: React.ElementType;
  roles: UserRole[];
}

interface AdminSubItem {
  page: AppPage;
  label: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  {
    page: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    roles: ['super_admin', 'analyst', 'partner', 'beneficiary', 'auditor'],
  },
  {
    page: 'applications',
    label: 'Applications',
    icon: FileText,
    roles: ['super_admin', 'analyst', 'partner'],
  },
  {
    page: 'application-new',
    label: 'New Application',
    icon: FilePlus,
    roles: ['analyst', 'partner'],
  },
  {
    page: 'beneficiaries',
    label: 'Beneficiaries',
    icon: Users,
    roles: ['super_admin', 'analyst'],
  },
  {
    page: 'model-monitoring',
    label: 'Model Monitoring',
    icon: Brain,
    roles: ['super_admin', 'analyst', 'auditor'],
  },
  {
    page: 'fairness',
    label: 'Fairness Dashboard',
    icon: Scale,
    roles: ['super_admin', 'auditor'],
  },
  {
    page: 'audit-logs',
    label: 'Audit Logs',
    icon: ScrollText,
    roles: ['super_admin', 'auditor'],
  },
  {
    page: 'reports',
    label: 'Reports',
    icon: BarChart3,
    roles: ['super_admin', 'analyst'],
  },
];

const ADMIN_SUB_ITEMS: AdminSubItem[] = [
  { page: 'admin-users', label: 'Users', icon: Users },
  { page: 'admin-settings', label: 'Settings', icon: Settings },
  { page: 'partner-portal', label: 'Feature Flags', icon: Flag },
];

// ── Helper ──────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ── Sidebar Content (shared between desktop & mobile) ──────────────

export function AppSidebarContent() {
  const { currentPage, navigate } = useAppStore();
  const { user, logout, hasRole } = useAuthStore();
  const [adminOpen, setAdminOpen] = useState(false);

  // Check if any admin sub-item is active
  const isAdminSubActive = ADMIN_SUB_ITEMS.some(
    (item) => item.page === currentPage
  );

  // Auto-open admin collapsible if a sub-item is active
  const handleAdminToggle = () => setAdminOpen((prev) => !prev);

  // Check if current page is in admin sub-items to auto-expand
  useState(() => {
    if (isAdminSubActive) setAdminOpen(true);
  });

  const visibleNavItems = NAV_ITEMS.filter((item) => hasRole(...item.roles));
  const showAdminSection = hasRole('super_admin');

  return (
    <div className="flex h-full flex-col">
      {/* Logo / Brand */}
      <div className="flex h-16 items-center gap-3 px-4">
        <div className="flex size-9 items-center justify-center rounded-lg bg-teal-600 text-white">
          <Shield className="size-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold leading-tight tracking-tight">
            Arogya
          </span>
          <span className="text-xs font-medium text-muted-foreground leading-tight">
            FinScore
          </span>
        </div>
      </div>

      <Separator />

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="flex flex-col gap-1" aria-label="Main navigation">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.page;

            return (
              <button
                key={item.page}
                onClick={() => navigate(item.page)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground w-full text-left cursor-pointer ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground'
                }`}
              >
                <Icon className="size-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}

          {/* Admin Collapsible Section */}
          {showAdminSection && (
            <Collapsible
              open={adminOpen || isAdminSubActive}
              onOpenChange={setAdminOpen}
              className="mt-1"
            >
              <CollapsibleTrigger asChild>
                <button className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer">
                  <span className="flex items-center gap-3">
                    <Settings className="size-4 shrink-0" />
                    Admin
                  </span>
                  {adminOpen || isAdminSubActive ? (
                    <ChevronDown className="size-4" />
                  ) : (
                    <ChevronRight className="size-4" />
                  )}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-1 ml-4 flex flex-col gap-1 border-l pl-3">
                {ADMIN_SUB_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPage === item.page;

                  return (
                    <button
                      key={item.page}
                      onClick={() => navigate(item.page)}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground w-full text-left cursor-pointer ${
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground'
                      }`}
                    >
                      <Icon className="size-4 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </CollapsibleContent>
            </Collapsible>
          )}
        </nav>
      </ScrollArea>

      <Separator />

      {/* User Section */}
      {user && (
        <div className="flex items-center gap-3 px-4 py-3">
          <Avatar className="size-9 shrink-0">
            <AvatarFallback className="bg-teal-100 text-teal-700 text-xs font-semibold dark:bg-teal-900 dark:text-teal-300">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-col min-w-0">
            <span className="text-sm font-medium truncate">{user.name}</span>
            <Badge
              variant="secondary"
              className="mt-0.5 w-fit text-[10px] px-1.5 py-0"
            >
              {ROLE_LABELS[user.role]}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={logout}
            aria-label="Sign out"
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Desktop Sidebar (always visible) ────────────────────────────────

export function AppSidebarDesktop() {
  return (
    <aside className="hidden md:flex w-64 flex-col border-r bg-card fixed inset-y-0 left-0 z-30">
      <AppSidebarContent />
    </aside>
  );
}

// ── Mobile Sidebar Trigger Button ───────────────────────────────────

export function MobileMenuTrigger({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="md:hidden size-9"
      onClick={onClick}
      aria-label="Open navigation menu"
    >
      <Menu className="size-5" />
    </Button>
  );
}

// ── Mobile Sidebar (Sheet) ──────────────────────────────────────────

export function AppSidebarMobile({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-64 p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>Navigation</SheetTitle>
        </SheetHeader>
        <AppSidebarContent />
      </SheetContent>
    </Sheet>
  );
}
