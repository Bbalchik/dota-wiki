"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Sparkles, TrendingUp, Filter, Swords, Flame, Shield, Award, ArrowRight } from "lucide-react";
import { heroIconUrl, CURRENT_DOTA_PATCH, type OpenDotaHeroStat } from "@/lib/opendota";
import { HERO_DEFAULT_POS } from "@/lib/role-utils";
import { HERO_ROLE_WEIGHTS, POS_ROMAN, POS_NAME_RU, type DotaPosition } from "@/lib/positions";

interface HeroMetaShowcaseProps {
  heroes: OpenDotaHeroStat[];
}

const ATTR_CONFIG = {
  str: {
    label: "Сила",
    badge: "text-rose-400 bg-rose-500/10 border-rose-500/30",
    glow: "hover:border-rose-500/50 hover:shadow-[0_0_25px_rgba(244,63,94,0.18)]",
    topLine: "from-rose-500/60 via-rose-500/20 to-transparent",
  },
  agi: {
    label: "Ловкость",
    badge: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    glow: "hover:border-emerald-500/50 hover:shadow-[0_0_25px_rgba(16,185,129,0.18)]",
    topLine: "from-emerald-500/60 via-emerald-500/20 to-transparent",
  },
  int: {
    label: "Интеллект",
    badge: "text-sky-400 bg-sky-500/10 border-sky-500/30",
    glow: "hover:border-sky-500/50 hover:shadow-[0_0_25px_rgba(14,165,233,0.18)]",
    topLine: "from-sky-500/60 via-sky-500/20 to-transparent",
  },
  all: {
    label: "Универсал",
    badge: "text-purple-400 bg-purple-500/10 border-purple-500/30",
    glow: "hover:border-purple-500/50 hover:shadow-[0_0_25px_rgba(168,85,247,0.18)]",
    topLine: "from-purple-500/60 via-purple-500/20 to-transparent",
  },
};

const POS_BADGES: Record<number, { roman: string; color: string; label: string }> = {
  1: { roman: "I", color: "text-amber-400 border-amber-500/40 bg-amber-500/15", label: "Керри" },
  2: { roman: "II", color: "text-blue-400 border-blue-500/40 bg-blue-500/15", label: "Мидлейнер" },
  3: { roman: "III", color: "text-purple-400 border-purple-500/40 bg-purple-500/15", label: "Оффлейнер" },
  4: { roman: "IV", color: "text-cyan-400 border-cyan-500/40 bg-cyan-500/15", label: "Частичная" },
  5: { roman: "V", color: "text-emerald-400 border-emerald-500/40 bg-emerald-500/15", label: "Полная" },
};

export function HeroMetaShowcase({ heroes }: HeroMetaShowcaseProps) {
  const [posFilter, setPosFilter] = useState<number>(0);
  const [bracket, setBracket] = useState<"high" | "all">("high");
  const [sortBy, setSortBy] = useState<"winrate" | "picks">("winrate");

  const processedHeroes = useMemo(() => {
    return heroes.map((h) => {
      // Standard Ranked & All Pick picks (Brackets 1-8: Herald to Immortal)
      const pubPicks =
        (h["1_pick"] || 0) +
        (h["2_pick"] || 0) +
        (h["3_pick"] || 0) +
        (h["4_pick"] || 0) +
        (h["5_pick"] || 0) +
        (h["6_pick"] || 0) +
        (h["7_pick"] || 0) +
        (h["8_pick"] || 0);

      const pubWins =
        (h["1_win"] || 0) +
        (h["2_win"] || 0) +
        (h["3_win"] || 0) +
        (h["4_win"] || 0) +
        (h["5_win"] || 0) +
        (h["6_win"] || 0) +
        (h["7_win"] || 0) +
        (h["8_win"] || 0);

      const pubWinrate = pubPicks > 0 ? (pubWins / pubPicks) * 100 : 50;

      // Divine / Immortal (brackets 7 + 8)
      const highPicks = (h["7_pick"] || 0) + (h["8_pick"] || 0);
      const highWins = (h["7_win"] || 0) + (h["8_win"] || 0);
      const highWinrate = highPicks > 0 ? (highWins / highPicks) * 100 : pubWinrate;

      const activeWinrate = bracket === "high" ? highWinrate : pubWinrate;
      const activePicks = bracket === "high" ? highPicks : pubPicks;

      let tier: "S" | "A" | "B" | "C" | "D" = "B";
      if (activeWinrate >= 52.5) tier = "S";
      else if (activeWinrate >= 50.8) tier = "A";
      else if (activeWinrate >= 49.2) tier = "B";
      else if (activeWinrate >= 47.5) tier = "C";
      else tier = "D";

      const defaultPos = HERO_DEFAULT_POS[h.id] ?? 1;

      return {
        ...h,
        totalPicks: pubPicks,
        winrate: Number(pubWinrate.toFixed(1)),
        highWinrate: Number(highWinrate.toFixed(1)),
        activeWinrate: Number(activeWinrate.toFixed(1)),
        activePicks,
        proPicks: h.pro_pick || 0,
        pos: defaultPos,
        tier,
      };
    });
  }, [heroes, bracket]);

  const filtered = useMemo(() => {
    let list = processedHeroes;

    if (posFilter !== 0) {
      list = list.filter((h) => {
        const weights = HERO_ROLE_WEIGHTS[h.id];
        return (weights && weights[posFilter as DotaPosition] >= 50) || h.pos === posFilter;
      });
    }

    list.sort((a, b) => {
      if (sortBy === "winrate") {
        return b.activeWinrate - a.activeWinrate;
      }
      return b.activePicks - a.activePicks;
    });

    return list.slice(0, 12);
  }, [processedHeroes, posFilter, sortBy]);

  const posTabs = [
    { id: 0, label: "Все позиции", icon: "⚔️" },
    { id: 1, label: "Поз 1 · Керри", icon: "🗡️" },
    { id: 2, label: "Поз 2 · Мидлейнер", icon: "⚡" },
    { id: 3, label: "Поз 3 · Оффлейнер", icon: "🛡️" },
    { id: 4, label: "Поз 4 · Частичная поддержка", icon: "🌀" },
    { id: 5, label: "Поз 5 · Полная поддержка", icon: "🧪" },
  ];

  return (
    <div className="w-full space-y-5">
      {/* Header and Filter Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-[11px] font-bold">
              <Flame className="size-3 text-amber-400" />
              Патч {CURRENT_DOTA_PATCH} (2026)
            </span>
            <span className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Swords className="size-4 text-[#0A84FF]" />
              Тренды и Мета героев
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            {bracket === "high"
              ? "Статистика Divine & Immortal рангов (7k+ MMR) на основе сотен тысяч матчей"
              : "Общая статистика всех публичных матчей Dota 2"}
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Bracket switcher */}
          <div className="flex items-center gap-1 bg-zinc-900/80 border border-zinc-800/80 p-1 rounded-xl">
            <button
              onClick={() => setBracket("high")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                bracket === "high"
                  ? "bg-zinc-800 text-zinc-100 border border-zinc-700/60 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Immortal (7k+)
            </button>
            <button
              onClick={() => setBracket("all")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                bracket === "all"
                  ? "bg-zinc-800 text-zinc-100 border border-zinc-700/60 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Все ранги
            </button>
          </div>

          {/* Sort */}
          <button
            onClick={() => setSortBy(sortBy === "winrate" ? "picks" : "winrate")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white transition cursor-pointer border border-zinc-800/80 active:scale-95 shadow-sm"
          >
            <TrendingUp className="size-3.5 text-zinc-400" />
            <span>{sortBy === "winrate" ? "По винрейту" : "По пикам"}</span>
          </button>
        </div>
      </div>

      {/* Position Tabs (Motion Glider) */}
      <div className="flex flex-wrap items-center gap-1.5 bg-zinc-900/80 border border-zinc-800/80 p-1.5 rounded-2xl backdrop-blur-xl relative">
        {posTabs.map((tab) => {
          const isSelected = posFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setPosFilter(tab.id)}
              className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer z-10"
            >
              {isSelected && (
                <motion.div
                  layoutId="metaPosTabGlider"
                  className="absolute inset-0 rounded-xl bg-zinc-800 border border-zinc-700/60 shadow-sm"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <span className="relative z-10">{tab.icon}</span>
              <span
                className={`relative z-10 ${
                  isSelected ? "text-zinc-100 font-bold" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Hero Cards Grid (Minimalist Bento Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {filtered.map((hero) => {
          const isHighWin = hero.activeWinrate >= 52.5;
          const isLowWin = hero.activeWinrate <= 48;
          const winColor = isHighWin
            ? "text-emerald-400"
            : isLowWin
            ? "text-rose-400"
            : "text-zinc-300";

          const tierColor =
            hero.tier === "S"
              ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
              : hero.tier === "A"
              ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
              : hero.tier === "B"
              ? "bg-zinc-800 text-zinc-300 border-zinc-700"
              : hero.tier === "C"
              ? "bg-zinc-800/70 text-zinc-400 border-zinc-700/60"
              : "bg-rose-500/10 text-rose-300 border-rose-500/30";

          const attrStyle = ATTR_CONFIG[hero.primary_attr as keyof typeof ATTR_CONFIG] || ATTR_CONFIG.str;
          const posMeta = POS_BADGES[hero.pos] || POS_BADGES[1];

          return (
            <motion.div
              key={hero.id}
              whileHover={{ y: -2, scale: 1.01 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <Link
                href="/heroes"
                className="group relative flex flex-col justify-between rounded-2xl border border-zinc-800/80 bg-zinc-900/60 hover:bg-zinc-850/60 hover:border-zinc-700/60 backdrop-blur-xl p-3 shadow-sm transition-all duration-200 overflow-hidden"
              >
                {/* Subtle Attribute Gradient Accent Line */}
                <div
                  className={`absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r ${attrStyle.topLine}`}
                />

                {/* Top: Icon + Hero Name + Stratz Pos Chip + Tier */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5">
                    <div className="relative size-10 rounded-xl overflow-hidden border border-white/10 shrink-0 bg-zinc-900 group-hover:scale-105 transition-transform shadow-md">
                      <img
                        src={heroIconUrl(hero.name)}
                        alt={hero.localized_name}
                        className="size-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-xs text-white truncate group-hover:text-[#0A84FF] transition">
                        {hero.localized_name}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-black font-mono border ${tierColor}`}
                        >
                          {hero.tier}
                        </span>
                        <span
                          className={`px-1 py-0.2 rounded text-[8px] font-mono font-bold border ${posMeta.color}`}
                          title={`Позиция ${hero.pos}: ${posMeta.label}`}
                        >
                          {posMeta.roman}
                        </span>
                        <span className={`text-[9px] font-mono px-1 py-0.2 rounded border ${attrStyle.badge}`}>
                          {attrStyle.label.slice(0, 3)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom: Winrate bar + Manus Tabular Numbers */}
                <div className="space-y-1.5 pt-2 border-t border-white/[0.06] mt-2">
                  <div className="flex items-center justify-between text-[11px] font-mono tabular-nums">
                    <span className="text-zinc-400 font-sans text-[10px]">Винрейт</span>
                    <span className={`font-black ${winColor}`}>{hero.activeWinrate}%</span>
                  </div>

                  <div className="w-full h-1.5 rounded-full bg-zinc-800/80 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isHighWin
                          ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                          : isLowWin
                          ? "bg-rose-500"
                          : "bg-amber-400"
                      }`}
                      style={{
                        width: `${Math.min(100, Math.max(5, (hero.activeWinrate - 40) * 5))}%`,
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono tabular-nums pt-0.5">
                    <span>{Math.round(hero.activePicks / 1000)}k пиков</span>
                    {hero.proPicks > 0 && (
                      <span className="text-amber-400/90 font-semibold">Pro: {hero.proPicks}</span>
                    )}
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      <div className="text-center pt-2">
        <Link
          href="/heroes"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.06] hover:bg-[#0A84FF] text-white text-xs font-bold transition shadow-sm hover:shadow-[0_4px_16px_rgba(10,132,255,0.4)] active:scale-95"
        >
          <span>Открыть полный тир-лист всех 127 героев патча {CURRENT_DOTA_PATCH}</span>
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}
