'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

// ── Types ───────────────────────────────────────────────────────────

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

// ── Component ───────────────────────────────────────────────────────

export function PageHeader({
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between',
        className
      )}
    >
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl truncate">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2 shrink-0 mt-3 sm:mt-0">
          {actions}
        </div>
      )}
    </div>
  );
}
