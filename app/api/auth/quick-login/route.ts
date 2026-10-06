import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, isSecureCookie, COOKIE_NAME, EXPIRY_DAYS } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { fetchPlayerProfile } from "@/lib/opendota";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawAccountId = searchParams.get("accountId") ?? "1068082356";
    const accountId = Number(rawAccountId);
    const redirectPath = searchParams.get("redirect") ?? `/player/${accountId}`;

    if (isNaN(accountId) || accountId <= 0) {
      return NextResponse.json({ error: "Invalid account ID" }, { status: 400 });
    }

    const steamId64 = String(BigInt(accountId) + BigInt("76561197960265728"));
    const playerData = await fetchPlayerProfile(accountId);
    const personaName = playerData?.profile?.personaname ?? `Player #${accountId}`;
    const avatarUrl = playerData?.profile?.avatarfull ?? null;
    const rankTier = playerData?.rank_tier ?? null;
    const leaderboardRank = playerData?.leaderboard_rank ?? null;
    const mmrEstimate = playerData?.mmr_estimate?.estimate ?? 0;

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
          rankTier: rankTier ?? existingProfile.rankTier,
          leaderboardRank: leaderboardRank ?? existingProfile.leaderboardRank,
        },
      });
    } else {
      profile = await prisma.steamProfile.create({
        data: {
          steamId: String(accountId),
          personaName,
          avatarUrl,
          rankTier: rankTier ?? 0,
          leaderboardRank,
          currentMmr: mmrEstimate,
          wins: 0,
          losses: 0,
        },
      });
    }

    const token = await createSessionToken({ steamId: steamId64, profileId: profile.id });
    const expiresAt = new Date(Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    const targetUrl = new URL(redirectPath, request.url);
    const response = NextResponse.redirect(targetUrl);

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: isSecureCookie(),
      expires: expiresAt,
      maxAge: EXPIRY_DAYS * 24 * 60 * 60,
      sameSite: "lax",
      path: "/",
    });

    return response;
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to create quick session" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const accountId = Number(body.accountId);

    if (isNaN(accountId) || accountId <= 0) {
      return NextResponse.json({ error: "Invalid account ID" }, { status: 400 });
    }

    const steamId64 = String(BigInt(accountId) + BigInt("76561197960265728"));
    const playerData = await fetchPlayerProfile(accountId);
    const personaName = playerData?.profile?.personaname ?? `Player #${accountId}`;
    const avatarUrl = playerData?.profile?.avatarfull ?? null;
    const rankTier = playerData?.rank_tier ?? null;
    const leaderboardRank = playerData?.leaderboard_rank ?? null;
    const mmrEstimate = playerData?.mmr_estimate?.estimate ?? 0;

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
          rankTier: rankTier ?? existingProfile.rankTier,
          leaderboardRank: leaderboardRank ?? existingProfile.leaderboardRank,
        },
      });
    } else {
      profile = await prisma.steamProfile.create({
        data: {
          steamId: String(accountId),
          personaName,
          avatarUrl,
          rankTier: rankTier ?? 0,
          leaderboardRank,
          currentMmr: mmrEstimate,
          wins: 0,
          losses: 0,
        },
      });
    }

    const token = await createSessionToken({ steamId: steamId64, profileId: profile.id });
    const expiresAt = new Date(Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    const response = NextResponse.json({
      success: true,
      steamId: steamId64,
      accountId,
      personaName,
    });

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: isSecureCookie(),
      expires: expiresAt,
      maxAge: EXPIRY_DAYS * 24 * 60 * 60,
      sameSite: "lax",
      path: "/",
    });

    return response;
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to create quick session" }, { status: 500 });
  }
}
