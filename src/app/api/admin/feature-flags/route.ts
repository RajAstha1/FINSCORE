import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, hasPermission, type UserRole } from '@/lib/auth';
import { db } from '@/lib/db';

// GET - List all feature flags
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const flags = await db.featureFlag.findMany({
      orderBy: { name: 'asc' },
    });

    // Return as a key-value map for easy client consumption
    const flagMap: Record<string, { isEnabled: boolean; description: string | null; id: string; updatedAt: Date }> = {};
    for (const flag of flags) {
      flagMap[flag.name] = {
        isEnabled: flag.isEnabled,
        description: flag.description,
        id: flag.id,
        updatedAt: flag.updatedAt,
      };
    }

    return NextResponse.json({ flags, flagMap });
  } catch (error) {
    console.error('Feature flags fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch feature flags' }, { status: 500 });
  }
}

// PUT - Update feature flags (bulk or single)
export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload || !hasPermission(payload.role as UserRole, ['super_admin'])) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();

    // Support bulk update: { flags: { "flag_name": true, ... } }
    // Or single update: { name: "flag_name", isEnabled: true, description?: "..." }
    let updatedFlags;

    if (body.flags && typeof body.flags === 'object') {
      // Bulk update
      const updates = Object.entries(body.flags).map(([name, isEnabled]) =>
        db.featureFlag.upsert({
          where: { name },
          update: { isEnabled: isEnabled as boolean },
          create: { name, isEnabled: isEnabled as boolean },
        })
      );
      updatedFlags = await db.$transaction(updates);
    } else if (body.name) {
      // Single update
      const data: Record<string, unknown> = {};
      if (body.isEnabled !== undefined) data.isEnabled = body.isEnabled;
      if (body.description !== undefined) data.description = body.description;

      updatedFlags = [await db.featureFlag.upsert({
        where: { name: body.name },
        update: data,
        create: { name: body.name, isEnabled: body.isEnabled ?? false, description: body.description || null },
      })];
    } else {
      return NextResponse.json({ error: 'Invalid request. Provide { flags: {...} } or { name, isEnabled, description? }' }, { status: 400 });
    }

    // Audit log
    await db.auditLog.create({
      data: {
        userId: payload.userId,
        action: 'UPDATE_FEATURE_FLAGS',
        resource: 'feature_flag',
        details: JSON.stringify({ updated: updatedFlags.map((f) => ({ name: f.name, isEnabled: f.isEnabled })) }),
        ipAddress: request.headers.get('x-forwarded-for') || null,
        userAgent: request.headers.get('user-agent') || null,
      },
    });

    return NextResponse.json({ flags: updatedFlags });
  } catch (error) {
    console.error('Feature flags update error:', error);
    return NextResponse.json({ error: 'Failed to update feature flags' }, { status: 500 });
  }
}
