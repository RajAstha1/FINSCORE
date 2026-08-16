import { NextRequest, NextResponse } from 'next/server';
import { scoreApplication, generateFeaturesFromData, type ScoringFeatures } from '@/lib/scoring-engine';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const body = await request.json();
    const features: ScoringFeatures = body.features
      ? body.features
      : generateFeaturesFromData(body);

    const startTime = Date.now();
    const result = scoreApplication(features);
    const inferenceTime = Date.now() - startTime;

    // Store score in DB if applicationId provided
    if (body.applicationId) {
      await db.creditScore.create({
        data: {
          applicationId: body.applicationId,
          totalScore: result.totalScore,
          confidenceScore: result.confidenceScore,
          riskGrade: result.riskGrade,
          modelVersion: 'v2.3.1-ensemble',
          xgboostScore: result.xgboostScore,
          catboostScore: result.catboostScore,
          deepForestScore: result.deepForestScore,
          repaymentScore: result.repaymentScore,
          consumptionScore: result.consumptionScore,
          featureWeights: JSON.stringify(result.featureWeights),
          shapValues: JSON.stringify(result.shapValues),
        },
      });

      // Update application status
      await db.loanApplication.update({
        where: { id: body.applicationId },
        data: { status: 'scoring', modelVersion: 'v2.3.1-ensemble' },
      });
    }

    // Audit
    await db.auditLog.create({
      data: {
        userId: payload.userId,
        action: 'SCORE_APPLICATION',
        resource: 'credit_score',
        details: JSON.stringify({ applicationId: body.applicationId, score: result.totalScore, grade: result.riskGrade, time: inferenceTime }),
      },
    });

    return NextResponse.json({ ...result, inferenceTimeMs: inferenceTime });
  } catch (error) {
    console.error('Scoring error:', error);
    return NextResponse.json({ error: 'Scoring failed' }, { status: 500 });
  }
}
