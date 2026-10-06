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
    const res = await fetch(
      "https://api.opendota.com/api/publicMatches?mmr_ascending=0",
      { next: { revalidate: 30 } }
    );
    if (!res.ok) return [];
    const raw = await res.json();
    if (!Array.isArray(raw)) return [];

    return raw
      .filter((m: any) => m.duration >= 300 && m.radiant_team?.some((h: number) => h > 0) && m.dire_team?.some((h: number) => h > 0))
      .map((m: any) => ({
        ...m,
        radiant_heroes: (m.radiant_team ?? []).map((id: number) => ({
          hero_id: id,
          name: `#${id}`,
          icon: null,
        })),
        dire_heroes: (m.dire_team ?? []).map((id: number) => ({
          hero_id: id,
          name: `#${id}`,
          icon: null,
        })),
      }));
  } catch {
    return [];
  }
}

export default async function MatchesPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-zinc-800">
      <SiteHeader currentPath="/matches" />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <LiveMatchesView initialMatches={[]} />
      </main>

      <SiteFooter />
    </div>
  );
}
