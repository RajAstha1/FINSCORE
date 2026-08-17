'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { toast } from 'sonner';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  XCircle,
  Brain,
  Shield,
  Zap,
  Activity,
  FileText,
  User,
  IndianRupee,
  AlertTriangle,
} from 'lucide-react';
import { useAppStore } from '@/store/use-app-store';
import { useAuthStore } from '@/store/use-auth-store';

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
  totalScore: number;
  confidenceScore: number;
  riskGrade: string;
  xgboostScore: number;
  catboostScore: number;
  deepForestScore: number;
  repaymentScore: number;
  consumptionScore: number;
  shapValues: ShapValue[];
}

interface Decision {
  decisionType: string;
  decisionReason: string;
  createdAt: string;
}

interface Application {
  id: string;
  applicationNumber: string;
  beneficiary: {
    name: string;
    aadhaarNumber: string;
    state: string;
    category: string;
    phone: string;
  };
  loanAmount: number;
  loanPurpose: string;
  loanTenure: number;
  status: string;
  schemeType: string;
  scores: ScoreEntry[];
  decisions: Decision[];
}

/* ------------------------------------------------------------------ */
/*  Mock Data                                                          */
/* ------------------------------------------------------------------ */

const MOCK_APPLICATION: Application = {
  id: 'mock-001',
  applicationNumber: 'AFS-000847',
  beneficiary: {
    name: 'Rajesh Kumar',
    aadhaarNumber: 'XXXX-XXXX-4521',
    state: 'Maharashtra',
    category: 'OBC',
    phone: '98XXX-XXXXX',
  },
  loanAmount: 75000,
  loanPurpose: 'Education',
  loanTenure: 24,
  status: 'under_review',
  schemeType: 'NBCFDC',
  scores: [
    {
      totalScore: 72,
      confidenceScore: 78,
      riskGrade: 'A',
      xgboostScore: 74.2,
      catboostScore: 71.5,
      deepForestScore: 69.8,
      repaymentScore: 76,
      consumptionScore: 68,
      shapValues: [
        { feature: 'Repayment History', value: 92, shapValue: 8.4, direction: 'positive' },
        { feature: 'Income Stability', value: 85, shapValue: 7.1, direction: 'positive' },
        { feature: 'Credit Bureau Score', value: 78, shapValue: 6.3, direction: 'positive' },
        { feature: 'Loan Amount', value: 75000, shapValue: 5.8, direction: 'positive' },
        { feature: 'Employment Duration', value: 48, shapValue: 4.2, direction: 'positive' },
        { feature: 'Education Level', value: 12, shapValue: 3.5, direction: 'positive' },
        { feature: 'Age at Application', value: 32, shapValue: 2.1, direction: 'positive' },
        { feature: 'State Risk Index', value: 55, shapValue: -1.8, direction: 'negative' },
        { feature: 'Utility Payment Score', value: 72, shapValue: 1.4, direction: 'positive' },
        { feature: 'Mobile Recharge Consistency', value: 88, shapValue: 1.2, direction: 'positive' },
        { feature: 'Dependents Count', value: 4, shapValue: -2.5, direction: 'negative' },
        { feature: 'Existing Liabilities', value: 15000, shapValue: -3.8, direction: 'negative' },
        { feature: 'Tenure Requested', value: 24, shapValue: -1.2, direction: 'negative' },
        { feature: 'Electricity Consistency', value: 80, shapValue: 0.9, direction: 'positive' },
      ],
    },
  ],
  decisions: [
    {
      decisionType: 'manual_review',
      decisionReason:
        'Application flagged for manual review due to moderate risk grade. Income verification and additional collateral documentation requested before final approval. Cross-reference with credit bureau pending.',
      createdAt: '2025-01-15T10:30:00Z',
    },
  ],
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function getStatusConfig(status: string) {
  switch (status) {
    case 'approved':
      return { label: 'Approved', bg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' };
    case 'under_review':
      return { label: 'Under Review', bg: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' };
    case 'rejected':
      return { label: 'Rejected', bg: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' };
    case 'pending':
      return { label: 'Pending', bg: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400' };
    default:
      return { label: status, bg: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400' };
  }
}

function getRiskGradeConfig(grade: string) {
  switch (grade) {
    case 'A+':
      return { color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/40', border: 'border-emerald-300 dark:border-emerald-700' };
    case 'A':
      return { color: 'text-teal-600', bg: 'bg-teal-100 dark:bg-teal-900/40', border: 'border-teal-300 dark:border-teal-700' };
    case 'B+':
      return { color: 'text-cyan-600', bg: 'bg-cyan-100 dark:bg-cyan-900/40', border: 'border-cyan-300 dark:border-cyan-700' };
    case 'B':
      return { color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/40', border: 'border-amber-300 dark:border-amber-700' };
    case 'C+':
      return { color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/40', border: 'border-orange-300 dark:border-orange-700' };
    case 'C':
      return { color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/40', border: 'border-red-300 dark:border-red-700' };
    case 'D':
      return { color: 'text-red-800', bg: 'bg-red-200 dark:bg-red-900/60', border: 'border-red-400 dark:border-red-600' };
    default:
      return { color: 'text-gray-600', bg: 'bg-gray-100', border: 'border-gray-300' };
  }
}

function getDecisionIcon(type: string) {
  switch (type) {
    case 'auto_approve':
      return <CheckCircle className="h-5 w-5 text-emerald-500" />;
    case 'manual_review':
      return <Clock className="h-5 w-5 text-amber-500" />;
    case 'reject':
      return <XCircle className="h-5 w-5 text-red-500" />;
    default:
      return <AlertTriangle className="h-5 w-5 text-gray-500" />;
  }
}

function getModelBarColor(score: number) {
  if (score > 70) return 'bg-teal-500';
  if (score >= 50) return 'bg-amber-500';
  return 'bg-red-500';
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

/** Animated SVG circular gauge */
function ScoreGauge({ score, size = 160, strokeWidth = 12, color = '#14b8a6' }: { score: number; size?: number; strokeWidth?: number; color?: string }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const motionVal = useMotionValue(0);
  const strokeDashoffset = useTransform(motionVal, (v) => circumference - (v / 100) * circumference);

  useEffect(() => {
    const controls = animate(motionVal, score, { duration: 1.5, ease: 'easeOut' });
    return () => controls.stop();
  }, [score, motionVal]);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          style={{ strokeDashoffset }}
        />
      </svg>
      <span className="absolute font-mono text-4xl font-bold text-foreground">
        <motion.span>{useTransform(motionVal, (v) => Math.round(v))}</motion.span>
      </span>
    </div>
  );
}

/** Mini circular gauge for sub-scores */
function MiniGauge({ score, label, size = 72, strokeWidth = 6 }: { score: number; label: string; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(100, Math.max(0, score));
  const offset = circumference - (pct / 100) * circumference;
  const color = score > 70 ? '#14b8a6' : score >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative inline-flex items-center justify-center">
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-muted/30" />
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
        </svg>
        <span className="absolute font-mono text-sm font-bold text-foreground">{score}</span>
      </div>
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
    </div>
  );
}

/** SHAP waterfall / contribution chart */
function ShapChart({ shapValues }: { shapValues: ShapValue[] }) {
  const sorted = [...shapValues].sort((a, b) => Math.abs(b.shapValue) - Math.abs(a.shapValue));
  const maxAbs = Math.max(...sorted.map((s) => Math.abs(s.shapValue)), 1);

  return (
    <div className="space-y-2">
      {/* Base value indicator */}
      <div className="flex items-center gap-2 mb-3">
        <div className="h-px flex-1 bg-border" />\n        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Base Value</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {sorted.map((sv, i) => {
        const widthPct = (Math.abs(sv.shapValue) / maxAbs) * 100;
        const isPositive = sv.direction === 'positive';

        return (
          <motion.div
            key={sv.feature}
            initial={{ opacity: 0, x: isPositive ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
            className="group"
          >
            <div className="flex items-center gap-2 text-xs">
              {/* Feature label */}
              <span className="w-36 shrink-0 truncate text-right text-muted-foreground group-hover:text-foreground transition-colors">
                {sv.feature}
              </span>

              {/* Bar area */}
              <div className="relative flex-1 h-6 flex items-center">
                {/* Base line */}
                <div className="absolute left-1/2 -translate-x-px top-0 h-full w-px bg-border" />

                {/* Bar */}
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${widthPct * 0.45}%` }}
                  transition={{ delay: i * 0.05 + 0.15, duration: 0.5, ease: 'easeOut' }}
                  className={`h-3.5 rounded-sm ${
                    isPositive
                      ? 'ml-[50%] bg-gradient-to-r from-teal-500/80 to-teal-400/60'
                      : 'mr-[50%] bg-gradient-to-l from-red-500/80 to-red-400/60'
                  }`}
                  style={isPositive ? {} : { marginLeft: 'auto' }}
                />
              </div>

              {/* Value */}
              <span
                className={`w-12 text-right font-mono font-medium shrink-0 ${
                  isPositive ? 'text-teal-600 dark:text-teal-400' : 'text-red-600 dark:text-red-400'
                }`}
              >
                {isPositive ? '+' : ''}
                {sv.shapValue.toFixed(1)}
              </span>
            </div>
          </motion.div>
        );
      })}

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 pt-3">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-4 rounded-sm bg-gradient-to-r from-teal-500/80 to-teal-400/60" />\n          <span className="text-[10px] text-muted-foreground">Positive contribution</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-4 rounded-sm bg-gradient-to-l from-red-500/80 to-red-400/60" />
          <span className="text-[10px] text-muted-foreground">Negative contribution</span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function ApplicationDetail() {
  const pageParams = useAppStore((s) => s.pageParams);
  const goBack = useAppStore((s) => s.goBack);
  const token = useAuthStore((s) => s.token);
  const id = pageParams.id ?? '';

  const [localStatus, setLocalStatus] = useState<string | null>(null);

  /* ---- Data fetching ---- */
  const { data: application, isLoading } = useQuery<Application>({
    queryKey: ['application', id],
    queryFn: async () => {
      const res = await fetch(`/api/applications?search=${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch application');
      const json = await res.json();
      const list = Array.isArray(json) ? json : json.data ?? json.applications ?? [json];
      return list[0] as Application;
    },
    placeholderData: () => MOCK_APPLICATION,
    enabled: !!id,
  });

  /* ---- Derived data ---- */
  const app = application ?? MOCK_APPLICATION;
  const score = app.scores?.[0];
  const status = localStatus ?? app.status;
  const statusCfg = getStatusConfig(status);
  const gradeCfg = score ? getRiskGradeConfig(score.riskGrade) : getRiskGradeConfig('');
  const latestDecision = app.decisions?.[0];

  const emiAmount = score
    ? Math.round((app.loanAmount * (1 + 0.12 * (app.loanTenure / 12))) / app.loanTenure)
    : null;

  /* ---- Handlers ---- */
  const handleDecision = (decision: 'approved' | 'rejected' | 'info_requested') => {
    setLocalStatus(decision);
    toast.success('Decision recorded', {
      description: `Application ${app.applicationNumber} has been ${decision.replace('_', ' ')}.`,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-teal-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in-0 duration-500">
      {/* ============ HEADER ============ */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={goBack} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-mono text-xl font-bold tracking-tight">{app.applicationNumber}</h1>
              <Badge className={statusCfg.bg}>{statusCfg.label}</Badge>
              <Badge variant="outline" className="gap-1">
                <Shield className="h-3 w-3" />
                {app.schemeType}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">Loan Application Detail</p>
          </div>
        </div>
      </div>

      <Separator />

      {/* ============ TWO COLUMN LAYOUT ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ======== LEFT COLUMN (2/3) ======== */}
        <div className="lg:col-span-2 space-y-6">
          {/* --- Applicant Info Card --- */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4 text-teal-500" />
                Applicant Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Full Name</p>
                  <p className="text-sm font-medium">{app.beneficiary.aadhaarName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Aadhaar Number</p>
                  <p className="text-sm font-mono">{app.beneficiary.aadhaarNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">State</p>
                  <p className="text-sm font-medium">{app.beneficiary.state}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Category</p>
                  <p className="text-sm font-medium">{app.beneficiary.category}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Phone</p>
                  <p className="text-sm font-mono">{app.beneficiary.phone}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* --- Loan Details Card --- */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <IndianRupee className="h-4 w-4 text-teal-500" />
                Loan Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Loan Amount</p>
                  <p className="text-sm font-semibold text-lg">{formatCurrency(app.loanAmount)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Purpose</p>
                  <p className="text-sm font-medium">{app.loanPurpose}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Tenure</p>
                  <p className="text-sm font-medium">{app.loanTenure} months</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Estimated EMI</p>
                  <p className="text-sm font-semibold">{emiAmount ? formatCurrency(emiAmount) : '—'} /mo</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Interest Rate</p>
                  <p className="text-sm font-medium">12.0% p.a.</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Scheme</p>
                  <p className="text-sm font-medium">{app.schemeType}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* --- Score Section --- */}
          {score && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Brain className="h-4 w-4 text-teal-500" />
                  Credit Score Analysis
                </CardTitle>
                <CardDescription>Ensemble model scoring with SHAP explainability</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row items-center gap-8">
                  {/* Main score gauge */}
                  <div className="flex flex-col items-center gap-3">
                    <ScoreGauge score={score.totalScore} />
                    <p className="text-sm text-muted-foreground">Total Score</p>
                  </div>

                  {/* Risk grade + confidence */}
                  <div className="flex-1 space-y-5 w-full max-w-sm">
                    {/* Risk Grade */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">Risk Grade</p>
                      <div
                        className={`inline-flex items-center justify-center w-16 h-16 rounded-xl border-2 text-2xl font-bold ${gradeCfg.bg} ${gradeCfg.color} ${gradeCfg.border}`}
                      >
                        {score.riskGrade}
                      </div>
                    </div>

                    {/* Confidence score */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-xs text-muted-foreground">Model Confidence</p>
                        <span className="text-sm font-mono font-semibold">{score.confidenceScore}%</span>
                      </div>
                      <Progress value={score.confidenceScore} className="h-2" />
                    </div>

                    {/* Sub-scores as mini gauges */}
                    <div className="pt-2">
                      <p className="text-xs text-muted-foreground mb-3">Sub-Scores</p>
                      <div className="flex items-center justify-around">
                        <MiniGauge score={score.repaymentScore} label="Repayment" />
                        <MiniGauge score={score.consumptionScore} label="Consumption" />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ======== RIGHT COLUMN (1/3) ======== */}
        <div className="space-y-6">
          {/* --- Model Scores Card --- */}
          {score && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Zap className="h-4 w-4 text-teal-500" />
                  Model Scores
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* XGBoost */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-muted-foreground">XGBoost</span>
                    <span className="text-xs font-mono font-semibold">{score.xgboostScore}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${score.xgboostScore}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className={`h-full rounded-full ${getModelBarColor(score.xgboostScore)}`}
                    />
                  </div>
                </div>

                {/* CatBoost */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-muted-foreground">CatBoost</span>
                    <span className="text-xs font-mono font-semibold">{score.catboostScore}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${score.catboostScore}%` }}
                      transition={{ duration: 0.8, delay: 0.15, ease: 'easeOut' }}
                      className={`h-full rounded-full ${getModelBarColor(score.catboostScore)}`}
                    />
                  </div>
                </div>

                {/* DeepForest */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-muted-foreground">Deep Forest</span>
                    <span className="text-xs font-mono font-semibold">{score.deepForestScore}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${score.deepForestScore}%` }}
                      transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
                      className={`h-full rounded-full ${getModelBarColor(score.deepForestScore)}`}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* --- SHAP Waterfall Chart --- */}
          {score && score.shapValues && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="h-4 w-4 text-teal-500" />
                  SHAP Explainability
                </CardTitle>
                <CardDescription>Feature contribution to score</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-[480px] overflow-y-auto scrollbar-thin pr-1">
                  <ShapChart shapValues={score.shapValues} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* --- Decision Panel --- */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-5 text-teal-500" />
                Decision
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Current decision */}
              {latestDecision && (
                <div className="flex items-start gap-3">
                  {getDecisionIcon(latestDecision.decisionType)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium capitalize">
                      {latestDecision.decisionType.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {latestDecision.decisionReason}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-2">
                      {new Date(latestDecision.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              )}

              {/* Action buttons (only for under_review) */}
              {status === 'under_review' && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Record Decision</p>
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => handleDecision('approved')}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                        onClick={() => handleDecision('info_requested')}
                      >
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Request More Info
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="w-full"
                        onClick={() => handleDecision('rejected')}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default ApplicationDetail;
