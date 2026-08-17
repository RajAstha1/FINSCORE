'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@/lib/zod-resolver';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Shield,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Users,
  FileCheck,
  BarChart3,
  Loader2,
  Zap,
  CheckCircle2,
  UserPlus,
  LogIn,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useAuthStore } from '@/store/use-auth-store';
import { useAppStore } from '@/store/use-app-store';
import type { UserRole } from '@/lib/auth';

// ── Types ────────────────────────────────────────────────────────────────────

type View = 'portal-select' | 'auth';
type AuthMode = 'signin' | 'signup';

interface PortalConfig {
  id: 'beneficiary' | 'analyst' | 'super_admin';
  title: string;
  subtitle: string;
  description: string;
  icon: React.ElementType;
  gradient: string;
  features: string[];
}

// ── Portal Configs ──────────────────────────────────────────────────────────

const PORTALS: PortalConfig[] = [
  {
    id: 'beneficiary',
    title: 'Applicant Portal',
    subtitle: 'Apply for Loans',
    description: 'For individuals seeking financial assistance through NBCFDC schemes',
    icon: Users,
    gradient: 'linear-gradient(135deg, #0F766E 0%, #14B8A6 100%)',
    features: ['Submit loan applications', 'Track application status', 'View credit scores'],
  },
  {
    id: 'analyst',
    title: 'Officer Portal',
    subtitle: 'Review & Approve',
    description: 'For credit officers who review, score, and approve loan applications',
    icon: FileCheck,
    gradient: 'linear-gradient(135deg, #B45309 0%, #F59E0B 100%)',
    features: ['Review applications', 'Approve or reject loans', 'Manage beneficiaries'],
  },
  {
    id: 'super_admin',
    title: 'Super Admin Portal',
    subtitle: 'Monitor & Control',
    description: 'Full platform oversight with analytics, user management, and audit controls',
    icon: BarChart3,
    gradient: 'linear-gradient(135deg, #1E293B 0%, #475569 100%)',
    features: ['Monitor all operations', 'Manage users & roles', 'View analytics & reports'],
  },
];

// ── Zod Schemas ──────────────────────────────────────────────────────────────

const signinSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required').min(6, 'Password must be at least 6 characters'),
});

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type SigninData = z.infer<typeof signinSchema>;
type SignupData = z.infer<typeof signupSchema>;

// ── Animation Variants ──────────────────────────────────────────────────────

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
};

// ── Component ───────────────────────────────────────────────────────────────

export default function LoginPage() {
  const [view, setView] = useState<View>('portal-select');
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [selectedPortal, setSelectedPortal] = useState<PortalConfig | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const authLogin = useAuthStore((s) => s.login);
  const navigate = useAppStore((s) => s.navigate);

  // ── Portal selection handler ──────────────────────────────────────
  const handleSelectPortal = (portal: PortalConfig) => {
    setSelectedPortal(portal);
    setView('auth');
    setAuthMode('signin');
  };

  // ── Back to portal selection ──────────────────────────────────────
  const handleBack = () => {
    setView('portal-select');
    setSelectedPortal(null);
  };

  // ── Sign In Handler ───────────────────────────────────────────────
  const signinForm = useForm<SigninData>({ resolver: zodResolver(signinSchema), defaultValues: { email: '', password: '' } });

  const onSignin = async (data: SigninData) => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error || 'Login failed. Please try again.');
        return;
      }
      // Verify the role matches the selected portal (warn but allow for flexibility)
      if (selectedPortal && body.user.role !== selectedPortal.id) {
        toast.info(`Note: This account is registered as ${body.user.role.replace('_', ' ')}. Redirecting to your portal.`, { duration: 4000 });
      }
      authLogin({ id: body.user.id, email: body.user.email, name: body.user.name, role: body.user.role as UserRole, avatar: body.user.avatar ?? null, phone: null, isActive: true }, body.token);
      navigate('dashboard');
      toast.success(`Welcome back, ${body.user.name}!`);
    } catch {
      toast.error('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Sign Up Handler ───────────────────────────────────────────────
  const signupForm = useForm<SignupData>({ resolver: zodResolver(signupSchema), defaultValues: { name: '', email: '', password: '', confirmPassword: '' } });

  const onSignup = async (data: SignupData) => {
    if (!selectedPortal) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: data.name, email: data.email, password: data.password, role: selectedPortal.id }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error || 'Registration failed. Please try again.');
        return;
      }
      authLogin({ id: body.user.id, email: body.user.email, name: body.user.name, role: body.user.role as UserRole, avatar: body.user.avatar ?? null, phone: null, isActive: true }, body.token);
      navigate('dashboard');
      toast.success(`Account created! Welcome, ${body.user.name}!`);
    } catch {
      toast.error('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Render: Portal Selection ──────────────────────────────────────
  if (view === 'portal-select') {
    return (
      <div className="min-h-screen flex flex-col">
        {/* Left Panel - Brand (desktop) */}
        <div
          className="hidden lg:flex lg:w-[48%] relative overflow-hidden"
          style={{ background: 'linear-gradient(165deg, #0F766E 0%, #115E59 40%, #0C4A42 70%, #062D28 100%)' }}
        >
          {/* Decorative elements */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full" style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 70%)' }} />
            <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full" style={{ background: 'radial-gradient(circle, rgba(20,184,166,0.15) 0%, transparent 70%)' }} />
            <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)', backgroundSize: '64px 64px' }} />
            <div className="absolute top-1/4 right-1/4 w-40 h-40 rotate-45 rounded-lg" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(255,255,255,0.03))', border: '1px solid rgba(255,255,255,0.06)' }} />
          </div>

          <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20 py-16 w-full">
            <motion.div className="flex items-center gap-3 mb-6" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
              <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
                <Shield className="w-6 h-6 text-amber-400" />
              </div>
              <span className="text-white/90 text-sm font-medium tracking-wide uppercase">Arogya FinScore</span>
            </motion.div>

            <motion.h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
              AI-Powered
              <br />
              <span className="text-amber-400">Credit Scoring</span>
              <br />
              for Inclusive Lending
            </motion.h1>

            <motion.p className="text-teal-100/80 text-base xl:text-lg max-w-md leading-relaxed mb-12" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
              Enabling financial institutions to serve the unbanked with transparent, explainable AI — fully compliant with RBI guidelines.
            </motion.p>

            {/* Feature highlights */}
            <div className="flex flex-col gap-4">
              {[
                { icon: Zap, title: 'Real-time AI Scoring', desc: 'XGBoost + SHAP-powered credit assessment in under 2 seconds' },
                { icon: BarChart3, title: 'SHAP Explainability', desc: 'Transparent, regulatory-compliant risk factor breakdowns' },
                { icon: CheckCircle2, title: 'Same-Day Sanctioning', desc: 'End-to-end digital journey from application to disbursement' },
              ].map((f, i) => (
                <motion.div
                  key={f.title}
                  className="flex items-start gap-4 rounded-2xl p-4 backdrop-blur-md"
                  style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))', border: '1px solid rgba(255,255,255,0.06)' }}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 + i * 0.12 }}
                >
                  <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-amber-400/15 text-amber-400">
                    <f.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-sm mb-0.5">{f.title}</h3>
                    <p className="text-teal-100/70 text-xs leading-relaxed">{f.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div className="flex items-center gap-6 mt-12 pt-6 border-t border-white/8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-teal-100/60" />
                <span className="text-teal-100/60 text-xs font-medium">2.4M+ Scores Generated</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400/60" />
                <span className="text-teal-100/60 text-xs font-medium">99.2% Uptime</span>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Right Panel - Portal Selection */}
        <motion.div
          className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-12 py-12 lg:py-0 min-h-screen relative"
          style={{ background: 'linear-gradient(180deg, #F8FAFB 0%, #F1F5F9 100%)' }}
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <div className="w-full max-w-[600px] relative z-10">
            {/* Mobile Logo */}
            <motion.div className="flex flex-col items-center mb-8 lg:mb-10" variants={fadeInUp}>
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl mb-3" style={{ background: 'linear-gradient(135deg, #0F766E, #115E59)' }}>
                <Shield className="w-7 h-7 text-amber-400" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Arogya FinScore</h2>
              <p className="text-xs text-slate-500 mt-0.5">AI-Powered Credit Scoring for Inclusive Lending</p>
            </motion.div>

            {/* Header */}
            <motion.div className="text-center mb-8" variants={fadeInUp}>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Choose Your Portal</h1>
              <p className="text-sm text-slate-500 mt-1.5">Select the portal that matches your role to get started</p>
            </motion.div>

            {/* Portal Cards */}
            <div className="flex flex-col gap-4">
              {PORTALS.map((portal) => {
                const Icon = portal.icon;
                return (
                  <motion.button
                    key={portal.id}
                    onClick={() => handleSelectPortal(portal)}
                    className="group text-left w-full rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:shadow-lg hover:border-slate-300/80 transition-all duration-300"
                    whileHover={{ y: -2, scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    variants={scaleIn}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-xl text-white shadow-md" style={{ background: portal.gradient }}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="text-base font-bold text-slate-900">{portal.title}</h3>
                          <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-1 transition-all duration-200" />
                        </div>
                        <p className="text-xs font-medium text-slate-500 mt-0.5">{portal.subtitle}</p>
                        <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{portal.description}</p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {portal.features.map((f) => (
                            <span key={f} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-medium text-slate-600">
                              <CheckCircle2 className="w-3 h-3 text-teal-600" />
                              {f}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Footer */}
            <motion.p className="text-center text-[11px] text-muted-foreground/60 mt-8" variants={fadeInUp}>
              &copy; {new Date().getFullYear()} Arogya FinScore. All rights reserved.
              <span className="mx-1.5">&bull;</span>
              <span className="cursor-pointer hover:text-foreground transition-colors">Privacy Policy</span>
              <span className="mx-1.5">&bull;</span>
              <span className="cursor-pointer hover:text-foreground transition-colors">Terms</span>
            </motion.p>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Render: Auth Form (Sign In / Sign Up) ──────────────────────────
  return (
    <div className="min-h-screen flex flex-col">
      {/* Left Panel - Brand (desktop) */}
      <div
        className="hidden lg:flex lg:w-[48%] relative overflow-hidden"
        style={{ background: selectedPortal?.gradient || 'linear-gradient(165deg, #0F766E 0%, #062D28 100%)' }}
      >
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)' }} />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)' }} />
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)', backgroundSize: '64px 64px' }} />
        </div>

        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20 py-16 w-full">
          <motion.div className="flex items-center gap-3 mb-6" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
            <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <span className="text-white/90 text-sm font-medium tracking-wide uppercase">Arogya FinScore</span>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
            <div className="flex items-center gap-2 mb-4">
              {selectedPortal && <selectedPortal.icon className="w-6 h-6 text-white/80" />}
              <span className="text-white/70 text-sm font-medium uppercase tracking-wider">{selectedPortal?.title}</span>
            </div>
            <h1 className="text-3xl xl:text-4xl font-bold text-white leading-tight mb-4">
              {authMode === 'signin' ? 'Welcome Back' : 'Create Account'}
            </h1>
            <p className="text-white/60 text-base max-w-md leading-relaxed">
              {authMode === 'signin'
                ? 'Sign in to access your portal and continue where you left off.'
                : `Join the ${selectedPortal?.title || 'platform'} and get started today.`}
            </p>
          </motion.div>

          {selectedPortal && (
            <motion.div className="mt-10 flex flex-col gap-3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
              {selectedPortal.features.map((f) => (
                <div key={f} className="flex items-center gap-3 text-white/70 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-white/50 flex-shrink-0" />
                  {f}
                </div>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      {/* Right Panel - Auth Form */}
      <motion.div
        className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-12 py-12 lg:py-0 min-h-screen"
        style={{ background: 'linear-gradient(180deg, #F8FAFB 0%, #F1F5F9 100%)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="w-full max-w-[420px] relative z-10">
          {/* Mobile Logo + Back Button */}
          <motion.div className="flex flex-col items-center mb-6 lg:mb-8" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="lg:hidden flex items-center justify-center w-12 h-12 rounded-2xl mb-3" style={{ background: selectedPortal?.gradient || 'linear-gradient(135deg, #0F766E, #115E59)' }}>
              <Shield className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Arogya FinScore</h2>
            <p className="text-xs text-slate-500 mt-0.5">{selectedPortal?.title}</p>
          </motion.div>

          {/* Back Button */}
          <motion.div className="mb-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
            <button
              onClick={handleBack}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Portals
            </button>
          </motion.div>

          {/* Auth Card */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card className="border-0 shadow-xl shadow-slate-900/[0.04] rounded-2xl overflow-hidden relative">
              <div className="h-1.5" style={{ background: selectedPortal?.gradient || 'linear-gradient(90deg, #0F766E 0%, #14B8A6 50%, #F59E0B 100%)' }} />

              <CardHeader className="pb-2 pt-6 px-6 sm:px-8">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  {authMode === 'signin' ? 'Sign In' : 'Create Account'}
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  {authMode === 'signin'
                    ? `Enter your credentials to access the ${selectedPortal?.title || 'portal'}`
                    : `Fill in your details to join the ${selectedPortal?.title || 'portal'}`}
                </p>
              </CardHeader>

              <CardContent className="px-6 sm:px-8 pb-8">
                <AnimatePresence mode="wait">
                  {/* ── Sign In Form ──────────────────────────────── */}
                  {authMode === 'signin' && (
                    <motion.form
                      key="signin"
                      onSubmit={signinForm.handleSubmit(onSignin)}
                      className="space-y-5"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.25 }}
                      noValidate
                    >
                      <div className="space-y-2">
                        <Label htmlFor="signin-email" className="text-sm font-medium text-slate-700">Email address</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                          <Input id="signin-email" type="email" placeholder="you@example.com" autoComplete="email" className="pl-10 h-11 rounded-xl bg-slate-50/80 border-slate-200/80 focus-visible:ring-teal-600/30 focus-visible:border-teal-600/50 text-sm" {...signinForm.register('email')} />
                        </div>
                        <AnimatePresence mode="wait">
                          {signinForm.formState.errors.email && (
                            <motion.p className="text-xs text-red-500" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>{signinForm.formState.errors.email.message}</motion.p>
                          )}
                        </AnimatePresence>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="signin-password" className="text-sm font-medium text-slate-700">Password</Label>
                        </div>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                          <Input id="signin-password" type={showPassword ? 'text' : 'password'} placeholder="Enter your password" autoComplete="current-password" className="pl-10 pr-10 h-11 rounded-xl bg-slate-50/80 border-slate-200/80 focus-visible:ring-teal-600/30 focus-visible:border-teal-600/50 text-sm" {...signinForm.register('password')} />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none" aria-label={showPassword ? 'Hide password' : 'Show password'} tabIndex={-1}>
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <AnimatePresence mode="wait">
                          {signinForm.formState.errors.password && (
                            <motion.p className="text-xs text-red-500" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>{signinForm.formState.errors.password.message}</motion.p>
                          )}
                        </AnimatePresence>
                      </div>

                      <Button type="submit" disabled={isSubmitting} className="w-full h-11 rounded-xl text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all duration-300" style={{ background: selectedPortal?.gradient || 'linear-gradient(135deg, #0F766E 0%, #115E59 100%)' }}>
                        <AnimatePresence mode="wait">
                          {isSubmitting ? (
                            <motion.span key="loading" className="flex items-center gap-2" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Signing in...
                            </motion.span>
                          ) : (
                            <motion.span key="idle" className="flex items-center gap-2" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                              <LogIn className="w-4 h-4" />
                              Sign In
                              <ArrowRight className="w-4 h-4" />
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </Button>

                      <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
                        <div className="relative flex justify-center text-xs"><span className="bg-white px-3 text-slate-400">or</span></div>
                      </div>

                      <Button type="button" variant="outline" className="w-full h-11 rounded-xl text-sm font-medium border-slate-200" onClick={() => { setAuthMode('signup'); signupForm.reset(); }}>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Create a new account
                      </Button>
                    </motion.form>
                  )}

                  {/* ── Sign Up Form ──────────────────────────────── */}
                  {authMode === 'signup' && (
                    <motion.form
                      key="signup"
                      onSubmit={signupForm.handleSubmit(onSignup)}
                      className="space-y-5"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.25 }}
                      noValidate
                    >
                      <div className="space-y-2">
                        <Label htmlFor="signup-name" className="text-sm font-medium text-slate-700">Full Name</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                          <Input id="signup-name" type="text" placeholder="Enter your full name" autoComplete="name" className="pl-10 h-11 rounded-xl bg-slate-50/80 border-slate-200/80 focus-visible:ring-teal-600/30 focus-visible:border-teal-600/50 text-sm" {...signupForm.register('name')} />
                        </div>
                        <AnimatePresence mode="wait">
                          {signupForm.formState.errors.name && (
                            <motion.p className="text-xs text-red-500" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>{signupForm.formState.errors.name.message}</motion.p>
                          )}
                        </AnimatePresence>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-email" className="text-sm font-medium text-slate-700">Email address</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                          <Input id="signup-email" type="email" placeholder="you@example.com" autoComplete="email" className="pl-10 h-11 rounded-xl bg-slate-50/80 border-slate-200/80 focus-visible:ring-teal-600/30 focus-visible:border-teal-600/50 text-sm" {...signupForm.register('email')} />
                        </div>
                        <AnimatePresence mode="wait">
                          {signupForm.formState.errors.email && (
                            <motion.p className="text-xs text-red-500" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>{signupForm.formState.errors.email.message}</motion.p>
                          )}
                        </AnimatePresence>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-password" className="text-sm font-medium text-slate-700">Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                          <Input id="signup-password" type={showPassword ? 'text' : 'password'} placeholder="Create a strong password" autoComplete="new-password" className="pl-10 pr-10 h-11 rounded-xl bg-slate-50/80 border-slate-200/80 focus-visible:ring-teal-600/30 focus-visible:border-teal-600/50 text-sm" {...signupForm.register('password')} />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none" aria-label={showPassword ? 'Hide password' : 'Show password'} tabIndex={-1}>
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <AnimatePresence mode="wait">
                          {signupForm.formState.errors.password && (
                            <motion.p className="text-xs text-red-500" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>{signupForm.formState.errors.password.message}</motion.p>
                          )}
                        </AnimatePresence>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-confirm" className="text-sm font-medium text-slate-700">Confirm Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                          <Input id="signup-confirm" type={showConfirmPassword ? 'text' : 'password'} placeholder="Confirm your password" autoComplete="new-password" className="pl-10 pr-10 h-11 rounded-xl bg-slate-50/80 border-slate-200/80 focus-visible:ring-teal-600/30 focus-visible:border-teal-600/50 text-sm" {...signupForm.register('confirmPassword')} />
                          <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none" aria-label={showConfirmPassword ? 'Hide password' : 'Show password'} tabIndex={-1}>
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <AnimatePresence mode="wait">
                          {signupForm.formState.errors.confirmPassword && (
                            <motion.p className="text-xs text-red-500" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>{signupForm.formState.errors.confirmPassword.message}</motion.p>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Selected portal indicator */}
                      <div className="rounded-xl bg-muted/60 border border-border/60 p-3">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Registering as:</p>
                        <div className="flex items-center gap-2">
                          {selectedPortal && <selectedPortal.icon className="w-4 h-4 text-primary" />}
                          <span className="text-sm font-semibold text-slate-900">{selectedPortal?.title}</span>
                          <span className="text-xs text-muted-foreground">— {selectedPortal?.subtitle}</span>
                        </div>
                      </div>

                      <Button type="submit" disabled={isSubmitting} className="w-full h-11 rounded-xl text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all duration-300" style={{ background: selectedPortal?.gradient || 'linear-gradient(135deg, #0F766E 0%, #115E59 100%)' }}>
                        <AnimatePresence mode="wait">
                          {isSubmitting ? (
                            <motion.span key="loading" className="flex items-center gap-2" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Creating account...
                            </motion.span>
                          ) : (
                            <motion.span key="idle" className="flex items-center gap-2" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                              <UserPlus className="w-4 h-4" />
                              Create Account
                              <ArrowRight className="w-4 h-4" />
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </Button>

                      <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
                        <div className="relative flex justify-center text-xs"><span className="bg-white px-3 text-slate-400">or</span></div>
                      </div>

                      <Button type="button" variant="outline" className="w-full h-11 rounded-xl text-sm font-medium border-slate-200" onClick={() => { setAuthMode('signin'); signinForm.reset(); }}>
                        <LogIn className="w-4 h-4 mr-2" />
                        Already have an account? Sign In
                      </Button>
                    </motion.form>
                  )}
                </AnimatePresence>

                {/* Security Footer */}
                <div className="mt-6 flex items-center justify-center gap-3">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Lock className="w-3 h-3" />
                    <span className="text-[11px] font-medium">256-bit encryption</span>
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-teal-600 border border-teal-600/20 bg-teal-600/5 rounded-md px-2 py-0.5">
                    RBI Compliant
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Bottom Copyright */}
          <motion.p className="text-center text-[11px] text-muted-foreground/60 mt-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            &copy; {new Date().getFullYear()} Arogya FinScore. All rights reserved.
            <span className="mx-1.5">&bull;</span>
            <span className="cursor-pointer hover:text-foreground transition-colors">Privacy Policy</span>
            <span className="mx-1.5">&bull;</span>
            <span className="cursor-pointer hover:text-foreground transition-colors">Terms</span>
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
}
