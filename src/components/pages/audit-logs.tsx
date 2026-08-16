'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Card, CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search, Filter, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  ChevronDown, ChevronUp, RefreshCw,
} from 'lucide-react';
import { useAuthStore } from '@/store/use-auth-store';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { ROLE_LABELS } from '@/lib/auth';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AuditLogEntry {
  id: string;
  userId: string;
  action: string;
  resource: string;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string; role: string; avatar: string | null } | null;
}

interface AuditData {
  data: AuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  filters: {
    actionTypes: Array<{ action: string; count: number }>;
  };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AuditLogsPage() {
  const token = useAuthStore((s) => s.token)!;

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Debounce search
  useMemo(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const queryParams = useMemo(
    () => ({ page, pageSize, search: debouncedSearch, action: actionFilter, resource: resourceFilter, startDate: fromDate, endDate: toDate }),
    [page, pageSize, debouncedSearch, actionFilter, resourceFilter, fromDate, toDate]
  );

  const { data, isLoading, isError, dataUpdatedAt } = useQuery({
    queryKey: ['audit', queryParams],
    queryFn: async () => {
      const sp = new URLSearchParams();
      sp.set('page', String(page));
      sp.set('pageSize', String(pageSize));
      if (debouncedSearch) sp.set('search', debouncedSearch);
      if (actionFilter) sp.set('action', actionFilter);
      if (resourceFilter) sp.set('resource', resourceFilter);
      if (fromDate) sp.set('startDate', fromDate);
      if (toDate) sp.set('endDate', toDate);
      const res = await fetch(`/api/audit?${sp.toString()}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to fetch audit logs');
      return res.json() as Promise<AuditData>;
    },
    placeholderData: (prev) => prev,
    refetchInterval: 30000, // Auto-refresh every 30s
  });

  const logs = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;
  const actionTypes = data?.filters?.actionTypes ?? [];

  function formatTimestamp(ts: string) {
    return new Date(ts).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    });
  }

  function clearFilters() {
    setSearch(''); setDebouncedSearch(''); setActionFilter(''); setResourceFilter(''); setFromDate(''); setToDate(''); setPage(1);
  }

  return (
    <motion.div
      className="space-y-4 sm:space-y-6 animate-fade-in-up"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <PageHeader
        title="Audit Trail"
        actions={
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
            <RefreshCw className="size-3.5" /> Auto-refreshes every 30s
          </span>
        }
      />

      {/* Filters */}
      <Card className="glass-card">
        <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input placeholder="Search by action, resource, or user..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-11" />
          </div>
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-end gap-3 sm:gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
              <Filter className="size-4" /><span className="font-medium">Filters:</span>
            </div>
            <div className="sm:flex-1 min-w-0 sm:min-w-[200px]">
              <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v === '_all' ? '' : v); setPage(1); }}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Action" /></SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value="_all">All Actions</SelectItem>
                  {actionTypes.map((a) => <SelectItem key={a.action} value={a.action}>{a.action.replace(/_/g, ' ')} ({a.count})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:flex-1 min-w-0 sm:min-w-[160px]">
              <Select value={resourceFilter} onValueChange={(v) => { setResourceFilter(v === '_all' ? '' : v); setPage(1); }}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Resource" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All Resources</SelectItem>
                  <SelectItem value="loan_application">Loan Application</SelectItem>
                  <SelectItem value="beneficiary">Beneficiary</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="feature_flag">Feature Flag</SelectItem>
                  <SelectItem value="partner">Partner</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:flex-1 min-w-0 sm:min-w-[130px]">
              <Input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1); }} placeholder="From" className="h-11" />
            </div>
            <div className="sm:flex-1 min-w-0 sm:min-w-[130px]">
              <Input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1); }} placeholder="To" className="h-11" />
            </div>
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground h-11 w-full sm:w-auto">Clear all</Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="glass-card overflow-hidden">
        {isLoading ? (
          <div className="space-y-3 p-4 sm:p-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-40" /><Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <EmptyState title="Failed to load audit logs" description="There was an error fetching the data." />
        ) : logs.length === 0 ? (
          <EmptyState title="No audit logs found" description="No logs match your current filters."
            action={{ label: 'Clear Filters', onClick: clearFilters }} />
        ) : (
          <>
            <div className="max-h-96 overflow-x-auto overflow-y-auto scrollbar-thin">
              <Table>
                <TableHeader>
                  <TableRow className="sticky top-0 bg-card z-10">
                    <TableHead className="font-semibold">Timestamp</TableHead>
                    <TableHead className="font-semibold">User</TableHead>
                    <TableHead className="font-semibold">Action</TableHead>
                    <TableHead className="font-semibold">Resource</TableHead>
                    <TableHead className="font-semibold">Details</TableHead>
                    <TableHead className="font-semibold">IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {logs.map((log, idx) => {
                      const isExpanded = expandedRow === log.id;
                      return (
                        <>
                          <motion.tr
                            key={log.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: idx * 20 }}
                            className="border-b border-border/50 hover:bg-muted/40 transition-colors"
                          >
                            <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">{formatTimestamp(log.createdAt)}</TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="text-sm font-medium whitespace-nowrap">{log.user?.name ?? 'System'}</span>
                                <span className="text-xs text-muted-foreground">{log.user?.role ? ROLE_LABELS[log.user.role as keyof typeof ROLE_LABELS] ?? log.user.role : ''}</span>
                              </div>
                            </TableCell>
                            <TableCell><span className="text-sm font-medium capitalize whitespace-nowrap">{log.action.replace(/_/g, ' ')}</span></TableCell>
                            <TableCell className="text-sm capitalize whitespace-nowrap">{log.resource.replace(/_/g, ' ')}</TableCell>
                            <TableCell>
                              {log.details ? (
                                <Button variant="ghost" size="sm" className="h-11 px-3 text-xs" onClick={() => setExpandedRow(isExpanded ? null : log.id)}>
                                  {isExpanded ? <ChevronUp className="size-3.5 mr-1" /> : <ChevronDown className="size-3.5 mr-1" />}
                                  {isExpanded ? 'Hide' : 'Show'}
                                </Button>
                              ) : <span className="text-xs text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">{log.ipAddress ?? '—'}</TableCell>
                          </motion.tr>
                          {isExpanded && log.details && (
                            <tr key={`${log.id}-detail`}>
                              <td colSpan={6} className="bg-muted/30 px-4 sm:px-6 py-3">
                                <pre className="text-xs font-mono whitespace-pre-wrap max-w-full overflow-x-auto scrollbar-thin">
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>

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
          </>
        )}
      </Card>
    </motion.div>
  );
}
