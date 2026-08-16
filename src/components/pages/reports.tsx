'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent,
} from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, BarChart, Bar, CartesianGrid,
} from 'recharts';
import {
  IndianRupee, TrendingUp, BarChart3, AlertTriangle, FileText,
} from 'lucide-react';
import { useAuthStore } from '@/store/use-auth-store';
import { PageHeader } from '@/components/shared/page-header';
import { StatsCard } from '@/components/shared/stats-card';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ReportsData {
  period: string;
  disbursementTrend: Array<{ status: string; count: number; totalAmount: number }>;
  monthlyTrend: Array<{ month: string; status: string; count: number }>;
  portfolio: {
    totalDisbursed: number;
    totalDefaulted: number;
    totalDisbursedAmount: number;
    totalRecoveredAmount: number;
    recoveryRate: number;
    defaultRate: number;
    collectionRate: number;
    overdueAmount: number;
  };
  repayment: Array<{ status: string; count: number; totalDue: number; totalPaid: number }>;
  stateStats: Array<{ state: string; _count: number }>;
  stateLoanData: Array<{ state: string; totalLoans: number; totalAmount: number; avgScore: number }>;
  schemeDistribution: Array<{ scheme: string; count: number; totalAmount: number }>;
  gradeDistribution: Array<{ riskGrade: string; count: number; avgScore: number; totalAmount: number }>;
  categoryStats: Array<{ category: string; total: number; approved: number; avgScore: number }>;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const GRADE_COLORS: Record<string, string> = {
  'A+': '#059669', 'A': '#10B981', 'B+': '#14B8A6', 'B': '#F59E0B',
  'C+': '#F97316', 'C': '#EF4444', 'D': '#DC2626',
};

const STATUS_COLORS: Record<string, string> = {
  approved: '#10B981', rejected: '#EF4444', submitted: '#F59E0B', disbursed: '#0F766E',
  sanctioned: '#14B8A6', under_review: '#818CF8', scoring: '#F97316', closed: '#94A3B8',
};

const PIE_COLORS = ['#0F766E', '#F59E0B', '#10B981', '#818CF8', '#F97316', '#EC4899', '#94A3B8'];

function formatCurrency(amount: number) {
  return `\u20B9${amount.toLocaleString('en-IN')}`;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ReportsPage() {
  const token = useAuthStore((s) => s.token)!;
  const [period, setPeriod] = useState('6months');

  const { data, isLoading } = useQuery({
    queryKey: ['reports', period],
    queryFn: async () => {
      const res = await fetch(`/api/reports?period=${period}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to fetch reports');
      return res.json() as Promise<ReportsData>;
    },
  });

  const portfolio = data?.portfolio;

  // Monthly approval trend: pivot monthlyTrend into { month, approved, rejected, ... }
  const monthlyTrend = data?.monthlyTrend;
  const approvalTrend = useMemo(() => {
    if (!monthlyTrend) return [];
    const grouped: Record<string, Record<string, number>> = {};
    for (const row of monthlyTrend) {
      if (!grouped[row.month]) grouped[row.month] = {};
      grouped[row.month][row.status] = row.count;
    }
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([month, statuses]) => ({
      month,
      approved: statuses.approved || statuses.sanctioned || statuses.disbursed || 0,
      rejected: statuses.rejected || 0,
      pending: statuses.submitted || statuses.under_review || 0,
    }));
  }, [monthlyTrend]);

  // Grade pie data
  const gradePieData = (data?.gradeDistribution ?? []).map((g) => ({
    name: g.riskGrade, value: g.count, fill: GRADE_COLORS[g.riskGrade] ?? '#94A3B8',
  }));

  // Scheme bar data
  const schemeBarData = (data?.schemeDistribution ?? []).map((s, idx) => ({
    name: s.scheme || 'Unknown', amount: s.totalAmount, count: s.count, fill: PIE_COLORS[idx % PIE_COLORS.length],
  }));

  // State-wise stacked bar
  const stateBarData = (data?.stateLoanData ?? []).slice(0, 15).map((s) => ({
    name: s.state || 'Unknown', loans: s.totalLoans, amount: s.totalAmount, avgScore: s.avgScore,
  }));

  // Amount distribution histogram
  const amountDistribution = useMemo(() => {
    if (!data?.schemeDistribution) return [];
    return data.schemeDistribution.map((s) => ({ name: s.scheme || 'Other', value: s.totalAmount }));
  }, [data?.schemeDistribution]);

  if (isLoading) {
    return (
      <div className="space-y-4 sm:space-y-6 animate-fade-in-up">
        <PageHeader title="Reports & Analytics" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-4 sm:space-y-6 animate-fade-in-up"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <PageHeader
        title="Reports & Analytics"
        actions={
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-full sm:w-[160px] h-11"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1month">Last 1 Month</SelectItem>
              <SelectItem value="3months">Last 3 Months</SelectItem>
              <SelectItem value="6months">Last 6 Months</SelectItem>
              <SelectItem value="1year">Last 1 Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <Tabs defaultValue="overview" className="space-y-3 sm:space-y-4">
        <div className="overflow-x-auto -mx-1 px-1">
          <TabsList className="inline-flex min-w-max">
            <TabsTrigger value="overview" className="h-11">Overview</TabsTrigger>
            <TabsTrigger value="disbursement" className="h-11">Disbursement</TabsTrigger>
            <TabsTrigger value="portfolio" className="h-11">Portfolio</TabsTrigger>
            <TabsTrigger value="statewise" className="h-11">State-wise</TabsTrigger>
          </TabsList>
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 stagger-children">
            <StatsCard title="Total Disbursed" value={formatCurrency(portfolio?.totalDisbursedAmount ?? 0)} icon={IndianRupee} iconColor="bg-primary/10 text-primary" />
            <StatsCard title="Active Loans" value={portfolio?.totalDisbursed ?? 0} icon={FileText} iconColor="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" />
            <StatsCard title="Average Score" value={portfolio ? (data?.stateLoanData?.reduce((s, st) => s + st.avgScore, 0) / Math.max(data.stateLoanData.length, 1)).toFixed(0) : '0'} icon={TrendingUp} iconColor="bg-amber-500/10 text-amber-600 dark:text-amber-400" />
            <StatsCard title="Default Rate" value={`${(portfolio?.defaultRate ?? 0).toFixed(2)}%`} icon={AlertTriangle} iconColor="bg-red-500/10 text-red-600 dark:text-red-400" />
          </div>

          {/* Approval Rate Trend */}
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Approval Rate Trend</CardTitle>
              <CardDescription>Monthly application outcomes</CardDescription>
            </CardHeader>
            <CardContent>
              {approvalTrend.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No trend data available.</p>
              ) : (
                <div className="h-56 sm:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={approvalTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Line type="monotone" dataKey="approved" name="Approved" stroke="#10B981" strokeWidth={2} />
                      <Line type="monotone" dataKey="rejected" name="Rejected" stroke="#EF4444" strokeWidth={2} />
                      <Line type="monotone" dataKey="pending" name="Pending" stroke="#F59E0B" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Disbursement Tab */}
        <TabsContent value="disbursement" className="space-y-3 sm:space-y-4">
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Monthly Disbursement Amounts</CardTitle>
            </CardHeader>
            <CardContent>
              {approvalTrend.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No data.</p>
              ) : (
                <div className="h-56 sm:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={approvalTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickFormatter={(v) => `${v}`} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      <Bar dataKey="approved" name="Approved" fill="#10B981" radius={[4, 4, 0, 0]} stackId="a" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Schemes */}
          <Card className="glass-card overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Top Schemes by Disbursement</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-64 overflow-x-auto overflow-y-auto scrollbar-thin">
                <Table>
                  <TableHeader>
                    <TableRow className="sticky top-0 bg-card z-10">
                      <TableHead className="font-semibold">Scheme</TableHead>
                      <TableHead className="font-semibold text-right">Applications</TableHead>
                      <TableHead className="font-semibold text-right">Total Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data?.schemeDistribution ?? []).sort((a, b) => b.totalAmount - a.totalAmount).map((s) => (
                      <TableRow key={s.scheme}>
                        <TableCell className="text-sm font-medium whitespace-nowrap">{s.scheme || 'Unknown'}</TableCell>
                        <TableCell className="font-mono text-sm text-right tabular-nums">{s.count.toLocaleString('en-IN')}</TableCell>
                        <TableCell className="font-mono text-sm text-right tabular-nums whitespace-nowrap">{formatCurrency(s.totalAmount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Portfolio Tab */}
        <TabsContent value="portfolio" className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            {/* Grade Pie */}
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Portfolio by Risk Grade</CardTitle>
              </CardHeader>
              <CardContent>
                {gradePieData.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">No grade data.</p>
                ) : (
                  <div className="h-56 sm:h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={gradePieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={3}>
                          {gradePieData.map((entry, idx) => <Cell key={idx} fill={entry.fill} />)}
                        </Pie>
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Amount Distribution */}
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Loan Amount by Scheme</CardTitle>
              </CardHeader>
              <CardContent>
                {schemeBarData.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">No data.</p>
                ) : (
                  <div className="h-56 sm:h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={schemeBarData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'var(--foreground)' }} width={80} />
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v: number) => formatCurrency(v)} />
                        <Bar dataKey="amount" name="Amount" radius={[0, 4, 4, 0]}>
                          {schemeBarData.map((entry, idx) => <Cell key={idx} fill={entry.fill} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Portfolio Quality Table */}
          <Card className="glass-card overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Portfolio Quality Metrics</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto scrollbar-thin">
                <Table>
                  <TableHeader>
                    <TableRow className="sticky top-0 bg-card z-10">
                      <TableHead className="font-semibold">Metric</TableHead>
                      <TableHead className="font-semibold text-right">Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow><TableCell className="text-sm">Total Disbursed</TableCell><TableCell className="font-mono text-sm text-right tabular-nums">{portfolio?.totalDisbursed ?? 0}</TableCell></TableRow>
                    <TableRow><TableCell className="text-sm">Total Disbursed Amount</TableCell><TableCell className="font-mono text-sm text-right tabular-nums">{formatCurrency(portfolio?.totalDisbursedAmount ?? 0)}</TableCell></TableRow>
                    <TableRow><TableCell className="text-sm">Total Recovered</TableCell><TableCell className="font-mono text-sm text-right tabular-nums">{formatCurrency(portfolio?.totalRecoveredAmount ?? 0)}</TableCell></TableRow>
                    <TableRow><TableCell className="text-sm">Recovery Rate</TableCell><TableCell className="font-mono text-sm text-right tabular-nums">{(portfolio?.recoveryRate ?? 0).toFixed(2)}%</TableCell></TableRow>
                    <TableRow><TableCell className="text-sm">Default Rate</TableCell><TableCell className="font-mono text-sm text-right tabular-nums">{(portfolio?.defaultRate ?? 0).toFixed(2)}%</TableCell></TableRow>
                    <TableRow><TableCell className="text-sm">Collection Rate</TableCell><TableCell className="font-mono text-sm text-right tabular-nums">{(portfolio?.collectionRate ?? 0).toFixed(2)}%</TableCell></TableRow>
                    <TableRow><TableCell className="text-sm">Overdue Amount</TableCell><TableCell className="font-mono text-sm text-right tabular-nums text-red-600 dark:text-red-400">{formatCurrency(portfolio?.overdueAmount ?? 0)}</TableCell></TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* State-wise Tab */}
        <TabsContent value="statewise" className="space-y-3 sm:space-y-4">
          <Card className="glass-card overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">State-wise Statistics</CardTitle>
              <CardDescription>Applications, disbursements, and average scores by state</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-96 overflow-x-auto overflow-y-auto scrollbar-thin">
                <Table>
                  <TableHeader>
                    <TableRow className="sticky top-0 bg-card z-10">
                      <TableHead className="font-semibold">State</TableHead>
                      <TableHead className="font-semibold text-right">Total Loans</TableHead>
                      <TableHead className="font-semibold text-right">Total Amount</TableHead>
                      <TableHead className="font-semibold text-right">Avg Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data?.stateLoanData ?? []).map((s) => (
                      <TableRow key={s.state}>
                        <TableCell className="text-sm font-medium whitespace-nowrap">{s.state || 'Unknown'}</TableCell>
                        <TableCell className="font-mono text-sm text-right tabular-nums">{s.totalLoans}</TableCell>
                        <TableCell className="font-mono text-sm text-right tabular-nums whitespace-nowrap">{formatCurrency(s.totalAmount)}</TableCell>
                        <TableCell className={`font-mono text-sm text-right tabular-nums font-bold whitespace-nowrap ${s.avgScore >= 60 ? 'text-emerald-600 dark:text-emerald-400' : s.avgScore < 40 ? 'text-red-600 dark:text-red-400' : ''}`}>{s.avgScore}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* State Bar Chart */}
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Top States by Loan Volume</CardTitle>
            </CardHeader>
            <CardContent>
              {stateBarData.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No state data.</p>
              ) : (
                <div className="h-56 sm:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stateBarData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }} angle={-30} textAnchor="end" height={50} />
                      <YAxis yAxisId="left" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} domain={[0, 100]} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      <Bar yAxisId="left" dataKey="loans" name="Loans" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                      <Bar yAxisId="right" dataKey="avgScore" name="Avg Score" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
