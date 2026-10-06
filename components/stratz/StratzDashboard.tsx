"use client";

import { useState, useTransition } from "react";
import {
  Trophy,
  Swords,
  Flame,
  TrendingUp,
  TrendingDown,
  Shield,
  Clock,
  Sparkles,
  Link as LinkIcon,
  PlusCircle,
  CheckCircle2,
  XCircle,
  BarChart3,
  Award,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { linkSteamAccount, recordNewMatch } from "@/app/actions";

type Hero = {
  id: number;
  heroId: number;
  name: string;
  localizedName: string;
  primaryAttr: string;
  iconUrl: string | null;
};

type Match = {
  id: number;
  matchId: string;
  hero: Hero;
  won: boolean;
  isRadiant: boolean;
  mmrChange: number;
  mmrAfter: number;
  kills: number;
  deaths: number;
  assists: number;
  duration: number;
  gameMode: string;
  role: string;
  goldPerMin: number;
  xpPerMin: number;
  netWorth: number;
  impScore: number;
  isMvp: boolean;
  items: string | null;
  neutralItem: string | null;
  startTime: Date;
};

type SteamProfile = {
  id: number;
  steamId: string;
  personaName: string;
  avatarUrl: string | null;
  rankTier: number;
  leaderboardRank: number | null;
  currentMmr: number;
  wins: number;
  losses: number;
  matches: Match[];
};

interface StratzDashboardProps {
  profile: SteamProfile | null;
  heroes: Hero[];
}

export function StratzDashboard({ profile, heroes }: StratzDashboardProps) {
  const [filterResult, setFilterResult] = useState<"all" | "won" | "lost">("all");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [isLinking, setIsLinking] = useState(false);
  const [isLoggingMatch, setIsLoggingMatch] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#0d1117] text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-2xl border border-zinc-800 bg-[#161b22] p-8 text-center space-y-4">
          <div className="size-16 rounded-full bg-red-600/20 text-red-500 flex items-center justify-center mx-auto">
            <LinkIcon className="size-8" />
          </div>
          <h2 className="text-2xl font-bold">Привяжите Steam аккаунт</h2>
          <p className="text-sm text-zinc-400">
            Введите ваш Dota 2 ID (Friend ID) или Steam ID, чтобы загрузить персональную статистику, матчи и историю изменения MMR.
          </p>
          <form
            action={(formData) => {
              startTransition(async () => {
                await linkSteamAccount(formData);
              });
            }}
            className="space-y-3 pt-2"
          >
            <input
              name="steamId"
              type="text"
              placeholder="Dota 2 ID (напр. 86745912)"
              required
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-red-500 focus:outline-none"
            />
            <input
              name="personaName"
              type="text"
              placeholder="Ваш никнейм (опционально)"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-red-500 focus:outline-none"
            />
            <input
              name="currentMmr"
              type="number"
              placeholder="Текущий MMR (напр. 4500)"
              defaultValue={6000}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-red-500 focus:outline-none"
            />
            <Button
              type="submit"
              disabled={isPending}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold"
            >
              {isPending ? "Загрузка профиля..." : "Привязать аккаунт"}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  const matches = profile.matches;
  const totalMatches = profile.wins + profile.losses;
  const winrate = totalMatches > 0 ? ((profile.wins / totalMatches) * 100).toFixed(1) : "50.0";

  // Calculate recent net MMR from loaded matches
  const recentMmrNet = matches.reduce((acc, m) => acc + m.mmrChange, 0);

  const filteredMatches = matches.filter((m) => {
    if (filterResult === "won" && !m.won) return false;
    if (filterResult === "lost" && m.won) return false;
    if (filterRole !== "all" && m.role !== filterRole) return false;
    return true;
  });

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins}:${remainder.toString().padStart(2, "0")}`;
  };

  const getTimeAgo = (date: Date) => {
    const diffMs = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const renderItemIcon = (itemName: string) => {
    return (
      <div
        key={itemName}
        className="size-7 rounded bg-zinc-950 border border-zinc-800 overflow-hidden shrink-0"
        title={itemName.replace(/_/g, " ")}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/items/${itemName}.png`}
          alt={itemName}
          className="size-full object-cover"
        />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0a0d14] text-[#dce5f2] font-sans antialiased selection:bg-red-600 selection:text-white">
      {/* Top STRATZ-style Header Bar */}
      <header className="sticky top-0 z-50 border-b border-[#1c2333] bg-[#0d111a]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-tr from-red-600 to-rose-500 font-black text-white shadow-lg shadow-red-600/30 text-lg">
              S
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-base tracking-tight leading-none">
                  STRATZ
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">
                  DOTA 2 ANALYTICS
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-none mt-0.5">Личная статистика и MMR трекер</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsLoggingMatch(!isLoggingMatch)}
              className="border-zinc-700 bg-zinc-900/80 hover:bg-zinc-800 text-xs text-zinc-200 flex items-center gap-1.5"
            >
              <PlusCircle className="size-3.5 text-emerald-400" />
              <span>Записать матч</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsLinking(!isLinking)}
              className="border-zinc-700 bg-zinc-900/80 hover:bg-zinc-800 text-xs text-zinc-200 flex items-center gap-1.5"
            >
              <LinkIcon className="size-3.5 text-sky-400" />
              <span>Сменить аккаунт</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
        {/* Toggleable Modal / Box to Link Steam Account */}
        {isLinking && (
          <div className="rounded-xl border border-sky-500/30 bg-[#121824] p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <LinkIcon className="size-4 text-sky-400" /> Привязка Steam / Dota 2 аккаунта
              </h3>
              <button
                onClick={() => setIsLinking(false)}
                className="text-xs text-zinc-400 hover:text-white"
              >
                ✕ Закрыть
              </button>
            </div>
            <p className="text-xs text-zinc-400">
              Введите Friend ID из Dota 2 (например, 86745912 или свой ID). Данные профиля будут синхронизированы!
            </p>
            <form
              action={(formData) => {
                startTransition(async () => {
                  await linkSteamAccount(formData);
                  setIsLinking(false);
                });
              }}
              className="grid grid-cols-1 sm:grid-cols-4 gap-3"
            >
              <input
                name="steamId"
                type="text"
                placeholder="Dota 2 Friend ID (напр. 86745912)"
                defaultValue={profile.steamId}
                required
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-sky-500 focus:outline-none"
              />
              <input
                name="personaName"
                type="text"
                placeholder="Имя профиля"
                defaultValue={profile.personaName}
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-sky-500 focus:outline-none"
              />
              <input
                name="currentMmr"
                type="number"
                placeholder="Текущий MMR"
                defaultValue={profile.currentMmr}
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-sky-500 focus:outline-none"
              />
              <Button
                type="submit"
                disabled={isPending}
                className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs"
              >
                {isPending ? "Сохранение..." : "Сохранить аккаунт"}
              </Button>
            </form>
          </div>
        )}

        {/* Toggleable Modal / Box to Log a New Match */}
        {isLoggingMatch && (
          <div className="rounded-xl border border-emerald-500/30 bg-[#121c17] p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <PlusCircle className="size-4 text-emerald-400" /> Добавить результат матча (MMR трекер)
              </h3>
              <button
                onClick={() => setIsLoggingMatch(false)}
                className="text-xs text-zinc-400 hover:text-white"
              >
                ✕ Закрыть
              </button>
            </div>
            <form
              action={(formData) => {
                startTransition(async () => {
                  formData.set("profileId", profile.id.toString());
                  await recordNewMatch(formData);
                  setIsLoggingMatch(false);
                });
              }}
              className="grid grid-cols-2 sm:grid-cols-7 gap-3 text-xs"
            >
              <div className="sm:col-span-2">
                <label className="text-[11px] text-zinc-400 block mb-1">Герой</label>
                <select
                  name="heroId"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
                >
                  {heroes.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.localizedName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Исход</label>
                <select
                  name="won"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
                >
                  <option value="true">Победа (WON)</option>
                  <option value="false">Поражение (LOST)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">MMR (+/-)</label>
                <input
                  name="mmrChange"
                  type="number"
                  defaultValue={25}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Убийства / Смерти</label>
                <div className="flex gap-1">
                  <input
                    name="kills"
                    type="number"
                    defaultValue={12}
                    placeholder="K"
                    className="w-1/2 rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-2 text-white text-center"
                  />
                  <input
                    name="deaths"
                    type="number"
                    defaultValue={2}
                    placeholder="D"
                    className="w-1/2 rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-2 text-white text-center"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Позиция / Роль</label>
                <select
                  name="role"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
                >
                  <option value="Safe Lane">Позиция 1 (Carry)</option>
                  <option value="Mid">Позиция 2 (Mid)</option>
                  <option value="Offlane">Позиция 3 (Offlane)</option>
                  <option value="Soft Support">Позиция 4 (Support)</option>
                  <option value="Hard Support">Позиция 5 (Hard Supp)</option>
                </select>
              </div>

              <div className="flex items-end">
                <Button
                  type="submit"
                  disabled={isPending}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9"
                >
                  {isPending ? "Запись..." : "+ Записать"}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================= */}
        {/* STRATZ PROFILE HERO BANNER                                */}
        {/* ========================================================= */}
        <div className="relative overflow-hidden rounded-2xl border border-[#1e2538] bg-gradient-to-r from-[#111624] via-[#141b2c] to-[#1a1528] p-6 shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* User Avatar & Name & Steam Info */}
            <div className="flex items-center gap-5">
              <div className="relative size-20 sm:size-24 rounded-2xl overflow-hidden p-1 bg-gradient-to-tr from-amber-500 via-red-600 to-rose-400 shadow-2xl shadow-red-600/20 shrink-0">
                {profile.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatarUrl}
                    alt={profile.personaName}
                    className="size-full rounded-xl object-cover"
                  />
                ) : (
                  <div className="size-full rounded-xl bg-zinc-800 flex items-center justify-center font-bold text-2xl">
                    {profile.personaName[0]}
                  </div>
                )}
                {/* Immortal Medal Badge */}
                <div className="absolute -bottom-1 -right-1 bg-zinc-950/90 rounded-full p-1 border border-amber-500/50 shadow-md">
                  <Award className="size-5 text-amber-400" />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    {profile.personaName}
                  </h1>
                  <Badge variant="outline" className="border-amber-500/50 bg-amber-500/10 text-amber-400 text-xs font-bold font-mono">
                    IMMORTAL {profile.leaderboardRank ? `#${profile.leaderboardRank}` : ""}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                  <span className="font-mono bg-[#1a2233] px-2 py-0.5 rounded border border-[#2a3650]">
                    Dota 2 ID: <strong className="text-zinc-200">{profile.steamId}</strong>
                  </span>
                  <span>•</span>
                  <span>Всего игр: <strong className="text-zinc-200">{totalMatches}</strong></span>
                  <span>•</span>
                  <span>Винрейт: <strong className="text-emerald-400">{winrate}%</strong></span>
                </div>
              </div>
            </div>

            {/* MMR Widget Box (Like STRATZ & Dota 2 Profile) */}
            <div className="flex items-center gap-4 bg-[#0d121c]/80 border border-[#232c42] rounded-xl p-4 shrink-0">
              <div className="text-right">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block">
                  Текущий MMR
                </span>
                <span className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
                  {profile.currentMmr.toLocaleString()}
                </span>
                <div className="flex items-center justify-end gap-1.5 mt-0.5">
                  {recentMmrNet >= 0 ? (
                    <span className="text-xs font-bold text-emerald-400 flex items-center font-mono">
                      <TrendingUp className="size-3.5 mr-0.5" /> +{recentMmrNet} MMR
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-red-400 flex items-center font-mono">
                      <TrendingDown className="size-3.5 mr-0.5" /> {recentMmrNet} MMR
                    </span>
                  )}
                  <span className="text-[10px] text-zinc-500">в этой сессии</span>
                </div>
              </div>

              <div className="size-14 rounded-xl bg-gradient-to-br from-amber-500/20 to-red-500/20 border border-amber-500/30 flex flex-col items-center justify-center">
                <Trophy className="size-6 text-amber-400" />
                <span className="text-[9px] font-bold text-amber-300 font-mono mt-0.5">RANK 80</span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-[#1f283d] text-xs">
            <div className="rounded-lg bg-[#0e1422] p-3 border border-[#1d273c]">
              <span className="text-[11px] text-zinc-400 block">Побед / Поражений</span>
              <div className="mt-1 flex items-center gap-2">
                <span className="font-bold text-emerald-400 font-mono">{profile.wins}W</span>
                <span className="text-zinc-600">-</span>
                <span className="font-bold text-red-400 font-mono">{profile.losses}L</span>
              </div>
            </div>

            <div className="rounded-lg bg-[#0e1422] p-3 border border-[#1d273c]">
              <span className="text-[11px] text-zinc-400 block">Средний KDA (последние)</span>
              <div className="mt-1 flex items-center gap-1.5 font-bold font-mono text-zinc-200">
                <span className="text-emerald-400">
                  {(matches.reduce((a, m) => a + m.kills, 0) / (matches.length || 1)).toFixed(1)}
                </span>
                <span className="text-zinc-600">/</span>
                <span className="text-red-400">
                  {(matches.reduce((a, m) => a + m.deaths, 0) / (matches.length || 1)).toFixed(1)}
                </span>
                <span className="text-zinc-600">/</span>
                <span className="text-sky-400">
                  {(matches.reduce((a, m) => a + m.assists, 0) / (matches.length || 1)).toFixed(1)}
                </span>
              </div>
            </div>

            <div className="rounded-lg bg-[#0e1422] p-3 border border-[#1d273c]">
              <span className="text-[11px] text-zinc-400 block">Средний GPM / XPM</span>
              <div className="mt-1 font-bold font-mono text-amber-400">
                {Math.round(matches.reduce((a, m) => a + m.goldPerMin, 0) / (matches.length || 1))} GPM
                <span className="text-zinc-500 font-normal text-[11px] ml-1.5">
                  / {Math.round(matches.reduce((a, m) => a + m.xpPerMin, 0) / (matches.length || 1))} XPM
                </span>
              </div>
            </div>

            <div className="rounded-lg bg-[#0e1422] p-3 border border-[#1d273c]">
              <span className="text-[11px] text-zinc-400 block">STRATZ Средний IMP</span>
              <div className="mt-1 flex items-center gap-1.5 font-bold font-mono">
                <Zap className="size-4 text-amber-400" />
                <span className="text-emerald-400 text-sm">
                  +{(matches.reduce((a, m) => a + m.impScore, 0) / (matches.length || 1)).toFixed(0)} IMP
                </span>
                <span className="text-[10px] text-zinc-400">(Высокий импакт)</span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* RECENT MATCHES MMR TREND & FILTERS                        */}
        {/* ========================================================= */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                <Swords className="size-5 text-red-500" />
                История матчей и динамика MMR
              </h2>
              <p className="text-xs text-zinc-400">
                Список сыгранных рейтинговых матчей с фиксацией изменения рейтинга (+/- MMR), билдов и личного импакта
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="flex rounded-lg bg-[#141a27] p-1 border border-[#232c42]">
                <button
                  onClick={() => setFilterResult("all")}
                  className={`px-3 py-1 rounded-md transition font-medium ${
                    filterResult === "all" ? "bg-[#2570eb] text-white" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Все ({matches.length})
                </button>
                <button
                  onClick={() => setFilterResult("won")}
                  className={`px-3 py-1 rounded-md transition font-medium ${
                    filterResult === "won" ? "bg-emerald-600 text-white" : "text-emerald-400 hover:text-white"
                  }`}
                >
                  Победы ({matches.filter((m) => m.won).length})
                </button>
                <button
                  onClick={() => setFilterResult("lost")}
                  className={`px-3 py-1 rounded-md transition font-medium ${
                    filterResult === "lost" ? "bg-red-600 text-white" : "text-red-400 hover:text-white"
                  }`}
                >
                  Поражения ({matches.filter((m) => !m.won).length})
                </button>
              </div>

              {/* Role filter */}
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="rounded-lg border border-[#232c42] bg-[#141a27] px-3 py-1.5 text-xs text-zinc-200"
              >
                <option value="all">Все роли</option>
                <option value="Safe Lane">Позиция 1 (Carry)</option>
                <option value="Mid">Позиция 2 (Mid)</option>
                <option value="Offlane">Позиция 3 (Offlane)</option>
                <option value="Soft Support">Позиция 4 (Support)</option>
              </select>
            </div>
          </div>

          {/* ========================================================= */}
          {/* STRATZ MATCHES TABLE                                      */}
          {/* ========================================================= */}
          <div className="overflow-x-auto rounded-xl border border-[#1e2638] bg-[#0e131f] shadow-lg">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="border-b border-[#1e2638] bg-[#131929] text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                <tr>
                  <th className="py-3 px-4">Герой / Роль</th>
                  <th className="py-3 px-3">Результат</th>
                  <th className="py-3 px-3 text-center">Изменение MMR</th>
                  <th className="py-3 px-3">MMR после матча</th>
                  <th className="py-3 px-3">K / D / A</th>
                  <th className="py-3 px-3 text-center">STRATZ IMP</th>
                  <th className="py-3 px-3">GPM / XPM</th>
                  <th className="py-3 px-4">Предметы (Items)</th>
                  <th className="py-3 px-3 text-right">Время / Дата</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#171e2e]">
                {filteredMatches.map((m) => {
                  const itemsList = m.items ? m.items.split(",") : [];

                  return (
                    <tr
                      key={m.id}
                      className={`hover:bg-[#131a2b] transition ${
                        m.won ? "border-l-4 border-l-emerald-500" : "border-l-4 border-l-red-500"
                      }`}
                    >
                      {/* Hero Column */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {m.hero.iconUrl && (
                            <div className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-zinc-900 border border-zinc-700">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={m.hero.iconUrl}
                                alt={m.hero.localizedName}
                                className="size-full object-cover"
                              />
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-sm text-white flex items-center gap-1.5">
                              {m.hero.localizedName}
                              {m.isMvp && (
                                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[9px] px-1 py-0 font-mono">
                                  ★ MVP
                                </Badge>
                              )}
                            </div>
                            <span className="text-[11px] text-zinc-400">{m.role}</span>
                          </div>
                        </div>
                      </td>

                      {/* Result WON / LOST */}
                      <td className="py-3 px-3">
                        {m.won ? (
                          <div className="flex items-center gap-1.5 text-emerald-400 font-extrabold text-xs">
                            <CheckCircle2 className="size-4" />
                            <span>ПОБЕДА</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-red-400 font-extrabold text-xs">
                            <XCircle className="size-4" />
                            <span>ПОРАЖЕНИЕ</span>
                          </div>
                        )}
                        <span className="text-[10px] text-zinc-500 font-mono block">Ranked AP</span>
                      </td>

                      {/* MMR Change (+25 / -25) */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center justify-center font-mono font-black text-sm px-2.5 py-0.5 rounded-lg border ${
                            m.mmrChange >= 0
                              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                              : "bg-red-500/15 text-red-400 border-red-500/30"
                          }`}
                        >
                          {m.mmrChange >= 0 ? `+${m.mmrChange}` : m.mmrChange} MMR
                        </span>
                      </td>

                      {/* MMR After Match */}
                      <td className="py-3 px-3 font-mono font-bold text-zinc-200">
                        {m.mmrAfter.toLocaleString()}
                      </td>

                      {/* K / D / A */}
                      <td className="py-3 px-3">
                        <div className="font-mono font-bold text-zinc-200 text-xs">
                          <span className="text-emerald-400">{m.kills}</span> /{" "}
                          <span className="text-red-400">{m.deaths}</span> /{" "}
                          <span className="text-sky-400">{m.assists}</span>
                        </div>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {((m.kills + m.assists) / Math.max(m.deaths, 1)).toFixed(1)} KDA
                        </span>
                      </td>

                      {/* STRATZ IMP Rating */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 font-mono text-xs font-bold px-2 py-0.5 rounded ${
                            m.impScore >= 25
                              ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                              : m.impScore >= 0
                              ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                              : "bg-red-500/15 text-red-300 border border-red-500/30"
                          }`}
                        >
                          <Zap className="size-3" />
                          {m.impScore >= 0 ? `+${m.impScore}` : m.impScore} IMP
                        </span>
                      </td>

                      {/* GPM / XPM */}
                      <td className="py-3 px-3">
                        <div className="font-mono font-semibold text-zinc-300">
                          {m.goldPerMin} GPM
                        </div>
                        <div className="font-mono text-[10px] text-zinc-500">
                          {m.xpPerMin} XPM • {(m.netWorth / 1000).toFixed(1)}k NW
                        </div>
                      </td>

                      {/* Items Build */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          {itemsList.map((item, idx) => (
                            <span key={idx}>{renderItemIcon(item)}</span>
                          ))}
                          {m.neutralItem && (
                            <div
                              className="size-7 rounded-full bg-amber-950/40 border border-amber-500/50 overflow-hidden shrink-0 ml-1.5"
                              title={`Neutral: ${m.neutralItem}`}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={`https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/items/${m.neutralItem}.png`}
                                alt={m.neutralItem}
                                className="size-full object-cover"
                              />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Duration & Time */}
                      <td className="py-3 px-3 text-right">
                        <div className="font-mono text-xs text-zinc-300 flex items-center justify-end gap-1">
                          <Clock className="size-3 text-zinc-500" />
                          {formatDuration(m.duration)}
                        </div>
                        <span className="text-[10px] text-zinc-500 block">
                          {getTimeAgo(m.startTime)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-[#1a2233] bg-[#090c13] py-6 text-center text-xs text-zinc-500">
        <div className="mx-auto max-w-7xl px-4">
          <p className="font-semibold text-zinc-400">
            Dota 2 STRATZ-style Personal Tracker • Next.js App Router & Prisma ORM
          </p>
          <p className="text-[11px] text-zinc-600 mt-1">
            Tracking match history, +/- MMR per match, item builds, and STRATZ IMP performance ratings.
          </p>
        </div>
      </footer>
    </div>
  );
}
