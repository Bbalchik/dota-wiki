"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PlayerProfileView } from "@/components/profile/PlayerProfileView";
import { PlayerSearchBar } from "@/components/search/PlayerSearchBar";
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

interface PublicProfileProps {
  accountId: number;
  profile: OpenDotaPlayer | null;
  wl: { win: number; lose: number } | null;
  matches: EnrichedMatch[];
  heroStats: OpenDotaPlayerHeroStat[];
  counts: OpenDotaPlayerCounts | null;
  heroMap: Record<number, OpenDotaHero>;
  rankInfo: RankInfo;
  ratings?: OpenDotaRatingHistory[];
  lastMatchDetails?: FullMatchDetails | null;
  initialMatchDetails?: Record<number, any>;
}

export function PublicProfile(props: PublicProfileProps) {
  return <PlayerProfileView {...props} isOwn={false} />;
}
