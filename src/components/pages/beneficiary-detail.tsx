'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  ArrowLeft, User, Phone, MapPin, Briefcase, CreditCard, Landmark,
  FileText, Zap, Activity, Calendar, IndianRupee, Mail, GraduationCap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/use-app-store';
import { useAuthStore } from '@/store/use-auth-store';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { GradeBadge } from '@/components/shared/grade-badge';
import { ScoreRing } from '@/components/shared/score-ring';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ScoreEntry {
  id: string;
  totalScore: number;
  riskGrade: string;
  modelVersion: string;
}

interface DecisionEntry {
  id: string;
  decisionType: string;
  createdAt: string;
}

interface RepaymentEntry {
  id: string;
  emiNumber: number;
  dueAmount: number;
  paidAmount: number | null;
  status: string;
}

interface ApplicationEntry {
  id: string;
  applicationNumber: string;
  loanAmount: number;
  loanPurpose: string;
  loanTenure: number;
  status: string;
  schemeType: string;
  createdAt: string;
  scores: ScoreEntry[];
  decisions: DecisionEntry[];
  repayments: RepaymentEntry[];
}

interface ConsumptionEntry {
  id: string;
  type: string;
  provider: string;
  monthlySpend: number | null;
  consistency: number | null;
  dataQuality: number | null;
  paymentHistory: Array<{ month: string; amount: number; paid: boolean }>;
  fetchedAt: string;
}

interface DocumentEntry {
  id: string;
  type: string;
  fileName: string;
  ocrConfidence: number | null;
  status: string;
  createdAt: string;
}

interface Beneficiary {
  id: string;
  name: string;
  aadhaarNumber: string;
  panNumber: string;
  dateOfBirth: string;
  gender: string;
  category: string;
  state: string;
  district: string;
  pincode: string;
  address: string;
  phone: string;
  email: string;
  occupation: string;
  monthlyIncome: number;
  annualIncome: number;
  educationLevel: string;
  maritalStatus: string;
  bankAccount: string;
  bankName: string;
  bankIfsc: string;
  creditScore: number | null;
  riskGrade: string | null;
  partner: { id: string; name: string; code: string; type: string } | null;
  applications: ApplicationEntry[];
  consumptions: ConsumptionEntry[];
  documents: DocumentEntry[];
  createdAt: string;
}

interface Summary {
  totalApplications: number;
  latestScore: number | null;
  latestGrade: string | null;
  latestApplicationStatus: string | null;
  avgScore: number | null;
  totalDisbursedAmount: number;
  totalPaidAmount: number;
  overduePayments: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function maskAadhaar(aadhaar?: string) {
  if (!aadhaar || aadhaar.length < 4) return '••••••••••••';
  return `${aadhaar.slice(0, 4)}••••••••${aadhaar.slice(-4)}`;
}

function formatDate(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatCurrency(amount: number) {
  return `\u20B9${amount.toLocaleString('en-IN')}`;
}

function InfoRow({ label, value, icon: Icon }: { label: string; value: string | number | null | undefined; icon?: React.ElementType }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-muted-foreground flex items-center gap-1.5">{Icon && <Icon className="size-3.5" />}{label}</span>
      <span className="text-sm font-medium text-right capitalize font-mono">{value ?? '—'}</span>
    </div>
  );
}

const CONSUMPTION_ICONS: Record<string, React.ElementType> = {
  electricity: Zap, mobile: Phone, dth: Activity, gas: Briefcase, water: MapPin,
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function BeneficiaryDetailPage() {
  const token = useAuthStore((s) => s.token)!;
  const id = useAppStore((s) => s.pageParams.id);
  const goBack = useAppStore((s) => s.goBack);
  const navigate = useAppStore((s) => s.navigate);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['beneficiary', id],
    queryFn: async () => {
      const res = await fetch(`/api/beneficiaries/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to fetch beneficiary');
      return res.json() as Promise<{ beneficiary: Beneficiary; summary: Summary }>;
    },
    enabled: !!id,
  });

  const ben = data?.beneficiary;
  const summary = data?.summary;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3"><Skeleton className="size-9" /><Skeleton className="h-8 w-48" /></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (isError || !ben) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={goBack}><ArrowLeft className="size-4 mr-1" />Back</Button>
        <Card className="p-8 text-center"><p className="text-muted-foreground">Beneficiary not found.</p></Card>
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
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="size-9" onClick={goBack}><ArrowLeft className="size-4" /></Button>
        <PageHeader title={ben.name || 'Beneficiary'} description={ben.aadhaarNumber ? `Aadhaar: ${maskAadhaar(ben.aadhaarNumber)}` : undefined} />
      </div>

      {/* Profile Header */}
      <Card className="glass-card">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <ScoreRing
              score={summary?.latestScore ?? ben.creditScore ?? 0}
              size={120}
              riskGrade={summary?.latestGrade ?? ben.riskGrade ?? undefined}
            />
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl font-bold">{ben.name}</h2>
                {summary?.latestGrade && <GradeBadge grade={summary.latestGrade} size="lg" />}
                {summary?.latestApplicationStatus && <StatusBadge status={summary.latestApplicationStatus} />}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1 text-sm">
                <div><span className="text-muted-foreground">Applications:</span> <span className="font-mono font-medium ml-1">{summary?.totalApplications ?? 0}</span></div>
                <div><span className="text-muted-foreground">Avg Score:</span> <span className="font-mono font-medium ml-1">{summary?.avgScore ?? '—'}</span></div>
                <div><span className="text-muted-foreground">Disbursed:</span> <span className="font-mono font-medium ml-1">{formatCurrency(summary?.totalDisbursedAmount ?? 0)}</span></div>
                <div><span className="text-muted-foreground">Overdue:</span> <span className="font-mono font-medium ml-1 text-red-600 dark:text-red-400">{summary?.overduePayments ?? 0}</span></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><User className="size-4 text-primary" />Personal</CardTitle></CardHeader>
          <CardContent className="space-y-0.5">
            <InfoRow label="Gender" value={ben.gender} />
            <InfoRow label="DOB" value={formatDate(ben.dateOfBirth)} icon={Calendar} />
            <InfoRow label="Category" value={ben.category} />
            <InfoRow label="Education" value={ben.educationLevel} icon={GraduationCap} />
            <InfoRow label="Marital" value={ben.maritalStatus} />
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Phone className="size-4 text-primary" />Contact</CardTitle></CardHeader>
          <CardContent className="space-y-0.5">
            <InfoRow label="Phone" value={ben.phone} icon={Phone} />
            <InfoRow label="Email" value={ben.email} icon={Mail} />
            <InfoRow label="State" value={ben.state} icon={MapPin} />
            <InfoRow label="District" value={ben.district} />
            <InfoRow label="PIN" value={ben.pincode} />
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><IndianRupee className="size-4 text-primary" />Financial</CardTitle></CardHeader>
          <CardContent className="space-y-0.5">
            <InfoRow label="Occupation" value={ben.occupation} icon={Briefcase} />
            <InfoRow label="Monthly Income" value={ben.monthlyIncome ? formatCurrency(ben.monthlyIncome) : null} />
            <InfoRow label="Annual Income" value={ben.annualIncome ? formatCurrency(ben.annualIncome) : null} />
            <InfoRow label="PAN" value={ben.panNumber} icon={CreditCard} />
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Landmark className="size-4 text-primary" />Bank</CardTitle></CardHeader>
          <CardContent className="space-y-0.5">
            <InfoRow label="Bank" value={ben.bankName} />
            <InfoRow label="Account" value={ben.bankAccount ? maskAadhaar(ben.bankAccount) : null} />
            <InfoRow label="IFSC" value={ben.bankIfsc} />
            {ben.partner && <InfoRow label="Partner" value={ben.partner.name} />}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="applications" className="space-y-4">
        <TabsList>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="consumption">Consumption Data</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Applications Tab */}
        <TabsContent value="applications">
          <Card className="glass-card overflow-hidden">
            {ben.applications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">No applications found for this beneficiary.</div>
            ) : (
              <div className="max-h-96 overflow-y-auto scrollbar-thin">
                <Table>
                  <TableHeader>
                    <TableRow className="sticky top-0 bg-card z-10">
                      <TableHead className="font-semibold">Application #</TableHead>
                      <TableHead className="font-semibold">Amount</TableHead>
                      <TableHead className="font-semibold">Purpose</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Grade</TableHead>
                      <TableHead className="font-semibold text-right">Score</TableHead>
                      <TableHead className="font-semibold">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ben.applications.map((app) => (
                      <TableRow key={app.id} className="cursor-pointer hover:bg-muted/40" onClick={() => navigate('application-detail', { id: app.id })}>
                        <TableCell className="font-mono text-sm font-medium">{app.applicationNumber}</TableCell>
                        <TableCell className="font-mono text-sm">{formatCurrency(app.loanAmount)}</TableCell>
                        <TableCell className="text-sm capitalize">{app.loanPurpose?.replace(/_/g, ' ')}</TableCell>
                        <TableCell><StatusBadge status={app.status} /></TableCell>
                        <TableCell>{app.scores[0]?.riskGrade ? <GradeBadge grade={app.scores[0].riskGrade} size="sm" /> : '—'}</TableCell>
                        <TableCell className="font-mono text-sm text-right tabular-nums">{app.scores[0]?.totalScore ?? '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(app.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Consumption Tab */}
        <TabsContent value="consumption">
          {ben.consumptions.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground text-sm">No consumption data available.</Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {ben.consumptions.map((c) => {
                const Icon = CONSUMPTION_ICONS[c.type] || Activity;
                const chartData = (c.paymentHistory || []).map((p, idx) => ({ name: `M${idx + 1}`, amount: p.amount, paid: p.paid ? 1 : 0 }));
                return (
                  <Card key={c.id} className="glass-card">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary"><Icon className="size-4" /></div>
                          <div>
                            <p className="text-sm font-semibold capitalize">{c.type}</p>
                            <p className="text-xs text-muted-foreground">{c.provider || 'Unknown provider'}</p>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div><span className="text-muted-foreground">Monthly Spend</span><p className="font-mono font-medium">{c.monthlySpend ? formatCurrency(c.monthlySpend) : '—'}</p></div>
                        <div><span className="text-muted-foreground">Consistency</span><p className="font-mono font-medium">{c.consistency != null ? `${(c.consistency * 100).toFixed(0)}%` : '—'}</p></div>
                        <div className="col-span-2"><span className="text-muted-foreground">Data Quality</span><p className="font-mono font-medium">{c.dataQuality != null ? `${(c.dataQuality * 100).toFixed(0)}%` : '—'}</p></div>
                      </div>
                      {chartData.length > 0 && (
                        <div className="h-24">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                              <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} width={30} />
                              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                              <Line type="monotone" dataKey="amount" stroke="var(--chart-1)" strokeWidth={1.5} dot={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <Card className="glass-card overflow-hidden">
            {ben.documents.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">No documents found.</div>
            ) : (
              <div className="max-h-96 overflow-y-auto scrollbar-thin">
                <Table>
                  <TableHeader>
                    <TableRow className="sticky top-0 bg-card z-10">
                      <TableHead className="font-semibold">Type</TableHead>
                      <TableHead className="font-semibold">File Name</TableHead>
                      <TableHead className="font-semibold text-right">OCR Confidence</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ben.documents.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="text-sm capitalize">{doc.type?.replace(/_/g, ' ')}</TableCell>
                        <TableCell className="text-sm font-medium">{doc.fileName || '—'}</TableCell>
                        <TableCell className="font-mono text-sm text-right">{doc.ocrConfidence != null ? `${(doc.ocrConfidence * 100).toFixed(0)}%` : '—'}</TableCell>
                        <TableCell><StatusBadge status={doc.status} /></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(doc.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card className="glass-card">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Activity timeline shows audit events for this beneficiary. Audit logs are tracked at the system level.</p>
              <div className="mt-4 space-y-3">
                {ben.applications.length > 0 ? ben.applications.slice(0, 10).map((app) => (
                  <div key={app.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                    <div className="size-2 rounded-full bg-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">Application <span className="font-mono font-medium">{app.applicationNumber}</span> created</p>
                      <p className="text-xs text-muted-foreground">{formatDate(app.createdAt)}</p>
                    </div>
                    <StatusBadge status={app.status} />
                  </div>
                )) : <p className="text-sm text-muted-foreground">No history available.</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
