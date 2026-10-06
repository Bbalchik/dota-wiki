"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Swords,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Flame,
  TrendingUp,
  TrendingDown,
  Target,
  Filter,
  Award,
  Zap,
  LineChart,
  Activity,
  History,
  BookOpen,
  Trophy,
  Sparkles,
  Shield,
  ExternalLink,
} from "lucide-react";
import { RankMedal } from "@/components/ui/RankMedal";
import { getRankInfo, estimateMmrFromTier, getMmrRangeFromTier, rankTierToString, type RankInfo } from "@/lib/ranks";
import {
  type OpenDotaPlayer,
  type OpenDotaMatch,
  type OpenDotaHero,
  type OpenDotaPlayerHeroStat,
  type OpenDotaPlayerCounts,
  type OpenDotaRatingHistory,
  type FullMatchDetails,
  getItemIconUrl,
  getItemName,
  heroIconUrl,
} from "@/lib/opendota";
import {
  RolesAndLanesBar,
  TopHeroesDotabuffTable,
  RecentMatchesDotabuffTable,
  ActivityCalendarDotabuff,
  FullStatsSummaryTable,
  StratzHighlightsCard,
  buildActivityGridFromMatches,
} from "@/components/profile/DotabuffOverviewWidgets";
import { DotaInventoryHud } from "@/components/ui/DotaInventoryHud";
import { PlayerMatchesSection } from "@/components/profile/PlayerMatchesSection";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";

type EnrichedMatch = OpenDotaMatch & {
  won: boolean;
  isRadiant: boolean;
  hero?: OpenDotaHero;
  heroIconUrl: string | null;
  gameModeName: string;
  laneRoleName: string;
};

interface PlayerProfileViewProps {
  accountId: number;
  isOwn?: boolean;
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

function AttributeDonutChart({
  strPct,
  agiPct,
  intPct,
  allPct,
  total,
}: {
  strPct: number;
  agiPct: number;
  intPct: number;
  allPct: number;
  total: number;
}) {
  const r = 36;
  const c = 2 * Math.PI * r;

  const slices = [
    { name: "Ловкость", pct: agiPct, color: "#10b981" },
    { name: "Интеллект", pct: intPct, color: "#0ea5e9" },
    { name: "Сила", pct: strPct, color: "#ef4444" },
    { name: "Универсал", pct: allPct, color: "#a855f7" },
  ];

  let offset = 0;

  return (
    <div className="relative size-32 sm:size-36 shrink-0 flex items-center justify-center">
      <svg className="size-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="transparent" stroke="#182030" strokeWidth="11" />
        {slices.map((slice, i) => {
          if (slice.pct <= 0) return null;
          const strokeLength = (slice.pct / 100) * c;
          const currentOffset = offset;
          offset += strokeLength;
          return (
            <circle
              key={i}
              cx="50"
              cy="50"
              r={r}
              fill="transparent"
              stroke={slice.color}
              strokeWidth="11"
              strokeDasharray={`${strokeLength} ${c}`}
              strokeDashoffset={-currentOffset}
              className="transition-all duration-500"
            />
          );
        })}
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none">
        <span className="text-base font-black text-white font-mono leading-none">{total}</span>
        <span className="text-[9px] text-zinc-400 uppercase font-bold tracking-tight">игр</span>
      </div>
    </div>
  );
}



function safeNum(v: number | null | undefined, fallback = 0): number {
  if (v === null || v === undefined || isNaN(v) || !isFinite(v)) return fallback;
  return v;
}

function rankTierValue(tier: number | null | undefined): number {
  return tier && tier > 0 ? tier : 0;
}

function safeDiv(a: number, b: number, fallback = 0): number {
  if (!b || isNaN(b) || isNaN(a)) return fallback;
  return a / b;
}

function fmt(secs: number) {
  const s = safeNum(secs);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

function ago(unixTs: number) {
  const diff = Date.now() / 1000 - unixTs;
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)} дн назад`;
  return new Date(unixTs * 1000).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function getImpBadgeStyle(imp: number) {
  if (imp >= 20) return "bg-purple-950/60 text-purple-300 border-purple-500/50 shadow-sm shadow-purple-950/50";
  if (imp > 0) return "bg-emerald-950/60 text-emerald-300 border-emerald-500/50 shadow-sm shadow-emerald-950/50";
  if (imp >= -20) return "bg-zinc-900 text-zinc-300 border-zinc-700";
  return "bg-rose-950/60 text-rose-300 border-rose-500/50 shadow-sm shadow-rose-950/50";
}

const GAME_MODE_NAMES: Record<string, string> = {
  "1": "All Pick",
  "2": "Режим капитанов",
  "3": "Random Draft",
  "4": "Single Draft",
  "5": "All Random",
  "22": "Рейтинговый All Pick",
  "23": "Турбо",
};

const LANE_ROLE_NAMES: Record<string, string> = {
  "1": "Легкая линия",
  "2": "Центральная линия",
  "3": "Сложная линия",
  "4": "Лес / роум",
};

const ATTR_NAMES: Record<string, { label: string; color: string }> = {
  agi: { label: "Ловкость", color: "bg-emerald-950/50 text-emerald-400 border-emerald-500/30" },
  int: { label: "Интеллект", color: "bg-sky-950/50 text-sky-400 border-sky-500/30" },
  str: { label: "Сила", color: "bg-red-950/50 text-red-400 border-red-500/30" },
  all: { label: "Универсал", color: "bg-purple-950/50 text-purple-400 border-purple-500/30" },
};

type SortField = "date" | "duration" | "kda" | "kills" | "gpm" | "damage" | "cs";
type SortOrder = "desc" | "asc";

export function PlayerProfileView({
  accountId,
  isOwn = false,
  profile,
  wl,
  matches,
  heroStats,
  counts,
  heroMap,
  rankInfo,
  ratings,
  lastMatchDetails,
  initialMatchDetails,
}: PlayerProfileViewProps) {
  type TabType = "overview" | "matches" | "heroes" | "records";
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [filterResult, setFilterResult] = useState<"all" | "won" | "lost">("all");
  const [filterLobby, setFilterLobby] = useState<"all" | "ranked" | "normal" | "turbo">("all");
  const [filterFaction, setFilterFaction] = useState<"all" | "radiant" | "dire">("all");
  const [searchHeroText, setSearchHeroText] = useState("");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [allMatches, setAllMatches] = useState<EnrichedMatch[]>(matches);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);
  const [allMatchesLoaded, setAllMatchesLoaded] = useState(() => matches.length > 500);

  useEffect(() => {
    if (matches && matches.length > 0) {
      setAllMatches((prev) => {
        if (prev.length === 0) return matches;
        const prevIds = new Set(prev.map((m) => m.match_id));
        const newOnes = matches.filter((m) => !prevIds.has(m.match_id));
        if (newOnes.length > 0) return [...newOnes, ...prev];
        return prev;
      });
    }
  }, [matches]);

  const [syncing, setSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [isOwnerAccount, setIsOwnerAccount] = useState(isOwn);
  const [savingOwner, setSavingOwner] = useState(false);
  const matchStripRef = useRef<HTMLDivElement>(null);

  const scrollMatchStrip = (direction: "left" | "right") => {
    if (matchStripRef.current) {
      const scrollAmount = direction === "left" ? -240 : 240;
      matchStripRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  const handleSyncWithSteam = async () => {
    setSyncing(true);
    setSyncFeedback("Запрос отправлен в очередь Valve Steam API... Обновляем матчи...");
    try {
      const res = await fetch(`/api/players/${accountId}/matches?limit=100&sync=true`);
      if (res.ok) {
        const json = await res.json();
        const data = json.matches;
        if (Array.isArray(data) && data.length > 0) {
          setAllMatches(data);
          setAllMatchesLoaded(true);
        }
      }
      setSyncFeedback("✅ Матчи успешно синхронизированы со Steam!");
    } catch {
      setSyncFeedback("Ошибка при синхронизации со Steam.");
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncFeedback(null), 4000);
    }
  };

  useEffect(() => {
    if (isOwn) {
      try {
        localStorage.setItem(
          "dota_active_account",
          JSON.stringify({
            accountId,
            personaName: profile?.profile?.personaname || `Игрок #${accountId}`,
            avatarUrl: profile?.profile?.avatarfull || null,
          })
        );
      } catch {}
      return;
    }
    try {
      const stored = localStorage.getItem("dota_active_account");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.accountId === accountId) {
          setIsOwnerAccount(true);
        }
      }
    } catch {}
  }, [accountId, isOwn, profile]);

  const handleRememberMe = async () => {
    setSavingOwner(true);
    try {
      const res = await fetch("/api/auth/set-active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId }),
      });
      if (res.ok) {
        localStorage.setItem(
          "dota_active_account",
          JSON.stringify({
            accountId,
            personaName: persona,
            avatarUrl: avatarFull,
          })
        );
        setIsOwnerAccount(true);
        setSyncFeedback("✅ Аккаунт успешно закреплен! Теперь он открывается сразу на главной.");
        setTimeout(() => setSyncFeedback(null), 4000);
      }
    } catch {
      setSyncFeedback("Ошибка при сохранении аккаунта.");
    } finally {
      setSavingOwner(false);
    }
  };

  const persona = profile?.profile?.personaname ?? (allMatches[0] as any)?.personaname ?? `Игрок #${accountId}`;
  const avatarFull = profile?.profile?.avatarfull;
  const profileUrl = profile?.profile?.profileurl;
  const effectiveRankTier = profile?.rank_tier && profile.rank_tier > 0 ? profile.rank_tier : null;
  const effectiveRankInfo = getRankInfo(effectiveRankTier);
  const mmrRange = getMmrRangeFromTier(effectiveRankTier);
  const estimatedMmr = estimateMmrFromTier(effectiveRankTier) ?? (profile?.computed_mmr ? Math.round(profile.computed_mmr) : null);

  // Real match counts directly from Valve / Dota 2
  const totalHeroGames = heroStats.reduce((acc, h) => acc + safeNum(h.games), 0);
  const totalHeroWins = heroStats.reduce((acc, h) => acc + safeNum(h.win), 0);
  const totalWlGames = safeNum(wl?.win) + safeNum(wl?.lose);
  const totalCountsLobby = counts?.lobby_type
    ? Object.values(counts.lobby_type).reduce((acc, v) => acc + safeNum(v.games), 0)
    : 0;
  const totalCountsMode = counts?.game_mode
    ? Object.values(counts.game_mode).reduce((acc, v) => acc + safeNum(v.games), 0)
    : 0;
  const computedTotal = Math.max(totalWlGames, totalHeroGames, totalCountsLobby, totalCountsMode, allMatches.length);
  const total = totalWlGames > 0 ? totalWlGames : computedTotal;
  const wins = totalWlGames > 0 ? safeNum(wl?.win) : Math.max(totalHeroWins, allMatches.filter((m) => m.won).length);
  const losses = totalWlGames > 0 ? safeNum(wl?.lose) : Math.max(0, total - wins);
  const wr = total > 0 ? (safeDiv(wins, total) * 100).toFixed(2) : "0.00";

  const completedMatches = allMatches.filter((m) => safeNum(m.gold_per_min) > 0);
  const n = completedMatches.length || 1;

  const avgKills = safeDiv(completedMatches.reduce((a, m) => a + safeNum(m.kills), 0), n);
  const avgDeaths = safeDiv(completedMatches.reduce((a, m) => a + safeNum(m.deaths), 0), n);
  const avgAssists = safeDiv(completedMatches.reduce((a, m) => a + safeNum(m.assists), 0), n);
  const avgGpm = Math.round(safeDiv(completedMatches.reduce((a, m) => a + safeNum(m.gold_per_min), 0), n));
  const avgXpm = Math.round(safeDiv(completedMatches.reduce((a, m) => a + safeNum(m.xp_per_min), 0), n));
  const avgKda = safeDiv(avgKills + avgAssists, Math.max(1, avgDeaths));
  const combinedKda = avgKda.toFixed(2);

  const country = profile?.profile?.loccountrycode;

  let streak = 0;
  let streakType: "win" | "loss" | null = null;
  for (const m of allMatches) {
    if (streakType === null) {
      streakType = m.won ? "win" : "loss";
      streak = 1;
    } else if ((streakType === "win") === m.won) {
      streak++;
    } else break;
  }

  const recentWins = allMatches.filter((m) => m.won).length;
  const rankedMatches = allMatches.filter((m) => m.lobby_type === 7);
  const rankedCount = counts?.lobby_type?.["7"]?.games ?? rankedMatches.length;
  const rankedWins = counts?.lobby_type?.["7"]?.win ?? rankedMatches.filter((m) => m.won).length;
  const rankedLosses = Math.max(0, rankedCount - rankedWins);
  const rankedWr = rankedCount > 0 ? ((rankedWins / rankedCount) * 100).toFixed(2) : "0.00";

  const turboCount = counts?.game_mode?.["23"]?.games ?? allMatches.filter((m) => m.game_mode === 23).length;
  const abandonedCount = safeNum(counts?.leaver_status?.["1"]?.games) + safeNum(counts?.leaver_status?.["2"]?.games) + safeNum(counts?.leaver_status?.["3"]?.games);

  const radiantGames = safeNum(counts?.is_radiant?.["1"]?.games) || allMatches.filter((m) => m.isRadiant).length;
  const radiantWins = safeNum(counts?.is_radiant?.["1"]?.win) || allMatches.filter((m) => m.isRadiant && m.won).length;
  const direGames = safeNum(counts?.is_radiant?.["0"]?.games) || allMatches.filter((m) => !m.isRadiant).length;
  const direWins = safeNum(counts?.is_radiant?.["0"]?.win) || allMatches.filter((m) => !m.isRadiant && m.won).length;

  const sortedHeroes = useMemo(() => {
    return [...heroStats].sort((a, b) => b.games - a.games);
  }, [heroStats]);
  const topHeroes = sortedHeroes.filter((h) => h.games >= 1).slice(0, 10);

  // Earliest match timestamp
  const earliestMatchTs = useMemo(() => {
    if (allMatches.length === 0) return undefined;
    let minTs = allMatches[0].start_time;
    for (const m of allMatches) {
      if (m.start_time && m.start_time < minTs) minTs = m.start_time;
    }
    return minTs;
  }, [allMatches]);

  // Dynamic activity grid from allMatches (100% authentic match dates)
  const computedActivityGrid = useMemo(() => {
    return buildActivityGridFromMatches(allMatches);
  }, [allMatches]);

  // Dynamic roles calculation directly from player's games
  const { computedCorePct, computedSupportPct, primaryLaneName } = useMemo(() => {
    let coreGames = 0;
    let supportGames = 0;
    for (const h of heroStats) {
      const heroObj = heroMap[h.hero_id];
      const isCore = heroObj?.roles?.includes("Carry") || heroObj?.roles?.includes("Initiator") || (heroObj?.primary_attr === "agi");
      if (isCore) coreGames += h.games;
      else supportGames += h.games;
    }
    const totalRoleGames = coreGames + supportGames || 1;
    const cPct = Math.round((coreGames / totalRoleGames) * 100);
    const sPct = 100 - cPct;

    const safe = counts?.lane_role?.["1"]?.games ?? 0;
    const mid = counts?.lane_role?.["2"]?.games ?? 0;
    const off = counts?.lane_role?.["3"]?.games ?? 0;
    let pLane = "Сложная линия";
    if (safe >= mid && safe >= off && safe > 0) pLane = "Легкая линия";
    else if (mid >= safe && mid >= off && mid > 0) pLane = "Центральная линия";
    else if (off >= safe && off >= mid && off > 0) pLane = "Сложная линия";

    return {
      computedCorePct: cPct > 0 ? cPct : 50,
      computedSupportPct: sPct > 0 ? sPct : 50,
      primaryLaneName: pLane,
    };
  }, [heroStats, heroMap, counts]);

  // Top Heroes for Table
  const topHeroesForTable = useMemo(() => {
    return sortedHeroes.slice(0, 10).map((h) => {
      const hero = heroMap[h.hero_id];
      const heroMatches = allMatches.filter((m) => m.hero_id === h.hero_id);
      const heroCompleted = heroMatches.filter((m) => safeNum(m.gold_per_min) > 0);
      const hKills = heroCompleted.reduce((sum, m) => sum + safeNum(m.kills), 0);
      const hDeaths = heroCompleted.reduce((sum, m) => sum + safeNum(m.deaths), 0);
      const hAssists = heroCompleted.reduce((sum, m) => sum + safeNum(m.assists), 0);
      const computedKda = heroCompleted.length > 0 
        ? safeDiv(hKills + hAssists, Math.max(1, hDeaths)) 
        : 3.0;

      const isCore = hero?.roles?.includes("Carry") || (hero?.primary_attr === "agi");
      const laneCounts: Record<number, number> = {};
      heroMatches.forEach((m) => {
        if (m.lane) laneCounts[m.lane] = (laneCounts[m.lane] || 0) + 1;
      });
      let heroLane: "Легкая линия" | "Сложная линия" | "Центральная линия" = "Сложная линия";
      if ((laneCounts[1] || 0) > (laneCounts[3] || 0) && (laneCounts[1] || 0) > (laneCounts[2] || 0)) {
        heroLane = "Легкая линия";
      } else if ((laneCounts[2] || 0) > (laneCounts[1] || 0) && (laneCounts[2] || 0) > (laneCounts[3] || 0)) {
        heroLane = "Центральная линия";
      }

      return {
        hero_id: h.hero_id,
        name: hero?.name ?? "",
        localized_name: hero?.localized_name ?? `Герой #${h.hero_id}`,
        matches: h.games,
        winrate: h.games > 0 ? (h.win / h.games) * 100 : 0,
        wins: h.win,
        losses: Math.max(0, h.games - h.win),
        kda: Number(computedKda.toFixed(2)),
        role: isCore ? ("Кор" as const) : ("Саппорт" as const),
        lane: heroLane,
        last_played_text: h.last_played ? ago(h.last_played) : "Недавно",
      };
    });
  }, [sortedHeroes, heroMap, allMatches]);

  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/matches?accountId=${accountId}&offset=${allMatches.length}&limit=200`);
      if (!res.ok) return;
      const more: EnrichedMatch[] = await res.json();
      setAllMatches((prev) => {
        const ids = new Set(prev.map((m) => m.match_id));
        const updated = [...prev, ...more.filter((m) => !ids.has(m.match_id))];
        if (total > 0 && updated.length >= total) {
          setAllMatchesLoaded(true);
        }
        return updated;
      });
    } finally {
      setLoadingMore(false);
    }
  }, [accountId, allMatches.length, total]);

  const loadAllMatches = useCallback(async () => {
    setLoadingAll(true);
    try {
      const res = await fetch(`/api/matches?accountId=${accountId}&all=true`);
      if (!res.ok) return;
      const data: EnrichedMatch[] = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setAllMatches(data);
        setAllMatchesLoaded(true);
      }
    } finally {
      setLoadingAll(false);
    }
  }, [accountId]);

  const handleSort = (field: SortField) => {
    setCurrentPage(1);
    if (sortField === field) {
      setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"));
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const filteredMatches = useMemo(() => {
    return allMatches.filter((m) => {
      if (filterResult === "won" && !m.won) return false;
      if (filterResult === "lost" && m.won) return false;

      if (filterLobby === "ranked" && m.lobby_type !== 7) return false;
      if (filterLobby === "turbo" && m.game_mode !== 23) return false;
      if (filterLobby === "normal" && (m.lobby_type === 7 || m.game_mode === 23)) return false;

      if (filterFaction === "radiant" && !m.isRadiant) return false;
      if (filterFaction === "dire" && m.isRadiant) return false;

      if (searchHeroText.trim()) {
        const q = searchHeroText.toLowerCase().trim();
        const hName = (m.hero?.localized_name ?? "").toLowerCase();
        if (!hName.includes(q)) return false;
      }

      return true;
    });
  }, [allMatches, filterResult, filterLobby, filterFaction, searchHeroText]);

  const sortedFilteredMatches = useMemo(() => {
    const list = [...filteredMatches];
    list.sort((a, b) => {
      let valA = 0;
      let valB = 0;
      switch (sortField) {
        case "date":
          valA = safeNum(a.start_time);
          valB = safeNum(b.start_time);
          break;
        case "duration":
          valA = safeNum(a.duration);
          valB = safeNum(b.duration);
          break;
        case "kda":
          valA = safeDiv(safeNum(a.kills) + safeNum(a.assists), Math.max(1, safeNum(a.deaths)));
          valB = safeDiv(safeNum(b.kills) + safeNum(b.assists), Math.max(1, safeNum(b.deaths)));
          break;
        case "kills":
          valA = safeNum(a.kills);
          valB = safeNum(b.kills);
          break;
        case "gpm":
          valA = safeNum(a.gold_per_min);
          valB = safeNum(b.gold_per_min);
          break;
        case "damage":
          valA = safeNum(a.hero_damage);
          valB = safeNum(b.hero_damage);
          break;
        case "cs":
          valA = safeNum(a.last_hits);
          valB = safeNum(b.last_hits);
          break;
      }
      return sortOrder === "asc" ? valA - valB : valB - valA;
    });
    return list;
  }, [filteredMatches, sortField, sortOrder]);

  const effectivePageSize = pageSize <= 0 ? sortedFilteredMatches.length || 1 : pageSize;
  const totalPages = Math.max(1, Math.ceil(sortedFilteredMatches.length / effectivePageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const displayedMatches = pageSize <= 0
    ? sortedFilteredMatches
    : sortedFilteredMatches.slice((safeCurrentPage - 1) * effectivePageSize, safeCurrentPage * effectivePageSize);

  const gameModeBreakdown = Object.entries(counts?.game_mode ?? {})
    .map(([k, v]) => ({ mode: GAME_MODE_NAMES[k] ?? `Режим ${k}`, games: safeNum(v.games), win: safeNum(v.win) }))
    .sort((a, b) => b.games - a.games).slice(0, 6);

  const laneBreakdown = Object.entries(counts?.lane_role ?? {})
    .filter(([k]) => ["1","2","3","4","5"].includes(k))
    .map(([k, v]) => ({ role: LANE_ROLE_NAMES[k] ?? k, games: safeNum(v.games), win: safeNum(v.win) }))
    .sort((a, b) => b.games - a.games);

  const recent20 = useMemo(() => allMatches.slice(0, 20), [allMatches]);



  const recordsData = useMemo(() => {
    if (allMatches.length === 0) return null;
    let maxKills = allMatches[0];
    let maxAssists = allMatches[0];
    let maxGpm = allMatches[0];
    let maxXpm = allMatches[0];
    let maxLastHits = allMatches[0];
    let maxDamage = allMatches[0];
    let maxDuration = allMatches[0];
    let minDuration = allMatches[0];

    for (const m of allMatches) {
      if (safeNum(m.kills) > safeNum(maxKills.kills)) maxKills = m;
      if (safeNum(m.assists) > safeNum(maxAssists.assists)) maxAssists = m;
      if (safeNum(m.gold_per_min) > safeNum(maxGpm.gold_per_min)) maxGpm = m;
      if (safeNum(m.xp_per_min) > safeNum(maxXpm.xp_per_min)) maxXpm = m;
      if (safeNum(m.last_hits) > safeNum(maxLastHits.last_hits)) maxLastHits = m;
      if (safeNum(m.hero_damage) > safeNum(maxDamage.hero_damage)) maxDamage = m;
      if (safeNum(m.duration) > safeNum(maxDuration.duration)) maxDuration = m;
      if (safeNum(m.duration) > 600 && safeNum(m.duration) < safeNum(minDuration.duration)) minDuration = m;
    }

    return {
      maxKills,
      maxAssists,
      maxGpm,
      maxXpm,
      maxLastHits,
      maxDamage,
      maxDuration,
      minDuration,
    };
  }, [allMatches]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans antialiased selection:bg-zinc-700 selection:text-white">
      <SiteHeader
        currentPath={`/player/${accountId}`}
        accountId={accountId}
        userName={persona}
        userAvatar={avatarFull}
      />
      <div className="flex-1">
        {/* ── Profile Banner (Minimalist Zinc & Kokonut Glass) ────────────────────────── */}
      <div className="relative mx-auto max-w-7xl px-4 pt-6 sm:px-6">
        <div className="rounded-3xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-xl p-6 sm:p-7 shadow-sm relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-6">
            {/* Left: Avatar + Persona + Subtitle */}
            <div className="flex items-center gap-4 sm:gap-6 min-w-0">
              <div className="relative shrink-0">
                {avatarFull ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarFull}
                    alt={persona}
                    className="size-20 sm:size-24 rounded-2xl border border-zinc-700/60 shadow-md object-cover"
                  />
                ) : (
                  <div className="size-20 sm:size-24 rounded-2xl bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-4xl font-bold text-zinc-300">
                    {persona[0]}
                  </div>
                )}
              </div>

              <div className="space-y-2 min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 tracking-tight truncate">{persona}</h1>
                  {isOwn && (
                    <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-zinc-800 border border-zinc-700/60 text-zinc-300">
                      Ваш аккаунт
                    </span>
                  )}
                  {country && (
                    <span className="text-[10px] text-zinc-400 font-mono bg-zinc-900 border border-zinc-800 rounded-full px-2.5 py-0.5">
                      {country}
                    </span>
                  )}
                </div>
                <div className="text-xs text-zinc-400 font-medium">Профиль игрока Dota 2 • Статистика и история</div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400 pt-0.5">
                  <span className="font-mono bg-zinc-900 border border-zinc-800 rounded-full px-3 py-1 text-zinc-300">
                    ID: {accountId}
                  </span>
                  {profileUrl && (
                    <Link
                      href={profileUrl}
                      target="_blank"
                      className="px-3 py-1 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition"
                    >
                      Steam Профиль →
                    </Link>
                  )}
                  <button
                    onClick={handleSyncWithSteam}
                    disabled={syncing}
                    className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700/80 bg-zinc-800/80 hover:bg-zinc-750 px-3.5 py-1 text-xs font-medium text-zinc-200 transition shadow-sm cursor-pointer disabled:opacity-50 active:scale-95"
                  >
                    <RefreshCw className={`size-3 text-zinc-400 ${syncing ? "animate-spin" : ""}`} />
                    <span>{syncing ? "Синхронизация..." : "Синхронизировать"}</span>
                  </button>

                  {/* ── Active Account Lock Button / Status Badge ── */}
                  {isOwnerAccount ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400 shadow-sm">
                      <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Активный профиль</span>
                    </span>
                  ) : (
                    <button
                      onClick={handleRememberMe}
                      disabled={savingOwner}
                      className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700/80 bg-zinc-800/80 hover:bg-zinc-750 px-3.5 py-1 text-xs font-medium text-zinc-200 transition shadow-sm cursor-pointer disabled:opacity-50 active:scale-95"
                    >
                      <Sparkles className="size-3 text-zinc-400" />
                      <span>{savingOwner ? "Закрепляем..." : "Сделать моим активным профилем"}</span>
                    </button>
                  )}
                </div>
                {syncFeedback && (
                  <div className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-xl inline-block mt-1">
                    {syncFeedback}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Numbers Summary Pod */}
            <div className="flex items-center gap-5 sm:gap-6 self-end sm:self-center shrink-0 bg-zinc-900/80 border border-zinc-800/80 rounded-2xl px-5 py-3 shadow-sm">
              <div className="text-right">
                <div className="text-sm font-semibold text-zinc-200 font-mono">
                  {allMatches[0] ? ago(allMatches[0].start_time) : "—"}
                </div>
                <div className="text-[10px] text-zinc-500 uppercase font-medium tracking-tight">
                  ПОСЛЕДНЯЯ ИГРА
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm font-semibold font-mono">
                  <span className="text-emerald-400">{wins.toLocaleString()}</span>
                  <span className="text-zinc-600"> - </span>
                  <span className="text-rose-400">{losses.toLocaleString()}</span>
                  {abandonedCount > 0 ? (
                    <>
                      <span className="text-zinc-600"> - </span>
                      <span className="text-zinc-400" title="Покинутые матчи">{abandonedCount}</span>
                    </>
                  ) : null}
                </div>
                <div className="text-[10px] text-zinc-500 uppercase font-medium tracking-tight">
                  МАТЧИ
                </div>
              </div>

              <div className="text-right">
                <div className={`text-sm font-semibold font-mono ${Number(wr) >= 50 ? "text-emerald-400" : "text-rose-400"}`}>
                  {wr}%
                </div>
                <div className="text-[10px] text-zinc-500 uppercase font-medium tracking-tight">
                  ДОЛЯ ПОБЕД
                </div>
              </div>

              {/* Official Rank Medal */}
              <div className="flex flex-col items-center pl-3 border-l border-zinc-800">
                <RankMedal
                  rankInfo={effectiveRankInfo}
                  size="md"
                  showLabel={false}
                  leaderboardRank={profile?.leaderboard_rank}
                />
                <span className="text-[10px] font-semibold text-zinc-300 font-mono mt-0.5 whitespace-nowrap">
                  {effectiveRankInfo.name} {effectiveRankInfo.stars ? `${effectiveRankInfo.stars}★` : ""}
                </span>
              </div>
            </div>
          </div>

          {/* Stats Boxes Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-6">
            <StatBox
              label="Матчи (всего)"
              value={total > 0 ? `${wins.toLocaleString()} - ${losses.toLocaleString()}` : "—"}
              sub={`${total.toLocaleString()} матчей`}
              valueClass={Number(wr) >= 50 ? "text-emerald-400" : "text-rose-400"}
            />
            <StatBox
              label="Доля побед"
              value={total > 0 ? `${wr}%` : "—"}
              sub="Все матчи игрока"
              valueClass={Number(wr) >= 50 ? "text-emerald-400" : "text-rose-400"}
            />
            <StatBox
              label="Рейтинговые"
              value={`${rankedWins.toLocaleString()} - ${rankedLosses.toLocaleString()}`}
              sub={`${rankedWr}% побед (${rankedCount.toLocaleString()})`}
              valueClass="text-zinc-200"
            />
            <StatBox
              label="Средний KDA"
              value={completedMatches.length > 0 ? combinedKda : "—"}
              sub={`${avgKills.toFixed(1)} / ${avgDeaths.toFixed(1)} / ${avgAssists.toFixed(1)}`}
              valueClass="text-zinc-200"
            />
            <StatBox
              label="Силы Света"
              value={radiantGames > 0 ? `${(safeDiv(radiantWins, radiantGames) * 100).toFixed(1)}%` : "—"}
              sub={`${radiantGames.toLocaleString()} матчей`}
              valueClass="text-emerald-400"
            />
            <StatBox
              label="Силы Тьмы"
              value={direGames > 0 ? `${(safeDiv(direWins, direGames) * 100).toFixed(1)}%` : "—"}
              sub={`${direGames.toLocaleString()} матчей`}
              valueClass="text-rose-400"
            />
          </div>
        </div>
      </div>

      {/* Sync feedback notification */}
      {syncFeedback && (
        <div className="mx-auto max-w-7xl px-4 pt-3 sm:px-6">
          <div className="rounded-2xl border border-zinc-700 bg-zinc-900/90 py-2.5 px-4 flex items-center justify-between text-xs font-semibold text-zinc-200">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-zinc-400 shrink-0" />
              <span>{syncFeedback}</span>
            </div>
            <button
              onClick={() => setSyncFeedback(null)}
              className="text-zinc-400 hover:text-white px-2 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ── Tabs Navigation (Minimalist Segmented Dock) ─────────────────────── */}
      <div className="sticky top-0 z-40 bg-zinc-950/85 backdrop-blur-2xl py-3 border-b border-zinc-800/80 mt-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="inline-flex items-center gap-1.5 p-1.5 rounded-full bg-zinc-900/90 border border-zinc-800/80 shadow-lg">
            {[
              { id: "overview", label: "🌟 Обзор" },
              { id: "matches", label: "⚔️ Матчи" },
              { id: "heroes", label: "🧙 Герои" },
              { id: "records", label: "🏆 Рекорды" },
            ].map(({ id, label }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as any)}
                  className={`relative px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-semibold transition cursor-pointer ${
                    active ? "text-white" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="profileTabGlider"
                      className="absolute inset-0 rounded-full bg-zinc-800 border border-zinc-700/60 shadow-sm"
                      transition={{ type: "spring", stiffness: 450, damping: 35 }}
                    />
                  )}
                  <span className="relative z-10">{label}</span>
                </button>
              );
            })}
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <Link
              href="/heroes"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition shadow-sm"
            >
              <Swords className="size-3.5 text-zinc-400" />
              <span>Мета & Билды</span>
            </Link>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 space-y-6">

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* ── TAB 1: OVERVIEW (🌟 Обзор — Dotabuff & Stratz) ───────── */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            {/* ── Top Dashboard Grid: Balanced Analytical Cards (Zero Empty Voids) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column (7 cols): Часто выбираемые герои + Роли и линии */}
              <div className="lg:col-span-7 space-y-6">
                <TopHeroesDotabuffTable
                  heroes={topHeroesForTable}
                  heroMap={heroMap}
                  onMoreClick={() => setActiveTab("heroes")}
                />

                <RolesAndLanesBar
                  corePct={computedCorePct}
                  supportPct={computedSupportPct}
                  primaryLane={primaryLaneName}
                  onMoreClick={() => setActiveTab("heroes")}
                />
              </div>

              {/* Right Column (5 cols): Сводка профиля + Стороны & Режимы + Активность */}
              <div className="lg:col-span-5 space-y-6">
                <StratzHighlightsCard
                  totalMatches={total}
                  winrate={Number(wr)}
                  rankedCount={rankedCount}
                  turboCount={turboCount}
                  abandonedCount={abandonedCount}
                  earliestMatchTs={earliestMatchTs}
                />

                <FullStatsSummaryTable
                  counts={counts}
                  allMatches={allMatches}
                  totalMatches={total}
                  winrate={Number(wr)}
                  onMoreClick={() => setActiveTab("matches")}
                />

                <ActivityCalendarDotabuff
                  activityGrid={computedActivityGrid}
                  onMoreClick={() => setActiveTab("matches")}
                />
              </div>
            </div>

            {/* ── Full-Width Match History (Spans 100% of container, Spacious & Comfortable) ── */}
            <div className="w-full">
              <PlayerMatchesSection
                matches={allMatches}
                heroMap={heroMap}
                accountId={accountId}
                compact={false}
                initialPageSize={20}
                initialDetailsCache={initialMatchDetails}
                onViewAllClick={() => setActiveTab("matches")}
              />
            </div>
          </div>
        )}

        {/* ── MATCHES TAB ─────────────────────────────────────── */}
        {activeTab === "matches" && (
          <div className="space-y-4">
            <PlayerMatchesSection
              matches={allMatches}
              heroMap={heroMap}
              accountId={accountId}
              compact={false}
              initialPageSize={20}
              initialDetailsCache={initialMatchDetails}
            />

            {!allMatchesLoaded && allMatches.length < total && (
              <div className="text-center pt-2">
                <button
                  onClick={loadAllMatches}
                  disabled={loadingAll || loadingMore}
                  className="px-6 py-2.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-zinc-200 hover:text-white font-bold text-xs transition cursor-pointer shadow-md disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {loadingAll || loadingMore ? (
                    <div className="size-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  ) : (
                    <Zap className="size-3.5 text-blue-400" />
                  )}
                  <span>{loadingAll ? "Загрузка всех матчей..." : `Загрузить ещё матчи (загружено ${allMatches.length} из ${total.toLocaleString()})`}</span>
                </button>
              </div>
            )}
          </div>
        )}
        {/* ── ALL TIME HEROES TAB (Фулл стата по героям за все время) ── */}
        {activeTab === "heroes" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  🧙 Статистика по героям (за всё время)
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Все {heroStats.length} героев игрока с сортировкой по сыгранным матчам
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-zinc-400 bg-zinc-950/70 border border-zinc-800 px-3 py-1.5 rounded-xl self-start sm:self-auto">
                Всего матчей: <strong className="text-white">{total.toLocaleString()}</strong>
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#1e2638] bg-[#0c101a] shadow-xl">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="border-b border-[#1b2336] bg-[#101524] text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  <tr>
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Герой</th>
                    <th className="py-3 px-3 text-center">Матчей</th>
                    <th className="py-3 px-4 text-center">Победы / Поражения</th>
                    <th className="py-3 px-5">Винрейт (%)</th>
                    <th className="py-3 px-4 text-center">С игроком (With)</th>
                    <th className="py-3 px-4 text-center">Против игрока (Against)</th>
                    <th className="py-3 px-4 text-right">Последний матч</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#151c2e]">
                  {sortedHeroes.map((hs, idx) => {
                    const hero = heroMap[hs.hero_id];
                    const hrWr = hs.games > 0 ? (safeDiv(hs.win, hs.games) * 100).toFixed(1) : "0";
                    const withWr = hs.with_games > 0 ? (safeDiv(hs.with_win, hs.with_games) * 100).toFixed(0) : "—";
                    const againstWr = hs.against_games > 0 ? (safeDiv(hs.against_win, hs.against_games) * 100).toFixed(0) : "—";

                    return (
                      <tr key={hs.hero_id} className="hover:bg-[#121829] transition">
                        <td className="py-3 px-4 font-mono font-bold text-zinc-500">
                          #{idx + 1}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            {hero ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={heroIconUrl(hero.name)}
                                alt=""
                                className="size-9 rounded-lg border border-zinc-700 object-cover"
                              />
                            ) : (
                              <div className="size-9 rounded-lg bg-zinc-800" />
                            )}
                            <div>
                              <div className="font-bold text-white text-xs">
                                {hero?.localized_name ?? `Герой #${hs.hero_id}`}
                              </div>
                              <div className="text-[10px] text-zinc-500 font-mono">ID: {hs.hero_id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-white text-xs">
                          {hs.games.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-xs">
                          <span className="text-emerald-400 font-bold">{hs.win}</span>
                          <span className="text-zinc-600"> / </span>
                          <span className="text-red-400 font-bold">{Math.max(0, hs.games - hs.win)}</span>
                        </td>
                        <td className="py-3 px-5">
                          <div className="flex items-center gap-3">
                            <div className="h-2 w-24 rounded-full bg-zinc-800 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  Number(hrWr) >= 50 ? "bg-emerald-500" : "bg-red-500"
                                }`}
                                style={{ width: `${Math.min(100, Number(hrWr) || 0)}%` }}
                              />
                            </div>
                            <span
                              className={`font-mono font-bold text-xs ${
                                Number(hrWr) >= 50 ? "text-emerald-400" : "text-red-400"
                              }`}
                            >
                              {hrWr}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-xs text-zinc-300">
                          {hs.with_games > 0 ? `${withWr}% (${hs.with_games})` : "—"}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-xs text-zinc-300">
                          {hs.against_games > 0 ? `${againstWr}% (${hs.against_games})` : "—"}
                        </td>
                        <td className="py-3 px-4 text-right text-zinc-500 font-mono text-xs">
                          {hs.last_played > 0 ? ago(hs.last_played) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}



        {/* ── RECORDS TAB (🏆 Рекорды) ────────────────────────── */}
        {activeTab === "records" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <Trophy className="size-5 text-amber-400" />
                  Личные рекорды за все сыгранные матчи
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Наивысшие показатели и экстремальные матчи за всю историю аккаунта ({total} игр)
                </p>
              </div>
            </div>

            {recordsData ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {
                    title: "Больше всего убийств",
                    value: recordsData.maxKills.kills,
                    unit: "фрагов",
                    match: recordsData.maxKills,
                    color: "text-rose-400",
                    badgeBg: "bg-rose-500/10 border-rose-500/30",
                    icon: "⚔️",
                  },
                  {
                    title: "Больше всего ассистов",
                    value: recordsData.maxAssists.assists,
                    unit: "ассистов",
                    match: recordsData.maxAssists,
                    color: "text-sky-400",
                    badgeBg: "bg-sky-500/10 border-sky-500/30",
                    icon: "🤝",
                  },
                  {
                    title: "Наивысший GPM",
                    value: recordsData.maxGpm.gold_per_min,
                    unit: "золота/мин",
                    match: recordsData.maxGpm,
                    color: "text-amber-400",
                    badgeBg: "bg-amber-500/10 border-amber-500/30",
                    icon: "💰",
                  },
                  {
                    title: "Наивысший XPM",
                    value: recordsData.maxXpm.xp_per_min,
                    unit: "опыта/мин",
                    match: recordsData.maxXpm,
                    color: "text-purple-400",
                    badgeBg: "bg-purple-500/10 border-purple-500/30",
                    icon: "⚡",
                  },
                  {
                    title: "Больше всего крипов (CS)",
                    value: recordsData.maxLastHits.last_hits,
                    unit: "добиваний",
                    match: recordsData.maxLastHits,
                    color: "text-emerald-400",
                    badgeBg: "bg-emerald-500/10 border-emerald-500/30",
                    icon: "🎯",
                  },
                  {
                    title: "Максимальный урон",
                    value: safeNum(recordsData.maxDamage.hero_damage) > 0 ? `${(safeNum(recordsData.maxDamage.hero_damage) / 1000).toFixed(1)}k` : "—",
                    unit: "урона по героям",
                    match: recordsData.maxDamage,
                    color: "text-red-400",
                    badgeBg: "bg-red-500/10 border-red-500/30",
                    icon: "💥",
                  },
                  {
                    title: "Самый долгий матч",
                    value: fmt(recordsData.maxDuration.duration),
                    unit: "мин длительность",
                    match: recordsData.maxDuration,
                    color: "text-indigo-400",
                    badgeBg: "bg-indigo-500/10 border-indigo-500/30",
                    icon: "⏳",
                  },
                  {
                    title: "Самый быстрый матч",
                    value: fmt(recordsData.minDuration.duration),
                    unit: "мин длительность",
                    match: recordsData.minDuration,
                    color: "text-teal-400",
                    badgeBg: "bg-teal-500/10 border-teal-500/30",
                    icon: "⚡",
                  },
                ].map((rec, rIdx) => {
                  const rHero = heroMap[rec.match.hero_id];

                  return (
                    <div
                      key={rIdx}
                      className="rounded-2xl border border-zinc-800 bg-[#0c101a] p-4 shadow-xl space-y-3 hover:border-zinc-700 transition"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-base">{rec.icon}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${rec.badgeBg} ${rec.color}`}>
                          {rec.title}
                        </span>
                      </div>

                      <div>
                        <div className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${rec.color}`}>
                          {rec.value}
                        </div>
                        <div className="text-[10px] text-zinc-500">{rec.unit}</div>
                      </div>

                      <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="size-7 rounded-lg overflow-hidden border border-zinc-700 shrink-0">
                            {rHero ? (
                              <img src={heroIconUrl(rHero.name)} alt="" className="size-full object-cover" />
                            ) : (
                              <div className="size-full bg-zinc-800" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-xs text-white truncate">
                              {rHero?.localized_name ?? "Герой"}
                            </div>
                            <div className="text-[9px] text-zinc-400">{ago(rec.match.start_time)}</div>
                          </div>
                        </div>

                        <Link
                          href={`/match/${rec.match.match_id}`}
                          className="text-[11px] font-bold text-red-400 hover:text-red-300 transition"
                        >
                          Матч →
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 text-xs text-zinc-500">Нет данных по матчам</div>
            )}
          </div>
        )}
      </main>
      </div>

      <SiteFooter />
    </div>
  );
}

function StatBox({
  label,
  value,
  sub,
  valueClass,
}: {
  label: string;
  value: string;
  sub: string;
  valueClass: string;
}) {
  return (
    <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/80 p-3.5 space-y-1 hover:border-zinc-700/60 hover:bg-zinc-850/50 transition">
      <div className="text-[11px] text-zinc-400 uppercase tracking-tight font-medium truncate">{label}</div>
      <div className={`font-bold text-base font-mono tracking-tight ${valueClass}`}>{value}</div>
      <div className="text-[10px] text-zinc-500 font-mono truncate">{sub}</div>
    </div>
  );
}
