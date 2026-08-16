import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { id } = await params;

    const beneficiary = await db.beneficiary.findUnique({
      where: { id },
      include: {
        partner: { select: { id: true, name: true, code: true, type: true } },
        applications: {
          orderBy: { createdAt: 'desc' },
          include: {
            scores: { orderBy: { scoredAt: 'desc' }, take: 1 },
            decisions: { orderBy: { createdAt: 'desc' }, take: 1 },
            repayments: { orderBy: { dueDate: 'desc' }, take: 10 },
          },
        },
        consumptions: { orderBy: { fetchedAt: 'desc' } },
        documents: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!beneficiary) {
      return NextResponse.json({ error: 'Beneficiary not found' }, { status: 404 });
    }

    // Parse JSON fields in applications
    const parsedApplications = beneficiary.applications.map((app) => ({
      ...app,
      scores: app.scores.map((s) => ({
        ...s,
        featureWeights: JSON.parse(s.featureWeights || '{}'),
        shapValues: JSON.parse(s.shapValues || '[]'),
      })),
      decisions: app.decisions.map((d) => ({
        ...d,
        conditions: d.conditions ? JSON.parse(d.conditions) : null,
      })),
    }));

    // Parse JSON fields in consumption data
    const parsedConsumptions = beneficiary.consumptions.map((c) => ({
      ...c,
      paymentHistory: JSON.parse(c.paymentHistory || '[]'),
    }));

    // Compute summary stats
    const allScores = beneficiary.applications.flatMap((a) => a.scores.map((s) => s.totalScore));
    const latestApp = beneficiary.applications[0];
    const latestScore = latestApp?.scores[0];
    const totalLoanAmount = beneficiary.applications
      .filter((a) => a.status === 'disbursed')
      .reduce((sum, a) => sum + a.loanAmount, 0);

    const totalRepayments = beneficiary.applications.flatMap((a) =>
      a.repayments.filter((r) => r.status === 'paid')
    );
    const totalPaidAmount = totalRepayments.reduce((sum, r) => sum + (r.paidAmount || 0), 0);
    const overdueCount = beneficiary.applications.flatMap((a) =>
      a.repayments.filter((r) => r.status === 'overdue' || r.status === 'default')
    ).length;

    return NextResponse.json({
      beneficiary: {
        ...beneficiary,
        applications: parsedApplications,
        consumptions: parsedConsumptions,
      },
      summary: {
        totalApplications: beneficiary.applications.length,
        latestScore: latestScore?.totalScore || null,
        latestGrade: latestScore?.riskGrade || null,
        latestApplicationStatus: latestApp?.status || null,
        avgScore: allScores.length > 0 ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : null,
        totalDisbursedAmount: totalLoanAmount,
        totalPaidAmount,
        overduePayments: overdueCount,
      },
    });
  } catch (error) {
    console.error('Beneficiary fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch beneficiary' }, { status: 500 });
  }
}
