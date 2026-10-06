"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Swords, Shield, Zap, Sparkles, Filter, ChevronRight, Activity, Flame } from "lucide-react";
import {
  type MatchPlayerDetail,
  type OpenDotaHero,
  heroIconUrl,
  computeDamageBreakdown,
} from "@/lib/opendota";
import { getAbilityDname, getAbilityIconUrl } from "@/lib/ability-utils";
import { resolveItemKey } from "@/lib/item-utils";
import { getPlayerSlotInfo } from "@/lib/positions";

interface DamageBreakdownViewProps {
  players: MatchPlayerDetail[];
  heroes: OpenDotaHero[];
}

export function DamageBreakdownView({
  players,
  heroes,
}: DamageBreakdownViewProps) {
  const sortedPlayers = useMemo(
    () => [...players].sort((a, b) => a.player_slot - b.player_slot),
    [players]
  );
  const [selectedSlot, setSelectedSlot] = useState<number>(sortedPlayers[0]?.player_slot ?? 0);
  const [teamFilter, setTeamFilter] = useState<"all" | "radiant" | "dire">("all");

  const heroMap = useMemo(() => new Map(heroes.map((h) => [h.id, h])), [heroes]);

  const radiantPlayers = useMemo(
    () => [...players.filter((p) => p.isRadiant)].sort((a, b) => a.player_slot - b.player_slot),
    [players]
  );
  const direPlayers = useMemo(
    () => [...players.filter((p) => !p.isRadiant)].sort((a, b) => a.player_slot - b.player_slot),
    [players]
  );

  const totalRadiantDmg = useMemo(
    () => radiantPlayers.reduce((a, b) => a + (b.hero_damage || 0), 0),
    [radiantPlayers]
  );
  const totalDireDmg = useMemo(
    () => direPlayers.reduce((a, b) => a + (b.hero_damage || 0), 0),
    [direPlayers]
  );
  const maxHeroDmg = useMemo(
    () => Math.max(1, ...players.map((p) => p.hero_damage || 0)),
    [players]
  );

  const selectedPlayer = useMemo(
    () => players.find((p) => p.player_slot === selectedSlot) || players[0],
    [players, selectedSlot]
  );

  const selectedHero = selectedPlayer ? heroMap.get(selectedPlayer.hero_id) : null;

  // Selected player's damage breakdown
  const damageTypeStats = useMemo(() => {
    if (!selectedPlayer) return { physical: 0, magical: 0, pure: 0, total: 1 };

    const breakdown =
      selectedPlayer.damage_breakdown ||
      computeDamageBreakdown(selectedPlayer.hero_damage || 0, selectedPlayer.damage_inflictor);
    const phys = breakdown.physical;
    const mag = breakdown.magical;
    const pure = breakdown.pure;
    const total = Math.max(1, phys + mag + pure);

    return {
      physical: phys,
      magical: mag,
      pure,
      total,
      physPct: Math.round((phys / total) * 100),
      magPct: Math.round((mag / total) * 100),
      purePct: Math.round((pure / total) * 100),
    };
  }, [selectedPlayer]);

  // Selected player's top damage sources (inflictors)
  const topInflictors = useMemo(() => {
    if (!selectedPlayer?.damage_inflictor) return [];

    const list: { name: string; dname: string; iconUrl: string | null; damage: number; isAttack: boolean; isItem: boolean }[] = [];

    for (const [key, dmg] of Object.entries(selectedPlayer.damage_inflictor)) {
      const val = Number(dmg) || 0;
      if (val <= 0) continue;

      const isAttack = key === "null" || key === "" || key.includes("attack");
      const isItem = key.startsWith("item_");

      let dname = "Обычные атаки (с руки)";
      let iconUrl: string | null = null;

      if (isAttack) {
        dname = "Обычные атаки";
        iconUrl = null;
      } else if (isItem) {
        const it = resolveItemKey(key);
        dname = it.name;
        iconUrl = it.icon;
      } else {
        dname = getAbilityDname(key);
        iconUrl = getAbilityIconUrl(key);
      }

      list.push({
        name: key,
        dname,
        iconUrl,
        damage: val,
        isAttack,
        isItem,
      });
    }

    return list.sort((a, b) => b.damage - a.damage);
  }, [selectedPlayer]);

  // Selected player's targets (who was damaged)
  const targetEnemies = useMemo(() => {
    if (!selectedPlayer?.damage_targets) return [];

    const map: Record<string, number> = {};

    for (const [, heroHits] of Object.entries(selectedPlayer.damage_targets)) {
      if (typeof heroHits === "object" && heroHits !== null) {
        for (const [enemySlug, amt] of Object.entries(heroHits)) {
          const val = Number(amt) || 0;
          map[enemySlug] = (map[enemySlug] || 0) + val;
        }
      }
    }

    const enemyList: { slug: string; heroName: string; iconUrl: string; damage: number }[] = [];
    for (const [slug, totalDmg] of Object.entries(map)) {
      const cleanSlug = slug.replace("npc_dota_hero_", "");
      const matchedHero = heroes.find(
        (h) => h.name === slug || h.name.replace("npc_dota_hero_", "") === cleanSlug
      );

      enemyList.push({
        slug,
        heroName: matchedHero?.localized_name || cleanSlug,
        iconUrl: heroIconUrl(slug),
        damage: totalDmg,
      });
    }

    return enemyList.sort((a, b) => b.damage - a.damage);
  }, [selectedPlayer, heroes]);

  return (
    <div className="space-y-6">
      {/* ── Team Comparison Banner ────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Radiant Banner */}
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/10 p-4 backdrop-blur-md space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-400" /> Силы Света (The Radiant)
            </span>
            <span className="text-sm font-mono font-bold text-white">
              {totalRadiantDmg.toLocaleString()} урона
            </span>
          </div>
          <div className="h-2 rounded-full bg-zinc-800 overflow-hidden flex">
            <div
              className="bg-emerald-500 transition-all duration-500"
              style={{
                width: `${Math.round((totalRadiantDmg / Math.max(1, totalRadiantDmg + totalDireDmg)) * 100)}%`,
              }}
            />
          </div>
          <div className="text-[10px] text-zinc-400 flex justify-between font-mono">
            <span>Доля команды в матче</span>
            <span className="text-emerald-400 font-bold">
              {Math.round((totalRadiantDmg / Math.max(1, totalRadiantDmg + totalDireDmg)) * 100)}%
            </span>
          </div>
        </div>

        {/* Dire Banner */}
        <div className="rounded-2xl border border-rose-500/20 bg-rose-950/10 p-4 backdrop-blur-md space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-rose-400" /> Силы Тьмы (The Dire)
            </span>
            <span className="text-sm font-mono font-bold text-white">
              {totalDireDmg.toLocaleString()} урона
            </span>
          </div>
          <div className="h-2 rounded-full bg-zinc-800 overflow-hidden flex">
            <div
              className="bg-rose-500 transition-all duration-500"
              style={{
                width: `${Math.round((totalDireDmg / Math.max(1, totalRadiantDmg + totalDireDmg)) * 100)}%`,
              }}
            />
          </div>
          <div className="text-[10px] text-zinc-400 flex justify-between font-mono">
            <span>Доля команды в матче</span>
            <span className="text-rose-400 font-bold">
              {Math.round((totalDireDmg / Math.max(1, totalRadiantDmg + totalDireDmg)) * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* ── Player Quick-Selector Tabs ────────────────────────── */}
      <div className="space-y-2">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
          Выберите игрока для детального анализа урона:
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {sortedPlayers.map((p) => {
            const h = heroMap.get(p.hero_id);
            const isSelected = p.player_slot === selectedSlot;
            const dmgPct = Math.round(((p.hero_damage || 0) / maxHeroDmg) * 100);
            const slotInfo = getPlayerSlotInfo(p.player_slot);

            return (
              <button
                key={p.player_slot}
                onClick={() => setSelectedSlot(p.player_slot)}
                className={`flex items-center gap-2.5 p-2 rounded-xl border text-left transition cursor-pointer relative ${
                  isSelected
                    ? "bg-zinc-800 border-zinc-600 shadow-md ring-1 ring-amber-400/40"
                    : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-850"
                }`}
              >
                <div
                  className="absolute top-0 inset-x-2 h-0.5 rounded-full"
                  style={{ backgroundColor: slotInfo.color }}
                />
                <div className="relative size-8 rounded-lg overflow-hidden border border-zinc-700 shrink-0">
                  {h && <img src={heroIconUrl(h.name)} alt="" className="size-full object-cover" />}
                  <span
                    className="absolute bottom-0 right-0 px-0.5 text-[8px] font-bold text-white leading-none rounded-tl"
                    style={{ backgroundColor: slotInfo.color }}
                  >
                    #{slotInfo.slotNumber}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-bold text-white truncate">
                    {p.personaname || h?.localized_name}
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className={p.isRadiant ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                      {(p.hero_damage || 0).toLocaleString()}
                    </span>
                    <span className="text-zinc-500">{dmgPct}%</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Detailed Combat Inspector for Selected Hero ──────── */}
      {selectedPlayer && (
        <div className="rounded-3xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-md p-5 sm:p-6 shadow-xl space-y-6">
          {/* Hero Profile Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/60">
            <div className="flex items-center gap-3.5">
              <div className="size-14 rounded-2xl overflow-hidden border border-zinc-700 shrink-0 shadow-lg">
                {selectedHero && (
                  <img src={heroIconUrl(selectedHero.name)} alt="" className="size-full object-cover" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded text-white shadow-sm"
                    style={{ backgroundColor: getPlayerSlotInfo(selectedPlayer.player_slot).color }}
                  >
                    #{getPlayerSlotInfo(selectedPlayer.player_slot).slotNumber}
                  </span>
                  <span className="text-base font-bold text-white">
                    {selectedPlayer.personaname || selectedHero?.localized_name}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      selectedPlayer.isRadiant
                        ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-300 border-rose-500/20"
                    }`}
                  >
                    {selectedPlayer.isRadiant ? "Силы Света" : "Силы Тьмы"}
                  </span>
                </div>
                <div className="text-xs text-zinc-400 flex items-center gap-2 mt-0.5">
                  <span>{selectedHero?.localized_name}</span>
                  <span>•</span>
                  <span>Уровень {selectedPlayer.level}</span>
                  <span>•</span>
                  <span className="text-amber-400 font-mono">
                    {selectedPlayer.kills}K / {selectedPlayer.deaths}D / {selectedPlayer.assists}A
                  </span>
                </div>
              </div>
            </div>

            {/* Total Hero Damage Headline */}
            <div className="text-left sm:text-right">
              <div className="text-xs text-zinc-400 font-medium">Суммарный урон по героям</div>
              <div className="text-2xl font-black font-mono text-white tracking-tight">
                {(selectedPlayer.hero_damage || 0).toLocaleString()}
              </div>
            </div>
          </div>

          {/* 3-Type Damage Breakdown (Physical, Magical, Pure) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-zinc-300">Распределение типов нанесенного урона</span>
              <span className="text-zinc-500 font-mono">100% урона</span>
            </div>

            {/* Tri-color progress bar */}
            <div className="h-4 rounded-xl bg-zinc-950 overflow-hidden flex border border-zinc-800 p-0.5 gap-0.5">
              <div
                className="bg-amber-500 rounded-l-lg transition-all"
                style={{ width: `${damageTypeStats.physPct}%` }}
                title={`Физический: ${damageTypeStats.physical.toLocaleString()} (${damageTypeStats.physPct}%)`}
              />
              <div
                className="bg-sky-500 transition-all"
                style={{ width: `${damageTypeStats.magPct}%` }}
                title={`Магический: ${damageTypeStats.magical.toLocaleString()} (${damageTypeStats.magPct}%)`}
              />
              <div
                className="bg-purple-500 rounded-r-lg transition-all"
                style={{ width: `${damageTypeStats.purePct}%` }}
                title={`Чистый: ${damageTypeStats.pure.toLocaleString()} (${damageTypeStats.purePct}%)`}
              />
            </div>

            {/* Legend Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-amber-500/20 bg-amber-950/10 p-3 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-amber-400" /> Физический урон
                  </div>
                  <div className="text-xs text-zinc-400">Атаки и физ. скиллы</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold font-mono text-white">
                    {damageTypeStats.physical.toLocaleString()}
                  </div>
                  <div className="text-[10px] font-mono text-amber-300 font-semibold">
                    {damageTypeStats.physPct}%
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-sky-500/20 bg-sky-950/10 p-3 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold text-sky-400 flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-sky-400" /> Магический урон
                  </div>
                  <div className="text-xs text-zinc-400">Заклинания и артефакты</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold font-mono text-white">
                    {damageTypeStats.magical.toLocaleString()}
                  </div>
                  <div className="text-[10px] font-mono text-sky-300 font-semibold">
                    {damageTypeStats.magPct}%
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-purple-500/20 bg-purple-950/10 p-3 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold text-purple-400 flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-purple-400" /> Чистый урон
                  </div>
                  <div className="text-xs text-zinc-400">Игнорирует броню и резист</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold font-mono text-white">
                    {damageTypeStats.pure.toLocaleString()}
                  </div>
                  <div className="text-[10px] font-mono text-purple-300 font-semibold">
                    {damageTypeStats.purePct}%
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Sub-sections: Top Inflictors vs Targets ─────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-zinc-800/60">
            {/* Left: Sources of Damage (Abilities & Attacks) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Swords className="size-3.5 text-amber-400" /> Источники урона (Скиллы и атаки)
                </span>
                <span className="text-[10px] font-mono text-zinc-500">Урон / %</span>
              </div>

              {topInflictors.length === 0 ? (
                <div className="py-6 text-center text-xs text-zinc-500 font-mono">
                  Детализация по источникам урона появится после парсинга реплея
                </div>
              ) : (
                <div className="space-y-2">
                  {topInflictors.map((inf, idx) => {
                    const pct = Math.min(
                      100,
                      Math.round((inf.damage / Math.max(1, selectedPlayer.hero_damage || 1)) * 100)
                    );

                    return (
                      <div
                        key={idx}
                        className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-2.5 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="size-7 rounded-lg overflow-hidden border border-zinc-700 bg-zinc-900 shrink-0 flex items-center justify-center">
                              {inf.iconUrl ? (
                                <img
                                  src={inf.iconUrl}
                                  alt=""
                                  className="size-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = "none";
                                  }}
                                />
                              ) : (
                                <Swords className="size-3.5 text-zinc-400" />
                              )}
                            </div>
                            <span className="text-xs font-semibold text-zinc-200 truncate">
                              {inf.dname}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 font-mono text-xs">
                            <span className="font-bold text-white">
                              {inf.damage.toLocaleString()}
                            </span>
                            <span className="text-[10px] text-zinc-500 w-8 text-right">
                              {pct}%
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-red-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right: Enemy Targets (Who Received Damage) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Flame className="size-3.5 text-rose-400" /> Урон по вражеским героям
                </span>
                <span className="text-[10px] font-mono text-zinc-500">Урон / %</span>
              </div>

              {targetEnemies.length === 0 ? (
                <div className="py-6 text-center text-xs text-zinc-500 font-mono">
                  Детализация по целям урона появится после парсинга реплея
                </div>
              ) : (
                <div className="space-y-2">
                  {targetEnemies.map((tgt, idx) => {
                    const pct = Math.min(
                      100,
                      Math.round((tgt.damage / Math.max(1, selectedPlayer.hero_damage || 1)) * 100)
                    );

                    return (
                      <div
                        key={idx}
                        className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-2.5 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="size-7 rounded-lg overflow-hidden border border-zinc-700 shrink-0">
                              <img src={tgt.iconUrl} alt="" className="size-full object-cover" />
                            </div>
                            <span className="text-xs font-semibold text-zinc-200 truncate">
                              {tgt.heroName}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 font-mono text-xs">
                            <span className="font-bold text-rose-300">
                              {tgt.damage.toLocaleString()}
                            </span>
                            <span className="text-[10px] text-zinc-500 w-8 text-right">
                              {pct}%
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-rose-500 to-pink-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Additional Combat Metrics Cards ────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-zinc-800/60">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3 space-y-1">
              <span className="text-[10px] text-zinc-400 font-medium">Урон по вышкам</span>
              <div className="text-sm font-bold font-mono text-white">
                {(selectedPlayer.tower_damage || 0).toLocaleString()}
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3 space-y-1">
              <span className="text-[10px] text-zinc-400 font-medium">Полученный урон</span>
              <div className="text-sm font-bold font-mono text-white">
                {selectedPlayer.damage_taken ? selectedPlayer.damage_taken.toLocaleString() : "—"}
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3 space-y-1">
              <span className="text-[10px] text-zinc-400 font-medium">Длительность станов</span>
              <div className="text-sm font-bold font-mono text-amber-400">
                {selectedPlayer.stuns ? `${selectedPlayer.stuns} сек.` : "0 сек."}
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3 space-y-1">
              <span className="text-[10px] text-zinc-400 font-medium">Исцеление союзников</span>
              <div className="text-sm font-bold font-mono text-emerald-400">
                {(selectedPlayer.hero_healing || 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
