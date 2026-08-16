'use client';

import { useState, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
} from 'recharts';
import {
  Users, CheckCircle, Clock, IndianRupee, Upload, FileSpreadsheet,
  AlertCircle, Loader2, X,
} from 'lucide-react';
import { useAuthStore } from '@/store/use-auth-store';
import { useAppStore } from '@/store/use-app-store';
import { PageHeader } from '@/components/shared/page-header';
import { StatsCard } from '@/components/shared/stats-card';
import { StatusBadge } from '@/components/shared/status-badge';
import { EmptyState } from '@/components/shared/empty-state';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Referral {
  id: string;
  name: string;
  state: string;
  category: string;
  createdAt: string;
  _count: { applications: number };
  applications: Array<{
    id: string;
    applicationNumber: string;
    status: string;
    loanAmount: number;
    createdAt: string;
  }>;
}

interface FinancialSummary {
  totalApplications: number;
  totalAmount: number;
  approvedApplications: number;
  approvedAmount: number;
  conversionRate: number;
}

interface PartnerData {
  partner: {
    id: string;
    name: string;
    code: string;
    type: string;
    state: string;
    contactName: string;
    contactEmail: string;
    isActive: boolean;
    totalReferrals: number;
  };
  referrals: Referral[];
  totalReferrals: number;
  page: number;
  pageSize: number;
  totalPages: number;
  statusDistribution: Record<string, number>;
  financial: FinancialSummary;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatCurrency(amount: number) {
  return `\u20B9${amount.toLocaleString('en-IN')}`;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const STATUS_COLORS: Record<string, string> = {
  approved: '#10B981', rejected: '#EF4444', submitted: '#F59E0B', disbursed: '#0F766E',
  sanctioned: '#14B8A6', under_review: '#818CF8', scoring: '#F97316', closed: '#94A3B8',
  pending: '#F59E0B',
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function PartnerPortalPage() {
  const token = useAuthStore((s) => s.token)!;
  const user = useAuthStore((s) => s.user);
  const navigate = useAppStore((s) => s.navigate);
  const queryClient = useQueryClient();

  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch partner data
  const { data, isLoading, isError } = useQuery({
    queryKey: ['partner-portal'],
    queryFn: async () => {
      const res = await fetch('/api/partner', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to fetch partner data');
      return res.json() as Promise<PartnerData>;
    },
  });

  const partner = data?.partner;
  const referrals = data?.referrals ?? [];
  const statusDist = data?.statusDistribution ?? {};
  const financial = data?.financial;
  const totalReferrals = data?.totalReferrals ?? 0;

  // Status distribution pie data
  const pieData = Object.entries(statusDist).map(([status, count]) => ({
    name: status.replace(/_/g, ' '), value: count, fill: STATUS_COLORS[status] ?? '#94A3B8',
  }));

  // Bulk upload handler
  const handleFileUpload = useCallback(async (file: File) => {
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'csv' && ext !== 'xlsx' && ext !== 'xls') {
      toast.error('Please upload a CSV or Excel file');
      return;
    }

    setUploading(true);
    try {
      const text = await file.text();
      // Parse CSV (simple parsing for demo)
      const lines = text.split('\n').filter((l) => l.trim());
      if (lines.length < 2) throw new Error('File is empty');

      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
      const beneficiaries = lines.slice(1).map((line) => {
        const values = line.split(',').map((v) => v.trim());
        const row: Record<string, string> = {};
        headers.forEach((h, i) => { row[h] = values[i] || ''; });
        return row;
      });

      const res = await fetch('/api/partner', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ beneficiaries }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Upload failed');
      }

      const result = await res.json();
      toast.success(`Uploaded: ${result.created} created, ${result.skipped} skipped, ${result.errors.length} errors`);
      queryClient.invalidateQueries({ queryKey: ['partner-portal'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [token, queryClient]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [handleFileUpload]);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in-up">
        <PageHeader title="Partner Portal" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6 animate-fade-in-up"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <PageHeader
        title="Partner Portal"
        description={partner ? `${partner.name} (${partner.code})` : undefined}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        <StatsCard
          title="Total Referrals"
          value={totalReferrals}
          icon={Users}
          iconColor="bg-primary/10 text-primary"
        />
        <StatsCard
          title="Pending"
          value={(statusDist.submitted ?? 0) + (statusDist.under_review ?? 0) + (statusDist.scoring ?? 0)}
          icon={Clock}
          iconColor="bg-amber-500/10 text-amber-600 dark:text-amber-400"
        />
        <StatsCard
          title="Approved"
          value={financial?.approvedApplications ?? 0}
          icon={CheckCircle}
          iconColor="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        />
        <StatsCard
          title="Disbursed Amount"
          value={formatCurrency(financial?.approvedAmount ?? 0)}
          icon={IndianRupee}
          iconColor="bg-teal-500/10 text-teal-600 dark:text-teal-400"
        />
      </div>

      {/* Conversion Rate + Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Application Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No data yet.</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40} paddingAngle={3}>
                      {pieData.map((entry, idx) => <Cell key={idx} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-3 mt-2">
                  {pieData.map((d) => (
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
            <CardTitle className="text-base">Financial Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                <p className="text-xs text-muted-foreground">Total Applications</p>
                <p className="font-mono text-lg font-bold tabular-nums">{financial?.totalApplications ?? 0}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                <p className="text-xs text-muted-foreground">Total Loan Amount</p>
                <p className="font-mono text-lg font-bold tabular-nums">{formatCurrency(financial?.totalAmount ?? 0)}</p>
              </div>
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 space-y-1">
                <p className="text-xs text-muted-foreground">Approved Applications</p>
                <p className="font-mono text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{financial?.approvedApplications ?? 0}</p>
              </div>
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 space-y-1">
                <p className="text-xs text-muted-foreground">Approved Amount</p>
                <p className="font-mono text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{formatCurrency(financial?.approvedAmount ?? 0)}</p>
              </div>
            </div>
            <div className="p-3 rounded-lg border space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Conversion Rate</span>
                <span className="font-mono font-bold tabular-nums">{(financial?.conversionRate ?? 0).toFixed(2)}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${Math.min((financial?.conversionRate ?? 0), 100)}%` }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Referrals */}
      <Card className="glass-card overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Recent Referrals</CardTitle>
          <CardDescription>{totalReferrals} total referrals</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {referrals.length === 0 ? (
            <EmptyState title="No referrals yet" description="Start by adding beneficiaries via the bulk upload below." />
          ) : (
            <div className="max-h-64 overflow-y-auto scrollbar-thin">
              <Table>
                <TableHeader>
                  <TableRow className="sticky top-0 bg-card z-10">
                    <TableHead className="font-semibold">Name</TableHead>
                    <TableHead className="font-semibold">State</TableHead>
                    <TableHead className="font-semibold">Category</TableHead>
                    <TableHead className="font-semibold">Applications</TableHead>
                    <TableHead className="font-semibold">Latest Status</TableHead>
                    <TableHead className="font-semibold">Referred On</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {referrals.map((ref, idx) => (
                      <motion.tr
                        key={ref.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 30 }}
                        className="border-b border-border/50 hover:bg-muted/40 transition-colors"
                      >
                        <TableCell className="text-sm font-medium">{ref.name}</TableCell>
                        <TableCell className="text-sm">{ref.state || '—'}</TableCell>
                        <TableCell className="text-sm">{ref.category || '—'}</TableCell>
                        <TableCell className="font-mono text-sm tabular-nums">{ref._count.applications}</TableCell>
                        <TableCell>
                          {ref.applications[0] ? <StatusBadge status={ref.applications[0].status} /> : <span className="text-muted-foreground text-xs">No application</span>}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(ref.createdAt)}</TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Upload */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="size-4 text-primary" /> Bulk Upload Beneficiaries
          </CardTitle>
          <CardDescription>Upload a CSV file with beneficiary data to create referrals in bulk</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
              dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={onFileChange} />
            {uploading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="size-10 text-primary animate-spin" />
                <p className="text-sm font-medium">Uploading and processing...</p>
              </div>
            ) : (
              <>
                <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <FileSpreadsheet className="size-7 text-primary" />
                </div>
                <p className="text-sm font-medium">Drag and drop your CSV file here, or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1">Supports CSV format. Expected columns: name, aadhaar_number, phone, state, category, etc.</p>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
