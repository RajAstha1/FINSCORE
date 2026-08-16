'use client';

import { type ElementType } from 'react';
import { Inbox } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ── Types ───────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon?: ElementType;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

// ── Component ───────────────────────────────────────────────────────

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <motion.div
      className={cn(
        'flex flex-col items-center justify-center py-16 px-4 text-center',
        className
      )}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <div className="flex size-16 items-center justify-center rounded-2xl bg-muted/60 mb-4">
        <Icon className="size-7 text-muted-foreground/60" />
      </div>

      <h3 className="text-base font-semibold text-foreground">{title}</h3>

      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      )}

      {action && (
        <Button
          onClick={action.onClick}
          className="mt-5"
          size="sm"
        >
          {action.label}
        </Button>
      )}
    </motion.div>
  );
}
