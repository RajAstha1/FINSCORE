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

    // Model performance metrics
    const modelPerformance = await db.modelPerformance.findMany({
      orderBy: { evaluatedAt: 'desc' },
      take: 100,
    });

    // Aggregate performance by metric
    const performanceByMetric: Record<string, { latest: number; avg: number; trend: { date: string; value: number }[] }> = {};
    const metricGroups: Record<string, typeof modelPerformance> = {};
    for (const mp of modelPerformance) {
      if (!metricGroups[mp.metricName]) metricGroups[mp.metricName] = [];
      metricGroups[mp.metricName].push(mp);
    }

    for (const [metric, records] of Object.entries(metricGroups)) {
      const sorted = records.sort((a, b) => a.evaluatedAt.getTime() - b.evaluatedAt.getTime());
      const values = sorted.map((r) => r.metricValue);
      performanceByMetric[metric] = {
        latest: values[values.length - 1] || 0,
        avg: values.length > 0 ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100 : 0,
        trend: sorted.slice(-10).map((r) => ({
          date: r.evaluatedAt.toISOString().split('T')[0],
          value: r.metricValue,
        })),
      };
    }

    // Scoring volume and distribution
    const [totalScores, avgScore, avgConfidence, gradeDistribution] = await Promise.all([
      db.creditScore.count(),
      db.creditScore.aggregate({ _avg: { totalScore: true } }),
      db.creditScore.aggregate({ _avg: { confidenceScore: true } }),
      db.creditScore.groupBy({ by: ['riskGrade'], _count: true }),
    ]);

    // Decision distribution
    const decisionDistribution = await db.creditDecision.groupBy({
      by: ['decisionType'],
      _count: true,
    });

    // Application pipeline
    const pipelineDistribution = await db.loanApplication.groupBy({
      by: ['status'],
      _count: true,
    });

    // Override statistics
    const overrideCount = await db.manualOverride.count();
    const recentOverrides = await db.manualOverride.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        analyst: { select: { name: true, email: true } },
        decision: { select: { applicationId: true } },
      },
    });

    // Active model versions
    const activeVersions = await db.creditScore.groupBy({
      by: ['modelVersion'],
      _count: true,
      _avg: { totalScore: true, confidenceScore: true },
      orderBy: { modelVersion: 'asc' },
    });

    return NextResponse.json({
      modelPerformance: performanceByMetric,
      scoring: {
        totalScores,
        avgScore: Math.round(avgScore._avg.totalScore || 0),
        avgConfidence: Math.round(avgConfidence._avg.confidenceScore || 0),
        gradeDistribution: gradeDistribution.map((g) => ({ grade: g.riskGrade, count: g._count })),
      },
      decisions: decisionDistribution.map((d) => ({ type: d.decisionType, count: d._count })),
      pipeline: pipelineDistribution.map((p) => ({ status: p.status, count: p._count })),
      overrides: {
        total: overrideCount,
        recent: recentOverrides,
      },
      modelVersions: activeVersions.map((v) => ({
        version: v.modelVersion,
        count: v._count,
        avgScore: Math.round(v._avg.totalScore || 0),
        avgConfidence: Math.round(v._avg.confidenceScore || 0),
      })),
    });
  } catch (error) {
    console.error('Monitoring fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch monitoring data' }, { status: 500 });
  }
}
