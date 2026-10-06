import { NextRequest, NextResponse } from "next/server";
import { fetchAllHeroes, heroIconUrl, getGameModeName } from "@/lib/opendota";

const OPENDOTA_BASE = "https://api.opendota.com/api";

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

// Memory cache for pro match details (cache for 3 minutes)
let proMatchesCache: {
  timestamp: number;
  matches: EnrichedPublicMatch[];
} | null = null;

const CACHE_TTL_MS = 3 * 60 * 1000;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") ?? "all"; // 'all', 'pro', 'ranked'

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

    // 1. Fetch real professional tournament matches
    let proMatches: EnrichedPublicMatch[] = [];
    const now = Date.now();

    if (proMatchesCache && now - proMatchesCache.timestamp < CACHE_TTL_MS) {
      proMatches = proMatchesCache.matches;
    } else {
      try {
        const proRes = await fetch(`${OPENDOTA_BASE}/proMatches`, {
          next: { revalidate: 180 },
        });

        if (proRes.ok) {
          const proList: any[] = await proRes.json();
          const topCandidates = (Array.isArray(proList) ? proList : [])
            .filter((m) => m.match_id && m.duration >= 900)
            .slice(0, 10);

          // Fetch full details for the top pro matches in parallel
          const detailsList = await Promise.all(
            topCandidates.map(async (pm) => {
              try {
                const dRes = await fetch(`${OPENDOTA_BASE}/matches/${pm.match_id}`, {
                  next: { revalidate: 1800 },
                });
                if (dRes.ok) return await dRes.json();
              } catch {
                return null;
              }
              return null;
            })
          );

          proMatches = detailsList
            .filter((d) => d && Array.isArray(d.players) && d.players.length === 10)
            .map((d) => {
              const radPlayers = d.players.filter((p: any) => p.player_slot < 128);
              const direPlayers = d.players.filter((p: any) => p.player_slot >= 128);

              const radHeroes = radPlayers.map((p: any) => p.hero_id);
              const direHeroes = direPlayers.map((p: any) => p.hero_id);

              return {
                match_id: d.match_id,
                match_seq_num: d.match_seq_num ?? 0,
                radiant_win: d.radiant_win,
                start_time: d.start_time,
                duration: d.duration,
                lobby_type: 1, // Tournament
                game_mode: 2, // Captain's Mode
                game_mode_name: d.league?.name ? `Турнир: ${d.league.name}` : "Captain's Mode",
                avg_mmr: 8000,
                num_mmr: 10,
                avg_rank_tier: 80, // Immortal
                radiant_team: radHeroes,
                dire_team: direHeroes,
                radiant_score: d.radiant_score ?? 0,
                dire_score: d.dire_score ?? 0,
                radiant_name: d.radiant_name || "Radiant",
                dire_name: d.dire_name || "Dire",
                league_name: d.league?.name,
                is_pro: true,
                radiant_heroes: radHeroes.map(mapHero),
                dire_heroes: direHeroes.map(mapHero),
              };
            });

          if (proMatches.length > 0) {
            proMatchesCache = { timestamp: now, matches: proMatches };
          }
        }
      } catch (err) {
        console.error("Error fetching pro matches in live-matches route:", err);
      }
    }

    // 2. Fetch verified high-MMR public matches (filter out Turbo, 1v1, bot games, remakes)
    let publicRankedMatches: EnrichedPublicMatch[] = [];
    try {
      const pubRes = await fetch(
        `${OPENDOTA_BASE}/publicMatches?mmr_ascending=0`,
        { next: { revalidate: 45 } }
      );

      if (pubRes.ok) {
        const raw: any[] = await pubRes.json();
        if (Array.isArray(raw)) {
          publicRankedMatches = raw
            .filter(
              (m) =>
                m.duration >= 900 && // >= 15 minutes (no 5m remakes)
                m.game_mode !== 23 && // strictly NO TURBO!
                m.game_mode !== 21 && // strictly NO 1v1!
                m.lobby_type !== 4 && // strictly NO bot games!
                Array.isArray(m.radiant_team) &&
                m.radiant_team.length === 5 &&
                m.radiant_team.every((h: number) => h > 0) &&
                Array.isArray(m.dire_team) &&
                m.dire_team.length === 5 &&
                m.dire_team.every((h: number) => h > 0)
            )
            .map((m) => ({
              ...m,
              game_mode_name: getGameModeName(m.game_mode),
              is_pro: false,
              radiant_heroes: m.radiant_team.map(mapHero),
              dire_heroes: m.dire_team.map(mapHero),
            }));
        }
      }
    } catch (err) {
      console.error("Error fetching public matches in live-matches route:", err);
    }

    // Combined list: Pro tournament matches first, then valid ranked matches
    let finalMatches: EnrichedPublicMatch[] = [];
    if (category === "pro") {
      finalMatches = proMatches;
    } else if (category === "ranked") {
      finalMatches = publicRankedMatches;
    } else {
      finalMatches = [...proMatches, ...publicRankedMatches];
    }

    return NextResponse.json(
      { matches: finalMatches, fetchedAt: Date.now() },
      {
        headers: {
          "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
        },
      }
    );
  } catch (error: any) {
    console.error("/api/live-matches error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal error" },
      { status: 500 }
    );
  }
}
