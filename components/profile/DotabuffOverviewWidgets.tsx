"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Swords,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Clock,
  Sparkles,
  Users,
  Compass,
  Calendar,
  Layers,
  Award,
} from "lucide-react";
import {
  type OpenDotaHero,
  type OpenDotaPlayerCounts,
  getItemIconUrl,
  getItemName,
  heroIconUrl,
} from "@/lib/opendota";
import { rankTierToString } from "@/lib/ranks";
import { DotaInventoryHud } from "@/components/ui/DotaInventoryHud";

export interface VerifiedHeroStat {
  hero_id: number;
  name: string;
  localized_name: string;
  matches: number;
  winrate: number;
  wins: number;
  losses: number;
  kda: number;
  role: "Кор" | "Саппорт";
  lane: "Легкая линия" | "Сложная линия" | "Центральная линия";
  last_played_text: string;
}

export interface ActivityDay {
  date: string;
  dayOfWeek: number;
  weekIndex: number;
  games: number;
  wins: number;
  losses: number;
}

// ── 1. Roles and Lanes Bar (Authentic competitive style) ─────────
export function RolesAndLanesBar({
  corePct,
  supportPct,
  primaryLane = "Сложная линия",
  onMoreClick,
}: {
  corePct: number;
  supportPct: number;
  primaryLane?: string;
  onMoreClick?: () => void;
}) {
  const positions = [
    { pos: "1", name: "Керри", sub: "Легкая линия", icon: "⚔️", pct: Math.round(corePct * 0.45) },
    { pos: "2", name: "Мид", sub: "Центральная линия", icon: "⚡", pct: Math.round(corePct * 0.25) },
    { pos: "3", name: "Хардлейн", sub: "Сложная линия", icon: "🛡️", pct: Math.max(0, corePct - Math.round(corePct * 0.45) - Math.round(corePct * 0.25)) },
    { pos: "4", name: "Частичная поддержка", sub: "Семи-саппорт", icon: "✨", pct: Math.round(supportPct * 0.6) },
    { pos: "5", name: "Полная поддержка", sub: "Фулл-саппорт", icon: "🌱", pct: Math.max(0, supportPct - Math.round(supportPct * 0.6)) },
  ];

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-xl p-5 sm:p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
            РОЛИ И ПОЗИЦИИ
          </span>
          <span className="text-[10px] text-zinc-500 uppercase tracking-tight font-mono">
            ПО СТАТИСТИКЕ МАТЧЕЙ
          </span>
        </div>
        {onMoreClick && (
          <button
            onClick={onMoreClick}
            className="text-[11px] font-medium text-zinc-400 hover:text-zinc-200 transition cursor-pointer flex items-center gap-0.5 uppercase"
          >
            Все герои →
          </button>
        )}
      </div>

      {/* Role percentage numbers & dual bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-1.5 text-zinc-200 font-mono">
            <span className="text-zinc-400">⚡</span>
            <span>{corePct}% Основа (Кор)</span>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-300 font-mono">
            <span className="text-zinc-400">🌱</span>
            <span>{supportPct}% Поддержка (Саппорт)</span>
          </div>
        </div>

        {/* Minimalist Dual bar */}
        <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden flex">
          <div
            className="h-full bg-zinc-300 transition-all duration-500"
            style={{ width: `${corePct}%` }}
            title={`Основа (Кор): ${corePct}%`}
          />
          <div
            className="h-full bg-zinc-500 transition-all duration-500"
            style={{ width: `${supportPct}%` }}
            title={`Поддержка: ${supportPct}%`}
          />
        </div>
      </div>

      {/* 5 Official Positions Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 text-xs">
        {positions.map((p) => (
          <div
            key={p.pos}
            className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-1 hover:border-zinc-700/60 transition"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-zinc-500">Поз. {p.pos}</span>
              <span className="text-[11px] font-mono font-semibold text-zinc-200">{p.pct}%</span>
            </div>
            <div className="font-semibold text-zinc-100 text-xs truncate">
              {p.name}
            </div>
            <div className="text-[10px] text-zinc-500 truncate">
              {p.sub}
            </div>
            <div className="w-full h-1 rounded-full bg-zinc-800 overflow-hidden mt-1">
              <div
                className="h-full bg-zinc-400 rounded-full"
                style={{ width: `${Math.min(100, p.pct * 2)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 2. Top Heroes Table (Dotabuff order) ──────────────────────────
export function TopHeroesDotabuffTable({
  heroes,
  heroMap,
  onMoreClick,
}: {
  heroes: VerifiedHeroStat[];
  heroMap: Record<number, OpenDotaHero>;
  onMoreClick?: () => void;
}) {
  const maxMatches = Math.max(1, ...heroes.map((h) => h.matches));

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-xl p-5 sm:p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
            ЧАСТО ВЫБИРАЕМЫЕ ГЕРОИ
          </span>
          <span className="text-[10px] text-zinc-500 uppercase tracking-tight font-mono">
            ЗА ВСЁ ВРЕМЯ
          </span>
        </div>
        {onMoreClick && (
          <button
            onClick={onMoreClick}
            className="text-[11px] font-medium text-zinc-400 hover:text-zinc-200 transition cursor-pointer flex items-center gap-0.5 uppercase"
          >
            Все герои →
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs whitespace-nowrap">
          <thead className="border-b border-zinc-800/80 bg-zinc-900/90 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 select-none">
            <tr>
              <th className="py-2.5 px-3">Герой</th>
              <th className="py-2.5 px-3">Матчи</th>
              <th className="py-2.5 px-3">% Побед</th>
              <th className="py-2.5 px-3">KDA</th>
              <th className="py-2.5 px-3">Роль</th>
              <th className="py-2.5 px-3">Линия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {heroes.map((h) => {
              const heroObj = heroMap[h.hero_id];
              const matchBarPct = Math.round((h.matches / maxMatches) * 100);
              const isWinGood = h.winrate >= 50;

              return (
                <tr
                  key={h.hero_id}
                  className="hover:bg-zinc-800/40 transition group"
                >
                  {/* Hero portrait + Name + Time ago */}
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2.5">
                      <div className="size-8 rounded-lg overflow-hidden border border-zinc-700/60 shrink-0 bg-zinc-900 shadow-sm">
                        {heroObj ? (
                          <img
                            src={heroIconUrl(heroObj.name)}
                            alt={h.localized_name}
                            className="size-full object-cover group-hover:scale-105 transition duration-200"
                          />
                        ) : (
                          <div className="size-full bg-zinc-800" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-zinc-100 text-xs group-hover:text-white transition truncate">
                          {h.localized_name}
                        </div>
                        <div className="text-[10px] text-zinc-500">
                          {h.last_played_text}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Matches count + mini bar */}
                  <td className="py-2.5 px-3">
                    <div className="space-y-1">
                      <div className="font-mono font-medium text-zinc-200 text-xs">
                        {h.matches}
                      </div>
                      <div className="w-16 h-1 rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full bg-zinc-400 rounded-full"
                          style={{ width: `${matchBarPct}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Winrate % + progress bar */}
                  <td className="py-2.5 px-3">
                    <div className="space-y-1">
                      <div
                        className={`font-mono font-semibold text-xs ${
                          isWinGood ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {h.winrate.toFixed(2)}%
                      </div>
                      <div className="w-20 h-1 rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            isWinGood ? "bg-emerald-500/80" : "bg-rose-500/80"
                          }`}
                          style={{ width: `${Math.min(100, h.winrate)}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* KDA + mini bar */}
                  <td className="py-2.5 px-3">
                    <div className="space-y-1">
                      <div className="font-mono font-medium text-zinc-200 text-xs">
                        {h.kda.toFixed(2)}
                      </div>
                      <div className="w-14 h-1 rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full bg-zinc-400 rounded-full"
                          style={{ width: `${Math.min(100, (h.kda / 5) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Role badge */}
                  <td className="py-2.5 px-3">
                    <span className="font-medium text-xs text-zinc-300">
                      {h.role}
                    </span>
                  </td>

                  {/* Lane badge */}
                  <td className="py-2.5 px-3">
                    <span className="font-medium text-xs text-zinc-400">
                      {h.lane}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── 3. Recent Matches Table (Dotabuff style) ─────────────────────
export function RecentMatchesDotabuffTable({
  matches,
  heroMap,
  onMoreClick,
}: {
  matches: any[];
  heroMap: Record<number, OpenDotaHero>;
  onMoreClick?: () => void;
}) {
  function fmtDuration(secs: number) {
    const s = Math.max(0, Math.floor(secs));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r.toString().padStart(2, "0")}`;
  }

  function agoText(unixTs: number) {
    const diff = Date.now() / 1000 - unixTs;
    if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
    if (diff < 86400 * 30) return `${Math.floor(diff / 86400)} дня назад`;
    return new Date(unixTs * 1000).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
    });
  }

  return (
    <div className="rounded-3xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-md p-5 sm:p-6 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase tracking-wider text-white">
            ПОСЛЕДНИЕ МАТЧИ
          </span>
        </div>
        {onMoreClick && (
          <button
            onClick={onMoreClick}
            className="text-[11px] font-bold text-red-400 hover:text-red-300 transition cursor-pointer flex items-center gap-0.5 uppercase"
          >
            + Больше
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs whitespace-nowrap">
          <thead className="border-b border-[#1b2336] bg-[#101524] text-[10px] font-bold uppercase tracking-wider text-zinc-400 select-none">
            <tr>
              <th className="py-2.5 px-3">Герой</th>
              <th className="py-2.5 px-3">Результат</th>
              <th className="py-2.5 px-3">Тип</th>
              <th className="py-2.5 px-3">Длительность</th>
              <th className="py-2.5 px-3">KDA</th>
              <th className="py-2.5 px-3">Предметы</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#151c2e]">
            {matches.slice(0, 10).map((m, idx) => {
              const hero = heroMap[m.hero_id];
              const items = [
                m.item_0,
                m.item_1,
                m.item_2,
                m.item_3,
                m.item_4,
                m.item_5,
              ].map((it) => (typeof it === "number" && it > 0 ? it : 0));
              const neutralItem =
                typeof m.item_neutral === "number" && m.item_neutral > 0
                  ? m.item_neutral
                  : 0;

              const kills = m.kills || 0;
              const deaths = m.deaths || 0;
              const assists = m.assists || 0;
              const kdaRatio = (
                (kills + assists) /
                Math.max(1, deaths)
              ).toFixed(2);

              return (
                <tr
                  key={m.match_id || idx}
                  className="hover:bg-[#121829] transition group"
                >
                  {/* Hero portrait + level badge + Name + rank medal */}
                  <td className="py-2.5 px-3">
                    <Link
                      href={`/match/${m.match_id}`}
                      className="flex items-center gap-2.5"
                    >
                      <div className="relative size-9 rounded-lg overflow-hidden border border-zinc-700 shrink-0 bg-zinc-900">
                        {m.heroIconUrl ? (
                          <img
                            src={m.heroIconUrl}
                            alt=""
                            className="size-full object-cover group-hover:scale-105 transition"
                          />
                        ) : hero ? (
                          <img
                            src={heroIconUrl(hero.name)}
                            alt=""
                            className="size-full object-cover group-hover:scale-105 transition"
                          />
                        ) : (
                          <div className="size-full bg-zinc-800" />
                        )}
                        {/* Hero level badge */}
                        {m.level ? (
                          <span className="absolute -bottom-0.5 -right-0.5 px-1 rounded bg-zinc-950/90 border border-zinc-700 text-[8px] font-black text-amber-300 font-mono">
                            {m.level}
                          </span>
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-white text-xs group-hover:text-red-400 transition truncate">
                          {hero?.localized_name ?? `Герой #${m.hero_id}`}
                        </div>
                        <div className="text-[10px] text-zinc-500 font-mono">
                          {m.average_rank ? rankTierToString(m.average_rank) : (m.lobby_type === 7 ? "Рейтинг" : "Матч")}
                        </div>
                      </div>
                    </Link>
                  </td>

                  {/* Outcome + lane arrow + time ago */}
                  <td className="py-2.5 px-3">
                    <div className="space-y-0.5">
                      <div
                        className={`font-black text-xs flex items-center gap-1 ${
                          m.won ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        <span>{m.won ? "Победа" : "Поражение"}</span>
                      </div>
                      <div className="text-[10px] text-zinc-500 flex items-center gap-1 font-mono">
                        <span className="text-amber-400">↑↓</span>
                        <span>{agoText(m.start_time)}</span>
                      </div>
                    </div>
                  </td>

                  {/* Lobby Type + Party size */}
                  <td className="py-2.5 px-3">
                    <div className="space-y-0.5">
                      <div className="text-xs text-zinc-200 font-medium">
                        {m.lobby_type === 7 ? "Рейтинговый" : m.game_mode === 23 ? "Турбо" : "Обычный"}
                      </div>
                      <div className="text-[10px] text-zinc-500 flex items-center gap-1 font-mono">
                        <span>{m.gameModeName || "All Pick"}</span>
                        {m.party_size && m.party_size > 1 ? (
                          <span className="text-zinc-400">👥 x{m.party_size}</span>
                        ) : null}
                      </div>
                    </div>
                  </td>

                  {/* Duration */}
                  <td className="py-2.5 px-3 font-mono text-xs text-zinc-300">
                    {fmtDuration(m.duration)}
                  </td>

                  {/* KDA + ratio bar */}
                  <td className="py-2.5 px-3 font-mono">
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold">
                        <span className="text-emerald-400">{kills}</span>
                        <span className="text-zinc-600">/</span>
                        <span className="text-rose-400">{deaths}</span>
                        <span className="text-zinc-600">/</span>
                        <span className="text-sky-400">{assists}</span>
                      </div>
                      <div className="w-16 h-1 rounded-full bg-zinc-800 overflow-hidden flex">
                        <div
                          className={`h-full ${
                            Number(kdaRatio) >= 3 ? "bg-emerald-500" : "bg-amber-500"
                          }`}
                          style={{
                            width: `${Math.min(100, (Number(kdaRatio) / 5) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* 6 Items + Neutral item + Backpack */}
                  <td className="py-2 px-3">
                    <DotaInventoryHud
                      items={items}
                      backpack={[m.backpack_0, m.backpack_1, m.backpack_2]}
                      neutralItem={neutralItem}
                      size="xs"
                      showBackpack={Boolean(m.backpack_0 || m.backpack_1 || m.backpack_2)}
                      showAghs={false}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── 4. Dotabuff Activity Calendar Heatmap ─────────────────────────
export function ActivityCalendarDotabuff({
  activityGrid,
  onMoreClick,
}: {
  activityGrid: ActivityDay[];
  onMoreClick?: () => void;
}) {
  const [hoveredDay, setHoveredDay] = useState<ActivityDay | null>(null);

  const dayLabels = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

  // Group days by weekIndex (0..13)
  const weeksCount = 14;
  const columns: ActivityDay[][] = [];
  for (let w = 0; w < weeksCount; w++) {
    columns.push(activityGrid.filter((d) => d.weekIndex === w));
  }

  // Compute dynamic month labels based on the first day of each week
  const monthNames = [
    "Янв", "Фев", "Мар", "Апр", "Май", "Июн",
    "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"
  ];
  const monthLabels: { weekIndex: number; name: string }[] = [];
  let lastMonth = -1;

  columns.forEach((week, wIdx) => {
    if (week.length > 0 && week[0]?.date) {
      const parts = week[0].date.split("-");
      if (parts.length === 3) {
        const m = parseInt(parts[1], 10) - 1;
        if (m !== lastMonth) {
          monthLabels.push({ weekIndex: wIdx, name: monthNames[m] || "" });
          lastMonth = m;
        }
      }
    }
  });

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-xl p-5 sm:p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
            АКТИВНОСТЬ
          </span>
          <span className="text-[10px] text-zinc-500 uppercase tracking-tight font-mono">
            ПОСЛЕДНИЕ 3 МЕСЯЦА
          </span>
        </div>
        {onMoreClick && (
          <button
            onClick={onMoreClick}
            className="text-[11px] font-medium text-zinc-400 hover:text-zinc-200 transition cursor-pointer flex items-center gap-0.5 uppercase"
          >
            Матчи →
          </button>
        )}
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="min-w-[320px] space-y-2">
          {/* Dynamic Month labels */}
          <div className="flex items-center text-[10px] text-zinc-500 font-medium uppercase tracking-wider pl-7 pr-1">
            <div className="flex-1 grid grid-cols-[repeat(14,minmax(0,1fr))] gap-1.5">
              {columns.map((_, wIdx) => {
                const label = monthLabels.find((l) => l.weekIndex === wIdx);
                return (
                  <span key={wIdx} className="truncate text-left font-mono">
                    {label ? label.name : ""}
                  </span>
                );
              })}
            </div>
          </div>

          {/* 7-Row Calendar Grid */}
          <div className="space-y-1.5">
            {[1, 2, 3, 4, 5, 6, 0].map((dayIdx) => (
              <div key={dayIdx} className="flex items-center gap-2">
                <span className="w-5 text-[9px] font-mono text-zinc-500 text-right shrink-0 select-none">
                  {dayLabels[dayIdx]}
                </span>

                <div className="flex-1 grid grid-cols-[repeat(14,minmax(0,1fr))] gap-1.5">
                  {columns.map((week, wIdx) => {
                    const day = week.find((d) => d.dayOfWeek === dayIdx);
                    const games = day?.games || 0;
                    const wins = day?.wins || 0;
                    const losses = day?.losses || 0;

                    let bgClass = "bg-zinc-800/40 border border-zinc-800/60";
                    if (games > 0) {
                      if (wins === games) {
                        bgClass = "bg-emerald-500/80 border border-emerald-400/80 shadow-sm";
                      } else if (losses === games) {
                        bgClass = "bg-rose-500/80 border border-rose-400/80 shadow-sm";
                      } else if (wins > losses) {
                        bgClass = "bg-emerald-600/60 border border-emerald-500/60";
                      } else if (losses > wins) {
                        bgClass = "bg-rose-600/60 border border-rose-500/60";
                      } else {
                        bgClass = "bg-zinc-400 border border-zinc-300 shadow-sm";
                      }
                    }

                    return (
                      <div
                        key={wIdx}
                        onMouseEnter={() => day && setHoveredDay(day)}
                        onMouseLeave={() => setHoveredDay(null)}
                        className={`aspect-square w-full rounded-[4px] cursor-pointer transition-transform hover:scale-125 ${bgClass}`}
                        title={
                          day
                            ? `${day.date}: ${games} игр (${wins}W - ${losses}L)`
                            : ""
                        }
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hover info tooltip bar */}
      <div className="pt-2 border-t border-zinc-800/80 text-[11px] font-mono min-h-[24px] text-center">
        {hoveredDay ? (
          <span className="text-zinc-300">
            <strong className="text-zinc-100">{hoveredDay.date}</strong>:{" "}
            {hoveredDay.games > 0 ? (
              <>
                <span className="text-zinc-200 font-bold">{hoveredDay.games}</span> игр (
                <span className="text-emerald-400 font-bold">{hoveredDay.wins}W</span> -{" "}
                <span className="text-rose-400 font-bold">{hoveredDay.losses}L</span>)
              </>
            ) : (
              <span className="text-zinc-500">0 сыгранных матчей</span>
            )}
          </span>
        ) : (
          <div className="flex items-center justify-center gap-3 text-[10px] text-zinc-500">
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-[2px] bg-emerald-500/80" /> Победы
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-[2px] bg-zinc-400" /> 50%
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-[2px] bg-rose-500/80" /> Поражения
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 5. Full Statistics All Time Table ─────────────────────────────
export function buildActivityGridFromMatches(
  matches: Array<{ start_time: number; won: boolean }>
): ActivityDay[] {
  const now = new Date();
  const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - (14 * 7 - 1) - endDate.getDay());

  const dayStats = new Map<string, { games: number; wins: number; losses: number }>();
  for (const m of matches) {
    if (!m.start_time) continue;
    const d = new Date(m.start_time * 1000);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const cur = dayStats.get(key) || { games: 0, wins: 0, losses: 0 };
    cur.games++;
    if (m.won) cur.wins++;
    else cur.losses++;
    dayStats.set(key, cur);
  }

  const grid: ActivityDay[] = [];
  const curDate = new Date(startDate);
  for (let w = 0; w < 14; w++) {
    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
      const key = `${curDate.getFullYear()}-${String(curDate.getMonth() + 1).padStart(2, "0")}-${String(curDate.getDate()).padStart(2, "0")}`;
      const stat = dayStats.get(key) || { games: 0, wins: 0, losses: 0 };
      const dateStr = curDate.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
      grid.push({
        date: dateStr,
        dayOfWeek,
        weekIndex: w,
        games: stat.games,
        wins: stat.wins,
        losses: stat.losses,
      });
      curDate.setDate(curDate.getDate() + 1);
    }
  }
  return grid;
}

// ── 5. Full Stats Summary Table (Authentic Dota 2 Breakdown) ──────
export function FullStatsSummaryTable({
  counts,
  allMatches = [],
  totalMatches = 0,
  winrate = 50.0,
  onMoreClick,
}: {
  counts?: OpenDotaPlayerCounts | null;
  allMatches?: any[];
  totalMatches?: number;
  winrate?: number;
  onMoreClick?: () => void;
}) {
  const recorded = totalMatches > 0 ? totalMatches : allMatches.length;
  const recordedWr = winrate;
  const abandoned = (counts?.leaver_status?.["1"]?.games || 0) + (counts?.leaver_status?.["2"]?.games || 0) + (counts?.leaver_status?.["3"]?.games || 0);

  // Ranked
  const rankedFromCounts = counts?.lobby_type?.["7"];
  const rankedMatches = allMatches.filter((m) => m.lobby_type === 7);
  const ranked = rankedFromCounts?.games ?? rankedMatches.length;
  const rankedWins = rankedFromCounts?.win ?? rankedMatches.filter((m) => m.won).length;
  const rankedWr = ranked > 0 ? (rankedWins / ranked) * 100 : 0;

  // Normal / Unranked
  const normalFromCounts = counts?.lobby_type?.["0"];
  const normalMatches = allMatches.filter((m) => m.lobby_type === 0);
  const normal = normalFromCounts?.games ?? normalMatches.length;
  const normalWins = normalFromCounts?.win ?? normalMatches.filter((m) => m.won).length;
  const normalWr = normal > 0 ? (normalWins / normal) * 100 : 0;

  // All Pick
  const apFromCounts = (counts?.game_mode?.["1"]?.games || 0) + (counts?.game_mode?.["22"]?.games || 0);
  const apWinsFromCounts = (counts?.game_mode?.["1"]?.win || 0) + (counts?.game_mode?.["22"]?.win || 0);
  const apMatches = allMatches.filter((m) => m.game_mode === 1 || m.game_mode === 22);
  const allPick = apFromCounts > 0 ? apFromCounts : apMatches.length;
  const allPickWins = apWinsFromCounts || apMatches.filter((m) => m.won).length;
  const allPickWr = allPick > 0 ? (allPickWins / allPick) * 100 : 0;

  // Other modes (Turbo, Single Draft, etc.)
  const otherMatches = allMatches.filter((m) => m.game_mode !== 1 && m.game_mode !== 22);
  const otherWins = otherMatches.filter((m) => m.won).length;
  const otherModes = otherMatches.length > 0 ? otherMatches.length : Math.max(0, recorded - allPick);
  const otherModesWr = otherMatches.length > 0 ? (otherWins / otherMatches.length) * 100 : recordedWr;

  // Dire & Radiant
  const direGames = counts?.is_radiant?.["0"]?.games ?? allMatches.filter((m) => !m.isRadiant).length;
  const direWins = counts?.is_radiant?.["0"]?.win ?? allMatches.filter((m) => !m.isRadiant && m.won).length;
  const direWr = direGames > 0 ? (direWins / direGames) * 100 : 0;

  const radiantGames = counts?.is_radiant?.["1"]?.games ?? allMatches.filter((m) => m.isRadiant).length;
  const radiantWins = counts?.is_radiant?.["1"]?.win ?? allMatches.filter((m) => m.isRadiant && m.won).length;
  const radiantWr = radiantGames > 0 ? (radiantWins / radiantGames) * 100 : 0;

  const rows = [
    {
      category: "Обзор",
      items: [
        { label: "Все публичные матчи", matches: recorded, wr: recordedWr },
        { label: "Покинутые игры", matches: abandoned, wr: 0 },
      ],
    },
    {
      category: "Тип лобби",
      items: [
        { label: "Рейтинговые матчи", matches: ranked, wr: rankedWr },
        { label: "Обычные матчи", matches: normal, wr: normalWr },
      ],
    },
    {
      category: "Режим игры",
      items: [
        { label: "All Pick", matches: allPick, wr: allPickWr },
        { label: "Другие режимы", matches: otherModes, wr: otherModesWr },
      ],
    },
    {
      category: "Сторона",
      items: [
        { label: "Силы Тьмы (Dire)", matches: direGames, wr: direWr },
        { label: "Силы Света (Radiant)", matches: radiantGames, wr: radiantWr },
      ],
    },
  ];

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-xl p-5 sm:p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-200">
            ПОЛНАЯ СТАТИСТИКА
          </span>
          <span className="text-[10px] text-zinc-500 uppercase tracking-tight font-mono">
            ЗА ВСЁ ВРЕМЯ
          </span>
        </div>
        {onMoreClick && (
          <button
            onClick={onMoreClick}
            className="text-[11px] font-medium text-zinc-400 hover:text-zinc-200 transition cursor-pointer flex items-center gap-0.5 uppercase"
          >
            Матчи →
          </button>
        )}
      </div>

      <div className="space-y-3 text-xs">
        {rows.map((sec, sIdx) => (
          <div key={sIdx} className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-medium text-zinc-400 uppercase tracking-wide border-b border-zinc-800/60 pb-1">
              <span>{sec.category}</span>
              <div className="flex items-center gap-6 font-mono text-[10px] text-zinc-500">
                <span className="w-12 text-right">Матчи</span>
                <span className="w-16 text-right">Доля побед</span>
              </div>
            </div>

            <div className="space-y-1">
              {sec.items.map((it, iIdx) => (
                <div
                  key={iIdx}
                  className="flex items-center justify-between py-1 text-zinc-300 hover:bg-zinc-800/40 px-1 rounded transition"
                >
                  <span className="text-xs text-zinc-300 truncate max-w-[140px]">
                    {it.label}
                  </span>

                  <div className="flex items-center gap-6 font-mono text-xs">
                    <span className="w-12 text-right font-medium text-zinc-100">
                      {it.matches.toLocaleString()}
                    </span>

                    <div className="w-16 text-right flex flex-col items-end">
                      <span
                        className={`font-semibold ${
                          it.wr >= 50 ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {it.wr.toFixed(2)}%
                      </span>
                      <div className="w-12 h-0.5 rounded-full bg-zinc-800 overflow-hidden mt-0.5">
                        <div
                          className={`h-full ${
                            it.wr >= 50 ? "bg-emerald-500/80" : "bg-rose-500/80"
                          }`}
                          style={{ width: `${Math.min(100, it.wr)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 6. Account Summary Card ─────────────────────────────────────
export function StratzHighlightsCard({
  totalMatches = 0,
  winrate = 50.0,
  rankedCount = 0,
  turboCount = 0,
  abandonedCount = 0,
  earliestMatchTs,
}: {
  totalMatches?: number;
  winrate?: number;
  rankedCount?: number;
  turboCount?: number;
  abandonedCount?: number;
  earliestMatchTs?: number;
}) {
  const wrStr = winrate ? winrate.toFixed(2) : "0.00";
  const firstMatch = earliestMatchTs
    ? new Date(earliestMatchTs * 1000).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" })
    : "Неизвестно";

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-xl p-5 sm:p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="size-6 rounded-lg bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-zinc-300">
            <Compass className="size-3.5" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-zinc-100">
            Сводка профиля
          </span>
        </div>
        <span className="text-[11px] text-zinc-500 font-mono">Подтверждённые данные</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-3 space-y-0.5">
          <div className="text-[10px] text-zinc-400 uppercase font-medium">
            Всего матчей
          </div>
          <div className="text-xl font-bold font-mono text-zinc-100">
            {totalMatches.toLocaleString()}
          </div>
          <div className="text-[9px] text-zinc-500">{rankedCount > 0 ? `${rankedCount.toLocaleString()} рейт.` : "Публичные матчи"}</div>
        </div>

        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-3 space-y-0.5">
          <div className="text-[10px] text-zinc-400 uppercase font-medium">
            Общий винрейт
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400">
            {wrStr}%
          </div>
          <div className="text-[9px] text-zinc-500">{turboCount > 0 ? `${turboCount.toLocaleString()} Турбо` : "Все режимы"}</div>
        </div>
      </div>

      <div className="rounded-xl bg-zinc-900/40 border border-zinc-800/80 p-2.5 flex items-center justify-between text-[11px] font-mono">
        <span className="text-zinc-400">Первый записанный матч:</span>
        <span className="text-zinc-200 font-semibold">{firstMatch}</span>
      </div>
    </div>
  );
}
