"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Shield,
  Swords,
  Coins,
  Clock,
  Sparkles,
  Zap,
  Award,
  ChevronRight,
  Flame,
  CheckCircle2,
} from "lucide-react";
import {
  type FullMatchDetails,
  type MatchPlayerDetail,
  type OpenDotaHero,
  heroIconUrl,
  getItemIconUrl,
  getItemName,
} from "@/lib/opendota";
import { resolveItemKey, type ResolvedItem, simulateInventoryAtTime, resolveItemWithStackCount } from "@/lib/item-utils";
import {
  getHeroAbilities,
  getAbilityIconUrl,
  getAbilityDname,
  getAbilityProgression,
} from "@/lib/ability-utils";
import { RankMedal } from "@/components/ui/RankMedal";
import { DotaInventoryHud } from "@/components/ui/DotaInventoryHud";
import { getRankInfo } from "@/lib/ranks";
import { getPlayerSlotInfo } from "@/lib/positions";

interface StratzMatchupHeroCardProps {
  match: FullMatchDetails;
  heroes: OpenDotaHero[];
  selectedSlot: number;
  onSelectSlot: (slot: number) => void;
  onJumpToTimeline?: (minute: number) => void;
}

function fmtSec(sec: number): string {
  const sign = sec < 0 ? "-" : "";
  const abs = Math.abs(sec);
  const m = Math.floor(abs / 60);
  const s = abs % 60;
  return `${sign}${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

const POS_DATA: Record<number, { roman: string; name: string; icon: string; color: string }> = {
  1: { roman: "I", name: "Керри", icon: "⚔️", color: "text-sky-400" },
  2: { roman: "II", name: "Мид", icon: "⚡", color: "text-purple-400" },
  3: { roman: "III", name: "Оффлейн", icon: "🛡️", color: "text-amber-400" },
  4: { roman: "IV", name: "Поддержка", icon: "🌱", color: "text-emerald-400" },
  5: { roman: "V", name: "Полная поддержка", icon: "👁️", color: "text-cyan-400" },
};

export function StratzMatchupHeroCard({
  match,
  heroes,
  selectedSlot,
  onSelectSlot,
  onJumpToTimeline,
}: StratzMatchupHeroCardProps) {
  const heroMap = useMemo(() => new Map(heroes.map((h) => [h.id, h])), [heroes]);

  const radiantPlayers = useMemo(
    () => [...match.players.filter((p) => p.isRadiant)].sort((a, b) => a.player_slot - b.player_slot),
    [match.players]
  );
  const direPlayers = useMemo(
    () => [...match.players.filter((p) => !p.isRadiant)].sort((a, b) => a.player_slot - b.player_slot),
    [match.players]
  );

  const selectedPlayer = useMemo(
    () => match.players.find((p) => p.player_slot === selectedSlot) ?? match.players[0],
    [match.players, selectedSlot]
  );
  const selectedHero = useMemo(
    () => heroMap.get(selectedPlayer?.hero_id ?? 0),
    [heroMap, selectedPlayer?.hero_id]
  );

  const isSelectedRadiant = selectedPlayer?.isRadiant ?? true;
  const opponents = isSelectedRadiant ? direPlayers : radiantPlayers;
  const allies = isSelectedRadiant ? radiantPlayers : direPlayers;

  const totalTeamKills = useMemo(() => {
    return allies.reduce((sum, p) => sum + (p.kills || 0), 0) || 1;
  }, [allies]);

  const killParticipation = useMemo(() => {
    if (!selectedPlayer) return 0;
    return Math.round(((selectedPlayer.kills + selectedPlayer.assists) / totalTeamKills) * 100);
  }, [selectedPlayer, totalTeamKills]);

  const rank = selectedPlayer?.rank_tier ? getRankInfo(selectedPlayer.rank_tier) : null;
  const imp = selectedPlayer?.imp ?? 0;
  const isImpPos = imp >= 0;

  // Lane result
  const laneOutcome = useMemo(() => {
    const laneNum = selectedPlayer?.lane ?? 2;
    let laneName = "Сложная линия";
    if (laneNum === 1) laneName = isSelectedRadiant ? "Легкая линия" : "Сложная линия";
    else if (laneNum === 2) laneName = "Центральная линия";
    else if (laneNum === 3) laneName = isSelectedRadiant ? "Сложная линия" : "Легкая линия";

    const won = selectedPlayer?.isRadiant === match.radiant_win;
    return {
      laneName,
      status: won ? "Победа" : "Поражение",
      isWon: won,
    };
  }, [selectedPlayer, isSelectedRadiant, match.radiant_win]);

  // Abilities of selected hero
  const heroAbilities = useMemo(() => {
    if (!selectedHero) return [];
    return getHeroAbilities(selectedHero.name);
  }, [selectedHero]);

  // Ability upgrade dots count
  const abilityLevels = useMemo(() => {
    const map = new Map<string, number>();
    if (!selectedPlayer?.ability_upgrades_arr) return map;
    for (const ab of selectedPlayer.ability_upgrades_arr) {
      const key = String(ab);
      map.set(key, (map.get(key) || 0) + 1);
    }
    return map;
  }, [selectedPlayer?.ability_upgrades_arr]);

  // Ability progression timeline (Level 1 to 25 matrix)
  const progressionMatrix = useMemo(() => {
    if (!selectedHero) return [];
    return getAbilityProgression(selectedHero.name, 25, selectedPlayer?.ability_upgrades_arr);
  }, [selectedHero, selectedPlayer?.ability_upgrades_arr]);

  // Starting items (-01:40)
  const startingItems = useMemo(() => {
    if (!selectedPlayer?.purchase_log) return [];
    return selectedPlayer.purchase_log
      .filter((e) => e.time <= 0 && !e.key.startsWith("recipe_"))
      .map((e) => resolveItemKey(e.key));
  }, [selectedPlayer?.purchase_log]);

  // 10m inventory & stats
  const laningState = useMemo(() => {
    if (!selectedPlayer) return null;
    const inv = simulateInventoryAtTime(
      selectedPlayer.purchase_log,
      600,
      [
        selectedPlayer.item_0, selectedPlayer.item_1, selectedPlayer.item_2,
        selectedPlayer.item_3, selectedPlayer.item_4, selectedPlayer.item_5,
      ],
      match.duration,
      selectedPlayer.obs_log,
      selectedPlayer.sen_log
    );
    const nw10 = selectedPlayer.networth_t?.[10] ?? selectedPlayer.gold_t?.[10] ?? null;
    const lh10 = selectedPlayer.lh_t?.[10] ?? null;
    const dn10 = selectedPlayer.dn_t?.[10] ?? null;
    return { inv, nw10, lh10, dn10 };
  }, [selectedPlayer, match.duration]);

  // 20m inventory & stats
  const midgameState = useMemo(() => {
    if (!selectedPlayer) return null;
    const inv = simulateInventoryAtTime(
      selectedPlayer.purchase_log,
      1200,
      [
        selectedPlayer.item_0, selectedPlayer.item_1, selectedPlayer.item_2,
        selectedPlayer.item_3, selectedPlayer.item_4, selectedPlayer.item_5,
      ],
      match.duration,
      selectedPlayer.obs_log,
      selectedPlayer.sen_log
    );
    return { inv };
  }, [selectedPlayer, match.duration]);

  // Key significant items purchased with exact timings
  const keyItems = useMemo(() => {
    if (!selectedPlayer?.purchase_log) return [];
    const list: Array<{ item: ResolvedItem; time: number }> = [];
    const seen = new Set<string>();

    for (const entry of selectedPlayer.purchase_log) {
      if (entry.time <= 0 || entry.key.startsWith("recipe_")) continue;
      const res = resolveItemKey(entry.key);
      if (res.cost >= 1400 && !seen.has(res.slug)) {
        seen.add(res.slug);
        list.push({ item: res, time: entry.time });
      }
    }
    return list.slice(0, 8);
  }, [selectedPlayer?.purchase_log]);

  // Final inventory
  const finalItems = useMemo(() => {
    if (!selectedPlayer) return [];
    return [
      selectedPlayer.item_0,
      selectedPlayer.item_1,
      selectedPlayer.item_2,
      selectedPlayer.item_3,
      selectedPlayer.item_4,
      selectedPlayer.item_5,
    ].map((id) =>
      id && id > 0
        ? resolveItemWithStackCount(
            id,
            selectedPlayer.purchase_log,
            selectedPlayer.obs_placed,
            selectedPlayer.sen_placed,
            undefined,
            match.duration
          )
        : null
    );
  }, [selectedPlayer, match.duration]);

  const finalBackpack = useMemo(() => {
    if (!selectedPlayer) return [];
    return [
      selectedPlayer.backpack_0,
      selectedPlayer.backpack_1,
      selectedPlayer.backpack_2,
    ].map((id) =>
      id && id > 0
        ? resolveItemWithStackCount(
            id,
            selectedPlayer.purchase_log,
            selectedPlayer.obs_placed,
            selectedPlayer.sen_placed,
            undefined,
            match.duration
          )
        : null
    );
  }, [selectedPlayer, match.duration]);

  const finalNeutral = useMemo(() => {
    if (!selectedPlayer?.item_neutral) return null;
    return resolveItemKey(selectedPlayer.item_neutral);
  }, [selectedPlayer?.item_neutral]);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* ── 1. Top 10 Heroes Selector Strip (Exact Stratz layout) ── */}
      <div className="rounded-3xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-md p-3 sm:p-4 shadow-xl">
        <div className="flex items-center justify-between gap-2 overflow-x-auto scrollbar-none pb-1">
          {/* Radiant 5 */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <span className="text-[11px] font-bold text-emerald-400 font-mono hidden md:inline px-1">
              СВЕТ
            </span>
            {radiantPlayers.map((p) => {
              const h = heroMap.get(p.hero_id);
              const isCur = selectedSlot === p.player_slot;
              const slotInfo = getPlayerSlotInfo(p.player_slot);
              return (
                <button
                  key={p.player_slot}
                  onClick={() => onSelectSlot(p.player_slot)}
                  className={`relative group rounded-2xl p-1 transition-all cursor-pointer flex flex-col items-center gap-1 ${
                    isCur
                      ? "ring-2 ring-emerald-400 bg-white/15 scale-105 shadow-[0_0_16px_rgba(48,209,88,0.35)]"
                      : "hover:bg-white/10 opacity-80 hover:opacity-100"
                  }`}
                  title={`${h?.localized_name || "Герой"} (Слот ${slotInfo.slotNumber} • ${slotInfo.name} • ${p.personaname || "Игрок"})`}
                >
                  <div className="size-10 sm:size-12 rounded-xl overflow-hidden bg-black/60 border border-white/20 relative shadow-sm">
                    {/* Top colored accent indicator for official Valve slot color */}
                    <div
                      className="absolute top-0 left-0 right-0 h-1 z-10"
                      style={{ backgroundColor: slotInfo.hex }}
                    />
                    {h ? (
                      <img src={heroIconUrl(h.name)} alt="" className="size-full object-cover" />
                    ) : (
                      <div className="size-full bg-zinc-800" />
                    )}
                    <span
                      className="absolute bottom-0.5 right-0.5 px-1 rounded bg-black/85 text-[9px] font-black font-mono"
                      style={{ color: slotInfo.hex }}
                    >
                      #{slotInfo.slotNumber}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* VS Divider */}
          <div className="shrink-0 px-2 flex flex-col items-center">
            <span className="text-[10px] font-black font-mono text-zinc-500 uppercase">VS</span>
          </div>

          {/* Dire 5 */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {direPlayers.map((p) => {
              const h = heroMap.get(p.hero_id);
              const isCur = selectedSlot === p.player_slot;
              const slotInfo = getPlayerSlotInfo(p.player_slot);
              return (
                <button
                  key={p.player_slot}
                  onClick={() => onSelectSlot(p.player_slot)}
                  className={`relative group rounded-2xl p-1 transition-all cursor-pointer flex flex-col items-center gap-1 ${
                    isCur
                      ? "ring-2 ring-rose-400 bg-white/15 scale-105 shadow-[0_0_16px_rgba(255,69,58,0.35)]"
                      : "hover:bg-white/10 opacity-80 hover:opacity-100"
                  }`}
                  title={`${h?.localized_name || "Герой"} (Слот ${slotInfo.slotNumber} • ${slotInfo.name} • ${p.personaname || "Игрок"})`}
                >
                  <div className="size-10 sm:size-12 rounded-xl overflow-hidden bg-black/60 border border-white/20 relative shadow-sm">
                    {/* Top colored accent indicator for official Valve slot color */}
                    <div
                      className="absolute top-0 left-0 right-0 h-1 z-10"
                      style={{ backgroundColor: slotInfo.hex }}
                    />
                    {h ? (
                      <img src={heroIconUrl(h.name)} alt="" className="size-full object-cover" />
                    ) : (
                      <div className="size-full bg-zinc-800" />
                    )}
                    <span
                      className="absolute bottom-0.5 right-0.5 px-1 rounded bg-black/85 text-[9px] font-black font-mono"
                      style={{ color: slotInfo.hex }}
                    >
                      #{slotInfo.slotNumber}
                    </span>
                  </div>
                </button>
              );
            })}
            <span className="text-[11px] font-bold text-rose-400 font-mono hidden md:inline px-1">
              ТЬМА
            </span>
          </div>
        </div>
      </div>

      {/* ── 2. "ПРОТИВОСТОЯНИЕ" (Exact replica of media_1790673939568.png) ── */}
      <div className="rounded-3xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-md p-5 sm:p-7 shadow-xl space-y-5">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-base sm:text-lg font-bold text-white tracking-tight">
              Противостояние
            </span>
          </div>
          <span className="text-[11px] text-zinc-400 font-mono">
            {isSelectedRadiant ? "Силы Света vs Силы Тьмы" : "Силы Тьмы vs Силы Света"}
          </span>
        </div>

        {/* Unified Matchup Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* ── LEFT: Selected Hero Spotlight (7 cols on lg) ── */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
            {/* Team Hero Switcher Tabs (5 heroes of the current team) */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
              {allies.map((p) => {
                const h = heroMap.get(p.hero_id);
                const isCur = selectedSlot === p.player_slot;
                const slotInfo = getPlayerSlotInfo(p.player_slot);
                return (
                  <button
                    key={p.player_slot}
                    onClick={() => onSelectSlot(p.player_slot)}
                    className={`relative rounded-xl overflow-hidden border transition-all cursor-pointer flex-1 min-w-[54px] max-w-[80px] h-12 flex flex-col items-center justify-center ${
                      isCur
                        ? isSelectedRadiant
                          ? "border-emerald-400 ring-2 ring-emerald-400/40 bg-emerald-950/40"
                          : "border-rose-400 ring-2 ring-rose-400/40 bg-rose-950/40"
                        : "border-white/10 bg-black/40 hover:border-white/30 opacity-70 hover:opacity-100"
                    }`}
                    title={`${h?.localized_name || "Герой"} (Слот ${slotInfo.slotNumber} • ${slotInfo.name})`}
                  >
                    {h && (
                      <img
                        src={heroIconUrl(h.name)}
                        alt=""
                        className="absolute inset-0 size-full object-cover opacity-60"
                      />
                    )}
                    <div
                      className="absolute top-0 left-0 right-0 h-1 z-10"
                      style={{ backgroundColor: slotInfo.hex }}
                    />
                    <span
                      className="relative z-10 text-[10px] font-black font-mono drop-shadow"
                      style={{ color: slotInfo.hex }}
                    >
                      #{slotInfo.slotNumber}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Selected Hero Spotlight Card */}
            <div className="rounded-2xl border border-white/[0.08] bg-black/35 p-4 sm:p-5 space-y-4 shadow-inner">
              {/* Row 1: Rank Medal + Nickname | Lane Badge | IMP */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  {rank && <RankMedal rankInfo={rank} size="xs" />}
                  <span className="font-extrabold text-sm sm:text-base text-white truncate">
                    {selectedPlayer?.personaname || selectedHero?.localized_name}
                  </span>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  {/* Lane Outcome Badge */}
                  <div className="px-2.5 py-1 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center gap-1.5 text-xs font-mono">
                    <span className="text-amber-400 text-xs">🛡️</span>
                    <span className="text-zinc-200 font-semibold">{laneOutcome.laneName}</span>
                    <span>•</span>
                    <span className={`font-bold ${laneOutcome.isWon ? "text-emerald-400" : "text-rose-400"}`}>
                      {laneOutcome.status}
                    </span>
                  </div>

                  {/* IMP Bar */}
                  <div className="px-2.5 py-1 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center gap-2 text-xs font-mono">
                    <span className={`font-black ${isImpPos ? "text-purple-300" : "text-rose-400"}`}>
                      {isImpPos ? `+${imp}` : imp}
                    </span>
                    <div className="w-10 h-1.5 rounded-full bg-white/10 overflow-hidden flex">
                      <div
                        className={`h-full rounded-full ${isImpPos ? "bg-gradient-to-r from-purple-500 to-cyan-400" : "bg-gradient-to-r from-orange-500 to-rose-500"}`}
                        style={{ width: `${Math.min(100, Math.max(20, Math.abs(imp)))}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 2: Stats Strip (Level, Gold, KDA, GPM/XPM, CS/DN, Damage) */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs font-mono">
                <div className="rounded-xl bg-white/[0.03] p-2 border border-white/[0.05]">
                  <div className="text-[10px] text-zinc-400 uppercase">Уровень</div>
                  <div className="text-base font-black text-white mt-0.5">{selectedPlayer?.level}</div>
                </div>

                <div className="rounded-xl bg-white/[0.03] p-2 border border-white/[0.05]">
                  <div className="text-[10px] text-zinc-400 uppercase">Капитал</div>
                  <div className="text-sm font-bold text-amber-300 mt-0.5">🪙 {selectedPlayer?.net_worth?.toLocaleString()}</div>
                </div>

                <div className="rounded-xl bg-white/[0.03] p-2 border border-white/[0.05]">
                  <div className="text-[10px] text-zinc-400 uppercase">В / С / П</div>
                  <div className="text-sm font-bold text-white mt-0.5">
                    <span className="text-emerald-400">{selectedPlayer?.kills}</span>/
                    <span className="text-rose-400">{selectedPlayer?.deaths}</span>/
                    <span className="text-sky-400">{selectedPlayer?.assists}</span>
                  </div>
                </div>

                <div className="rounded-xl bg-white/[0.03] p-2 border border-white/[0.05]">
                  <div className="text-[10px] text-zinc-400 uppercase">GPM / XPM</div>
                  <div className="text-sm font-bold text-zinc-200 mt-0.5">{selectedPlayer?.gold_per_min}/{selectedPlayer?.xp_per_min}</div>
                </div>

                <div className="rounded-xl bg-white/[0.03] p-2 border border-white/[0.05]">
                  <div className="text-[10px] text-zinc-400 uppercase">CS / DN</div>
                  <div className="text-sm font-bold text-zinc-200 mt-0.5">{selectedPlayer?.last_hits}/{selectedPlayer?.denies}</div>
                </div>

                <div className="rounded-xl bg-white/[0.03] p-2 border border-white/[0.05]">
                  <div className="text-[10px] text-zinc-400 uppercase">Урон</div>
                  <div className="text-sm font-bold text-rose-300 mt-0.5">{selectedPlayer?.hero_damage?.toLocaleString()}</div>
                </div>
              </div>

              {/* Row 3: Abilities with level dots + Talent + Inventory HUD */}
              <div className="flex flex-col xl:flex-row items-center justify-between gap-4 pt-1">
                {/* Abilities with 4 Dots & Talent */}
                <div className="flex items-center gap-2">
                  <div
                    className="size-9 rounded-full bg-[#121724] border border-amber-400/40 flex items-center justify-center text-amber-300 font-bold shadow-sm shrink-0"
                    title="Дерево талантов героя"
                  >
                    <span className="text-sm">🌳</span>
                  </div>
                  {heroAbilities.slice(0, 4).map((ab, idx) => {
                    const lvlCount = abilityLevels.get(ab.name) || 0;
                    return (
                      <div key={idx} className="flex flex-col items-center gap-1">
                        <div className="size-10 rounded-xl overflow-hidden bg-black/60 border border-white/20 relative shadow-sm">
                          <img src={ab.iconUrl} alt={ab.dname} className="size-full object-cover" />
                        </div>
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4].map((dot) => (
                            <span
                              key={dot}
                              className={`size-1.5 rounded-full ${dot <= lvlCount ? "bg-amber-400" : "bg-white/20"}`}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Dota 2 Authentic Inventory HUD (6 slots + neutral + backpack + Aghs + TP) */}
                <DotaInventoryHud
                  items={finalItems}
                  backpack={finalBackpack}
                  neutralItem={finalNeutral}
                  hasScepter={Boolean(selectedPlayer?.aghanims_scepter)}
                  hasShard={Boolean(selectedPlayer?.aghanims_shard)}
                  size="md"
                />
              </div>
            </div>
          </div>

          {/* ── CENTER: VS Divider (1 col on lg) ── */}
          <div className="hidden lg:flex lg:col-span-1 flex-col items-center justify-center text-center">
            <div className="size-8 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-[10px] font-black font-mono text-zinc-400">
              VS
            </div>
            <span className="text-[9px] text-zinc-500 uppercase font-semibold tracking-widest mt-1">против</span>
          </div>

          {/* ── RIGHT: 5 Opponent Cards in 5 VERTICAL COLUMNS (4 cols on lg) ── */}
          <div className="lg:col-span-4 flex flex-col justify-between">
            <div className="text-xs font-bold text-zinc-400 mb-2 font-mono flex items-center justify-between">
              <span>Соперники</span>
              <span className="text-[10px] text-zinc-500">5 участников ↔</span>
            </div>

            <div className="grid grid-cols-5 gap-2 overflow-x-auto scrollbar-none pb-1">
              {opponents.map((opp) => {
                const oppHero = heroMap.get(opp.hero_id);
                const oppSlotInfo = getPlayerSlotInfo(opp.player_slot);
                const oppPos = POS_DATA[opp.pos_role ?? 1] ?? { roman: "I", icon: "⚔️" };
                const oppRank = opp.rank_tier ? getRankInfo(opp.rank_tier) : null;
                const oppImp = opp.imp ?? 0;
                const isOppImpPos = oppImp >= 0;

                return (
                  <div
                    key={opp.player_slot}
                    onClick={() => onSelectSlot(opp.player_slot)}
                    className="rounded-2xl border border-white/[0.08] bg-black/40 hover:bg-white/[0.06] hover:border-white/30 p-1.5 sm:p-2 flex flex-col items-center justify-between text-center transition cursor-pointer group space-y-1.5 shadow-sm"
                    title={`${oppHero?.localized_name || "Герой"} (Слот ${oppSlotInfo.slotNumber} • ${oppSlotInfo.name} • ${opp.personaname || "Игрок"})`}
                  >
                    {/* Top: Hero Avatar with Slot Number */}
                    <div className="relative size-10 sm:size-12 rounded-xl overflow-hidden bg-black/60 border border-white/20 shrink-0">
                      <div
                        className="absolute top-0 left-0 right-0 h-1 z-10"
                        style={{ backgroundColor: oppSlotInfo.hex }}
                      />
                      {oppHero && (
                        <img src={heroIconUrl(oppHero.name)} alt="" className="size-full object-cover" />
                      )}
                      <span
                        className="absolute bottom-0.5 right-0.5 px-1 rounded bg-black/85 text-[8px] font-bold font-mono"
                        style={{ color: oppSlotInfo.hex }}
                      >
                        #{oppSlotInfo.slotNumber}
                      </span>
                    </div>

                    {/* IMP */}
                    <div className="space-y-0.5 w-full">
                      <div className={`text-[10px] font-black font-mono ${isOppImpPos ? "text-purple-300" : "text-rose-400"}`}>
                        {isOppImpPos ? `+${oppImp}` : oppImp}
                      </div>
                      <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className={`h-full ${isOppImpPos ? "bg-purple-400" : "bg-rose-500"}`}
                          style={{ width: `${Math.min(100, Math.max(20, Math.abs(oppImp)))}%` }}
                        />
                      </div>
                    </div>

                    {/* Role Icon */}
                    <span className="text-xs">{oppPos.icon}</span>

                    {/* K / D / A */}
                    <div className="text-[10px] font-mono text-white font-bold leading-tight">
                      <div>{opp.kills}/{opp.deaths}</div>
                      <div className="text-zinc-400">{opp.assists}</div>
                    </div>

                    {/* Networth */}
                    <div className="text-[9px] font-mono text-amber-300 font-bold">
                      🪙 {opp.net_worth ? `${Math.round(opp.net_worth / 1000)}k` : "—"}
                    </div>

                    {/* Nickname */}
                    <div className="text-[9px] font-semibold text-zinc-300 truncate w-full" title={opp.personaname}>
                      {opp.personaname || oppHero?.localized_name}
                    </div>

                    {/* Rank Medal */}
                    {oppRank && <RankMedal rankInfo={oppRank} size="xs" />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. СПОСОБНОСТИ И ПРЕДМЕТЫ (Exact media_1790673954265.png) ── */}
      <div className="rounded-3xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-md p-5 sm:p-7 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-white tracking-tight">
              Способности и порядок прокачки
            </span>
          </div>
          <span className="text-[11px] text-zinc-400 font-mono">Уровни 1..{progressionMatrix.length}</span>
        </div>

        {/* Ability progression timeline grid */}
        <div className="overflow-x-auto scrollbar-none pb-2">
          <div className="inline-flex items-center gap-1.5 min-w-max">
            {progressionMatrix.map((item, idx) => (
              <div key={idx} className="flex flex-col items-center gap-1">
                <span className="text-[9px] font-mono text-zinc-500 font-bold">{item.level}</span>
                <div
                  className="size-8 sm:size-9 rounded-xl overflow-hidden bg-black/60 border border-white/15 flex items-center justify-center shadow-sm"
                  title={`Уровень ${item.level}: ${item.abilityName}`}
                >
                  {item.isTalent ? (
                    <div className="size-full bg-amber-500/20 flex items-center justify-center text-xs font-black text-amber-300">
                      🌳
                    </div>
                  ) : (
                    <img
                      src={getAbilityIconUrl(item.abilityName)}
                      alt=""
                      className="size-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Significant item purchase timings */}
        {keyItems.length > 0 && (
          <div className="pt-3 border-t border-white/[0.06] space-y-2">
            <div className="text-xs font-bold text-zinc-400 font-mono">
              Тайминги ключевых предметов
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {keyItems.map((it, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-white/[0.06] bg-black/30 p-2 flex items-center justify-between gap-2 text-xs font-mono"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="size-7 rounded-lg overflow-hidden bg-zinc-900 border border-white/10 shrink-0">
                      <img src={it.item.icon || ""} alt="" className="size-full object-cover" />
                    </div>
                    <span className="text-white truncate font-medium">{it.item.name}</span>
                  </div>
                  <span className="text-amber-400 font-bold shrink-0">{fmtSec(it.time)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── 4. ХРОНОЛОГИЯ ФАЗ МАТЧА (Exact media_1790673954265.png) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Phase 1: -01:40 Стартовые предметы */}
        <div className="rounded-3xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-md p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="font-bold text-amber-300 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full">
              -01:40
            </span>
            <span className="text-zinc-400">Стартовый закуп</span>
          </div>

          <div className="font-bold text-sm text-white">Начальные расходники</div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {startingItems.length > 0 ? (
              startingItems.map((item, idx) => (
                <div
                  key={idx}
                  className="size-10 rounded-xl overflow-hidden bg-black/60 border border-white/10 relative shadow-sm"
                  title={item.name}
                >
                  <img src={item.icon || ""} alt={item.name} className="size-full object-cover" />
                </div>
              ))
            ) : (
              <div className="text-xs text-zinc-500 font-mono py-2">Стандартный закуп</div>
            )}
          </div>
        </div>

        {/* Phase 2: 10:00 Лейнинг */}
        <div className="rounded-3xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-md p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="font-bold text-emerald-300 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded-full">
              10:00
            </span>
            <span className="text-zinc-400">Исход линий</span>
          </div>

          <div className="font-bold text-sm text-white">Инвентарь на 10-й минуте</div>

          <div className="pt-1">
            <DotaInventoryHud
              items={laningState?.inv || []}
              size="sm"
              showBackpack={false}
              showNeutral={false}
              showAghs={false}
            />
          </div>

          <div className="flex items-center justify-between text-xs font-mono pt-1 text-zinc-400 border-t border-zinc-800/80">
            <span>Капитал: <strong className="text-amber-300">{laningState?.nw10 !== null && laningState?.nw10 !== undefined ? `🪙 ${laningState.nw10.toLocaleString()}` : "—"}</strong></span>
            <span>Крипы: <strong className="text-white">{laningState?.lh10 !== null && laningState?.lh10 !== undefined ? `${laningState.lh10}/${laningState.dn10 ?? 0}` : "—"}</strong></span>
          </div>
        </div>

        {/* Phase 3: 20:00 Мидгейм */}
        <div className="rounded-3xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-md p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="font-bold text-sky-300 bg-sky-400/10 border border-sky-400/20 px-2 py-0.5 rounded-full">
              20:00
            </span>
            <span className="text-zinc-400">Мидгейм</span>
          </div>

          <div className="font-bold text-sm text-white">Инвентарь на 20-й минуте</div>

          <div className="pt-1">
            <DotaInventoryHud
              items={midgameState?.inv || []}
              size="sm"
              showBackpack={false}
              showNeutral={false}
              showAghs={false}
            />
          </div>

          {onJumpToTimeline && (
            <button
              onClick={() => onJumpToTimeline(20)}
              className="text-xs font-bold text-zinc-300 hover:text-white transition flex items-center gap-1 pt-1 cursor-pointer font-mono"
            >
              <span>Поминутный плеер</span>
              <ChevronRight className="size-3" />
            </button>
          )}
        </div>
      </div>

      {/* ── 5. ПОСТ-ИГРОВАЯ СТАТИСТИКА (Exact media_1790673954265.png) ── */}
      <div className="rounded-3xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-md p-5 sm:p-7 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
          <span className="text-base font-bold text-white tracking-tight">
            Пост-игровая статистика ({selectedHero?.localized_name})
          </span>
          <span className="text-[11px] text-zinc-400 font-mono">Итоги матча</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 font-mono text-center">
          <div className="rounded-2xl border border-white/[0.06] bg-black/30 p-3">
            <div className="text-[10px] text-zinc-400 uppercase">Уровень</div>
            <div className="text-xl font-black text-white mt-1">{selectedPlayer?.level}</div>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-black/30 p-3">
            <div className="text-[10px] text-zinc-400 uppercase">Капитал</div>
            <div className="text-xl font-black text-amber-300 mt-1">🪙 {selectedPlayer?.net_worth?.toLocaleString()}</div>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-black/30 p-3">
            <div className="text-[10px] text-zinc-400 uppercase">Убийства</div>
            <div className="text-xl font-black text-emerald-400 mt-1">{selectedPlayer?.kills}</div>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-black/30 p-3">
            <div className="text-[10px] text-zinc-400 uppercase">Смерти</div>
            <div className="text-xl font-black text-rose-400 mt-1">{selectedPlayer?.deaths}</div>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-black/30 p-3">
            <div className="text-[10px] text-zinc-400 uppercase">Помощь</div>
            <div className="text-xl font-black text-sky-400 mt-1">{selectedPlayer?.assists}</div>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-black/30 p-3">
            <div className="text-[10px] text-zinc-400 uppercase">Импакт (IMP)</div>
            <div className={`text-xl font-black mt-1 ${isImpPos ? "text-purple-300" : "text-rose-400"}`}>
              {isImpPos ? `+${imp}` : imp}
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-black/30 p-3">
            <div className="text-[10px] text-zinc-400 uppercase">GPM</div>
            <div className="text-lg font-bold text-amber-400 mt-1">{selectedPlayer?.gold_per_min}</div>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-black/30 p-3">
            <div className="text-[10px] text-zinc-400 uppercase">XPM</div>
            <div className="text-lg font-bold text-purple-300 mt-1">{selectedPlayer?.xp_per_min}</div>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-black/30 p-3">
            <div className="text-[10px] text-zinc-400 uppercase">Урон по героям</div>
            <div className="text-lg font-bold text-rose-400 mt-1">{selectedPlayer?.hero_damage?.toLocaleString()}</div>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-black/30 p-3">
            <div className="text-[10px] text-zinc-400 uppercase">Урон по вышкам</div>
            <div className="text-lg font-bold text-zinc-200 mt-1">{selectedPlayer?.tower_damage?.toLocaleString() ?? 0}</div>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-black/30 p-3">
            <div className="text-[10px] text-zinc-400 uppercase">CS / DN</div>
            <div className="text-lg font-bold text-white mt-1">{selectedPlayer?.last_hits}/{selectedPlayer?.denies}</div>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-black/30 p-3">
            <div className="text-[10px] text-zinc-400 uppercase">Вклад в фраги</div>
            <div className="text-lg font-bold text-emerald-400 mt-1">{killParticipation}%</div>
          </div>

          <div className="col-span-2 sm:col-span-4 lg:col-span-6 rounded-2xl border border-white/[0.06] bg-black/30 p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="text-left">
              <div className="text-[10px] text-zinc-400 uppercase">Финальный инвентарь</div>
              <div className="text-xs font-semibold text-white mt-0.5">Все слоты на момент окончания матча</div>
            </div>
            <DotaInventoryHud
              items={finalItems}
              backpack={finalBackpack}
              neutralItem={finalNeutral}
              hasScepter={Boolean(selectedPlayer?.aghanims_scepter)}
              hasShard={Boolean(selectedPlayer?.aghanims_shard)}
              size="sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
