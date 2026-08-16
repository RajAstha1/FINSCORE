import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';
import { generateFeaturesFromData, scoreApplication } from '@/lib/scoring-engine';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const grade = searchParams.get('grade');

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (grade) {
      where.scores = { some: { riskGrade: grade } };
    }
    if (search) {
      where.OR = [
        { applicationNumber: { contains: search } },
        { beneficiary: { aadhaarName: { contains: search } } },
        { beneficiary: { aadhaarNumber: { contains: search } } },
      ];
    }

    const [applications, total] = await Promise.all([
      db.loanApplication.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          beneficiary: { select: { id: true, aadhaarName: true, aadhaarNumber: true, state: true, category: true, phone: true } },
          scores: { take: 1, orderBy: { scoredAt: 'desc' } },
          decisions: { take: 1, orderBy: { createdAt: 'desc' } },
        },
      }),
      db.loanApplication.count({ where }),
    ]);

    return NextResponse.json({
      applications,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Applications fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const body = await request.json();
    
    // Generate application number
    const count = await db.loanApplication.count();
    const appNumber = `AFS-${String(count + 1).padStart(6, '0')}`;

    // Create or find beneficiary
    let beneficiary = await db.beneficiary.findFirst({
      where: { aadhaarNumber: body.aadhaarNumber },
    });

    if (!beneficiary) {
      beneficiary = await db.beneficiary.create({
        data: {
          aadhaarNumber: body.aadhaarNumber,
          aadhaarName: body.name,
          panNumber: body.panNumber,
          dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : null,
          gender: body.gender,
          category: body.category,
          state: body.state,
          district: body.district,
          pincode: body.pincode,
          address: body.address,
          phone: body.phone,
          email: body.email,
          occupation: body.occupation,
          monthlyIncome: body.monthlyIncome,
          educationLevel: body.educationLevel,
          bankAccount: body.bankAccount,
          bankName: body.bankName,
          bankIfsc: body.bankIfsc,
          consentGiven: true,
          consentDate: new Date(),
        },
      });
    }

    // Create application
    const application = await db.loanApplication.create({
      data: {
        applicationNumber: appNumber,
        beneficiaryId: beneficiary.id,
        loanAmount: body.loanAmount,
        loanPurpose: body.loanPurpose,
        loanTenure: body.loanTenure,
        interestRate: 8.5,
        emiAmount: body.loanAmount ? Math.round((body.loanAmount * 1.085) / (body.loanTenure || 24)) : 0,
        status: 'submitted',
        submittedAt: new Date(),
        schemeType: body.schemeType || 'NBCFDC',
      },
    });

    // Auto-score the application
    const features = generateFeaturesFromData({
      age: beneficiary.dateOfBirth ? Math.floor((Date.now() - beneficiary.dateOfBirth.getTime()) / 31557600000) : 35,
      monthlyIncome: body.monthlyIncome,
      loanAmount: body.loanAmount,
      loanTenure: body.loanTenure,
      state: beneficiary.state || undefined,
      category: beneficiary.category || undefined,
      educationLevel: beneficiary.educationLevel || undefined,
      electricityConsistency: body.electricityConsistency,
      mobileRechargeConsistency: body.mobileRechargeConsistency,
      utilityPaymentHistory: body.utilityPaymentHistory,
      repaymentHistory: body.repaymentHistory,
    });

    const scoreResult = scoreApplication(features);

    await db.creditScore.create({
      data: {
        applicationId: application.id,
        totalScore: scoreResult.totalScore,
        confidenceScore: scoreResult.confidenceScore,
        riskGrade: scoreResult.riskGrade,
        modelVersion: 'v2.3.1-ensemble',
        xgboostScore: scoreResult.xgboostScore,
        catboostScore: scoreResult.catboostScore,
        deepForestScore: scoreResult.deepForestScore,
        repaymentScore: scoreResult.repaymentScore,
        consumptionScore: scoreResult.consumptionScore,
        featureWeights: JSON.stringify(scoreResult.featureWeights),
        shapValues: JSON.stringify(scoreResult.shapValues),
      },
    });

    // Create AI recommendation (not a final decision)
    await db.creditDecision.create({
      data: {
        applicationId: application.id,
        decisionType: scoreResult.decisionType,
        decisionReason: `AI Recommendation: ${scoreResult.decisionReason} — Awaiting admin review`,
        analystId: null,
        approvedAmount: null,
        approvedTenure: null,
        approvedRate: null,
      },
    });

    // Application stays as 'submitted' — admin must review and approve/reject
    await db.loanApplication.update({
      where: { id: application.id },
      data: { status: 'submitted' },
    });

    // Audit
    await db.auditLog.create({
      data: {
        userId: payload.userId,
        action: 'CREATE_APPLICATION',
        resource: 'loan_application',
        details: JSON.stringify({ appId: application.id, appNumber, score: scoreResult.totalScore, grade: scoreResult.riskGrade, aiRecommendation: scoreResult.decisionType }),
      },
    });

    return NextResponse.json({
      application: { ...application, beneficiary, scores: [], decisions: [] },
      score: scoreResult,
    });
  } catch (error) {
    console.error('Application create error:', error);
    return NextResponse.json({ error: 'Failed to create application' }, { status: 500 });
  }
}
