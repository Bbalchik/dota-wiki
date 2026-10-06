"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { PlayerSearchBar } from "@/components/search/PlayerSearchBar";
import { PlayerProfileView } from "@/components/profile/PlayerProfileView";
import type { RankInfo } from "@/lib/ranks";
import type {
  OpenDotaPlayer,
  OpenDotaMatch,
  OpenDotaHero,
  OpenDotaPlayerHeroStat,
  OpenDotaPlayerCounts,
  OpenDotaRatingHistory,
  FullMatchDetails,
} from "@/lib/opendota";

type EnrichedMatch = OpenDotaMatch & {
  won: boolean;
  isRadiant: boolean;
  hero?: OpenDotaHero;
  heroIconUrl: string | null;
  gameModeName: string;
  laneRoleName: string;
};

interface DashboardProps {
  accountId: number;
  steamId64: string;
  profile: OpenDotaPlayer | null;
  wl: { win: number; lose: number } | null;
  matches: EnrichedMatch[];
  heroStats: OpenDotaPlayerHeroStat[];
  counts: OpenDotaPlayerCounts | null;
  heroMap: Record<number, OpenDotaHero>;
  rankInfo: RankInfo;
  ratings?: OpenDotaRatingHistory[];
  lastMatchDetails?: FullMatchDetails | null;
}

export function Dashboard({
  accountId,
  profile,
  wl,
  matches,
  heroStats,
  counts,
  heroMap,
  rankInfo,
  ratings,
  lastMatchDetails,
}: DashboardProps) {
  const persona = profile?.profile?.personaname ?? `Игрок #${accountId}`;
  const avatarFull = profile?.profile?.avatarfull;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans antialiased selection:bg-zinc-700 selection:text-white">
      {/* Shared profile view — own profile with unified SiteHeader */}
      <PlayerProfileView
        accountId={accountId}
        isOwn
        profile={profile}
        wl={wl}
        matches={matches}
        heroStats={heroStats}
        counts={counts}
        heroMap={heroMap}
        rankInfo={rankInfo}
        ratings={ratings}
        lastMatchDetails={lastMatchDetails}
      />
    </div>
  );
}
