"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Clock,
  Coins,
  Swords,
  Shield,
  Zap,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Trophy,
  Activity,
  Layers,
  Award,
  ArrowRight,
  Info,
  RefreshCw,
} from "lucide-react";
import {
  type FullMatchDetails,
  type MatchPlayerDetail,
  type OpenDotaHero,
  heroIconUrl,
  getItemIconUrl,
} from "@/lib/opendota";
import {
  simulateFullPlayerStateAtTime,
  type ResolvedItem,
  getItemName,
} from "@/lib/item-utils";
import {
  getHeroAbilities,
  getAbilityIconUrl,
  getAbilityDname,
} from "@/lib/ability-utils";
import { RankMedal } from "@/components/ui/RankMedal";
import { getRankInfo } from "@/lib/ranks";
import { DotaInventoryHud } from "@/components/ui/DotaInventoryHud";
import { getPlayerSlotInfo } from "@/lib/positions";

interface MinutePlayerInspectorProps {
  match: FullMatchDetails;
  heroes: OpenDotaHero[];
  selectedSlot: number;
  onSelectSlot: (slot: number) => void;
  currentMinute: number;
  onChangeMinute: (min: number) => void;
}

function fmtSec(sec: number): string {
  const m = Math.floor(Math.max(0, sec) / 60);
  const s = Math.floor(Math.max(0, sec)) % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function fmtGameTime(sec: number): string {
  const sign = sec < 0 ? "-" : "";
  const abs = Math.abs(sec);
  const m = Math.floor(abs / 60);
  const s = abs % 60;
  return `${sign}${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function MinutePlayerInspector({
  match,
  heroes,
  selectedSlot,
  onSelectSlot,
  currentMinute,
  onChangeMinute,
}: MinutePlayerInspectorProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2>(1);
  const [isRequestingParse, setIsRequestingParse] = useState(false);
  const [parseStatusMsg, setParseStatusMsg] = useState<string | null>(null);

  const handleRequestParse = async () => {
    setIsRequestingParse(true);
    setParseStatusMsg(null);
    try {
      const res = await fetch(`/api/matches/${match.match_id}/request-parse`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        setParseStatusMsg(data.message || "Запрос отправлен в Valve! Обновляем...");
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      } else {
        setParseStatusMsg("Не удалось отправить запрос в очередь Valve.");
      }
    } catch {
      setParseStatusMsg("Ошибка соединения с сервером.");
    } finally {
      setIsRequestingParse(false);
    }
  };

  const heroMap = useMemo(() => new Map(heroes.map((h) => [h.id, h])), [heroes]);
  const maxMinute = Math.max(1, Math.floor(match.duration / 60));

  // Autoplay ticker
  useEffect(() => {
    if (!isPlaying) return;
    const intervalTime = playbackSpeed === 2 ? 600 : 1100;
    const timer = setInterval(() => {
      onChangeMinute(Math.min(maxMinute, currentMinute + 1));
      if (currentMinute >= maxMinute - 1) {
        setIsPlaying(false);
      }
    }, intervalTime);
    return () => clearInterval(timer);
  }, [isPlaying, currentMinute, maxMinute, playbackSpeed, onChangeMinute]);

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
    () => heroMap.get(selectedPlayer.hero_id),
    [heroMap, selectedPlayer.hero_id]
  );

  // Check if this match has real parsed replay ticker arrays
  const hasReplayData = Boolean(
    (selectedPlayer?.purchase_log && selectedPlayer.purchase_log.length > 0) ||
    (selectedPlayer?.networth_t && selectedPlayer.networth_t.length > 0) ||
    (selectedPlayer?.gold_t && selectedPlayer.gold_t.length > 0) ||
    (match.radiant_gold_adv && match.radiant_gold_adv.length > 0)
  );

  // Simulated items at target minute
  const targetTimeSec = hasReplayData ? currentMinute * 60 : match.duration;
  const simulated = useMemo(() => {
    if (!selectedPlayer) return null;
    return simulateFullPlayerStateAtTime(
      selectedPlayer.purchase_log,
      targetTimeSec,
      {
        item_0: selectedPlayer.item_0,
        item_1: selectedPlayer.item_1,
        item_2: selectedPlayer.item_2,
        item_3: selectedPlayer.item_3,
        item_4: selectedPlayer.item_4,
        item_5: selectedPlayer.item_5,
        backpack_0: selectedPlayer.backpack_0,
        backpack_1: selectedPlayer.backpack_1,
        backpack_2: selectedPlayer.backpack_2,
        item_neutral: selectedPlayer.item_neutral,
        aghanims_shard: selectedPlayer.aghanims_shard,
        aghanims_scepter: selectedPlayer.aghanims_scepter,
        permanent_buffs: selectedPlayer.permanent_buffs,
        obs_placed: selectedPlayer.obs_placed,
        sen_placed: selectedPlayer.sen_placed,
      },
      selectedPlayer.neutral_item_history,
      match.duration,
      selectedPlayer.obs_log,
      selectedPlayer.sen_log,
      selectedPlayer.item_uses
    );
  }, [selectedPlayer, targetTimeSec, match.duration]);

  // Current stats at this minute (STRICTLY REAL DATA, zero fake math)
  const minuteNetworth = useMemo(() => {
    if (!selectedPlayer) return null;
    if (selectedPlayer.networth_t && selectedPlayer.networth_t[currentMinute] !== undefined) {
      return selectedPlayer.networth_t[currentMinute];
    }
    if (selectedPlayer.gold_t && selectedPlayer.gold_t[currentMinute] !== undefined) {
      return selectedPlayer.gold_t[currentMinute];
    }
    if (!hasReplayData || currentMinute >= maxMinute) {
      return selectedPlayer.net_worth;
    }
    return null;
  }, [selectedPlayer, currentMinute, maxMinute, hasReplayData]);

  const minuteLastHits = useMemo(() => {
    if (!selectedPlayer) return null;
    if (selectedPlayer.lh_t && selectedPlayer.lh_t[currentMinute] !== undefined) {
      return selectedPlayer.lh_t[currentMinute];
    }
    if (!hasReplayData || currentMinute >= maxMinute) {
      return selectedPlayer.last_hits;
    }
    return null;
  }, [selectedPlayer, currentMinute, maxMinute, hasReplayData]);

  const minuteDenies = useMemo(() => {
    if (!selectedPlayer) return null;
    if (selectedPlayer.dn_t && selectedPlayer.dn_t[currentMinute] !== undefined) {
      return selectedPlayer.dn_t[currentMinute];
    }
    if (!hasReplayData || currentMinute >= maxMinute) {
      return selectedPlayer.denies;
    }
    return null;
  }, [selectedPlayer, currentMinute, maxMinute, hasReplayData]);

  // Exact Dota 2 Level progression from real XP at target minute
  const currentHeroLevel = useMemo(() => {
    if (!selectedPlayer) return 1;
    if (!hasReplayData || currentMinute >= maxMinute) return selectedPlayer.level;
    if (currentMinute <= 0) return 1;

    // Check if real xp_t array exists for player
    if (selectedPlayer.xp_t && selectedPlayer.xp_t[currentMinute] !== undefined) {
      const currentXp = selectedPlayer.xp_t[currentMinute];
      const xpTable = [
        0, 240, 640, 1160, 1760, 2440, 3200, 4000, 4880, 5840,
        6880, 8000, 9140, 10320, 11550, 12840, 14190, 15600, 17070, 18600,
        20190, 21840, 23550, 25350, 27300, 29400, 31700, 34300, 37200, 40500,
      ];
      let lvl = 1;
      for (let i = 0; i < xpTable.length; i++) {
        if (currentXp >= xpTable[i]) {
          lvl = i + 1;
        } else {
          break;
        }
      }
      return Math.min(selectedPlayer.level, Math.max(1, lvl));
    }

    return selectedPlayer.level;
  }, [selectedPlayer, currentMinute, maxMinute, hasReplayData]);

  // Abilities skilled up to this level
  const heroAbilities = useMemo(() => {
    if (!selectedHero) return [];
    return getHeroAbilities(selectedHero.name);
  }, [selectedHero]);

  const currentAbilitiesSkilled = useMemo(() => {
    if (!selectedPlayer?.ability_upgrades_arr) return [];
    const count = Math.min(selectedPlayer.ability_upgrades_arr.length, currentHeroLevel);
    return selectedPlayer.ability_upgrades_arr.slice(0, count);
  }, [selectedPlayer, currentHeroLevel]);

  // Kills up to this minute (STRICTLY REAL DATA)
  const killsAtMinute = useMemo(() => {
    if (!selectedPlayer) return null;
    if (selectedPlayer.kills_log && selectedPlayer.kills_log.length > 0) {
      return selectedPlayer.kills_log.filter((k) => k.time <= targetTimeSec).length;
    }
    if (!hasReplayData || currentMinute >= maxMinute) {
      return selectedPlayer.kills;
    }
    return null;
  }, [selectedPlayer, targetTimeSec, currentMinute, maxMinute, hasReplayData]);

  // Net worth rank among all 10 players at current minute
  const networthRankAtMin = useMemo(() => {
    const list = match.players.map((p) => {
      const nw = p.networth_t?.[currentMinute] ?? p.gold_t?.[currentMinute] ?? p.net_worth ?? 0;
      return { slot: p.player_slot, nw };
    });
    list.sort((a, b) => b.nw - a.nw);
    const pos = list.findIndex((x) => x.slot === selectedSlot);
    return pos >= 0 ? pos + 1 : 1;
  }, [match.players, currentMinute, selectedSlot]);

  return (
    <div className="rounded-3xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-md p-4 sm:p-6 shadow-xl space-y-6">
      {/* ── Section Title & Badge ───────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-300">
              <Clock className="size-4" />
            </div>
            <h2 className="text-sm sm:text-base font-semibold tracking-tight text-white">
              Поминутный разбор слотов и инвентаря игрока
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Выберите любого игрока из 10 участников матча и листайте минуты, чтобы видеть точный состав инвентаря, тайминги покупок, нетворс и крипов на каждой секунде.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-zinc-800/60 border border-zinc-700/60 px-3.5 py-1.5 rounded-2xl text-xs font-mono">
          <span className="text-zinc-400">Матч:</span>
          <strong className="text-white font-semibold">{fmtSec(match.duration)}</strong>
          <span className="text-zinc-500">•</span>
          <span className="text-amber-300 font-semibold">{maxMinute} мин</span>
        </div>
      </div>

      {!hasReplayData && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs space-y-3 backdrop-blur-xl">
          <div className="space-y-1">
            <div className="font-bold text-amber-300 flex items-center gap-2 text-sm">
              <Info className="size-4" />
              <span>Поминутная запись (Replay) не была распарсена для этого матча</span>
            </div>
            <p className="text-zinc-300 leading-relaxed">
              Сервер Valve сохранил проверенные итоговые данные матча и финальный инвентарь всех 10 игроков.
              Чтобы получить посекундный таймлайн закупа, крипов и нетворса, вы можете запросить скачивание и разбор реплея из серверов Valve прямо сейчас:
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              onClick={handleRequestParse}
              disabled={isRequestingParse}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 font-bold transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`size-3.5 ${isRequestingParse ? "animate-spin" : ""}`} />
              <span>{isRequestingParse ? "Отправка запроса в Valve..." : "Запросить разбор реплея из серверов Valve"}</span>
            </button>
            {parseStatusMsg && (
              <span className="text-xs font-mono text-emerald-300 font-semibold bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 rounded-lg">
                {parseStatusMsg}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── 1. Hero Selector (All 10 Players) ────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-zinc-300 text-xs">
            Выберите героя:
          </span>
          <span className="text-[11px] text-zinc-400 font-mono flex items-center gap-1.5">
            <span
              className="inline-block size-2 rounded-full"
              style={{ backgroundColor: getPlayerSlotInfo(selectedPlayer.player_slot).color }}
            />
            {selectedPlayer.isRadiant ? "Силы Света" : "Силы Тьмы"} • Слот #{getPlayerSlotInfo(selectedPlayer.player_slot).slotNumber} ({getPlayerSlotInfo(selectedPlayer.player_slot).colorName})
          </span>
        </div>

        {/* 10 Hero Buttons (Mobile Swipe Carousel & Desktop Grid) */}
        <div className="flex lg:grid lg:grid-cols-10 gap-2 overflow-x-auto scrollbar-none snap-x py-1 -mx-2 px-2">
          {/* Radiant 5 */}
          {radiantPlayers.map((p) => {
            const h = heroMap.get(p.hero_id);
            const isSelected = p.player_slot === selectedSlot;
            const playerName = p.personaname && p.personaname !== "Неизвестный игрок" ? p.personaname : (h?.localized_name || "Игрок");
            const slotInfo = getPlayerSlotInfo(p.player_slot);
            return (
              <button
                key={p.player_slot}
                onClick={() => onSelectSlot(p.player_slot)}
                className={`shrink-0 w-28 lg:w-auto snap-start relative flex flex-col items-center p-2.5 rounded-2xl border text-center transition-all cursor-pointer ${
                  isSelected
                    ? "bg-white/15 border-emerald-400/80 shadow-md ring-2 ring-emerald-500/30"
                    : "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.08] hover:border-emerald-500/40"
                }`}
              >
                <div
                  className="absolute top-0 inset-x-3 h-0.5 rounded-full"
                  style={{ backgroundColor: slotInfo.color }}
                />
                <div className="relative size-11 rounded-xl overflow-hidden border border-white/20 bg-zinc-950">
                  {h ? (
                    <img src={heroIconUrl(h.name)} alt="" className="size-full object-cover" />
                  ) : (
                    <div className="size-full bg-zinc-800" />
                  )}
                  <span
                    className="absolute bottom-0 right-0 rounded-tl text-[9px] font-bold px-1 leading-tight text-white drop-shadow"
                    style={{ backgroundColor: slotInfo.color }}
                  >
                    #{slotInfo.slotNumber}
                  </span>
                </div>
                <div className="w-full mt-1.5 truncate text-[11px] font-semibold text-white">
                  {h?.localized_name ?? "Герой"}
                </div>
                <div className="w-full truncate text-[10px] text-zinc-400">
                  {playerName}
                </div>
                {isSelected && (
                  <span className="mt-1 text-[8px] font-bold uppercase text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded-full border border-emerald-500/40">
                    Активен
                  </span>
                )}
              </button>
            );
          })}

          {/* Dire 5 */}
          {direPlayers.map((p) => {
            const h = heroMap.get(p.hero_id);
            const isSelected = p.player_slot === selectedSlot;
            const playerName = p.personaname && p.personaname !== "Неизвестный игрок" ? p.personaname : (h?.localized_name || "Игрок");
            const slotInfo = getPlayerSlotInfo(p.player_slot);
            return (
              <button
                key={p.player_slot}
                onClick={() => onSelectSlot(p.player_slot)}
                className={`shrink-0 w-28 lg:w-auto snap-start relative flex flex-col items-center p-2.5 rounded-2xl border text-center transition-all cursor-pointer ${
                  isSelected
                    ? "bg-white/15 border-rose-400/80 shadow-md ring-2 ring-rose-500/30"
                    : "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.08] hover:border-rose-500/40"
                }`}
              >
                <div
                  className="absolute top-0 inset-x-3 h-0.5 rounded-full"
                  style={{ backgroundColor: slotInfo.color }}
                />
                <div className="relative size-11 rounded-xl overflow-hidden border border-white/20 bg-zinc-950">
                  {h ? (
                    <img src={heroIconUrl(h.name)} alt="" className="size-full object-cover" />
                  ) : (
                    <div className="size-full bg-zinc-800" />
                  )}
                  <span
                    className="absolute bottom-0 right-0 rounded-tl text-[9px] font-bold px-1 leading-tight text-white drop-shadow"
                    style={{ backgroundColor: slotInfo.color }}
                  >
                    #{slotInfo.slotNumber}
                  </span>
                </div>
                <div className="w-full mt-1.5 truncate text-[11px] font-semibold text-white">
                  {h?.localized_name ?? "Герой"}
                </div>
                <div className="w-full truncate text-[10px] text-zinc-400">
                  {playerName}
                </div>
                {isSelected && (
                  <span className="mt-1 text-[8px] font-bold uppercase text-rose-300 bg-rose-500/20 px-1.5 py-0.5 rounded-full border border-rose-500/40">
                    Активен
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 2. Timeline Scrubber & Player Controls (Audio Player Style) ── */}
      <div className="rounded-3xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-md p-5 sm:p-6 shadow-xl space-y-5">
        {/* Top Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Current minute badge & Playback Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Play / Pause Primary CTA Button */}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95 ${
                isPlaying
                  ? "bg-rose-500 hover:bg-rose-600 text-white"
                  : "bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700/60"
              }`}
            >
              {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
              <span>{isPlaying ? "Пауза" : "Воспроизведение"}</span>
            </button>

            {/* Stepper buttons (Pill shape) */}
            <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-full border border-white/[0.06]">
              <button
                onClick={() => onChangeMinute(Math.max(0, currentMinute - 1))}
                disabled={currentMinute <= 0}
                className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-white/[0.08] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                title="На 1 минуту назад"
              >
                <ChevronLeft className="size-3.5" /> -1м
              </button>
              <div className="w-px h-4 bg-white/10" />
              <button
                onClick={() => onChangeMinute(Math.min(maxMinute, currentMinute + 1))}
                disabled={currentMinute >= maxMinute}
                className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-white/[0.08] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                title="На 1 минуту вперед"
              >
                +1м <ChevronRight className="size-3.5" />
              </button>
            </div>

            {/* Current minute badge */}
            <div className="flex items-center gap-2 rounded-full bg-white/[0.05] border border-white/[0.08] px-4 py-1.5">
              <Clock className="size-3.5 text-amber-300 animate-pulse" />
              <span className="text-xs font-bold font-mono text-white">
                {currentMinute.toString().padStart(2, "0")}:00
              </span>
              <span className="text-[11px] text-zinc-400 font-mono">
                ({currentMinute}-я мин)
              </span>
            </div>

            {/* Playback speed toggle */}
            {isPlaying && (
              <button
                onClick={() => setPlaybackSpeed(playbackSpeed === 1 ? 2 : 1)}
                className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-mono font-bold text-amber-300 hover:bg-amber-400/20 transition cursor-pointer"
                title="Скорость воспроизведения"
              >
                {playbackSpeed}x скорость
              </button>
            )}
          </div>

          {/* Quick jump minutes (iOS Segmented Bar) */}
          <div className="flex flex-wrap items-center gap-1 bg-white/[0.03] p-1 rounded-full border border-white/[0.06] text-[11px] font-mono">
            {[0, 5, 10, 15, 20, 25, maxMinute].map((m) => (
              <button
                key={m}
                onClick={() => onChangeMinute(m)}
                className={`px-3 py-1 rounded-full font-semibold transition cursor-pointer ${
                  currentMinute === m
                    ? "bg-white/20 text-white shadow-sm font-bold"
                    : "text-zinc-400 hover:text-white hover:bg-white/[0.05]"
                }`}
              >
                {m === 0 ? "00:00" : m === maxMinute ? `Финал (${m}м)` : `${m}м`}
              </button>
            ))}
          </div>
        </div>

        {/* Range Slider Track (Apple tactile progress) */}
        <div className="space-y-2 pt-1">
          <div className="relative flex items-center">
            <input
              type="range"
              min={0}
              max={maxMinute}
              value={currentMinute}
              onChange={(e) => onChangeMinute(Number(e.target.value))}
              className="w-full h-2.5 bg-white/[0.08] rounded-full appearance-none cursor-pointer accent-[#0A84FF] hover:accent-[#007AFF] transition"
            />
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
            <span>00:00 (Начало игры)</span>
            <span className="text-white font-semibold flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-blue-400 animate-ping" />
              Отметка: {currentMinute}:00
            </span>
            <span>{fmtSec(match.duration)} (Конец матча)</span>
          </div>
        </div>
      </div>

      {/* ── 3. Player Stats & Inventory at Minute M ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Player Profile & Realtime Metrics & Benchmarks (5 cols) */}
        <div className="lg:col-span-5 rounded-3xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-md p-5 shadow-xl space-y-4">
          {/* Hero Header */}
          <div className="flex items-center gap-3 border-b border-zinc-800/80 pb-3">
            <div className="relative size-14 rounded-2xl overflow-hidden border border-white/20 bg-zinc-950 shrink-0 shadow-lg">
              {selectedHero ? (
                <img src={heroIconUrl(selectedHero.name)} alt="" className="size-full object-cover" />
              ) : (
                <div className="size-full bg-zinc-800" />
              )}
              <span className="absolute bottom-1 right-1 px-1 rounded-md bg-black/80 border border-white/20 text-[10px] font-bold text-white font-mono">
                {currentHeroLevel}
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight truncate">
                  {selectedHero?.localized_name ?? "Герой"}
                </h3>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    selectedPlayer.isRadiant
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                  }`}
                >
                  {selectedPlayer.isRadiant ? "Силы Света" : "Силы Тьмы"}
                </span>
              </div>
              <div className="text-xs text-zinc-400 truncate mt-0.5">
                Игрок: <strong className="text-white font-semibold">{selectedPlayer.personaname}</strong>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400 mt-1">
                <span className="flex items-center gap-1 font-semibold text-zinc-300">
                  <span
                    className="inline-block size-2 rounded-full"
                    style={{ backgroundColor: getPlayerSlotInfo(selectedPlayer.player_slot).color }}
                  />
                  Слот #{getPlayerSlotInfo(selectedPlayer.player_slot).slotNumber}
                </span>
                <span>•</span>
                <span>Поз. {selectedPlayer.pos_roman ?? "I"}</span>
                <span>•</span>
                <span className="text-amber-300 font-semibold">#{networthRankAtMin} по золоту на карте</span>
              </div>
            </div>
          </div>

          {/* Realtime Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-2.5 space-y-0.5">
              <div className="text-[10px] uppercase text-amber-300/80 font-bold flex items-center justify-center gap-1">
                <Coins className="size-3" /> Нетворс
              </div>
              <div className="text-sm sm:text-base font-black text-amber-300">
                {minuteNetworth !== null ? minuteNetworth.toLocaleString("ru-RU") : "—"}
              </div>
              <div className="text-[9px] text-zinc-500 font-sans">на {currentMinute}м</div>
            </div>

            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-2.5 space-y-0.5">
              <div className="text-[10px] uppercase text-sky-300/80 font-bold flex items-center justify-center gap-1">
                <Swords className="size-3" /> Крипы
              </div>
              <div className="text-sm sm:text-base font-black text-sky-300">
                {minuteLastHits !== null ? `${minuteLastHits} / ${minuteDenies ?? 0}` : "—"}
              </div>
              <div className="text-[9px] text-zinc-500 font-sans">LH / DN</div>
            </div>

            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-2.5 space-y-0.5">
              <div className="text-[10px] uppercase text-emerald-300/80 font-bold flex items-center justify-center gap-1">
                <Zap className="size-3" /> Уровень
              </div>
              <div className="text-sm sm:text-base font-black text-emerald-300">
                {currentHeroLevel}
              </div>
              <div className="text-[9px] text-zinc-500 font-sans">из 30</div>
            </div>

            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-2.5 space-y-0.5">
              <div className="text-[10px] uppercase text-rose-300/80 font-bold flex items-center justify-center gap-1">
                <Shield className="size-3" /> Убийства
              </div>
              <div className="text-sm sm:text-base font-black text-rose-300">
                {killsAtMinute !== null ? killsAtMinute : "—"}
              </div>
              <div className="text-[9px] text-zinc-500 font-sans">к {currentMinute}м</div>
            </div>
          </div>

          {/* Global Hero Benchmarks (Apple Fitness Style) */}
          {selectedPlayer.benchmarks && Object.keys(selectedPlayer.benchmarks).length > 0 && (
            <div className="space-y-2.5 border-t border-white/[0.06] pt-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-blue-400" />
                  Глобальный бенчмарк героя
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">среди всех игроков</span>
              </div>

              <div className="space-y-2">
                {/* Damage Benchmark */}
                {selectedPlayer.benchmarks.hero_damage_per_min && (
                  <div className="space-y-1 p-2 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-300">Урон по героям</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-white font-bold">
                          {Math.round(selectedPlayer.benchmarks.hero_damage_per_min.raw)} /мин
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          {Math.round((selectedPlayer.benchmarks.hero_damage_per_min.pct ?? 0.5) * 100)}% перцентиль
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-rose-500 to-orange-400"
                        style={{ width: `${Math.min(100, Math.max(5, (selectedPlayer.benchmarks.hero_damage_per_min.pct ?? 0.5) * 100))}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* GPM Benchmark */}
                {selectedPlayer.benchmarks.gold_per_min && (
                  <div className="space-y-1 p-2 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-300">Темп фарма (GPM)</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-white font-bold">
                          {Math.round(selectedPlayer.benchmarks.gold_per_min.raw)}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-amber-400/20 text-amber-300 border border-amber-400/30">
                          {Math.round((selectedPlayer.benchmarks.gold_per_min.pct ?? 0.5) * 100)}% перцентиль
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-300"
                        style={{ width: `${Math.min(100, Math.max(5, (selectedPlayer.benchmarks.gold_per_min.pct ?? 0.5) * 100))}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* XPM Benchmark */}
                {selectedPlayer.benchmarks.xp_per_min && (
                  <div className="space-y-1 p-2 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-300">Опыт в минуту (XPM)</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-white font-bold">
                          {Math.round(selectedPlayer.benchmarks.xp_per_min.raw)}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-purple-400/20 text-purple-300 border border-purple-400/30">
                          {Math.round((selectedPlayer.benchmarks.xp_per_min.pct ?? 0.5) * 100)}% перцентиль
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-400"
                        style={{ width: `${Math.min(100, Math.max(5, (selectedPlayer.benchmarks.xp_per_min.pct ?? 0.5) * 100))}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Abilities leveled up to this minute */}
          <div className="space-y-2 border-t border-white/[0.06] pt-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-300 text-xs flex items-center gap-1.5">
                <Zap className="size-3.5 text-amber-300" />
                Способности к {currentMinute}:00 ({currentAbilitiesSkilled.length})
              </span>
              <span className="text-[10px] text-zinc-400 font-mono">порядок прокачки</span>
            </div>

            {currentAbilitiesSkilled.length === 0 ? (
              <div className="text-xs text-zinc-500 italic py-2">
                Способности еще не прокачаны на старте матча
              </div>
            ) : (
              <div className="flex flex-wrap gap-1">
                {currentAbilitiesSkilled.map((abId, idx) => {
                  const num = Number(abId);
                  const isTalent = !isNaN(num) && num >= 5900 && num <= 6100;
                  const name = getAbilityDname(String(abId));
                  const icon = getAbilityIconUrl(String(abId));

                  return (
                    <div
                      key={idx}
                      className="relative group size-7 rounded-lg overflow-hidden border border-white/[0.08] bg-zinc-950 shrink-0"
                      title={`Уровень ${idx + 1}: ${name}`}
                    >
                      {isTalent ? (
                        <div className="size-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-[10px] font-black text-amber-300">
                          🌳
                        </div>
                      ) : icon ? (
                        <img src={icon} alt="" className="size-full object-cover" />
                      ) : (
                        <div className="size-full bg-zinc-800 flex items-center justify-center text-[9px] text-zinc-400 font-bold">
                          {idx + 1}
                        </div>
                      )}
                      <span className="absolute bottom-0 right-0 bg-zinc-950/80 text-[8px] font-mono text-zinc-300 px-0.5 leading-tight rounded-tl">
                        {idx + 1}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Exact Inventory Slots at Minute M (7 cols) */}
        <div className="lg:col-span-7 rounded-3xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-md p-5 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
            <div className="flex items-center gap-2">
              <div className="size-6 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-300">
                <Sparkles className="size-3.5" />
              </div>
              <h3 className="text-sm font-semibold tracking-tight text-white">
                Инвентарь героя на {currentMinute}:00
              </h3>
            </div>
            <span className="text-[11px] font-mono text-zinc-400">
              6 слотов • нейтралка • рюкзак
            </span>
          </div>

          {/* Authentic Dota 2 Inventory HUD */}
          <div className="flex flex-col items-center justify-center p-5 rounded-3xl bg-black/40 border border-white/[0.08] shadow-inner space-y-4">
            <DotaInventoryHud
              items={simulated?.inventory || []}
              backpack={simulated?.backpack || []}
              neutralItem={simulated?.neutralItem}
              hasShard={simulated?.hasShard}
              hasScepter={simulated?.hasScepter}
              size="lg"
              showBackpack={true}
              showNeutral={true}
              showAghs={true}
            />

            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-[11px] text-zinc-400 font-mono pt-1">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-amber-400" />
                6 основных слотов
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-purple-400" />
                Нейтральный слот
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-zinc-400" />
                Рюкзак (Backpack)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-sky-400" />
                Аганимы / Шард
              </span>
            </div>

            {/* Spirit Bear (Lone Druid additional_units) if present */}
            {selectedPlayer.additional_units && selectedPlayer.additional_units.length > 0 && (
              <div className="w-full pt-4 border-t border-white/[0.06] flex flex-col items-center gap-2.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
                  <span>🐻 Инвентарь медведя (Spirit Bear)</span>
                </div>
                {selectedPlayer.additional_units.map((unit, uIdx) => (
                  <DotaInventoryHud
                    key={uIdx}
                    items={[unit.item_0, unit.item_1, unit.item_2, unit.item_3, unit.item_4, unit.item_5]}
                    backpack={[unit.backpack_0, unit.backpack_1, unit.backpack_2]}
                    neutralItem={unit.item_neutral}
                    showAghs={false}
                    size="md"
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 4. Purchase Log Up to Current Minute ─────────────────────── */}
      <div className="rounded-3xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-md p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-300">
              <Coins className="size-3.5" />
            </div>
            <h4 className="text-sm font-semibold tracking-tight text-white">
              История покупок до {currentMinute}:00 ({simulated?.purchasesUpToTime.length ?? 0})
            </h4>
          </div>
          <span className="text-[10px] text-zinc-400 font-mono">
            Хронологический порядок
          </span>
        </div>

        {(!simulated?.purchasesUpToTime || simulated.purchasesUpToTime.length === 0) ? (
          <div className="text-xs text-zinc-500 italic py-2">
            Покупок до этой минуты не зафиксировано
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1 scrollbar-none">
            {simulated.purchasesUpToTime.map((p, idx) => {
              const isRecent = p.time >= targetTimeSec - 60 && p.time <= targetTimeSec;
              return (
                <div
                  key={idx}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs transition ${
                    isRecent
                      ? "bg-amber-400/20 border-amber-400 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.3)] animate-pulse"
                      : "bg-white/[0.03] border-white/[0.06] text-zinc-300"
                  }`}
                >
                  <span className="font-mono text-[10px] text-zinc-400 font-bold">
                    {fmtGameTime(p.time)}
                  </span>
                  {p.item.icon ? (
                    <img src={p.item.icon} alt="" className="size-5 rounded-md object-cover" />
                  ) : null}
                  <span className="font-semibold truncate max-w-[120px]">{p.item.name}</span>
                  {isRecent && (
                    <span className="text-[9px] font-bold uppercase bg-amber-400 text-zinc-950 px-1.5 py-0.5 rounded-full">
                      Куплено сейчас
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
