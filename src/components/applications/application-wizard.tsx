'use client';

import { useState, useCallback, useMemo } from 'react';
import { useForm, useFormContext, FormProvider, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  MapPin,
  Briefcase,
  IndianRupee,
  Zap,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Shield,
  Clock,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';

import { useAuthStore } from '@/store/use-auth-store';
import { useAppStore } from '@/store/use-app-store';

// ─── Constants ───────────────────────────────────────────────────────────────

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

const GENDER_OPTIONS = ['Male', 'Female', 'Other'];
const CATEGORY_OPTIONS = ['SC', 'ST', 'OBC', 'General'];
const EDUCATION_OPTIONS = [
  'Illiterate', 'Primary', 'Secondary', 'Higher Secondary',
  'Graduate', 'Postgraduate',
];
const MARITAL_OPTIONS = ['Single', 'Married', 'Divorced', 'Widowed'];
const LOAN_PURPOSE_OPTIONS = [
  'Education', 'Medical', 'Business', 'Agriculture', 'Housing', 'Consumption',
];
const TENURE_OPTIONS = ['6', '12', '18', '24', '36', '48', '60'];
const SCHEME_OPTIONS = ['NBCFDC', 'NMDFC', 'NSKFDC', 'State Channel'];

const STEPS = [
  { id: 1, name: 'Personal Info', icon: User },
  { id: 2, name: 'Address', icon: MapPin },
  { id: 3, name: 'Income', icon: Briefcase },
  { id: 4, name: 'Loan Details', icon: IndianRupee },
  { id: 5, name: 'Consumption', icon: Zap },
  { id: 6, name: 'Review', icon: CheckCircle2 },
] as const;

const currencyFmt = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

// ─── Zod Schema ─────────────────────────────────────────────────────────────

const personalSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  aadhaarNumber: z
    .string()
    .min(12, 'Aadhaar must be 12 digits')
    .max(12, 'Aadhaar must be 12 digits')
    .regex(/^\d{12}$/, 'Aadhaar must be 12 digits only'),
  panNumber: z
    .string()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN format (e.g. ABCDE1234F)'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  gender: z.string().min(1, 'Select a gender'),
  category: z.string().min(1, 'Select a category'),
  educationLevel: z.string().min(1, 'Select education level'),
  maritalStatus: z.string().min(1, 'Select marital status'),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian phone number'),
  email: z.string().email('Enter a valid email address'),
});

const addressSchema = z.object({
  address: z.string().min(5, 'Address must be at least 5 characters'),
  state: z.string().min(1, 'Select a state'),
  district: z.string().min(2, 'District is required'),
  pincode: z
    .string()
    .regex(/^[1-9][0-9]{5}$/, 'Enter a valid 6-digit pincode'),
});

const incomeSchema = z.object({
  occupation: z.string().min(2, 'Occupation is required'),
  monthlyIncome: z.coerce.number().min(1, 'Monthly income is required'),
  bankName: z.string().min(2, 'Bank name is required'),
  bankAccount: z
    .string()
    .regex(/^\d{9,18}$/, 'Enter a valid bank account number (9-18 digits)'),
  bankIfsc: z
    .string()
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Enter a valid IFSC code (e.g. SBIN0001234)'),
});

const loanSchema = z.object({
  loanAmount: z.coerce.number().min(10000, 'Minimum loan amount is ₹10,000'),
  loanPurpose: z.string().min(1, 'Select a loan purpose'),
  loanTenure: z.coerce.number().min(6, 'Select a tenure'),
  schemeType: z.string().min(1, 'Select a scheme type'),
});

const consumptionSchema = z.object({
  electricityConsistency: z.coerce.number().min(0).max(100),
  mobileRechargeConsistency: z.coerce.number().min(0).max(100),
  utilityPaymentHistory: z.coerce.number().min(0).max(100),
  repaymentHistory: z.coerce.number().min(0).max(100),
});

const consentSchema = z.object({
  consentCreditBureau: z.literal(true, {
    errorMap: () => ({ message: 'You must consent to credit bureau check' }),
  }),
  consentDataSharing: z.literal(true, {
    errorMap: () => ({ message: 'You must authorize data sharing with NBCFDC' }),
  }),
  consentAccuracy: z.literal(true, {
    errorMap: () => ({ message: 'You must declare information accuracy' }),
  }),
});

const fullSchema = personalSchema
  .merge(addressSchema)
  .merge(incomeSchema)
  .merge(loanSchema)
  .merge(consumptionSchema)
  .merge(consentSchema);

type ApplicationFormData = z.infer<typeof fullSchema>;

// ─── Step field maps for per-step validation ────────────────────────────────

const STEP_FIELDS: Record<number, (keyof ApplicationFormData)[]> = {
  1: ['name', 'aadhaarNumber', 'panNumber', 'dateOfBirth', 'gender', 'category', 'educationLevel', 'maritalStatus', 'phone', 'email'],
  2: ['address', 'state', 'district', 'pincode'],
  3: ['occupation', 'monthlyIncome', 'bankName', 'bankAccount', 'bankIfsc'],
  4: ['loanAmount', 'loanPurpose', 'loanTenure', 'schemeType'],
  5: ['electricityConsistency', 'mobileRechargeConsistency', 'utilityPaymentHistory', 'repaymentHistory'],
  6: ['consentCreditBureau', 'consentDataSharing', 'consentAccuracy'],
};

// ─── Step Content Components ─────────────────────────────────────────────────

function PersonalInfoStep() {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<ApplicationFormData>();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Label htmlFor="name">Full Name</Label>
        <Input id="name" placeholder="Enter full name" {...register('name')} className="mt-1.5" />
        {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div>
        <Label htmlFor="aadhaarNumber">Aadhaar Number</Label>
        <Input
          id="aadhaarNumber"
          placeholder="12-digit Aadhaar"
          maxLength={12}
          {...register('aadhaarNumber')}
          className="mt-1.5"
        />
        {errors.aadhaarNumber && (
          <p className="mt-1 text-xs text-destructive">{errors.aadhaarNumber.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="panNumber">PAN Number</Label>
        <Input
          id="panNumber"
          placeholder="ABCDE1234F"
          {...register('panNumber')}
          className="mt-1.5 uppercase"
        />
        {errors.panNumber && (
          <p className="mt-1 text-xs text-destructive">{errors.panNumber.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="dateOfBirth">Date of Birth</Label>
        <Input id="dateOfBirth" type="date" {...register('dateOfBirth')} className="mt-1.5" />
        {errors.dateOfBirth && (
          <p className="mt-1 text-xs text-destructive">{errors.dateOfBirth.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="gender">Gender</Label>
        <Select value={watch('gender') || ''} onValueChange={(v) => setValue('gender', v, { shouldValidate: true })}>
          <SelectTrigger className="mt-1.5 w-full">
            <SelectValue placeholder="Select gender" />
          </SelectTrigger>
          <SelectContent>
            {GENDER_OPTIONS.map((g) => (
              <SelectItem key={g} value={g}>{g}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.gender && <p className="mt-1 text-xs text-destructive">{errors.gender.message}</p>}
      </div>

      <div>
        <Label htmlFor="category">Category</Label>
        <Select value={watch('category') || ''} onValueChange={(v) => setValue('category', v, { shouldValidate: true })}>
          <SelectTrigger className="mt-1.5 w-full">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_OPTIONS.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.category && <p className="mt-1 text-xs text-destructive">{errors.category.message}</p>}
      </div>

      <div>
        <Label htmlFor="educationLevel">Education Level</Label>
        <Select value={watch('educationLevel') || ''} onValueChange={(v) => setValue('educationLevel', v, { shouldValidate: true })}>
          <SelectTrigger className="mt-1.5 w-full">
            <SelectValue placeholder="Select education level" />
          </SelectTrigger>
          <SelectContent>
            {EDUCATION_OPTIONS.map((e) => (
              <SelectItem key={e} value={e}>{e}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.educationLevel && (
          <p className="mt-1 text-xs text-destructive">{errors.educationLevel.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="maritalStatus">Marital Status</Label>
        <Select value={watch('maritalStatus') || ''} onValueChange={(v) => setValue('maritalStatus', v, { shouldValidate: true })}>
          <SelectTrigger className="mt-1.5 w-full">
            <SelectValue placeholder="Select marital status" />
          </SelectTrigger>
          <SelectContent>
            {MARITAL_OPTIONS.map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.maritalStatus && (
          <p className="mt-1 text-xs text-destructive">{errors.maritalStatus.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="phone">Phone Number</Label>
        <Input
          id="phone"
          type="tel"
          placeholder="10-digit mobile number"
          maxLength={10}
          {...register('phone')}
          className="mt-1.5"
        />
        {errors.phone && <p className="mt-1 text-xs text-destructive">{errors.phone.message}</p>}
      </div>

      <div>
        <Label htmlFor="email">Email Address</Label>
        <Input id="email" type="email" placeholder="email@example.com" {...register('email')} className="mt-1.5" />
        {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
      </div>
    </div>
  );
}

function AddressStep() {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<ApplicationFormData>();

  return (
    <div className="grid grid-cols-1 gap-4">
      <div>
        <Label htmlFor="address">Full Address</Label>
        <Textarea
          id="address"
          placeholder="House no., street, locality..."
          rows={3}
          {...register('address')}
          className="mt-1.5"
        />
        {errors.address && <p className="mt-1 text-xs text-destructive">{errors.address.message}</p>}
      </div>

      <div>
        <Label htmlFor="state">State</Label>
        <Select value={watch('state') || ''} onValueChange={(v) => setValue('state', v, { shouldValidate: true })}>
          <SelectTrigger className="mt-1.5 w-full">
            <SelectValue placeholder="Select state" />
          </SelectTrigger>
          <SelectContent className="max-h-64">
            {INDIAN_STATES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.state && <p className="mt-1 text-xs text-destructive">{errors.state.message}</p>}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="district">District</Label>
          <Input id="district" placeholder="District name" {...register('district')} className="mt-1.5" />
          {errors.district && (
            <p className="mt-1 text-xs text-destructive">{errors.district.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="pincode">Pincode</Label>
          <Input
            id="pincode"
            placeholder="6-digit pincode"
            maxLength={6}
            {...register('pincode')}
            className="mt-1.5"
          />
          {errors.pincode && <p className="mt-1 text-xs text-destructive">{errors.pincode.message}</p>}
        </div>
      </div>
    </div>
  );
}

function IncomeStep() {
  const {
    register,
    formState: { errors },
  } = useFormContext<ApplicationFormData>();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Label htmlFor="occupation">Occupation</Label>
        <Input id="occupation" placeholder="e.g. Farmer, Shopkeeper, Teacher" {...register('occupation')} className="mt-1.5" />
        {errors.occupation && (
          <p className="mt-1 text-xs text-destructive">{errors.occupation.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="monthlyIncome">Monthly Income</Label>
        <Input id="monthlyIncome" type="number" placeholder="e.g. 15000" {...register('monthlyIncome')} className="mt-1.5" />
        {errors.monthlyIncome && (
          <p className="mt-1 text-xs text-destructive">{errors.monthlyIncome.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="bankName">Bank Name</Label>
        <Input id="bankName" placeholder="e.g. State Bank of India" {...register('bankName')} className="mt-1.5" />
        {errors.bankName && <p className="mt-1 text-xs text-destructive">{errors.bankName.message}</p>}
      </div>

      <div>
        <Label htmlFor="bankAccount">Bank Account Number</Label>
        <Input id="bankAccount" placeholder="9-18 digit account number" {...register('bankAccount')} className="mt-1.5" />
        {errors.bankAccount && (
          <p className="mt-1 text-xs text-destructive">{errors.bankAccount.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="bankIfsc">IFSC Code</Label>
        <Input id="bankIfsc" placeholder="e.g. SBIN0001234" className="mt-1.5 uppercase" {...register('bankIfsc')} />
        {errors.bankIfsc && <p className="mt-1 text-xs text-destructive">{errors.bankIfsc.message}</p>}
      </div>
    </div>
  );
}

function LoanDetailsStep() {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<ApplicationFormData>();

  const loanAmount = watch('loanAmount');

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <Label htmlFor="loanAmount">Loan Amount (₹)</Label>
        <Input
          id="loanAmount"
          type="number"
          placeholder="e.g. 100000"
          min={10000}
          {...register('loanAmount')}
          className="mt-1.5"
        />
        {errors.loanAmount && (
          <p className="mt-1 text-xs text-destructive">{errors.loanAmount.message}</p>
        )}
        {loanAmount && Number(loanAmount) >= 10000 && (
          <p className="mt-1 text-xs text-muted-foreground">
            {currencyFmt.format(Number(loanAmount))}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="loanPurpose">Loan Purpose</Label>
        <Select value={watch('loanPurpose') || ''} onValueChange={(v) => setValue('loanPurpose', v, { shouldValidate: true })}>
          <SelectTrigger className="mt-1.5 w-full">
            <SelectValue placeholder="Select purpose" />
          </SelectTrigger>
          <SelectContent>
            {LOAN_PURPOSE_OPTIONS.map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.loanPurpose && (
          <p className="mt-1 text-xs text-destructive">{errors.loanPurpose.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="loanTenure">Loan Tenure</Label>
        <Select value={watch('loanTenure') ? String(watch('loanTenure')) : ''} onValueChange={(v) => setValue('loanTenure', Number(v), { shouldValidate: true })}>
          <SelectTrigger className="mt-1.5 w-full">
            <SelectValue placeholder="Select tenure" />
          </SelectTrigger>
          <SelectContent>
            {TENURE_OPTIONS.map((t) => (
              <SelectItem key={t} value={t}>{t} months</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.loanTenure && (
          <p className="mt-1 text-xs text-destructive">{errors.loanTenure.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="schemeType">Scheme Type</Label>
        <Select value={watch('schemeType') || ''} onValueChange={(v) => setValue('schemeType', v, { shouldValidate: true })}>
          <SelectTrigger className="mt-1.5 w-full">
            <SelectValue placeholder="Select scheme" />
          </SelectTrigger>
          <SelectContent>
            {SCHEME_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.schemeType && (
          <p className="mt-1 text-xs text-destructive">{errors.schemeType.message}</p>
        )}
      </div>
    </div>
  );
}

const CONSUMPTION_SLIDERS: {
  key: keyof ApplicationFormData;
  label: string;
  description: string;
}[] = [
  { key: 'electricityConsistency', label: 'Electricity Payment Regularity', description: 'How consistently are electricity bills paid on time?' },
  { key: 'mobileRechargeConsistency', label: 'Mobile Recharge Regularity', description: 'How regularly is the mobile phone recharged?' },
  { key: 'utilityPaymentHistory', label: 'Other Utility Payment History', description: 'Track record for water, gas, and other utility payments' },
  { key: 'repaymentHistory', label: 'Previous Repayment History', description: 'History of any previous loan repayments' },
];

function ConsumptionStep() {
  const {
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<ApplicationFormData>();

  return (
    <div className="grid grid-cols-1 gap-6">
      {CONSUMPTION_SLIDERS.map(({ key, label, description }) => (
        <div key={key} className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">{label}</Label>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
            <Badge variant="outline" className="min-w-[3rem] justify-center font-mono text-sm">
              {watch(key as string) ?? 50}
            </Badge>
          </div>
          <Slider
            min={0}
            max={100}
            step={1}
            value={[Number(watch(key as string)) ?? 50]}
            onValueChange={([v]) => setValue(key as keyof ApplicationFormData, v as number, { shouldValidate: true })}
            className="w-full"
          />
          {errors[key] && (
            <p className="text-xs text-destructive">{errors[key]?.message}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function ReviewStep() {
  const { watch } = useFormContext<ApplicationFormData>();
  const data = watch();

  const sections = useMemo(
    () => [
      {
        title: 'Personal Information',
        icon: <User className="size-4" />,
        items: [
          { label: 'Full Name', value: data.name },
          { label: 'Aadhaar', value: data.aadhaarNumber?.replace(/(\d{4})(?=\d)/g, '$1 ') ?? '—' },
          { label: 'PAN', value: data.panNumber ?? '—' },
          { label: 'Date of Birth', value: data.dateOfBirth },
          { label: 'Gender', value: data.gender },
          { label: 'Category', value: data.category },
          { label: 'Education', value: data.educationLevel },
          { label: 'Marital Status', value: data.maritalStatus },
          { label: 'Phone', value: data.phone },
          { label: 'Email', value: data.email },
        ],
      },
      {
        title: 'Address Details',
        icon: <MapPin className="size-4" />,
        items: [
          { label: 'Address', value: data.address },
          { label: 'State', value: data.state },
          { label: 'District', value: data.district },
          { label: 'Pincode', value: data.pincode },
        ],
      },
      {
        title: 'Income & Employment',
        icon: <Briefcase className="size-4" />,
        items: [
          { label: 'Occupation', value: data.occupation },
          { label: 'Monthly Income', value: data.monthlyIncome ? currencyFmt.format(Number(data.monthlyIncome)) : '—' },
          { label: 'Bank Name', value: data.bankName },
          { label: 'Bank Account', value: data.bankAccount?.replace(/(.{4})(?!$)/g, '$1 ') ?? '—' },
          { label: 'IFSC Code', value: data.bankIfsc },
        ],
      },
      {
        title: 'Loan Details',
        icon: <IndianRupee className="size-4" />,
        items: [
          { label: 'Loan Amount', value: data.loanAmount ? currencyFmt.format(Number(data.loanAmount)) : '—' },
          { label: 'Purpose', value: data.loanPurpose },
          { label: 'Tenure', value: data.loanTenure ? `${data.loanTenure} months` : '—' },
          { label: 'Scheme', value: data.schemeType },
        ],
      },
      {
        title: 'Consumption Data',
        icon: <Zap className="size-4" />,
        items: [
          { label: 'Electricity Regularity', value: `${data.electricityConsistency ?? 0}/100` },
          { label: 'Mobile Recharge Regularity', value: `${data.mobileRechargeConsistency ?? 0}/100` },
          { label: 'Utility Payment History', value: `${data.utilityPaymentHistory ?? 0}/100` },
          { label: 'Repayment History', value: `${data.repaymentHistory ?? 0}/100` },
        ],
      },
    ],
    [data],
  );

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {sections.map((section) => (
          <Card key={section.title}>
            <CardHeader className="pb-3 pt-4 px-4">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                {section.icon}
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="space-y-2">
                {section.items.map((item) => (
                  <div key={item.label} className="flex items-start justify-between gap-2">
                    <span className="text-xs text-muted-foreground shrink-0">{item.label}</span>
                    <span className="text-xs font-medium text-right break-all">{item.value || '—'}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Consent checkboxes */}
      <Separator />
      <div className="space-y-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Shield className="size-4 text-primary" />
          Consent & Declaration
        </h3>
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/30 p-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-300">
            <Shield className="size-4" />
            Important: Consent Required
          </p>
          <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
            Please read and accept all consent items below to proceed with your loan application.
          </p>
        </div>
        <ConsentCheckboxes />
      </div>
    </div>
  );
}

function ConsentCheckboxes() {
  const {
    control,
    formState: { errors },
  } = useFormContext<ApplicationFormData>();

  const items = [
    { name: 'consentCreditBureau' as const, label: 'I consent to credit bureau check', desc: 'Authorization to verify credit history through bureau databases' },
    { name: 'consentDataSharing' as const, label: 'I authorize data sharing with NBCFDC', desc: 'Your data will be shared securely with NBCFDC for loan processing' },
    { name: 'consentAccuracy' as const, label: 'I declare all information is accurate', desc: 'All details provided are true and complete to the best of my knowledge' },
  ];

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Controller
          key={item.name}
          name={item.name}
          control={control}
          render={({ field }) => (
            <div
              className={`flex items-start gap-3 rounded-lg border p-3 transition-colors cursor-pointer ${
                field.value
                  ? 'border-primary/40 bg-primary/5'
                  : errors[item.name]
                    ? 'border-destructive/40 bg-destructive/5'
                    : 'border-border hover:border-border/80'
              }`}
              onClick={() => field.onChange(!field.value)}
            >
              <Checkbox
                id={item.name}
                checked={!!field.value}
                onCheckedChange={(checked) => field.onChange(checked === true)}
                className="mt-0.5"
                onClick={(e) => e.stopPropagation()}
              />
              <div className="flex-1">
                <Label htmlFor={item.name} className="text-sm font-medium leading-snug cursor-pointer">
                  {item.label}
                </Label>
                <p className="mt-0.5 text-xs text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          )}
        />
      ))}
      {(errors.consentCreditBureau || errors.consentDataSharing || errors.consentAccuracy) && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-1.5 text-xs text-destructive font-medium"
        >
          <Shield className="size-3.5" />
          All consents are required to submit the application.
        </motion.p>
      )}
    </div>
  );
}

// ─── Success Overlay ─────────────────────────────────────────────────────────

function SuccessOverlay({
  score,
  appNumber,
  onClose,
}: {
  score: { totalScore: number; riskGrade: string };
  appNumber: string;
  onClose: () => void;
}) {
  const gradeColor = useMemo(() => {
    const grade = (score.riskGrade || '').toUpperCase();
    if (grade.includes('A') || grade.includes('B')) return 'text-emerald-600';
    if (grade.includes('C')) return 'text-amber-600';
    return 'text-red-600';
  }, [score.riskGrade]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className="mx-4 w-full max-w-md"
      >
        <Card className="p-6 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', damping: 15 }}
            className="mx-auto mb-4 flex size-20 items-center justify-center rounded-full bg-emerald-100"
          >
            <CheckCircle2 className="size-10 text-emerald-600" />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <h2 className="text-xl font-bold">Application Submitted!</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Application Number: <span className="font-mono font-semibold">{appNumber}</span>
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-6 space-y-4"
          >
            <div className="flex items-center justify-center gap-6">
              <div className="text-center">
                <p className="text-3xl font-bold font-mono">{score.totalScore}</p>
                <p className="text-xs text-muted-foreground">Credit Score</p>
              </div>
              <Separator orientation="vertical" className="h-12" />
              <div className="text-center">
                <p className={`text-3xl font-bold font-mono ${gradeColor}`}>{score.riskGrade}</p>
                <p className="text-xs text-muted-foreground">Risk Grade</p>
              </div>
            </div>

            <Badge className="bg-amber-100 text-amber-800">
              <Clock className="mr-1 size-3" />
              Pending Admin Review
            </Badge>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
            <p className="mt-4 text-xs text-muted-foreground">
              Your application will be reviewed by an administrator. Redirecting...
            </p>
          </motion.div>
        </Card>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Wizard ────────────────────────────────────────────────────────────

export function ApplicationWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    score: { totalScore: number; riskGrade: string; decisionType: string };
    appNumber: string;
  } | null>(null);

  const token = useAuthStore((s) => s.token);
  const navigate = useAppStore((s) => s.navigate);

  const form = useForm<ApplicationFormData>({
    resolver: zodResolver(fullSchema),
    defaultValues: {
      name: '',
      aadhaarNumber: '',
      panNumber: '',
      dateOfBirth: '',
      gender: '',
      category: '',
      educationLevel: '',
      maritalStatus: '',
      phone: '',
      email: '',
      address: '',
      state: '',
      district: '',
      pincode: '',
      occupation: '',
      monthlyIncome: undefined,
      bankName: '',
      bankAccount: '',
      bankIfsc: '',
      loanAmount: undefined,
      loanPurpose: '',
      loanTenure: undefined,
      schemeType: '',
      electricityConsistency: 50,
      mobileRechargeConsistency: 50,
      utilityPaymentHistory: 50,
      repaymentHistory: 50,
      consentCreditBureau: false,
      consentDataSharing: false,
      consentAccuracy: false,
    },
    mode: 'onBlur',
  });

  const validateCurrentStep = useCallback(
    async (step: number) => {
      const fields = STEP_FIELDS[step];
      if (!fields) return true;
      return form.trigger(fields as string[]);
    },
    [form],
  );

  const goNext = useCallback(async () => {
    const valid = await validateCurrentStep(currentStep);
    if (valid) {
      setDirection('forward');
      setCurrentStep((s) => Math.min(s + 1, 6));
    }
  }, [currentStep, validateCurrentStep]);

  const goBack = useCallback(() => {
    setDirection('backward');
    setCurrentStep((s) => Math.max(s - 1, 1));
  }, []);

  const handleSubmit = useCallback(async () => {
    // Validate the last step (consent)
    const valid = await validateCurrentStep(6);
    if (!valid) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const values = form.getValues();
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Submission failed' }));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      const responseData = await res.json();
      setSuccessResult({
        score: responseData.score,
        appNumber: responseData.application.applicationNumber,
      });

      // Navigate after 2 seconds
      setTimeout(() => {
        navigate('application-detail', { id: responseData.application.id });
      }, 2000);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  }, [form, token, validateCurrentStep, navigate]);

  const progressValue = ((currentStep - 1) / 5) * 100;

  const stepVariants = {
    enter: (dir: 'forward' | 'backward') => ({
      x: dir === 'forward' ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: 'forward' | 'backward') => ({
      x: dir === 'forward' ? -300 : 300,
      opacity: 0,
    }),
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New Loan Application</h1>
        <p className="text-sm text-muted-foreground">Complete all steps to submit</p>
      </div>

      {/* Progress Bar */}
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          {/* Step indicators */}
          <div className="mb-3 flex items-center justify-between">
            {STEPS.map((step) => {
              const StepIcon = step.icon;
              const isCompleted = step.id < currentStep;
              const isCurrent = step.id === currentStep;
              return (
                <div key={step.id} className="flex flex-1 flex-col items-center">
                  <div
                    className={`flex size-8 items-center justify-center rounded-full border-2 transition-colors ${
                      isCompleted
                        ? 'border-teal-500 bg-teal-500 text-white'
                        : isCurrent
                          ? 'border-teal-500 bg-white text-teal-600'
                          : 'border-muted-foreground/30 bg-muted text-muted-foreground'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="size-4" />
                    ) : (
                      <StepIcon className="size-4" />
                    )}
                  </div>
                  <span
                    className={`mt-1 hidden text-[10px] font-medium sm:block ${
                      isCompleted || isCurrent ? 'text-teal-600' : 'text-muted-foreground'
                    }`}
                  >
                    {step.name}
                  </span>
                </div>
              );
            })}
          </div>
          <Progress value={progressValue} className="h-2" />
          <p className="mt-1.5 text-center text-xs text-muted-foreground">
            Step {currentStep} of 6 — {STEPS[currentStep - 1].name}
          </p>
        </CardContent>
      </Card>

      {/* Step Card */}
      <Form {...form}>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            {(() => {
              const StepIcon = STEPS[currentStep - 1].icon;
              return <StepIcon className="size-5 text-teal-600" />;
            })()}
            {STEPS[currentStep - 1].name}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: 'easeInOut' }}
            >
              {currentStep === 1 && <PersonalInfoStep />}
              {currentStep === 2 && <AddressStep />}
              {currentStep === 3 && <IncomeStep />}
              {currentStep === 4 && <LoanDetailsStep />}
              {currentStep === 5 && <ConsumptionStep />}
              {currentStep === 6 && <ReviewStep />}
            </motion.div>
          </AnimatePresence>

          {submitError && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
            >
              {submitError}
            </motion.div>
          )}
        </CardContent>
      </Card>
      </Form>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={goBack}
          disabled={currentStep === 1 || isSubmitting}
        >
          <ArrowLeft className="mr-2 size-4" />
          Back
        </Button>

        <div className="flex gap-2">
          {currentStep < 6 ? (
            <Button type="button" onClick={goNext} disabled={isSubmitting}>
              Next
              <ArrowRight className="ml-2 size-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Shield className="mr-2 size-4" />
                  Submit Application
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Loading overlay */}
      <AnimatePresence>
        {isSubmitting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/40 backdrop-blur-sm"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <Loader2 className="size-10 text-white" />
            </motion.div>
            <p className="text-sm font-medium text-white">Processing application...</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success overlay */}
      {successResult && (
        <SuccessOverlay
          score={successResult.score}
          appNumber={successResult.appNumber}
          onClose={() => setSuccessResult(null)}
        />
      )}
    </div>
  );
}

export default ApplicationWizard;
