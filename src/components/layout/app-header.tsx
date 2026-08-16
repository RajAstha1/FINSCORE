'use client';

import { useEffect, useCallback, useSyncExternalStore } from 'react';
import {
  Sun,
  Moon,
  Bell,
  Command,
  LogOut,
  User,
  Settings,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';

import { useAppStore, type AppPage } from '@/store/use-app-store';
import { useAuthStore } from '@/store/use-auth-store';
import { ROLE_LABELS } from '@/lib/auth';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { ScrollArea } from '@/components/ui/scroll-area';

import { MobileMenuTrigger } from './app-sidebar';

// ── Page label map ──────────────────────────────────────────────────

const PAGE_LABELS: Record<AppPage, string> = {
  login: 'Sign In',
  dashboard: 'Dashboard',
  applications: 'Applications',
  'application-new': 'New Application',
  'application-detail': 'Application Detail',
  beneficiaries: 'Beneficiaries',
  'beneficiary-detail': 'Beneficiary Detail',
  'model-monitoring': 'Model Monitoring',
  fairness: 'Fairness Dashboard',
  'audit-logs': 'Audit Logs',
  'admin-users': 'Admin / Users',
  'admin-settings': 'Admin / Settings',
  reports: 'Reports',
  'partner-portal': 'Partner Portal',
};

// ── Sample Notifications ────────────────────────────────────────────

interface Notification {
  id: string;
  title: string;
  description: string;
  time: string;
  icon: React.ElementType;
  iconColor: string;
  read: boolean;
}

const SAMPLE_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    title: 'Application Approved',
    description: 'Loan application AFS-100847 has been auto-approved with grade B+.',
    time: '2 min ago',
    icon: CheckCircle2,
    iconColor: 'text-emerald-500',
    read: false,
  },
  {
    id: '2',
    title: 'Portfolio Risk Alert',
    description: 'Portfolio-at-risk ratio has increased to 14.5%, exceeding the 12% threshold.',
    time: '18 min ago',
    icon: AlertTriangle,
    iconColor: 'text-amber-500',
    read: false,
  },
  {
    id: '3',
    title: 'Model Drift Detected',
    description: 'XGBoost model AUC-ROC dropped 2.3% in the last 24 hours. Review recommended.',
    time: '1 hr ago',
    icon: Info,
    iconColor: 'text-blue-500',
    read: false,
  },
  {
    id: '4',
    title: 'Bulk Referral Processed',
    description: '24 new beneficiary referrals from Partner NBCFDC-MH have been imported.',
    time: '3 hrs ago',
    icon: CreditCard,
    iconColor: 'text-teal-500',
    read: true,
  },
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

// ── Component ───────────────────────────────────────────────────────

export function AppHeader() {
  const { currentPage, setCommandOpen, setSidebarOpen } = useAppStore();
  const { user, logout } = useAuthStore();
  const { setTheme, resolvedTheme } = useTheme();

  // Track client-side mount status without setState-in-effect
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  // Cmd+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setCommandOpen]);

  const isDark = mounted && resolvedTheme === 'dark';
  const unreadCount = SAMPLE_NOTIFICATIONS.filter((n) => !n.read).length;

  const handleMobileMenuOpen = useCallback(() => {
    setSidebarOpen(true);
  }, [setSidebarOpen]);

  const handleSignOut = () => {
    logout();
  };

  const currentPageLabel = PAGE_LABELS[currentPage] || 'Dashboard';

  return (
    <header className="sticky top-0 z-40 h-16 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-full items-center gap-4 px-4 md:px-6">
        {/* Left: Mobile menu + Breadcrumb */}
        <div className="flex items-center gap-3">
          <MobileMenuTrigger onClick={handleMobileMenuOpen} />

          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    useAppStore.getState().navigate('dashboard');
                  }}
                >
                  Arogya FinScore
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{currentPageLabel}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Right: Actions */}
        <div className="ml-auto flex items-center gap-2">
          {/* Command Palette Button */}
          <Button
            variant="outline"
            size="sm"
            className="hidden sm:flex h-9 gap-2 text-muted-foreground font-normal border-border/80 hover:border-primary/30 hover:bg-accent/50 transition-colors duration-200"
            onClick={() => setCommandOpen(true)}
          >
            <Command className="size-4" />
            <span className="text-xs">Search</span>
            <kbd className="pointer-events-none hidden select-none items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground lg:inline-flex">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>

          {/* Mobile command button */}
          <Button
            variant="ghost"
            size="icon"
            className="sm:hidden size-9"
            onClick={() => setCommandOpen(true)}
            aria-label="Search"
          >
            <Command className="size-4" />
          </Button>

          {/* Theme Toggle */}
          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              className="size-9"
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
            >
              <AnimatePresence mode="wait" initial={false}>
                {isDark ? (
                  <motion.span
                    key="moon"
                    initial={{ rotate: -90, opacity: 0, scale: 0 }}
                    animate={{ rotate: 0, opacity: 1, scale: 1 }}
                    exit={{ rotate: 90, opacity: 0, scale: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Moon className="size-4" />
                  </motion.span>
                ) : (
                  <motion.span
                    key="sun"
                    initial={{ rotate: 90, opacity: 0, scale: 0 }}
                    animate={{ rotate: 0, opacity: 1, scale: 1 }}
                    exit={{ rotate: -90, opacity: 0, scale: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Sun className="size-4" />
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>
          )}

          <Separator orientation="vertical" className="h-6 mx-1" />

          {/* Notification Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-9 relative"
                aria-label="Notifications"
              >
                <Bell className="size-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex size-4.5 items-center justify-center">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex size-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                      {unreadCount}
                    </span>
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-0">
              <div className="flex items-center justify-between px-4 py-3">
                <DropdownMenuLabel className="p-0 text-sm font-semibold">
                  Notifications
                </DropdownMenuLabel>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {unreadCount} new
                </Badge>
              </div>
              <DropdownMenuSeparator />
              <ScrollArea className="max-h-72">
                <div className="flex flex-col">
                  {SAMPLE_NOTIFICATIONS.map((notification) => {
                    const NIcon = notification.icon;
                    return (
                      <button
                        key={notification.id}
                        className={`flex items-start gap-3 px-4 py-3 text-left w-full transition-colors duration-150 hover:bg-accent/50 cursor-pointer ${
                          !notification.read ? 'bg-primary/5' : ''
                        }`}
                      >
                        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted/80">
                          <NIcon className={`size-4 ${notification.iconColor}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium leading-tight truncate">
                              {notification.title}
                            </p>
                            {!notification.read && (
                              <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed mt-0.5 line-clamp-2">
                            {notification.description}
                          </p>
                          <p className="text-[10px] text-muted-foreground/70 mt-1">
                            {notification.time}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
              <DropdownMenuSeparator />
              <div className="px-4 py-2.5">
                <button className="text-xs font-medium text-primary hover:underline cursor-pointer w-full text-center">
                  View all notifications
                </button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Dropdown */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 h-9 px-2 rounded-full hover:bg-accent/50 transition-colors duration-200"
                >
                  <Avatar className="size-7 ring-2 ring-primary/10">
                    <AvatarFallback className="bg-teal-100 text-teal-700 text-[10px] font-semibold dark:bg-teal-900 dark:text-teal-300">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden lg:inline-flex text-sm font-medium max-w-[120px] truncate">
                    {user.name}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2.5">
                      <Avatar className="size-9 ring-2 ring-primary/10">
                        <AvatarFallback className="bg-teal-100 text-teal-700 text-xs font-semibold dark:bg-teal-900 dark:text-teal-300">
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col min-w-0">
                        <p className="text-sm font-medium leading-none truncate">
                          {user.name}
                        </p>
                        <p className="text-xs text-muted-foreground leading-none mt-0.5 truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className="w-fit text-[10px] px-1.5 py-0"
                    >
                      {ROLE_LABELS[user.role]}
                    </Badge>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer">
                  <User className="mr-2 size-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <Settings className="mr-2 size-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={handleSignOut}
                  className="cursor-pointer"
                >
                  <LogOut className="mr-2 size-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
