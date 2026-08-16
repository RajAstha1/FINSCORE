'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent,
} from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid,
} from 'recharts';
import {
  Shield, AlertTriangle, CheckCircle, Users, TrendingUp,
} from 'lucide-react';
import { useAuthStore } from '@/store/use-auth-store';
import { PageHeader } from '@/components/shared/page-header';
import { StatsCard } from '@/components/shared/stats-card';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface GroupMetric {
  group: string;
  total: number;
  approvalRate: number;
  avgScore: number;
  rejectionRate: number;
}

interface DisparateImpact {
  groupA: string;
  groupB: string;
  ratio: number;
}

interface AttributeMetrics {
  groups: GroupMetric[];
  disparateImpact: DisparateImpact | null;
}

interface StoredMetric {
  id: string;
  modelVersion: string;
  protectedAttr: string;
  metricName: string;
  metricValue: number;
  groupA: string;
  groupB: string;
  createdAt: string;
}

interface FairnessData {
  storedMetrics: StoredMetric[];
  realtime: {
    gender: AttributeMetrics;
    category: AttributeMetrics;
    state: AttributeMetrics;
  };
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const COMPLIANCE_THRESHOLD = 0.8;

function getRatioColor(ratio: number) {
  if (ratio >= COMPLIANCE_THRESHOLD) return 'text-emerald-600 dark:text-emerald-400';
  if (ratio >= 0.6) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function getRatioBadgeVariant(ratio: number): 'default' | 'destructive' | 'outline' {
  if (ratio >= COMPLIANCE_THRESHOLD) return 'default';
  return 'destructive';
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function FairnessDashboardPage() {
  const token = useAuthStore((s) => s.token)!;

  const { data, isLoading } = useQuery({
    queryKey: ['fairness'],
    queryFn: async () => {
      const res = await fetch('/api/fairness', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to fetch fairness data');
      return res.json() as Promise<FairnessData>;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in-up">
        <PageHeader title="Fairness & Bias Audit" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const realtime = data?.realtime;
  const attributes = [
    { key: 'gender', label: 'Gender' },
    { key: 'category', label: 'Category' },
    { key: 'state', label: 'State' },
  ] as const;

  // Compute summary stats
  const genderDI = realtime?.gender?.disparateImpact;
  const categoryDI = realtime?.category?.disparateImpact;
  const allMetrics = data?.storedMetrics ?? [];
  const protectedAttrsTracked = new Set(allMetrics.map((m) => m.protectedAttr)).size;

  // Find concerning metrics
  const concerning = allMetrics.filter((m) => m.metricValue < COMPLIANCE_THRESHOLD);

  return (
    <motion.div
      className="space-y-6 animate-fade-in-up"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <PageHeader title="Fairness & Bias Audit" />

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        <StatsCard
          title="Disparate Impact (Gender)"
          value={genderDI ? genderDI.ratio.toFixed(3) : 'N/A'}
          icon={Users}
          iconColor={genderDI ? (genderDI.ratio >= COMPLIANCE_THRESHOLD ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 text-red-600 dark:text-red-400') : 'bg-muted text-muted-foreground'}
        />
        <StatsCard
          title="Equal Opportunity"
          value={categoryDI ? categoryDI.ratio.toFixed(3) : 'N/A'}
          icon={TrendingUp}
          iconColor={categoryDI ? (categoryDI.ratio >= COMPLIANCE_THRESHOLD ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400') : 'bg-muted text-muted-foreground'}
        />
        <StatsCard
          title="Demographic Parity"
          value={realtime?.state?.disparateImpact ? realtime.state.disparateImpact.ratio.toFixed(3) : 'N/A'}
          icon={Shield}
          iconColor={realtime?.state?.disparateImpact ? (realtime.state.disparateImpact.ratio >= COMPLIANCE_THRESHOLD ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400') : 'bg-muted text-muted-foreground'}
        />
        <StatsCard
          title="Protected Attributes Tracked"
          value={protectedAttrsTracked || 3}
          icon={AlertTriangle}
          iconColor="bg-primary/10 text-primary"
        />
      </div>

      {/* Concerning Metrics Alert */}
      {concerning.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Flagged Metrics Detected</AlertTitle>
          <AlertDescription>
            {concerning.length} metric{concerning.length > 1 ? 's' : ''} below the 0.8 compliance threshold. Review the detailed tables below.
          </AlertDescription>
        </Alert>
      )}

      {concerning.length === 0 && allMetrics.length > 0 && (
        <Alert>
          <CheckCircle className="size-4" />
          <AlertTitle>All Clear</AlertTitle>
          <AlertDescription>
            All fairness metrics are within the compliance threshold (≥ {COMPLIANCE_THRESHOLD}).
          </AlertDescription>
        </Alert>
      )}

      {/* Per-Attribute Breakdown */}
      {attributes.map(({ key, label }) => {
        const attrData = realtime?.[key];
        if (!attrData) return null;

        const chartData = attrData.groups.map((g) => ({
          name: g.group,
          approvalRate: g.approvalRate,
          avgScore: g.avgScore,
          total: g.total,
        }));

        const di = attrData.disparateImpact;

        return (
          <Card key={key} className="glass-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">{label} Analysis</CardTitle>
                  <CardDescription>Approval rates and score distribution by {label.toLowerCase()}</CardDescription>
                </div>
                {di && (
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Disparate Impact</p>
                    <p className={`text-lg font-mono font-bold tabular-nums ${getRatioColor(di.ratio)}`}>{di.ratio.toFixed(3)}</p>
                    <Badge variant={getRatioBadgeVariant(di.ratio)} className="text-[10px]">
                      {di.ratio >= COMPLIANCE_THRESHOLD ? 'Compliant' : 'Flagged'}
                    </Badge>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Approval Rate Bars */}
              <div className="space-y-2">
                {attrData.groups.map((g) => {
                  const isCompliant = di ? g.group === di.groupB ? di.ratio >= COMPLIANCE_THRESHOLD : true : true;
                  return (
                    <div key={g.group} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{g.group}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">n={g.total}</span>
                          <span className="font-mono font-bold tabular-nums">{g.approvalRate}%</span>
                        </div>
                      </div>
                      <div className="relative">
                        <Progress value={g.approvalRate} className="h-2.5" />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Group Comparison Chart */}
              {chartData.length > 1 && (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      <Bar dataKey="approvalRate" fill="var(--chart-1)" radius={[4, 4, 0, 0]} name="Approval Rate %" />
                      <Bar dataKey="avgScore" fill="var(--chart-2)" radius={[4, 4, 0, 0]} name="Avg Score" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Detailed Table */}
              <div className="max-h-48 overflow-y-auto scrollbar-thin">
                <Table>
                  <TableHeader>
                    <TableRow className="sticky top-0 bg-card z-10">
                      <TableHead className="font-semibold">Group</TableHead>
                      <TableHead className="font-semibold text-right">Total</TableHead>
                      <TableHead className="font-semibold text-right">Approval Rate</TableHead>
                      <TableHead className="font-semibold text-right">Avg Score</TableHead>
                      <TableHead className="font-semibold text-right">Rejection Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attrData.groups.map((g) => (
                      <TableRow key={g.group}>
                        <TableCell className="text-sm font-medium">{g.group}</TableCell>
                        <TableCell className="font-mono text-sm text-right tabular-nums">{g.total}</TableCell>
                        <TableCell className="font-mono text-sm text-right tabular-nums">{g.approvalRate}%</TableCell>
                        <TableCell className="font-mono text-sm text-right tabular-nums">{g.avgScore}</TableCell>
                        <TableCell className="font-mono text-sm text-right tabular-nums">{g.rejectionRate}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Stored Metrics Table */}
      {allMetrics.length > 0 && (
        <Card className="glass-card overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Historical Fairness Metrics</CardTitle>
            <CardDescription>Stored model evaluation metrics by protected attribute</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-64 overflow-y-auto scrollbar-thin">
              <Table>
                <TableHeader>
                  <TableRow className="sticky top-0 bg-card z-10">
                    <TableHead className="font-semibold">Date</TableHead>
                    <TableHead className="font-semibold">Model Version</TableHead>
                    <TableHead className="font-semibold">Attribute</TableHead>
                    <TableHead className="font-semibold">Metric</TableHead>
                    <TableHead className="font-semibold">Value</TableHead>
                    <TableHead className="font-semibold">Group A</TableHead>
                    <TableHead className="font-semibold">Group B</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allMetrics.slice(0, 50).map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">{new Date(m.createdAt).toLocaleDateString('en-IN')}</TableCell>
                      <TableCell className="font-mono text-xs">{m.modelVersion}</TableCell>
                      <TableCell className="text-sm capitalize">{m.protectedAttr}</TableCell>
                      <TableCell className="text-sm">{m.metricName.replace(/_/g, ' ')}</TableCell>
                      <TableCell className={`font-mono text-sm font-bold tabular-nums ${getRatioColor(m.metricValue)}`}>{m.metricValue.toFixed(3)}</TableCell>
                      <TableCell className="text-sm">{m.groupA}</TableCell>
                      <TableCell className="text-sm">{m.groupB}</TableCell>
                      <TableCell>
                        <Badge variant={getRatioBadgeVariant(m.metricValue)} className="text-[10px]">
                          {m.metricValue >= COMPLIANCE_THRESHOLD ? 'OK' : 'Flag'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
