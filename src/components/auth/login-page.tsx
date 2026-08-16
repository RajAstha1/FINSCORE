'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
  Sparkles,
  BarChart3,
  Users,
  Loader2,
  Zap,
  CheckCircle2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/use-auth-store';
import { useAppStore } from '@/store/use-app-store';

// ── Zod Schema ──────────────────────────────────────────────────────────────
const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

// ── Demo Credentials ────────────────────────────────────────────────────────
const DEMO_ACCOUNTS = [
  { email: 'admin@arogya.in', password: 'admin123', label: 'Super Admin', color: 'text-teal' },
  { email: 'analyst@arogya.in', password: 'analyst123', label: 'Credit Analyst', color: 'text-amber' },
  { email: 'partner@arogya.in', password: 'partner123', label: 'Channel Partner', color: 'text-emerald' },
] as const;

// ── Feature cards for left panel ────────────────────────────────────────────
const FEATURES = [
  {
    icon: Zap,
    title: 'Real-time AI Scoring',
    description: 'XGBoost + SHAP-powered credit assessment in under 2 seconds',
  },
  {
    icon: BarChart3,
    title: 'SHAP Explainability',
    description: 'Transparent, regulatory-compliant risk factor breakdowns',
  },
  {
    icon: CheckCircle2,
    title: 'Same-Day Sanctioning',
    description: 'End-to-end digital journey from application to disbursement',
  },
];

// ── Animation Variants ──────────────────────────────────────────────────────
const pageVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

const leftPanelVariants = {
  hidden: { opacity: 0, x: -40 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

const featureCardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.96 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      delay: 0.3 + i * 0.12,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  }),
};

// ── Component ───────────────────────────────────────────────────────────────
export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const authLogin = useAuthStore((s) => s.login);
  const navigate = useAppStore((s) => s.navigate);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  // ── Submit Handler ──────────────────────────────────────────────────────
  const onSubmit = async (data: LoginFormData) => {
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

      // Success — hydrate stores and navigate
      authLogin(
        {
          id: body.user.id,
          email: body.user.email,
          name: body.user.name,
          role: body.user.role,
          avatar: body.user.avatar ?? null,
          phone: null,
          isActive: true,
        },
        body.token,
      );
      navigate('dashboard');
      toast.success(`Welcome back, ${body.user.name}!`);
    } catch {
      toast.error('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Quick-fill handler ──────────────────────────────────────────────────
  const handleQuickFill = (email: string, password: string) => {
    setValue('email', email, { shouldValidate: true });
    setValue('password', password, { shouldValidate: true });
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* ──────────────────────────────────────────────────────────────────────
          LEFT PANEL — Brand / Feature showcase (hidden on mobile)
      ────────────────────────────────────────────────────────────────────── */}
      <motion.div
        className="hidden lg:flex lg:w-[52%] relative overflow-hidden"
        style={{
          background:
            'linear-gradient(165deg, #0F766E 0%, #115E59 40%, #0C4A42 70%, #062D28 100%)',
        }}
        variants={leftPanelVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Decorative geometric shapes */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          {/* Large circle top-right */}
          <div
            className="absolute -top-32 -right-32 w-96 h-96 rounded-full"
            style={{
              background:
                'radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 70%)',
            }}
          />
          {/* Medium circle bottom-left */}
          <div
            className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full"
            style={{
              background:
                'radial-gradient(circle, rgba(20,184,166,0.15) 0%, transparent 70%)',
            }}
          />
          {/* Grid pattern overlay */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)',
              backgroundSize: '64px 64px',
            }}
          />
          {/* Floating diamond */}
          <div
            className="absolute top-1/4 right-1/4 w-40 h-40 rotate-45 rounded-lg"
            style={{
              background:
                'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(255,255,255,0.03))',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          />
          {/* Small floating dots */}
          <div className="absolute top-20 left-[30%] w-2 h-2 rounded-full bg-amber/30" />
          <div className="absolute top-[45%] right-[15%] w-3 h-3 rounded-full bg-teal-light/20" />
          <div className="absolute bottom-[30%] left-[20%] w-2.5 h-2.5 rounded-full bg-amber/20" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20 py-16 w-full">
          {/* Logo & Name */}
          <motion.div
            className="flex items-center gap-3 mb-4"
            variants={featureCardVariants}
            custom={0}
          >
            <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
              <Shield className="w-6 h-6 text-amber" />
            </div>
            <span className="text-white/90 text-sm font-medium tracking-wide uppercase">
              Arogya FinScore
            </span>
          </motion.div>

          {/* Heading */}
          <motion.h1
            className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-4"
            variants={featureCardVariants}
            custom={1}
          >
            AI-Powered
            <br />
            <span className="text-amber">Credit Scoring</span>
            <br />
            for Inclusive Lending
          </motion.h1>

          <motion.p
            className="text-teal-100/60 text-base xl:text-lg max-w-md leading-relaxed mb-12"
            variants={featureCardVariants}
            custom={2}
          >
            Enabling financial institutions to serve the unbanked with transparent,
            explainable AI — fully compliant with RBI guidelines.
          </motion.p>

          {/* Feature cards */}
          <div className="flex flex-col gap-4">
            {FEATURES.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  className="group flex items-start gap-4 rounded-2xl p-4 backdrop-blur-md transition-colors duration-300"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                  custom={i + 3}
                  variants={featureCardVariants}
                  whileHover={{
                    background:
                      'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.04))',
                    x: 4,
                  }}
                >
                  <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-amber/15 text-amber">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-sm mb-0.5">
                      {feature.title}
                    </h3>
                    <p className="text-teal-100/50 text-xs leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Trust badges at bottom */}
          <motion.div
            className="flex items-center gap-6 mt-12 pt-6 border-t border-white/8"
            variants={featureCardVariants}
            custom={7}
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-teal-100/40" />
              <span className="text-teal-100/40 text-xs font-medium">
                2.4M+ Scores Generated
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber/60" />
              <span className="text-teal-100/40 text-xs font-medium">
                99.2% Uptime
              </span>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* ──────────────────────────────────────────────────────────────────────
          RIGHT PANEL — Login Form
      ────────────────────────────────────────────────────────────────────── */}
      <motion.div
        className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-12 py-8 lg:py-0 min-h-screen"
        style={{ background: 'linear-gradient(180deg, #F8FAFB 0%, #F1F5F9 100%)' }}
        variants={pageVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="w-full max-w-[420px]">
          {/* ── Mobile Logo (visible only on mobile) ───────────────────────── */}
          <motion.div
            className="flex flex-col items-center mb-8 lg:mb-10"
            variants={itemVariants}
          >
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl mb-3"
              style={{ background: 'linear-gradient(135deg, #0F766E, #115E59)' }}
            >
              <Shield className="w-7 h-7 text-amber" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Arogya FinScore
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              AI-Powered Credit Scoring for Inclusive Lending
            </p>
          </motion.div>

          {/* ── Card ───────────────────────────────────────────────────────── */}
          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-xl shadow-slate-900/[0.04] rounded-2xl overflow-hidden">
              {/* Card glassmorphism header strip */}
              <div
                className="h-1.5"
                style={{
                  background:
                    'linear-gradient(90deg, #0F766E 0%, #14B8A6 50%, #F59E0B 100%)',
                }}
              />

              <CardHeader className="pb-2 pt-6 px-6 sm:px-8">
                <motion.h1
                  className="text-2xl font-bold text-slate-900 tracking-tight"
                  variants={itemVariants}
                >
                  Welcome back
                </motion.h1>
                <motion.p
                  className="text-sm text-slate-500 mt-1"
                  variants={itemVariants}
                >
                  Sign in to your account to continue
                </motion.p>
              </CardHeader>

              <CardContent className="px-6 sm:px-8 pb-8">
                <motion.form
                  onSubmit={handleSubmit(onSubmit)}
                  className="space-y-5"
                  variants={itemVariants}
                  noValidate
                >
                  {/* Email Field */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="email"
                      className="text-sm font-medium text-slate-700"
                    >
                      Email address
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        autoComplete="email"
                        className="pl-10 h-11 rounded-xl bg-slate-50/80 border-slate-200/80 focus-visible:ring-teal/30 focus-visible:border-teal/50 text-sm transition-all duration-200"
                        {...register('email')}
                      />
                    </div>
                    <AnimatePresence mode="wait">
                      {errors.email && (
                        <motion.p
                          className="text-xs text-red-500 flex items-center gap-1"
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                        >
                          {errors.email.message}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Password Field */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="password"
                      className="text-sm font-medium text-slate-700"
                    >
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        className="pl-10 pr-10 h-11 rounded-xl bg-slate-50/80 border-slate-200/80 focus-visible:ring-teal/30 focus-visible:border-teal/50 text-sm transition-all duration-200"
                        {...register('password')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <AnimatePresence mode="wait">
                      {errors.password && (
                        <motion.p
                          className="text-xs text-red-500 flex items-center gap-1"
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                        >
                          {errors.password.message}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Submit Button */}
                  <motion.div className="pt-1" variants={itemVariants}>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full h-11 rounded-xl text-sm font-semibold text-white shadow-lg shadow-teal/20 hover:shadow-teal/30 transition-all duration-300"
                      style={{
                        background:
                          'linear-gradient(135deg, #0F766E 0%, #115E59 100%)',
                      }}
                      asChild
                    >
                      <motion.button
                        type="submit"
                        disabled={isSubmitting}
                        whileHover={{ scale: isSubmitting ? 1 : 1.01 }}
                        whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
                        className="w-full h-11 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
                      >
                        <AnimatePresence mode="wait">
                          {isSubmitting ? (
                            <motion.span
                              key="loading"
                              className="flex items-center gap-2"
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -8 }}
                            >
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Signing in…
                            </motion.span>
                          ) : (
                            <motion.span
                              key="idle"
                              className="flex items-center gap-2"
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -8 }}
                            >
                              Sign in
                              <ArrowRight className="w-4 h-4" />
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </motion.button>
                    </Button>
                  </motion.div>
                </motion.form>

                {/* ── Demo Credentials ─────────────────────────────────────── */}
                <motion.div
                  className="mt-8 pt-6 border-t border-slate-100"
                  variants={itemVariants}
                >
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber" />
                    Demo Credentials
                  </p>
                  <div className="flex flex-col gap-2">
                    {DEMO_ACCOUNTS.map((account) => (
                      <button
                        key={account.email}
                        type="button"
                        onClick={() =>
                          handleQuickFill(account.email, account.password)
                        }
                        className="group flex items-center justify-between rounded-xl px-3.5 py-2.5 bg-slate-50/60 hover:bg-teal/5 border border-slate-100 hover:border-teal/15 transition-all duration-200 text-left"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center shadow-sm">
                            <Shield className="w-3.5 h-3.5 text-teal" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-700 truncate">
                              {account.label}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate">
                              {account.email}
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-teal transition-colors flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                </motion.div>

                {/* ── Security Footer ──────────────────────────────────────── */}
                <motion.div
                  className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4"
                  variants={itemVariants}
                >
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Lock className="w-3 h-3" />
                    <span className="text-[11px] font-medium">
                      Secured by 256-bit encryption
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px] font-semibold uppercase tracking-wider text-teal border-teal/20 bg-teal/5 rounded-md px-2 py-0.5"
                  >
                    RBI Compliant
                  </Badge>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>

          {/* ── Bottom Copyright ──────────────────────────────────────────── */}
          <motion.p
            className="text-center text-[11px] text-slate-400 mt-8"
            variants={itemVariants}
          >
            &copy; {new Date().getFullYear()} Arogya FinScore. All rights reserved.
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
}
