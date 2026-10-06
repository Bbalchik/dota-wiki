import { NextRequest, NextResponse } from "next/server";
import { ACTIVE_ACCOUNT_COOKIE, COOKIE_NAME, EXPIRY_DAYS, createSessionToken, isSecureCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { fetchPlayerProfile } from "@/lib/opendota";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const accountId = Number(body.accountId);
    if (isNaN(accountId) || accountId <= 0) {
      return NextResponse.json({ error: "Invalid account ID" }, { status: 400 });
    }

    const steamId64 = String(BigInt(accountId) + BigInt("76561197960265728"));
    const pData = await fetchPlayerProfile(accountId).catch(() => null);
    const personaName = pData?.profile?.personaname ?? `Игрок #${accountId}`;
    const avatarUrl = pData?.profile?.avatarfull ?? null;

    const existingProfile = await prisma.steamProfile.findFirst({
      where: {
        OR: [
          { steamId: steamId64 },
          { steamId: String(accountId) },
        ],
      },
    });

    let profile;
    if (existingProfile) {
      profile = await prisma.steamProfile.update({
        where: { id: existingProfile.id },
        data: {
          personaName,
          avatarUrl: avatarUrl || existingProfile.avatarUrl,
          rankTier: pData?.rank_tier ?? existingProfile.rankTier,
          leaderboardRank: pData?.leaderboard_rank ?? existingProfile.leaderboardRank,
        },
      });
    } else {
      profile = await prisma.steamProfile.create({
        data: {
          steamId: String(accountId),
          personaName,
          avatarUrl,
          rankTier: pData?.rank_tier ?? 0,
          leaderboardRank: pData?.leaderboard_rank ?? null,
          currentMmr: pData?.mmr_estimate?.estimate ?? 0,
          wins: 0,
          losses: 0,
        },
      });
    }

    const token = await createSessionToken({ steamId: steamId64, profileId: profile.id });
    const res = NextResponse.json({
      success: true,
      accountId,
      personaName,
      avatarUrl,
    });

    const oneYear = 365 * 24 * 60 * 60 * 1000;
    // Set active_account_id cookie (accessible to client and server)
    res.cookies.set(ACTIVE_ACCOUNT_COOKIE, String(accountId), {
      httpOnly: false,
      secure: isSecureCookie(),
      expires: new Date(Date.now() + oneYear),
      maxAge: 365 * 24 * 60 * 60,
      sameSite: "lax",
      path: "/",
    });

    // Also set JWT session cookie
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: isSecureCookie(),
      expires: new Date(Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000),
      maxAge: EXPIRY_DAYS * 24 * 60 * 60,
      sameSite: "lax",
      path: "/",
    });

    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to set active account" }, { status: 500 });
  }
}
