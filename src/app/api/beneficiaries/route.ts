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
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const search = searchParams.get('search');
    const state = searchParams.get('state');
    const category = searchParams.get('category');
    const partnerId = searchParams.get('partnerId');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build where clause
    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { aadhaarNumber: { contains: search } },
        { panNumber: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
      ];
    }
    if (state) where.state = state;
    if (category) where.category = category;
    if (partnerId) where.partnerId = partnerId;

    // Validate sort field
    const allowedSortFields = ['createdAt', 'updatedAt', 'name', 'creditScore', 'monthlyIncome', 'state'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const orderDir = sortOrder === 'asc' ? 'asc' : 'desc';

    const [beneficiaries, total] = await Promise.all([
      db.beneficiary.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { [sortField]: orderDir },
        include: {
          _count: { select: { applications: true, documents: true, consumptions: true } },
          applications: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            select: { id: true, applicationNumber: true, status: true, loanAmount: true, createdAt: true },
          },
          partner: { select: { id: true, name: true, code: true } },
        },
      }),
      db.beneficiary.count({ where }),
    ]);

    return NextResponse.json({
      data: beneficiaries,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('Beneficiaries fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch beneficiaries' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const body = await request.json();
    const {
      aadhaarNumber, aadhaarName, panNumber, dateOfBirth, gender, category,
      state, district, pincode, address, phone, email, occupation,
      monthlyIncome, annualIncome, educationLevel, maritalStatus,
      bankAccount, bankName, bankIfsc, partnerId,
    } = body;

    // Check for existing beneficiary
    if (aadhaarNumber) {
      const existing = await db.beneficiary.findUnique({ where: { aadhaarNumber } });
      if (existing) {
        return NextResponse.json({ error: 'Beneficiary with this Aadhaar number already exists', beneficiaryId: existing.id }, { status: 409 });
      }
    }

    const beneficiary = await db.beneficiary.create({
      data: {
        aadhaarNumber: aadhaarNumber || null,
        aadhaarName: aadhaarName || null,
        panNumber: panNumber || null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender: gender || null,
        category: category || null,
        state: state || null,
        district: district || null,
        pincode: pincode || null,
        address: address || null,
        phone: phone || null,
        email: email || null,
        occupation: occupation || null,
        monthlyIncome: monthlyIncome || null,
        annualIncome: annualIncome || null,
        educationLevel: educationLevel || null,
        maritalStatus: maritalStatus || null,
        bankAccount: bankAccount || null,
        bankName: bankName || null,
        bankIfsc: bankIfsc || null,
        partnerId: partnerId || null,
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: payload.userId,
        action: 'CREATE_BENEFICIARY',
        resource: 'beneficiary',
        details: JSON.stringify({ beneficiaryId: beneficiary.id, name: aadhaarName, aadhaarNumber }),
        ipAddress: request.headers.get('x-forwarded-for') || null,
        userAgent: request.headers.get('user-agent') || null,
      },
    });

    return NextResponse.json({ beneficiary }, { status: 201 });
  } catch (error) {
    console.error('Beneficiary create error:', error);
    return NextResponse.json({ error: 'Failed to create beneficiary' }, { status: 500 });
  }
}
