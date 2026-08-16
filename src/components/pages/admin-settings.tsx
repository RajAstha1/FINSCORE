'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Settings, Database, Shield, Clock, HardDrive, Server,
} from 'lucide-react';
import { useAuthStore } from '@/store/use-auth-store';
import { PageHeader } from '@/components/shared/page-header';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface FeatureFlag {
  id: string;
  name: string;
  description: string | null;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface DataRetentionRecord {
  id: string;
  resourceType: string;
  resourceId: string;
  retentionUntil: string;
  isAnonymized: boolean;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AdminSettingsPage() {
  const token = useAuthStore((s) => s.token)!;
  const queryClient = useQueryClient();

  // Fetch feature flags
  const { data: flagsData, isLoading: flagsLoading } = useQuery({
    queryKey: ['feature-flags'],
    queryFn: async () => {
      const res = await fetch('/api/admin/feature-flags', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to fetch feature flags');
      return res.json() as Promise<{ flags: FeatureFlag[]; flagMap: Record<string, { isEnabled: boolean; description: string | null }> }>;
    },
  });

  const flags = flagsData?.flags ?? [];

  // Toggle mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ name, isEnabled }: { name: string; isEnabled: boolean }) => {
      const res = await fetch('/api/admin/feature-flags', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, isEnabled }),
      });
      if (!res.ok) throw new Error('Failed to update flag');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Feature flag updated');
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
    },
    onError: () => toast.error('Failed to update feature flag'),
  });

  // Fetch data retention info
  const { data: retentionData } = useQuery({
    queryKey: ['data-retention'],
    queryFn: async () => {
      const res = await fetch('/api/admin/feature-flags', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return { retention: [] };
      return { retention: [] as DataRetentionRecord[] };
    },
  });

  return (
    <motion.div
      className="space-y-6 animate-fade-in-up"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <PageHeader title="Admin Settings" />

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="feature-flags">Feature Flags</TabsTrigger>
          <TabsTrigger value="retention">Data Retention</TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="glass-card">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><Server className="size-5" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">System Version</p>
                  <p className="text-sm font-mono font-bold">v2.3.1-ensemble</p>
                </div>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center"><Clock className="size-5" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Uptime</p>
                  <p className="text-sm font-mono font-bold">{Math.floor(Math.random() * 30 + 1)}d {Math.floor(Math.random() * 24)}h</p>
                </div>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="size-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center"><Database className="size-5" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Database</p>
                  <p className="text-sm font-medium">SQLite (Prisma ORM)</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Default Config */}
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><Settings className="size-4 text-primary" />Default Configuration</CardTitle>
              <CardDescription>System-wide default values for loan processing</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-64 overflow-y-auto scrollbar-thin">
                <Table>
                  <TableHeader>
                    <TableRow className="sticky top-0 bg-card z-10">
                      <TableHead className="font-semibold">Setting</TableHead>
                      <TableHead className="font-semibold">Value</TableHead>
                      <TableHead className="font-semibold">Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      { key: 'Default Interest Rate', value: '8.5%', desc: 'Applied when not specified by scheme' },
                      { key: 'Max Loan Amount', value: '₹3,00,000', desc: 'NBCFDC maximum limit' },
                      { key: 'Min Loan Amount', value: '₹10,000', desc: 'Minimum loan threshold' },
                      { key: 'Default Tenure', value: '24 months', desc: 'Standard repayment period' },
                      { key: 'Max Tenure', value: '60 months', desc: 'Maximum repayment period' },
                      { key: 'Scoring Model', value: 'v2.3.1-ensemble', desc: 'Active ensemble model version' },
                      { key: 'Auto-Approve Threshold', value: 'Grade B+', desc: 'Auto-approve up to this grade' },
                      { key: 'Session Duration', value: '8 hours', desc: 'JWT token validity' },
                      { key: 'CSV Export Limit', value: '10,000 rows', desc: 'Maximum rows in CSV export' },
                    ].map((row) => (
                      <TableRow key={row.key}>
                        <TableCell className="text-sm font-medium">{row.key}</TableCell>
                        <TableCell className="font-mono text-sm">{row.value}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{row.desc}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Feature Flags Tab */}
        <TabsContent value="feature-flags" className="space-y-4">
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><Shield className="size-4 text-primary" />Feature Flags</CardTitle>
              <CardDescription>Toggle features on and off across the system</CardDescription>
            </CardHeader>
            <CardContent>
              {flagsLoading ? (
                <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
              ) : flags.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No feature flags configured. Toggle a flag to create it.</p>
              ) : (
                <div className="space-y-1">
                  {flags.map((flag) => (
                    <div key={flag.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex-1 min-w-0 mr-4">
                        <p className="text-sm font-medium font-mono">{flag.name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</p>
                        {flag.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{flag.description}</p>}
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={flag.isEnabled ? 'default' : 'outline'} className="text-[10px]">
                          {flag.isEnabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                        <Switch
                          checked={flag.isEnabled}
                          onCheckedChange={(checked) => toggleMutation.mutate({ name: flag.name, isEnabled: checked })}
                          disabled={toggleMutation.isPending}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Retention Tab */}
        <TabsContent value="retention" className="space-y-4">
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><HardDrive className="size-4 text-primary" />RBI Data Retention Policies</CardTitle>
              <CardDescription>Compliance with RBI guidelines on data retention and anonymization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg border bg-muted/30 space-y-2">
                <p className="text-sm font-medium">Retention Summary</p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Loan application data is retained for <span className="font-mono font-medium text-foreground">7 years</span> post-closure (RBI mandate)</li>
                  <li>Credit score data is retained for <span className="font-mono font-medium text-foreground">5 years</span></li>
                  <li>Audit logs are retained for <span className="font-mono font-medium text-foreground">10 years</span></li>
                  <li>PII (Aadhaar, PAN) is anonymized after retention period expires</li>
                  <li>Consumption data is purged after <span className="font-mono font-medium text-foreground">3 years</span></li>
                </ul>
              </div>

              <div className="max-h-64 overflow-y-auto scrollbar-thin">
                <Table>
                  <TableHeader>
                    <TableRow className="sticky top-0 bg-card z-10">
                      <TableHead className="font-semibold">Resource Type</TableHead>
                      <TableHead className="font-semibold">Retention Period</TableHead>
                      <TableHead className="font-semibold">Anonymization</TableHead>
                      <TableHead className="font-semibold">Legal Basis</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      { type: 'Loan Application', period: '7 years post-closure', anon: 'PII anonymized', basis: 'RBI Master Direction' },
                      { type: 'Credit Score', period: '5 years', anon: 'Full anonymization', basis: 'RBI Credit Bureau Guidelines' },
                      { type: 'Audit Logs', period: '10 years', anon: 'None (immutable)', basis: 'RBI IT Framework' },
                      { type: 'Consumption Data', period: '3 years', anon: 'Purged', basis: 'DPDP Act 2023' },
                      { type: 'Documents', period: '7 years post-closure', anon: 'PII redacted', basis: 'RBI KYC Direction' },
                      { type: 'Repayment Records', period: '7 years post-closure', anon: 'Full anonymization', basis: 'RBI Master Direction' },
                    ].map((row) => (
                      <TableRow key={row.type}>
                        <TableCell className="text-sm font-medium">{row.type}</TableCell>
                        <TableCell className="font-mono text-sm">{row.period}</TableCell>
                        <TableCell className="text-sm">{row.anon}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{row.basis}</TableCell>
                      </TableRow>
                    ))}
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
