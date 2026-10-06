"use client";

import Link from "next/link";
import {
  Shield,
  Swords,
  TrendingUp,
  BarChart2,
  Sparkles,
  Clock,
  Zap,
  ArrowRight,
  Search,
  CheckCircle2,
  Trophy,
  Users,
} from "lucide-react";
import { PlayerSearchBar } from "@/components/search/PlayerSearchBar";
import { HeroMetaShowcase } from "@/components/meta/HeroMetaShowcase";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import type { OpenDotaHeroStat, OpenDotaProMatch } from "@/lib/opendota";

interface LandingPageProps {
  heroes?: OpenDotaHeroStat[];
  proMatches?: OpenDotaProMatch[];
}

export function LandingPage({ heroes = [], proMatches = [] }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans antialiased selection:bg-zinc-700 selection:text-white">
      {/* ── Top Universal Header ── */}
      <SiteHeader currentPath="/" />

      {/* ── Main Landing Body ── */}
      <main className="flex-1 px-4 sm:px-6 py-10 sm:py-16 max-w-7xl mx-auto w-full space-y-14 sm:space-y-16">
        
        {/* ── 1. Hero Showcase / Search Center ── */}
        <section className="flex flex-col items-center text-center space-y-5 max-w-4xl mx-auto pt-4 sm:pt-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/80 px-4 py-1.5 text-xs font-semibold text-zinc-300 shadow-sm">
            <span className="size-2 rounded-full bg-emerald-400" />
            Аналитика Dota 2
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-zinc-100 leading-tight">
            Каждая деталь матча в{" "}
            <span className="text-zinc-400">
              AegisGG
            </span>
          </h1>

          <p className="text-sm sm:text-base text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Поиск игроков, детальный разбор предметов, 5 официальных позиций,
            поминутный плеер слотов и реальные билды игроков.
          </p>

          {/* Universal Smart Search Bar */}
          <div className="w-full max-w-xl mx-auto pt-2 space-y-3">
            <PlayerSearchBar
              placeholder="Введите никнейм игрока, Steam ID, или номер матча..."
              className="w-full"
            />
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-zinc-400 pt-1">
              <span className="text-zinc-500">Быстрый переход:</span>
              <Link
                href="/player/1068082356"
                className="px-3 py-1 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 font-semibold transition flex items-center gap-1.5 shadow-sm"
              >
                <span>⭐</span>
                <span>Мой профиль (#1068082356)</span>
              </Link>
              <Link
                href="/heroes"
                className="px-3 py-1 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition flex items-center gap-1.5 shadow-sm"
              >
                <Swords className="size-3 text-zinc-400" />
                <span>Мета героев</span>
              </Link>
              <Link
                href="/matches"
                className="px-3 py-1 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition flex items-center gap-1.5 shadow-sm"
              >
                <span className="size-1.5 rounded-full bg-emerald-400" />
                <span>Лайв матчи</span>
              </Link>
              <Link
                href="/player/321580662"
                className="px-3 py-1 rounded-full bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800/80 text-zinc-400 hover:text-zinc-200 transition"
              >
                Yatoro
              </Link>
              <Link
                href="/player/105248644"
                className="px-3 py-1 rounded-full bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800/80 text-zinc-400 hover:text-zinc-200 transition"
              >
                Miracle-
              </Link>
            </div>
          </div>
        </section>

        {/* ── 1.5. Live Matches Banner ── */}
        <section className="w-full max-w-4xl mx-auto -mt-4">
          <Link
            href="/matches"
            className="group flex items-center justify-between gap-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/50 hover:bg-zinc-850/60 hover:border-zinc-700/60 backdrop-blur-sm px-5 py-3.5 transition-all shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="relative flex-shrink-0">
                <div className="size-2.5 rounded-full bg-emerald-400" />
                <div className="absolute inset-0 size-2.5 rounded-full bg-emerald-400 animate-ping opacity-75" />
              </div>
              <div>
                <div className="text-sm font-bold text-zinc-200">Лайв матчи</div>
                <div className="text-xs text-zinc-400">Свежие высокорейтинговые игры</div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-400 font-semibold group-hover:text-zinc-200 group-hover:gap-2.5 transition-all">
              <span>Смотреть</span>
              <ArrowRight className="size-3.5" />
            </div>
          </Link>
        </section>

        {/* ── 2. Live Meta Heroes Section ── */}
        {heroes.length > 0 && (
          <section className="pt-2">
            <HeroMetaShowcase heroes={heroes} />
          </section>
        )}

        {/* ── 3. Platform Key Features (Kokonut Squircles in Zinc) ── */}
        <section className="space-y-5 pt-2">
          <div className="text-center space-y-1">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-200 tracking-tight">
              Инструменты аналитики
            </h2>
            <p className="text-xs text-zinc-500">
              Точные данные OpenDota и Stratz API
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-xl p-5 shadow-sm space-y-2.5 hover:border-zinc-700/60 hover:bg-zinc-850/40 transition">
              <div className="size-9 rounded-xl bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-zinc-300">
                <Clock className="size-4" />
              </div>
              <div className="font-bold text-sm text-zinc-200 tracking-tight">
                Поминутный плеер слотов
              </div>
              <div className="text-xs text-zinc-400 leading-relaxed">
                Инвентарь всех 10 игроков реконструируется на каждой минуте с точными таймингами покупок предметов.
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-xl p-5 shadow-sm space-y-2.5 hover:border-zinc-700/60 hover:bg-zinc-850/40 transition">
              <div className="size-9 rounded-xl bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-zinc-300">
                <Zap className="size-4" />
              </div>
              <div className="font-bold text-sm text-zinc-200 tracking-tight">
                Игровой HUD Dota 2
              </div>
              <div className="text-xs text-zinc-400 leading-relaxed">
                6 слотов инвентаря, нейтральный предмет, ранец и статус Аганимов в оригинальных пропорциях.
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-xl p-5 shadow-sm space-y-2.5 hover:border-zinc-700/60 hover:bg-zinc-850/40 transition">
              <div className="size-9 rounded-xl bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-zinc-300">
                <TrendingUp className="size-4" />
              </div>
              <div className="font-bold text-sm text-zinc-200 tracking-tight">
                Графики нетворса и опыта
              </div>
              <div className="text-xs text-zinc-400 leading-relaxed">
                Преимущество по золоту и опыту с маркерами переломных тимфайтов и ключевых событий.
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-xl p-5 shadow-sm space-y-2.5 hover:border-zinc-700/60 hover:bg-zinc-850/40 transition">
              <div className="size-9 rounded-xl bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-zinc-300">
                <BarChart2 className="size-4" />
              </div>
              <div className="font-bold text-sm text-zinc-200 tracking-tight">
                5 соревновательных позиций
              </div>
              <div className="text-xs text-zinc-400 leading-relaxed">
                Керри, Мидлейнер, Хардлейнер, Частичная поддержка и Полная поддержка с реальным распределением фарма.
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* ── Universal Footer ── */}
      <SiteFooter />
    </div>
  );
}
