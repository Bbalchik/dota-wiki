import { NextResponse } from 'next/server';
import { getSession, ACTIVE_ACCOUNT_COOKIE } from '@/lib/session';
import { cookies } from 'next/headers';
import { steamId64ToAccountId } from '@/lib/steam-auth';
import { prisma } from '@/lib/prisma';
import { fetchPlayerProfile } from '@/lib/opendota';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    const cookieStore = await cookies();
    const activeCookie = cookieStore.get(ACTIVE_ACCOUNT_COOKIE)?.value;

    let accountId: number | null = null;
    let steamId64: string | null = null;

    if (session) {
      steamId64 = session.steamId;
      accountId = steamId64ToAccountId(session.steamId);
    } else if (activeCookie) {
      const parsed = Number(activeCookie);
      if (!isNaN(parsed) && parsed > 0) {
        accountId = parsed;
        steamId64 = String(BigInt(accountId) + BigInt("76561197960265728"));
      }
    }

    if (!accountId) {
      return NextResponse.json({ authenticated: false, activeAccount: false, accountId: null });
    }

    // Look up cached profile from DB or OpenDota
    let personaName = `Игрок #${accountId}`;
    let avatarUrl: string | null = null;

    if (steamId64) {
      const dbProfile = await prisma.steamProfile.findUnique({
        where: { steamId: steamId64 },
      });
      if (dbProfile) {
        personaName = dbProfile.personaName;
        avatarUrl = dbProfile.avatarUrl;
      }
    }

    if (!avatarUrl) {
      const liveProfile = await fetchPlayerProfile(accountId).catch(() => null);
      if (liveProfile?.profile) {
        personaName = liveProfile.profile.personaname || personaName;
        avatarUrl = liveProfile.profile.avatarmedium || liveProfile.profile.avatar;
      }
    }

    return NextResponse.json({
      authenticated: Boolean(session),
      activeAccount: true,
      accountId,
      steamId: steamId64,
      personaName,
      avatarUrl,
    });
  } catch (e: any) {
    return NextResponse.json({ authenticated: false, error: e?.message }, { status: 500 });
  }
}
