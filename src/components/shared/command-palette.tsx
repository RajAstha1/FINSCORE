'use client';

import { useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  FileText,
  FilePlus,
  Users,
  Brain,
  Scale,
  ScrollText,
  BarChart3,
  Settings,
  Flag,
  HelpCircle,
  Keyboard,
  FileQuestion,
  BookOpen,
} from 'lucide-react';

import { useAppStore, type AppPage } from '@/store/use-app-store';
import { useAuthStore } from '@/store/use-auth-store';
import type { UserRole } from '@/lib/auth';

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';

// ── Navigation Items (mirrors sidebar config) ───────────────────────

interface CommandNavEntry {
  page: AppPage;
  label: string;
  icon: React.ElementType;
  roles: UserRole[];
}

const NAV_ENTRIES: CommandNavEntry[] = [
  { page: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['super_admin', 'analyst', 'partner', 'beneficiary', 'auditor'] },
  { page: 'applications', label: 'Applications', icon: FileText, roles: ['super_admin', 'analyst', 'partner'] },
  { page: 'application-new', label: 'New Application', icon: FilePlus, roles: ['analyst', 'partner'] },
  { page: 'beneficiaries', label: 'Beneficiaries', icon: Users, roles: ['super_admin', 'analyst'] },
  { page: 'model-monitoring', label: 'Model Monitoring', icon: Brain, roles: ['super_admin', 'analyst', 'auditor'] },
  { page: 'fairness', label: 'Fairness Dashboard', icon: Scale, roles: ['super_admin', 'auditor'] },
  { page: 'audit-logs', label: 'Audit Logs', icon: ScrollText, roles: ['super_admin', 'auditor'] },
  { page: 'reports', label: 'Reports', icon: BarChart3, roles: ['super_admin', 'analyst'] },
  { page: 'admin-users', label: 'Admin Users', icon: Users, roles: ['super_admin'] },
  { page: 'admin-settings', label: 'Admin Settings', icon: Settings, roles: ['super_admin'] },
  { page: 'partner-portal', label: 'Partner Portal', icon: Flag, roles: ['super_admin'] },
];

// ── Action Items ────────────────────────────────────────────────────

interface ActionEntry {
  id: string;
  label: string;
  icon: React.ElementType;
  roles: UserRole[];
  onSelect: () => void;
}

function useActionEntries(): ActionEntry[] {
  const { navigate } = useAppStore();

  return [
    {
      id: 'new-application',
      label: 'Create New Application',
      icon: FilePlus,
      roles: ['analyst', 'partner'],
      onSelect: () => navigate('application-new'),
    },
    {
      id: 'view-dashboard',
      label: 'Go to Dashboard',
      icon: LayoutDashboard,
      roles: ['super_admin', 'analyst', 'partner', 'beneficiary', 'auditor'],
      onSelect: () => navigate('dashboard'),
    },
  ];
}

// ── Help Items ──────────────────────────────────────────────────────

const HELP_ITEMS = [
  { id: 'shortcuts', label: 'Keyboard Shortcuts', icon: Keyboard },
  { id: 'faq', label: 'FAQ & Help', icon: FileQuestion },
  { id: 'docs', label: 'Documentation', icon: BookOpen },
  { id: 'support', label: 'Contact Support', icon: HelpCircle },
];

// ── Component ───────────────────────────────────────────────────────

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useAppStore((s) => s.navigate);
  const hasRole = useAuthStore((s) => s.hasRole);
  const actionEntries = useActionEntries();
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Filter navigation items by role
  const visibleNav = NAV_ENTRIES.filter((entry) => hasRole(...entry.roles));
  const visibleActions = actionEntries.filter((entry) => hasRole(...entry.roles));

  return (
    <AnimatePresence>
      {open && (
        <CommandDialog
          open={open}
          onOpenChange={onOpenChange}
        >
          <CommandInput
            ref={inputRef}
            placeholder="Search pages, actions, and help..."
          />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>

            {/* Navigation Group */}
            {visibleNav.length > 0 && (
              <CommandGroup heading="Navigation">
                {visibleNav.map((entry) => {
                  const Icon = entry.icon;
                  return (
                    <CommandItem
                      key={entry.page}
                      onSelect={() => {
                        navigate(entry.page);
                        onOpenChange(false);
                      }}
                    >
                      <Icon className="size-4" />
                      <span>{entry.label}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}

            {/* Actions Group */}
            {visibleActions.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Actions">
                  {visibleActions.map((entry) => {
                    const Icon = entry.icon;
                    return (
                      <CommandItem
                        key={entry.id}
                        onSelect={() => {
                          entry.onSelect();
                          onOpenChange(false);
                        }}
                      >
                        <Icon className="size-4" />
                        <span>{entry.label}</span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </>
            )}

            {/* Help Group */}
            <CommandSeparator />
            <CommandGroup heading="Help">
              {HELP_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <CommandItem
                    key={item.id}
                    onSelect={() => {
                      onOpenChange(false);
                    }}
                  >
                    <Icon className="size-4" />
                    <span>{item.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </CommandDialog>
      )}
    </AnimatePresence>
  );
}
