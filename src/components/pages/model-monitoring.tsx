'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent,
} from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, BarChart, Bar, CartesianGrid,
} from 'recharts';
import {
  Brain, Activity, TrendingUp, Target, Shield, BarChart3, GitBranch,
} from 'lucide-react';
import { useAuthStore } from '@/store/use-auth-store';
import { PageHeader } from '@/components/shared/page-header';
import { StatsCard } from '@/components/shared/stats-card';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface MonitoringData {
  modelPerformance: Record<string, {
    latest: number; avg: number;
    trend: { date: string; value: number }[];
  }>;
  scoring: {
    totalScores: number;
    avgScore: number;
    avgConfidence: number;
    gradeDistribution: Array<{ grade: string; count: number }>;
  };
  decisions: Array<{ type: string; count: number }>;
  pipeline: Array<{ status: string; count: number }>;
  overrides: {
    total: number;
    recent: Array<{
      id: string; originalGrade: string; newGrade: string; reason: string;
      createdAt: string; analyst: { name: string; email: string } | null;
    }>;
  };
  modelVersions: Array<{
    version: string; count: number; avgScore: number; avgConfidence: number;
  }>;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const GRADE_COLORS: Record<string, string> = {
  'A+': '#059669', 'A': '#10B981', 'B+': '#14B8A6', 'B': '#F59E0B',
  'C+': '#F97316', 'C': '#EF4444', 'D': '#DC2626',
};

const DECISION_COLORS: Record<string, string> = {
  auto_approve: '#10B981', manual_review: '#F59E0B', reject: '#EF4444',
};

const METRIC_COLORS = ['#0F766E', '#F59E0B', '#10B981', '#818CF8'];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ModelMonitoringPage() {
  const token = useAuthStore((s) => s.token)!;

  const { data, isLoading } = useQuery({
    queryKey: ['monitoring'],
    queryFn: async () => {
      const res = await fetch('/api/monitoring', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to fetch monitoring data');
      return res.json() as Promise<MonitoringData>;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in-up">
        <PageHeader title="Model Monitoring & Performance" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const d = data;
  const perf = d?.modelPerformance ?? {};
  const scoring = d?.scoring;
  const decisions = d?.decisions ?? [];
  const pipeline = d?.pipeline ?? [];
  const modelVersions = d?.modelVersions ?? [];
  const overrideTotal = d?.overrides?.total ?? 0;

  // Aggregate metrics
  const avgF1 = perf['f1']?.avg ?? 0;
  const avgAuc = perf['auc_roc']?.avg ?? 0;
  const latestVersion = modelVersions[0]?.version ?? '—';

  // Performance trend data (combine all metric trends)
  const performanceTrend = (() => {
    const metricNames = ['f1', 'precision', 'recall', 'auc_roc'];
    const allDates = new Set<string>();
    metricNames.forEach((m) => { (perf[m]?.trend ?? []).forEach((t) => allDates.add(t.date)); });
    return Array.from(allDates).sort().map((date) => {
      const point: Record<string, string | number> = { date };
      metricNames.forEach((m) => {
        const entry = (perf[m]?.trend ?? []).find((t) => t.date === date);
        point[m] = entry?.value ?? null;
      });
      return point;
    });
  })();

  // Decision pie data
  const decisionPieData = decisions.map((dec) => ({ name: dec.type?.replace(/_/g, ' '), value: dec.count, fill: DECISION_COLORS[dec.type] ?? '#94A3B8' }));

  // Grade bar data
  const gradeBarData = (scoring?.gradeDistribution ?? []).map((g) => ({ grade: g.grade, count: g.count, fill: GRADE_COLORS[g.grade] ?? '#94A3B8' }));

  // Pipeline data for scoring volume
  const pipelineData = pipeline.filter((p) => ['submitted', 'approved', 'rejected', 'disbursed', 'sanctioned'].includes(p.status));

  // Override rate
  const overrideRate = scoring && scoring.totalScores > 0 ? ((overrideTotal / scoring.totalScores) * 100).toFixed(1) : '0.0';

  return (
    <motion.div
      className="space-y-6 animate-fade-in-up"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <PageHeader title="Model Monitoring & Performance" />

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 stagger-children">
        <StatsCard title="Model Version" value={latestVersion} icon={GitBranch} iconColor="bg-primary/10 text-primary" />
        <StatsCard title="Avg F1" value={avgF1.toFixed(3)} icon={Target} iconColor="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" />
        <StatsCard title="Avg AUC-ROC" value={avgAuc.toFixed(3)} icon={Activity} iconColor="bg-teal-500/10 text-teal-600 dark:text-teal-400" />
        <StatsCard title="Total Scores" value={scoring?.totalScores ?? 0} icon={Brain} iconColor="bg-amber-500/10 text-amber-600 dark:text-amber-400" />
        <StatsCard title="Avg Confidence" value={`${scoring?.avgConfidence ?? 0}%`} icon={Shield} iconColor="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" />
        <StatsCard title="Override Rate" value={`${overrideRate}%`} icon={BarChart3} iconColor="bg-red-500/10 text-red-600 dark:text-red-400" />
      </div>

      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">Performance Metrics</TabsTrigger>
          <TabsTrigger value="decisions">Decision Distribution</TabsTrigger>
          <TabsTrigger value="volume">Scoring Volume</TabsTrigger>
        </TabsList>

        {/* Performance Metrics Tab */}
        <TabsContent value="performance" className="space-y-4">
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Metrics Over Time</CardTitle>
              <CardDescription>F1, Precision, Recall, and AUC-ROC trends</CardDescription>
            </CardHeader>
            <CardContent>
              {performanceTrend.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No performance data available yet.</p>
              ) : (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={performanceTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                      <YAxis domain={[0, 1]} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--border)' }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Line type="monotone" dataKey="f1" name="F1" stroke={METRIC_COLORS[0]} strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="precision" name="Precision" stroke={METRIC_COLORS[1]} strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="recall" name="Recall" stroke={METRIC_COLORS[2]} strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="auc_roc" name="AUC-ROC" stroke={METRIC_COLORS[3]} strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Metrics by version table */}
          <Card className="glass-card overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Metrics by Model Version</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-64 overflow-y-auto scrollbar-thin">
                <Table>
                  <TableHeader>
                    <TableRow className="sticky top-0 bg-card z-10">
                      <TableHead className="font-semibold">Version</TableHead>
                      <TableHead className="font-semibold text-right">Applications</TableHead>
                      <TableHead className="font-semibold text-right">Avg Score</TableHead>
                      <TableHead className="font-semibold text-right">Avg Confidence</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {modelVersions.map((v) => (
                      <TableRow key={v.version}>
                        <TableCell className="font-mono text-sm font-medium">{v.version}</TableCell>
                        <TableCell className="font-mono text-sm text-right tabular-nums">{v.count.toLocaleString('en-IN')}</TableCell>
                        <TableCell className="font-mono text-sm text-right tabular-nums">{v.avgScore}</TableCell>
                        <TableCell className="font-mono text-sm text-right tabular-nums">{v.avgConfidence}%</TableCell>
                      </TableRow>
                    ))}
                    {modelVersions.length === 0 && (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No version data available.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Decision Distribution Tab */}
        <TabsContent value="decisions" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Decision Type Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {decisionPieData.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">No decision data.</p>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={decisionPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40} paddingAngle={3}>
                          {decisionPieData.map((entry, idx) => (
                            <Cell key={idx} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex justify-center gap-4 mt-2">
                      {decisionPieData.map((d) => (
                        <div key={d.name} className="flex items-center gap-1.5 text-xs">
                          <div className="size-2.5 rounded-full" style={{ backgroundColor: d.fill }} />
                          <span className="capitalize">{d.name}</span>
                          <span className="font-mono font-medium">({d.value})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Risk Grade Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {gradeBarData.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">No grade data.</p>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={gradeBarData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="grade" tick={{ fontSize: 12, fill: 'var(--foreground)', fontWeight: 600 }} />
                        <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                          {gradeBarData.map((entry, idx) => (
                            <Cell key={idx} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Scoring Volume Tab */}
        <TabsContent value="volume" className="space-y-4">
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Application Pipeline</CardTitle>
              <CardDescription>Distribution by status</CardDescription>
            </CardHeader>
            <CardContent>
              {pipelineData.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No pipeline data.</p>
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pipelineData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="status" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      <Bar dataKey="count" fill="var(--chart-1)" radius={[4, 4, 0, 0]} name="Count" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Scoring Statistics</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-64 overflow-y-auto scrollbar-thin">
                <Table>
                  <TableHeader>
                    <TableRow className="sticky top-0 bg-card z-10">
                      <TableHead className="font-semibold">Metric</TableHead>
                      <TableHead className="font-semibold text-right">Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow><TableCell className="text-sm">Total Applications Scored</TableCell><TableCell className="font-mono text-sm text-right tabular-nums">{scoring?.totalScores ?? 0}</TableCell></TableRow>
                    <TableRow><TableCell className="text-sm">Average Score</TableCell><TableCell className="font-mono text-sm text-right tabular-nums">{scoring?.avgScore ?? 0}</TableCell></TableRow>
                    <TableRow><TableCell className="text-sm">Average Confidence</TableCell><TableCell className="font-mono text-sm text-right tabular-nums">{scoring?.avgConfidence ?? 0}%</TableCell></TableRow>
                    <TableRow><TableCell className="text-sm">Total Overrides</TableCell><TableCell className="font-mono text-sm text-right tabular-nums">{overrideTotal}</TableCell></TableRow>
                    <TableRow><TableCell className="text-sm">Override Rate</TableCell><TableCell className="font-mono text-sm text-right tabular-nums">{overrideRate}%</TableCell></TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
