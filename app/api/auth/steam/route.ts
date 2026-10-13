import { redirect } from 'next/navigation';
import { buildSteamLoginUrl } from '@/lib/steam-auth';

/**
 * GET /api/auth/steam
 * Redirects the user to Steam's OpenID login page.
 */
export async function GET(request: Request) {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost || request.headers.get("host");

  let origin = process.env.NEXTAUTH_URL || (forwardedProto && host ? `${forwardedProto}://${host}` : new URL(request.url).origin);
  origin = origin.replace(/\/$/, "");
  const returnTo = `${origin}/api/auth/steam/callback`;
  const loginUrl = buildSteamLoginUrl(returnTo);
  redirect(loginUrl);
}
