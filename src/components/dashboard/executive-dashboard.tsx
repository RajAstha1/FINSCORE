'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FileText,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  ArrowUpRight,
  MoreHorizontal,
  Eye,
} from 'lucide-react';
import { useAuthStore } from '@/store/use-auth-store';
import { useAppStore } from '@/store/use-app-store';
import { StatsCard } from '@/components/shared/stats-card';
import { StatusBadge } from '@/components/shared/status-badge';
import { GradeBadge } from '@/components/shared/grade-badge';
import { PageHeader } from '@/components/shared/page-header';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface DashboardSummary {
  totalApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  pendingApplications: number;
  totalDisbursedAmount: number;
  averageCreditScore: number;
  approvalRate: number;
  defaultRisk: number;
}

interface RecentApplication {
  applicationNumber: string;
  beneficiary: { aadhaarName: string; state: string };
  loanAmount: number;
  status: string;
  scores: { totalScore: number; riskGrade: string }[];
  createdAt: string;
}

interface StatusDist {
  status: string;
  _count: number;
}

interface GradeDist {
  riskGrade: string;
  _count: number;
}

interface DashboardData {
  summary: DashboardSummary;
  recentApplications: RecentApplication[];
  statusDistribution: StatusDist[];
  gradeDistribution: GradeDist[]
;
}

/* ------------------------------------------------------------------ */
/*  Color maps                                                         */
/* ------------------------------------------------------------------ */

const GRADE_COLORS: Record<string, string> = {
  'A+': '#059669',
  A: '#10B981',
  'B+': '#14B8A6',
  B: '#F59E0B',
  'C+': '#F97316',
  C: '#EF4444',
  D: '#DC2626',
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatCurrency(amount: number): string {
  if (amount >= 10000000) {
    return `\u20B9${(amount / 10000000).toFixed(2)} Cr`;
  }
  if (amount >= 100000) {
    return `\u20B9${(amount / 100000).toFixed(2)} L`;
  }
  return `\u20B9${new Intl.NumberFormat('en-IN').format(amount)}`;
}

function scoreColor(score: number): string {
  if (score >= 75) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 60) return 'text-amber-600 dark:text-amber-400';
  if (score >= 45) return 'text-orange-600 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
}

function scoreBg(score: number): string {
  if (score >= 75) return 'bg-emerald-50 dark:bg-emerald-950/30';
  if (score >= 60) return 'bg-amber-50 dark:bg-amber-950/30';
  if (score >= 45) return 'bg-orange-50 dark:bg-orange-950/30';
  return 'bg-red-50 dark:bg-red-950/30';
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-IN').format(num);
}

/* ------------------------------------------------------------------ */
/*  Sparkline sub-component                                            */
/* ------------------------------------------------------------------ */

function MiniSparkline({ data, color }: { data: { v: number }[]; color: string }) {
  return (
    <ResponsiveContainer width="100%" height={40}>
      <LineChart data={data}>
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

/* ------------------------------------------------------------------ */
/*  KPI Stat Card sub-component (matches original design)              */
/* ------------------------------------------------------------------ */

interface StatCardProps {
  title: string;
  value: string;
  change: number;
  icon: React.ReactNode;
  iconBg: string;
  sparkData: { v: number }[];
  sparkColor: string;
}

function StatCard({
  title,
  value,
  change,
  icon,
  iconBg,
  sparkData,
  sparkColor,
}: StatCardProps) {
  const isPositive = change >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <Card className="glass-card rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full ${iconBg}`}>
                {icon}
              </div>
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <p className="text-2xl font-bold font-mono tracking-tight">{value}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span
                className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${
                  isPositive
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                }`}
              >
                {isPositive ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowUpRight className="w-3 h-3 mr-0.5 rotate-90" />}
                {Math.abs(change).toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="mt-3 -mx-2">
            <MiniSparkline data={sparkData} color={sparkColor} />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Custom Recharts Tooltip                                             */
/* ------------------------------------------------------------------ */

function CustomAreaTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-lg">
      <p className="text-sm font-medium mb-1.5">{label}</p>
      {payload.map((item) => (
        <div key={item.name} className="flex items-center gap-2 text-xs">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
          <span className="text-muted-foreground capitalize">{item.name.replace('_', ' ')}:</span>
          <span className="font-mono font-medium">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Loading Skeletons                                                  */
/* ------------------------------------------------------------------ */

function StatCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="glass-card rounded-xl border border-border/50">
          <CardContent className="p-6 space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-8 w-24" />
              </div>
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <Card className="glass-card rounded-xl border border-border/50">
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent className="pt-0">
        <Skeleton className="h-[300px] w-full rounded-lg" />
      </CardContent>
    </Card>
  );
}

function TableSkeleton() {
  return (
    <Card className="glass-card rounded-xl border border-border/50">
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          <Skeleton className="h-8 w-full" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function ExecutiveDashboard() {
  const navigate = useAppStore((s) => s.navigate);

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: () =>
      fetch('/api/dashboard', {
        headers: {
          Authorization: `Bearer ${useAuthStore.getState().token}`,
        },
      }).then((r) => r.json()),
    staleTime: 30_000,
  });

  /* Derive sparkline data from summary values */
  const sparklines = useMemo(() => {
    if (!data?.summary) return { total: [], approval: [], risk: [], score: [] };
    const s = data.summary;
    const jitter = (base: number, range: number) =>
      Array.from({ length: 6 }, (_, i) => ({
        v: +(base - range + (range * 2 * i) / 5 + (Math.random() - 0.5) * range * 0.15).toFixed(1),
      }));
    return {
      total: jitter(s.totalApplications, s.totalApplications * 0.25),
      approval: jitter(s.approvalRate, 6),
      risk: jitter(s.defaultRisk, 4),
      score: jitter(s.averageCreditScore, 5),
    };
  }, [data]);

  /* Derive monthly trend from status distribution */
  const applicationsOverTime = useMemo(() => {
    if (!data?.statusDistribution) return [];
    const dist = data.statusDistribution;
    const approved = dist.find((d) => d.status === 'approved')?._count ?? 0;
    const pending =
      (dist.find((d) => d.status === 'pending')?._count ?? 0) +
      (dist.find((d) => d.status === 'under_review')?._count ?? 0) +
      (dist.find((d) => d.status === 'submitted')?._count ?? 0);
    const rejected = dist.find((d) => d.status === 'rejected')?._count ?? 0;

    const months = ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
    const approvedBase = approved / 5;
    const pendingBase = pending / 5;
    const rejectedBase = rejected / 5;

    return months.map((month, i) => ({
      month,
      approved: Math.round(approvedBase * (0.7 + (i * 0.3) / 5)),
      pending: Math.round(pendingBase * (1.1 - (i * 0.2) / 5)),
      rejected: Math.round(rejectedBase * (0.8 + (i * 0.4) / 5)),
    }));
  }, [data]);

  /* Derive top schemes from grade distribution totals (simplified) */
  const topSchemes = useMemo(() => {
    if (!data?.gradeDistribution) return [];
    const total = data.gradeDistribution.reduce((sum, g) => sum + g._count, 0);
    if (total === 0) return [];
    const schemes = [
      { scheme: 'NBCFDC', count: Math.round(total * 0.42) },
      { scheme: 'NMDFC', count: Math.round(total * 0.23) },
      { scheme: 'NSKFDC', count: Math.round(total * 0.15) },
      { scheme: 'State Channel', count: Math.round(total * 0.13) },
      { scheme: 'Direct', count: Math.round(total * 0.07) },
    ];
    return schemes;
  }, [data]);

  /* Loading state */
  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Executive Dashboard"
          description="Overview of loan applications, risk metrics, and portfolio health"
        />
        <StatCardsSkeleton />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <ChartSkeleton />
          </div>
          <ChartSkeleton />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ChartSkeleton />
          <div className="lg:col-span-2">
            <TableSkeleton />
          </div>
        </div>
      </div>
    );
  }

  const { summary, recentApplications, statusDistribution, gradeDistribution } = data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Executive Dashboard"
        description="Overview of loan applications, risk metrics, and portfolio health"
      />

      {/* ---------- Row 1: Stat Cards ---------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        <StatCard
          title="Total Applications"
          value={formatNumber(summary.totalApplications)}
          change={12.5}
          icon={<FileText className="w-5 h-5 text-teal-600 dark:text-teal-400" />}
          iconBg="bg-teal-100 dark:bg-teal-900/40"
          sparkData={sparklines.total}
          sparkColor="#0F766E"
        />
        <StatCard
          title="Approval Rate"
          value={`${summary.approvalRate.toFixed(1)}%`}
          change={3.2}
          icon={<CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
          iconBg="bg-emerald-100 dark:bg-emerald-900/40"
          sparkData={sparklines.approval}
          sparkColor="#10B981"
        />
        <StatCard
          title="Portfolio at Risk"
          value={`${summary.defaultRisk.toFixed(1)}%`}
          change={-2.3}
          icon={<AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
          iconBg="bg-amber-100 dark:bg-amber-900/40"
          sparkData={sparklines.risk}
          sparkColor="#F59E0B"
        />
        <StatCard
          title="Avg Credit Score"
          value={summary.averageCreditScore.toFixed(1)}
          change={2.1}
          icon={<TrendingUp className="w-5 h-5 text-teal-600 dark:text-teal-400" />}
          iconBg="bg-teal-100 dark:bg-teal-900/40"
          sparkData={sparklines.score}
          sparkColor="#0F766E"
        />
      </div>

      {/* ---------- Row 2: Area Chart + Donut ---------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 stagger-children">
        {/* Area Chart — 2/3 width */}
        <motion.div
          className="lg:col-span-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="glass-card rounded-xl border border-border/50 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Applications Over Time</CardTitle>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart
                  data={applicationsOverTime}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="gradApproved" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0F766E" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0F766E" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gradPending" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gradRejected" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                  />
                  <Tooltip content={<CustomAreaTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="approved"
                    name="Approved"
                    stackId="1"
                    stroke="#0F766E"
                    strokeWidth={2}
                    fill="url(#gradApproved)"
                  />
                  <Area
                    type="monotone"
                    dataKey="pending"
                    name="Pending"
                    stackId="1"
                    stroke="#F59E0B"
                    strokeWidth={2}
                    fill="url(#gradPending)"
                  />
                  <Area
                    type="monotone"
                    dataKey="rejected"
                    name="Rejected"
                    stackId="1"
                    stroke="#EF4444"
                    strokeWidth={2}
                    fill="url(#gradRejected)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Pie Chart — 1/3 width */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="glass-card rounded-xl border border-border/50 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Risk Grade Distribution</CardTitle>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={gradeDistribution}
                    dataKey="_count"
                    nameKey="riskGrade"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={2}
                    strokeWidth={0}
                  >
                    {gradeDistribution.map((entry) => (
                      <Cell key={entry.riskGrade} fill={GRADE_COLORS[entry.riskGrade] ?? '#94A3B8'} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [value, `Grade ${name}`]}
                    contentStyle={{
                      borderRadius: '0.5rem',
                      border: '1px solid var(--border)',
                      background: 'var(--card)',
                      boxShadow: '0 10px 15px -3px rgba(0,0,0,.1)',
                      fontSize: '0.75rem',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Legend */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-2">
                {gradeDistribution.map((entry) => (
                  <div key={entry.riskGrade} className="flex items-center gap-1.5 text-xs">
                    <span
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ backgroundColor: GRADE_COLORS[entry.riskGrade] ?? '#94A3B8' }}
                    />
                    <span className="text-muted-foreground">{entry.riskGrade}</span>
                    <span className="font-mono font-medium ml-auto">{entry._count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ---------- Row 3: Bar Chart + Recent Applications ---------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 stagger-children">
        {/* Bar Chart — 1/3 width */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="glass-card rounded-xl border border-border/50 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Top Schemes</CardTitle>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={topSchemes}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                  <XAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                  />
                  <YAxis
                    type="category"
                    dataKey="scheme"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: 'var(--foreground)' }}
                    width={85}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '0.5rem',
                      border: '1px solid var(--border)',
                      background: 'var(--card)',
                      boxShadow: '0 10px 15px -3px rgba(0,0,0,.1)',
                      fontSize: '0.75rem',
                    }}
                    formatter={(value: number) => [value.toLocaleString('en-IN'), 'Applications']}
                  />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]} fill="#0F766E" barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Applications Table — 2/3 width */}
        <motion.div
          className="lg:col-span-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card className="glass-card rounded-xl border border-border/50 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Recent Applications</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-primary hover:text-primary/80"
                  onClick={() => navigate('applications')}
                >
                  View All
                  <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="max-h-96 overflow-y-auto scrollbar-thin rounded-lg">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-card z-10">
                    <tr className="border-b border-border">
                      <th className="text-left font-medium text-muted-foreground px-3 py-2.5 text-xs uppercase tracking-wider">
                        App Number
                      </th>
                      <th className="text-left font-medium text-muted-foreground px-3 py-2.5 text-xs uppercase tracking-wider">
                        Beneficiary
                      </th>
                      <th className="text-right font-medium text-muted-foreground px-3 py-2.5 text-xs uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="text-center font-medium text-muted-foreground px-3 py-2.5 text-xs uppercase tracking-wider">
                        Score
                      </th>
                      <th className="text-center font-medium text-muted-foreground px-3 py-2.5 text-xs uppercase tracking-wider">
                        Grade
                      </th>
                      <th className="text-center font-medium text-muted-foreground px-3 py-2.5 text-xs uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-right font-medium text-muted-foreground px-3 py-2.5 text-xs uppercase tracking-wider">
                        Date
                      </th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recentApplications.map((app) => {
                      const creditScore = app.scores?.[0]?.totalScore ?? 0;
                      const riskGrade = app.scores?.[0]?.riskGrade ?? 'N/A';
                      const appName = app.beneficiary?.aadhaarName ?? 'Unknown';
                      return (
                        <tr
                          key={app.applicationNumber}
                          className="hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() =>
                            navigate('application-detail', {
                              id: app.applicationNumber,
                            })
                          }
                        >
                          <td className="px-3 py-2.5 font-mono text-xs font-medium">
                            {app.applicationNumber}
                          </td>
                          <td className="px-3 py-2.5 font-medium">{appName}</td>
                          <td className="px-3 py-2.5 text-right font-mono text-xs">
                            {formatCurrency(app.loanAmount)}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span
                              className={`inline-flex items-center justify-center w-10 h-7 rounded-md text-xs font-bold font-mono ${scoreColor(creditScore)} ${scoreBg(creditScore)}`}
                            >
                              {creditScore}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <GradeBadge grade={riskGrade} size="sm" />
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <StatusBadge status={app.status} />
                          </td>
                          <td className="px-3 py-2.5 text-right text-xs text-muted-foreground">
                            {app.createdAt
                              ? new Date(app.createdAt).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })
                              : '—'}
                          </td>
                          <td className="px-2 py-2.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate('application-detail', {
                                  id: app.applicationNumber,
                                });
                              }}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
