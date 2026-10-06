"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Filter,
  Swords,
  TrendingUp,
  Shield,
  Sparkles,
  ChevronDown,
  Layers,
  Flame,
  Award,
  Crown,
  Database,
  ExternalLink,
  X,
  Zap,
  CheckCircle2,
  ArrowRight,
  BookOpen,
  Clock,
} from "lucide-react";
import { heroIconUrl, CURRENT_DOTA_PATCH, type OpenDotaHeroStat } from "@/lib/opendota";
import { HERO_DEFAULT_POS } from "@/lib/role-utils";
import { HERO_ROLE_WEIGHTS, type DotaPosition } from "@/lib/positions";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";

interface HeroesEncyclopediaViewProps {
  heroes: OpenDotaHeroStat[];
}

type BracketMode = "high" | "all" | "pro";
type TierLevel = "S" | "A" | "B" | "C" | "D";

interface ProcessedHero extends OpenDotaHeroStat {
  totalPicks: number;
  winrate: number;
  highWinrate: number;
  highPicks: number;
  proPicks: number;
  proWins: number;
  proWinrate: number;
  proBans: number;
  pos: number;
  activeWinrate: number;
  activePicks: number;
  tier: TierLevel;
}

const TIER_CONFIG: Record<
  TierLevel,
  {
    name: string;
    label: string;
    sub: string;
    badgeBg: string;
    textColor: string;
    borderColor: string;
    headerBg: string;
  }
> = {
  S: {
    name: "S-Tier",
    label: "S-Tier",
    sub: "Винрейт > 52.5%",
    badgeBg: "bg-amber-500/20",
    textColor: "text-amber-300",
    borderColor: "border-amber-400/50 shadow-[0_0_15px_rgba(251,191,36,0.2)]",
    headerBg: "from-amber-500/10 via-amber-500/5 to-transparent",
  },
  A: {
    name: "A-Tier",
    label: "A-Tier",
    sub: "Винрейт 50.8% – 52.5%",
    badgeBg: "bg-emerald-500/20",
    textColor: "text-emerald-300",
    borderColor: "border-emerald-500/40",
    headerBg: "from-emerald-500/10 via-emerald-500/5 to-transparent",
  },
  B: {
    name: "B-Tier",
    label: "B-Tier",
    sub: "Винрейт 49.2% – 50.7%",
    badgeBg: "bg-sky-500/20",
    textColor: "text-sky-300",
    borderColor: "border-sky-500/30",
    headerBg: "from-sky-500/10 via-sky-500/5 to-transparent",
  },
  C: {
    name: "C-Tier",
    label: "C-Tier",
    sub: "Винрейт 47.5% – 49.1%",
    badgeBg: "bg-orange-500/20",
    textColor: "text-orange-300",
    borderColor: "border-orange-500/30",
    headerBg: "from-orange-500/10 via-orange-500/5 to-transparent",
  },
  D: {
    name: "D-Tier",
    label: "D-Tier",
    sub: "Винрейт < 47.5%",
    badgeBg: "bg-rose-500/20",
    textColor: "text-rose-300",
    borderColor: "border-rose-500/30",
    headerBg: "from-rose-500/10 via-rose-500/5 to-transparent",
  },
};

const POS_TABS = [
  { id: 0, label: "Все позиции", icon: "⚔️" },
  { id: 1, label: "Позиция 1 · Керри", icon: "🗡️" },
  { id: 2, label: "Позиция 2 · Мидлейнер", icon: "⚡" },
  { id: 3, label: "Позиция 3 · Оффлейнер", icon: "🛡️" },
  { id: 4, label: "Позиция 4 · Частичная поддержка", icon: "🌀" },
  { id: 5, label: "Позиция 5 · Полная поддержка", icon: "🧪" },
];

const POS_LABELS_FULL: Record<number, string> = {
  1: "Позиция 1 · Керри (Легкая линия)",
  2: "Позиция 2 · Мидлейнер (Центральная линия)",
  3: "Позиция 3 · Оффлейнер (Сложная линия)",
  4: "Позиция 4 · Частичная поддержка (Семи-саппорт)",
  5: "Позиция 5 · Полная поддержка (Фулл-саппорт)",
};

const POS_LABELS_SHORT: Record<number, string> = {
  1: "Поз 1 · Керри",
  2: "Поз 2 · Мидлейнер",
  3: "Поз 3 · Оффлейнер",
  4: "Поз 4 · Частичная поддержка",
  5: "Поз 5 · Полная поддержка",
};

export function HeroesEncyclopediaView({ heroes }: HeroesEncyclopediaViewProps) {
  const [search, setSearch] = useState("");
  const [posFilter, setPosFilter] = useState<number>(0);
  const [attrFilter, setAttrFilter] = useState<string>("all");
  const [bracket, setBracket] = useState<BracketMode>("high");
  const [viewMode, setViewMode] = useState<"tiers" | "grid" | "table">("tiers");
  const [sortBy, setSortBy] = useState<"winrate" | "picks" | "bans" | "name">("winrate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedHero, setSelectedHero] = useState<ProcessedHero | null>(null);
  const [heroBuildData, setHeroBuildData] = useState<any>(null);
  const [loadingBuild, setLoadingBuild] = useState(false);
  const [modalTab, setModalTab] = useState<"guides" | "popular" | "abilities">("guides");

  useEffect(() => {
    if (!selectedHero) {
      setHeroBuildData(null);
      setModalTab("guides");
      return;
    }
    setModalTab("guides");
    setLoadingBuild(true);
    fetch(`/api/heroes/${selectedHero.id}/build`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setHeroBuildData(data))
      .catch(() => setHeroBuildData(null))
      .finally(() => setLoadingBuild(false));
  }, [selectedHero]);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut '/' to search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const processed: ProcessedHero[] = useMemo(() => {
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

      // Pro Tournaments
      const proPicks = h.pro_pick || 0;
      const proWins = h.pro_win || 0;
      const proWinrate = proPicks > 0 ? (proWins / proPicks) * 100 : highWinrate;
      const proBans = h.pro_ban || 0;

      // Active stats depending on selected bracket
      let activeWinrate = highWinrate;
      let activePicks = highPicks;

      if (bracket === "all") {
        activeWinrate = pubWinrate;
        activePicks = pubPicks;
      } else if (bracket === "pro") {
        activeWinrate = proWinrate;
        activePicks = proPicks;
      }

      // Assign Tier based on active winrate
      let tier: TierLevel = "B";
      if (activeWinrate >= 52.5) {
        tier = "S";
      } else if (activeWinrate >= 50.8) {
        tier = "A";
      } else if (activeWinrate >= 49.2) {
        tier = "B";
      } else if (activeWinrate >= 47.5) {
        tier = "C";
      } else {
        tier = "D";
      }

      const defaultPos = HERO_DEFAULT_POS[h.id] ?? 1;

      return {
        ...h,
        totalPicks: pubPicks,
        winrate: Number(pubWinrate.toFixed(1)),
        highWinrate: Number(highWinrate.toFixed(1)),
        highPicks,
        proPicks,
        proWins,
        proWinrate: Number(proWinrate.toFixed(1)),
        proBans,
        pos: defaultPos,
        activeWinrate: Number(activeWinrate.toFixed(1)),
        activePicks,
        tier,
      };
    });
  }, [heroes, bracket]);

  const filtered = useMemo(() => {
    return processed.filter((h) => {
      // Text search
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        if (
          !h.localized_name.toLowerCase().includes(q) &&
          !h.name.toLowerCase().includes(q)
        ) {
          return false;
        }
      }

      // Position filter
      if (posFilter !== 0) {
        const weights = HERO_ROLE_WEIGHTS[h.id];
        const isMatch = (weights && weights[posFilter as DotaPosition] >= 50) || h.pos === posFilter;
        if (!isMatch) return false;
      }

      // Attribute filter
      if (attrFilter !== "all" && h.primary_attr !== attrFilter) {
        return false;
      }

      return true;
    });
  }, [processed, search, posFilter, attrFilter]);

  const sortedHeroes = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      let valA: number | string = 0;
      let valB: number | string = 0;

      if (sortBy === "winrate") {
        valA = a.activeWinrate;
        valB = b.activeWinrate;
      } else if (sortBy === "picks") {
        valA = a.activePicks;
        valB = b.activePicks;
      } else if (sortBy === "bans") {
        valA = a.proBans;
        valB = b.proBans;
      } else if (sortBy === "name") {
        valA = a.localized_name;
        valB = b.localized_name;
        return sortDir === "asc"
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      }

      return sortDir === "asc"
        ? (valA as number) - (valB as number)
        : (valB as number) - (valA as number);
    });
    return list;
  }, [filtered, sortBy, sortDir]);

  // Group by Tiers
  const tierGroups = useMemo(() => {
    const groups: Record<TierLevel, ProcessedHero[]> = {
      S: [],
      A: [],
      B: [],
      C: [],
      D: [],
    };

    for (const h of sortedHeroes) {
      groups[h.tier].push(h);
    }

    return groups;
  }, [sortedHeroes]);

  // Meta Kings: Top 5 highest winrate heroes for current role/pos filter
  const metaKings = useMemo(() => {
    const list = processed.filter((h) => {
      if (posFilter !== 0) {
        const weights = HERO_ROLE_WEIGHTS[h.id];
        const isMatch = (weights && weights[posFilter as DotaPosition] >= 50) || h.pos === posFilter;
        if (!isMatch) return false;
      }
      return true;
    });
    list.sort((a, b) => b.activeWinrate - a.activeWinrate);
    return list.slice(0, 5);
  }, [processed, posFilter]);

  const activeRoleLabel = POS_TABS.find((p) => p.id === posFilter)?.label || "Все роли";

  const handleToggleSort = (field: "winrate" | "picks" | "bans" | "name") => {
    if (sortBy === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir("desc");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans antialiased selection:bg-zinc-700 selection:text-white">
      <SiteHeader currentPath="/heroes" />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        
        {/* ── 1. Hero Meta Header Banner ── */}
        <div className="rounded-3xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-xl p-6 sm:p-7 shadow-sm relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="max-w-2xl space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800 border border-zinc-700/60 text-xs font-semibold text-zinc-300 font-mono">
                  <Flame className="size-3.5 text-zinc-400" />
                  Патч {CURRENT_DOTA_PATCH}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800 border border-zinc-700/60 text-xs font-semibold text-zinc-300 font-mono">
                  <Sparkles className="size-3.5 text-zinc-400" />
                  127 героев
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 tracking-tight">
                Мета и тир-лист героев
              </h1>

              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                Интерактивный тир-лист по 5 официальным позициям. Точные данные винрейтов, пиков и билдов на основе актуальных матчей.
              </p>
            </div>

            {/* Bracket Mode Selector (High Rank vs All vs Pro) */}
            <div className="flex flex-col gap-1.5 shrink-0 bg-zinc-900/80 border border-zinc-800/80 p-2 rounded-2xl">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider font-semibold px-2">
                Категория рейтинга:
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setBracket("high")}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    bracket === "high"
                      ? "bg-zinc-800 text-zinc-100 border border-zinc-700/60 shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <Shield className="size-3.5 text-zinc-400" />
                  <span>Immortal (7k+ MMR)</span>
                </button>

                <button
                  onClick={() => setBracket("all")}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    bracket === "all"
                      ? "bg-zinc-800 text-zinc-100 border border-zinc-700/60 shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <Swords className="size-3.5 text-zinc-400" />
                  <span>Все ранги</span>
                </button>

                <button
                  onClick={() => setBracket("pro")}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    bracket === "pro"
                      ? "bg-zinc-800 text-zinc-100 border border-zinc-700/60 shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <Award className="size-3.5 text-zinc-400" />
                  <span>Про-сцена</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── 2. Position / Role Selector Tabs (5 Official Positions) ── */}
        <div className="flex flex-wrap items-center gap-1.5 bg-zinc-900/80 border border-zinc-800/80 p-1.5 rounded-2xl backdrop-blur-xl shadow-sm">
          {POS_TABS.map((tab) => {
            const isSelected = posFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setPosFilter(tab.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  isSelected
                    ? "bg-zinc-800 text-zinc-100 border border-zinc-700/60 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── 2.5 Meta Kings Showcase (Top 5 Best Picks For Selected Role) ── */}
        {metaKings.length > 0 && (
          <div className="rounded-3xl border border-zinc-800/80 bg-zinc-900/50 p-5 sm:p-6 backdrop-blur-xl shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-xl bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-zinc-300">
                  <Crown className="size-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                    <span>Лучшие пики патча {CURRENT_DOTA_PATCH}: {activeRoleLabel}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700/60 font-mono">
                      Топ-5
                    </span>
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Герои с максимальным винрейтом на этой позиции в Immortal / Divine ранге
                  </p>
                </div>
              </div>

              <div className="text-[11px] font-mono text-zinc-400">
                Ранг: <span className="text-zinc-200 font-bold">{bracket === "high" ? "Immortal (7k+)" : bracket === "all" ? "Все ранги" : "Про-сцена"}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
              {metaKings.map((king, idx) => {
                const rankNum = idx + 1;
                return (
                  <div
                    key={king.id}
                    className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 hover:bg-zinc-850 hover:border-zinc-700/60 p-4 transition-all group flex flex-col justify-between space-y-3 relative overflow-hidden shadow-sm cursor-pointer"
                    onClick={() => setSelectedHero(king)}
                  >
                    {/* Rank Badge */}
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black font-mono border bg-zinc-800 text-zinc-200 border-zinc-700/60">
                        #{rankNum}
                      </span>

                      <span className="text-[10px] font-bold font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                        {king.activeWinrate}% WR
                      </span>
                    </div>

                    {/* Avatar & Name */}
                    <div className="flex items-center gap-3">
                      <div className="relative size-12 rounded-xl overflow-hidden border border-zinc-700/60 shrink-0 bg-zinc-950 group-hover:scale-105 transition-transform shadow-sm">
                        <img
                          src={heroIconUrl(king.name)}
                          alt={king.localized_name}
                          className="size-full object-cover"
                        />
                        <span className="absolute bottom-0 right-0 px-1 rounded-tl bg-zinc-900/90 text-[8px] font-bold font-mono text-zinc-300">
                          Поз {king.pos}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-sm text-zinc-100 group-hover:text-white transition truncate">
                          {king.localized_name}
                        </div>
                        <div className="text-[11px] text-zinc-400 font-mono">
                          {Math.round(king.activePicks / 1000)}k пиков
                        </div>
                      </div>
                    </div>

                    {/* Quick CTA Actions */}
                    <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                      <Link
                        href={`/matches?search=${encodeURIComponent(king.localized_name)}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-[11px] text-zinc-400 hover:text-zinc-200 font-mono flex items-center gap-1 transition"
                      >
                        <Zap className="size-3 text-zinc-400" />
                        <span>Матчи</span>
                      </Link>

                      <span className="text-[11px] text-zinc-400 group-hover:text-zinc-200 font-medium transition flex items-center gap-0.5">
                        <span>Билд</span>
                        <ArrowRight className="size-3 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── 3. Search & Sub-filters Bar ── */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-3 sm:p-4 backdrop-blur-xl shadow-sm">
          {/* Quick Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по герою (нажмите '/' для фокуса)..."
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 pl-10 pr-10 py-2.5 text-xs sm:text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-zinc-600 transition font-mono"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* Attribute Pills & View Mode */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Attribute buttons */}
            <div className="flex items-center gap-1 bg-zinc-900/80 border border-zinc-800/80 rounded-xl p-1">
              {[
                { id: "all", label: "Все" },
                { id: "str", label: "Сила" },
                { id: "agi", label: "Ловкость" },
                { id: "int", label: "Интеллект" },
                { id: "all_attr", label: "Универсал" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setAttrFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                    attrFilter === tab.id
                      ? "bg-zinc-800 text-zinc-100 border border-zinc-700/60 shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Sorting & View Mode Toggle */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Sort by pill */}
              <div className="flex items-center gap-1 bg-zinc-900/80 border border-zinc-800/80 rounded-xl p-1 text-xs">
                <span className="text-[10px] text-zinc-500 font-mono px-2 uppercase font-semibold">Сорт:</span>
                {[
                  { id: "winrate" as const, label: "% Побед" },
                  { id: "picks" as const, label: "Пики" },
                  { id: "bans" as const, label: "Баны" },
                  { id: "name" as const, label: "А-Я" },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleToggleSort(s.id)}
                    className={`px-2 py-1 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1 ${
                      sortBy === s.id
                        ? "bg-zinc-800 text-zinc-100 border border-zinc-700/60 shadow-sm"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <span>{s.label}</span>
                    {sortBy === s.id && (
                      <span className="text-[10px]">{sortDir === "asc" ? "↑" : "↓"}</span>
                    )}
                  </button>
                ))}
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 bg-zinc-900/80 border border-zinc-800/80 rounded-xl p-1">
                <button
                  onClick={() => setViewMode("tiers")}
                  className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                    viewMode === "tiers"
                      ? "bg-zinc-800 text-zinc-100 border border-zinc-700/60 shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Тир-лист
                </button>
                <button
                  onClick={() => setViewMode("table")}
                  className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                    viewMode === "table"
                      ? "bg-zinc-800 text-zinc-100 border border-zinc-700/60 shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Таблица
                </button>
                <button
                  onClick={() => setViewMode("grid")}
                  className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                    viewMode === "grid"
                      ? "bg-zinc-800 text-zinc-100 border border-zinc-700/60 shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Сетка
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── 4. Main Meta Content ── */}
        {sortedHeroes.length === 0 ? (
          <div className="rounded-3xl border border-zinc-800/80 bg-zinc-900/50 p-12 text-center space-y-3">
            <p className="text-base font-bold text-white">Герои не найдены</p>
            <p className="text-xs text-zinc-400">Попробуйте изменить параметры поиска или фильтрации ролей.</p>
            <button
              onClick={() => {
                setSearch("");
                setPosFilter(0);
                setAttrFilter("all");
              }}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/60 text-zinc-200 text-xs font-medium cursor-pointer"
            >
              Сбросить фильтры
            </button>
          </div>
        ) : viewMode === "tiers" ? (
          /* ── TIER-LIST GROUPED VIEW (S / A / B / C / D) ── */
          <div className="space-y-6">
            {(["S", "A", "B", "C", "D"] as TierLevel[]).map((tierKey) => {
              const tierList = tierGroups[tierKey];
              const cfg = TIER_CONFIG[tierKey];
              if (tierList.length === 0) return null;

              return (
                <div
                  key={tierKey}
                  className="rounded-3xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-xl p-5 sm:p-6 shadow-sm space-y-4"
                >
                  {/* Tier Title Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
                    <div className="flex items-center gap-3">
                      <span
                        className={`size-9 rounded-xl flex items-center justify-center font-black text-sm font-mono border ${cfg.badgeBg} ${cfg.textColor} ${cfg.borderColor}`}
                      >
                        {tierKey}
                      </span>
                      <div>
                        <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                          <span>{cfg.label}</span>
                          <span className="text-xs font-mono font-normal text-zinc-400">
                            ({tierList.length} героев)
                          </span>
                        </h3>
                        <p className="text-xs text-zinc-400">{cfg.sub}</p>
                      </div>
                    </div>

                    <div className="text-[11px] font-mono text-zinc-400">
                      Ранг: <strong className="text-zinc-200">{bracket === "high" ? "Immortal (7k+)" : bracket === "all" ? "Все паблики" : "Про-турниры"}</strong>
                    </div>
                  </div>

                  {/* Tier Hero Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {tierList.map((hero) => (
                      <HeroCardItem
                        key={hero.id}
                        hero={hero}
                        onClick={() => setSelectedHero(hero)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : viewMode === "table" ? (
          /* ── TABLE VIEW (Full Dotabuff / Stratz Sortable Table) ── */
          <div className="rounded-3xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-zinc-900 text-[10px] uppercase tracking-wider text-zinc-400 font-semibold border-b border-zinc-800/80 select-none">
                  <tr>
                    <th className="py-3 px-3 text-center w-12">#</th>
                    <th
                      className="py-3 px-4 cursor-pointer hover:text-white transition"
                      onClick={() => handleToggleSort("name")}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Герой</span>
                        {sortBy === "name" && (
                          <span className="text-blue-400 font-bold">{sortDir === "asc" ? "↑" : "↓"}</span>
                        )}
                      </div>
                    </th>
                    <th className="py-3 px-3 text-center">Роль</th>
                    <th className="py-3 px-3 text-center">Тир</th>
                    <th
                      className="py-3 px-4 cursor-pointer hover:text-white transition"
                      onClick={() => handleToggleSort("winrate")}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Винрейт</span>
                        {sortBy === "winrate" && (
                          <span className="text-blue-400 font-bold">{sortDir === "asc" ? "↑" : "↓"}</span>
                        )}
                      </div>
                    </th>
                    <th
                      className="py-3 px-4 cursor-pointer hover:text-white transition"
                      onClick={() => handleToggleSort("picks")}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Матчи / Пики</span>
                        {sortBy === "picks" && (
                          <span className="text-blue-400 font-bold">{sortDir === "asc" ? "↑" : "↓"}</span>
                        )}
                      </div>
                    </th>
                    <th
                      className="py-3 px-4 cursor-pointer hover:text-white transition"
                      onClick={() => handleToggleSort("bans")}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Баны (Pro)</span>
                        {sortBy === "bans" && (
                          <span className="text-blue-400 font-bold">{sortDir === "asc" ? "↑" : "↓"}</span>
                        )}
                      </div>
                    </th>
                    <th className="py-3 px-3 text-center">Атрибут</th>
                    <th className="py-3 px-4 text-right">Действие</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {sortedHeroes.map((hero, idx) => {
                    const isHighWin = hero.activeWinrate >= 52.5;
                    const isLowWin = hero.activeWinrate <= 48;
                    const winColor = isHighWin
                      ? "text-emerald-400"
                      : isLowWin
                      ? "text-rose-400"
                      : "text-zinc-300";
                    const tierCfg = TIER_CONFIG[hero.tier];

                    return (
                      <tr
                        key={hero.id}
                        onClick={() => setSelectedHero(hero)}
                        className="hover:bg-zinc-800/40 transition group cursor-pointer"
                      >
                        <td className="py-2.5 px-3 text-center font-mono text-zinc-500 font-semibold">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="relative size-9 rounded-xl overflow-hidden border border-zinc-700/60 shrink-0 bg-zinc-950 shadow-sm group-hover:scale-105 transition-transform">
                              <img
                                src={heroIconUrl(hero.name)}
                                alt=""
                                className="size-full object-cover"
                              />
                            </div>
                            <div>
                              <div className="font-bold text-zinc-100 text-xs group-hover:text-white transition">
                                {hero.localized_name}
                              </div>
                              <div className="text-[10px] text-zinc-500 font-mono">
                                {hero.attack_type === "Melee" ? "Ближний бой" : "Дальний бой"}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono">
                          <span className="px-2 py-0.5 rounded-md bg-zinc-800 border border-zinc-700/60 text-[10px] font-bold text-zinc-300">
                            {POS_LABELS_SHORT[hero.pos] || `Поз ${hero.pos}`}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-black font-mono border ${tierCfg.badgeBg} ${tierCfg.textColor} ${tierCfg.borderColor}`}
                          >
                            {hero.tier}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-mono">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className={`font-black text-xs ${winColor}`}>
                                {hero.activeWinrate}%
                              </span>
                            </div>
                            <div className="w-24 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  isHighWin
                                    ? "bg-emerald-500"
                                    : isLowWin
                                    ? "bg-rose-500"
                                    : "bg-zinc-400"
                                }`}
                                style={{
                                  width: `${Math.min(100, Math.max(5, (hero.activeWinrate - 40) * 5))}%`,
                                }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-4 font-mono text-zinc-300 text-xs">
                          {hero.activePicks.toLocaleString("ru-RU")}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-zinc-400 text-xs">
                          {hero.proBans > 0 ? hero.proBans : "—"}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="text-[10px] text-zinc-400 uppercase font-mono">
                            {hero.primary_attr === "str"
                              ? "Сила"
                              : hero.primary_attr === "agi"
                              ? "Ловкость"
                              : hero.primary_attr === "int"
                              ? "Интеллект"
                              : "Универсал"}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedHero(hero);
                            }}
                            className="px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-750 border border-zinc-700/60 text-[11px] font-semibold text-zinc-300 hover:text-white transition cursor-pointer shadow-sm"
                          >
                            Подробнее
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* ── GRID VIEW (Sorted by chosen sort field) ── */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
            {sortedHeroes.map((hero) => (
              <HeroCardItem
                key={hero.id}
                hero={hero}
                onClick={() => setSelectedHero(hero)}
              />
            ))}
          </div>
        )}

        {/* ── 5. Detailed Hero Inspection & Build Guide Modal ── */}
        <AnimatePresence>
          {selectedHero && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md"
              onClick={() => setSelectedHero(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 12 }}
                transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl border border-zinc-800 bg-zinc-900/95 backdrop-blur-2xl p-5 sm:p-7 shadow-2xl space-y-6 text-zinc-100"
              >
              {/* Close Button */}
              <button
                onClick={() => setSelectedHero(null)}
                className="absolute right-4 top-4 size-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white border border-zinc-700/60 flex items-center justify-center transition cursor-pointer z-10 shadow-sm"
              >
                <X className="size-4" />
              </button>

              {/* Hero Header */}
              <div className="flex items-center gap-4 border-b border-zinc-800/80 pb-4">
                <div className="size-16 sm:size-20 rounded-2xl overflow-hidden border-2 border-zinc-700/60 bg-zinc-950 shrink-0 shadow-lg">
                  <img
                    src={heroIconUrl(selectedHero.name)}
                    alt=""
                    className="size-full object-cover"
                  />
                </div>
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2.5 py-0.5 rounded text-[11px] font-black font-mono border ${TIER_CONFIG[selectedHero.tier].badgeBg} ${TIER_CONFIG[selectedHero.tier].textColor} ${TIER_CONFIG[selectedHero.tier].borderColor}`}
                    >
                      {selectedHero.tier}-TIER
                    </span>
                    <span className="text-xs font-mono text-zinc-300 font-bold">
                      {POS_LABELS_FULL[selectedHero.pos] || `Позиция ${selectedHero.pos}`}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700/60 text-[10px] font-mono text-zinc-300">
                      Патч {CURRENT_DOTA_PATCH}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-zinc-100 truncate">
                    {selectedHero.localized_name}
                  </h2>
                  <div className="text-xs text-zinc-400 font-mono">
                    {selectedHero.primary_attr === "str"
                      ? "Атрибут: Сила"
                      : selectedHero.primary_attr === "agi"
                      ? "Атрибут: Ловкость"
                      : selectedHero.primary_attr === "int"
                      ? "Атрибут: Интеллект"
                      : "Универсальный герой"}
                    {selectedHero.attack_type ? ` · ${selectedHero.attack_type === "Melee" ? "Ближний бой" : "Дальний бой"}` : ""}
                  </div>
                </div>
              </div>

              {/* Meta Winrates Bar */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-3 text-center space-y-0.5">
                  <span className="text-[10px] text-zinc-400 font-mono uppercase">Immortal (7000+)</span>
                  <div className="text-base sm:text-lg font-black font-mono text-emerald-400">
                    {selectedHero.highWinrate}%
                  </div>
                  <div className="text-[10px] text-zinc-500 font-mono">Хай-ММР винрейт</div>
                </div>

                <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-3 text-center space-y-0.5">
                  <span className="text-[10px] text-zinc-400 font-mono uppercase">Все ранги</span>
                  <div className="text-base sm:text-lg font-black font-mono text-zinc-200">
                    {selectedHero.winrate}%
                  </div>
                  <div className="text-[10px] text-zinc-500 font-mono">
                    {Math.round(selectedHero.totalPicks / 1000)}k пиков
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-3 text-center space-y-0.5">
                  <span className="text-[10px] text-zinc-400 font-mono uppercase">Про-сцена</span>
                  <div className="text-base sm:text-lg font-black font-mono text-zinc-200">
                    {selectedHero.proWinrate}%
                  </div>
                  <div className="text-[10px] text-zinc-500 font-mono">
                    {selectedHero.proPicks} матчей
                  </div>
                </div>
              </div>

              {/* ── Tabs Selector ── */}
              <div className="flex items-center gap-1.5 border-b border-zinc-800/80 pb-3 overflow-x-auto no-scrollbar">
                {[
                  {
                    id: "guides" as const,
                    label: "Гайды из реальных матчей",
                    icon: BookOpen,
                    count: heroBuildData?.realPlayerMatches?.length,
                  },
                  {
                    id: "popular" as const,
                    label: "Популярные предметы",
                    icon: Sparkles,
                  },
                  {
                    id: "abilities" as const,
                    label: "Способности и таланты",
                    icon: Layers,
                  },
                ].map((tab) => {
                  const active = modalTab === tab.id;
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setModalTab(tab.id)}
                      className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs transition cursor-pointer shrink-0 ${
                        active ? "text-white" : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="heroModalTabGlider"
                          className="absolute inset-0 rounded-xl bg-zinc-800 border border-zinc-700/60 shadow-sm"
                          transition={{ type: "spring", stiffness: 450, damping: 35 }}
                        />
                      )}
                      <span className="relative z-10 flex items-center gap-1.5">
                        <Icon className="size-3.5" />
                        <span>{tab.label}</span>
                        {tab.count ? (
                          <span className="px-1.5 py-0.2 rounded-md bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-300">
                            {tab.count}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* ── TAB 1: Real Player Match Guides (Dotabuff style) ── */}
              {modalTab === "guides" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-300 font-mono">
                      Матчи игроков (Патч {CURRENT_DOTA_PATCH})
                    </span>
                  </div>

                  {loadingBuild ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-zinc-500 font-mono bg-black/20 rounded-2xl border border-white/[0.06]">
                      <div className="size-5 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
                      <span>Загрузка...</span>
                    </div>
                  ) : heroBuildData?.realPlayerMatches && heroBuildData.realPlayerMatches.length > 0 ? (
                    <div className="space-y-4">
                      {heroBuildData.realPlayerMatches.map((m: any, idx: number) => {
                        const isWin = m.won;
                        const durationMins = Math.floor(m.duration / 60);
                        const durationSecs = (m.duration % 60).toString().padStart(2, "0");

                        return (
                          <div
                            key={m.match_id || idx}
                            className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 hover:bg-zinc-950/80 hover:border-zinc-700/60 p-4 sm:p-5 transition space-y-4 shadow-sm"
                          >
                            {/* 1. Match Card Header */}
                            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
                              <div className="flex items-center gap-3">
                                <div className="relative size-10 rounded-xl overflow-hidden border border-zinc-700/60 bg-zinc-900 shrink-0">
                                  {m.avatar ? (
                                    <img src={m.avatar} alt="" className="size-full object-cover" />
                                  ) : (
                                    <div className="size-full flex items-center justify-center font-bold text-xs text-zinc-400 bg-zinc-800">
                                      {m.player_name ? m.player_name.slice(0, 2).toUpperCase() : "??"}
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-zinc-100 text-sm hover:text-white transition truncate max-w-[180px] sm:max-w-[260px]">
                                      {m.player_name}
                                    </span>
                                    {m.pos && (
                                      <span
                                        className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-800 text-zinc-300 border border-zinc-700/60"
                                        title={m.pos_full}
                                      >
                                        Поз {m.pos} · {m.pos_name}
                                      </span>
                                    )}
                                    <span
                                      className={`px-2 py-0.5 rounded text-[10px] font-black font-mono border ${
                                        isWin
                                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                          : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                      }`}
                                    >
                                      {isWin ? "Победа" : "Поражение"}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-zinc-400 font-mono flex items-center gap-2 mt-0.5">
                                    <span>Длительность: {durationMins}:{durationSecs}</span>
                                    {m.match_id && (
                                      <>
                                        <span>•</span>
                                        <Link
                                          href={`/matches/${m.match_id}`}
                                          target="_blank"
                                          className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition"
                                        >
                                          <span>Матч #{m.match_id}</span>
                                          <ExternalLink className="size-2.5" />
                                        </Link>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* KDA & Economy */}
                              <div className="flex items-center gap-3 sm:gap-4 font-mono">
                                <div className="text-right">
                                  <div className="text-xs sm:text-sm font-black text-zinc-100">
                                    <span className="text-emerald-400">{m.kills}</span>
                                    <span className="text-zinc-500"> / </span>
                                    <span className="text-rose-400">{m.deaths}</span>
                                    <span className="text-zinc-500"> / </span>
                                    <span className="text-zinc-300">{m.assists}</span>
                                  </div>
                                  <div className="text-[10px] text-zinc-400">
                                    KDA <span className="font-bold text-zinc-200">{m.kda}</span>
                                  </div>
                                </div>

                                <div className="text-right pl-3 border-l border-zinc-800 hidden sm:block">
                                  <div className="text-xs sm:text-sm font-black text-zinc-200">
                                    {m.net_worth ? `${(m.net_worth / 1000).toFixed(1)}k` : "—"}
                                  </div>
                                  <div className="text-[10px] text-zinc-400">
                                    {m.gpm ? `${m.gpm} GPM` : "Net Worth"}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* 2. Items: Starting and Final Inventory */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                              {/* Starting Items */}
                              {m.starting_items?.length > 0 && (
                                <div className="bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-800/80 space-y-1.5">
                                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono">
                                    🛒 Стартовый закуп:
                                  </span>
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    {m.starting_items.map((it: any, i: number) => (
                                      <div
                                        key={i}
                                        className="group relative size-8 rounded-lg overflow-hidden border border-zinc-700/60 bg-zinc-950 hover:border-zinc-500 transition shadow-sm"
                                        title={it.localizedName}
                                      >
                                        <img src={it.icon} alt="" className="size-full object-cover" />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Final Items */}
                              {m.final_items?.length > 0 && (
                                <div className="bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-800/80 space-y-1.5">
                                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono">
                                    🎒 Финальный инвентарь:
                                  </span>
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    {m.final_items.map((it: any, i: number) => (
                                      <div
                                        key={i}
                                        className="group relative size-8 rounded-lg overflow-hidden border border-zinc-700/60 bg-zinc-950 hover:border-zinc-500 transition shadow-sm"
                                        title={it.localizedName}
                                      >
                                        <img src={it.icon} alt="" className="size-full object-cover" />
                                      </div>
                                    ))}
                                    {m.neutral_item && (
                                      <div
                                        className="group relative size-8 rounded-full overflow-hidden border border-zinc-600 bg-zinc-950 hover:border-zinc-400 transition shadow-sm ml-1"
                                        title={`Нейтральный предмет: ${m.neutral_item.localizedName}`}
                                      >
                                        <img src={m.neutral_item.icon} alt="" className="size-full object-cover" />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* 3. Item Progression Timeline */}
                            {m.timeline_items?.length > 0 && (
                              <div className="bg-zinc-900/80 p-3 rounded-xl border border-zinc-800/80 space-y-2">
                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono">
                                  Тайминги предметов:
                                </span>
                                <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar">
                                  {m.timeline_items.map((it: any, i: number) => (
                                    <div key={i} className="flex items-center gap-1.5 shrink-0">
                                      <div
                                        className="group relative flex flex-col items-center rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 p-1.5 transition"
                                        title={`${it.localizedName} (${it.time})`}
                                      >
                                        <div className="size-8 rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800">
                                          <img src={it.icon} alt="" className="size-full object-cover" />
                                        </div>
                                        <span className="mt-1 px-1.5 py-0.2 rounded bg-zinc-800 border border-zinc-700/60 text-[9px] font-mono font-bold text-zinc-300">
                                          {it.time}
                                        </span>
                                        <span className="text-[9px] text-zinc-400 truncate max-w-[64px] text-center mt-0.5">
                                          {it.localizedName}
                                        </span>
                                      </div>
                                      {i < m.timeline_items.length - 1 && (
                                        <span className="text-zinc-600 text-xs font-bold shrink-0">→</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* 4. Skill Upgrade Progression Matrix (Dotabuff style) */}
                            {m.skill_build?.length > 0 && (
                              <DotabuffSkillMatrix skillBuild={m.skill_build} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-xs text-zinc-500 font-mono">
                      Матчи пока не загружены
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB 2: Popular Items (Aggregate Meta) ── */}
              {modalTab === "popular" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-black text-white">
                    <Sparkles className="size-4 text-amber-400" />
                    <span>Популярные предметы по стадиям игры</span>
                  </div>

                  {loadingBuild ? (
                    <div className="py-8 flex flex-col items-center justify-center gap-2 text-xs text-zinc-400">
                      <div className="size-5 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
                      <span>Загрузка популярных предметов...</span>
                    </div>
                  ) : heroBuildData?.itemBuild ? (
                    <div className="space-y-3.5 bg-black/30 p-4 rounded-2xl border border-white/[0.06]">
                      {/* 1. Start Items */}
                      {heroBuildData.itemBuild.start?.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider font-mono">
                            🛒 Стартовый закуп:
                          </span>
                          <div className="flex flex-wrap items-center gap-2">
                            {heroBuildData.itemBuild.start.map((it: any) => (
                              <div
                                key={it.id}
                                className="group relative flex items-center gap-2 p-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:border-blue-400/40 transition"
                                title={it.localizedName}
                              >
                                <img src={it.icon} alt="" className="size-7 rounded-lg object-cover bg-black" />
                                <span className="text-xs font-semibold text-zinc-200 pr-1 truncate max-w-[100px]">
                                  {it.localizedName}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 2. Early Game */}
                      {heroBuildData.itemBuild.early?.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider font-mono">
                            ⏱️ Ранняя игра (ботинки, улучшения):
                          </span>
                          <div className="flex flex-wrap items-center gap-2">
                            {heroBuildData.itemBuild.early.map((it: any) => (
                              <div
                                key={it.id}
                                className="group relative flex items-center gap-2 p-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:border-blue-400/40 transition"
                                title={it.localizedName}
                              >
                                <img src={it.icon} alt="" className="size-7 rounded-lg object-cover bg-black" />
                                <span className="text-xs font-semibold text-zinc-200 pr-1 truncate max-w-[100px]">
                                  {it.localizedName}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 3. Core Items */}
                      {heroBuildData.itemBuild.mid?.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider font-mono">
                            ⚔️ Основные ключевые предметы (Core):
                          </span>
                          <div className="flex flex-wrap items-center gap-2">
                            {heroBuildData.itemBuild.mid.map((it: any) => (
                              <div
                                key={it.id}
                                className="group relative flex items-center gap-2 p-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 hover:border-amber-400/50 transition"
                                title={it.localizedName}
                              >
                                <img src={it.icon} alt="" className="size-7 rounded-lg object-cover bg-black" />
                                <span className="text-xs font-bold text-amber-200 pr-1 truncate max-w-[110px]">
                                  {it.localizedName}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 4. Late Game */}
                      {heroBuildData.itemBuild.late?.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[11px] font-bold text-purple-300 uppercase tracking-wider font-mono">
                            👑 Поздняя игра / По ситуации:
                          </span>
                          <div className="flex flex-wrap items-center gap-2">
                            {heroBuildData.itemBuild.late.map((it: any) => (
                              <div
                                key={it.id}
                                className="group relative flex items-center gap-2 p-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 hover:border-purple-400/50 transition"
                                title={it.localizedName}
                              >
                                <img src={it.icon} alt="" className="size-7 rounded-lg object-cover bg-black" />
                                <span className="text-xs font-semibold text-purple-200 pr-1 truncate max-w-[110px]">
                                  {it.localizedName}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-zinc-500 py-3 text-center">
                      Данные по популярным предметам загружаются...
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB 3: Hero Abilities & Talents ── */}
              {modalTab === "abilities" && (
                <div className="space-y-4">
                  {heroBuildData ? (
                    <div className="space-y-4">
                      {/* Abilities */}
                      {heroBuildData.abilities?.length > 0 && (
                        <div className="space-y-2">
                          <span className="text-xs font-black text-white uppercase tracking-wider font-mono">
                            Способности героя:
                          </span>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {heroBuildData.abilities.map((ab: any, i: number) => (
                              <div
                                key={i}
                                className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.03] border border-white/[0.06]"
                              >
                                <img src={ab.img} alt="" className="size-8 rounded-lg object-cover shrink-0 bg-black" />
                                <span className="text-xs font-semibold text-white truncate">
                                  {ab.title}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Talent Tree */}
                      {heroBuildData.talentTree?.length > 0 && (
                        <div className="space-y-2">
                          <span className="text-xs font-black text-white uppercase tracking-wider font-mono">
                            Древо талантов:
                          </span>
                          <div className="space-y-1.5 bg-black/40 p-3 rounded-2xl border border-white/[0.06] text-xs font-mono">
                            {heroBuildData.talentTree.map((tier: any, i: number) => (
                              <div key={i} className="flex items-center justify-between gap-2">
                                <span className="flex-1 text-right text-zinc-300 text-[11px] truncate">
                                  {tier.left.title}
                                </span>
                                <span className="size-6 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                                  {tier.level}
                                </span>
                                <span className="flex-1 text-left text-zinc-300 text-[11px] truncate">
                                  {tier.right.title}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-zinc-500 py-3 text-center">
                      Загрузка способностей героя...
                    </div>
                  )}
                </div>
              )}

              {/* Action CTA Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                <Link
                  href={`/matches?search=${encodeURIComponent(selectedHero.localized_name)}`}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-100 border border-zinc-700/60 font-semibold text-xs shadow-sm transition"
                >
                  <Zap className="size-3.5 text-zinc-400" />
                  <span>Матчи с {selectedHero.localized_name}</span>
                </Link>
                <button
                  onClick={() => setSelectedHero(null)}
                  className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 border border-zinc-800 font-semibold text-xs transition cursor-pointer"
                >
                  Закрыть
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </main>

      <SiteFooter />
    </div>
  );
}

function DotabuffSkillMatrix({
  skillBuild,
}: {
  skillBuild: Array<{ level: number; name: string; title: string; img: string }>;
}) {
  if (!skillBuild || skillBuild.length === 0) return null;

  const maxLevel = Math.min(16, Math.max(15, ...skillBuild.map((s) => s.level)));
  const levels = Array.from({ length: maxLevel }, (_, i) => i + 1);

  const uniqueAbilities: Array<{ name: string; title: string; img: string; isTalent: boolean }> = [];
  const seenNames = new Set<string>();

  for (const s of skillBuild) {
    if (!seenNames.has(s.name)) {
      seenNames.add(s.name);
      const isTalent =
        s.name.startsWith("special_bonus") ||
        s.title.toLowerCase().includes("talent") ||
        s.title.toLowerCase().includes("талан");
      uniqueAbilities.push({
        name: s.name,
        title: s.title,
        img: s.img,
        isTalent,
      });
    }
  }

  uniqueAbilities.sort((a, b) => (a.isTalent === b.isTalent ? 0 : a.isTalent ? 1 : -1));

  const levelToAbility = new Map<number, { name: string; abilityRank: number }>();
  const abilityCounters = new Map<string, number>();

  for (const s of skillBuild) {
    const nextCount = (abilityCounters.get(s.name) || 0) + 1;
    abilityCounters.set(s.name, nextCount);
    levelToAbility.set(s.level, { name: s.name, abilityRank: nextCount });
  }

  return (
    <div className="bg-zinc-900/80 rounded-2xl border border-zinc-800/80 p-3 space-y-2 overflow-x-auto no-scrollbar">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono">
          Прокачка способностей по уровням (1–{maxLevel}):
        </span>
      </div>

      <div className="min-w-[540px]">
        <div className="flex items-center gap-1.5 pb-1 border-b border-zinc-800/80 mb-1.5">
          <div className="w-36 sm:w-44 shrink-0 text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
            Способность
          </div>
          <div className="flex items-center gap-1 flex-1">
            {levels.map((lvl) => (
              <div
                key={lvl}
                className="flex-1 text-center font-mono text-[10px] font-bold text-zinc-400"
              >
                {lvl}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          {uniqueAbilities.map((ab) => (
            <div key={ab.name} className="flex items-center gap-1.5 py-0.5 group">
              <div
                className="w-36 sm:w-44 shrink-0 flex items-center gap-2 pr-1"
                title={ab.title}
              >
                <div className="size-6 sm:size-7 rounded-lg overflow-hidden bg-zinc-950 border border-zinc-800 shrink-0">
                  <img src={ab.img} alt="" className="size-full object-cover" />
                </div>
                <span className="text-[11px] font-semibold text-zinc-300 truncate group-hover:text-white transition">
                  {ab.title}
                </span>
              </div>

              <div className="flex items-center gap-1 flex-1">
                {levels.map((lvl) => {
                  const upgrade = levelToAbility.get(lvl);
                  const isLeveledHere = upgrade && upgrade.name === ab.name;

                  if (isLeveledHere) {
                    return (
                      <div
                        key={lvl}
                        className="flex-1 h-6 sm:h-7 rounded-md bg-zinc-800 border border-zinc-700/60 shadow-sm flex items-center justify-center font-mono font-bold text-[10px] sm:text-[11px] text-zinc-100"
                        title={`Уровень ${lvl}: ${ab.title} (ранг ${upgrade.abilityRank})`}
                      >
                        {ab.isTalent ? "★" : upgrade.abilityRank}
                      </div>
                    );
                  }

                  return (
                    <div
                      key={lvl}
                      className="flex-1 h-6 sm:h-7 rounded-md bg-zinc-950/40 border border-zinc-800/40 flex items-center justify-center text-[10px] text-zinc-600 font-mono"
                    >
                      ·
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HeroCardItem({
  hero,
  onClick,
}: {
  hero: ProcessedHero;
  onClick: () => void;
}) {
  const isHighWin = hero.activeWinrate >= 52.5;
  const isLowWin = hero.activeWinrate <= 48;
  const winColor = isHighWin
    ? "text-emerald-400"
    : isLowWin
    ? "text-rose-400"
    : "text-zinc-300";

  const tierCfg = TIER_CONFIG[hero.tier];

  return (
    <div
      onClick={onClick}
      className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 hover:bg-zinc-850 hover:border-zinc-700/60 backdrop-blur-xl p-3 shadow-sm hover:shadow-md transition-all duration-200 group flex flex-col justify-between space-y-2.5 cursor-pointer relative overflow-hidden"
    >
      {/* Top Row: Avatar + Tier Badge + Name */}
      <div className="flex items-center gap-2.5">
        <div className="relative size-10 rounded-xl overflow-hidden border border-zinc-700/60 shrink-0 bg-zinc-900 shadow-sm group-hover:scale-105 transition-transform">
          <img
            src={heroIconUrl(hero.name)}
            alt={hero.localized_name}
            className="size-full object-cover"
          />
          <span className="absolute bottom-0.5 right-0.5 px-1 rounded bg-zinc-900/90 text-[8px] font-bold font-mono text-zinc-300">
            {hero.pos}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="font-bold text-xs text-zinc-100 truncate group-hover:text-white transition">
            {hero.localized_name}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className={`px-1.5 py-0.2 rounded text-[9px] font-black font-mono border ${tierCfg.badgeBg} ${tierCfg.textColor} ${tierCfg.borderColor}`}
            >
              {hero.tier}
            </span>
            <span className="text-[10px] text-zinc-500 uppercase font-mono">
              {hero.primary_attr === "str"
                ? "Сила"
                : hero.primary_attr === "agi"
                ? "Ловк"
                : hero.primary_attr === "int"
                ? "Инт"
                : "Унив"}
            </span>
          </div>
        </div>
      </div>

      {/* Winrate Bar & Stats */}
      <div className="space-y-1 pt-1.5 border-t border-zinc-800/80">
        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className="text-zinc-400 font-sans text-[10px]">Винрейт</span>
          <span className={`font-black ${winColor}`}>{hero.activeWinrate}%</span>
        </div>

        <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className={`h-full rounded-full ${
              isHighWin
                ? "bg-emerald-500"
                : isLowWin
                ? "bg-rose-500"
                : "bg-zinc-400"
            }`}
            style={{
              width: `${Math.min(100, Math.max(5, (hero.activeWinrate - 40) * 5))}%`,
            }}
          />
        </div>

        <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono pt-0.5">
          <span>{Math.round(hero.activePicks / 1000)}k пиков</span>
          {hero.proPicks > 0 && (
            <span className="text-zinc-400 font-medium">Pro: {hero.proPicks}</span>
          )}
        </div>

        {/* Quick action bar */}
        <div className="pt-1.5 border-t border-zinc-800/80 flex items-center justify-between text-[10px]">
          <Link
            href={`/matches?search=${encodeURIComponent(hero.localized_name)}`}
            onClick={(e) => e.stopPropagation()}
            className="text-zinc-400 hover:text-zinc-200 font-mono flex items-center gap-1 transition"
            title="Смотреть матчи с этим героем"
          >
            <Zap className="size-2.5 text-zinc-400" />
            <span>Матчи</span>
          </Link>
          <span className="text-zinc-400 group-hover:text-zinc-200 font-medium transition">
            Билд →
          </span>
        </div>
      </div>
    </div>
  );
}
