import { redirect } from 'next/navigation';
import { buildSteamLoginUrl } from '@/lib/steam-auth';

/**
 * GET /api/auth/steam
 * Redirects the user to Steam's OpenID login page.
 */
export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const returnTo = `${origin}/api/auth/steam/callback`;
  const loginUrl = buildSteamLoginUrl(returnTo);
  redirect(loginUrl);
}
