import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, hasPermission, type UserRole } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    if (!hasPermission(payload.role as UserRole, ['super_admin', 'analyst', 'auditor'])) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const protectedAttr = searchParams.get('attribute'); // gender, category, state

    // Fetch stored fairness metrics
    const fairnessWhere: Record<string, unknown> = {};
    if (protectedAttr) fairnessWhere.protectedAttr = protectedAttr;

    const storedMetrics = await db.fairnessMetric.findMany({
      where: fairnessWhere,
      orderBy: { createdAt: 'desc' },
    });

    // Compute real-time fairness metrics from actual data
    // Group scores by beneficiary attributes
    const applicationsWithScores = await db.loanApplication.findMany({
      where: { status: { not: 'draft' } },
      include: {
        beneficiary: { select: { gender: true, category: true, state: true } },
        scores: { take: 1, orderBy: { scoredAt: 'desc' } },
        decisions: { take: 1, orderBy: { createdAt: 'desc' } },
      },
    });

    // Compute approval rates by attribute
    function computeGroupMetrics(
      records: typeof applicationsWithScores,
      attribute: 'gender' | 'category' | 'state'
    ) {
      const groups: Record<string, { total: number; approved: number; rejected: number; scores: number[] }> = {};

      for (const record of records) {
        const value = record.beneficiary[attribute] || 'Unknown';
        if (!groups[value]) groups[value] = { total: 0, approved: 0, rejected: 0, scores: [] };
        groups[value].total++;
        if (record.status === 'approved' || record.status === 'sanctioned' || record.status === 'disbursed') {
          groups[value].approved++;
        }
        if (record.status === 'rejected') {
          groups[value].rejected++;
        }
        if (record.scores[0]) {
          groups[value].scores.push(record.scores[0].totalScore);
        }
      }

      const result: { group: string; total: number; approvalRate: number; avgScore: number; rejectionRate: number }[] = [];
      const groupEntries = Object.entries(groups);

      for (const [group, data] of groupEntries) {
        result.push({
          group,
          total: data.total,
          approvalRate: data.total > 0 ? Math.round((data.approved / data.total) * 1000) / 10 : 0,
          avgScore: data.scores.length > 0 ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length) : 0,
          rejectionRate: data.total > 0 ? Math.round((data.rejected / data.total) * 1000) / 10 : 0,
        });
      }

      // Compute disparate impact (ratio of minority approval rate to majority)
      let disparateImpact: { groupA: string; groupB: string; ratio: number } | null = null;
      if (result.length >= 2) {
        const sorted = [...result].sort((a, b) => b.approvalRate - a.approvalRate);
        const highest = sorted[0];
        const lowest = sorted[sorted.length - 1];
        disparateImpact = {
          groupA: highest.group,
          groupB: lowest.group,
          ratio: highest.approvalRate > 0 ? Math.round((lowest.approvalRate / highest.approvalRate) * 1000) / 1000 : 0,
        };
      }

      return { groups: result, disparateImpact };
    }

    const genderMetrics = computeGroupMetrics(applicationsWithScores, 'gender');
    const categoryMetrics = computeGroupMetrics(applicationsWithScores, 'category');
    const stateMetrics = computeGroupMetrics(applicationsWithScores, 'state');

    // Parse stored metrics
    const parsedStoredMetrics = storedMetrics.map((m) => ({
      ...m,
      modelVersion: m.modelVersion,
      protectedAttr: m.protectedAttr,
      metricName: m.metricName,
      metricValue: m.metricValue,
      groupA: m.groupA,
      groupB: m.groupB,
    }));

    return NextResponse.json({
      storedMetrics: parsedStoredMetrics,
      realtime: {
        gender: genderMetrics,
        category: categoryMetrics,
        state: stateMetrics,
      },
    });
  } catch (error) {
    console.error('Fairness fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch fairness metrics' }, { status: 500 });
  }
}
