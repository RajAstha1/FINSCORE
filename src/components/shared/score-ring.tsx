'use client';

import { useSyncExternalStore } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

// ── Types ───────────────────────────────────────────────────────────

interface ScoreRingProps {
  score: number;
  size?: number;
  showLabel?: boolean;
  riskGrade?: string;
  animated?: boolean;
  className?: string;
}

// ── Grade → Color Mapping ────────────────────────────────────────────
// Dark mode: brighter strokes, higher-opacity bg for contrast.

const GRADE_COLORS: Record<string, { stroke: string; strokeDark: string; bg: string; text: string }> = {
  'A+': { stroke: '#059669', strokeDark: '#34D399', bg: 'bg-emerald-500/10 dark:bg-emerald-400/15', text: 'text-emerald-600 dark:text-emerald-400' },
  'A':  { stroke: '#10B981', strokeDark: '#34D399', bg: 'bg-emerald-500/10 dark:bg-emerald-400/15', text: 'text-emerald-600 dark:text-emerald-400' },
  'B+': { stroke: '#0D9488', strokeDark: '#2DD4BF', bg: 'bg-teal-500/10 dark:bg-teal-400/15', text: 'text-teal-600 dark:text-teal-400' },
  'B':  { stroke: '#0F766E', strokeDark: '#2DD4BF', bg: 'bg-teal-500/10 dark:bg-teal-400/15', text: 'text-teal-600 dark:text-teal-400' },
  'C+': { stroke: '#F59E0B', strokeDark: '#FBBF24', bg: 'bg-amber-500/10 dark:bg-amber-400/15', text: 'text-amber-600 dark:text-amber-400' },
  'C':  { stroke: '#F97316', strokeDark: '#FB923C', bg: 'bg-amber-500/10 dark:bg-amber-400/15', text: 'text-amber-600 dark:text-amber-400' },
  'D':  { stroke: '#EF4444', strokeDark: '#F87171', bg: 'bg-red-500/10 dark:bg-red-400/15', text: 'text-red-600 dark:text-red-400' },
};

function getGradeColor(grade?: string) {
  if (!grade) return { stroke: '#0F766E', strokeDark: '#2DD4BF', bg: 'bg-teal-500/10 dark:bg-teal-400/15', text: 'text-teal-600 dark:text-teal-400' };
  return GRADE_COLORS[grade] ?? GRADE_COLORS['B'];
}

// ── Component ───────────────────────────────────────────────────────

export function ScoreRing({
  score,
  size = 140,
  showLabel = true,
  riskGrade,
  animated = true,
  className,
}: ScoreRingProps) {
  const clampedScore = Math.max(0, Math.min(100, score));
  const colors = getGradeColor(riskGrade);

  // SVG geometry
  const strokeWidth = size * 0.08;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = clampedScore / 100;
  const offset = circumference * (1 - progress);

  const center = size / 2;
  const scoreFontSize = size * 0.22;
  const gradeFontSize = size * 0.11;

  // Unique gradient id to avoid SVG id collisions
  const gradientId = `score-grad-${size}-${riskGrade ?? 'default'}`;

  // Hydration-safe mount detection
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const currentOffset = mounted ? offset : circumference;

  return (
    <div className={cn('inline-flex flex-col items-center gap-2', className)}>
      <div className="relative w-36 h-36 lg:w-40 lg:h-40" style={{ width: undefined, height: undefined }}>
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
          aria-label={`Credit score: ${clampedScore} out of 100`}
          role="img"
        >
          {/* Background track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            className="stroke-muted/50 dark:stroke-muted/30"
          />

          {/* Gradient definition — light and dark stops */}
          <defs>
            <linearGradient id={`${gradientId}-light`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={colors.stroke} stopOpacity={0.7} />
              <stop offset="100%" stopColor={colors.stroke} />
            </linearGradient>
            <linearGradient id={`${gradientId}-dark`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={colors.strokeDark} stopOpacity={0.7} />
              <stop offset="100%" stopColor={colors.strokeDark} />
            </linearGradient>
          </defs>

          {/* Progress arc — light mode gradient */}
          <motion.circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={`url(#${gradientId}-light)`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: currentOffset }}
            transition={{
              duration: animated ? 1.4 : 0,
              ease: [0.25, 0.1, 0.25, 1],
            }}
            className="dark:hidden"
          />

          {/* Progress arc — dark mode gradient (brighter) */}
          <motion.circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={`url(#${gradientId}-dark)`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: currentOffset }}
            transition={{
              duration: animated ? 1.4 : 0,
              ease: [0.25, 0.1, 0.25, 1],
            }}
            className="hidden dark:block"
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className={cn('font-mono font-bold leading-none tabular-nums', colors.text)}
            style={{ fontSize: scoreFontSize }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {clampedScore}
          </motion.span>
          {showLabel && (
            <span
              className="text-muted-foreground dark:text-muted-foreground font-medium leading-none"
              style={{ fontSize: size * 0.09 }}
            >
              out of 100
            </span>
          )}
        </div>
      </div>

      {/* Risk grade badge */}
      {riskGrade && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.8 }}
        >
          <Badge
            variant="outline"
            className={cn('font-mono font-bold tracking-wide border-current/20', colors.bg, colors.text, 'px-2.5 py-0.5')}
            style={{ fontSize: gradeFontSize }}
          >
            Grade {riskGrade}
          </Badge>
        </motion.div>
      )}
    </div>
  );
}
