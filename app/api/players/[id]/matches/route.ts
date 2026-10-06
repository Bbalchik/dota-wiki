import { NextRequest, NextResponse } from "next/server";
import {
  fetchRecentMatches,
  fetchMatchDetails,
  fetchAllHeroes,
  heroIconUrl,
  getGameModeName,
  getLaneRoleName,
  triggerPlayerSteamSync,
  clearPlayerCache,
} from "@/lib/opendota";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const accountId = Number(id);

  if (isNaN(accountId) || accountId <= 0) {
    return NextResponse.json({ error: "Invalid account ID" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") || 100);
  const shouldSync = searchParams.get("sync") === "true";
  const bypassCache = searchParams.get("force") === "true" || shouldSync;

  try {
    if (shouldSync) {
      clearPlayerCache(accountId);
      await triggerPlayerSteamSync(accountId);
      // Brief wait to give OpenDota a moment to fetch Steam Web API
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    const [rawMatches, heroes] = await Promise.all([
      fetchRecentMatches(accountId, Math.min(limit, 200), bypassCache),
      fetchAllHeroes(),
    ]);

    // Register player in autonomous background auto-updater
    try {
      const { trackPlayerId } = await import("@/lib/dota-auto-updater");
      trackPlayerId(accountId);
    } catch {}

    // Enrich at most 3 recent matches that lack inventory items (to keep latency low and eliminate lag)
    const matchesToEnrich = rawMatches.slice(0, 3).filter(
      (m) => m.item_0 === undefined || (m.item_0 === 0 && m.item_1 === 0 && m.item_2 === 0)
    );
    if (matchesToEnrich.length > 0) {
      await Promise.all(
        matchesToEnrich.map(async (m) => {
          try {
            const details = await fetchMatchDetails(m.match_id);
            if (details && details.players) {
              const p = details.players.find(
                (x) =>
                  (x.account_id && x.account_id === accountId) ||
                  x.player_slot === m.player_slot ||
                  x.hero_id === m.hero_id
              );
              if (p) {
                m.item_0 = p.item_0;
                m.item_1 = p.item_1;
                m.item_2 = p.item_2;
                m.item_3 = p.item_3;
                m.item_4 = p.item_4;
                m.item_5 = p.item_5;
                m.item_neutral = p.item_neutral;
                m.backpack_0 = p.backpack_0;
                m.backpack_1 = p.backpack_1;
                m.backpack_2 = p.backpack_2;
                if (p.net_worth) m.net_worth = p.net_worth;
                if (p.hero_damage) m.hero_damage = p.hero_damage;
                if (p.level) m.level = p.level;
              }
            }
          } catch {}
        })
      );
    }

    const heroMap = new Map(heroes.map((h) => [h.id, h]));

    const enriched = rawMatches.map((m) => {
      const hero = heroMap.get(m.hero_id);
      const isRadiant = m.player_slot < 128;
      const won = isRadiant ? m.radiant_win : !m.radiant_win;
      return {
        ...m,
        won,
        isRadiant,
        hero: hero ? { id: hero.id, name: hero.name, localized_name: hero.localized_name } : undefined,
        heroIconUrl: hero ? heroIconUrl(hero.name) : null,
        gameModeName: getGameModeName(m.game_mode),
        laneRoleName: getLaneRoleName(m.lane_role),
      };
    });

    return NextResponse.json(
      {
        success: true,
        matches: enriched,
        total: enriched.length,
        syncedWithSteam: shouldSync,
        fetchedAt: Date.now(),
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error: any) {
    console.error(`Error fetching matches for ${accountId}:`, error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch matches" },
      { status: 500 }
    );
  }
}
