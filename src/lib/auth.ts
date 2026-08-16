import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { db } from './db';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'arogya-finscore-secret-key-change-in-production');

export type UserRole = 'super_admin' | 'analyst' | 'partner' | 'beneficiary' | 'auditor';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string | null;
  phone?: string | null;
  isActive: boolean;
}

export interface SessionPayload {
  userId: string;
  email: string;
  role: UserRole;
  exp: number;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createToken(user: AuthUser): Promise<string> {
  return new SignJWT({ userId: user.id, email: user.email, role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(JWT_SECRET);
}

export async function createRefreshToken(user: AuthUser): Promise<string> {
  return new SignJWT({ userId: user.id, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function authenticateUser(email: string, password: string): Promise<AuthUser | null> {
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !user.isActive) return null;

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) return null;

  // Update last login
  await db.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as UserRole,
    avatar: user.avatar,
    phone: user.phone,
    isActive: user.isActive,
  };
}

export function hasPermission(userRole: UserRole, requiredRoles: UserRole[]): boolean {
  return requiredRoles.includes(userRole);
}

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  analyst: 'Credit Analyst',
  partner: 'Channel Partner',
  beneficiary: 'Beneficiary',
  auditor: 'Auditor',
};

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  super_admin: 100,
  auditor: 80,
  analyst: 60,
  partner: 40,
  beneficiary: 20,
};
