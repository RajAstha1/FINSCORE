import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, createToken, createRefreshToken } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }
    const user = await authenticateUser(email, password);
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials or account deactivated' }, { status: 401 });
    }
    const token = await createToken(user);
    const refreshToken = await createRefreshToken(user);
    await db.session.create({
      data: {
        userId: user.id, token, refreshToken,
        userAgent: request.headers.get('user-agent') || null,
        ipAddress: request.headers.get('x-forwarded-for') || null,
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
      },
    });
    await db.auditLog.create({
      data: {
        userId: user.id, action: 'LOGIN', resource: 'auth',
        details: JSON.stringify({ role: user.role }),
        ipAddress: request.headers.get('x-forwarded-for') || null,
      },
    });
    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role, avatar: user.avatar },
      token, refreshToken,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
