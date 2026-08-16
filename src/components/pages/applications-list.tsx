'use client';

import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  Download,
  Eye,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { GradeBadge } from '@/components/shared/grade-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { useAppStore } from '@/store/use-app-store';
import { useAuthStore } from '@/store/use-auth-store';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface BeneficiaryPreview {
  id: string;
  name: string;
  aadhaarNumber: string;
  state: string;
  category: string;
  phone: string;
}

interface ScorePreview {
  id: string;
  totalScore: number;
  riskGrade: string;
}

interface DecisionPreview {
  id: string;
  decisionType: string;
}

interface Application {
  id: string;
  applicationNumber: string;
  loanAmount: number;
  loanPurpose: string;
  loanTenure: number;
  status: string;
  schemeType: string | null;
  createdAt: string;
  beneficiary: BeneficiaryPreview;
  scores: ScorePreview[];
  decisions: DecisionPreview[];
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function maskAadhaar(aadhaar?: string) {
  if (!aadhaar || aadhaar.length < 4) return '••••••••';
  return `${aadhaar.slice(0, 4)}••••${aadhaar.slice(-4)}`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function formatCurrency(amount: number) {
  return `\u20B9${amount.toLocaleString('en-IN')}`;
}

/* ------------------------------------------------------------------ */
/*  API Fetcher                                                       */
/* ------------------------------------------------------------------ */

async function fetchApplications(
  token: string,
  params: { page: number; pageSize: number; search: string; status: string; grade: string; scheme: string; fromDate: string; toDate: string }
) {
  const sp = new URLSearchParams();
  sp.set('page', String(params.page));
  sp.set('limit', String(params.pageSize));
  if (params.search) sp.set('search', params.search);
  if (params.status) sp.set('status', params.status);
  if (params.grade) sp.set('grade', params.grade);

  const res = await fetch(`/api/applications?${sp.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch applications');
  return res.json() as Promise<{ applications: Application[]; pagination: PaginationInfo }>;
}

/* ------------------------------------------------------------------ */
/*  Skeleton Row                                                       */
/* ------------------------------------------------------------------ */

function TableSkeleton() {
  return (
    <div className="space-y-3 p-4 sm:p-6">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-10" />
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-11 w-11" />
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ApplicationsListPage() {
  const token = useAuthStore((s) => s.token)!;
  const navigate = useAppStore((s) => s.navigate);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('submitted');
  const [grade, setGrade] = useState('');
  const [scheme, setScheme] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Debounce search
  const updateSearch = useCallback((val: string) => {
    setSearch(val);
    const t = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, []);

  const queryParams = useMemo(
    () => ({ page, pageSize, search: debouncedSearch, status, grade, scheme, fromDate, toDate }),
    [page, pageSize, debouncedSearch, status, grade, scheme, fromDate, toDate]
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: ['applications', queryParams],
    queryFn: () => fetchApplications(token, queryParams),
    placeholderData: (prev) => prev,
  });

  const applications = data?.applications ?? [];
  const pagination = data?.pagination;

  // CSV Export
  function handleExport() {
    if (applications.length === 0) {
      toast.error('No data to export');
      return;
    }
    const headers = ['Application #', 'Beneficiary', 'Amount', 'Purpose', 'Status', 'Grade', 'Score', 'Created'];
    const rows = applications.map((a) => [
      a.applicationNumber,
      a.beneficiary?.name || '',
      a.loanAmount,
      a.loanPurpose,
      a.status,
      a.scores[0]?.riskGrade || '',
      a.scores[0]?.totalScore || '',
      a.createdAt,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `applications_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported successfully');
  }

  return (
    <motion.div
      className="space-y-4 sm:space-y-6 animate-fade-in-up"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <PageHeader
        title="Loan Applications"
        actions={
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button variant="outline" size="sm" className="flex-1 sm:flex-none h-11" onClick={handleExport}>
              <Download className="size-4 mr-1.5" />
              Export CSV
            </Button>
            <Button size="sm" className="flex-1 sm:flex-none h-11" onClick={() => navigate('application-new')}>
              <Plus className="size-4 mr-1.5" />
              New Application
            </Button>
          </div>
        }
      />

      {/* Search & Filters */}
      <Card className="glass-card">
        <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
          {/* Search row */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by application #, beneficiary name, or Aadhaar..."
              value={search}
              onChange={(e) => updateSearch(e.target.value)}
              className="pl-9 h-11"
            />
          </div>

          {/* Filter row */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-end gap-3 sm:gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
              <Filter className="size-4" />
              <span className="font-medium">Filters:</span>
            </div>
            <div className="sm:flex-1 min-w-0 sm:min-w-[140px]">
              <Select value={status} onValueChange={(v) => { setStatus(v === '_all' ? '' : v); setPage(1); }}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="scoring">Scoring</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="sanctioned">Sanctioned</SelectItem>
                  <SelectItem value="disbursed">Disbursed</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="defaulted">Defaulted</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:flex-1 min-w-0 sm:min-w-[140px]">
              <Select value={grade} onValueChange={(v) => { setGrade(v === '_all' ? '' : v); setPage(1); }}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Risk Grade" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All Grades</SelectItem>
                  <SelectItem value="A+">A+</SelectItem>
                  <SelectItem value="A">A</SelectItem>
                  <SelectItem value="B+">B+</SelectItem>
                  <SelectItem value="B">B</SelectItem>
                  <SelectItem value="C+">C+</SelectItem>
                  <SelectItem value="C">C</SelectItem>
                  <SelectItem value="D">D</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:flex-1 min-w-0 sm:min-w-[140px]">
              <Select value={scheme} onValueChange={(v) => { setScheme(v === '_all' ? '' : v); setPage(1); }}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Scheme" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All Schemes</SelectItem>
                  <SelectItem value="NBCFDC">NBCFDC</SelectItem>
                  <SelectItem value="NMDFC">NMDFC</SelectItem>
                  <SelectItem value="NSKFDC">NSKFDC</SelectItem>
                  <SelectItem value="State Channel">State Channel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:flex-1 min-w-0 sm:min-w-[130px]">
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
                placeholder="From"
                className="h-11"
              />
            </div>
            <div className="sm:flex-1 min-w-0 sm:min-w-[130px]">
              <Input
                type="date"
                value={toDate}
                onChange={(e) => { setToDate(e.target.value); setPage(1); }}
                placeholder="To"
                className="h-11"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card className="glass-card">
        {isLoading ? (
          <TableSkeleton />
        ) : isError || !data ? (
          <EmptyState
            title="Failed to load applications"
            description="There was an error fetching the applications. Please try again."
          />
        ) : applications.length === 0 ? (
          <EmptyState
            title="No applications found"
            description="No loan applications match your current filters."
            action={{ label: 'Clear Filters', onClick: () => { setSearch(''); setDebouncedSearch(''); setStatus(''); setGrade(''); setScheme(''); setFromDate(''); setToDate(''); setPage(1); } }}
          />
        ) : (
          <div className="max-h-96 overflow-x-auto overflow-y-auto scrollbar-thin">
            <Table>
              <TableHeader>
                <TableRow className="sticky top-0 bg-card z-10">
                  <TableHead className="font-semibold">Application #</TableHead>
                  <TableHead className="font-semibold">Beneficiary</TableHead>
                  <TableHead className="font-semibold text-right">Amount</TableHead>
                  <TableHead className="font-semibold">Purpose</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Grade</TableHead>
                  <TableHead className="font-semibold text-right">Score</TableHead>
                  <TableHead className="font-semibold">Created</TableHead>
                  <TableHead className="font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {applications.map((app, idx) => (
                    <motion.tr
                      key={app.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 30 }}
                      className="border-b border-border/50 hover:bg-muted/40 transition-colors cursor-pointer"
                      onClick={() => navigate('application-detail', { id: app.id })}
                    >
                      <TableCell className="font-mono text-sm font-medium whitespace-nowrap">{app.applicationNumber}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{app.beneficiary?.name || '—'}</span>
                          <span className="text-xs text-muted-foreground font-mono">{maskAadhaar(app.beneficiary?.aadhaarNumber)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm text-right whitespace-nowrap">{formatCurrency(app.loanAmount)}</TableCell>
                      <TableCell className="text-sm capitalize whitespace-nowrap">{app.loanPurpose?.replace(/_/g, ' ')}</TableCell>
                      <TableCell><StatusBadge status={app.status} /></TableCell>
                      <TableCell>{app.scores[0]?.riskGrade ? <GradeBadge grade={app.scores[0].riskGrade} size="sm" /> : <span className="text-muted-foreground text-sm">—</span>}</TableCell>
                      <TableCell className="font-mono text-sm text-right">{app.scores[0]?.totalScore ?? '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatDate(app.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-11 w-11"
                          onClick={(e) => { e.stopPropagation(); navigate('application-detail', { id: app.id }); }}
                        >
                          <Eye className="size-4" />
                        </Button>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t p-3 sm:px-4 sm:py-3">
            <p className="text-xs sm:text-sm text-muted-foreground">
              Showing <span className="font-mono font-medium">{(pagination.page - 1) * pagination.limit + 1}</span>–<span className="font-mono font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="font-mono font-medium">{pagination.total.toLocaleString('en-IN')}</span>
            </p>
            <div className="flex items-center justify-center gap-1">
              <Button variant="outline" size="icon" className="h-11 w-11" disabled={pagination.page <= 1} onClick={() => setPage(1)}>
                <ChevronsLeft className="size-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-11 w-11" disabled={pagination.page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="size-4" />
              </Button>
              <span className="px-3 text-sm font-mono">{pagination.page} / {pagination.pages}</span>
              <Button variant="outline" size="icon" className="h-11 w-11" disabled={pagination.page >= pagination.pages} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight className="size-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-11 w-11" disabled={pagination.page >= pagination.pages} onClick={() => setPage(pagination.pages)}>
                <ChevronsRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </motion.div>
  );
}
