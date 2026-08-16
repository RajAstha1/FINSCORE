'use client';

import { type ElementType } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// ── Types ───────────────────────────────────────────────────────────

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon?: ElementType;
  iconColor?: string;
  className?: string;
}

// ── Component ───────────────────────────────────────────────────────

export function StatsCard({
  title,
  value,
  change,
  icon: Icon,
  iconColor,
  className,
}: StatsCardProps) {
  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;
  const isNeutral = change !== undefined && change === 0;

  const formattedValue = typeof value === 'number'
    ? value.toLocaleString('en-IN')
    : value;

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      <Card className={cn('glass-card gap-0 py-0 overflow-hidden', className)}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            {/* Left: title + value + change */}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-muted-foreground truncate">
                {title}
              </p>
              <p className={cn(
                'mt-1 text-2xl font-bold leading-tight tabular-nums',
                typeof value === 'number' ? 'font-mono' : ''
              )}>
                {formattedValue}
              </p>

              {/* Change indicator */}
              {change !== undefined && (
                <div className="mt-2 flex items-center gap-1">
                  {isPositive && (
                    <span className="inline-flex items-center gap-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      <ArrowUpRight className="size-3.5" />
                      {Math.abs(change).toFixed(1)}%
                    </span>
                  )}
                  {isNegative && (
                    <span className="inline-flex items-center gap-0.5 text-xs font-medium text-red-600 dark:text-red-400">
                      <ArrowDownRight className="size-3.5" />
                      {Math.abs(change).toFixed(1)}%
                    </span>
                  )}
                  {isNeutral && (
                    <span className="inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground">
                      <Minus className="size-3.5" />
                      0.0%
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Right: icon */}
            {Icon && (
              <div
                className={cn(
                  'flex size-10 shrink-0 items-center justify-center rounded-xl',
                  iconColor ?? 'bg-primary/10 text-primary'
                )}
              >
                <Icon className="size-5" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
