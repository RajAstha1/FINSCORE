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
    const application = await db.loanApplication.findUnique({
      where: { id },
      include: {
        beneficiary: true,
        scores: { orderBy: { scoredAt: 'desc' } },
        decisions: {
          orderBy: { createdAt: 'desc' },
          include: {
            analyst: { select: { id: true, name: true, email: true, role: true } },
            overrides: {
              orderBy: { createdAt: 'desc' },
              include: { analyst: { select: { id: true, name: true, email: true } } },
            },
          },
        },
        documents: { orderBy: { createdAt: 'desc' } },
        repayments: { orderBy: { dueDate: 'asc' } },
      },
    });

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Fetch consumption data separately (linked to beneficiary)
    let consumptionData = [];
    if (application.beneficiaryId) {
      consumptionData = await db.consumptionData.findMany({
        where: { beneficiaryId: application.beneficiaryId },
        orderBy: { fetchedAt: 'desc' },
      });
    }

    // Parse JSON fields
    const scores = application.scores.map((s) => ({
      ...s,
      featureWeights: JSON.parse(s.featureWeights || '{}'),
      shapValues: JSON.parse(s.shapValues || '[]'),
    }));

    const decisions = application.decisions.map((d) => ({
      ...d,
      conditions: d.conditions ? JSON.parse(d.conditions) : null,
    }));

    const parsedConsumption = consumptionData.map((c) => ({
      ...c,
      paymentHistory: JSON.parse(c.paymentHistory || '[]'),
    }));

    return NextResponse.json({
      application: {
        ...application,
        scores,
        decisions,
        consumptionData: parsedConsumption,
      },
    });
  } catch (error) {
    console.error('Application fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch application' }, { status: 500 });
  }
}

const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ['submitted'],
  submitted: ['scoring', 'under_review'],
  scoring: ['under_review', 'approved', 'rejected'],
  under_review: ['approved', 'rejected'],
  approved: ['sanctioned', 'rejected'],
  sanctioned: ['disbursed', 'rejected'],
  disbursed: ['closed', 'defaulted'],
  defaulted: ['closed'],
  rejected: [],
  closed: [],
};

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { status, rejectionReason } = body;

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    const existing = await db.loanApplication.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Validate status transition
    const allowedTransitions = VALID_STATUS_TRANSITIONS[existing.status] || [];
    if (!allowedTransitions.includes(status)) {
      return NextResponse.json({
        error: `Invalid status transition from '${existing.status}' to '${status}'. Allowed: ${allowedTransitions.join(', ') || 'none'}`,
      }, { status: 400 });
    }

    const updateData: Record<string, unknown> = { status };
    if (status === 'rejected' && rejectionReason) {
      updateData.rejectionReason = rejectionReason;
    }
    if (status === 'sanctioned') {
      updateData.sanctionedAt = new Date();
    }
    if (status === 'disbursed') {
      updateData.disbursedAt = new Date();
    }
    if (status === 'closed') {
      updateData.closedAt = new Date();
    }
    if (['approved', 'rejected'].includes(status)) {
      updateData.decisionAt = new Date();
    }

    const application = await db.loanApplication.update({
      where: { id },
      data: updateData,
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: payload.userId,
        action: 'UPDATE_APPLICATION_STATUS',
        resource: 'loan_application',
        details: JSON.stringify({
          appId: id,
          appNumber: existing.applicationNumber,
          from: existing.status,
          to: status,
          rejectionReason,
        }),
        ipAddress: request.headers.get('x-forwarded-for') || null,
        userAgent: request.headers.get('user-agent') || null,
      },
    });

    return NextResponse.json({ application });
  } catch (error) {
    console.error('Application update error:', error);
    return NextResponse.json({ error: 'Failed to update application' }, { status: 500 });
  }
}
