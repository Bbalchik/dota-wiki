"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Copy,
  Check,
  Search,
  Zap,
  RefreshCw,
  BarChart2,
  Shield,
  Swords,
} from "lucide-react";
import { type OpenDotaHero, heroIconUrl, getGameModeName, getLaneRoleName } from "@/lib/opendota";
import { DotaInventoryHud } from "@/components/ui/DotaInventoryHud";
import { rankTierToString } from "@/lib/ranks";
import { estimatePositionFromHistory, POS_NAME_RU, POS_FULL_RU, DotaPosition } from "@/lib/positions";
import { Recent20MatchesDiagrams } from "./Recent20MatchesDiagrams";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type EnrichedMatchItem = {
  match_id: number;
  player_slot: number;
  radiant_win: boolean;
  duration: number;
  game_mode: number;
  lobby_type: number;
  hero_id: number;
  start_time: number;
  kills: number;
  deaths: number;
  assists: number;
  average_rank?: number | null;
  gold_per_min?: number;
  xp_per_min?: number;
  net_worth?: number | null;
  hero_damage?: number | null;
  tower_damage?: number | null;
  hero_healing?: number | null;
  last_hits?: number;
  denies?: number;
  lane?: number | null;
  lane_role?: number | null;
  item_0?: number;
  item_1?: number;
  item_2?: number;
  item_3?: number;
  item_4?: number;
  item_5?: number;
  item_neutral?: number;
  backpack_0?: number;
  backpack_1?: number;
  backpack_2?: number;
  level?: number | null;
  party_size?: number | null;
  won: boolean;
  isRadiant: boolean;
  hero?: OpenDotaHero;
  heroIconUrl?: string | null;
  gameModeName?: string;
  laneRoleName?: string;
};

interface InlineMatchPlayer {
  account_id?: number | null;
  personaname?: string | null;
  hero_id: number;
  hero_name?: string;
  hero_icon?: string | null;
  player_slot: number;
  kills: number;
  deaths: number;
  assists: number;
  level?: number;
  net_worth?: number;
  pos_role?: number | null;
  pos_roman?: string | null;
  pos_name?: string | null;
  pos_full?: string | null;
  item_0?: number;
  item_1?: number;
  item_2?: number;
  item_3?: number;
  item_4?: number;
  item_5?: number;
  item_neutral?: number;
  backpack_0?: number;
  backpack_1?: number;
  backpack_2?: number;
}

interface InlineMatchData {
  match_id: number;
  radiant_win: boolean;
  duration: number;
  start_time: number;
  game_mode_name: string;
  radiant_score?: number;
  dire_score?: number;
  players: InlineMatchPlayer[];
}

interface PlayerMatchesSectionProps {
  matches: EnrichedMatchItem[];
  heroMap: Record<number, OpenDotaHero>;
  accountId: number;
  compact?: boolean;
  initialPageSize?: number;
  initialDetailsCache?: Record<number, InlineMatchData>;
  onViewAllClick?: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fmtSec(sec: number): string {
  const m = Math.floor(Math.max(0, sec) / 60);
  const s = Math.floor(Math.max(0, sec)) % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function timeAgo(ts: number): string {
  const diff = Date.now() / 1000 - ts;
  if (diff < 60) return "Только что";
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)} дн назад`;
  return new Date(ts * 1000).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

const ROLE_BADGE: Record<number, { label: string; icon: string; color: string }> = {
  1: { label: "Керри (Поз 1)", icon: "🗡️", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  2: { label: "Мид (Поз 2)", icon: "⚡", color: "text-sky-400 bg-sky-500/10 border-sky-500/20" },
  3: { label: "Оффлейн (Поз 3)", icon: "🛡️", color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
  4: { label: "Поддержка (Поз 4)", icon: "✨", color: "text-teal-400 bg-teal-500/10 border-teal-500/20" },
  5: { label: "Полная поддержка (Поз 5)", icon: "🌱", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
};

// ---------------------------------------------------------------------------
// Inline Roster (10 players inside expanded match)
// ---------------------------------------------------------------------------
const InlineRoster = React.memo(function InlineRoster({
  players,
  label,
  isRadiant,
  winner,
  score,
  accountId,
}: {
  players: InlineMatchPlayer[];
  label: string;
  isRadiant: boolean;
  winner: boolean;
  score?: number;
  accountId: number;
}) {
  const border = isRadiant ? "border-emerald-500/30" : "border-rose-500/30";
  const bg = isRadiant ? "bg-emerald-950/15" : "bg-rose-950/15";
  const titleColor = isRadiant ? "text-emerald-400" : "text-rose-400";

  return (
    <div className={`rounded-xl border ${border} ${bg} p-3 space-y-2`}>
      <div className={`flex items-center justify-between text-xs font-semibold ${titleColor}`}>
        <div className="flex items-center gap-2">
          <span>{label}</span>
          {score !== undefined && (
            <span className="font-mono text-zinc-400">({score} киллов)</span>
          )}
        </div>
        {winner && (
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] text-emerald-300 uppercase tracking-wider font-semibold">
            ✓ ПОБЕДА
          </span>
        )}
      </div>

      <div className="space-y-1">
        {players.map((p, i) => {
          const isSelf = p.account_id === accountId;
          const items = [p.item_0, p.item_1, p.item_2, p.item_3, p.item_4, p.item_5].map((v) =>
            typeof v === "number" && v > 0 ? v : 0
          );
          const backpack = [p.backpack_0, p.backpack_1, p.backpack_2].map((v) =>
            typeof v === "number" && v > 0 ? v : 0
          );

          return (
            <div
              key={i}
              className={`flex items-center justify-between gap-2 p-1.5 rounded-lg transition ${
                isSelf
                  ? "bg-zinc-800 border border-zinc-700/60 shadow-sm"
                  : "bg-zinc-900/60 hover:bg-zinc-850 border border-zinc-800/60"
              }`}
            >
              {/* Hero icon + level */}
              <div className="flex items-center gap-2 min-w-0">
                <div className="relative w-8 h-8 rounded-md overflow-hidden shrink-0 bg-zinc-900 border border-zinc-700/60">
                  {p.hero_icon ? (
                    <img src={p.hero_icon} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-zinc-800" />
                  )}
                  {p.level && (
                    <span className="absolute bottom-0 right-0 px-1 text-[8px] font-mono font-bold bg-black/90 text-amber-300">
                      {p.level}
                    </span>
                  )}
                </div>

                {/* Nickname & Hero */}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    {p.account_id ? (
                      <Link
                        href={`/player/${p.account_id}`}
                        className="text-xs font-semibold text-zinc-100 hover:text-white transition truncate block max-w-[110px]"
                      >
                        {p.personaname || `Игрок #${p.account_id}`}
                      </Link>
                    ) : (
                      <span className="text-xs text-zinc-400 truncate block max-w-[110px]">
                        {p.personaname || "Аноним"}
                      </span>
                    )}
                    {isSelf && (
                      <span className="px-1.5 py-0.2 rounded bg-zinc-700 text-zinc-200 text-[8px] font-bold uppercase">
                        ВЫ
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] text-zinc-400 truncate">{p.hero_name}</span>
                    {p.pos_role && (
                      <span
                        className="px-1.5 py-0.2 rounded text-[8px] font-mono font-medium bg-zinc-800 text-zinc-300 border border-zinc-700/60"
                        title={p.pos_full || undefined}
                      >
                        {p.pos_name ? `Поз ${p.pos_role} · ${p.pos_name}` : `Поз ${p.pos_role}`}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* KDA & Net Worth */}
              <div className="flex items-center gap-2.5 shrink-0">
                <div className="text-right font-mono text-[11px] whitespace-nowrap">
                  <div>
                    <span className="text-emerald-400 font-bold">{p.kills}</span>
                    <span className="text-zinc-600">/</span>
                    <span className="text-rose-400 font-bold">{p.deaths}</span>
                    <span className="text-zinc-600">/</span>
                    <span className="text-sky-400 font-bold">{p.assists}</span>
                  </div>
                  {p.net_worth ? (
                    <div className="text-[10px] text-amber-300 font-bold">
                      {(p.net_worth / 1000).toFixed(1)}k NW
                    </div>
                  ) : null}
                </div>

                {/* Items */}
                <DotaInventoryHud
                  items={items}
                  backpack={backpack}
                  neutralItem={p.item_neutral}
                  size="xs"
                  showBackpack={false}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Main PlayerMatchesSection
// ---------------------------------------------------------------------------
export function PlayerMatchesSection({
  matches: initialMatches,
  heroMap,
  accountId,
  compact = false,
  initialPageSize = 20,
  initialDetailsCache,
  onViewAllClick,
}: PlayerMatchesSectionProps) {
  const [matches, setMatches] = useState<EnrichedMatchItem[]>(initialMatches);
  const [filterResult, setFilterResult] = useState<"all" | "won" | "lost">("all");
  const [filterMode, setFilterMode] = useState<"all" | "ranked" | "normal" | "turbo">("all");
  const [searchHeroText, setSearchHeroText] = useState("");
  const [pageSize, setPageSize] = useState<number>(compact ? 10 : initialPageSize);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [copiedMatchId, setCopiedMatchId] = useState<number | null>(null);

  // Accordion expanded match IDs & detail cache
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [matchDetailsCache, setMatchDetailsCache] = useState<Record<number, InlineMatchData>>(
    () => initialDetailsCache || {}
  );
  const [loadingIds, setLoadingIds] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (initialDetailsCache && Object.keys(initialDetailsCache).length > 0) {
      setMatchDetailsCache((prev) => ({ ...initialDetailsCache, ...prev }));
    }
  }, [initialDetailsCache]);

  // Sync state
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<number>(Date.now());
  const [autoUpdatedNotice, setAutoUpdatedNotice] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Toggle match accordion expansion
  const toggleExpand = useCallback(
    async (matchId: number) => {
      setExpandedIds((prev) => {
        const next = new Set(prev);
        if (next.has(matchId)) next.delete(matchId);
        else next.add(matchId);
        return next;
      });

      if (!matchDetailsCache[matchId]) {
        setLoadingIds((prev) => ({ ...prev, [matchId]: true }));
        try {
          const res = await fetch(`/api/matches/${matchId}`);
          if (res.ok) {
            const data: InlineMatchData = await res.json();
            setMatchDetailsCache((prev) => ({ ...prev, [matchId]: data }));
          }
        } catch {
          // silent
        } finally {
          setLoadingIds((prev) => ({ ...prev, [matchId]: false }));
        }
      }
    },
    [matchDetailsCache]
  );

  // Handle Match ID Copy
  const handleCopyId = useCallback((e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    navigator.clipboard.writeText(String(id));
    setCopiedMatchId(id);
    setTimeout(() => setCopiedMatchId(null), 2000);
  }, []);

  // Sync / Refresh function
  const triggerSync = useCallback(
    async (fullSteamSync = false) => {
      setIsSyncing(true);
      try {
        const url = fullSteamSync
          ? `/api/players/${accountId}/matches?limit=100&sync=true`
          : `/api/players/${accountId}/matches?limit=100`;
        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          const fresh: EnrichedMatchItem[] = json.matches || [];
          if (Array.isArray(fresh) && fresh.length > 0) {
            setMatches((prev) => {
              const existingMap = new Set(prev.map((m) => m.match_id));
              const newlyAdded = fresh.filter((m) => !existingMap.has(m.match_id));
              if (newlyAdded.length > 0) {
                setAutoUpdatedNotice(`🟢 Обнаружен новый матч! Статистика обновлена автоматически (+${newlyAdded.length})`);
                setTimeout(() => setAutoUpdatedNotice(null), 6000);
                return [...newlyAdded, ...prev];
              }
              return fresh;
            });
            setLastSyncedTime(Date.now());
          }
        }
      } catch (err) {
        console.warn("Match sync error:", err);
      } finally {
        setIsSyncing(false);
      }
    },
    [accountId]
  );

  // Register player in autonomous crawler and auto-refresh every 60s
  useEffect(() => {
    fetch(`/api/live-sync?accountId=${accountId}`).catch(() => {});

    intervalRef.current = setInterval(() => {
      triggerSync(false);
    }, 60_000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [triggerSync, accountId]);

  // Filters
  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      if (filterResult === "won" && !m.won) return false;
      if (filterResult === "lost" && m.won) return false;
      if (filterMode === "ranked" && m.lobby_type !== 7) return false;
      if (filterMode === "normal" && (m.lobby_type === 7 || m.game_mode === 23)) return false;
      if (filterMode === "turbo" && m.game_mode !== 23) return false;
      if (searchHeroText.trim()) {
        const q = searchHeroText.toLowerCase().trim();
        const hero = heroMap[m.hero_id];
        const localized = hero?.localized_name?.toLowerCase() || "";
        const internal = hero?.name?.toLowerCase() || "";
        if (!localized.includes(q) && !internal.includes(q)) return false;
      }
      return true;
    });
  }, [matches, filterResult, filterMode, searchHeroText, heroMap]);

  // Stats Summary
  const statsSummary = useMemo(() => {
    const total = filteredMatches.length;
    if (total === 0) return null;
    const wins = filteredMatches.filter((m) => m.won).length;
    const wr = Math.round((wins / total) * 100);
    const avgK = (filteredMatches.reduce((acc, m) => acc + m.kills, 0) / total).toFixed(1);
    const avgD = (filteredMatches.reduce((acc, m) => acc + m.deaths, 0) / total).toFixed(1);
    const avgA = (filteredMatches.reduce((acc, m) => acc + m.assists, 0) / total).toFixed(1);
    const avgKda = (
      filteredMatches.reduce((acc, m) => acc + m.kills + m.assists, 0) /
      Math.max(1, filteredMatches.reduce((acc, m) => acc + m.deaths, 0))
    ).toFixed(2);
    const withGpm = filteredMatches.filter((m) => (m.gold_per_min || 0) > 0);
    const avgGpm = withGpm.length
      ? Math.round(withGpm.reduce((acc, m) => acc + (m.gold_per_min || 0), 0) / withGpm.length)
      : 0;

    return { total, wins, wr, avgK, avgD, avgA, avgKda, avgGpm };
  }, [filteredMatches]);

  // Pagination
  const effectivePageSize = pageSize === 0 ? filteredMatches.length : pageSize;
  const totalPages = Math.max(1, Math.ceil(filteredMatches.length / effectivePageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const displayedMatches = useMemo(() => {
    if (pageSize === 0) return filteredMatches;
    const start = (safePage - 1) * effectivePageSize;
    return filteredMatches.slice(start, start + effectivePageSize);
  }, [filteredMatches, safePage, effectivePageSize, pageSize]);

  return (
    <div className="space-y-4">
      {/* ── Visual Analytics & Diagrams (Last 20 Matches) ── */}
      {!compact && matches.length > 0 && (
        <Recent20MatchesDiagrams matches={matches} heroMap={heroMap} />
      )}

      {/* ── Modern Live Toolbar Header ── */}
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-xl p-4 sm:p-5 shadow-sm space-y-4">
        {/* Row 1: Title, Live Sync Status, and Steam Sync Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-xl bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-zinc-300 font-bold shadow-sm">
              ⚔️
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-zinc-100">
                  История матчей
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-zinc-800 border border-zinc-700/60 text-zinc-300 font-mono font-medium">
                  {matches.length}
                </span>
              </div>
            </div>
          </div>

          {/* Refresh & Live Auto-Update Control */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-400 font-medium">
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Авто-обновление активно</span>
            </div>

            <button
              onClick={() => triggerSync(true)}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white transition cursor-pointer disabled:opacity-50"
              title="Запросить немедленную синхронизацию с серверами Valve и базой данных"
            >
              <RefreshCw className={`size-3.5 ${isSyncing ? "animate-spin text-zinc-400" : ""}`} />
              <span>{isSyncing ? "Синхронизация..." : "Обновить"}</span>
            </button>
          </div>
        </div>

        {/* Live Auto-Updated Notice Banner */}
        {autoUpdatedNotice && (
          <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-2 animate-in fade-in duration-200">
            <span>⚡</span>
            <span>{autoUpdatedNotice}</span>
          </div>
        )}

        {/* Row 2: Stats Summary Pills */}
        {statsSummary && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span
              className={`px-3 py-1 rounded-full font-bold font-mono border ${
                statsSummary.wr >= 50
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                  : "bg-rose-500/10 text-rose-400 border-rose-500/25"
              }`}
            >
              {statsSummary.wr}% WR ({statsSummary.wins}В / {statsSummary.total - statsSummary.wins}П)
            </span>

            <span className="px-3 py-1 rounded-full bg-zinc-800/80 border border-zinc-700/60 text-zinc-200 font-mono font-medium">
              {statsSummary.avgKda} KDA ({statsSummary.avgK} / {statsSummary.avgD} / {statsSummary.avgA})
            </span>

            {statsSummary.avgGpm > 0 && (
              <span className="px-3 py-1 rounded-full bg-zinc-800/80 border border-zinc-700/60 text-zinc-300 font-mono font-medium">
                {statsSummary.avgGpm} GPM
              </span>
            )}
          </div>
        )}

        {/* Row 3: Filter Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
          <div className="flex flex-wrap items-center gap-2">
            {/* Outcome Filter */}
            <div className="inline-flex rounded-full bg-zinc-900/90 p-1 border border-zinc-800/80 relative">
              {(["all", "won", "lost"] as const).map((res) => {
                const isActive = filterResult === res;
                return (
                  <button
                    key={res}
                    onClick={() => {
                      setFilterResult(res);
                      setCurrentPage(1);
                    }}
                    className={`relative px-3 py-1 rounded-full font-medium transition cursor-pointer text-xs z-10 ${
                      isActive
                        ? res === "won"
                          ? "text-emerald-400"
                          : res === "lost"
                          ? "text-rose-400"
                          : "text-zinc-100"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="matchOutcomeGlider"
                        className="absolute inset-0 rounded-full -z-10 bg-zinc-800 border border-zinc-700/60 shadow-sm"
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                      />
                    )}
                    {res === "all" ? "Все" : res === "won" ? "✓ Победы" : "✗ Поражения"}
                  </button>
                );
              })}
            </div>

            {/* Mode Filter */}
            <div className="inline-flex rounded-full bg-zinc-900/90 p-1 border border-zinc-800/80 relative">
              {[
                { id: "all" as const, label: "Все режимы" },
                { id: "ranked" as const, label: "Рейтинг" },
                { id: "turbo" as const, label: "Турбо" },
              ].map(({ id, label }) => {
                const isActive = filterMode === id;
                return (
                  <button
                    key={id}
                    onClick={() => {
                      setFilterMode(id);
                      setCurrentPage(1);
                    }}
                    className={`relative px-3 py-1 rounded-full font-medium transition cursor-pointer text-xs z-10 ${
                      isActive ? "text-zinc-100" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="matchModeGlider"
                        className="absolute inset-0 rounded-full -z-10 bg-zinc-800 border border-zinc-700/60 shadow-sm"
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                      />
                    )}
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Hero Search input */}
          <div className="relative">
            <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchHeroText}
              onChange={(e) => {
                setSearchHeroText(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Поиск по герою..."
              className="pl-8 pr-7 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition w-36 sm:w-48"
            />
            {searchHeroText && (
              <button
                onClick={() => {
                  setSearchHeroText("");
                  setCurrentPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Dotabuff-Style Structured Matches Table ── */}
      {displayedMatches.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-12 text-center space-y-3">
          <div className="text-3xl">🔍</div>
          <p className="text-base font-bold text-zinc-100">Матчи не найдены</p>
          <p className="text-xs text-zinc-500 font-mono">
            Попробуйте изменить параметры поиска или сбросить фильтры.
          </p>
          <button
            onClick={() => {
              setFilterResult("all");
              setFilterMode("all");
              setSearchHeroText("");
            }}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-white transition cursor-pointer"
          >
            Сбросить фильтры
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 backdrop-blur-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[760px]">
              {/* Table Header */}
              <thead className="bg-zinc-900/90 border-b border-zinc-800/80 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 select-none">
                <tr>
                  <th className="py-3 px-4">Герой</th>
                  <th className="py-3 px-3">Исход</th>
                  <th className="py-3 px-3">Тип матча</th>
                  <th className="py-3 px-3 text-center">KDA</th>
                  <th className="py-3 px-3 text-center">Фарм / Урон</th>
                  <th className="py-3 px-3">Предметы</th>
                  <th className="py-3 px-4 text-right">Действия</th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-zinc-800/60 text-xs">
                {displayedMatches.map((m) => {
                  const hero = heroMap[m.hero_id] || m.hero;
                  const iconSrc = m.heroIconUrl || (hero ? heroIconUrl(hero.name) : null);
                  const items = [m.item_0, m.item_1, m.item_2, m.item_3, m.item_4, m.item_5].map((v) =>
                    typeof v === "number" && v > 0 ? v : 0
                  );
                  const backpack = [m.backpack_0, m.backpack_1, m.backpack_2].map((v) =>
                    typeof v === "number" && v > 0 ? v : 0
                  );
                  const kda = ((m.kills + m.assists) / Math.max(1, m.deaths)).toFixed(2);
                  const estimatedPos =
                    estimatePositionFromHistory({
                      hero_id: m.hero_id,
                      lane_role: m.lane_role,
                      lane: m.lane,
                      player_slot: m.player_slot,
                      last_hits: m.last_hits,
                      duration: m.duration,
                    }) ?? 1;
                  const roleMeta = ROLE_BADGE[estimatedPos];
                  const mode = m.lobby_type === 7 ? "Рейтинговый" : m.game_mode === 23 ? "Турбо" : m.gameModeName || "All Pick";
                  const isExpanded = expandedIds.has(m.match_id);
                  const inlineData = matchDetailsCache[m.match_id];
                  const isLoading = loadingIds[m.match_id];

                  return (
                    <React.Fragment key={m.match_id}>
                      <tr
                        onClick={() => toggleExpand(m.match_id)}
                        className={`transition-colors cursor-pointer group ${
                          m.won
                            ? "hover:bg-emerald-950/20 bg-emerald-950/[0.03]"
                            : "hover:bg-zinc-800/40 bg-transparent"
                        }`}
                      >
                        {/* 1. Hero Column */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="relative w-14 h-9 rounded-lg overflow-hidden shrink-0 border border-zinc-700/60 bg-zinc-900 shadow-sm group-hover:scale-105 transition-transform">
                              {iconSrc ? (
                                <img src={iconSrc} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-zinc-800" />
                              )}
                              {m.level != null && (
                                <span className="absolute bottom-0 right-0 px-1 text-[8px] font-mono font-bold bg-black/90 text-amber-300 rounded-tl border-t border-l border-zinc-700/60">
                                  {m.level}
                                </span>
                              )}
                            </div>

                            <div className="min-w-0">
                              <div className="font-semibold text-sm text-zinc-100 group-hover:text-white transition truncate">
                                {hero?.localized_name || `Герой #${m.hero_id}`}
                              </div>
                              <div className="text-[10px] text-zinc-400 flex items-center gap-1 font-mono">
                                {roleMeta ? (
                                  <span className={roleMeta.color.split(" ")[0]}>
                                    {roleMeta.icon} {roleMeta.label}
                                  </span>
                                ) : (
                                  <span>{m.laneRoleName || "Линия"}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Outcome Column */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="space-y-0.5">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${
                                m.won
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25"
                                  : "bg-rose-500/10 text-rose-400 border border-rose-500/25"
                              }`}
                            >
                              {m.won ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
                              <span>{m.won ? "ПОБЕДА" : "ПОРАЖЕНИЕ"}</span>
                            </span>
                            <div className="text-[10px] text-zinc-500 font-mono flex items-center gap-1">
                              <Clock className="size-2.5 text-zinc-500" />
                              <span>{fmtSec(m.duration)}</span>
                              <span className="text-zinc-600">·</span>
                              <span>{timeAgo(m.start_time)}</span>
                            </div>
                          </div>
                        </td>

                        {/* 3. Game Type / Bracket Column */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="space-y-0.5">
                            <div className="text-xs text-zinc-300 font-medium truncate max-w-[130px]">
                              {mode}
                            </div>
                            <div className="text-[10px] text-zinc-400 font-mono">
                              {m.average_rank ? rankTierToString(m.average_rank) : "Обычный подбор"}
                            </div>
                          </div>
                        </td>

                        {/* 4. KDA Column (Strictly single-line) */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <div className="space-y-0.5">
                            <div className="font-mono font-medium text-sm tracking-tight">
                              <span className="text-emerald-400">{m.kills}</span>
                              <span className="text-zinc-600 font-normal"> / </span>
                              <span className="text-rose-400">{m.deaths}</span>
                              <span className="text-zinc-600 font-normal"> / </span>
                              <span className="text-zinc-400">{m.assists}</span>
                            </div>
                            <div className="text-[10px] font-mono text-zinc-400">
                              <span>{kda} KDA</span>
                            </div>
                          </div>
                        </td>

                        {/* 5. Economy & Damage Column */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <div className="space-y-0.5">
                            <div className="text-xs font-semibold font-mono text-zinc-200">
                              {m.net_worth
                                ? `${(m.net_worth / 1000).toFixed(1)}k NW`
                                : m.gold_per_min && m.duration
                                ? `${(Math.round(m.gold_per_min * (m.duration / 60)) / 1000).toFixed(1)}k NW`
                                : "—"}
                            </div>
                            <div className="text-[10px] font-mono text-zinc-500">
                              {m.gold_per_min ? `${m.gold_per_min} GPM` : ""}
                              {m.hero_damage ? ` · ${(m.hero_damage / 1000).toFixed(1)}k DMG` : ""}
                            </div>
                          </div>
                        </td>

                        {/* 6. Items HUD Column */}
                        <td className="py-3 px-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <DotaInventoryHud
                            items={items}
                            backpack={backpack}
                            neutralItem={m.item_neutral}
                            size="sm"
                            showBackpack={backpack.some((b) => b > 0)}
                          />
                        </td>

                        {/* 7. Action Controls */}
                        <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={(e) => handleCopyId(e, m.match_id)}
                              className="p-1.5 rounded-lg bg-zinc-800/40 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer"
                              title="Скопировать Match ID"
                            >
                              {copiedMatchId === m.match_id ? (
                                <Check className="size-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="size-3.5" />
                              )}
                            </button>

                            <button
                              onClick={() => toggleExpand(m.match_id)}
                              className="px-2.5 py-1 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/60 text-zinc-300 hover:text-white transition text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                              title="Составы обеих команд"
                            >
                              <span>{isExpanded ? "Скрыть" : "Составы"}</span>
                              {isExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                            </button>

                            <Link
                              href={`/match/${m.match_id}`}
                              className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/60 text-zinc-300 hover:text-white transition flex items-center justify-center cursor-pointer"
                              title="Полный поминутный разбор матча"
                            >
                              <ChevronRight className="size-4" />
                            </Link>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded 10-Player Team Rosters */}
                      {isExpanded && (
                        <tr className="bg-zinc-950/80">
                          <td colSpan={7} className="p-0 border-b border-zinc-800/80">
                            <div className="bg-zinc-950/90 border-t border-zinc-800/80 p-4 sm:p-5 space-y-4 animate-in fade-in duration-150">
                              <div className="flex flex-wrap items-center justify-between gap-3 text-xs border-b border-zinc-800/80 pb-2.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-medium text-zinc-200">Матч #{m.match_id}</span>
                                  <span className="text-zinc-600">·</span>
                                  <span className="text-zinc-400">{mode}</span>
                                  <span className="text-zinc-600">·</span>
                                  <span className="text-zinc-400">{fmtSec(m.duration)}</span>
                                </div>

                                <Link
                                  href={`/match/${m.match_id}`}
                                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-zinc-100 hover:bg-white text-zinc-900 font-medium text-xs transition shadow-sm"
                                >
                                  <BarChart2 className="size-3.5" />
                                  <span>Поминутный разбор слотов и графиков →</span>
                                </Link>
                              </div>

                              {isLoading ? (
                                <div className="py-8 flex flex-col items-center justify-center gap-2 text-zinc-400 text-xs">
                                  <div className="size-5 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
                                  <span>Загрузка протокола матча и составов 10 игроков...</span>
                                </div>
                              ) : inlineData ? (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                  <InlineRoster
                                    players={inlineData.players.filter((p) => p.player_slot < 128)}
                                    label="🟢 Силы Света (Radiant)"
                                    isRadiant={true}
                                    winner={inlineData.radiant_win}
                                    score={inlineData.radiant_score}
                                    accountId={accountId}
                                  />
                                  <InlineRoster
                                    players={inlineData.players.filter((p) => p.player_slot >= 128)}
                                    label="🔴 Силы Тьмы (Dire)"
                                    isRadiant={false}
                                    winner={!inlineData.radiant_win}
                                    score={inlineData.dire_score}
                                    accountId={accountId}
                                  />
                                </div>
                              ) : (
                                <div className="py-4 text-center text-xs text-zinc-500">
                                  Не удалось загрузить детальный протокол матча.
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Pagination ── */}
      {compact ? (
        onViewAllClick && matches.length > pageSize && (
          <div className="text-center pt-2">
            <button
              onClick={onViewAllClick}
              className="px-6 py-2.5 rounded-2xl bg-zinc-800/80 hover:bg-zinc-750 border border-zinc-700/60 text-zinc-200 hover:text-white font-semibold text-xs transition cursor-pointer shadow-sm inline-flex items-center gap-1.5"
            >
              <span>Смотреть все матчи ({matches.length})</span>
              <ChevronRight className="size-4" />
            </button>
          </div>
        )
      ) : (
        totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 text-xs">
            <div className="flex items-center gap-3">
              <span className="text-zinc-400">
                Показано <strong className="text-zinc-200 font-semibold">{(safePage - 1) * effectivePageSize + 1}–{Math.min(safePage * effectivePageSize, filteredMatches.length)}</strong> из <strong className="text-zinc-200 font-semibold">{filteredMatches.length}</strong> матчей
              </span>
              <div className="hidden sm:flex items-center gap-1 text-[11px] font-mono text-zinc-500 pl-2 border-l border-zinc-800">
                <span>по:</span>
                {[
                  { label: "20", val: 20 },
                  { label: "50", val: 50 },
                  { label: "100", val: 100 },
                  { label: "Все", val: 0 },
                ].map(({ label, val }) => (
                  <button
                    key={label}
                    onClick={() => {
                      setPageSize(val);
                      setCurrentPage(1);
                    }}
                    className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                      pageSize === val
                        ? "bg-zinc-800 text-zinc-100 font-bold border border-zinc-700/80"
                        : "hover:text-zinc-300 text-zinc-500"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-1.5 font-mono">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={safePage === 1}
                className="px-2.5 py-1 rounded-lg bg-zinc-800/60 border border-zinc-700/60 hover:bg-zinc-750 disabled:opacity-30 disabled:pointer-events-none text-zinc-300 font-medium transition cursor-pointer"
                title="Первая страница"
              >
                «
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="px-2.5 py-1 rounded-lg bg-zinc-800/60 border border-zinc-700/60 hover:bg-zinc-750 disabled:opacity-30 disabled:pointer-events-none text-zinc-300 font-medium transition cursor-pointer"
                title="Предыдущая"
              >
                ‹
              </button>

              <span className="px-3 py-1 rounded-lg bg-zinc-800 border border-zinc-700/80 text-zinc-100 font-semibold">
                {safePage} / {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="px-2.5 py-1 rounded-lg bg-zinc-800/60 border border-zinc-700/60 hover:bg-zinc-750 disabled:opacity-30 disabled:pointer-events-none text-zinc-300 font-medium transition cursor-pointer"
                title="Следующая"
              >
                ›
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={safePage === totalPages}
                className="px-2.5 py-1 rounded-lg bg-zinc-800/60 border border-zinc-700/60 hover:bg-zinc-750 disabled:opacity-30 disabled:pointer-events-none text-zinc-300 font-medium transition cursor-pointer"
                title="Последняя страница"
              >
                »
              </button>
            </div>
          </div>
        )
      )}
    </div>
  );
}
