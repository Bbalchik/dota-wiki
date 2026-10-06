"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Clock, Filter, Sparkles, TrendingUp, ChevronRight } from "lucide-react";
import {
  type MatchPlayerDetail,
  type OpenDotaHero,
  heroIconUrl,
} from "@/lib/opendota";
import { resolveItemKey, type ResolvedItem } from "@/lib/item-utils";
import { getPlayerSlotInfo } from "@/lib/positions";

interface ItemTimingsViewProps {
  players: MatchPlayerDetail[];
  heroes: OpenDotaHero[];
  matchDuration: number;
}

const CONSUMABLE_SLUGS = new Set([
  "tango", "clarity", "flask", "faerie_fire", "blood_grenade", "enchanted_mango",
  "ward_observer", "ward_sentry", "smoke_of_deceit", "tpscroll", "dust", "gem",
  "bottle", "infused_raindrop"
]);

function fmtGameTime(sec: number): string {
  const sign = sec < 0 ? "-" : "";
  const abs = Math.abs(sec);
  const m = Math.floor(abs / 60);
  const s = abs % 60;
  return `${sign}${m}:${s.toString().padStart(2, "0")}`;
}

export function ItemTimingsView({
  players,
  heroes,
  matchDuration,
}: ItemTimingsViewProps) {
  const [filterMode, setFilterMode] = useState<"core" | "all" | "major">("core");
  const [teamFilter, setTeamFilter] = useState<"all" | "radiant" | "dire">("all");
  const [selectedHeroId, setSelectedHeroId] = useState<number | null>(null);

  const heroMap = useMemo(() => new Map(heroes.map((h) => [h.id, h])), [heroes]);

  const filteredPlayers = useMemo(() => {
    return [...players]
      .sort((a, b) => a.player_slot - b.player_slot)
      .filter((p) => {
        if (teamFilter === "radiant" && !p.isRadiant) return false;
        if (teamFilter === "dire" && p.isRadiant) return false;
        if (selectedHeroId !== null && p.hero_id !== selectedHeroId) return false;
        return true;
      });
  }, [players, teamFilter, selectedHeroId]);

  // Pre-process purchase timelines
  const playerTimelines = useMemo(() => {
    return filteredPlayers.map((p) => {
      const hero = heroMap.get(p.hero_id);
      const rawLog = p.purchase_log || [];

      const parsedItems = rawLog
        .map((entry) => {
          const item = resolveItemKey(entry.key);
          const isConsumable = CONSUMABLE_SLUGS.has(item.slug);
          const isMajor = item.cost >= 2000;
          const isCore = !isConsumable && (item.cost >= 1000 || item.slug.includes("boots") || item.slug === "magic_wand");
          return {
            time: entry.time,
            item,
            isConsumable,
            isCore,
            isMajor,
          };
        })
        .filter((entry) => {
          if (!entry.item || entry.item.id === 0 && !entry.item.name) return false;
          if (filterMode === "major") return entry.isMajor;
          if (filterMode === "core") return entry.isCore;
          return true;
        });

      return {
        player: p,
        hero,
        items: parsedItems,
        totalItemsCount: rawLog.length,
      };
    });
  }, [filteredPlayers, heroMap, filterMode]);

  // Key early milestones (earliest major items across the match)
  const earlyMilestones = useMemo(() => {
    const list: { heroName: string; heroIcon: string; itemName: string; itemIcon: string | null; time: number; playerSlot: number; isRadiant: boolean }[] = [];
    players.forEach((p) => {
      const hero = heroMap.get(p.hero_id);
      if (!hero || !p.purchase_log) return;

      p.purchase_log.forEach((entry) => {
        if (entry.time <= 0 || entry.time > 1800) return; // First 30 mins
        const item = resolveItemKey(entry.key);
        if (item.cost >= 3500) {
          list.push({
            heroName: hero.localized_name,
            heroIcon: heroIconUrl(hero.name),
            itemName: item.name,
            itemIcon: item.icon,
            time: entry.time,
            playerSlot: p.player_slot,
            isRadiant: p.isRadiant,
          });
        }
      });
    });

    return list.sort((a, b) => a.time - b.time).slice(0, 6);
  }, [players, heroMap]);

  return (
    <div className="space-y-6">
      {/* ── Key Highlights Banner ──────────────────────────── */}
      {earlyMilestones.length > 0 && (
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-4 backdrop-blur-md">
          <div className="flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            <Sparkles className="size-3.5 text-amber-400" />
            <span>Ранние тайминги ключевых артефактов</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {earlyMilestones.map((m, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2.5 rounded-xl border border-zinc-800/60 bg-zinc-950/60 p-2.5 hover:border-zinc-700 transition"
              >
                <div className="size-7 rounded-lg overflow-hidden border border-zinc-700 shrink-0">
                  <img src={m.heroIcon} alt="" className="size-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-bold text-white truncate">{m.itemName}</div>
                  <div className="flex items-center gap-1.5 text-[10px] font-mono">
                    <span className="text-amber-400 font-bold">{fmtGameTime(m.time)}</span>
                    <span className="text-zinc-500">•</span>
                    <span className={m.isRadiant ? "text-emerald-400" : "text-rose-400"}>
                      {m.heroName}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Filters & Controls Bar ─────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-md">
        {/* Team Selector */}
        <div className="flex items-center gap-1 bg-zinc-950/60 p-1 rounded-xl border border-zinc-800/80">
          <button
            onClick={() => setTeamFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              teamFilter === "all"
                ? "bg-zinc-800 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Все (10)
          </button>
          <button
            onClick={() => setTeamFilter("radiant")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              teamFilter === "radiant"
                ? "bg-emerald-950/50 text-emerald-300 border border-emerald-500/30"
                : "text-zinc-400 hover:text-emerald-400"
            }`}
          >
            <span className="size-1.5 rounded-full bg-emerald-400" /> Свет
          </button>
          <button
            onClick={() => setTeamFilter("dire")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              teamFilter === "dire"
                ? "bg-rose-950/50 text-rose-300 border border-rose-500/30"
                : "text-zinc-400 hover:text-rose-400"
            }`}
          >
            <span className="size-1.5 rounded-full bg-rose-400" /> Тьма
          </button>
        </div>

        {/* Item Category Filter */}
        <div className="flex items-center gap-1 bg-zinc-950/60 p-1 rounded-xl border border-zinc-800/80 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setFilterMode("core")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              filterMode === "core"
                ? "bg-zinc-800 text-amber-300 shadow-sm border border-amber-500/20"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            ⚡ Ключевые предметы (Core)
          </button>
          <button
            onClick={() => setFilterMode("major")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              filterMode === "major"
                ? "bg-zinc-800 text-purple-300 shadow-sm border border-purple-500/20"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            💎 Крупные артефакты (&gt;2k)
          </button>
          <button
            onClick={() => setFilterMode("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              filterMode === "all"
                ? "bg-zinc-800 text-white shadow-sm border border-zinc-700"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            📦 Все покупки подряд
          </button>
        </div>
      </div>

      {/* ── Heroes Timelines List ──────────────────────────── */}
      <div className="space-y-4">
        {playerTimelines.map(({ player: p, hero, items }) => {
          return (
            <div
              key={p.player_slot}
              className={`rounded-2xl border bg-zinc-900/40 backdrop-blur-md p-4 transition shadow-md hover:border-zinc-700 ${
                p.isRadiant
                  ? "border-zinc-800/90 hover:shadow-emerald-950/20"
                  : "border-zinc-800/90 hover:shadow-rose-950/20"
              }`}
            >
              {/* Hero Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/60">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative size-10 rounded-xl overflow-hidden border border-zinc-700 shrink-0">
                    {hero ? (
                      <img
                        src={heroIconUrl(hero.name)}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      <div className="size-full bg-zinc-800" />
                    )}
                    <span className="absolute bottom-0 right-0 px-1 rounded-tl bg-zinc-900/90 text-[9px] font-mono font-black text-white">
                      {p.level}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded text-white shadow-sm"
                        style={{ backgroundColor: getPlayerSlotInfo(p.player_slot).color }}
                      >
                        #{getPlayerSlotInfo(p.player_slot).slotNumber}
                      </span>
                      <span className="text-xs font-bold text-white truncate">
                        {p.personaname || hero?.localized_name || "Игрок"}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                          p.isRadiant
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                        }`}
                      >
                        {p.isRadiant ? "Свет" : "Тьма"}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-400 flex items-center gap-2">
                      <span>{hero?.localized_name ?? "Герой"}</span>
                      <span>•</span>
                      <span className="text-amber-400 font-mono font-semibold">
                        🪙 {p.net_worth?.toLocaleString() ?? 0}
                      </span>
                      <span>•</span>
                      <span className="text-zinc-500 font-mono">
                        {p.gold_per_min} GPM
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] font-mono text-zinc-400">
                  Покупок в таймлайне: <strong className="text-white">{items.length}</strong>
                </div>
              </div>

              {/* Items Timeline Scroll */}
              <div className="pt-3">
                {items.length === 0 ? (
                  <div className="py-4 text-center text-xs text-zinc-500 font-mono">
                    Нет покупок, соответствующих выбранному фильтру
                  </div>
                ) : (
                  <div className="flex items-stretch gap-2.5 overflow-x-auto pb-2 pt-1 scrollbar-thin scrollbar-thumb-zinc-800">
                    {items.map((entry, idx) => {
                      const isPreGame = entry.time < 0;
                      return (
                        <div
                          key={idx}
                          className="flex flex-col items-center gap-1.5 shrink-0 group/it relative"
                        >
                          {/* Time badge */}
                          <div
                            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border transition ${
                              isPreGame
                                ? "bg-zinc-800/60 border-zinc-700 text-zinc-400"
                                : entry.item.cost >= 2000
                                ? "bg-amber-500/10 border-amber-500/30 text-amber-300 shadow-sm"
                                : "bg-zinc-950 border-zinc-800 text-zinc-300"
                            }`}
                          >
                            {fmtGameTime(entry.time)}
                          </div>

                          {/* Item Icon */}
                          <div
                            className="size-9 rounded-xl border border-zinc-700/80 bg-zinc-950 overflow-hidden shrink-0 group-hover/it:scale-110 transition shadow-sm"
                            title={`${entry.item.name} (${entry.item.cost} 🪙)`}
                          >
                            {entry.item.icon ? (
                              <img
                                src={entry.item.icon}
                                alt={entry.item.name}
                                className="size-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = "none";
                                }}
                              />
                            ) : (
                              <div className="size-full flex items-center justify-center text-[10px] text-zinc-600">
                                ?
                              </div>
                            )}
                          </div>

                          {/* Item Title & Cost */}
                          <div className="text-center w-16">
                            <div className="text-[10px] font-medium text-zinc-300 truncate group-hover/it:text-white transition">
                              {entry.item.name}
                            </div>
                            {entry.item.cost > 0 && (
                              <div className="text-[9px] font-mono text-zinc-500">
                                {entry.item.cost.toLocaleString()}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
