'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// ── Types ───────────────────────────────────────────────────────────

interface GradeBadgeProps {
  grade: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// ── Grade → Style Mapping ──────────────────────────────────────────

const GRADE_STYLES: Record<string, string> = {
  'A+': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
  'A':  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
  'B+': 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300 border-teal-200 dark:border-teal-800/60',
  'B':  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
  'C+': 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200 dark:border-orange-800/60',
  'C':  'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800/60',
  'D':  'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800/60',
};

const SIZE_STYLES: Record<string, string> = {
  sm: 'text-[10px] px-1.5 py-0',
  md: 'text-xs px-2 py-0.5',
  lg: 'text-sm px-2.5 py-0.5',
};

// ── Component ───────────────────────────────────────────────────────

export function GradeBadge({ grade, size = 'md', className }: GradeBadgeProps) {
  const style = GRADE_STYLES[grade] ?? GRADE_STYLES['B'];
  const sizeStyle = SIZE_STYLES[size] ?? SIZE_STYLES.md;

  return (
    <Badge
      variant="outline"
      className={cn(
        'font-mono font-bold tracking-wide',
        style,
        sizeStyle,
        className
      )}
    >
      {grade}
    </Badge>
  );
}
