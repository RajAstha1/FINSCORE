import { NextRequest, NextResponse } from 'next/server';
import { hashPassword, createToken, createRefreshToken, type UserRole } from '@/lib/auth';
import { db } from '@/lib/db';

const ALLOWED_ROLES: UserRole[] = ['beneficiary', 'analyst', 'super_admin'];

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, role } = await request.json();

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json({ error: 'Name must be at least 2 characters' }, { status: 400 });
    }
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'A valid email address is required' }, { status: 400 });
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }
    if (!role || !ALLOWED_ROLES.includes(role)) {
      return NextResponse.json({ error: `Invalid role. Must be one of: ${ALLOWED_ROLES.join(', ')}` }, { status: 400 });
    }

    // Check if email already exists
    const existing = await db.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
    }

    // Create user
    const passwordHash = await hashPassword(password);
    const user = await db.user.create({
      data: {
        email: email.toLowerCase(),
        name: name.trim(),
        passwordHash,
        role,
        isActive: true,
      },
    });

    // Create session
    const token = await createToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      isActive: user.isActive,
    });
    const refreshToken = await createRefreshToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      isActive: user.isActive,
    });

    await db.session.create({
      data: {
        userId: user.id,
        token,
        refreshToken,
        userAgent: request.headers.get('user-agent') || null,
        ipAddress: request.headers.get('x-forwarded-for') || null,
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
      },
    });

    // Audit
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'REGISTER',
        resource: 'auth',
        details: JSON.stringify({ role }),
        ipAddress: request.headers.get('x-forwarded-for') || null,
      },
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone,
        isActive: user.isActive,
      },
      token,
      refreshToken,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Registration failed. Please try again.' }, { status: 500 });
  }
}
