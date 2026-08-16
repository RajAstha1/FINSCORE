import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, hashPassword, hasPermission, type UserRole } from '@/lib/auth';
import { db } from '@/lib/db';

// GET - List users with pagination, search, filtering
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload || !hasPermission(payload.role as UserRole, ['super_admin', 'auditor'])) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const search = searchParams.get('search');
    const role = searchParams.get('role');
    const isActive = searchParams.get('isActive');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build where clause
    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ];
    }
    if (role) where.role = role;
    if (isActive !== null && isActive !== undefined && isActive !== '') {
      where.isActive = isActive === 'true';
    }

    // Validate sort
    const allowedSortFields = ['createdAt', 'updatedAt', 'name', 'email', 'role', 'lastLoginAt'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const orderDir = sortOrder === 'asc' ? 'asc' : 'desc';

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { [sortField]: orderDir },
        select: {
          id: true, email: true, name: true, role: true, avatar: true,
          phone: true, isActive: true, lastLoginAt: true, createdAt: true,
          mfaEnabled: true,
          _count: { select: { auditLogs: true, decisions: true, sessions: true } },
        },
      }),
      db.user.count({ where }),
    ]);

    // Role distribution
    const roleDistribution = await db.user.groupBy({
      by: ['role'],
      _count: true,
    });

    return NextResponse.json({
      data: users,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      roleDistribution: roleDistribution.map((r) => ({ role: r.role, count: r._count })),
    });
  } catch (error) {
    console.error('Users fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

// POST - Create user
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload || !hasPermission(payload.role as UserRole, ['super_admin'])) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { email, name, password, role, phone, avatar } = await request.json();
    if (!email || !name || !password || !role) {
      return NextResponse.json({ error: 'Missing required fields: email, name, password, role' }, { status: 400 });
    }

    const validRoles: UserRole[] = ['super_admin', 'analyst', 'partner', 'beneficiary', 'auditor'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });

    const passwordHash = await hashPassword(password);
    const user = await db.user.create({
      data: { email, name, passwordHash, role, phone: phone || null, avatar: avatar || null, isActive: true },
    });

    await db.auditLog.create({
      data: {
        userId: payload.userId,
        action: 'CREATE_USER',
        resource: 'user',
        details: JSON.stringify({ targetUserId: user.id, targetEmail: email, role }),
        ipAddress: request.headers.get('x-forwarded-for') || null,
        userAgent: request.headers.get('user-agent') || null,
      },
    });

    return NextResponse.json({
      user: { id: user.id, email, name, role, phone, avatar, isActive: true },
    }, { status: 201 });
  } catch (error) {
    console.error('User create error:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

// PUT - Update user (full update)
export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload || !hasPermission(payload.role as UserRole, ['super_admin'])) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { userId, email, name, role, phone, avatar, isActive, password } = await request.json();
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { id: userId } });
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check email uniqueness if changing
    if (email && email !== existing.email) {
      const emailExists = await db.user.findUnique({ where: { email } });
      if (emailExists) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
      }
    }

    const data: Record<string, unknown> = {};
    if (email !== undefined) data.email = email;
    if (name !== undefined) data.name = name;
    if (role !== undefined) data.role = role;
    if (phone !== undefined) data.phone = phone;
    if (avatar !== undefined) data.avatar = avatar;
    if (isActive !== undefined) data.isActive = isActive;
    if (password) data.passwordHash = await hashPassword(password);

    const user = await db.user.update({
      where: { id: userId },
      data,
      select: { id: true, email: true, name: true, role: true, avatar: true, phone: true, isActive: true, lastLoginAt: true, createdAt: true, mfaEnabled: true },
    });

    await db.auditLog.create({
      data: {
        userId: payload.userId,
        action: 'UPDATE_USER',
        resource: 'user',
        details: JSON.stringify({ targetUserId: userId, changes: Object.keys(data) }),
        ipAddress: request.headers.get('x-forwarded-for') || null,
        userAgent: request.headers.get('user-agent') || null,
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error('User update error:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

// DELETE - Deactivate user (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload || !hasPermission(payload.role as UserRole, ['super_admin'])) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Prevent self-deletion
    if (userId === payload.userId) {
      return NextResponse.json({ error: 'Cannot deactivate your own account' }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { id: userId } });
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Deactivate user and invalidate sessions
    await db.$transaction([
      db.user.update({ where: { id: userId }, data: { isActive: false } }),
      db.session.deleteMany({ where: { userId } }),
    ]);

    await db.auditLog.create({
      data: {
        userId: payload.userId,
        action: 'DEACTIVATE_USER',
        resource: 'user',
        details: JSON.stringify({ targetUserId: userId, targetEmail: existing.email, targetName: existing.name }),
        ipAddress: request.headers.get('x-forwarded-for') || null,
        userAgent: request.headers.get('user-agent') || null,
      },
    });

    return NextResponse.json({ success: true, message: `User '${existing.name}' has been deactivated` });
  } catch (error) {
    console.error('User delete error:', error);
    return NextResponse.json({ error: 'Failed to deactivate user' }, { status: 500 });
  }
}
