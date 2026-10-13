"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Shield,
  Swords,
  TrendingUp,
  Clock,
  Zap,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Database,
  Lock,
} from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { PlayerSearchBar } from "@/components/search/PlayerSearchBar";
import type { OpenDotaHeroStat } from "@/lib/opendota";

interface LandingPageProps {
  heroes?: OpenDotaHeroStat[];
  proMatches?: any[];
}

export function LandingPage({ heroes = [] }: LandingPageProps) {
  const router = useRouter();
  const [customId, setCustomId] = useState("");

  const handleOpenProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customId.trim().replace(/\D/g, "");
    if (clean && Number(clean) > 0) {
      // Also save as active account so user doesn't have to enter it again
      document.cookie = `active_account_id=${clean}; path=/; max-age=2592000; SameSite=Lax`;
      router.push(`/player/${clean}`);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans antialiased selection:bg-zinc-700 selection:text-white">
      <SiteHeader currentPath="/" />

      <main className="flex-1 px-4 sm:px-6 py-10 sm:py-16 max-w-5xl mx-auto w-full space-y-12">
        {/* ── 1. Hero Solo-Tracker Banner ── */}
        <section className="flex flex-col items-center text-center space-y-4 max-w-3xl mx-auto pt-2 sm:pt-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/80 px-4 py-1.5 text-xs font-semibold text-zinc-300 shadow-sm">
            <Shield className="size-3.5 text-zinc-400" />
            <span>Персональный трекер Dota 2 · Соло-аналитика</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-zinc-100 leading-tight">
            Твоя реальная статистика{" "}
            <span className="text-zinc-400">без лишнего мусора</span>
          </h1>

          <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto leading-relaxed">
            Вся аналитика сфокусирована только на твоем аккаунте. Реальный винрейт, количество побед и поражений, детальные сборки и тайминги — без сторонних токенов и фейковых данных.
          </p>
        </section>

        {/* ── 2. Primary Account Login / Connect Card ── */}
        <section className="w-full max-w-xl mx-auto">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 backdrop-blur-xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="space-y-1 text-center">
              <h2 className="text-lg font-bold text-zinc-100">
                Подключите ваш аккаунт Dota 2
              </h2>
              <p className="text-xs text-zinc-400">
                Выберите один из двух простых способов для просмотра своей соло-статистики:
              </p>
            </div>

            {/* Option A: Steam OpenID Official One-Click Login */}
            <div className="space-y-2">
              <Link
                href="/api/auth/steam"
                className="flex items-center justify-center gap-3 w-full py-3.5 px-5 rounded-2xl bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-sm transition shadow-md active:scale-[0.99] cursor-pointer"
              >
                <svg viewBox="0 0 24 24" className="size-5 fill-current shrink-0">
                  <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.87c0-2.748 2.352-4.985 5.095-4.985 2.744 0 4.986 2.238 4.986 4.985s-2.242 4.985-4.986 4.985h-.117l-4.078 2.911c0 .052.004.105.004.159 0 2.06-1.671 3.727-3.727 3.727-1.812 0-3.326-1.285-3.676-2.99L.164 12.986C1.385 19.214 6.647 24 12.021 24 18.628 24 24 18.617 24 12 24 5.383 18.628 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.497 1.009 2.455-.397.957-1.494 1.41-2.455 1.012H7.54zm11.415-9.303c0-1.826-1.483-3.313-3.31-3.313-1.828 0-3.311 1.487-3.311 3.313 0 1.826 1.483 3.312 3.311 3.312 1.827 0 3.31-1.486 3.31-3.312zm-5.789.001c0-1.366 1.112-2.475 2.479-2.475 1.366 0 2.479 1.109 2.479 2.475 0 1.367-1.113 2.476-2.479 2.476-1.367 0-2.479-1.109-2.479-2.476z" />
                </svg>
                <span>Войти через Steam (OpenID)</span>
              </Link>
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-500 font-mono">
                <Lock className="size-3 text-zinc-400" />
                <span>100% безопасно: официальная авторизация Valve, без паролей и токенов</span>
              </div>
            </div>

            {/* Divider */}
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-800" />
              </div>
              <span className="relative bg-zinc-900 px-3 text-[11px] font-mono text-zinc-500 uppercase tracking-wider">
                или введите ID аккаунта
              </span>
            </div>

            {/* Option B: Enter Account ID Form */}
            <form onSubmit={handleOpenProfile} className="space-y-3">
              <div className="space-y-1.5">
                <input
                  type="text"
                  placeholder="Ваш Dota 2 Account ID (например 12345678)..."
                  value={customId}
                  onChange={(e) => setCustomId(e.target.value.replace(/\D/g, ""))}
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-xs sm:text-sm text-zinc-100 placeholder:text-zinc-500 font-mono outline-none focus:border-zinc-600 transition"
                />
              </div>

              <button
                type="submit"
                disabled={!customId.trim()}
                className="w-full py-3 px-4 rounded-2xl bg-zinc-800 hover:bg-zinc-750 disabled:opacity-40 disabled:pointer-events-none text-zinc-100 font-semibold text-xs transition border border-zinc-700/60 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Открыть мою статистику</span>
                <ArrowRight className="size-3.5" />
              </button>

              <p className="text-[11px] text-zinc-500 text-center leading-relaxed">
                Где найти ID: откройте свой профиль в клиенте Dota 2 — номер под никнеймом и есть ваш Account ID.
              </p>
            </form>
          </div>
        </section>

        {/* ── 3. What You Get for Solo Analytics (Features) ── */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-5 space-y-2.5">
            <div className="size-9 rounded-xl bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-zinc-300">
              <CheckCircle2 className="size-4 text-emerald-400" />
            </div>
            <div className="font-bold text-sm text-zinc-100">
              100% реальные данные без токенов
            </div>
            <div className="text-xs text-zinc-400 leading-relaxed">
              Точное общее число побед, поражений, общий винрейт, реальный ранг и текущий ММР напрямую от серверов Valve.
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-5 space-y-2.5">
            <div className="size-9 rounded-xl bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-zinc-300">
              <Zap className="size-4 text-amber-400" />
            </div>
            <div className="font-bold text-sm text-zinc-100">
              Автообновление после каждой катки
            </div>
            <div className="text-xs text-zinc-400 leading-relaxed">
              Как только вы доиграли матч — сайт автоматически обнаруживает его и добавляет в историю без ручного перезапуска.
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-5 space-y-2.5">
            <div className="size-9 rounded-xl bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-zinc-300">
              <Clock className="size-4 text-sky-400" />
            </div>
            <div className="font-bold text-sm text-zinc-100">
              Поминутные тайминги предметов
            </div>
            <div className="text-xs text-zinc-400 leading-relaxed">
              Точные тайминги покупки артефактов (Blink, BKB, Manta), KDA, GPM/XPM и полный разбор каждой вашей игры.
            </div>
          </div>
        </section>

        {/* ── 4. Quick Direct Links ── */}
        <section className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-zinc-800/80 text-xs">
          <Link
            href="/heroes"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition"
          >
            <Swords className="size-3.5 text-zinc-400" />
            <span>Мета и тир-лист всех героев</span>
          </Link>

          <Link
            href="/matches"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition"
          >
            <Database className="size-3.5 text-zinc-400" />
            <span>База данных матчей</span>
          </Link>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
