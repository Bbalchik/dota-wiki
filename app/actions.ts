"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function linkSteamAccount(formData: FormData) {
  const steamId = formData.get("steamId")?.toString().trim();
  const customName = formData.get("personaName")?.toString().trim();
  const startingMmr = parseInt(formData.get("currentMmr")?.toString() || "6000", 10);

  if (!steamId) return { error: "Please enter a valid Steam / Dota 2 ID" };

  try {
    // Check if OpenDota public API has info for this account
    let fetchedName = customName || `Dota Player #${steamId}`;
    let fetchedAvatar = "https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg";
    let rankTier = 80;
    let leaderboardRank: number | null = 540;

    try {
      const res = await fetch(`https://api.opendota.com/api/players/${steamId}`, {
        next: { revalidate: 3600 },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.profile) {
          fetchedName = data.profile.personaname || fetchedName;
          fetchedAvatar = data.profile.avatarfull || fetchedAvatar;
          rankTier = data.rank_tier || rankTier;
          leaderboardRank = data.leaderboard_rank || null;
        }
      }
    } catch {
      // Offline or rate limit fallback
    }

    const existing = await prisma.steamProfile.findFirst({
      where: { steamId },
    });

    if (existing) {
      await prisma.steamProfile.update({
        where: { id: existing.id },
        data: {
          personaName: fetchedName,
          avatarUrl: fetchedAvatar,
          rankTier,
          leaderboardRank,
          currentMmr: startingMmr || existing.currentMmr,
        },
      });
    } else {
      await prisma.steamProfile.create({
        data: {
          steamId,
          personaName: fetchedName,
          avatarUrl: fetchedAvatar,
          rankTier,
          leaderboardRank,
          currentMmr: startingMmr,
          wins: 150,
          losses: 120,
        },
      });
    }

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Error linking steam account:", error);
    return { error: "Failed to link Steam account" };
  }
}

export async function recordNewMatch(formData: FormData) {
  const profileId = parseInt(formData.get("profileId")?.toString() || "0", 10);
  const heroId = parseInt(formData.get("heroId")?.toString() || "1", 10);
  const won = formData.get("won") === "true";
  const mmrChange = parseInt(formData.get("mmrChange")?.toString() || (won ? "25" : "-25"), 10);
  const kills = parseInt(formData.get("kills")?.toString() || "10", 10);
  const deaths = parseInt(formData.get("deaths")?.toString() || "3", 10);
  const assists = parseInt(formData.get("assists")?.toString() || "8", 10);
  const role = formData.get("role")?.toString() || "Safe Lane";

  if (!profileId) return { error: "No active profile" };

  try {
    const profile = await prisma.steamProfile.findUnique({
      where: { id: profileId },
    });

    if (!profile) return { error: "Profile not found" };

    const newMmr = profile.currentMmr + mmrChange;

    await prisma.playerMatch.create({
      data: {
        matchId: `${Date.now()}`,
        profileId,
        heroId,
        won,
        mmrChange,
        mmrAfter: newMmr,
        kills,
        deaths,
        assists,
        duration: 2100, // 35 min default
        role,
        goldPerMin: 720,
        xpPerMin: 790,
        netWorth: 24000,
        impScore: won ? 24 : -15,
        isMvp: won,
        startTime: new Date(),
      },
    });

    await prisma.steamProfile.update({
      where: { id: profileId },
      data: {
        currentMmr: newMmr,
        wins: won ? profile.wins + 1 : profile.wins,
        losses: !won ? profile.losses + 1 : profile.losses,
      },
    });

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Error recording match:", error);
    return { error: "Failed to record match" };
  }
}
