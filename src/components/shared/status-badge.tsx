'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// ── Types ───────────────────────────────────────────────────────────

interface StatusBadgeProps {
  status: string;
  className?: string;
}

// ── Status → Style Mapping ──────────────────────────────────────────
// Dark mode uses slightly higher opacity backgrounds and lighter text
// for better contrast on dark surfaces.

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-secondary text-secondary-foreground border-secondary dark:bg-slate-700/50 dark:text-slate-300 dark:border-slate-600/60',
  submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 border-blue-200 dark:border-blue-700/60',
  scoring: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 border-amber-200 dark:border-amber-700/60',
  under_review: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 border-amber-200 dark:border-amber-700/60',
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700/60',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 border-red-200 dark:border-red-700/60',
  sanctioned: 'bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300 border-teal-200 dark:border-teal-700/60',
  disbursed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700/60',
  closed: 'bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300 border-slate-200 dark:border-slate-600/60',
  defaulted: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 border-red-200 dark:border-red-700/60',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 border-amber-200 dark:border-amber-700/60',
  paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700/60',
  overdue: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300 border-orange-200 dark:border-orange-700/60',
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700/60',
  inactive: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 border-red-200 dark:border-red-700/60',
};

// ── Helpers ─────────────────────────────────────────────────────────

function formatStatus(status: string): string {
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

// ── Component ───────────────────────────────────────────────────────

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalized = status.toLowerCase().replace(/-/g, '_');
  const style = STATUS_STYLES[normalized] ?? STATUS_STYLES.draft;

  return (
    <Badge
      variant="outline"
      className={cn('font-medium capitalize', style, className)}
    >
      {formatStatus(status)}
    </Badge>
  );
}
