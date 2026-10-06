import { Metadata } from "next";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import LiveMatchesView from "@/components/matches/LiveMatchesView";
import type { EnrichedPublicMatch } from "@/app/api/live-matches/route";

export const metadata: Metadata = {
  title: "Матчи Dota 2 | Турниры и High MMR | AegisGG",
  description:
    "Профессиональные турнирные матчи и рейтинговые игры High MMR. Официальные позиции 1–5, полный скорборд 10 игроков, тайминги предметов и сборки.",
};

export const dynamic = "force-dynamic";
export const revalidate = 30;

async function fetchInitialMatches(): Promise<EnrichedPublicMatch[]> {
  try {
    const { prisma } = await import("@/lib/prisma");
    const { fetchAllHeroes, heroIconUrl, getGameModeName } = await import("@/lib/opendota");
    const [heroes, dbRecords] = await Promise.all([
      fetchAllHeroes(),
      prisma.dotaMatch.findMany({
        take: 30,
        orderBy: { startTime: "desc" },
      }),
    ]);
    const heroMap = new Map(heroes.map((h) => [h.id, h]));
    const mapHero = (id: number) => {
      const h = heroMap.get(id);
      return {
        hero_id: id,
        name: h?.localized_name ?? `Герой #${id}`,
        icon: h ? heroIconUrl(h.name) : null,
      };
    };

    return dbRecords.map((m) => {
      let players: any[] = [];
      try {
        players = typeof m.playersJson === "string" ? JSON.parse(m.playersJson) : m.playersJson;
      } catch {}

      const radPlayers = players.filter((p) => p.isRadiant ?? (p.player_slot < 128));
      const direPlayers = players.filter((p) => !(p.isRadiant ?? (p.player_slot < 128)));
      const radHeroes = radPlayers.map((p) => p.hero_id || 0).filter(Boolean);
      const direHeroes = direPlayers.map((p) => p.hero_id || 0).filter(Boolean);
      const isPro = m.lobbyType === 1 || m.gameMode === 2 || Boolean(m.regionName?.toLowerCase().includes("tournament"));

      return {
        match_id: Number(m.matchId),
        match_seq_num: 0,
        radiant_win: m.radiantWin,
        start_time: Math.floor(new Date(m.startTime).getTime() / 1000),
        duration: m.duration,
        lobby_type: m.lobbyType ?? 7,
        game_mode: m.gameMode ?? 22,
        game_mode_name: m.gameModeName || getGameModeName(m.gameMode),
        avg_mmr: isPro ? 8500 : m.gameMode === 22 ? 6200 : null,
        num_mmr: 10,
        avg_rank_tier: isPro ? 80 : m.gameMode === 22 ? 65 : 45,
        radiant_team: radHeroes,
        dire_team: direHeroes,
        radiant_score: m.radiantScore,
        dire_score: m.direScore,
        radiant_name: "Radiant",
        dire_name: "Dire",
        is_pro: isPro,
        radiant_heroes: radHeroes.map(mapHero),
        dire_heroes: direHeroes.map(mapHero),
      };
    });
  } catch {
    return [];
  }
}

export default async function MatchesPage() {
  const initialMatches = await fetchInitialMatches();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-zinc-800">
      <SiteHeader currentPath="/matches" />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <LiveMatchesView initialMatches={initialMatches} />
      </main>

      <SiteFooter />
    </div>
  );
}
