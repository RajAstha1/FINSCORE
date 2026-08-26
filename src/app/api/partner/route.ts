import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';

// GET - Partner-specific data (referrals, statuses, etc.)
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const partnerId = searchParams.get('partnerId');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    // If no partnerId, look up partner from user's role
    let effectivePartnerId = partnerId;
    if (!effectivePartnerId && payload.role === 'partner') {
      // Find the channel partner linked to this user (via their email or a stored association)
      // For now, check if there's a partner whose contactEmail matches the user
      const partner = await db.channelPartner.findFirst({
        where: { contactEmail: payload.email },
        select: { id: true },
      });
      if (partner) effectivePartnerId = partner.id;
    }

    if (effectivePartnerId) {
      // Fetch specific partner data
      const partner = await db.channelPartner.findUnique({
        where: { id: effectivePartnerId },
        include: {
          beneficiaries: {
            select: { id: true, aadhaarName: true, state: true, category: true, createdAt: true },
            take: 5,
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!partner) {
        return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
      }

      // Expose beneficiary names under `name` for API consumers
      const partnerWithNames = {
        ...partner,
        beneficiaries: partner.beneficiaries.map(({ aadhaarName, ...rest }) => ({
          ...rest,
          name: aadhaarName,
        })),
      };

      // Fetch referrals (beneficiaries linked to this partner)
      const [referrals, totalReferrals] = await Promise.all([
        db.beneficiary.findMany({
          where: { partnerId: effectivePartnerId },
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
          include: {
            _count: { select: { applications: true } },
            applications: {
              take: 1,
              orderBy: { createdAt: 'desc' },
              select: { id: true, applicationNumber: true, status: true, loanAmount: true, createdAt: true },
            },
          },
        }),
        db.beneficiary.count({ where: { partnerId: effectivePartnerId } }),
      ]);

      // Referral status distribution
      const referralStatuses = await db.loanApplication.findMany({
        where: { beneficiary: { partnerId: effectivePartnerId } },
        select: { status: true },
      });

      const statusCounts: Record<string, number> = {};
      for (const app of referralStatuses) {
        statusCounts[app.status] = (statusCounts[app.status] || 0) + 1;
      }

      // Financial summary for partner
      const financialSummary = await db.loanApplication.aggregate({
        where: { beneficiary: { partnerId: effectivePartnerId } },
        _sum: { loanAmount: true },
        _count: true,
      });

      const approvedSummary = await db.loanApplication.aggregate({
        where: {
          beneficiary: { partnerId: effectivePartnerId },
          status: { in: ['approved', 'sanctioned', 'disbursed'] },
        },
        _sum: { loanAmount: true },
        _count: true,
      });

      return NextResponse.json({
        partner,
        referrals,
        totalReferrals,
        page,
        pageSize,
        totalPages: Math.ceil(totalReferrals / pageSize),
        statusDistribution: statusCounts,
        financial: {
          totalApplications: financialSummary._count,
          totalAmount: financialSummary._sum.loanAmount || 0,
          approvedApplications: approvedSummary._count,
          approvedAmount: approvedSummary._sum.loanAmount || 0,
          conversionRate: financialSummary._count > 0
            ? Math.round((approvedSummary._count / financialSummary._count) * 100) / 100
            : 0,
        },
      });
    }

    // No specific partner — list all partners (admin/analyst view)
    const partners = await db.channelPartner.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { beneficiaries: true } },
      },
    });

    // Add computed stats for each partner
    const partnersWithStats = await Promise.all(
      partners.map(async (p) => {
        const appStats = await db.loanApplication.aggregate({
          where: { beneficiary: { partnerId: p.id } },
          _count: true,
          _sum: { loanAmount: true },
        });
        const approvedStats = await db.loanApplication.aggregate({
          where: {
            beneficiary: { partnerId: p.id },
            status: { in: ['approved', 'sanctioned', 'disbursed'] },
          },
          _count: true,
        });
        return {
          ...p,
          totalApplications: appStats._count,
          totalLoanAmount: appStats._sum.loanAmount || 0,
          approvedApplications: approvedStats._count,
        };
      })
    );

    return NextResponse.json({
      partners: partnersWithStats,
      total: partnersWithStats.length,
    });
  } catch (error) {
    console.error('Partner fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch partner data' }, { status: 500 });
  }
}

// POST - Bulk upload beneficiaries / create partner referral
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const body = await request.json();

    // Determine partner ID
    let partnerId = body.partnerId;
    if (!partnerId && payload.role === 'partner') {
      const partner = await db.channelPartner.findFirst({
        where: { contactEmail: payload.email },
        select: { id: true },
      });
      if (partner) partnerId = partner.id;
    }

    if (!partnerId) {
      return NextResponse.json({ error: 'Partner ID is required' }, { status: 400 });
    }

    // Validate partner exists
    const partner = await db.channelPartner.findUnique({ where: { id: partnerId } });
    if (!partner) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    }

    // Bulk upload mode: body.beneficiaries is an array
    if (body.beneficiaries && Array.isArray(body.beneficiaries)) {
      const results = { created: 0, skipped: 0, errors: [] as string[] };

      for (const ben of body.beneficiaries) {
        try {
          // Check for existing aadhaar
          if (ben.aadhaarNumber) {
            const existing = await db.beneficiary.findUnique({ where: { aadhaarNumber: ben.aadhaarNumber } });
            if (existing) {
              results.skipped++;
              continue;
            }
          }

          await db.beneficiary.create({
            data: {
              aadhaarNumber: ben.aadhaarNumber || null,
              aadhaarName: ben.name || null,
              panNumber: ben.panNumber || null,
              dateOfBirth: ben.dateOfBirth ? new Date(ben.dateOfBirth) : null,
              gender: ben.gender || null,
              category: ben.category || null,
              state: ben.state || null,
              district: ben.district || null,
              pincode: ben.pincode || null,
              address: ben.address || null,
              phone: ben.phone || null,
              email: ben.email || null,
              occupation: ben.occupation || null,
              monthlyIncome: ben.monthlyIncome || null,
              educationLevel: ben.educationLevel || null,
              bankAccount: ben.bankAccount || null,
              bankName: ben.bankName || null,
              bankIfsc: ben.bankIfsc || null,
              partnerId,
              consentGiven: true,
              consentDate: new Date(),
            },
          });
          results.created++;
        } catch (e) {
          results.errors.push(`Failed for ${ben.name || ben.aadhaarNumber || 'unknown'}: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
      }

      // Update partner referral count
      await db.channelPartner.update({
        where: { id: partnerId },
        data: { totalReferrals: { increment: results.created } },
      });

      // Audit
      await db.auditLog.create({
        data: {
          userId: payload.userId,
          action: 'BULK_UPLOAD_BENEFICIARIES',
          resource: 'partner',
          details: JSON.stringify({ partnerId, created: results.created, skipped: results.skipped, errors: results.errors.length }),
          ipAddress: request.headers.get('x-forwarded-for') || null,
          userAgent: request.headers.get('user-agent') || null,
        },
      });

      return NextResponse.json({ ...results, partnerId }, { status: 201 });
    }

    // Single beneficiary referral
    const { aadhaarNumber, name, ...rest } = body;
    if (aadhaarNumber) {
      const existing = await db.beneficiary.findUnique({ where: { aadhaarNumber } });
      if (existing) {
        return NextResponse.json({ error: 'Beneficiary already exists', beneficiaryId: existing.id }, { status: 409 });
      }
    }

    const beneficiary = await db.beneficiary.create({
      data: {
        aadhaarNumber: aadhaarNumber || null,
        aadhaarName: name || null,
        panNumber: rest.panNumber || null,
        dateOfBirth: rest.dateOfBirth ? new Date(rest.dateOfBirth) : null,
        gender: rest.gender || null,
        category: rest.category || null,
        state: rest.state || null,
        district: rest.district || null,
        pincode: rest.pincode || null,
        address: rest.address || null,
        phone: rest.phone || null,
        email: rest.email || null,
        occupation: rest.occupation || null,
        monthlyIncome: rest.monthlyIncome || null,
        educationLevel: rest.educationLevel || null,
        bankAccount: rest.bankAccount || null,
        bankName: rest.bankName || null,
        bankIfsc: rest.bankIfsc || null,
        partnerId,
        consentGiven: true,
        consentDate: new Date(),
      },
    });

    // Update partner referral count
    await db.channelPartner.update({
      where: { id: partnerId },
      data: { totalReferrals: { increment: 1 } },
    });

    // Audit
    await db.auditLog.create({
      data: {
        userId: payload.userId,
        action: 'PARTNER_REFERRAL',
        resource: 'partner',
        details: JSON.stringify({ partnerId, beneficiaryId: beneficiary.id, name }),
        ipAddress: request.headers.get('x-forwarded-for') || null,
        userAgent: request.headers.get('user-agent') || null,
      },
    });

    return NextResponse.json({ beneficiary }, { status: 201 });
  } catch (error) {
    console.error('Partner POST error:', error);
    return NextResponse.json({ error: 'Partner operation failed' }, { status: 500 });
  }
}
