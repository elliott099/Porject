import { SignJWT, jwtVerify } from 'jose';
import type { SafeUser } from '../../types/index.ts';

const JWT_SECRET_STRING = process.env.JWT_SECRET || 'workpulse-enterprise-secure-jwt-secret-key-9982443';
const SECRET_KEY = new TextEncoder().encode(JWT_SECRET_STRING);

export interface JWTPayload {
  userId: string;
  email: string;
  role: SafeUser['role'];
  name: string;
  department: string;
}

export async function signToken(user: SafeUser): Promise<string> {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    department: user.department,
  };

  return await new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(SECRET_KEY);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as unknown as JWTPayload;
  } catch (err) {
    return null;
  }
}
