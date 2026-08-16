import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const [totalApps, approvedApps, rejectedApps, pendingApps, totalDisbursed, avgScore] = await Promise.all([
      db.loanApplication.count(),
      db.loanApplication.count({ where: { status: { in: ['approved', 'sanctioned', 'disbursed'] } } }),
      db.loanApplication.count({ where: { status: 'rejected' } }),
      db.loanApplication.count({ where: { status: { in: ['submitted', 'scoring', 'under_review'] } } }),
      db.loanApplication.aggregate({ where: { status: 'disbursed' }, _sum: { loanAmount: true } }),
      db.creditScore.aggregate({ _avg: { totalScore: true } }),
    ]);

    // Recent applications
    const recentApps = await db.loanApplication.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        beneficiary: { select: { aadhaarName: true, state: true } },
        scores: { take: 1, orderBy: { scoredAt: 'desc' } },
      },
    });

    // Status distribution
    const statusDistribution = await db.loanApplication.groupBy({
      by: ['status'],
      _count: true,
    });

    // Grade distribution
    const gradeDistribution = await db.creditScore.groupBy({
      by: ['riskGrade'],
      _count: true,
    });

    // Monthly trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const monthlyTrend = await db.loanApplication.groupBy({
      by: ['status'],
      where: { createdAt: { gte: sixMonthsAgo } },
      _count: true,
    });

    const approvalRate = totalApps > 0 ? Math.round((approvedApps / totalApps) * 100) : 0;
    const defaultRisk = totalApps > 0 ? Math.round((rejectedApps / totalApps) * 100) : 0;

    return NextResponse.json({
      summary: {
        totalApplications: totalApps,
        approvedApplications: approvedApps,
        rejectedApplications: rejectedApps,
        pendingApplications: pendingApps,
        totalDisbursedAmount: totalDisbursed._sum.loanAmount || 0,
        averageCreditScore: Math.round(avgScore._avg.totalScore || 0),
        approvalRate,
        defaultRisk,
      },
      recentApplications: recentApps,
      statusDistribution,
      gradeDistribution,
      monthlyTrend,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: 'Dashboard fetch failed' }, { status: 500 });
  }
}
