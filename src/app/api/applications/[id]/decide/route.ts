import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, hasPermission, type UserRole } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    if (!hasPermission(payload.role as UserRole, ['super_admin', 'analyst'])) {
      return NextResponse.json({ error: 'Insufficient permissions. Only analysts or admins can make decisions.' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { decisionType, decisionReason, approvedAmount, approvedTenure, approvedRate, conditions, overrideGrade, overrideReason } = body;

    if (!decisionType || !['auto_approve', 'manual_review', 'reject'].includes(decisionType)) {
      return NextResponse.json({ error: 'Invalid decisionType. Must be one of: auto_approve, manual_review, reject' }, { status: 400 });
    }

    // Fetch application with latest score and decision
    const application = await db.loanApplication.findUnique({
      where: { id },
      include: {
        beneficiary: { select: { id: true, name: true } },
        scores: { orderBy: { scoredAt: 'desc' }, take: 1 },
        decisions: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    if (!['submitted', 'scoring', 'under_review'].includes(application.status)) {
      return NextResponse.json({
        error: `Cannot decide on application with status '${application.status}'. Must be in submitted, scoring, or under_review state.`,
      }, { status: 400 });
    }

    // Create the decision
    const newDecision = await db.creditDecision.create({
      data: {
        applicationId: id,
        decisionType,
        decisionReason: decisionReason || `Analyst decision: ${decisionType}`,
        analystId: payload.userId,
        approvedAmount: decisionType === 'auto_approve' ? (approvedAmount || application.loanAmount) : null,
        approvedTenure: decisionType === 'auto_approve' ? (approvedTenure || application.loanTenure) : null,
        approvedRate: decisionType === 'auto_approve' ? (approvedRate || application.interestRate || 8.5) : null,
        conditions: conditions ? JSON.stringify(conditions) : null,
      },
    });

    // Handle grade override if provided
    if (overrideGrade && overrideReason) {
      const originalGrade = application.scores[0]?.riskGrade || 'N/A';
      if (originalGrade !== overrideGrade) {
        await db.manualOverride.create({
          data: {
            decisionId: newDecision.id,
            analystId: payload.userId,
            originalGrade,
            newGrade: overrideGrade,
            reason: overrideReason,
          },
        });

        // Update the beneficiary's risk grade if overriding
        await db.beneficiary.update({
          where: { id: application.beneficiaryId },
          data: { riskGrade: overrideGrade },
        });
      }
    }

    // Determine new application status
    let newStatus: string;
    if (decisionType === 'auto_approve') {
      newStatus = 'approved';
    } else if (decisionType === 'reject') {
      newStatus = 'rejected';
    } else {
      newStatus = 'under_review';
    }

    await db.loanApplication.update({
      where: { id },
      data: { status: newStatus, decisionAt: new Date() },
    });

    // Create repayment schedule for approved applications
    if (decisionType === 'auto_approve' && approvedAmount && approvedTenure) {
      const emi = Math.round((approvedAmount * (1 + ((approvedRate || 8.5) / 100) * (approvedTenure / 12))) / approvedTenure);
      const repayments = [];
      for (let i = 1; i <= approvedTenure; i++) {
        const dueDate = new Date();
        dueDate.setMonth(dueDate.getMonth() + i);
        repayments.push({
          applicationId: id,
          emiNumber: i,
          dueDate,
          dueAmount: emi,
          status: 'pending',
        });
      }
      await db.repayment.createMany({ data: repayments });
    }

    // Audit log
    await db.auditLog.create({
      data: {
        userId: payload.userId,
        action: 'DECIDE_APPLICATION',
        resource: 'credit_decision',
        details: JSON.stringify({
          appId: id,
          appNumber: application.applicationNumber,
          decisionType,
          approvedAmount: approvedAmount || null,
          overrideGrade: overrideGrade || null,
          overrideReason: overrideReason || null,
        }),
        ipAddress: request.headers.get('x-forwarded-for') || null,
        userAgent: request.headers.get('user-agent') || null,
      },
    });

    return NextResponse.json({
      decision: {
        ...newDecision,
        conditions: newDecision.conditions ? JSON.parse(newDecision.conditions) : null,
      },
      newStatus,
    });
  } catch (error) {
    console.error('Decision error:', error);
    return NextResponse.json({ error: 'Decision failed' }, { status: 500 });
  }
}
