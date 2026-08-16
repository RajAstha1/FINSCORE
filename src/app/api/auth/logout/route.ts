import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ success: true });
    
    const payload = await verifyToken(token);
    if (payload) {
      await db.session.deleteMany({ where: { userId: payload.userId, token } });
      await db.auditLog.create({
        data: { userId: payload.userId, action: 'LOGOUT', resource: 'auth' },
      });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: true });
  }
}
