'use client';

import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Search,
  Eye,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/shared/page-header';
import { GradeBadge } from '@/components/shared/grade-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { useAppStore } from '@/store/use-app-store';
import { useAuthStore } from '@/store/use-auth-store';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ApplicationPreview {
  id: string;
  applicationNumber: string;
  status: string;
  loanAmount: number;
  createdAt: string;
}

interface Beneficiary {
  id: string;
  name: string;
  aadhaarNumber: string;
  phone: string;
  state: string;
  category: string;
  occupation: string;
  creditScore: number | null;
  riskGrade: string | null;
  monthlyIncome: number | null;
  _count: { applications: number; documents: number; consumptions: number };
  applications: ApplicationPreview[];
  partner: { id: string; name: string; code: string } | null;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function maskAadhaar(aadhaar?: string) {
  if (!aadhaar || aadhaar.length < 4) return '••••••••';
  return `${aadhaar.slice(0, 4)}••••${aadhaar.slice(-4)}`;
}

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu & Kashmir',
  'Ladakh', 'Puducherry', 'Chandigarh', 'Andaman & Nicobar', 'Lakshadweep',
];

const CATEGORIES = ['SC', 'ST', 'OBC', 'General', 'EWS'];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function BeneficiariesListPage() {
  const token = useAuthStore((s) => s.token)!;
  const navigate = useAppStore((s) => s.navigate);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const updateSearch = useCallback((val: string) => {
    setSearch(val);
    const t = setTimeout(() => { setDebouncedSearch(val); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, []);

  const queryParams = useMemo(
    () => ({ page, pageSize, search: debouncedSearch, state: stateFilter, category: categoryFilter }),
    [page, pageSize, debouncedSearch, stateFilter, categoryFilter]
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: ['beneficiaries', queryParams],
    queryFn: async () => {
      const sp = new URLSearchParams();
      sp.set('page', String(page));
      sp.set('pageSize', String(pageSize));
      if (debouncedSearch) sp.set('search', debouncedSearch);
      if (stateFilter) sp.set('state', stateFilter);
      if (categoryFilter) sp.set('category', categoryFilter);
      const res = await fetch(`/api/beneficiaries?${sp.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch beneficiaries');
      return res.json() as Promise<{ data: Beneficiary[]; total: number; page: number; pageSize: number; totalPages: number }>;
    },
    placeholderData: (prev) => prev,
  });

  const beneficiaries = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  function clearFilters() {
    setSearch(''); setDebouncedSearch(''); setStateFilter(''); setCategoryFilter(''); setPage(1);
  }

  return (
    <motion.div
      className="space-y-4 sm:space-y-6 animate-fade-in-up"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <PageHeader title={`Beneficiaries${total > 0 ? ` (${total.toLocaleString('en-IN')})` : ''}`} />

      {/* Search & Filters */}
      <Card className="glass-card">
        <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, Aadhaar, PAN, phone, or email..."
              value={search}
              onChange={(e) => updateSearch(e.target.value)}
              className="pl-9 h-11"
            />
          </div>
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-end gap-3 sm:gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
              <Filter className="size-4" />
              <span className="font-medium">Filters:</span>
            </div>
            <div className="sm:flex-1 min-w-0 sm:min-w-[180px]">
              <Select value={stateFilter} onValueChange={(v) => { setStateFilter(v === '_all' ? '' : v); setPage(1); }}>
                <SelectTrigger className="h-11"><SelectValue placeholder="State" /></SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value="_all">All States</SelectItem>
                  {INDIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:flex-1 min-w-0 sm:min-w-[140px]">
              <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v === '_all' ? '' : v); setPage(1); }}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All Categories</SelectItem>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground h-11 w-full sm:w-auto">Clear all</Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card className="glass-card">
        {isLoading ? (
          <div className="space-y-3 p-4 sm:p-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-32" /><Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" /><Skeleton className="h-4 w-16" /><Skeleton className="h-5 w-10" />
                <Skeleton className="h-4 w-24" /><Skeleton className="h-11 w-11" />
              </div>
            ))}
          </div>
        ) : isError || !data ? (
          <EmptyState title="Failed to load beneficiaries" description="There was an error fetching the data." />
        ) : beneficiaries.length === 0 ? (
          <EmptyState title="No beneficiaries found" description="No beneficiaries match your current filters."
            action={{ label: 'Clear Filters', onClick: clearFilters }} />
        ) : (
          <div className="max-h-96 overflow-x-auto overflow-y-auto scrollbar-thin">
            <Table>
              <TableHeader>
                <TableRow className="sticky top-0 bg-card z-10">
                  <TableHead className="font-semibold">Name</TableHead>
                  <TableHead className="font-semibold">Aadhaar</TableHead>
                  <TableHead className="font-semibold">Phone</TableHead>
                  <TableHead className="font-semibold">State</TableHead>
                  <TableHead className="font-semibold">Category</TableHead>
                  <TableHead className="font-semibold text-right">Credit Score</TableHead>
                  <TableHead className="font-semibold">Grade</TableHead>
                  <TableHead className="font-semibold">Occupation</TableHead>
                  <TableHead className="font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {beneficiaries.map((b, idx) => (
                    <motion.tr
                      key={b.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 30 }}
                      className="border-b border-border/50 hover:bg-muted/40 transition-colors cursor-pointer"
                      onClick={() => navigate('beneficiary-detail', { id: b.id })}
                    >
                      <TableCell className="text-sm font-medium whitespace-nowrap">{b.name || '—'}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">{maskAadhaar(b.aadhaarNumber)}</TableCell>
                      <TableCell className="font-mono text-sm whitespace-nowrap">{b.phone || '—'}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{b.state || '—'}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{b.category || '—'}</TableCell>
                      <TableCell className={`font-mono text-sm text-right font-bold tabular-nums whitespace-nowrap ${b.creditScore != null && b.creditScore >= 60 ? 'text-emerald-600 dark:text-emerald-400' : b.creditScore != null && b.creditScore < 40 ? 'text-red-600 dark:text-red-400' : ''}`}>
                        {b.creditScore ?? '—'}
                      </TableCell>
                      <TableCell>{b.riskGrade ? <GradeBadge grade={b.riskGrade} size="sm" /> : <span className="text-muted-foreground text-sm">—</span>}</TableCell>
                      <TableCell className="text-sm capitalize whitespace-nowrap">{b.occupation || '—'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-11 w-11"
                          onClick={(e) => { e.stopPropagation(); navigate('beneficiary-detail', { id: b.id }); }}>
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
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t p-3 sm:px-4 sm:py-3">
            <p className="text-xs sm:text-sm text-muted-foreground">
              Showing <span className="font-mono font-medium">{(page - 1) * pageSize + 1}</span>–<span className="font-mono font-medium">{Math.min(page * pageSize, total)}</span> of <span className="font-mono font-medium">{total.toLocaleString('en-IN')}</span>
            </p>
            <div className="flex items-center justify-center gap-1">
              <Button variant="outline" size="icon" className="h-11 w-11" disabled={page <= 1} onClick={() => setPage(1)}><ChevronsLeft className="size-4" /></Button>
              <Button variant="outline" size="icon" className="h-11 w-11" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="size-4" /></Button>
              <span className="px-3 text-sm font-mono">{page} / {totalPages}</span>
              <Button variant="outline" size="icon" className="h-11 w-11" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}><ChevronRight className="size-4" /></Button>
              <Button variant="outline" size="icon" className="h-11 w-11" disabled={page >= totalPages} onClick={() => setPage(totalPages)}><ChevronsRight className="size-4" /></Button>
            </div>
          </div>
        )}
      </Card>
    </motion.div>
  );
}
