import { NextRequest, NextResponse } from "next/server";
import { fetchAllHeroes, heroIconUrl, getGameModeName, isRateLimitExceeded, safeOpenDotaFetch } from "@/lib/opendota";
import { prisma } from "@/lib/prisma";

export type PublicMatch = {
  match_id: number;
  match_seq_num: number;
  radiant_win: boolean;
  start_time: number;
  duration: number;
  lobby_type: number;
  game_mode: number;
  game_mode_name: string;
  avg_mmr: number | null;
  num_mmr: number;
  avg_rank_tier: number | null;
  radiant_team: number[]; // hero IDs
  dire_team: number[]; // hero IDs
  radiant_score?: number;
  dire_score?: number;
  radiant_name?: string;
  dire_name?: string;
  league_name?: string;
  is_pro?: boolean;
};

export type EnrichedPublicMatch = PublicMatch & {
  radiant_heroes: { hero_id: number; name: string; icon: string | null }[];
  dire_heroes: { hero_id: number; name: string; icon: string | null }[];
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") ?? "all"; // 'all', 'ranked', 'turbo', 'pro', 'normal'
    const limitParam = Number(searchParams.get("limit") || 50);
    const limit = Math.min(Math.max(limitParam, 10), 100);

    const heroes = await fetchAllHeroes();
    const heroMap = new Map(heroes.map((h) => [h.id, h]));

    const mapHero = (id: number) => {
      const h = heroMap.get(id);
      return {
        hero_id: id,
        name: h?.localized_name ?? `Герой #${id}`,
        icon: h ? heroIconUrl(h.name) : null,
      };
    };

    // 1. Build database where clause based on requested category
    const whereClause: any = {};
    if (category === "ranked") {
      whereClause.gameMode = 22; // Ranked All Pick
    } else if (category === "turbo") {
      whereClause.gameMode = 23; // Turbo
    } else if (category === "pro") {
      whereClause.OR = [
        { gameMode: 2 }, // Captain's Mode
        { lobbyType: 1 }, // Tournament
        { gameModeName: { contains: "Captain" } },
      ];
    } else if (category === "normal") {
      whereClause.gameMode = { notIn: [2, 22, 23] };
    }

    // 2. Fetch matches from local SQLite database (over 750 matches stored)
    const dbRecords = await prisma.dotaMatch.findMany({
      where: whereClause,
      take: limit,
      orderBy: { startTime: "desc" },
    });

    const enrichedDbMatches: EnrichedPublicMatch[] = dbRecords.map((m) => {
      let players: any[] = [];
      try {
        players = typeof m.playersJson === "string" ? JSON.parse(m.playersJson) : m.playersJson;
      } catch {}

      const radPlayers = players.filter((p) => p.isRadiant ?? (p.player_slot < 128));
      const direPlayers = players.filter((p) => !(p.isRadiant ?? (p.player_slot < 128)));

      const radHeroes = radPlayers.map((p) => p.hero_id || 0).filter(Boolean);
      const direHeroes = direPlayers.map((p) => p.hero_id || 0).filter(Boolean);

      const isPro = Boolean(
        m.lobbyType === 1 ||
        m.gameMode === 2 ||
        m.regionName?.toLowerCase().includes("tournament") ||
        m.gameModeName?.toLowerCase().includes("captain")
      );

      // Estimate avg rank tier and MMR
      const rankTiers = players
        .map((p) => p.rank_tier)
        .filter((r) => typeof r === "number" && r > 0);
      const avgRankTier =
        rankTiers.length > 0
          ? Math.round(rankTiers.reduce((a, b) => a + b, 0) / rankTiers.length)
          : isPro
          ? 80
          : m.gameMode === 22
          ? 65
          : 45;

      const mmrs = players
        .map((p) => p.computed_mmr)
        .filter((val) => typeof val === "number" && val > 0);
      const avgMmr =
        mmrs.length > 0
          ? Math.round(mmrs.reduce((a, b) => a + b, 0) / mmrs.length)
          : isPro
          ? 8500
          : m.gameMode === 22
          ? 6200
          : null;

      // Detect notable players or team names
      const radTopPlayer = radPlayers.find(
        (p) => p.personaname && p.personaname !== "Anonymous" && p.personaname !== "Игрок"
      );
      const direTopPlayer = direPlayers.find(
        (p) => p.personaname && p.personaname !== "Anonymous" && p.personaname !== "Игрок"
      );

      return {
        match_id: Number(m.matchId),
        match_seq_num: 0,
        radiant_win: m.radiantWin,
        start_time: Math.floor(new Date(m.startTime).getTime() / 1000),
        duration: m.duration,
        lobby_type: m.lobbyType ?? 7,
        game_mode: m.gameMode ?? 22,
        game_mode_name: m.gameModeName || getGameModeName(m.gameMode),
        avg_mmr: avgMmr,
        num_mmr: 10,
        avg_rank_tier: avgRankTier,
        radiant_team: radHeroes,
        dire_team: direHeroes,
        radiant_score: m.radiantScore,
        dire_score: m.direScore,
        radiant_name: isPro ? "Radiant" : radTopPlayer ? radTopPlayer.personaname : "Radiant",
        dire_name: isPro ? "Dire" : direTopPlayer ? direTopPlayer.personaname : "Dire",
        is_pro: isPro,
        radiant_heroes: radHeroes.map(mapHero),
        dire_heroes: direHeroes.map(mapHero),
      };
    });

    // 3. If external API is accessible and category allows, optionally fetch fresh public games
    let freshPublicMatches: EnrichedPublicMatch[] = [];
    if (!isRateLimitExceeded() && (category === "all" || category === "ranked")) {
      try {
        const pubRes = await safeOpenDotaFetch("/publicMatches?mmr_ascending=0", {
          next: { revalidate: 60 },
        }, 1800);
        if (pubRes && pubRes.ok) {
          const raw: any[] = await pubRes.json();
          if (Array.isArray(raw)) {
            freshPublicMatches = raw
              .filter(
                (m) =>
                  m.duration >= 900 &&
                  Array.isArray(m.radiant_team) &&
                  m.radiant_team.length === 5 &&
                  Array.isArray(m.dire_team) &&
                  m.dire_team.length === 5
              )
              .slice(0, 10)
              .map((m) => ({
                ...m,
                game_mode_name: getGameModeName(m.game_mode),
                is_pro: false,
                radiant_heroes: m.radiant_team.map(mapHero),
                dire_heroes: m.dire_team.map(mapHero),
              }));
          }
        }
      } catch {}
    }

    // Merge: fresh matches on top, then existing diverse DB matches
    const seenMatchIds = new Set<number>();
    const combined: EnrichedPublicMatch[] = [];

    for (const m of freshPublicMatches) {
      if (!seenMatchIds.has(m.match_id)) {
        seenMatchIds.add(m.match_id);
        combined.push(m);
      }
    }

    for (const m of enrichedDbMatches) {
      if (!seenMatchIds.has(m.match_id)) {
        seenMatchIds.add(m.match_id);
        combined.push(m);
      }
    }

    return NextResponse.json(
      {
        matches: combined,
        fetchedAt: Date.now(),
        total: combined.length,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=15, stale-while-revalidate=45",
        },
      }
    );
  } catch (error: any) {
    console.error("/api/live-matches error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal error", matches: [] },
      { status: 500 }
    );
  }
}
