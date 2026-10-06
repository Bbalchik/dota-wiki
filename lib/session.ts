import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? 'fallback-secret-change-me'
);

export const COOKIE_NAME = 'dota_session';
export const ACTIVE_ACCOUNT_COOKIE = 'active_account_id';
export const EXPIRY_DAYS = 30;

export function isSecureCookie(): boolean {
  const url = process.env.NEXTAUTH_URL ?? '';
  if (url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1')) {
    return false;
  }
  return url.startsWith('https://');
}

export type SessionPayload = {
  steamId: string;   // SteamID64 (e.g. "76561198047011640")
  profileId: number; // our DB row id
};

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${EXPIRY_DAYS}d`)
    .sign(SECRET);
}

export async function createSession(payload: SessionPayload) {
  const expiresAt = new Date(Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  const token = await createSessionToken(payload);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isSecureCookie(),
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, SECRET, { algorithms: ['HS256'] });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getActiveAccountId(): Promise<number | null> {
  const cookieStore = await cookies();
  const session = await getSession();
  if (session) {
    const STEAM64_BASE = BigInt("76561197960265728");
    try {
      const s64 = BigInt(session.steamId);
      if (s64 > STEAM64_BASE) {
        return Number(s64 - STEAM64_BASE);
      }
    } catch {}
  }
  const activeVal = cookieStore.get(ACTIVE_ACCOUNT_COOKIE)?.value;
  if (activeVal) {
    const num = Number(activeVal);
    if (!isNaN(num) && num > 0) return num;
  }
  return null;
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  cookieStore.delete(ACTIVE_ACCOUNT_COOKIE);
}
