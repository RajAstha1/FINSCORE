import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const [userCount, appCount, beneficiaryCount] = await Promise.all([
      db.user.count(),
      db.loanApplication.count(),
      db.beneficiary.count(),
    ]);

    return NextResponse.json({
      name: 'Arogya FinScore API',
      version: '1.0.0',
      status: 'operational',
      endpoints: {
        auth: { login: '/api/auth/login', logout: '/api/auth/logout', me: '/api/auth/me' },
        applications: '/api/applications',
        beneficiaries: '/api/beneficiaries',
        dashboard: '/api/dashboard',
        scoring: '/api/scoring',
        audit: '/api/audit',
        monitoring: '/api/monitoring',
        fairness: '/api/fairness',
        reports: '/api/reports',
        partner: '/api/partner',
        admin: { users: '/api/admin/users', featureFlags: '/api/admin/feature-flags' },
      },
      stats: { users: userCount, applications: appCount, beneficiaries: beneficiaryCount },
    });
  } catch {
    return NextResponse.json({ name: 'Arogya FinScore API', version: '1.0.0', status: 'operational' });
  }
}
