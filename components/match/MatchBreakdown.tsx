"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  Coins,
  Swords,
  Shield,
  Zap,
  TrendingUp,
  Sliders,
  Moon,
  Sun,
  Flame,
  CheckCircle2,
  XCircle,
  Users,
  Sparkles,
  Layers,
  Crosshair,
  Award,
  Trophy,
  Copy,
  Check,
} from "lucide-react";
import {
  type FullMatchDetails,
  type MatchPlayerDetail,
  type OpenDotaHero,
  heroIconUrl,
  getItemIconUrl,
  getItemName,
  getItemCost,
} from "@/lib/opendota";
import { resolveItemKey, type ResolvedItem, resolveItemWithStackCount } from "@/lib/item-utils";
import { RankMedal } from "@/components/ui/RankMedal";
import { getRankInfo, rankTierToString } from "@/lib/ranks";
import {
  getHeroAbilities,
  getAbilityIconUrl,
  getAbilityDname,
} from "@/lib/ability-utils";
import { MinutePlayerInspector } from "./MinutePlayerInspector";
import { StratzCharts } from "./StratzCharts";
import { StratzMatchupHeroCard } from "./StratzMatchupHeroCard";
import { ItemTimingsView } from "./ItemTimingsView";
import { SkillMatrixView } from "./SkillMatrixView";
import { DamageBreakdownView } from "./DamageBreakdownView";
import { getPlayerSlotInfo } from "@/lib/positions";
import { DotaInventoryHud } from "@/components/ui/DotaInventoryHud";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";

interface MatchBreakdownProps {
  match: FullMatchDetails;
  heroes: OpenDotaHero[];
  initialTab?: string;
  initialHeroId?: number;
}

function safeNum(v: number | null | undefined, fallback = 0): number {
  if (v === null || v === undefined || isNaN(v) || !isFinite(v)) return fallback;
  return v;
}

function safeDiv(a: number, b: number, fallback = 0): number {
  if (!b || isNaN(b) || isNaN(a)) return fallback;
  return a / b;
}

function fmt(secs: number) {
  const m = Math.floor(Math.max(0, secs) / 60);
  const s = Math.floor(Math.max(0, secs)) % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function fmtGameTime(sec: number) {
  const sign = sec < 0 ? "-" : "";
  const abs = Math.abs(sec);
  const m = Math.floor(abs / 60);
  const s = abs % 60;
  return `${sign}${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// Position labels & styling matching Stratz
const POS_INFO: Record<number, { roman: string; name: string; icon: string; color: string; bg: string }> = {
  1: { roman: "I", name: "Керри", icon: "⚔️", color: "text-sky-400", bg: "bg-sky-500/10 border-sky-500/30" },
  2: { roman: "II", name: "Мид", icon: "⚡", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/30" },
  3: { roman: "III", name: "Оффлейн", icon: "🛡️", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30" },
  4: { roman: "IV", name: "Поддержка", icon: "🌱", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30" },
  5: { roman: "V", name: "Полная поддержка", icon: "👁️", color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/30" },
};

function parseBuildingStatus(
  tRadiant?: number,
  tDire?: number,
  bRadiant?: number,
  bDire?: number
) {
  const parseTowers = (mask: number) => ({
    top: [Boolean(mask & (1 << 0)), Boolean(mask & (1 << 1)), Boolean(mask & (1 << 2))],
    mid: [Boolean(mask & (1 << 3)), Boolean(mask & (1 << 4)), Boolean(mask & (1 << 5))],
    bot: [Boolean(mask & (1 << 6)), Boolean(mask & (1 << 7)), Boolean(mask & (1 << 8))],
    throne: [Boolean(mask & (1 << 9)), Boolean(mask & (1 << 10))],
  });

  return {
    radiant: {
      towers: parseTowers(tRadiant ?? 0),
      aliveCount: (tRadiant ?? 0).toString(2).replace(/0/g, "").length,
    },
    dire: {
      towers: parseTowers(tDire ?? 0),
      aliveCount: (tDire ?? 0).toString(2).replace(/0/g, "").length,
    },
  };
}

export function MatchBreakdown({
  match,
  heroes,
  initialTab = "matchup",
  initialHeroId,
}: MatchBreakdownProps) {
  const [currentMatch, setCurrentMatch] = useState<FullMatchDetails>(match);
  const [activeTab, setActiveTab] = useState<string>(() => {
    return initialTab ?? "matchup";
  });
  const [chartMode, setChartMode] = useState<"gold" | "xp">("gold");
  const [currentMinute, setCurrentMinute] = useState<number>(() => Math.floor(match.duration / 60));
  const [selectedPlayerSlot, setSelectedPlayerSlot] = useState<number>(() => {
    if (initialHeroId) {
      const found = match.players.find((p) => p.hero_id === initialHeroId);
      if (found) return found.player_slot;
    }
    return match.players[0]?.player_slot ?? 0;
  });
  const [copiedId, setCopiedId] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);

  // Background live update if match replay was not yet parsed
  useEffect(() => {
    if (currentMatch.is_parsed) return;

    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/matches/${currentMatch.match_id}`);
        if (!res.ok) return;
        const fresh = await res.json();
        if (fresh && fresh.is_parsed && isMounted) {
          setCurrentMatch((prev) => ({ ...prev, ...fresh, is_parsed: true }));
        }
      } catch {}
    }, 15000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [currentMatch.is_parsed, currentMatch.match_id]);

  const heroMap = useMemo(() => new Map(heroes.map((h) => [h.id, h])), [heroes]);

  const matchTabs = useMemo(() => [
    { id: "matchup", label: "⚔️ Противостояние" },
    { id: "timings", label: "⏱️ Тайминги предметов" },
    { id: "skills", label: "⚡ Прокачка скиллов" },
    { id: "damage", label: "💥 Розбивка урона" },
    { id: "charts", label: "📈 Графики преимуществ" },
    { id: "scoreboard", label: "📊 Таблица счёта" },
    { id: "timeline", label: "🎮 Поминутный плеер" },
    ...(currentMatch.picks_bans && currentMatch.picks_bans.length > 0 ? [{ id: "draft", label: "🎯 Драфт" }] : []),
  ], [currentMatch.picks_bans]);

  const [scoreboardSort, setScoreboardSort] = useState<"slot" | "networth" | "kda" | "damage">("slot");

  const radiantPlayers = useMemo(() => {
    const list = [...currentMatch.players.filter((p) => p.isRadiant)];
    if (scoreboardSort === "networth") return list.sort((a, b) => safeNum(b.net_worth) - safeNum(a.net_worth));
    if (scoreboardSort === "kda") return list.sort((a, b) => safeDiv(b.kills + b.assists, Math.max(1, b.deaths)) - safeDiv(a.kills + a.assists, Math.max(1, a.deaths)));
    if (scoreboardSort === "damage") return list.sort((a, b) => safeNum(b.hero_damage) - safeNum(a.hero_damage));
    return list.sort((a, b) => a.player_slot - b.player_slot);
  }, [currentMatch.players, scoreboardSort]);

  const direPlayers = useMemo(() => {
    const list = [...currentMatch.players.filter((p) => !p.isRadiant)];
    if (scoreboardSort === "networth") return list.sort((a, b) => safeNum(b.net_worth) - safeNum(a.net_worth));
    if (scoreboardSort === "kda") return list.sort((a, b) => safeDiv(b.kills + b.assists, Math.max(1, b.deaths)) - safeDiv(a.kills + a.assists, Math.max(1, a.deaths)));
    if (scoreboardSort === "damage") return list.sort((a, b) => safeNum(b.hero_damage) - safeNum(a.hero_damage));
    return list.sort((a, b) => a.player_slot - b.player_slot);
  }, [currentMatch.players, scoreboardSort]);

  const totalRadiantNw = useMemo(() => radiantPlayers.reduce((a, b) => a + safeNum(b.net_worth), 0), [radiantPlayers]);
  const totalDireNw = useMemo(() => direPlayers.reduce((a, b) => a + safeNum(b.net_worth), 0), [direPlayers]);
  const totalRadiantDmg = useMemo(() => radiantPlayers.reduce((a, b) => a + safeNum(b.hero_damage), 0), [radiantPlayers]);
  const totalDireDmg = useMemo(() => direPlayers.reduce((a, b) => a + safeNum(b.hero_damage), 0), [direPlayers]);
  const maxHeroDmg = useMemo(() => Math.max(1, ...currentMatch.players.map((p) => safeNum(p.hero_damage))), [currentMatch.players]);

  const buildingStatus = useMemo(
    () =>
      parseBuildingStatus(
        currentMatch.tower_status_radiant,
        currentMatch.tower_status_dire,
        currentMatch.barracks_status_radiant,
        currentMatch.barracks_status_dire
      ),
    [currentMatch.tower_status_radiant, currentMatch.tower_status_dire, currentMatch.barracks_status_radiant, currentMatch.barracks_status_dire]
  );

  const advData = chartMode === "gold" ? currentMatch.radiant_gold_adv : currentMatch.radiant_xp_adv;
  const maxAdv = Math.max(1, ...(advData || []).map((v) => Math.abs(v)));
  const finalAdv = (advData || []).length > 0 ? advData[advData.length - 1] : 0;

  const handleCopyId = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(String(match.match_id));
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const avgRankInfo = match.average_mmr ? getRankInfo(match.average_mmr) : null;



  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans antialiased selection:bg-zinc-800 selection:text-white">
      <SiteHeader currentPath={`/match/${match.match_id}`} />

      {/* ── Match Navigation & Tabs Subheader ── */}
      <div className="sticky top-[57px] z-40 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-2xl px-4 py-2.5 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center justify-between sm:justify-start gap-3 shrink-0">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 px-3.5 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white transition"
            >
              <ArrowLeft className="size-3.5" /> Главная
            </Link>
            <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono flex-wrap">
              <span className="font-semibold text-white">Матч #{match.match_id}</span>
              <span>•</span>
              <span className="text-amber-300 font-bold">{fmt(match.duration)}</span>
            </div>
          </div>

          {/* Segmented Control Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none p-1 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-xl">
            {matchTabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === t.id
                    ? "bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/60"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1">

      {/* ── Unparsed Replay Live Status Banner ── */}
      {!currentMatch.is_parsed && (
        <div className="mx-auto max-w-7xl px-4 pt-3 sm:px-6">
          <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 backdrop-blur-md">
            <div className="flex items-center gap-2.5">
              <span className="relative flex size-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full size-2.5 bg-amber-500"></span>
              </span>
              <span>Реплей матча обрабатывается парсером Valve / OpenDota. Подробные тайминги предметов, матрица способностей и урон обновятся на этой странице автоматически без перезагрузки.</span>
            </div>
            <span className="text-[10px] font-mono font-bold bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30 shrink-0">
              Синхронизация...
            </span>
          </div>
        </div>
      )}

      {/* ── Match Banner Card ─────────────────────────────────── */}
      <section className="px-4 py-5 sm:px-6 max-w-7xl mx-auto w-full">
        <div className="rounded-3xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-md p-5 sm:p-7 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            {/* Radiant Side Header */}
            <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
              <div className="flex items-center gap-3.5">
                <div className="size-13 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-400 text-xl shadow-lg shadow-emerald-950/30">
                  С
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-lg sm:text-xl font-bold text-emerald-400 tracking-tight">Силы Света</span>
                    {currentMatch.radiant_win && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        ПОБЕДА
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-zinc-400 font-mono">
                    The Radiant • <span className="text-amber-300 font-semibold">{totalRadiantNw.toLocaleString()}</span> 🪙
                  </div>
                </div>
              </div>
            </div>

            {/* Score & Duration Display (Apple Sports Style) */}
            <div className="flex flex-col items-center text-center">
              <div className="flex items-center gap-4 font-mono font-black text-4xl sm:text-5xl tracking-tight">
                <span className="text-emerald-400 drop-shadow">{currentMatch.radiant_score}</span>
                <span className="text-zinc-600 text-3xl font-sans font-normal">:</span>
                <span className="text-rose-400 drop-shadow">{currentMatch.dire_score}</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono font-semibold text-zinc-300 mt-2 bg-zinc-800 border border-zinc-700/60 rounded-full px-3.5 py-1">
                {currentMatch.duration < 1800 ? <Sun className="size-3.5 text-amber-300" /> : <Moon className="size-3.5 text-indigo-400" />}
                <span>{fmt(currentMatch.duration)}</span>
              </div>
            </div>

            {/* Dire Side Header */}
            <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
              <div className="flex items-center gap-3.5 sm:flex-row-reverse text-left sm:text-right">
                <div className="size-13 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center font-bold text-rose-400 text-xl shadow-lg shadow-rose-950/30">
                  Т
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 sm:justify-end">
                    {!currentMatch.radiant_win && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        ПОБЕДА
                      </span>
                    )}
                    <span className="text-lg sm:text-xl font-bold text-rose-400 tracking-tight">Силы Тьмы</span>
                  </div>
                  <div className="text-xs text-zinc-400 font-mono">
                    <span className="text-amber-300 font-semibold">{totalDireNw.toLocaleString()}</span> 🪙 • The Dire
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Subheader bar with Match Metadata Pills */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-4 border-t border-zinc-800/80 text-xs text-zinc-400">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-xl bg-zinc-800/60 border border-zinc-700/60 text-zinc-200 font-medium">
                {currentMatch.game_mode_name}
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-zinc-800/60 border border-zinc-700/60 text-zinc-300">
                {currentMatch.region_name || "Сервер Valve"}
              </span>
              <button
                onClick={handleCopyId}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-zinc-800/60 border border-zinc-700/60 font-mono text-zinc-300 hover:text-white transition cursor-pointer"
                title="Скопировать ID матча"
              >
                <span>ID: {currentMatch.match_id}</span>
                {copiedId ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3 text-zinc-400" />}
              </button>
              <button
                onClick={() => {
                  if (typeof navigator !== "undefined" && navigator.clipboard) {
                    navigator.clipboard.writeText(`watch_server ${currentMatch.match_id}`);
                    setCopiedCmd(true);
                    setTimeout(() => setCopiedCmd(false), 2000);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-zinc-800/60 border border-zinc-700/60 font-mono text-zinc-300 hover:text-white transition cursor-pointer"
                title="Скопировать команду watch_server в консоль игры Dota 2"
              >
                <span>watch_server {currentMatch.match_id}</span>
                {copiedCmd ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3 text-zinc-400" />}
              </button>
              {avgRankInfo && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-300 font-semibold">
                  <RankMedal rankInfo={avgRankInfo} size="xs" />
                  <span>{avgRankInfo.name} {avgRankInfo.stars ? `${avgRankInfo.stars}★` : ""}</span>
                </div>
              )}
            </div>

            <div className="font-mono text-zinc-400 text-xs">
              {new Date(currentMatch.start_time * 1000).toLocaleDateString("ru-RU", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Main Content Container ───────────────────────────────── */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-8">

        {/* ══════════════════════════════════════════════════════════
            1. ПРОТИВОСТОЯНИЕ (Stratz Matchup Hero Card)
        ══════════════════════════════════════════════════════════ */}
        {activeTab === "matchup" && (
          <section id="matchup" className="space-y-6">
            <StratzMatchupHeroCard
              match={currentMatch}
              heroes={heroes}
              selectedSlot={selectedPlayerSlot}
              onSelectSlot={setSelectedPlayerSlot}
              onJumpToTimeline={(min) => {
                setCurrentMinute(min);
                setActiveTab("timeline");
              }}
            />
          </section>
        )}

        {/* ══════════════════════════════════════════════════════════
            2. ПОМИНУТНЫЙ РАЗБОР СЛОТОВ И ИНВЕНТАРЯ ИГРОКА
        ══════════════════════════════════════════════════════════ */}
        {activeTab === "timeline" && (
          <section id="timeline-inspector">
            <MinutePlayerInspector
              match={currentMatch}
              heroes={heroes}
              selectedSlot={selectedPlayerSlot}
              onSelectSlot={setSelectedPlayerSlot}
              currentMinute={currentMinute}
              onChangeMinute={setCurrentMinute}
            />
          </section>
        )}

        {/* ══════════════════════════════════════════════════════════
            3. ГРАФИКИ И ДИАГРАММЫ
        ══════════════════════════════════════════════════════════ */}
        {activeTab === "charts" && (
          <section id="charts">
            <StratzCharts
              match={currentMatch}
              heroes={heroes}
              currentMinute={currentMinute}
              onChangeMinute={setCurrentMinute}
              selectedSlot={selectedPlayerSlot}
              onSelectSlot={(slot) => {
                setSelectedPlayerSlot(slot);
                setActiveTab("timeline");
              }}
            />
          </section>
        )}

        {/* ══════════════════════════════════════════════════════════
            5. ДРАФТ (Picks & Bans)
        ══════════════════════════════════════════════════════════ */}
        {activeTab === "draft" && currentMatch.picks_bans && currentMatch.picks_bans.length > 0 && (
          <section id="draft" className="rounded-3xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-md p-5 sm:p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div className="flex items-center gap-2">
                <div className="size-6 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Layers className="size-3.5" />
                </div>
                <h2 className="text-sm font-semibold tracking-tight text-white">Драфт матча</h2>
                <span className="text-[11px] text-zinc-500">Блокировки и выбор героев</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
              {/* Bans */}
              <div className="md:col-span-6 space-y-2">
                <div className="text-[11px] font-semibold text-zinc-400 tracking-tight">
                  Блокировки (Баны)
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {(currentMatch.picks_bans || []).filter((pb) => !pb.is_pick).map((pb, idx) => {
                    const hero = heroMap.get(pb.hero_id);
                    return (
                      <div
                        key={idx}
                        className="relative size-8 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 shrink-0"
                        title={hero ? `Забанен: ${hero.localized_name}` : "Бан"}
                      >
                        {hero ? (
                          <img
                            src={heroIconUrl(hero.name)}
                            alt=""
                            className="size-full object-cover grayscale opacity-50"
                          />
                        ) : null}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-full h-0.5 bg-rose-500/80 rotate-45 transform" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Picks */}
              <div className="md:col-span-6 space-y-2">
                <div className="text-[11px] font-semibold text-zinc-400 tracking-tight">
                  Порядок выбора (Пики)
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {(currentMatch.picks_bans || []).filter((pb) => pb.is_pick).map((pb, idx) => {
                    const hero = heroMap.get(pb.hero_id);
                    const isRadTeam = pb.team === 0;

                    return (
                      <div
                        key={idx}
                        className={`size-8 rounded-xl overflow-hidden border shrink-0 transition-transform hover:scale-105 ${
                          isRadTeam ? "border-emerald-500/40 bg-emerald-950/20" : "border-rose-500/40 bg-rose-950/20"
                        }`}
                        title={hero ? `${isRadTeam ? "Свет" : "Тьма"}: ${hero.localized_name}` : "Пик"}
                      >
                        {hero ? (
                          <img
                            src={heroIconUrl(hero.name)}
                            alt=""
                            className="size-full object-cover"
                          />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        )}


        {/* ══════════════════════════════════════════════════════════
            5. ТАЙМИНГИ ПРЕДМЕТОВ (Item Purchase Timings)
        ══════════════════════════════════════════════════════════ */}
        {activeTab === "timings" && (
          <section id="timings" className="space-y-4">
            <ItemTimingsView
              players={currentMatch.players}
              heroes={heroes}
              matchDuration={currentMatch.duration}
            />
          </section>
        )}

        {/* ══════════════════════════════════════════════════════════
            6. ПРОКАЧКА СПОСОБНОСТЕЙ (Skill Matrix Progression)
        ══════════════════════════════════════════════════════════ */}
        {activeTab === "skills" && (
          <section id="skills" className="space-y-4">
            <SkillMatrixView
              players={currentMatch.players}
              heroes={heroes}
            />
          </section>
        )}

        {/* ══════════════════════════════════════════════════════════
            7. РОЗБИВКА УРОНА (Damage Breakdown - Phys/Mag/Pure)
        ══════════════════════════════════════════════════════════ */}
        {activeTab === "damage" && (
          <section id="damage" className="space-y-4">
            <DamageBreakdownView
              players={currentMatch.players}
              heroes={heroes}
            />
          </section>
        )}


        {/* ══════════════════════════════════════════════════════════
            7. ДЕТАЛЬНЫЕ ДАННЫЕ ПО УБИЙСТВАМ (Kill Matrix)
        ══════════════════════════════════════════════════════════ */}
        {activeTab === "kills" && (
          <section id="kills" className="space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
              <div className="flex items-center gap-2">
                <div className="size-6 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                  <Crosshair className="size-3.5" />
                </div>
                <h2 className="text-sm font-semibold tracking-tight text-white">Детальные данные по убийствам</h2>
                <span className="text-[11px] text-zinc-500">Кто кого ликвидировал в ходе матча</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Radiant Kills against Dire Heroes */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400 w-fit">
                  <div className="size-1.5 rounded-full bg-emerald-400" />
                  <span>Убийства Сил Света</span>
                </div>
                {radiantPlayers.map((p) => {
                  const hero = heroMap.get(p.hero_id);
                  const playerName = p.personaname && p.personaname !== "Неизвестный игрок" ? p.personaname : (hero?.localized_name || "Игрок");
                  return (
                    <div
                      key={p.player_slot}
                      className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-md p-3 flex items-center justify-between gap-3 shadow-md"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="size-8 rounded-xl overflow-hidden border border-zinc-800 shrink-0">
                          {hero && <img src={heroIconUrl(hero.name)} alt="" className="size-full object-cover" />}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate">{playerName}</div>
                          <div className="text-[10px] text-emerald-400 font-bold font-mono">{p.kills} убийств</div>
                        </div>
                      </div>

                      {/* 5 Dire enemy hero kill counters */}
                      <div className="flex items-center gap-1.5">
                        {direPlayers.map((d) => {
                          const dHero = heroMap.get(d.hero_id);
                          const heroSlug = dHero?.name || "";
                          const killCount = (p.killed && heroSlug && p.killed[heroSlug]) ? p.killed[heroSlug] : 0;

                          return (
                            <div
                              key={d.player_slot}
                              className={`flex items-center gap-1 rounded-xl border px-1.5 py-0.5 ${
                                killCount > 0
                                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                                  : "bg-white/[0.02] border-white/[0.05] text-zinc-600 opacity-40"
                              }`}
                              title={`${dHero?.localized_name}: ${killCount} раз`}
                            >
                              <div className="size-5 rounded-lg overflow-hidden shrink-0">
                                {dHero && <img src={heroIconUrl(dHero.name)} alt="" className="size-full object-cover" />}
                              </div>
                              <span className="text-[11px] font-mono font-bold">{killCount}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Dire Kills against Radiant Heroes */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-xs font-semibold text-rose-400 w-fit">
                  <div className="size-1.5 rounded-full bg-rose-400" />
                  <span>Убийства Сил Тьмы</span>
                </div>
                {direPlayers.map((p) => {
                  const hero = heroMap.get(p.hero_id);
                  const playerName = p.personaname && p.personaname !== "Неизвестный игрок" ? p.personaname : (hero?.localized_name || "Игрок");
                  return (
                    <div
                      key={p.player_slot}
                      className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-md p-3 flex items-center justify-between gap-3 shadow-md"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="size-8 rounded-xl overflow-hidden border border-zinc-800 shrink-0">
                          {hero && <img src={heroIconUrl(hero.name)} alt="" className="size-full object-cover" />}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate">{playerName}</div>
                          <div className="text-[10px] text-rose-400 font-bold font-mono">{p.kills} убийств</div>
                        </div>
                      </div>

                      {/* 5 Radiant enemy hero kill counters */}
                      <div className="flex items-center gap-1.5">
                        {radiantPlayers.map((r) => {
                          const rHero = heroMap.get(r.hero_id);
                          const heroSlug = rHero?.name || "";
                          const killCount = (p.killed && heroSlug && p.killed[heroSlug]) ? p.killed[heroSlug] : 0;

                          return (
                            <div
                              key={r.player_slot}
                              className={`flex items-center gap-1 rounded-xl border px-1.5 py-0.5 ${
                                killCount > 0
                                  ? "bg-rose-500/20 border-rose-500/40 text-rose-300"
                                  : "bg-white/[0.02] border-white/[0.05] text-zinc-600 opacity-40"
                              }`}
                              title={`${rHero?.localized_name}: ${killCount} раз`}
                            >
                              <div className="size-5 rounded-lg overflow-hidden shrink-0">
                                {rHero && <img src={heroIconUrl(rHero.name)} alt="" className="size-full object-cover" />}
                              </div>
                              <span className="text-[11px] font-mono font-bold">{killCount}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}


        {/* ══════════════════════════════════════════════════════════
            8. ПОЛНОРАЗМЕРНАЯ ТАБЛИЦА СЧЁТА (Scoreboard)
        ══════════════════════════════════════════════════════════ */}
        {activeTab === "scoreboard" && (
        <section id="scoreboard" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
            <div className="flex items-center gap-2">
              <div className="size-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Trophy className="size-3.5" />
              </div>
              <h2 className="text-sm font-semibold tracking-tight text-white">Таблица счёта матча</h2>
              <span className="text-[11px] text-zinc-500">Подробные показатели 10 игроков</span>
            </div>

            {/* Scoreboard Sorting controls */}
            <div className="flex items-center gap-1 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800 text-[11px] overflow-x-auto scrollbar-none">
              <span className="text-zinc-500 px-2 font-mono text-[10px] hidden sm:inline">Сортировка:</span>
              <button
                onClick={() => setScoreboardSort("slot")}
                className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer whitespace-nowrap ${
                  scoreboardSort === "slot" ? "bg-zinc-800 text-white shadow-sm border border-zinc-700" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                🎮 По слотам (1-5)
              </button>
              <button
                onClick={() => setScoreboardSort("networth")}
                className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer whitespace-nowrap ${
                  scoreboardSort === "networth" ? "bg-zinc-800 text-amber-300 shadow-sm border border-zinc-700" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                🪙 По золоту
              </button>
              <button
                onClick={() => setScoreboardSort("kda")}
                className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer whitespace-nowrap ${
                  scoreboardSort === "kda" ? "bg-zinc-800 text-white shadow-sm border border-zinc-700" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                ⚔️ По KDA
              </button>
              <button
                onClick={() => setScoreboardSort("damage")}
                className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer whitespace-nowrap ${
                  scoreboardSort === "damage" ? "bg-zinc-800 text-rose-300 shadow-sm border border-zinc-700" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                💥 По урону
              </button>
            </div>
          </div>

          {/* Radiant Table */}
          <div className="rounded-3xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-md shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500/15 via-zinc-800/20 to-transparent px-4 sm:px-6 py-3.5 border-b border-zinc-800/80 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="size-2 rounded-full bg-emerald-400" />
                <span className="font-semibold text-white text-sm">Силы Света (The Radiant)</span>
                {currentMatch.radiant_win && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    ПОБЕДИТЕЛЬ
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-xs font-mono text-zinc-300">
                <span>Фрагов: <strong className="text-emerald-400 font-bold">{currentMatch.radiant_score}</strong></span>
                <span>Золото: <strong className="text-amber-300 font-bold">{totalRadiantNw.toLocaleString()}</strong> 🪙</span>
                <span>Урон: <strong className="text-white font-bold">{totalRadiantDmg.toLocaleString()}</strong></span>
              </div>
            </div>

            <div className="overflow-x-auto scrollbar-none">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-zinc-900 text-[10px] uppercase tracking-wider text-zinc-400 font-semibold border-b border-zinc-800/80">
                  <tr>
                    <th className="py-3 px-3 sm:px-4 sticky left-0 z-20 bg-zinc-900 shadow-[2px_0_10px_rgba(0,0,0,0.5)]">Игрок / Слот / Герой</th>
                    <th className="py-3 px-3 text-center">K / D / A</th>
                    <th className="py-3 px-3 text-right">Нетворс</th>
                    <th className="py-3 px-2 text-center">GPM / XPM</th>
                    <th className="py-3 px-2 text-center">CS / DN</th>
                    <th className="py-3 px-3">Урон</th>
                    <th className="py-3 px-2 text-right">Вышки</th>
                    <th className="py-3 px-3">Инвентарь</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {radiantPlayers.map((p) => {
                    const hero = heroMap.get(p.hero_id);
                    const slotInfo = getPlayerSlotInfo(p.player_slot);
                    const rankInfo = p.rank_tier ? getRankInfo(p.rank_tier) : null;
                    const kda = safeDiv(p.kills + p.assists, Math.max(1, p.deaths)).toFixed(1);
                    const items = [p.item_0, p.item_1, p.item_2, p.item_3, p.item_4, p.item_5].map((id) =>
                      id && id > 0 ? resolveItemWithStackCount(id, p.purchase_log, p.obs_placed, p.sen_placed, undefined, match.duration) : null
                    );
                    const backpack = [p.backpack_0, p.backpack_1, p.backpack_2].map((id) =>
                      id && id > 0 ? resolveItemWithStackCount(id, p.purchase_log, p.obs_placed, p.sen_placed, undefined, match.duration) : null
                    );
                    const dmgPercent = Math.min(100, Math.round((safeNum(p.hero_damage) / maxHeroDmg) * 100));

                    return (
                      <tr key={p.player_slot} className="hover:bg-zinc-800/30 transition group">
                        <td className="py-2.5 px-3 sm:px-4 sticky left-0 z-10 bg-zinc-900 shadow-[2px_0_10px_rgba(0,0,0,0.5)]">
                          <div className="flex items-center gap-2.5">
                            {/* Official Valve Slot Accent Line */}
                            <div
                              className="w-1 h-9 rounded-full shrink-0"
                              style={{ backgroundColor: slotInfo.hex }}
                              title={`Слот ${slotInfo.slotNumber}: ${slotInfo.name}`}
                            />
                            <div className="relative shrink-0">
                              {hero ? (
                                <img
                                  src={heroIconUrl(hero.name)}
                                  alt=""
                                  className="size-9 rounded-lg border border-zinc-700 object-cover group-hover:scale-105 transition"
                                />
                              ) : (
                                <div className="size-9 rounded-lg bg-zinc-800" />
                              )}
                              <span className="absolute -bottom-1 -right-1 size-4 rounded bg-zinc-900 border border-zinc-700 text-[9px] font-black text-white flex items-center justify-center">
                                {p.level}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                {p.account_id ? (
                                  <Link
                                    href={`/player/${p.account_id}`}
                                    className="font-bold text-white hover:text-emerald-400 transition truncate max-w-[130px]"
                                    title={p.personaname || hero?.localized_name}
                                  >
                                    {p.personaname && p.personaname !== "Неизвестный игрок" ? p.personaname : (hero?.localized_name || "Игрок")}
                                  </Link>
                                ) : (
                                  <span className="font-bold text-zinc-300 truncate max-w-[130px]" title={p.personaname || hero?.localized_name}>
                                    {p.personaname && p.personaname !== "Неизвестный игрок" ? p.personaname : (hero?.localized_name || "Игрок")}
                                  </span>
                                )}
                                {rankInfo && <RankMedal rankInfo={rankInfo} size="xs" />}
                              </div>
                              <div className="text-[10px] text-zinc-400 flex items-center gap-1.5">
                                <span className="font-mono font-bold" style={{ color: slotInfo.hex }}>
                                  #{slotInfo.slotNumber}
                                </span>
                                <span>•</span>
                                <span>{hero?.localized_name ?? `Герой #${p.hero_id}`}</span>
                                {rankInfo ? ` • ${rankInfo.name}` : ""}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-2.5 px-3 text-center font-mono">
                          <div className="font-bold text-xs">
                            <span className="text-emerald-400">{p.kills}</span>
                            <span className="text-zinc-600"> / </span>
                            <span className="text-red-400">{p.deaths}</span>
                            <span className="text-zinc-600"> / </span>
                            <span className="text-sky-400">{p.assists}</span>
                          </div>
                          <span className="text-[10px] text-zinc-500">{kda} KDA</span>
                        </td>

                        <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-400">
                          {p.net_worth?.toLocaleString() ?? "—"}
                        </td>

                        <td className="py-2.5 px-2 text-center font-mono text-zinc-300 text-[11px]">
                          {p.gold_per_min} / {p.xp_per_min}
                        </td>

                        <td className="py-2.5 px-2 text-center font-mono text-zinc-300 text-[11px]">
                          {p.last_hits} / {p.denies}
                        </td>

                        <td className="py-2.5 px-3">
                          <div className="w-24 space-y-1">
                            <div className="font-mono text-xs font-bold text-white flex justify-between">
                              <span>{p.hero_damage?.toLocaleString() ?? "0"}</span>
                              <span className="text-[10px] text-zinc-500">{dmgPercent}%</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${dmgPercent}%` }} />
                            </div>
                          </div>
                        </td>

                        <td className="py-2.5 px-2 text-right font-mono text-zinc-400 text-[11px]">
                          {p.tower_damage ? p.tower_damage.toLocaleString() : "0"}
                        </td>

                        <td className="py-2 px-3">
                          <div className="space-y-1.5">
                            <DotaInventoryHud
                              items={items}
                              backpack={backpack}
                              neutralItem={p.item_neutral}
                              hasScepter={p.aghanims_scepter === 1}
                              hasShard={p.aghanims_shard === 1}
                              layout="row"
                              size="sm"
                            />
                            {p.additional_units && p.additional_units.length > 0 && p.additional_units.map((unit, uIdx) => (
                              <div key={uIdx} className="flex items-center gap-1.5 pt-1 border-t border-white/[0.05]">
                                <span className="text-[9px] font-bold text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 shrink-0" title={unit.unitname}>
                                  🐻 Медведь
                                </span>
                                <DotaInventoryHud
                                  items={[unit.item_0, unit.item_1, unit.item_2, unit.item_3, unit.item_4, unit.item_5]}
                                  backpack={[unit.backpack_0, unit.backpack_1, unit.backpack_2]}
                                  neutralItem={unit.item_neutral}
                                  showAghs={false}
                                  size="xs"
                                />
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Dire Table */}
          <div className="rounded-3xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-md shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-rose-500/15 via-zinc-800/20 to-transparent px-4 sm:px-6 py-3.5 border-b border-zinc-800/80 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="size-2 rounded-full bg-rose-400" />
                <span className="font-semibold text-white text-sm">Силы Тьмы (The Dire)</span>
                {!currentMatch.radiant_win && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-red-300 border border-rose-500/30">
                    ПОБЕДИТЕЛЬ
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-xs font-mono text-zinc-300">
                <span>Фрагов: <strong className="text-rose-400 font-bold">{currentMatch.dire_score}</strong></span>
                <span>Золото: <strong className="text-amber-300 font-bold">{totalDireNw.toLocaleString()}</strong> 🪙</span>
                <span>Урон: <strong className="text-white font-bold">{totalDireDmg.toLocaleString()}</strong></span>
              </div>
            </div>

            <div className="overflow-x-auto scrollbar-none">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-zinc-900 text-[10px] uppercase tracking-wider text-zinc-400 font-semibold border-b border-zinc-800/80">
                  <tr>
                    <th className="py-3 px-3 sm:px-4 sticky left-0 z-20 bg-zinc-900 shadow-[2px_0_10px_rgba(0,0,0,0.5)]">Игрок / Слот / Герой</th>
                    <th className="py-3 px-3 text-center">K / D / A</th>
                    <th className="py-3 px-3 text-right">Нетворс</th>
                    <th className="py-3 px-2 text-center">GPM / XPM</th>
                    <th className="py-3 px-2 text-center">CS / DN</th>
                    <th className="py-3 px-3">Урон</th>
                    <th className="py-3 px-2 text-right">Вышки</th>
                    <th className="py-3 px-3">Инвентарь</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {direPlayers.map((p) => {
                    const hero = heroMap.get(p.hero_id);
                    const slotInfo = getPlayerSlotInfo(p.player_slot);
                    const rankInfo = p.rank_tier ? getRankInfo(p.rank_tier) : null;
                    const kda = safeDiv(p.kills + p.assists, Math.max(1, p.deaths)).toFixed(1);
                    const items = [p.item_0, p.item_1, p.item_2, p.item_3, p.item_4, p.item_5].map((id) =>
                      id && id > 0 ? resolveItemWithStackCount(id, p.purchase_log, p.obs_placed, p.sen_placed, undefined, match.duration) : null
                    );
                    const backpack = [p.backpack_0, p.backpack_1, p.backpack_2].map((id) =>
                      id && id > 0 ? resolveItemWithStackCount(id, p.purchase_log, p.obs_placed, p.sen_placed, undefined, match.duration) : null
                    );
                    const dmgPercent = Math.min(100, Math.round((safeNum(p.hero_damage) / maxHeroDmg) * 100));

                    return (
                      <tr key={p.player_slot} className="hover:bg-zinc-800/30 transition group">
                        <td className="py-2.5 px-3 sm:px-4 sticky left-0 z-10 bg-zinc-900 shadow-[2px_0_10px_rgba(0,0,0,0.5)]">
                          <div className="flex items-center gap-2.5">
                            {/* Official Valve Slot Accent Line */}
                            <div
                              className="w-1 h-9 rounded-full shrink-0"
                              style={{ backgroundColor: slotInfo.hex }}
                              title={`Слот ${slotInfo.slotNumber}: ${slotInfo.name}`}
                            />
                            <div className="relative shrink-0">
                              {hero ? (
                                <img
                                  src={heroIconUrl(hero.name)}
                                  alt=""
                                  className="size-9 rounded-lg border border-zinc-700 object-cover group-hover:scale-105 transition"
                                />
                              ) : (
                                <div className="size-9 rounded-lg bg-zinc-800" />
                              )}
                              <span className="absolute -bottom-1 -right-1 size-4 rounded bg-zinc-900 border border-zinc-700 text-[9px] font-black text-white flex items-center justify-center">
                                {p.level}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                {p.account_id ? (
                                  <Link
                                    href={`/player/${p.account_id}`}
                                    className="font-bold text-white hover:text-red-400 transition truncate max-w-[130px]"
                                    title={p.personaname || hero?.localized_name}
                                  >
                                    {p.personaname && p.personaname !== "Неизвестный игрок" ? p.personaname : (hero?.localized_name || "Игрок")}
                                  </Link>
                                ) : (
                                  <span className="font-bold text-zinc-300 truncate max-w-[130px]" title={p.personaname || hero?.localized_name}>
                                    {p.personaname && p.personaname !== "Неизвестный игрок" ? p.personaname : (hero?.localized_name || "Игрок")}
                                  </span>
                                )}
                                {rankInfo && <RankMedal rankInfo={rankInfo} size="xs" />}
                              </div>
                              <div className="text-[10px] text-zinc-400 flex items-center gap-1.5">
                                <span className="font-mono font-bold" style={{ color: slotInfo.hex }}>
                                  #{slotInfo.slotNumber}
                                </span>
                                <span>•</span>
                                <span>{hero?.localized_name ?? `Герой #${p.hero_id}`}</span>
                                {rankInfo ? ` • ${rankInfo.name}` : ""}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-2.5 px-3 text-center font-mono">
                          <div className="font-bold text-xs">
                            <span className="text-emerald-400">{p.kills}</span>
                            <span className="text-zinc-600"> / </span>
                            <span className="text-red-400">{p.deaths}</span>
                            <span className="text-zinc-600"> / </span>
                            <span className="text-sky-400">{p.assists}</span>
                          </div>
                          <span className="text-[10px] text-zinc-500">{kda} KDA</span>
                        </td>

                        <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-400">
                          {p.net_worth?.toLocaleString() ?? "—"}
                        </td>

                        <td className="py-2.5 px-2 text-center font-mono text-zinc-300 text-[11px]">
                          {p.gold_per_min} / {p.xp_per_min}
                        </td>

                        <td className="py-2.5 px-2 text-center font-mono text-zinc-300 text-[11px]">
                          {p.last_hits} / {p.denies}
                        </td>

                        <td className="py-2.5 px-3">
                          <div className="w-24 space-y-1">
                            <div className="font-mono text-xs font-bold text-white flex justify-between">
                              <span>{p.hero_damage?.toLocaleString() ?? "0"}</span>
                              <span className="text-[10px] text-zinc-500">{dmgPercent}%</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                              <div className="h-full rounded-full bg-red-500" style={{ width: `${dmgPercent}%` }} />
                            </div>
                          </div>
                        </td>

                        <td className="py-2.5 px-2 text-right font-mono text-zinc-400 text-[11px]">
                          {p.tower_damage ? p.tower_damage.toLocaleString() : "0"}
                        </td>

                        <td className="py-2 px-3">
                          <div className="space-y-1.5">
                            <DotaInventoryHud
                              items={items}
                              backpack={backpack}
                              neutralItem={p.item_neutral}
                              hasScepter={p.aghanims_scepter === 1}
                              hasShard={p.aghanims_shard === 1}
                              layout="row"
                              size="sm"
                            />
                            {p.additional_units && p.additional_units.length > 0 && p.additional_units.map((unit, uIdx) => (
                              <div key={uIdx} className="flex items-center gap-1.5 pt-1 border-t border-white/[0.05]">
                                <span className="text-[9px] font-bold text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 shrink-0" title={unit.unitname}>
                                  🐻 Медведь
                                </span>
                                <DotaInventoryHud
                                  items={[unit.item_0, unit.item_1, unit.item_2, unit.item_3, unit.item_4, unit.item_5]}
                                  backpack={[unit.backpack_0, unit.backpack_1, unit.backpack_2]}
                                  neutralItem={unit.item_neutral}
                                  showAghs={false}
                                  size="xs"
                                />
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
        )}

      </main>
      </div>

      <SiteFooter />
    </div>
  );
}
