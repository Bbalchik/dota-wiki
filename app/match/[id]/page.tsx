import { fetchMatchDetails, fetchAllHeroes } from "@/lib/opendota";
import { MatchBreakdown } from "@/components/match/MatchBreakdown";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

interface MatchPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ heroId?: string; tab?: string }>;
}

export default async function MatchPage({ params, searchParams }: MatchPageProps) {
  const { id } = await params;
  const sp = searchParams ? await searchParams : {};

  const [match, heroes] = await Promise.all([
    fetchMatchDetails(id),
    fetchAllHeroes(),
  ]);

  if (!match) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-2xl border border-zinc-800/80 bg-zinc-900/60 backdrop-blur-md p-8 text-center space-y-4 shadow-xl">
          <h2 className="text-xl font-bold">Матч #{id} не найден</h2>
          <p className="text-xs text-zinc-400">
            Не удалось загрузить данные по этому матчу. Возможно, он ещё не завершился или был сыгран на приватном сервере.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/60 px-4 py-2.5 text-xs font-semibold text-zinc-200 transition"
          >
            <ArrowLeft className="size-4" /> На главную
          </Link>
        </div>
      </div>
    );
  }

  const initialHeroId = sp.heroId ? Number(sp.heroId) : undefined;
  const initialTab =
    (sp.tab as "matchup" | "scoreboard" | "timeline" | "charts" | "map" | "builds" | "draft" | "kills" | undefined) ?? "matchup";

  return (
    <MatchBreakdown
      match={match}
      heroes={heroes}
      initialTab={initialTab}
      initialHeroId={initialHeroId}
    />
  );
}
