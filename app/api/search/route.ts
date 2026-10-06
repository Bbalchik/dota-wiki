import { NextRequest, NextResponse } from "next/server";
import { searchPlayers, fetchPlayerProfile } from "@/lib/opendota";

const STEAM64_BASE = BigInt("76561197960265728");

export async function GET(request: NextRequest) {
  const rawQ = request.nextUrl.searchParams.get("q") ?? "";
  const q = rawQ.trim();
  if (!q || q.length < 2) {
    return NextResponse.json([]);
  }

  // 1. Direct Numeric ID or SteamID64 resolution
  if (/^\d+$/.test(q)) {
    try {
      const n = BigInt(q);
      let accountId = Number(n);
      if (n > STEAM64_BASE) {
        accountId = Number(n - STEAM64_BASE);
      }

      if (accountId > 0) {
        const profile = await fetchPlayerProfile(accountId);
        if (profile?.profile) {
          return NextResponse.json([
            {
              account_id: accountId,
              personaname: profile.profile.personaname,
              avatarfull: profile.profile.avatarfull,
              last_match_time: "",
              sml: 1,
            },
          ]);
        }
      }
    } catch {}
  }

  // 2. Direct Steam Community / Dotabuff / Stratz URL resolution
  const playerUrlMatch = q.match(/(?:players|player)\/(\d{1,10})/i);
  if (playerUrlMatch) {
    const accId = Number(playerUrlMatch[1]);
    const profile = await fetchPlayerProfile(accId);
    if (profile?.profile) {
      return NextResponse.json([
        {
          account_id: accId,
          personaname: profile.profile.personaname,
          avatarfull: profile.profile.avatarfull,
          last_match_time: "",
          sml: 1,
        },
      ]);
    }
  }

  // 3. Name search across local database + OpenDota
  const results = await searchPlayers(q);
  return NextResponse.json(results);
}
