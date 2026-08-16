// ═══════════════════════════════════════════════════════════════
// Arogya FinScore - Database Seed Script
// ═══════════════════════════════════════════════════════════════

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const ROLES = ['super_admin', 'analyst', 'partner', 'beneficiary', 'auditor'] as const;

// ── Users ─────────────────────────────────────────────────────────
const USERS = [
  { email: 'admin@arogya.in', name: 'Rajesh Kumar', role: 'super_admin', password: 'admin123' },
  { email: 'analyst@arogya.in', name: 'Priya Sharma', role: 'analyst', password: 'analyst123' },
  { email: 'partner@arogya.in', name: 'Amit Patel', role: 'partner', password: 'partner123' },
  { email: 'auditor@arogya.in', name: 'Sunita Devi', role: 'auditor', password: 'auditor123' },
  { email: 'analyst2@arogya.in', name: 'Vikram Singh', role: 'analyst', password: 'analyst123' },
];

// ── Channel Partners ──────────────────────────────────────────────
const PARTNERS = [
  { name: 'Gram Vikas NGO', code: 'GVNGO001', type: 'NGO', state: 'Maharashtra', district: 'Nagpur', contactName: 'Ramesh Jadhav', contactPhone: '9876543210', contactEmail: 'ramesh@gvngo.org' },
  { name: 'Self Help Group Federation', code: 'SHGFED002', type: 'SHG', state: 'Karnataka', district: 'Bangalore', contactName: 'Lakshmi N.', contactPhone: '9876543211', contactEmail: 'lakshmi@shgfed.in' },
  { name: 'Regional Rural Bank', code: 'RRB003', type: 'Bank', state: 'Tamil Nadu', district: 'Madurai', contactName: 'Karthik R.', contactPhone: '9876543212', contactEmail: 'karthik@rrb.co.in' },
  { name: 'Micro Finance India', code: 'MFI004', type: 'MFI', state: 'Rajasthan', district: 'Jaipur', contactName: 'Dinesh M.', contactPhone: '9876543213', contactEmail: 'dinesh@mfiindia.in' },
  { name: 'Sabla Sangathan', code: 'SABLA005', type: 'NGO', state: 'UP', district: 'Lucknow', contactName: 'Meera Devi', contactPhone: '9876543214', contactEmail: 'meera@sabla.org' },
];

// ── Beneficiaries ─────────────────────────────────────────────────
const FIRST_NAMES = ['Ravi', 'Sunita', 'Arun', 'Priya', 'Mohan', 'Lakshmi', 'Suresh', 'Kavita', 'Rajesh', 'Geeta', 'Vijay', 'Anita', 'Ashok', 'Pooja', 'Deepak', 'Suman', 'Manoj', 'Rekha', 'Sanjay', 'Neeta', 'Ramesh', 'Shanti', 'Anil', 'Kamla', 'Prakash', 'Bimla', 'Gopal', 'Saroj', 'Naresh', 'Pushpa'];
const LAST_NAMES = ['Kumar', 'Devi', 'Singh', 'Sharma', 'Patel', 'Yadav', 'Gupta', 'Reddy', 'Nair', 'Jadhav', 'Mehta', 'Das', 'Verma', 'Chauhan', 'Pandey', 'Mishra', 'Rao', 'Iyer', 'Nair', 'Kulkarni'];
const STATES = ['Maharashtra', 'Karnataka', 'Tamil Nadu', 'Gujarat', 'Rajasthan', 'Madhya Pradesh', 'Uttar Pradesh', 'Bihar', 'Odisha', 'West Bengal', 'Kerala', 'Telangana', 'Andhra Pradesh', 'Punjab', 'Haryana'];
const DISTRICTS: Record<string, string[]> = {
  'Maharashtra': ['Nagpur', 'Pune', 'Mumbai', 'Nashik', 'Aurangabad'],
  'Karnataka': ['Bangalore', 'Mysore', 'Hubli', 'Mangalore'],
  'Tamil Nadu': ['Madurai', 'Chennai', 'Coimbatore', 'Salem'],
  'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot'],
  'Rajasthan': ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota'],
  'Madhya Pradesh': ['Bhopal', 'Indore', 'Jabalpur', 'Gwalior'],
  'Uttar Pradesh': ['Lucknow', 'Varanasi', 'Agra', 'Allahabad'],
  'Bihar': ['Patna', 'Gaya', 'Muzaffarpur', 'Bhagalpur'],
  'Odisha': ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Sambalpur'],
  'West Bengal': ['Kolkata', 'Howrah', 'Durgapur', 'Siliguri'],
  'Kerala': ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur'],
  'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar'],
  'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Tirupati'],
  'Punjab': ['Amritsar', 'Ludhiana', 'Jalandhar', 'Patiala'],
  'Haryana': ['Gurgaon', 'Faridabad', 'Panipat', 'Ambala'],
};
const CATEGORIES = ['SC', 'ST', 'OBC', 'General'];
const OCCUPATIONS = ['Agriculture', 'Small Business', 'Handloom', 'Petty Trade', 'Daily Wage', 'Self-Employed', 'Artisan', 'Fishery', 'Dairy Farming', 'Tailoring'];
const EDUCATION_LEVELS = ['Illiterate', 'Primary', 'Secondary', 'Higher Secondary', 'Graduate', 'Post Graduate'];
const SCHEMES = ['NBCFDC', 'NMDFC', 'NSKFDC', 'NHDFC', 'NBCFDC-Term Loan'];
const PURPOSES = ['Agriculture Equipment', 'Small Business Setup', 'Education', 'Medical Emergency', 'Housing Improvement', 'Livestock Purchase', 'Handloom Equipment', 'Vehicle Purchase', 'Working Capital', 'Debt Consolidation'];
const STATUSES = ['draft', 'submitted', 'scoring', 'under_review', 'approved', 'rejected', 'sanctioned', 'disbursed', 'closed', 'defaulted'];
const GRADES = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D'];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}
function generateAppNumber(): string {
  return `AFS-${new Date().getFullYear()}-${String(randomBetween(10000, 99999))}`;
}
function generateAadhaar(): string {
  return String(randomBetween(1000, 9999)) + ' ' + String(randomBetween(1000, 9999)) + ' ' + String(randomBetween(1000, 9999));
}
function generatePhone(): string {
  return '9' + String(randomBetween(1000000000, 9999999999));
}
function generateIfsc(): string {
  const banks = ['SBIN', 'PUNB', 'BARB', 'CNRB', 'UBIN', 'IOBA', 'BKID', 'MAHB', 'HDFC', 'ICIC'];
  return `${randomFrom(banks)}0${String(randomBetween(100000, 999999))}`;
}

// ── SHAP Values Generator ──────────────────────────────────────────
function generateSHAPValues(totalScore: number): { feature: string; value: number; shapValue: number; direction: 'positive' | 'negative' }[] {
  const baseValue = 50;
  const diff = totalScore - baseValue;
  const features = [
    { feature: 'repaymentHistory', base: 60, weight: 0.18 },
    { feature: 'monthlyIncome', base: 15000, weight: 0.16 },
    { feature: 'debtToIncome', base: 40, weight: 0.14 },
    { feature: 'employmentStability', base: 50, weight: 0.10 },
    { feature: 'creditUtilization', base: 45, weight: 0.10 },
    { feature: 'electricityConsistency', base: 50, weight: 0.08 },
    { feature: 'mobileRechargeConsistency', base: 60, weight: 0.06 },
    { feature: 'utilityPaymentHistory', base: 50, weight: 0.05 },
    { feature: 'educationLevel', base: 2, weight: 0.04 },
    { feature: 'accountAge', base: 3, weight: 0.04 },
    { feature: 'previousDefaults', base: 0, weight: -0.05 },
  ];
  
  let totalWeight = features.reduce((s, f) => s + Math.abs(f.weight), 0);
  return features.map(f => {
    const rawContribution = ((totalScore / 100 - 0.5) * f.weight * (diff > 0 ? 1 : 1)) + (Math.random() - 0.5) * 2;
    const shapVal = Math.round(rawContribution * 100) / 100;
    return {
      feature: f.feature,
      value: f.feature === 'repaymentHistory' ? randomBetween(30, 95) :
             f.feature === 'monthlyIncome' ? randomBetween(8000, 50000) :
             f.feature === 'debtToIncome' ? randomBetween(10, 70) :
             f.feature === 'employmentStability' ? randomBetween(20, 90) :
             f.feature === 'creditUtilization' ? randomBetween(15, 75) :
             f.feature === 'electricityConsistency' ? randomBetween(30, 95) :
             f.feature === 'mobileRechargeConsistency' ? randomBetween(40, 98) :
             f.feature === 'utilityPaymentHistory' ? randomBetween(25, 90) :
             f.feature === 'educationLevel' ? randomBetween(0, 5) :
             f.feature === 'accountAge' ? randomBetween(1, 12) :
             f.feature === 'previousDefaults' ? randomBetween(0, 3) : 0,
      shapValue: shapVal,
      direction: shapVal >= 0 ? 'positive' as const : 'negative' as const,
    };
  }).sort((a, b) => Math.abs(b.shapValue) - Math.abs(a.shapValue));
}

// ── Feature Weights ────────────────────────────────────────────────
function generateFeatureWeights(): Record<string, number> {
  return {
    repaymentHistory: 22, monthlyIncome: 18, debtToIncome: 14,
    employmentStability: 10, creditUtilization: 10, electricityConsistency: 8,
    mobileRechargeConsistency: 6, utilityPaymentHistory: 5, educationLevel: 4,
    accountAge: 3, previousDefaults: 0,
  };
}

// ── Main Seed ──────────────────────────────────────────────────────
async function main() {
  console.log('🌱 Seeding Arogya FinScore database...');
  
  // Clean existing data
  await prisma.manualOverride.deleteMany();
  await prisma.creditDecision.deleteMany();
  await prisma.creditScore.deleteMany();
  await prisma.repayment.deleteMany();
  await prisma.document.deleteMany();
  await prisma.consumptionData.deleteMany();
  await prisma.loanApplication.deleteMany();
  await prisma.beneficiary.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.session.deleteMany();
  await prisma.modelPerformance.deleteMany();
  await prisma.fairnessMetric.deleteMany();
  await prisma.featureFlag.deleteMany();
  await prisma.dataRetention.deleteMany();
  await prisma.channelPartner.deleteMany();
  await prisma.user.deleteMany();
  
  console.log('  ✅ Cleared existing data');
  
  // 1. Create Users
  const users = [];
  for (const u of USERS) {
    const hash = await bcrypt.hash(u.password, 12);
    const user = await prisma.user.create({
      data: {
        email: u.email,
        name: u.name,
        passwordHash: hash,
        role: u.role,
        isActive: true,
        lastLoginAt: randomDate(new Date('2024-12-01'), new Date()),
      },
    });
    users.push(user);
  }
  console.log(`  ✅ Created ${users.length} users`);
  
  // 2. Create Channel Partners
  const partners = [];
  for (const p of PARTNERS) {
    const partner = await prisma.channelPartner.create({
      data: { ...p, isActive: true, totalReferrals: randomBetween(5, 50) },
    });
    partners.push(partner);
  }
  console.log(`  ✅ Created ${partners.length} channel partners`);
  
  // 3. Create Beneficiaries
  const beneficiaries = [];
  for (let i = 0; i < 80; i++) {
    const state = randomFrom(STATES);
    const district = randomFrom(DISTRICTS[state] || [state]);
    const category = randomFrom(CATEGORIES);
    const dob = randomDate(new Date('1960-01-01'), new Date('2002-12-31'));
    const age = Math.floor((new Date().getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    const monthlyIncome = randomBetween(5000, 55000);
    const creditScore = randomBetween(18, 95);
    
    let riskGrade = 'D';
    if (creditScore >= 82) riskGrade = 'A+';
    else if (creditScore >= 72) riskGrade = 'A';
    else if (creditScore >= 62) riskGrade = 'B+';
    else if (creditScore >= 50) riskGrade = 'B';
    else if (creditScore >= 38) riskGrade = 'C+';
    else if (creditScore >= 25) riskGrade = 'C';
    
    const partner = randomFrom(partners);
    const b = await prisma.beneficiary.create({
      data: {
        aadhaarNumber: generateAadhaar(),
        aadhaarName: `${randomFrom(FIRST_NAMES)} ${randomFrom(LAST_NAMES)}`,
        panNumber: `${randomFrom(LAST_NAMES).toUpperCase().slice(0,4)}${String.fromCharCode(65+randomBetween(0,25))}${randomBetween(1000,9999)}${String.fromCharCode(65+randomBetween(0,25))}`,
        dateOfBirth: dob,
        gender: randomFrom(['Male', 'Female']),
        category,
        state,
        district,
        pincode: String(randomBetween(100000, 999999)),
        address: `${randomBetween(1,200)}, ${randomFrom(['Main Road', 'Station Road', 'Market Street', 'Temple Road', 'Lake Road'])}, ${district}`,
        phone: generatePhone(),
        email: null,
        occupation: randomFrom(OCCUPATIONS),
        annualIncome: monthlyIncome * 12,
        monthlyIncome,
        educationLevel: randomFrom(EDUCATION_LEVELS),
        maritalStatus: randomFrom(['Single', 'Married', 'Widowed', 'Divorced']),
        bankAccount: String(randomBetween(1000000000, 9999999999)),
        bankName: randomFrom(['State Bank of India', 'Punjab National Bank', 'Bank of Baroda', 'Canara Bank', 'Union Bank', 'HDFC Bank', 'ICICI Bank']),
        bankIfsc: generateIfsc(),
        creditScore,
        riskGrade,
        consentGiven: Math.random() > 0.15,
        consentDate: Math.random() > 0.15 ? randomDate(new Date('2024-01-01'), new Date()) : null,
        partnerId: partner.id,
      },
    });
    beneficiaries.push(b);
  }
  console.log(`  ✅ Created ${beneficiaries.length} beneficiaries`);
  
  // 4. Create Loan Applications with Scores
  const applications = [];
  const statusWeights: Record<string, number> = {
    'disbursed': 25, 'approved': 15, 'sanctioned': 10, 'closed': 12,
    'under_review': 10, 'scoring': 8, 'submitted': 8,
    'rejected': 8, 'defaulted': 2, 'draft': 2,
  };
  const statusPool = Object.entries(statusWeights).flatMap(([s, w]) => Array(w).fill(s));
  
  for (let i = 0; i < 65; i++) {
    const beneficiary = randomFrom(beneficiaries);
    const status = randomFrom(statusPool);
    const loanAmount = randomBetween(20000, 300000);
    const tenure = randomFrom([12, 18, 24, 36, 48]);
    const interestRate = randomBetween(8, 14) + randomBetween(0, 99) / 100;
    const emi = Math.round((loanAmount * (interestRate / 100 / 12) * Math.pow(1 + interestRate / 100 / 12, tenure)) / (Math.pow(1 + interestRate / 100 / 12, tenure) - 1));
    const schemeType = randomFrom(SCHEMES);
    const createdAt = randomDate(new Date('2024-06-01'), new Date());
    
    const app = await prisma.loanApplication.create({
      data: {
        applicationNumber: generateAppNumber(),
        beneficiaryId: beneficiary.id,
        loanAmount,
        loanPurpose: randomFrom(PURPOSES),
        loanTenure: tenure,
        interestRate,
        emiAmount: emi,
        status,
        submittedAt: status !== 'draft' ? createdAt : null,
        decisionAt: ['approved', 'rejected', 'sanctioned', 'disbursed', 'closed', 'defaulted'].includes(status) ? new Date(createdAt.getTime() + randomBetween(1, 5) * 86400000) : null,
        sanctionedAt: ['sanctioned', 'disbursed', 'closed'].includes(status) ? new Date(createdAt.getTime() + randomBetween(2, 7) * 86400000) : null,
        disbursedAt: ['disbursed', 'closed', 'defaulted'].includes(status) ? new Date(createdAt.getTime() + randomBetween(3, 10) * 86400000) : null,
        closedAt: status === 'closed' ? new Date(createdAt.getTime() + randomBetween(180, 365) * 86400000) : null,
        rejectionReason: status === 'rejected' ? randomFrom(['Low credit score', 'Insufficient income', 'High debt-to-income ratio', 'Incomplete documentation', 'Previous default history']) : null,
        modelVersion: 'v2.4.1-ensemble',
        schemeType,
        channelPartnerId: beneficiary.partnerId,
        createdAt,
      },
    });
    applications.push(app);
    
    // Create credit score for non-draft applications
    if (status !== 'draft') {
      const totalScore = beneficiary.creditScore + randomBetween(-8, 8);
      const xgb = totalScore + randomBetween(-5, 5);
      const catb = totalScore + randomBetween(-5, 5);
      const df = totalScore + randomBetween(-5, 5);
      const confidence = randomBetween(55, 98);
      
      let grade = 'D';
      const s = Math.max(0, Math.min(100, totalScore));
      if (s >= 82) grade = 'A+';
      else if (s >= 72) grade = 'A';
      else if (s >= 62) grade = 'B+';
      else if (s >= 50) grade = 'B';
      else if (s >= 38) grade = 'C+';
      else if (s >= 25) grade = 'C';
      
      await prisma.creditScore.create({
        data: {
          applicationId: app.id,
          totalScore: s,
          confidenceScore: confidence,
          riskGrade: grade,
          modelVersion: 'v2.4.1-ensemble',
          xgboostScore: Math.max(0, Math.min(100, xgb)),
          catboostScore: Math.max(0, Math.min(100, catb)),
          deepForestScore: Math.max(0, Math.min(100, df)),
          repaymentScore: randomBetween(20, 95),
          consumptionScore: randomBetween(15, 90),
          featureWeights: JSON.stringify(generateFeatureWeights()),
          shapValues: JSON.stringify(generateSHAPValues(s)),
          scoredAt: new Date(createdAt.getTime() + randomBetween(0, 2) * 86400000),
        },
      });
      
      // Create decision for decided applications
      if (['approved', 'rejected', 'sanctioned', 'disbursed', 'closed', 'defaulted'].includes(status)) {
        const analyst = users.find(u => u.role === 'analyst') || users[0];
        await prisma.creditDecision.create({
          data: {
            applicationId: app.id,
            decisionType: status === 'rejected' ? 'reject' : status === 'under_review' ? 'manual_review' : 'auto_approve',
            decisionReason: status === 'rejected' ? app.rejectionReason || 'Below threshold' : `Approved with grade ${grade}`,
            analystId: analyst.id,
            approvedAmount: status !== 'rejected' ? loanAmount : null,
            approvedTenure: status !== 'rejected' ? tenure : null,
            approvedRate: status !== 'rejected' ? interestRate : null,
            conditions: status !== 'rejected' ? JSON.stringify(['Monthly income verification required', 'EMI payment through auto-debit']) : null,
            createdAt: new Date(createdAt.getTime() + randomBetween(1, 5) * 86400000),
          },
        });
      }
    }
    
    // Create repayments for disbursed/closed/defaulted loans
    if (['disbursed', 'closed', 'defaulted'].includes(status)) {
      for (let e = 1; e <= Math.min(tenure, status === 'defaulted' ? randomBetween(3, 8) : tenure); e++) {
        const dueDate = new Date(app.disbursedAt!.getTime() + e * 30 * 86400000);
        const isOverdue = dueDate < new Date();
        const isDefaulted = status === 'defaulted' && e > randomBetween(2, 6);
        await prisma.repayment.create({
          data: {
            applicationId: app.id,
            emiNumber: e,
            dueDate,
            dueAmount: emi,
            paidAmount: (!isDefaulted && isOverdue) || status === 'closed' ? emi : isDefaulted ? null : (Math.random() > 0.1 ? emi : null),
            paidDate: (!isDefaulted && isOverdue) || status === 'closed' ? new Date(dueDate.getTime() + randomBetween(-3, 5) * 86400000) : null,
            status: isDefaulted ? 'default' : (!isDefaulted && isOverdue) || status === 'closed' ? 'paid' : dueDate < new Date() ? 'overdue' : 'pending',
            daysOverdue: isDefaulted ? randomBetween(30, 180) : (isOverdue && !isDefaulted ? randomBetween(0, 15) : 0),
          },
        });
      }
    }
    
    // Create documents
    const docTypes = ['aadhaar', 'pan', 'bank_statement', 'electricity_bill', 'income_proof', 'photo'];
    for (const docType of docTypes.slice(0, randomBetween(2, 6))) {
      await prisma.document.create({
        data: {
          applicationId: app.id,
          beneficiaryId: beneficiary.id,
          type: docType,
          fileName: `${docType}_${beneficiary.aadhaarName?.replace(/\s/g, '_') || 'doc'}.pdf`,
          ocrConfidence: randomBetween(75, 99) / 100,
          status: randomFrom(['pending', 'verified', 'verified', 'verified']),
          verifiedBy: randomFrom(users.filter(u => u.role === 'analyst')).id,
          verifiedAt: Math.random() > 0.3 ? randomDate(new Date('2024-06-01'), new Date()) : null,
        },
      });
    }
  }
  console.log(`  ✅ Created ${applications.length} applications with scores, decisions, repayments, and documents`);
  
  // 5. Create consumption data for beneficiaries
  for (const b of beneficiaries.slice(0, 50)) {
    const types = ['electricity', 'mobile', 'dth', 'gas', 'water'];
    for (const type of types.slice(0, randomBetween(2, 5))) {
      const months = randomBetween(6, 12);
      const payments = [];
      for (let m = 0; m < months; m++) {
        payments.push({
          month: `2024-${String(m + 1).padStart(2, '0')}`,
          amount: type === 'electricity' ? randomBetween(200, 2000) :
                  type === 'mobile' ? randomBetween(100, 600) :
                  type === 'dth' ? randomBetween(150, 500) :
                  type === 'gas' ? randomBetween(400, 900) :
                  randomBetween(50, 300),
          paidOnTime: Math.random() > 0.2,
        });
      }
      await prisma.consumptionData.create({
        data: {
          beneficiaryId: b.id,
          type,
          provider: type === 'electricity' ? randomFrom(['MSEDCL', 'BESCOM', 'TNEB', 'PGVCL', 'JVVNL']) :
                   type === 'mobile' ? randomFrom(['Jio', 'Airtel', 'Vi', 'BSNL']) :
                   type === 'dth' ? randomFrom(['Tata Play', 'Airtel DTH', 'Dish TV']) :
                   type === 'gas' ? randomFrom(['HP Gas', 'Bharat Gas', 'Indane']) :
                   randomFrom(['Municipal', 'Private']),
          monthlySpend: payments.reduce((s, p) => s + p.amount, 0) / months,
          paymentHistory: JSON.stringify(payments),
          consistency: payments.filter(p => p.paidOnTime).length / payments.length,
          dataQuality: randomBetween(0.6, 0.99),
          period: '2024-01 to 2024-12',
        },
      });
    }
  }
  console.log(`  ✅ Created consumption data for beneficiaries`);
  
  // 6. Create Audit Logs
  const actions = ['LOGIN', 'VIEW_APPLICATION', 'SCORE_APPLICATION', 'APPROVE_APPLICATION', 'REJECT_APPLICATION', 'VIEW_BENEFICIARY', 'EXPORT_REPORT', 'UPDATE_USER', 'OVERRIDE_DECISION', 'UPLOAD_DOCUMENT'];
  for (let i = 0; i < 120; i++) {
    const user = randomFrom(users);
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: randomFrom(actions),
        resource: randomFrom(['application', 'beneficiary', 'user', 'report', 'system']),
        details: JSON.stringify({
          applicationId: randomFrom(applications)?.applicationNumber,
          role: user.role,
          timestamp: new Date().toISOString(),
        }),
        ipAddress: `192.168.${randomBetween(1,255)}.${randomBetween(1,255)}`,
        createdAt: randomDate(new Date('2024-06-01'), new Date()),
      },
    });
  }
  console.log(`  ✅ Created 120 audit logs`);
  
  // 7. Model Performance metrics
  const metrics = ['f1', 'precision', 'recall', 'auc_roc', 'accuracy'];
  const versions = ['v2.3.0', 'v2.3.1', 'v2.4.0', 'v2.4.1-ensemble'];
  for (const version of versions) {
    for (const metric of metrics) {
      const baseVal = metric === 'auc_roc' ? 0.88 : metric === 'accuracy' ? 0.85 : 0.80;
      await prisma.modelPerformance.create({
        data: {
          modelVersion: version,
          metricName: metric,
          metricValue: baseVal + Math.random() * 0.12,
          evaluatedAt: randomDate(new Date('2024-01-01'), new Date()),
          datasetSplit: randomFrom(['train', 'validation', 'test']),
        },
      });
    }
  }
  console.log(`  ✅ Created model performance metrics`);
  
  // 8. Fairness Metrics
  const fairnessMetrics = ['disparate_impact', 'equal_opportunity', 'demographic_parity'];
  for (const version of versions.slice(-2)) {
    for (const fm of fairnessMetrics) {
      await prisma.fairnessMetric.create({
        data: {
          modelVersion: version,
          protectedAttr: randomFrom(['gender', 'category', 'state']),
          metricName: fm,
          metricValue: 0.75 + Math.random() * 0.25,
          groupA: randomFrom(['Male', 'General', 'Maharashtra']),
          groupB: randomFrom(['Female', 'SC/ST', 'Bihar']),
        },
      });
    }
  }
  console.log(`  ✅ Created fairness metrics`);
  
  // 9. Feature Flags
  await prisma.featureFlag.createMany({
    data: [
      { name: 'auto_approve_threshold_65', description: 'Auto-approve applications with score >= 65', isEnabled: true },
      { name: 'consumption_scoring', description: 'Include consumption-based income verification in scoring', isEnabled: true },
      { name: 'shap_explainability', description: 'Enable SHAP-based explainability for all decisions', isEnabled: true },
      { name: 'same_day_sanctioning', description: 'Enable same-day loan sanctioning pipeline', isEnabled: true },
      { name: 'manual_override_v2', description: 'Allow analysts to override AI decisions with reason logging', isEnabled: true },
      { name: 'dark_mode', description: 'Enable dark mode for the platform', isEnabled: true },
      { name: 'bulk_upload_v2', description: 'Enable bulk CSV/Excel upload for channel partners', isEnabled: false },
      { name: 'digilocker_integration', description: 'DigiLocker integration for document verification', isEnabled: false },
    ],
  });
  console.log(`  ✅ Created feature flags`);
  
  console.log('\n🎉 Seed completed successfully!');
  console.log(`   Users: ${users.length} | Partners: ${partners.length} | Beneficiaries: ${beneficiaries.length} | Applications: ${applications.length}`);
}

main()
  .catch((e) => { console.error('Seed error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
