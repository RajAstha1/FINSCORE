'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft, CheckCircle, Clock, XCircle, Brain, Shield, Zap,
  Activity, FileText, User, IndianRupee, AlertTriangle, Upload,
  Calendar, Hash, Phone, MapPin, Briefcase, CreditCard, Landmark,
} from 'lucide-react';
import { useAppStore } from '@/store/use-app-store';
import { useAuthStore } from '@/store/use-auth-store';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { GradeBadge } from '@/components/shared/grade-badge';
import { ScoreRing } from '@/components/shared/score-ring';
import { ShapWaterfallChart } from '@/components/shared/shap-waterfall-chart';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ShapValue {
  feature: string;
  value: number;
  shapValue: number;
  direction: 'positive' | 'negative';
}

interface ScoreEntry {
  id: string;
  totalScore: number;
  confidenceScore: number;
  riskGrade: string;
  modelVersion: string;
  xgboostScore: number;
  catboostScore: number;
  deepForestScore: number;
  repaymentScore: number;
  consumptionScore: number;
  shapValues: ShapValue[];
  featureWeights: Record<string, number>;
  scoredAt: string;
}

interface OverrideEntry {
  id: string;
  originalGrade: string;
  newGrade: string;
  reason: string;
  createdAt: string;
  analyst: { name: string; email: string };
}

interface DecisionEntry {
  id: string;
  decisionType: string;
  decisionReason: string;
  createdAt: string;
  analyst?: { name: string; email: string; role: string };
  overrides: OverrideEntry[];
}

interface DocumentEntry {
  id: string;
  type: string;
  fileName: string;
  ocrConfidence: number | null;
  status: string;
  ocrData: string | null;
  verifiedAt: string | null;
  createdAt: string;
}

interface RepaymentEntry {
  id: string;
  emiNumber: number;
  dueDate: string;
  dueAmount: number;
  paidAmount: number | null;
  paidDate: string | null;
  status: string;
  daysOverdue: number;
}

interface BeneficiaryData {
  id: string;
  name: string;
  aadhaarNumber: string;
  phone: string;
  email: string;
  state: string;
  district: string;
  category: string;
  occupation: string;
  gender: string;
  dateOfBirth: string;
  educationLevel: string;
  bankName: string;
  bankAccount: string;
  bankIfsc: string;
}

interface Application {
  id: string;
  applicationNumber: string;
  loanAmount: number;
  loanPurpose: string;
  loanTenure: number;
  interestRate: number;
  emiAmount: number;
  status: string;
  schemeType: string;
  submittedAt: string;
  decisionAt: string;
  sanctionedAt: string;
  disbursedAt: string;
  closedAt: string;
  rejectionReason: string | null;
  createdAt: string;
  beneficiary: BeneficiaryData;
  scores: ScoreEntry[];
  decisions: DecisionEntry[];
  documents: DocumentEntry[];
  repayments: RepaymentEntry[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function maskAadhaar(aadhaar?: string) {
  if (!aadhaar || aadhaar.length < 4) return '••••••••••••';
  return `${aadhaar.slice(0, 4)}••••••••${aadhaar.slice(-4)}`;
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function formatDateTime(dateStr?: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function formatCurrency(amount: number) {
  return `\u20B9${amount.toLocaleString('en-IN')}`;
}

function InfoRow({ label, value, icon: Icon }: { label: string; value: string | number | null | undefined; icon?: React.ElementType }) {
  return (
    <div className="flex items-center justify-between py-1.5 gap-2">
      <span className="text-sm text-muted-foreground flex items-center gap-1.5 shrink-0">
        {Icon && <Icon className="size-3.5" />}
        {label}
      </span>
      <span className="text-sm font-medium text-right capitalize font-mono truncate">{value ?? '—'}</span>
    </div>
  );
}

function formatDocType(type: string) {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ApplicationDetailPage() {
  const token = useAuthStore((s) => s.token)!;
  const user = useAuthStore((s) => s.user);
  const id = useAppStore((s) => s.pageParams.id);
  const goBack = useAppStore((s) => s.goBack);
  const navigate = useAppStore((s) => s.navigate);
  const queryClient = useQueryClient();

  const [overrideGrade, setOverrideGrade] = useState('');
  const [overrideReason, setOverrideReason] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['application', id],
    queryFn: async () => {
      const res = await fetch(`/api/applications/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch application');
      const json = await res.json();
      return json.application as Application;
    },
    enabled: !!id,
  });

  const overrideMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/applications/${id}/decide`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decisionType: 'manual_review',
          overrideGrade,
          overrideReason,
        }),
      });
      if (!res.ok) throw new Error('Override failed');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Grade override submitted successfully');
      queryClient.invalidateQueries({ queryKey: ['application', id] });
      setOverrideGrade('');
      setOverrideReason('');
    },
    onError: () => toast.error('Failed to submit override'),
  });

  const app = data;
  const score = app?.scores?.[0];
  const decision = app?.decisions?.[0];

  const repaymentPaid = app?.repayments?.filter((r) => r.status === 'paid').length ?? 0;
  const repaymentTotal = app?.repayments?.length ?? 0;
  const repaymentProgress = repaymentTotal > 0 ? (repaymentPaid / repaymentTotal) * 100 : 0;

  const isAnalyst = user?.role === 'analyst' || user?.role === 'super_admin';

  if (isLoading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="size-11" />
          <Skeleton className="h-8 w-56" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          <Skeleton className="h-48" /><Skeleton className="h-48" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (isError || !app) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" className="h-11" onClick={goBack}><ArrowLeft className="size-4 mr-1" />Back</Button>
        <Card className="p-6 sm:p-8 text-center"><p className="text-muted-foreground">Application not found.</p></Card>
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
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0" onClick={goBack}>
          <ArrowLeft className="size-4" />
        </Button>
        <PageHeader
          title={app.applicationNumber}
          description={`${formatCurrency(app.loanAmount)} — ${app.loanPurpose?.replace(/_/g, ' ')}`}
          actions={<StatusBadge status={app.status} />}
        />
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <div className="overflow-x-auto -mx-1 px-1">
        <TabsList className="inline-flex min-w-max">
          <TabsTrigger value="overview" className="h-11">Overview</TabsTrigger>
          <TabsTrigger value="credit-score" className="h-11">Credit Score</TabsTrigger>
          <TabsTrigger value="documents" className="h-11">Documents</TabsTrigger>
          <TabsTrigger value="repayments" className="h-11">Repayments</TabsTrigger>
          <TabsTrigger value="decision" className="h-11">Decision</TabsTrigger>
        </TabsList>
        </div>

        {/* ──────── OVERVIEW TAB ──────── */}
        <TabsContent value="overview" className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            {/* Beneficiary Info */}
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="size-4 text-primary" /> Beneficiary Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <InfoRow label="Name" value={app.beneficiary?.name} icon={User} />
                <InfoRow label="Aadhaar" value={maskAadhaar(app.beneficiary?.aadhaarNumber)} icon={CreditCard} />
                <InfoRow label="Phone" value={app.beneficiary?.phone} icon={Phone} />
                <InfoRow label="State" value={app.beneficiary?.state} icon={MapPin} />
                <InfoRow label="Category" value={app.beneficiary?.category} icon={Shield} />
                <InfoRow label="Occupation" value={app.beneficiary?.occupation} icon={Briefcase} />
              </CardContent>
            </Card>

            {/* Application Info */}
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="size-4 text-primary" /> Application Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <InfoRow label="Amount" value={formatCurrency(app.loanAmount)} icon={IndianRupee} />
                <InfoRow label="Tenure" value={`${app.loanTenure} months`} icon={Calendar} />
                <InfoRow label="Purpose" value={app.loanPurpose?.replace(/_/g, ' ')} icon={Briefcase} />
                <InfoRow label="Scheme" value={app.schemeType} icon={Landmark} />
                <InfoRow label="Interest Rate" value={app.interestRate ? `${app.interestRate}%` : null} icon={Activity} />
                <InfoRow label="EMI" value={app.emiAmount ? formatCurrency(app.emiAmount) : null} icon={IndianRupee} />
                <InfoRow label="Status" value={undefined} icon={Clock} />
                <div className="flex justify-end py-1"><StatusBadge status={app.status} /></div>
                <Separator className="my-1" />
                <InfoRow label="Submitted" value={formatDate(app.submittedAt)} icon={Calendar} />
                <InfoRow label="Decision" value={formatDate(app.decisionAt)} icon={Clock} />
                <InfoRow label="Disbursed" value={formatDate(app.disbursedAt)} icon={Calendar} />
              </CardContent>
            </Card>
          </div>

          {/* Decision History Timeline */}
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Decision History</CardTitle>
            </CardHeader>
            <CardContent>
              {app.decisions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No decisions yet.</p>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {app.decisions.map((d, i) => (
                    <div key={d.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`size-8 rounded-full flex items-center justify-center shrink-0 ${
                          d.decisionType === 'auto_approve' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' :
                          d.decisionType === 'reject' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                          'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                        }`}>
                          {d.decisionType === 'auto_approve' ? <CheckCircle className="size-4" /> :
                           d.decisionType === 'reject' ? <XCircle className="size-4" /> :
                           <Clock className="size-4" />}
                        </div>
                        {i < app.decisions.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                      </div>
                      <div className="flex-1 min-w-0 pb-4">
                        <p className="text-sm font-medium capitalize">{d.decisionType?.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{d.decisionReason || 'No reason provided'}</p>
                        {d.analyst && <p className="text-xs text-muted-foreground mt-1">By {d.analyst.name} • {formatDateTime(d.createdAt)}</p>}
                        {d.overrides.length > 0 && (
                          <div className="mt-2 p-2 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40">
                            {d.overrides.map((o) => (
                              <p key={o.id} className="text-xs text-amber-700 dark:text-amber-400">
                                Grade override: <span className="font-mono font-bold">{o.originalGrade}</span> → <span className="font-mono font-bold">{o.newGrade}</span> by {o.analyst.name}
                                {o.reason && ` — "${o.reason}"`}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ──────── CREDIT SCORE TAB ──────── */}
        <TabsContent value="credit-score" className="space-y-3 sm:space-y-4">
          {!score ? (
            <Card className="p-6 sm:p-8 text-center">
              <Brain className="size-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No credit score available yet.</p>
            </Card>
          ) : (
            <>
              {/* Score Ring */}
              <Card className="glass-card">
                <CardContent className="py-6 sm:py-8 flex flex-col items-center">
                  <ScoreRing score={score.totalScore} size={180} riskGrade={score.riskGrade} />
                  <p className="text-xs text-muted-foreground mt-2 text-center">Model: <span className="font-mono">{score.modelVersion}</span> • Scored: {formatDateTime(score.scoredAt)}</p>
                </CardContent>
              </Card>

              {/* Ensemble Scores */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                {[
                  { label: 'XGBoost', value: score.xgboostScore, icon: Zap, color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20' },
                  { label: 'CatBoost', value: score.catboostScore, icon: Brain, color: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20' },
                  { label: 'Deep Forest', value: score.deepForestScore, icon: Activity, color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20' },
                ].map((m) => (
                  <Card key={m.label} className="glass-card">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${m.color}`}>
                        <m.icon className="size-5" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{m.label}</p>
                        <p className="text-lg font-mono font-bold tabular-nums">{m.value?.toFixed(1) ?? '—'}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Confidence + Repayment + Consumption */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <Card className="glass-card">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-2">Confidence Score</p>
                    <div className="flex items-center gap-3">
                      <Progress value={score.confidenceScore} className="flex-1 h-2" />
                      <span className="font-mono font-bold text-sm tabular-nums shrink-0">{score.confidenceScore.toFixed(0)}%</span>
                    </div>
                  </CardContent>
                </Card>
                <Card className="glass-card">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Repayment Score</p>
                    <p className="text-lg font-mono font-bold tabular-nums mt-1">{score.repaymentScore?.toFixed(1) ?? '—'}</p>
                  </CardContent>
                </Card>
                <Card className="glass-card">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Consumption Score</p>
                    <p className="text-lg font-mono font-bold tabular-nums mt-1">{score.consumptionScore?.toFixed(1) ?? '—'}</p>
                  </CardContent>
                </Card>
              </div>

              {/* SHAP Waterfall */}
              <Card className="glass-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Feature Contributions (SHAP)</CardTitle>
                  <CardDescription>How each feature influenced the credit score</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto -mx-1 px-1">
                    <div className="min-w-[400px]">
                      <ShapWaterfallChart
                        shapValues={score.shapValues || []}
                        baseValue={50}
                        finalScore={score.totalScore}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Feature Weights Table */}
              <Card className="glass-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Feature Weights</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-64 overflow-x-auto overflow-y-auto scrollbar-thin">
                    <Table>
                      <TableHeader><TableRow><TableHead>Feature</TableHead><TableHead className="text-right">Weight</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {Object.entries(score.featureWeights || {}).sort(([, a], [, b]) => Math.abs(b as number) - Math.abs(a as number)).map(([key, val]) => (
                          <TableRow key={key}>
                            <TableCell className="text-sm capitalize">{key.replace(/_/g, ' ')}</TableCell>
                            <TableCell className="font-mono text-sm text-right tabular-nums whitespace-nowrap">{(val as number).toFixed(4)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ──────── DOCUMENTS TAB ──────── */}
        <TabsContent value="documents" className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">{app.documents.length} document(s)</p>
            <Button variant="outline" size="sm" className="h-11 shrink-0" onClick={() => toast.info('Upload feature coming soon')}>
              <Upload className="size-4 mr-1.5" /> Upload Document
            </Button>
          </div>
          {app.documents.length === 0 ? (
            <Card className="p-6 sm:p-8 text-center">
              <FileText className="size-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No documents uploaded yet.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {app.documents.map((doc) => (
                <Card key={doc.id} className="glass-card">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className="text-xs">{formatDocType(doc.type)}</Badge>
                      <StatusBadge status={doc.status} />
                    </div>
                    <p className="text-sm font-medium truncate" title={doc.fileName}>{doc.fileName || 'Unnamed'}</p>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div className="flex justify-between">
                        <span>OCR Confidence</span>
                        <span className="font-mono font-medium">{doc.ocrConfidence != null ? `${(doc.ocrConfidence * 100).toFixed(0)}%` : '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Verified</span>
                        <span>{doc.verifiedAt ? formatDateTime(doc.verifiedAt) : 'No'}</span>
                      </div>
                    </div>
                    {doc.ocrData && (
                      <details className="text-xs">
                        <summary className="text-primary cursor-pointer hover:underline min-h-[44px] flex items-center">OCR Extracted Data</summary>
                        <pre className="mt-1 p-2 rounded bg-muted text-xs max-h-24 overflow-y-auto scrollbar-thin font-mono whitespace-pre-wrap">{doc.ocrData.slice(0, 500)}</pre>
                      </details>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ──────── REPAYMENTS TAB ──────── */}
        <TabsContent value="repayments" className="space-y-3 sm:space-y-4">
          <Card className="glass-card">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3 gap-2">
                <p className="text-sm font-medium">Repayment Progress</p>
                <p className="text-sm font-mono tabular-nums shrink-0"><span className="font-bold text-primary">{repaymentPaid}</span> / {repaymentTotal} EMIs</p>
              </div>
              <Progress value={repaymentProgress} className="h-3" />
              <p className="text-xs text-muted-foreground mt-2 text-right">{repaymentProgress.toFixed(1)}% complete</p>
            </CardContent>
          </Card>

          {app.repayments.length === 0 ? (
            <Card className="p-6 sm:p-8 text-center">
              <Calendar className="size-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No repayment schedule generated yet.</p>
            </Card>
          ) : (
            <Card className="glass-card">
              <div className="max-h-96 overflow-x-auto overflow-y-auto scrollbar-thin">
                <Table>
                  <TableHeader>
                    <TableRow className="sticky top-0 bg-card z-10">
                      <TableHead className="font-semibold">EMI #</TableHead>
                      <TableHead className="font-semibold">Due Date</TableHead>
                      <TableHead className="font-semibold text-right">Due Amount</TableHead>
                      <TableHead className="font-semibold text-right">Paid</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold text-right">Days Overdue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {app.repayments.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-sm whitespace-nowrap">#{r.emiNumber}</TableCell>
                        <TableCell className="text-sm whitespace-nowrap">{formatDate(r.dueDate)}</TableCell>
                        <TableCell className="font-mono text-sm text-right whitespace-nowrap">{formatCurrency(r.dueAmount)}</TableCell>
                        <TableCell className={`font-mono text-sm text-right whitespace-nowrap ${r.paidAmount ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                          {r.paidAmount ? formatCurrency(r.paidAmount) : '—'}
                        </TableCell>
                        <TableCell><StatusBadge status={r.status} /></TableCell>
                        <TableCell className={`font-mono text-sm text-right whitespace-nowrap ${r.daysOverdue > 0 ? 'text-red-600 dark:text-red-400 font-bold' : ''}`}>{r.daysOverdue}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* ──────── DECISION TAB ──────── */}
        <TabsContent value="decision" className="space-y-3 sm:space-y-4">
          {/* Current Decision */}
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Current Decision</CardTitle>
            </CardHeader>
            <CardContent>
              {decision ? (
                <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                  <div className={`size-12 rounded-xl flex items-center justify-center shrink-0 ${
                    decision.decisionType === 'auto_approve' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' :
                    decision.decisionType === 'reject' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                    'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                  }`}>
                    {decision.decisionType === 'auto_approve' ? <CheckCircle className="size-6" /> :
                     decision.decisionType === 'reject' ? <XCircle className="size-6" /> :
                     <AlertTriangle className="size-6" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg font-semibold capitalize">{decision.decisionType?.replace(/_/g, ' ')}</p>
                    <p className="text-sm text-muted-foreground">{decision.decisionReason || 'No reason provided'}</p>
                    {decision.analyst && <p className="text-xs text-muted-foreground mt-1">By {decision.analyst.name} • {formatDateTime(decision.createdAt)}</p>}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No decision has been made yet.</p>
              )}
            </CardContent>
          </Card>

          {/* Analyst Override Form */}
          {isAnalyst && (
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="size-4 text-amber-500" /> Analyst Override
                </CardTitle>
                <CardDescription>Override the risk grade for this application (requires justification)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label>New Grade</Label>
                    <Select value={overrideGrade} onValueChange={setOverrideGrade}>
                      <SelectTrigger className="h-11"><SelectValue placeholder="Select new grade" /></SelectTrigger>
                      <SelectContent>
                        {['A+', 'A', 'B+', 'B', 'C+', 'C', 'D'].map((g) => (
                          <SelectItem key={g} value={g}><span className="font-mono font-bold">{g}</span></SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Current Grade</Label>
                    <div className="h-11 flex items-center px-3 rounded-md border bg-muted/50">
                      {score ? <GradeBadge grade={score.riskGrade} size="md" /> : <span className="text-sm text-muted-foreground">Not scored</span>}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Reason for Override</Label>
                  <Textarea
                    placeholder="Provide a detailed justification for this grade override..."
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    rows={3}
                  />
                </div>
                <Button
                  onClick={() => overrideMutation.mutate()}
                  disabled={!overrideGrade || !overrideReason || overrideMutation.isPending}
                  className="w-full sm:w-auto h-11"
                >
                  {overrideMutation.isPending ? 'Submitting...' : 'Submit Override'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Decision History List */}
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">All Decisions</CardTitle>
            </CardHeader>
            <CardContent>
              {app.decisions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No decisions recorded.</p>
              ) : (
                <div className="max-h-64 overflow-y-auto scrollbar-thin space-y-3">
                  {app.decisions.map((d) => (
                    <div key={d.id} className="p-3 rounded-lg border border-border/50 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium capitalize">{d.decisionType?.replace(/_/g, ' ')}</span>
                        <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">{formatDateTime(d.createdAt)}</span>
                      </div>
                      {d.decisionReason && <p className="text-xs text-muted-foreground">{d.decisionReason}</p>}
                      {d.analyst && <p className="text-xs text-muted-foreground">Analyst: {d.analyst.name}</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
