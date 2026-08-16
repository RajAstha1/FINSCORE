'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import { FEATURE_LABELS } from '@/lib/scoring-engine';
import { cn } from '@/lib/utils';

// ── Types ───────────────────────────────────────────────────────────

interface SHAPValueItem {
  feature: string;
  value: number;
  shapValue: number;
  direction: 'positive' | 'negative';
}

interface ShapWaterfallChartProps {
  shapValues: SHAPValueItem[];
  baseValue?: number;
  finalScore?: number;
  className?: string;
}

// ── Colors ──────────────────────────────────────────────────────────

const POSITIVE_COLOR = '#0D9488';   // teal
const NEGATIVE_COLOR = '#EF4444';   // red
const POSITIVE_DARK = '#14B8A6';
const NEGATIVE_DARK = '#F87171';

// ── Custom Tooltip ──────────────────────────────────────────────────

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ payload: SHAPValueItem & { displayFeature: string } }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  const item = payload[0].payload;
  const isPositive = item.shapValue >= 0;

  return (
    <div className="rounded-lg border bg-card px-3 py-2 shadow-xl text-sm">
      <p className="font-semibold text-foreground">{item.displayFeature}</p>
      <p className="text-muted-foreground mt-0.5">
        Feature value:{' '}
        <span className="font-mono text-foreground">
          {typeof item.value === 'number' ? item.value.toLocaleString('en-IN', { maximumFractionDigits: 1 }) : item.value}
        </span>
      </p>
      <p className="mt-1">
        SHAP contribution:{' '}
        <span className={cn('font-mono font-semibold', isPositive ? 'text-teal-600 dark:text-teal-400' : 'text-red-600 dark:text-red-400')}>
          {isPositive ? '+' : ''}{item.shapValue.toFixed(2)}
        </span>
      </p>
      <p className="text-muted-foreground text-xs mt-0.5">
        {isPositive ? '↑ Increases score' : '↓ Decreases score'}
      </p>
    </div>
  );
}

// ── Component ───────────────────────────────────────────────────────

export function ShapWaterfallChart({
  shapValues,
  baseValue = 50,
  finalScore,
  className,
}: ShapWaterfallChartProps) {
  const chartData = useMemo(() => {
    // Sort by absolute SHAP value descending (already sorted in engine, but be safe)
    const sorted = [...shapValues].sort(
      (a, b) => Math.abs(b.shapValue) - Math.abs(a.shapValue)
    );

    return sorted.map((item) => ({
      ...item,
      displayFeature: FEATURE_LABELS[item.feature] ?? item.feature,
    }));
  }, [shapValues]);

  const displayFinalScore = finalScore ?? baseValue + shapValues.reduce((sum, v) => sum + v.shapValue, 0);

  if (chartData.length === 0) {
    return (
      <div className={cn('flex items-center justify-center h-64 text-muted-foreground text-sm', className)}>
        No SHAP values to display
      </div>
    );
  }

  // Calculate domain based on data
  const allValues = chartData.map((d) => d.shapValue);
  const maxAbs = Math.max(...allValues.map(Math.abs), 1);
  const domainMin = -maxAbs * 1.15;
  const domainMax = maxAbs * 1.15;

  // Chart height based on number of features
  const chartHeight = Math.max(250, chartData.length * 36 + 80);

  return (
    <div className={cn('w-full', className)}>
      {/* Score summary bar */}
      <div className="flex items-center justify-between mb-3 px-1 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Base:</span>
          <span className="font-mono font-semibold text-foreground">{baseValue.toFixed(1)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Final:</span>
          <span className="font-mono font-bold text-primary">{displayFinalScore.toFixed(1)}</span>
        </div>
      </div>

      <div style={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 0, right: 40, bottom: 0, left: 0 }}
          >
            <XAxis
              type="number"
              domain={[domainMin, domainMax]}
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              tickFormatter={(v: number) => (v >= 0 ? `+${v.toFixed(1)}` : v.toFixed(1))}
              axisLine={{ stroke: 'var(--border)' }}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="displayFeature"
              width={140}
              tick={{ fontSize: 12, fill: 'var(--foreground)' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.3 }} />
            <ReferenceLine x={0} stroke="var(--border)" strokeWidth={1} />
            <Bar
              dataKey="shapValue"
              radius={[0, 4, 4, 0]}
              maxBarSize={24}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.shapValue >= 0 ? POSITIVE_COLOR : NEGATIVE_COLOR}
                  className="dark:[fill:var(--chart-1)]"
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 mt-3 px-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="size-2.5 rounded-sm" style={{ backgroundColor: POSITIVE_COLOR }} />\n          <span>Increases score</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="size-2.5 rounded-sm" style={{ backgroundColor: NEGATIVE_COLOR }} />\n          <span>Decreases score</span>
        </div>
      </div>
    </div>
  );
}
