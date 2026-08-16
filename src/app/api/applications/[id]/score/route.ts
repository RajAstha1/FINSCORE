import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';
import { generateFeaturesFromData, scoreApplication } from '@/lib/scoring-engine';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { id } = await params;

    // Fetch application with beneficiary and consumption data
    const application = await db.loanApplication.findUnique({
      where: { id },
      include: {
        beneficiary: true,
        scores: { orderBy: { scoredAt: 'desc' }, take: 1 },
      },
    });

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    if (!['draft', 'submitted', 'scoring'].includes(application.status)) {
      return NextResponse.json({
        error: `Cannot score application with status '${application.status}'. Application must be in draft, submitted, or scoring state.`,
      }, { status: 400 });
    }

    // Fetch consumption data for beneficiary
    const consumptionData = await db.consumptionData.findMany({
      where: { beneficiaryId: application.beneficiaryId },
      orderBy: { fetchedAt: 'desc' },
    });

    // Extract latest consumption scores
    const latestConsumption = consumptionData[0];
    const consumptionScores = consumptionData.reduce(
      (acc, c) => {
        if (c.type === 'electricity' && c.consistency !== null) acc.electricityConsistency = c.consistency;
        if (c.type === 'mobile' && c.consistency !== null) acc.mobileRechargeConsistency = c.consistency;
        if (c.type === 'gas' && c.consistency !== null) acc.utilityPaymentHistory = c.consistency;
        return acc;
      },
      { electricityConsistency: undefined as number | undefined, mobileRechargeConsistency: undefined as number | undefined, utilityPaymentHistory: undefined as number | undefined }
    );

    // Calculate age from date of birth
    let age = 35;
    if (application.beneficiary.dateOfBirth) {
      const dob = new Date(application.beneficiary.dateOfBirth);
      age = Math.floor((Date.now() - dob.getTime()) / 31557600000);
    }

    // Count previous applications for this beneficiary
    const previousApps = await db.loanApplication.count({
      where: {
        beneficiaryId: application.beneficiaryId,
        id: { not: id },
        status: { in: ['disbursed', 'closed', 'defaulted'] },
      },
    });

    const previousDefaults = await db.loanApplication.count({
      where: {
        beneficiaryId: application.beneficiaryId,
        id: { not: id },
        status: 'defaulted',
      },
    });

    // Generate features and score
    const features = generateFeaturesFromData({
      age,
      monthlyIncome: application.beneficiary.monthlyIncome || undefined,
      loanAmount: application.loanAmount,
      loanTenure: application.loanTenure,
      repaymentHistory: latestConsumption?.consistency || undefined,
      electricityConsistency: consumptionScores.electricityConsistency || latestConsumption?.consistency || undefined,
      mobileRechargeConsistency: consumptionScores.mobileRechargeConsistency || undefined,
      utilityPaymentHistory: consumptionScores.utilityPaymentHistory || undefined,
      previousLoans: previousApps,
      previousDefaults,
      educationLevel: application.beneficiary.educationLevel || undefined,
      state: application.beneficiary.state || undefined,
      category: application.beneficiary.category || undefined,
    });

    const startTime = Date.now();
    const result = scoreApplication(features);
    const inferenceTime = Date.now() - startTime;

    const modelVersion = 'v2.3.1-ensemble';

    // Create credit score record
    const score = await db.creditScore.create({
      data: {
        applicationId: id,
        totalScore: result.totalScore,
        confidenceScore: result.confidenceScore,
        riskGrade: result.riskGrade,
        modelVersion,
        xgboostScore: result.xgboostScore,
        catboostScore: result.catboostScore,
        deepForestScore: result.deepForestScore,
        repaymentScore: result.repaymentScore,
        consumptionScore: result.consumptionScore,
        featureWeights: JSON.stringify(result.featureWeights),
        shapValues: JSON.stringify(result.shapValues),
      },
    });

    // Update application status to scoring
    await db.loanApplication.update({
      where: { id },
      data: { status: 'scoring', modelVersion },
    });

    // Create auto-decision
    const newStatus = result.decisionType === 'auto_approve' ? 'approved' : result.decisionType === 'reject' ? 'rejected' : 'under_review';

    const decision = await db.creditDecision.create({
      data: {
        applicationId: id,
        decisionType: result.decisionType,
        decisionReason: result.decisionReason,
        analystId: payload.userId,
        approvedAmount: result.decisionType === 'auto_approve' ? application.loanAmount : null,
        approvedTenure: result.decisionType === 'auto_approve' ? application.loanTenure : null,
        approvedRate: result.decisionType === 'auto_approve' ? application.interestRate || 8.5 : null,
      },
    });

    // Transition to the decision-based status
    await db.loanApplication.update({
      where: { id },
      data: { status: newStatus, decisionAt: new Date() },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: payload.userId,
        action: 'SCORE_APPLICATION',
        resource: 'credit_score',
        details: JSON.stringify({
          appId: id,
          appNumber: application.applicationNumber,
          score: result.totalScore,
          grade: result.riskGrade,
          confidence: result.confidenceScore,
          decision: result.decisionType,
          inferenceTimeMs: inferenceTime,
        }),
        ipAddress: request.headers.get('x-forwarded-for') || null,
        userAgent: request.headers.get('user-agent') || null,
      },
    });

    // Parse JSON fields for response
    const parsedScore = {
      ...score,
      featureWeights: JSON.parse(score.featureWeights),
      shapValues: JSON.parse(score.shapValues),
    };

    return NextResponse.json({
      score: parsedScore,
      decision: {
        ...decision,
        conditions: decision.conditions ? JSON.parse(decision.conditions) : null,
      },
      result,
      inferenceTimeMs: inferenceTime,
    });
  } catch (error) {
    console.error('Score application error:', error);
    return NextResponse.json({ error: 'Scoring failed' }, { status: 500 });
  }
}
