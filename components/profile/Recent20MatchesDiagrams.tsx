"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
  Flame,
  TrendingUp,
  TrendingDown,
  Clock,
  Swords,
  Shield,
  Zap,
  Target,
  BarChart2,
  PieChart,
  ChevronRight,
  Sparkles,
  Info,
} from "lucide-react";
import { type OpenDotaHero, heroIconUrl } from "@/lib/opendota";
import { estimatePositionFromHistory, DotaPosition } from "@/lib/positions";
import { type EnrichedMatchItem } from "./PlayerMatchesSection";

// ---------------------------------------------------------------------------
// Official 5 Positions Metadata (Official Russian Competitive Terminology)
// ---------------------------------------------------------------------------
export const OFFICIAL_POSITIONS: Record<
  DotaPosition,
  {
    id: DotaPosition;
    name: string;
    roman: string;
    short: string;
    lane: string;
    icon: string;
    color: string;
    border: string;
    bg: string;
    barColor: string;
  }
> = {
  1: {
    id: 1,
    name: "Керри",
    roman: "I",
    short: "Поз 1",
    lane: "Легкая линия",
    icon: "🗡️",
    color: "text-amber-400",
    border: "border-amber-500/30",
    bg: "bg-amber-500/10",
    barColor: "bg-amber-500",
  },
  2: {
    id: 2,
    name: "Мид",
    roman: "II",
    short: "Поз 2",
    lane: "Центральная линия",
    icon: "⚡",
    color: "text-sky-400",
    border: "border-sky-500/30",
    bg: "bg-sky-500/10",
    barColor: "bg-sky-500",
  },
  3: {
    id: 3,
    name: "Оффлейн",
    roman: "III",
    short: "Поз 3",
    lane: "Сложная линия",
    icon: "🛡️",
    color: "text-purple-400",
    border: "border-purple-500/30",
    bg: "bg-purple-500/10",
    barColor: "bg-purple-500",
  },
  4: {
    id: 4,
    name: "Поддержка",
    roman: "IV",
    short: "Поз 4",
    lane: "Семи-саппорт",
    icon: "✨",
    color: "text-teal-400",
    border: "border-teal-500/30",
    bg: "bg-teal-500/10",
    barColor: "bg-teal-500",
  },
  5: {
    id: 5,
    name: "Полная поддержка",
    roman: "V",
    short: "Поз 5",
    lane: "Фулл-саппорт",
    icon: "🌱",
    color: "text-emerald-400",
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/10",
    barColor: "bg-emerald-500",
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fmtDuration(sec: number): string {
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

// ---------------------------------------------------------------------------
// Main Component Props
// ---------------------------------------------------------------------------
interface Recent20MatchesDiagramsProps {
  matches: EnrichedMatchItem[];
  heroMap: Record<number, OpenDotaHero>;
  onSelectMatchId?: (matchId: number) => void;
}

export function Recent20MatchesDiagrams({
  matches,
  heroMap,
  onSelectMatchId,
}: Recent20MatchesDiagramsProps) {
  // Always evaluate exactly the 20 most recent matches
  const recent20 = useMemo(() => matches.slice(0, 20), [matches]);
  const [hoveredMatchIdx, setHoveredMatchIdx] = useState<number | null>(null);
  const [hoveredPosId, setHoveredPosId] = useState<DotaPosition | null>(null);

  // Compute 20-match aggregate metrics
  const analytics = useMemo(() => {
    const total = recent20.length;
    if (total === 0) return null;

    const wins = recent20.filter((m) => m.won).length;
    const losses = total - wins;
    const winrate = Math.round((wins / total) * 100);

    // Current streak (consecutive wins or losses from the latest match backwards)
    let streakType: "win" | "loss" | null = null;
    let streakCount = 0;
    for (const m of recent20) {
      if (streakType === null) {
        streakType = m.won ? "win" : "loss";
        streakCount = 1;
      } else if ((m.won && streakType === "win") || (!m.won && streakType === "loss")) {
        streakCount++;
      } else {
        break;
      }
    }

    const totalKills = recent20.reduce((acc, m) => acc + (m.kills || 0), 0);
    const totalDeaths = recent20.reduce((acc, m) => acc + (m.deaths || 0), 0);
    const totalAssists = recent20.reduce((acc, m) => acc + (m.assists || 0), 0);

    const avgK = (totalKills / total).toFixed(1);
    const avgD = (totalDeaths / total).toFixed(1);
    const avgA = (totalAssists / total).toFixed(1);
    const avgKda = ((totalKills + totalAssists) / Math.max(1, totalDeaths)).toFixed(2);

    const matchesWithGpm = recent20.filter((m) => (m.gold_per_min || 0) > 0);
    const avgGpm = matchesWithGpm.length
      ? Math.round(matchesWithGpm.reduce((acc, m) => acc + (m.gold_per_min || 0), 0) / matchesWithGpm.length)
      : 0;

    const matchesWithXpm = recent20.filter((m) => (m.xp_per_min || 0) > 0);
    const avgXpm = matchesWithXpm.length
      ? Math.round(matchesWithXpm.reduce((acc, m) => acc + (m.xp_per_min || 0), 0) / matchesWithXpm.length)
      : 0;

    const avgDuration = Math.round(recent20.reduce((acc, m) => acc + (m.duration || 0), 0) / total);

    // 5 Official Positions Breakdown across the 20 matches
    const posCounts: Record<DotaPosition, { games: number; wins: number }> = {
      1: { games: 0, wins: 0 },
      2: { games: 0, wins: 0 },
      3: { games: 0, wins: 0 },
      4: { games: 0, wins: 0 },
      5: { games: 0, wins: 0 },
    };

    recent20.forEach((m) => {
      const pos =
        estimatePositionFromHistory({
          hero_id: m.hero_id,
          lane_role: m.lane_role,
          lane: m.lane,
          player_slot: m.player_slot,
          last_hits: m.last_hits,
          duration: m.duration,
        }) ?? 1;

      if (pos >= 1 && pos <= 5) {
        posCounts[pos].games += 1;
        if (m.won) posCounts[pos].wins += 1;
      }
    });

    const positionsList = ([1, 2, 3, 4, 5] as DotaPosition[]).map((posId) => {
      const stat = posCounts[posId];
      const meta = OFFICIAL_POSITIONS[posId];
      const pct = Math.round((stat.games / total) * 100);
      const wr = stat.games > 0 ? Math.round((stat.wins / stat.games) * 100) : 0;
      return {
        ...meta,
        games: stat.games,
        wins: stat.wins,
        losses: stat.games - stat.wins,
        pct,
        winrate: wr,
      };
    });

    // Top Heroes in these 20 matches
    const heroAggMap = new Map<
      number,
      { heroId: number; games: number; wins: number; kills: number; deaths: number; assists: number }
    >();

    recent20.forEach((m) => {
      const entry = heroAggMap.get(m.hero_id) || {
        heroId: m.hero_id,
        games: 0,
        wins: 0,
        kills: 0,
        deaths: 0,
        assists: 0,
      };
      entry.games += 1;
      if (m.won) entry.wins += 1;
      entry.kills += m.kills || 0;
      entry.deaths += m.deaths || 0;
      entry.assists += m.assists || 0;
      heroAggMap.set(m.hero_id, entry);
    });

    const topHeroes = Array.from(heroAggMap.values())
      .sort((a, b) => b.games - a.games || b.wins - a.wins)
      .slice(0, 4)
      .map((entry) => {
        const h = heroMap[entry.heroId];
        const wr = Math.round((entry.wins / entry.games) * 100);
        const kda = ((entry.kills + entry.assists) / Math.max(1, entry.deaths)).toFixed(2);
        return {
          ...entry,
          hero: h,
          winrate: wr,
          kda,
          iconUrl: h ? heroIconUrl(h.name) : null,
        };
      });

    // Match-by-match KDA data for Trend Diagram (Chronological: oldest to newest for a natural left-to-right timeline)
    // Matches in OpenDota are returned newest-first, so slicing 20 and reversing gives chronological progression
    const chronological20 = [...recent20].reverse().map((m, idx) => {
      const kdaVal = Number(((m.kills + m.assists) / Math.max(1, m.deaths)).toFixed(2));
      const pos =
        estimatePositionFromHistory({
          hero_id: m.hero_id,
          lane_role: m.lane_role,
          lane: m.lane,
          player_slot: m.player_slot,
          last_hits: m.last_hits,
          duration: m.duration,
        }) ?? 1;

      return {
        match: m,
        chronoIndex: idx + 1,
        hero: heroMap[m.hero_id] || m.hero,
        kda: kdaVal,
        pos,
      };
    });

    const maxKdaValue = Math.max(
      6,
      ...chronological20.map((c) => c.kda)
    );

    return {
      total,
      wins,
      losses,
      winrate,
      streakType,
      streakCount,
      avgK,
      avgD,
      avgA,
      avgKda: Number(avgKda),
      avgGpm,
      avgXpm,
      avgDuration,
      positionsList,
      topHeroes,
      chronological20,
      maxKdaValue,
    };
  }, [recent20, heroMap]);

  if (!analytics || analytics.total === 0) return null;

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 backdrop-blur-xl p-4 sm:p-6 space-y-6 shadow-sm">
      {/* ── Top Bar: Section Title + Quick Stat Badges ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="size-7 rounded-lg bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-sm shadow-sm">
              📊
            </div>
            <h3 className="text-base font-bold text-zinc-100 tracking-tight">
              Аналитика последних 20 матчей
            </h3>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-zinc-800/90 text-zinc-300 border border-zinc-700/60 font-semibold">
              20 игр
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Сводная форма, распределение по 5 официальным позициям и тренды результативности
          </p>
        </div>

        {/* Quick KPI badges */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          {/* Winrate Pill */}
          <div
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 font-bold ${
              analytics.winrate >= 50
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                : "bg-rose-500/10 text-rose-400 border-rose-500/30"
            }`}
          >
            <span>{analytics.winrate}% WR</span>
            <span className="text-[11px] font-normal text-zinc-400">
              ({analytics.wins}В - {analytics.losses}П)
            </span>
          </div>

          {/* Streak Badge */}
          {analytics.streakCount > 1 && (
            <div
              className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 font-bold ${
                analytics.streakType === "win"
                  ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                  : "bg-zinc-800/80 text-zinc-300 border-zinc-700/60"
              }`}
            >
              <Flame className="size-3.5" />
              <span>
                {analytics.streakCount} {analytics.streakType === "win" ? "победы подряд" : "поражения подряд"}
              </span>
            </div>
          )}

          {/* Average KDA Badge */}
          <div className="px-3 py-1.5 rounded-xl bg-zinc-800/80 border border-zinc-700/60 text-zinc-200 flex items-center gap-1.5">
            <span className="text-zinc-400">Ср. KDA:</span>
            <span className="font-bold text-white">{analytics.avgKda.toFixed(2)}</span>
            <span className="text-[10px] text-zinc-400">
              ({analytics.avgK}/{analytics.avgD}/{analytics.avgA})
            </span>
          </div>

          {/* Average GPM */}
          {analytics.avgGpm > 0 && (
            <div className="px-3 py-1.5 rounded-xl bg-zinc-800/80 border border-zinc-700/60 text-zinc-300 hidden sm:flex items-center gap-1">
              <span className="text-zinc-400">GPM:</span>
              <span className="font-bold text-zinc-100">{analytics.avgGpm}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Diagram 1: Recent 20 Matches Form Strip (Interactive outcomes) ── */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-200 uppercase tracking-wider text-[11px]">
              Форма за 20 матчей
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">
              (слева: свежие матчи → справа: более ранние)
            </span>
          </div>
          <span className="text-xs text-zinc-400 font-mono">
            {analytics.wins} побед · {analytics.losses} поражений
          </span>
        </div>

        {/* 20 Horizontal Interactive Tiles */}
        <div className="grid grid-cols-10 sm:grid-cols-20 gap-1.5">
          {recent20.map((m, idx) => {
            const hero = heroMap[m.hero_id] || m.hero;
            const icon = m.heroIconUrl || (hero ? heroIconUrl(hero.name) : null);
            const isHovered = hoveredMatchIdx === idx;
            const kda = ((m.kills + m.assists) / Math.max(1, m.deaths)).toFixed(1);
            const pos =
              estimatePositionFromHistory({
                hero_id: m.hero_id,
                lane_role: m.lane_role,
                lane: m.lane,
                player_slot: m.player_slot,
                last_hits: m.last_hits,
                duration: m.duration,
              }) ?? 1;
            const posMeta = OFFICIAL_POSITIONS[pos];

            return (
              <div
                key={m.match_id}
                className="relative group"
                onMouseEnter={() => setHoveredMatchIdx(idx)}
                onMouseLeave={() => setHoveredMatchIdx(null)}
              >
                <Link
                  href={`/match/${m.match_id}`}
                  onClick={() => onSelectMatchId?.(m.match_id)}
                  className={`relative flex flex-col items-center justify-center p-1 rounded-xl border transition-all duration-200 cursor-pointer overflow-hidden ${
                    m.won
                      ? "bg-emerald-950/20 hover:bg-emerald-950/50 border-emerald-500/40 hover:border-emerald-400 hover:scale-105 shadow-sm shadow-emerald-950/40"
                      : "bg-rose-950/20 hover:bg-rose-950/50 border-rose-500/40 hover:border-rose-400 hover:scale-105 shadow-sm shadow-rose-950/40"
                  }`}
                >
                  {/* Hero Mini Icon */}
                  <div className="size-6 sm:size-7 rounded-md overflow-hidden bg-zinc-900 border border-zinc-700/60 shrink-0">
                    {icon ? (
                      <img src={icon} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-zinc-800" />
                    )}
                  </div>

                  {/* Outcome Indicator Tag */}
                  <span
                    className={`mt-1 text-[9px] font-bold font-mono uppercase ${
                      m.won ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {m.won ? "В" : "П"}
                  </span>
                </Link>

                {/* Floating Tooltip with Full Match Breakdown */}
                <AnimatePresence>
                  {isHovered && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.95 }}
                      transition={{ duration: 0.12 }}
                      className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 p-3 rounded-xl bg-zinc-900/95 border border-zinc-700 shadow-xl backdrop-blur-md pointer-events-none text-left"
                    >
                      <div className="flex items-center gap-2 border-b border-zinc-800 pb-2 mb-2">
                        <div className="size-7 rounded-lg overflow-hidden border border-zinc-700 shrink-0">
                          {icon && <img src={icon} alt="" className="w-full h-full object-cover" />}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-xs text-zinc-100 truncate">
                            {hero?.localized_name || `Герой #${m.hero_id}`}
                          </div>
                          <div className="text-[10px] text-zinc-400 font-mono">
                            {posMeta ? `${posMeta.icon} ${posMeta.name}` : "Позиция"}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1 text-[11px] font-mono">
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-400">Результат:</span>
                          <span className={`font-bold ${m.won ? "text-emerald-400" : "text-rose-400"}`}>
                            {m.won ? "ПОБЕДА" : "ПОРАЖЕНИЕ"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-400">Счет K/D/A:</span>
                          <span className="text-zinc-200">
                            {m.kills} / {m.deaths} / {m.assists} ({kda})
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-400">Длительность:</span>
                          <span className="text-zinc-300">{fmtDuration(m.duration)}</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1 border-t border-zinc-800">
                          <span>{m.lobby_type === 7 ? "Рейтинговый" : m.game_mode === 23 ? "Турбо" : "All Pick"}</span>
                          <span>{timeAgo(m.start_time)}</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Mid Row: Diagram 2 (5 Positions Distribution) & Diagram 3 (KDA Trend) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Diagram 2: 5 Official Positions (7 cols) */}
        <div className="lg:col-span-7 rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
                Распределение по 5 позициям
              </span>
              <span className="text-[10px] font-mono text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded-full border border-zinc-700/50">
                Официальные роли
              </span>
            </div>
            <span className="text-[11px] font-mono text-zinc-400">За 20 матчей</span>
          </div>

          {/* Stacked Proportional Bar */}
          <div className="space-y-1.5">
            <div className="h-3 w-full rounded-full bg-zinc-800 overflow-hidden flex shadow-inner">
              {analytics.positionsList.map((pos) => {
                if (pos.pct <= 0) return null;
                const isHovered = hoveredPosId === pos.id;
                return (
                  <div
                    key={pos.id}
                    style={{ width: `${pos.pct}%` }}
                    className={`${pos.barColor} h-full transition-all duration-300 relative group cursor-pointer ${
                      isHovered ? "brightness-125 scale-y-110" : "opacity-90 hover:opacity-100"
                    }`}
                    onMouseEnter={() => setHoveredPosId(pos.id)}
                    onMouseLeave={() => setHoveredPosId(null)}
                    title={`${pos.name} (${pos.short}): ${pos.games} игр (${pos.pct}%), ${pos.winrate}% WR`}
                  />
                );
              })}
            </div>

            {/* Segment legend hint */}
            <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono px-0.5">
              <span>Доля времени на каждой роли</span>
              <span>100% времени в игре</span>
            </div>
          </div>

          {/* 5 Position Detailed Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
            {analytics.positionsList.map((pos) => {
              const isHovered = hoveredPosId === pos.id;
              const hasGames = pos.games > 0;
              return (
                <div
                  key={pos.id}
                  onMouseEnter={() => setHoveredPosId(pos.id)}
                  onMouseLeave={() => setHoveredPosId(null)}
                  className={`p-2.5 rounded-xl border transition-all text-center space-y-1 cursor-default ${
                    isHovered
                      ? `${pos.bg} ${pos.border} ring-1 ring-zinc-500`
                      : hasGames
                      ? "bg-zinc-850/50 border-zinc-800/80 hover:border-zinc-700"
                      : "bg-zinc-900/30 border-zinc-800/40 opacity-40"
                  }`}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-xs">{pos.icon}</span>
                    <span className="text-[11px] font-bold text-zinc-200 truncate">{pos.name}</span>
                  </div>
                  <div className="text-[10px] font-mono text-zinc-400">
                    {pos.short}
                  </div>

                  <div className="pt-1 border-t border-zinc-800/80">
                    <div className="text-xs font-mono font-bold text-zinc-100">
                      {pos.games} <span className="text-[10px] text-zinc-400 font-normal">({pos.pct}%)</span>
                    </div>
                    {hasGames ? (
                      <div
                        className={`text-[10px] font-mono font-semibold ${
                          pos.winrate >= 50 ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {pos.winrate}% WR
                      </div>
                    ) : (
                      <div className="text-[10px] font-mono text-zinc-600">—</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Diagram 3: Chronological KDA & Performance Trend (5 cols) */}
        <div className="lg:col-span-5 rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
                Тренд KDA (20 матчей)
              </span>
              <span className="text-[10px] font-mono text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded-full border border-zinc-700/50">
                Ср: {analytics.avgKda.toFixed(2)}
              </span>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">← Ранее · Сейчас →</span>
          </div>

          {/* Interactive Bar Chart */}
          <div className="space-y-2">
            <div className="relative h-28 w-full flex items-end justify-between gap-1 pt-4 pb-1 border-b border-zinc-800/80">
              {/* Average KDA Reference Dotted Line */}
              {analytics.maxKdaValue > 0 && (
                <div
                  style={{
                    bottom: `${Math.min(90, Math.max(10, (analytics.avgKda / analytics.maxKdaValue) * 100))}%`,
                  }}
                  className="absolute left-0 right-0 border-b border-dashed border-zinc-500/50 pointer-events-none z-0"
                >
                  <span className="absolute -top-3 right-0 text-[8px] font-mono text-zinc-400 bg-zinc-900/90 px-1 rounded">
                    ср. {analytics.avgKda.toFixed(1)}
                  </span>
                </div>
              )}

              {/* 20 Bars */}
              {analytics.chronological20.map((c, i) => {
                const heightPct = Math.max(
                  10,
                  Math.min(100, (c.kda / analytics.maxKdaValue) * 100)
                );
                const isAboveAvg = c.kda >= analytics.avgKda;
                const heroIcon = c.hero ? heroIconUrl(c.hero.name) : null;

                return (
                  <div
                    key={c.match.match_id}
                    className="flex-1 flex flex-col items-center h-full justify-end group relative cursor-pointer"
                  >
                    {/* The bar itself */}
                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-full rounded-t-md transition-all duration-200 ${
                        c.match.won
                          ? isAboveAvg
                            ? "bg-emerald-400 group-hover:bg-emerald-300 group-hover:scale-y-105 shadow-sm shadow-emerald-500/20"
                            : "bg-emerald-600/70 group-hover:bg-emerald-500"
                          : isAboveAvg
                          ? "bg-amber-500/80 group-hover:bg-amber-400"
                          : "bg-rose-500/70 group-hover:bg-rose-400"
                      }`}
                    />

                    {/* Popover on hover */}
                    <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col z-30 p-2 rounded-lg bg-zinc-950 border border-zinc-700 shadow-xl text-left min-w-[130px] pointer-events-none">
                      <div className="flex items-center gap-1.5 border-b border-zinc-800 pb-1 mb-1">
                        {heroIcon && (
                          <img src={heroIcon} alt="" className="size-4 rounded object-cover" />
                        )}
                        <span className="text-[10px] font-bold text-zinc-100 truncate">
                          {c.hero?.localized_name || "Матч"}
                        </span>
                      </div>
                      <div className="text-[9px] font-mono text-zinc-400 space-y-0.5">
                        <div className="flex justify-between">
                          <span>KDA:</span>
                          <span className="font-bold text-white">{c.kda.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Счет:</span>
                          <span>
                            {c.match.kills}/{c.match.deaths}/{c.match.assists}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Исход:</span>
                          <span className={c.match.won ? "text-emerald-400" : "text-rose-400"}>
                            {c.match.won ? "Победа" : "Поражение"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Legend */}
            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-emerald-400" />
                Выше среднего
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-rose-500" />
                Ниже среднего
              </span>
              <span>Пик: {analytics.maxKdaValue.toFixed(1)} KDA</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Row: Diagram 4 (Top Heroes in Last 20) ── */}
      {analytics.topHeroes.length > 0 && (
        <div className="border-t border-zinc-800/80 pt-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold uppercase tracking-wider text-zinc-300 text-[11px]">
              Частые герои за 20 матчей
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">
              Топ выборки по количеству сыгранных матчей
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {analytics.topHeroes.map((th) => (
              <div
                key={th.heroId}
                className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700/80 transition shadow-sm"
              >
                {/* Hero Avatar */}
                <div className="size-10 rounded-lg overflow-hidden border border-zinc-700/60 bg-zinc-900 shrink-0 shadow-sm">
                  {th.iconUrl ? (
                    <img src={th.iconUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-zinc-800" />
                  )}
                </div>

                {/* Hero info & winrate */}
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-xs text-zinc-100 truncate">
                    {th.hero?.localized_name || `Герой #${th.heroId}`}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400 mt-0.5">
                    <span>{th.games} игр</span>
                    <span>·</span>
                    <span
                      className={`font-bold ${
                        th.winrate >= 50 ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {th.winrate}% WR
                    </span>
                    <span>·</span>
                    <span>{th.kda} KDA</span>
                  </div>

                  {/* Mini Winrate Progress Bar */}
                  <div className="w-full h-1 rounded-full bg-zinc-800 mt-1.5 overflow-hidden flex">
                    <div
                      style={{ width: `${th.winrate}%` }}
                      className="h-full bg-emerald-500 rounded-full"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
