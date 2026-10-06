"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Zap, Sparkles, Filter, ChevronRight } from "lucide-react";
import {
  type MatchPlayerDetail,
  type OpenDotaHero,
  heroIconUrl,
} from "@/lib/opendota";
import {
  getHeroAbilities,
  getAbilityIconUrl,
  getAbilityDname,
} from "@/lib/ability-utils";
import abilityIdsData from "@/lib/constants/ability_ids.json";
import { getPlayerSlotInfo } from "@/lib/positions";

const abilityIdsMap = abilityIdsData as Record<string, string>;

interface SkillMatrixViewProps {
  players: MatchPlayerDetail[];
  heroes: OpenDotaHero[];
}

export function SkillMatrixView({
  players,
  heroes,
}: SkillMatrixViewProps) {
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

  return (
    <div className="space-y-6">
      {/* ── Filter Bar ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-md">
        <div className="flex items-center gap-1 bg-zinc-950/60 p-1 rounded-xl border border-zinc-800/80">
          <button
            onClick={() => setTeamFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              teamFilter === "all"
                ? "bg-zinc-800 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Все герои (10)
          </button>
          <button
            onClick={() => setTeamFilter("radiant")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              teamFilter === "radiant"
                ? "bg-emerald-950/50 text-emerald-300 border border-emerald-500/30"
                : "text-zinc-400 hover:text-emerald-400"
            }`}
          >
            <span className="size-1.5 rounded-full bg-emerald-400" /> Силы Света
          </button>
          <button
            onClick={() => setTeamFilter("dire")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              teamFilter === "dire"
                ? "bg-rose-950/50 text-rose-300 border border-rose-500/30"
                : "text-zinc-400 hover:text-rose-400"
            }`}
          >
            <span className="size-1.5 rounded-full bg-rose-400" /> Силы Тьмы
          </button>
        </div>

        <div className="text-[11px] font-mono text-zinc-400 flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-amber-400 inline-block" /> Таланты
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-sky-400 inline-block" /> Ультимейты
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-400 inline-block" /> Скиллы
          </span>
        </div>
      </div>

      {/* ── Heroes Skill Build Cards ──────────────────────────── */}
      <div className="space-y-4">
        {filteredPlayers.map((p) => {
          const hero = heroMap.get(p.hero_id);
          const rawUpgrades = p.ability_upgrades_arr || [];
          const abilities = hero ? getHeroAbilities(hero.name) : [];

          // Resolve each upgrade in order
          const skillEvents = rawUpgrades.map((val, idx) => {
            const levelNum = idx + 1;
            const rawId = typeof val === "number" ? String(val) : String(val);
            const abilitySlug = abilityIdsMap[rawId] || `ability_${rawId}`;
            const isTalent = abilitySlug.startsWith("special_bonus_") || abilitySlug === "talent";
            const isAttribute = rawId === "730" || abilitySlug.includes("attributes");
            const dname = isAttribute 
              ? "+2 ко всем атрибутам" 
              : isTalent 
              ? getAbilityDname(abilitySlug).replace(/\+?\{s:.*?\}/g, "").trim() || "Ветка талантов" 
              : getAbilityDname(abilitySlug);
            const iconUrl = getAbilityIconUrl(abilitySlug);

            return {
              levelNum,
              abilitySlug,
              isTalent,
              isAttribute,
              dname,
              iconUrl,
            };
          });

          return (
            <div
              key={p.player_slot}
              className={`rounded-2xl border bg-zinc-900/40 backdrop-blur-md p-4 transition shadow-md hover:border-zinc-700 ${
                p.isRadiant
                  ? "border-zinc-800/90 hover:shadow-emerald-950/20"
                  : "border-zinc-800/90 hover:shadow-rose-950/20"
              }`}
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/60">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl overflow-hidden border border-zinc-700 shrink-0">
                    {hero ? (
                      <img
                        src={heroIconUrl(hero.name)}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      <div className="size-full bg-zinc-800" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded text-white shadow-sm"
                        style={{ backgroundColor: getPlayerSlotInfo(p.player_slot).color }}
                      >
                        #{getPlayerSlotInfo(p.player_slot).slotNumber}
                      </span>
                      <span className="text-xs font-bold text-white">
                        {p.personaname || hero?.localized_name}
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
                    <div className="text-[11px] text-zinc-400">
                      {hero?.localized_name ?? "Герой"} • Уровень {p.level}
                    </div>
                  </div>
                </div>

                <div className="text-[11px] font-mono text-zinc-400">
                  Прокачано способностей: <strong className="text-white">{skillEvents.length}</strong>
                </div>
              </div>

              {/* Skill Matrix Sequence */}
              <div className="pt-3">
                {skillEvents.length === 0 ? (
                  <div className="py-4 text-center text-xs text-zinc-500 font-mono">
                    Данные о прокачке скиллов не найдены в реплее (матч еще не распарсен)
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Linear level-by-level badge progression */}
                    <div className="flex items-stretch gap-1.5 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-zinc-800">
                      {skillEvents.map((ev, idx) => (
                        <div
                          key={idx}
                          className="flex flex-col items-center gap-1 shrink-0 group/skill relative"
                        >
                          {/* Level badge */}
                          <span className="text-[9px] font-mono font-bold text-zinc-500 group-hover/skill:text-amber-400 transition">
                            {ev.levelNum}
                          </span>

                          {/* Skill Square */}
                          <div
                            className={`size-8 rounded-lg border overflow-hidden shrink-0 flex items-center justify-center transition shadow-sm group-hover/skill:scale-110 group-hover/skill:z-10 ${
                              ev.isTalent
                                ? "bg-amber-950/40 border-amber-500/50 shadow-amber-950/30"
                                : ev.isAttribute
                                ? "bg-zinc-800 border-zinc-700"
                                : "bg-zinc-950 border-zinc-700"
                            }`}
                            title={`Уровень ${ev.levelNum}: ${ev.dname}`}
                          >
                            {ev.isTalent ? (
                              <div className="text-amber-400 font-bold text-xs select-none">
                                🌳
                              </div>
                            ) : ev.isAttribute ? (
                              <div className="text-zinc-400 font-bold text-[10px] select-none">
                                +2
                              </div>
                            ) : (
                              <img
                                src={ev.iconUrl}
                                alt={ev.dname}
                                className="size-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = "none";
                                }}
                              />
                            )}
                          </div>

                          {/* Tooltip on hover */}
                          <div className="opacity-0 group-hover/skill:opacity-100 pointer-events-none absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 z-30 px-2 py-1 rounded-lg bg-zinc-950 border border-zinc-700 text-[10px] text-white whitespace-nowrap shadow-xl transition-opacity">
                            <span className="font-bold text-amber-400">Ур. {ev.levelNum}:</span> {ev.dname}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Quick Ability Summary List */}
                    <div className="pt-2 border-t border-zinc-800/40 flex flex-wrap items-center gap-3">
                      {abilities.map((ab, aIdx) => {
                        const timesUpgraded = skillEvents.filter(
                          (ev) => ev.abilitySlug === ab.name
                        ).length;

                        return (
                          <div
                            key={aIdx}
                            className="flex items-center gap-2 rounded-xl bg-zinc-950/60 border border-zinc-800/60 px-2.5 py-1"
                          >
                            <div className="size-6 rounded-md overflow-hidden border border-zinc-700 shrink-0">
                              <img
                                src={ab.iconUrl}
                                alt={ab.dname}
                                className="size-full object-cover"
                              />
                            </div>
                            <span className="text-[11px] font-medium text-zinc-300">
                              {ab.dname}
                            </span>
                            <span
                              className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                                timesUpgraded > 0
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                  : "text-zinc-600"
                              }`}
                            >
                              x{timesUpgraded}
                            </span>
                          </div>
                        );
                      })}
                    </div>
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
