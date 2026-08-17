'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  ChevronRight,
  LogOut,
  Menu,
  Handshake,
} from 'lucide-react';

import { useAppStore, type AppPage } from '@/store/use-app-store';
import { useAuthStore } from '@/store/use-auth-store';
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import type { UserRole } from '@/lib/auth';

// ── Navigation Config ───────────────────────────────────────────────

interface NavItem {
  page: AppPage;
  label: string;
  icon: React.ElementType;
  roles: UserRole[];
  badge?: (roles: UserRole[]) => boolean;
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
    page: 'application-new',
    label: 'New Application',
    icon: FilePlus,
    roles: ['beneficiary', 'analyst', 'partner'],
  },
  {
    page: 'applications',
    label: 'Applications',
    icon: FileText,
    roles: ['super_admin', 'analyst', 'partner', 'beneficiary'],
  },
  {
    page: 'beneficiaries',
    label: 'Beneficiaries',
    icon: Users,
    roles: ['super_admin', 'analyst'],
  },
  {
    page: 'partner-portal',
    label: 'Partner Portal',
    icon: Handshake,
    roles: ['partner', 'super_admin'],
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
];

// ── Section labels for different portals ───────────────────────────

const SECTION_LABELS: Record<UserRole, { main: string; admin?: string }> = {
  beneficiary: { main: 'My Portal' },
  analyst: { main: 'Operations' },
  partner: { main: 'Channel Partner' },
  super_admin: { main: 'Navigation', admin: 'Administration' },
  auditor: { main: 'Audit & Compliance' },
};

// ── Helper ──────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ── Nav Item Button with optional Tooltip ──────────────────────────

function NavItemButton({
  item,
  isActive,
  onClick,
  showTooltip,
  badge,
}: {
  item: { page: string; label: string; icon: React.ElementType };
  isActive: boolean;
  onClick: () => void;
  showTooltip?: boolean;
  badge?: number;
}) {
  const Icon = item.icon;
  const button = (
    <button
      onClick={onClick}
      className={`sidebar-nav-item group relative flex items-center gap-3 rounded-r-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ease-out w-full text-left cursor-pointer ${
        isActive
          ? 'sidebar-active-indicator bg-primary/10 text-primary font-semibold'
          : 'text-muted-foreground hover:bg-accent/80 hover:text-accent-foreground'
      }`}
    >
      <Icon className={`size-4 shrink-0 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-primary' : ''}`} />
      <span className="truncate">{item.label}</span>
      {badge != null && badge > 0 && (
        <span className="ml-auto flex size-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white shrink-0">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );

  if (showTooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return button;
}

// ── Section Label ───────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="px-3 pt-4 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 select-none">
      {children}
    </span>
  );
}

// ── Sidebar Content (shared between desktop & mobile) ──────────────

export function AppSidebarContent({ isDesktop = false }: { isDesktop?: boolean }) {
  const { currentPage, navigate } = useAppStore();
  const { user, logout, hasRole, token } = useAuthStore();
  // Admin collapsible: open when a sub-item is active or manually toggled
  const [adminManualOpen, setAdminManualOpen] = useState(false);
  const isAdminSubActive = ADMIN_SUB_ITEMS.some(
    (item) => item.page === currentPage
  );
  const adminOpen = isAdminSubActive || adminManualOpen;
  const handleAdminToggle = () => setAdminManualOpen((prev) => !prev);

  // Fetch pending applications count for sidebar badge
  const { data: pendingData } = useQuery({
    queryKey: ['pending-applications-count'],
    queryFn: async () => {
      const res = await fetch('/api/applications?status=submitted&limit=1', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return { pagination: { total: 0 } };
      return res.json();
    },
    enabled: !!token && hasRole('super_admin', 'analyst'),
    refetchInterval: 30000,
  });
  const pendingCount = pendingData?.pagination?.total ?? 0;

  const visibleNavItems = NAV_ITEMS.filter((item) => hasRole(...item.roles));
  const showAdminSection = hasRole('super_admin');
  const roleSectionLabels = user ? SECTION_LABELS[user.role] : { main: 'Navigation' };

  return (
    <div className="flex h-full flex-col">
      {/* Logo / Brand */}
      <div className="flex h-16 items-center gap-3 px-5">
        <div className="flex size-9 items-center justify-center rounded-lg bg-teal-600 text-white shadow-sm shadow-teal-600/20">
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
      <ScrollArea className="flex-1 px-3 py-2">
        <nav className="flex flex-col gap-0.5" aria-label="Main navigation">
          <SectionLabel>{roleSectionLabels.main}</SectionLabel>

          {visibleNavItems.map((item) => (
            <NavItemButton
              key={item.page}
              item={item}
              isActive={currentPage === item.page}
              onClick={() => navigate(item.page)}
              showTooltip={isDesktop}
              badge={item.page === 'applications' ? pendingCount : undefined}
            />
          ))}

          {/* Admin Collapsible Section */}
          {showAdminSection && roleSectionLabels.admin && (
            <>
              <SectionLabel>{roleSectionLabels.admin}</SectionLabel>
              <Collapsible
                open={adminOpen}
                onOpenChange={handleAdminToggle}
                className="group"
              >
                <CollapsibleTrigger asChild>
                  <button className="sidebar-nav-item flex w-full items-center justify-between rounded-r-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all duration-200 ease-out hover:bg-accent/80 hover:text-accent-foreground cursor-pointer">
                    <span className="flex items-center gap-3">
                      <Settings className="size-4 shrink-0 transition-transform duration-200 group-hover:scale-110" />
                      <span>Admin</span>
                    </span>
                    <ChevronRight
                      className={`size-4 transition-transform duration-300 ${
                        adminOpen ? 'rotate-90' : ''
                      }`}
                    />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent
                  className="overflow-hidden transition-[height,opacity] duration-300 ease-out data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
                >
                  <div className="mt-0.5 ml-4 flex flex-col gap-0.5 border-l-2 border-border/50 pl-3">
                    {ADMIN_SUB_ITEMS.map((item) => (
                      <NavItemButton
                        key={item.page}
                        item={item}
                        isActive={currentPage === item.page}
                        onClick={() => navigate(item.page)}
                        showTooltip={isDesktop}
                      />
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </>
          )}
        </nav>
      </ScrollArea>

      <Separator />

      {/* User Section */}
      {user && (
        <div className="p-3">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors duration-200 hover:bg-accent/50">
            <Avatar className="size-9 shrink-0 ring-2 ring-primary/10">
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
              className="size-8 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors duration-200"
              onClick={logout}
              aria-label="Sign out"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Desktop Sidebar (always visible) ────────────────────────────────

export function AppSidebarDesktop() {
  return (
    <aside className="hidden md:flex w-64 flex-col border-r bg-gradient-to-b from-card to-muted/30 fixed inset-y-0 left-0 z-30">
      <AppSidebarContent isDesktop />
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
      <SheetContent side="left" className="w-64 p-0 bg-gradient-to-b from-card to-muted/30">
        <SheetHeader className="sr-only">
          <SheetTitle>Navigation</SheetTitle>
        </SheetHeader>
        <AppSidebarContent />
      </SheetContent>
    </Sheet>
  );
}
