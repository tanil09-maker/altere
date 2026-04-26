import { SignJWT, jwtVerify } from 'jose';

const COOKIE_NAME = 'altere_session';
const MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET not configured');
  return new TextEncoder().encode(secret);
}

export async function createSession(userId) {
  const token = await new SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(getSecret());
  return token;
}

export async function verifySession(token) {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload.userId || null;
  } catch {
    return null;
  }
}

export async function getSessionFromRequest(req) {
  const cookie = req.headers.cookie || '';
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  if (!match) return null;
  return verifySession(match[1]);
}

export function setSessionCookie(res, token) {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  res.setHeader('Set-Cookie',
    `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}${isProduction ? '; Secure' : ''}`
  );
}

export function clearSessionCookie(res) {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  res.setHeader('Set-Cookie',
    `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${isProduction ? '; Secure' : ''}`
  );
}
