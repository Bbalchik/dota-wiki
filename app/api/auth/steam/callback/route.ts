import { NextRequest, NextResponse } from 'next/server';
import { verifySteamCallback, steamId64ToAccountId } from '@/lib/steam-auth';
import { createSessionToken, isSecureCookie, COOKIE_NAME, EXPIRY_DAYS } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { fetchPlayerProfile } from '@/lib/opendota';

/**
 * GET /api/auth/steam/callback
 * Steam redirects here after the user authenticates.
 * We verify the OpenID response, then upsert the user in our DB.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // 1. Verify the OpenID signature with Steam
  const steamId64 = await verifySteamCallback(searchParams);
  if (!steamId64) {
    return NextResponse.redirect(new URL('/?error=steam_auth_failed', request.url));
  }

  // 2. Convert to Dota 2 account_id (SteamID32)
  const accountId = steamId64ToAccountId(steamId64);

  // 3. Fetch player profile from OpenDota API
  const playerData = await fetchPlayerProfile(accountId);

  const personaName = playerData?.profile?.personaname ?? `Player ${accountId}`;
  const avatarUrl = playerData?.profile?.avatarfull ?? null;
  const rankTier = playerData?.rank_tier ?? null;
  const leaderboardRank = playerData?.leaderboard_rank ?? null;
  const mmrEstimate = playerData?.mmr_estimate?.estimate ?? 0;

  // 4. Upsert profile in our database
  const profile = await prisma.steamProfile.upsert({
    where: { steamId: steamId64 },
    update: {
      personaName,
      avatarUrl,
      rankTier: rankTier ?? 0,
      leaderboardRank,
    },
    create: {
      steamId: steamId64,
      personaName,
      avatarUrl,
      rankTier: rankTier ?? 0,
      leaderboardRank,
      currentMmr: mmrEstimate,
      wins: 0,
      losses: 0,
    },
  });

  // 5. Create session cookie token and attach to 302 redirect response
  const token = await createSessionToken({ steamId: steamId64, profileId: profile.id });
  const expiresAt = new Date(Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  const response = NextResponse.redirect(new URL('/', request.url));
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isSecureCookie(),
    expires: expiresAt,
    maxAge: EXPIRY_DAYS * 24 * 60 * 60,
    sameSite: 'lax',
    path: '/',
  });

  return response;
}
