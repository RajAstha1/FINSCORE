import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '6months';

    const startDate = new Date();
    switch (period) {
      case '1month': startDate.setMonth(startDate.getMonth() - 1); break;
      case '3months': startDate.setMonth(startDate.getMonth() - 3); break;
      case '6months': startDate.setMonth(startDate.getMonth() - 6); break;
      case '1year': startDate.setFullYear(startDate.getFullYear() - 1); break;
      default: startDate.setFullYear(2020, 0, 1); break;
    }

    // 1. Disbursement Trends by status
    const disbursementTrend = await db.loanApplication.groupBy({
      by: ['status'],
      where: { createdAt: { gte: startDate } },
      _count: true,
      _sum: { loanAmount: true },
    });

    // 2. Portfolio Quality
    const [disbursedApps, defaultedApps, totalDisbursed, totalRecovered] = await Promise.all([
      db.loanApplication.count({ where: { status: 'disbursed', createdAt: { gte: startDate } } }),
      db.loanApplication.count({ where: { status: 'defaulted', createdAt: { gte: startDate } } }),
      db.loanApplication.aggregate({
        where: { status: 'disbursed', createdAt: { gte: startDate } },
        _sum: { loanAmount: true },
      }),
      db.repayment.aggregate({
        where: { status: 'paid' },
        _sum: { paidAmount: true },
      }),
    ]);

    // Repayment performance
    const repaymentStats = await db.repayment.groupBy({
      by: ['status'],
      _count: true,
      _sum: { dueAmount: true, paidAmount: true },
    });

    const totalDue = repaymentStats.reduce((sum, r) => sum + (r._sum.dueAmount || 0), 0);
    const totalPaid = repaymentStats
      .filter((r) => r.status === 'paid')
      .reduce((sum, r) => sum + (r._sum.paidAmount || 0), 0);
    const overdueAmount = repaymentStats
      .filter((r) => r.status === 'overdue' || r.status === 'default')
      .reduce((sum, r) => sum + (r._sum.dueAmount || 0), 0);

    // 3. State-wise Statistics (using ORM instead of raw)
    const stateStats = await db.beneficiary.groupBy({
      by: ['state'],
      where: { state: { not: null } },
      _count: true,
    });

    // Get applications grouped by beneficiary state
    const appsByState = await db.loanApplication.findMany({
      where: { createdAt: { gte: startDate } },
      include: {
        beneficiary: { select: { state: true } },
        scores: { take: 1, orderBy: { scoredAt: 'desc' }, select: { totalScore: true } },
      },
    });

    // Aggregate state data in JS
    const stateMap = new Map<string, { totalLoans: number; totalAmount: number; scoreSum: number }>();
    for (const app of appsByState) {
      const state = app.beneficiary?.state || 'Unknown';
      const entry = stateMap.get(state) || { totalLoans: 0, totalAmount: 0, scoreSum: 0 };
      entry.totalLoans++;
      entry.totalAmount += app.loanAmount;
      if (app.scores[0]?.totalScore) entry.scoreSum += app.scores[0].totalScore;
      stateMap.set(state, entry);
    }
    const stateLoanData = Array.from(stateMap.entries()).map(([state, data]) => ({
      state,
      totalLoans: data.totalLoans,
      totalAmount: data.totalAmount,
      avgScore: data.totalLoans > 0 ? Math.round(data.scoreSum / data.totalLoans) : 0,
    })).sort((a, b) => b.totalAmount - a.totalAmount);

    // 4. Scheme Distribution
    const schemeDistribution = await db.loanApplication.groupBy({
      by: ['schemeType'],
      where: { schemeType: { not: null } },
      _count: true,
      _sum: { loanAmount: true },
    });

    // 5. Risk Grade Distribution
    const gradeStats = await db.creditScore.groupBy({
      by: ['riskGrade'],
      _count: true,
    });
    const gradeWithScores = await db.creditScore.groupBy({
      by: ['riskGrade'],
      _avg: { totalScore: true },
    });
    const gradeScoreMap = new Map(gradeWithScores.map(g => [g.riskGrade, g._avg.totalScore || 0]));

    const gradeOrder: Record<string, number> = { 'A+': 1, 'A': 2, 'B+': 3, 'B': 4, 'C+': 5, 'C': 6, 'D': 7 };
    const gradeDistribution = gradeStats
      .map(g => ({
        riskGrade: g.riskGrade,
        count: g._count,
        avgScore: Math.round(gradeScoreMap.get(g.riskGrade) || 0),
        totalAmount: 0, // computed below
      }))
      .sort((a, b) => (gradeOrder[a.riskGrade] || 99) - (gradeOrder[b.riskGrade] || 99));

    // Compute grade amounts
    for (const app of appsByState) {
      if (app.scores[0]) {
        const grade = gradeDistribution.find(g => g.riskGrade === app.scores[0]!.riskGrade);
        if (grade) grade.totalAmount += app.loanAmount;
      }
    }

    // 6. Category-wise analysis
    const categoryApps = await db.loanApplication.findMany({
      include: {
        beneficiary: { select: { category: true } },
        scores: { take: 1, orderBy: { scoredAt: 'desc' }, select: { totalScore: true } },
      },
    });
    const categoryMap = new Map<string, { total: number; approved: number; scoreSum: number; scoreCount: number }>();
    for (const app of categoryApps) {
      const cat = app.beneficiary?.category || 'Unknown';
      const entry = categoryMap.get(cat) || { total: 0, approved: 0, scoreSum: 0, scoreCount: 0 };
      entry.total++;
      if (['approved', 'sanctioned', 'disbursed'].includes(app.status)) entry.approved++;
      if (app.scores[0]?.totalScore) { entry.scoreSum += app.scores[0].totalScore; entry.scoreCount++; }
      categoryMap.set(cat, entry);
    }
    const categoryStats = Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      total: data.total,
      approved: data.approved,
      avgScore: data.scoreCount > 0 ? Math.round(data.scoreSum / data.scoreCount) : 0,
    }));

    return NextResponse.json({
      period,
      disbursementTrend: disbursementTrend.map((d) => ({
        status: d.status,
        count: d._count,
        totalAmount: d._sum.loanAmount || 0,
      })),
      portfolio: {
        totalDisbursed: disbursedApps,
        totalDefaulted: defaultedApps,
        totalDisbursedAmount: totalDisbursed._sum.loanAmount || 0,
        totalRecoveredAmount: totalRecovered._sum.paidAmount || 0,
        recoveryRate: totalDisbursed._sum.loanAmount > 0
          ? Math.round(((totalRecovered._sum.paidAmount || 0) / totalDisbursed._sum.loanAmount) * 100) / 100
          : 0,
        defaultRate: disbursedApps > 0
          ? Math.round((defaultedApps / disbursedApps) * 100) / 100
          : 0,
        collectionRate: totalDue > 0
          ? Math.round((totalPaid / totalDue) * 100) / 100
          : 0,
        overdueAmount,
      },
      repayment: repaymentStats.map((r) => ({
        status: r.status,
        count: r._count,
        totalDue: r._sum.dueAmount || 0,
        totalPaid: r._sum.paidAmount || 0,
      })),
      stateStats,
      stateWise: stateLoanData,
      schemeDistribution: schemeDistribution.map((s) => ({
        scheme: s.schemeType,
        count: s._count,
        totalAmount: s._sum.loanAmount || 0,
      })),
      gradeDistribution,
      categoryStats,
      summary: {
        totalDisbursedAmount: totalDisbursed._sum.loanAmount || 0,
        totalApplications: appsByState.length,
        averageScore: gradeStats.length > 0 ? Math.round(gradeStats.reduce((s, g) => s + (gradeScoreMap.get(g.riskGrade) || 0), 0) / gradeStats.length) : 0,
        defaultRate: disbursedApps > 0 ? Math.round((defaultedApps / disbursedApps) * 100) / 100 : 0,
      },
    });
  } catch (error) {
    console.error('Reports fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }
}
