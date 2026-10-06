"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Database,
  RefreshCw,
  Search,
  Filter,
  Trophy,
  Swords,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  CheckCircle2,
  Layers,
  ArrowRight,
  Radio,
  Flame,
  Coins,
  Crosshair,
  Shield,
  Eye,
  Zap,
  Copy,
  Check,
} from "lucide-react";
import { type OpenDotaHero, heroIconUrl, getGameModeName } from "@/lib/opendota";
import { type MatchSummaryListItem, type MatchSummaryPlayer } from "@/lib/dota-match-db";
import { DotaInventoryHud } from "@/components/ui/DotaInventoryHud";

interface MatchDatabaseViewProps {
  initialMatches: MatchSummaryListItem[];
  totalMatches: number;
  initialPage: number;
  totalPages: number;
  initialStats: {
    totalMatches: number;
    radiantWins: number;
    direWins: number;
    avgDuration: number;
    parsedMatches: number;
  };
  heroes: OpenDotaHero[];
}

export function MatchDatabaseView({
  initialMatches,
  totalMatches: initTotal,
  initialPage,
  totalPages: initTotalPages,
  initialStats,
  heroes,
}: MatchDatabaseViewProps) {
  const [matches, setMatches] = useState<MatchSummaryListItem[]>(initialMatches);
  const [total, setTotal] = useState(initTotal);
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(initTotalPages);
  const [stats, setStats] = useState(initialStats);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWinner, setSelectedWinner] = useState<"all" | "radiant" | "dire">("all");
  const [onlyParsed, setOnlyParsed] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Copy Match ID feedback state
  const [copiedMatchId, setCopiedMatchId] = useState<string | null>(null);

  const handleCopyMatchId = (e: React.MouseEvent, mId: string) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(mId);
    setCopiedMatchId(mId);
    setTimeout(() => {
      setCopiedMatchId(null);
    }, 2000);
  };

  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);

  const handleCopyCommand = (e: React.MouseEvent, cmd: string, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(cmd);
    setCopiedCommand(id);
    setTimeout(() => {
      setCopiedCommand(null);
    }, 2000);
  };

  // Expanded matches set for inline 10-player scoreboards
  const [expandedMatchIds, setExpandedMatchIds] = useState<Set<string>>(new Set());

  // Auto-refresh engine
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [countdown, setCountdown] = useState(45);
  const lastSyncRef = useRef<number>(Date.now());

  const heroMap = new Map(heroes.map((h) => [h.id, h]));

  const POS_LABELS: Record<number, { title: string; icon: string; color: string }> = {
    1: { title: "Керри", icon: "⚔️", color: "text-sky-400 bg-sky-500/10 border-sky-500/30" },
    2: { title: "Мид", icon: "⚡", color: "text-purple-400 bg-purple-500/10 border-purple-500/30" },
    3: { title: "Оффлейн", icon: "🛡️", color: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
    4: { title: "Саппорт", icon: "🌱", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
    5: { title: "Полная поддержка", icon: "👁️", color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30" },
  };

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Недавно";
    }
  };

  const toggleExpand = (matchId: string) => {
    setExpandedMatchIds((prev) => {
      const next = new Set(prev);
      if (next.has(matchId)) {
        next.delete(matchId);
      } else {
        next.add(matchId);
      }
      return next;
    });
  };

  const handleFetchPage = async (
    newPage: number,
    winnerFilter = selectedWinner,
    query = searchQuery,
    parsed = onlyParsed,
    autoSync = false
  ) => {
    startTransition(async () => {
      try {
        const params = new URLSearchParams();
        params.set("page", String(newPage));
        params.set("limit", "15");
        if (query.trim()) params.set("search", query.trim());
        if (winnerFilter === "radiant") params.set("radiantWin", "true");
        if (winnerFilter === "dire") params.set("radiantWin", "false");
        if (parsed) params.set("isParsed", "true");
        if (autoSync) params.set("autoSync", "true");

        const res = await fetch(`/api/database?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (data.matches) {
            setMatches(data.matches);
          }
          if (typeof data.total === "number") setTotal(data.total);
          if (typeof data.page === "number") setPage(data.page);
          if (typeof data.totalPages === "number") setTotalPages(data.totalPages);
          if (data.stats) setStats(data.stats);
          if (data.syncAdded && data.syncAdded > 0) {
            setSyncMessage(`🟢 Получено +${data.syncAdded} новых хай-ММР матчей прямо сейчас!`);
            setTimeout(() => setSyncMessage(null), 4000);
          }
        }
      } catch (err) {
        console.error("Failed to load page:", err);
      }
    });
  };

  const handleSyncWithDota = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch("/api/database", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 12 }),
      });
      const data = await res.json();
      if (data.success) {
        setSyncMessage(`Успешно! Добавлено ${data.added} новых матчей прямо из Dota 2.`);
        lastSyncRef.current = Date.now();
        await handleFetchPage(page);
      } else {
        setSyncMessage("Не удалось получить новые матчи из сети.");
      }
    } catch (e: any) {
      setSyncMessage(e?.message || "Ошибка подключения к шлюзу Dota 2");
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncMessage(null), 5000);
    }
  };

  // Live Auto-Refresh Timer (refresh local DB page every 45s without lagging)
  useEffect(() => {
    if (!autoRefreshEnabled) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Re-fetch local database on page 1 without heavy external sync
          if (page === 1 && !searchQuery.trim()) {
            handleFetchPage(1, selectedWinner, searchQuery, onlyParsed, false);
          }
          return 45;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoRefreshEnabled, page, searchQuery, selectedWinner, onlyParsed]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleFetchPage(1, selectedWinner, searchQuery);
  };

  const radWinPct = stats.totalMatches > 0 ? Math.round((stats.radiantWins / stats.totalMatches) * 100) : 50;
  const direWinPct = 100 - radWinPct;

  return (
    <div className="space-y-8">
      {/* ── Top Hero / Header Section ── */}
      <div className="relative overflow-hidden rounded-3xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-md p-6 sm:p-10 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-700/60 bg-zinc-800/60 px-3.5 py-1 text-xs font-semibold text-zinc-300 font-mono">
              <Zap className="size-3.5 text-zinc-400" />
              <span>База матчей и Реплеев • Dota 2 (Патч 7.41d)</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              Все матчи и Реплеи Dota 2
            </h1>
            <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
              Актуальные матчи любого рейтинга — от обычных игроков всех рангов до хай-ММР и профессиональных турниров напрямую из серверов Dota 2. Копируйте Match ID в один клик для клиента игры, изучайте реальные сборки 10 игроков (6 слотов, рюкзак, нейтралки) и поминутную хронологию.
            </p>
          </div>

          {/* Sync & Auto-Refresh Controls Bar */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
            {/* Auto-refresh status toggle */}
            <div className="flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-black/40 border border-white/[0.08] text-xs">
              <div className="flex items-center gap-2">
                <span
                  className={`size-2.5 rounded-full ${
                    autoRefreshEnabled
                      ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse"
                      : "bg-zinc-600"
                  }`}
                />
                <span className="font-semibold text-zinc-200 font-mono">
                  {autoRefreshEnabled ? `LIVE • Обновление (${countdown}с)` : "Автообновление на паузе"}
                </span>
              </div>
              <button
                onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-bold text-zinc-300 hover:text-white transition cursor-pointer"
              >
                {autoRefreshEnabled ? "Пауза" : "Включить"}
              </button>
            </div>

            {/* Sync Now Button */}
            <button
              onClick={handleSyncWithDota}
              disabled={isSyncing}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-[#0A84FF] hover:bg-[#007AFF] text-white font-bold text-sm shadow-[0_8px_24px_rgba(10,132,255,0.4)] active:scale-95 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`size-4 ${isSyncing ? "animate-spin" : ""}`} />
              <span>{isSyncing ? "Синхронизация..." : "Синхронизировать с Dota 2"}</span>
            </button>

            {syncMessage && (
              <div className="text-xs font-mono text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl text-center animate-in fade-in">
                {syncMessage}
              </div>
            )}
          </div>
        </div>

        {/* ── Player Guide: Why use this section? ── */}
        <div className="mt-8 pt-6 border-t border-white/[0.08] grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-1">
            <div className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
              <span>📋</span>
              <span>Копируй Match ID в Dota 2</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Нажми «Копировать ID» и вставь в клиенте Dota 2 (вкладка «Просмотр» → «Загрузить реплей по ID»), чтобы смотреть игру прямо в игре от лица игрока.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-1">
            <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
              <span>⚡</span>
              <span>Билды и закуп патча 7.41d</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Разверни «Составы и Закуп», чтобы увидеть точные 6 активных слотов, 3 слота в рюкзаке и нейтральный предмет для каждого из 10 героев.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-1">
            <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <span>⏱️</span>
              <span>Тайминги и разбор</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Нажми «Разбор», чтобы перейти к детальному поминутному плееру слотов, графикам нетворса и хронологии смертей в матче.
            </p>
          </div>
        </div>

        {/* ── Key Metrics Cards Bar ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-8 pt-6 border-t border-white/[0.08]">
          <div className="rounded-2xl border border-white/[0.06] bg-black/40 p-4 space-y-1">
            <div className="text-xs text-zinc-400 font-medium flex items-center gap-1.5">
              <Zap className="size-3.5 text-blue-400" /> Доступно матчей
            </div>
            <div className="text-2xl font-black font-mono text-white">
              {stats.totalMatches.toLocaleString()}
            </div>
            <div className="text-[11px] text-zinc-500 font-mono">актуальных хай-ММР каток</div>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-black/40 p-4 space-y-1">
            <div className="text-xs text-zinc-400 font-medium flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-purple-400" /> Полных реплеев
            </div>
            <div className="text-2xl font-black font-mono text-purple-300">
              {stats.parsedMatches}
            </div>
            <div className="text-[11px] text-zinc-500 font-mono">с поминутной аналитикой</div>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-black/40 p-4 space-y-1">
            <div className="text-xs text-zinc-400 font-medium flex items-center gap-1.5">
              <Trophy className="size-3.5 text-amber-400" /> Винрейт Свет / Тьма
            </div>
            <div className="text-2xl font-black font-mono text-emerald-400">
              {radWinPct}% <span className="text-zinc-500 text-lg font-normal">/</span> <span className="text-rose-400">{direWinPct}%</span>
            </div>
            <div className="text-[11px] text-zinc-500 font-mono">{stats.radiantWins} vs {stats.direWins}</div>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-black/40 p-4 space-y-1">
            <div className="text-xs text-zinc-400 font-medium flex items-center gap-1.5">
              <Clock className="size-3.5 text-sky-400" /> Средняя длительность
            </div>
            <div className="text-2xl font-black font-mono text-sky-300">
              {stats.avgDuration > 0 ? formatDuration(stats.avgDuration) : "—"}
            </div>
            <div className="text-[11px] text-zinc-500 font-mono">по всем сохраненным каткам</div>
          </div>
        </div>
      </div>

      {/* ── Filters & Search Controls ── */}
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-md p-4 sm:p-5 shadow-lg flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search bar */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Поиск по Match ID (напр. 9022834804) или никнейму..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/50 pl-10 pr-24 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition font-mono"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition cursor-pointer"
          >
            Найти
          </button>
        </form>

        {/* Winner filter pills */}
        <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 p-1 rounded-xl text-xs font-semibold flex-wrap">
          <button
            onClick={() => {
              setSelectedWinner("all");
              handleFetchPage(1, "all");
            }}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              selectedWinner === "all"
                ? "bg-white/20 text-white shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Все ({total})
          </button>
          <button
            onClick={() => {
              setSelectedWinner("radiant");
              handleFetchPage(1, "radiant");
            }}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              selectedWinner === "radiant"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                : "text-zinc-400 hover:text-emerald-400"
            }`}
          >
            Свет
          </button>
          <button
            onClick={() => {
              setSelectedWinner("dire");
              handleFetchPage(1, "dire");
            }}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              selectedWinner === "dire"
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                : "text-zinc-400 hover:text-rose-400"
            }`}
          >
            Тьма
          </button>

          <div className="h-4 w-px bg-white/10 mx-1" />

          <button
            onClick={() => {
              const next = !onlyParsed;
              setOnlyParsed(next);
              handleFetchPage(1, selectedWinner, searchQuery, next);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer border ${
              onlyParsed
                ? "bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-sm font-bold"
                : "text-zinc-400 border-transparent hover:text-purple-300"
            }`}
          >
            <Sparkles className="size-3 text-purple-400" />
            <span>С реплеем</span>
          </button>
        </div>
      </div>

      {/* ── Matches Feed / List ── */}
      {isPending ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <RefreshCw className="size-8 text-blue-400 animate-spin" />
          <span className="text-sm font-mono text-zinc-400">Загрузка данных из базы...</span>
        </div>
      ) : matches.length === 0 ? (
        <div className="rounded-3xl border border-zinc-800/80 bg-zinc-900/50 p-12 text-center space-y-4">
          <div className="size-16 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center mx-auto text-zinc-500">
            <Database className="size-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">В базе пока нет матчей по этому запросу</h3>
            <p className="text-sm text-zinc-400 max-w-md mx-auto">
              Нажмите кнопку «Обновить из Dota 2» выше или введите любой реальный Match ID в поиск.
            </p>
          </div>
          <button
            onClick={handleSyncWithDota}
            disabled={isSyncing}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg transition cursor-pointer"
          >
            Загрузить последние матчи
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {matches.map((m) => {
            const radWon = m.radiantWin;
            const isExpanded = expandedMatchIds.has(m.matchId);

            // Compute highest hero damage in match for proportion bars
            const maxDmgInMatch = Math.max(
              1,
              ...m.allPlayers.map((p) => p.heroDamage || 0)
            );

            return (
              <div
                key={m.matchId}
                className={`rounded-2xl border transition-all duration-300 backdrop-blur-md shadow-md ${
                  isExpanded
                    ? "border-zinc-700/80 bg-zinc-900/90 shadow-2xl"
                    : "border-zinc-800/80 bg-zinc-900/50 hover:bg-zinc-900/80 hover:border-zinc-700/80"
                }`}
              >
                {/* ── Match Row Summary Header (Compact View) ── */}
                <div className="p-4 sm:p-5">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Match Info & Outcome */}
                    <div className="space-y-2 shrink-0 lg:w-64">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider font-mono border ${
                            radWon
                              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                              : "bg-rose-500/15 text-rose-300 border-rose-500/30"
                          }`}
                        >
                          {radWon ? "Победа Света" : "Победа Тьмы"}
                        </span>
                        <span className="text-xs font-mono text-zinc-300 font-bold bg-white/[0.05] px-2 py-0.5 rounded-md border border-white/[0.08]">
                          {m.radiantScore} : {m.direScore}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-white group-hover:text-blue-400 transition font-mono">
                            #{m.matchId}
                          </span>
                          <button
                            onClick={(e) => handleCopyMatchId(e, m.matchId)}
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition cursor-pointer border ${
                              copiedMatchId === m.matchId
                                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                                : "bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white border-white/[0.08]"
                            }`}
                            title="Скопировать Match ID для Dota 2 клиента"
                          >
                            {copiedMatchId === m.matchId ? "✓ Скопировано" : "📋 Копировать ID"}
                          </button>
                          {m.isParsed && (
                            <span
                              className="size-2 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.8)]"
                              title="Поминутный реплей распарсен"
                            />
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-mono">
                          <span>{m.gameModeName}</span>
                          <span>•</span>
                          <span>{formatDuration(m.duration)}</span>
                          <span>•</span>
                          <span>{formatDate(m.startTime)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Center: Radiant 5 vs Dire 5 Hero Lineup */}
                    <div className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-5 bg-black/30 p-2.5 sm:p-3 rounded-xl border border-white/[0.04]">
                      {/* Radiant Team (5 heroes) */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-emerald-400 uppercase font-mono mr-1 hidden sm:inline">
                          Свет
                        </span>
                        {m.radiantHeroes.slice(0, 5).map((h, idx) => {
                          const hero = heroMap.get(h.heroId);
                          return (
                            <div
                              key={idx}
                              className="relative size-8 sm:size-9 rounded-lg overflow-hidden border border-emerald-500/40 bg-zinc-950 shrink-0 shadow-sm group/h"
                              title={`${hero?.localized_name || "Герой"}: ${h.kills}/${h.deaths}/${h.assists} | Нетворс: ${h.netWorth.toLocaleString()} 🪙`}
                            >
                              {hero?.name ? (
                                <img
                                  src={heroIconUrl(hero.name)}
                                  alt=""
                                  className="size-full object-cover"
                                />
                              ) : (
                                <div className="size-full bg-emerald-950/40" />
                              )}
                              <span className="absolute bottom-0 right-0 text-[8px] font-mono font-bold bg-black/80 px-1 text-zinc-300 rounded-tl">
                                {h.level}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* VS Badge */}
                      <span className="text-[10px] font-black font-mono text-zinc-500 uppercase px-1">
                        VS
                      </span>

                      {/* Dire Team (5 heroes) */}
                      <div className="flex items-center gap-1.5">
                        {m.direHeroes.slice(0, 5).map((h, idx) => {
                          const hero = heroMap.get(h.heroId);
                          return (
                            <div
                              key={idx}
                              className="relative size-8 sm:size-9 rounded-lg overflow-hidden border border-rose-500/40 bg-zinc-950 shrink-0 shadow-sm group/h"
                              title={`${hero?.localized_name || "Герой"}: ${h.kills}/${h.deaths}/${h.assists} | Нетворс: ${h.netWorth.toLocaleString()} 🪙`}
                            >
                              {hero?.name ? (
                                <img
                                  src={heroIconUrl(hero.name)}
                                  alt=""
                                  className="size-full object-cover"
                                />
                              ) : (
                                <div className="size-full bg-rose-950/40" />
                              )}
                              <span className="absolute bottom-0 right-0 text-[8px] font-mono font-bold bg-black/80 px-1 text-zinc-300 rounded-tl">
                                {h.level}
                              </span>
                            </div>
                          );
                        })}
                        <span className="text-[10px] font-bold text-rose-400 uppercase font-mono ml-1 hidden sm:inline">
                          Тьма
                        </span>
                      </div>
                    </div>

                    {/* Right: Actions (Expand Accordion + Match Details Link) */}
                    <div className="shrink-0 flex items-center justify-end gap-2">
                      <button
                        onClick={() => toggleExpand(m.matchId)}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                          isExpanded
                            ? "bg-blue-500/20 text-blue-300 border-blue-500/40"
                            : "bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white border-white/[0.08]"
                        }`}
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="size-4" />
                            <span>Свернуть закуп</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown className="size-4" />
                            <span>Составы и Закуп (10 игроков)</span>
                          </>
                        )}
                      </button>

                      <Link
                        href={`/match/${m.matchId}`}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-[#0A84FF] text-white text-xs font-bold transition-all shadow-sm hover:shadow-[0_4px_16px_rgba(10,132,255,0.4)]"
                      >
                        <span>Разбор</span>
                        <ArrowRight className="size-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>

                {/* ── Expanded Full Match Scoreboard (Maximum Detail) ── */}
                {isExpanded && (
                  <div className="border-t border-white/[0.08] bg-black/40 p-4 sm:p-6 space-y-6 animate-in fade-in duration-200">
                    
                    {/* ── Team 1: Radiant Scoreboard ── */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase font-mono ${
                              radWon
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : "bg-zinc-800 text-zinc-400"
                            }`}
                          >
                            {radWon ? "Победа" : "Поражение"}
                          </span>
                          <span className="font-extrabold text-sm sm:text-base text-emerald-400 uppercase tracking-wider">
                            Силы Света (Radiant)
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs font-mono text-zinc-300">
                          <div>
                            Счет: <strong className="text-white">{m.radiantScore}</strong>
                          </div>
                          <div>
                            Золото:{" "}
                            <strong className="text-amber-400">
                              {(m.radiantTotalNetWorth || 0).toLocaleString()} 🪙
                            </strong>
                          </div>
                        </div>
                      </div>

                      {/* Radiant Players Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-zinc-300 min-w-[760px]">
                          <thead>
                            <tr className="border-b border-white/[0.06] text-[10px] text-zinc-500 uppercase font-mono tracking-wider">
                              <th className="py-2 px-2">Игрок / Герой</th>
                              <th className="py-2 px-2 text-center">Роль</th>
                              <th className="py-2 px-2 text-center">IMP</th>
                              <th className="py-2 px-2 text-center">Ур.</th>
                              <th className="py-2 px-2 text-center">K / D / A</th>
                              <th className="py-2 px-2 text-center">Нетворс</th>
                              <th className="py-2 px-2 text-center">Крипы</th>
                              <th className="py-2 px-2 text-center">GPM / XPM</th>
                              <th className="py-2 px-2 text-center">Урон</th>
                              <th className="py-2 px-2 text-left">Предметы (6 слотов + рюкзак)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.04]">
                            {m.radiantHeroes.map((p, pIdx) => {
                              const hero = heroMap.get(p.heroId);
                              const dmgPct = Math.round((p.heroDamage / maxDmgInMatch) * 100);

                              return (
                                <tr key={pIdx} className="hover:bg-white/[0.03] transition">
                                  {/* Player & Hero */}
                                  <td className="py-2.5 px-2">
                                    <div className="flex items-center gap-2.5">
                                      <div className="relative size-8 rounded-lg overflow-hidden border border-emerald-500/40 bg-zinc-950 shrink-0">
                                        {hero?.name ? (
                                          <img
                                            src={heroIconUrl(hero.name)}
                                            alt=""
                                            className="size-full object-cover"
                                          />
                                        ) : (
                                          <div className="size-full bg-emerald-950/40" />
                                        )}
                                      </div>
                                      <div className="min-w-0 max-w-[130px]">
                                        {p.accountId ? (
                                          <Link
                                            href={`/player/${p.accountId}`}
                                            className="font-bold text-white hover:text-blue-400 truncate block transition"
                                          >
                                            {p.personaname || `Игрок #${p.accountId}`}
                                          </Link>
                                        ) : (
                                          <div className="font-semibold text-zinc-300 truncate">
                                            {p.personaname || "Аноним"}
                                          </div>
                                        )}
                                        <div className="text-[10px] text-zinc-400 truncate">
                                          {hero?.localized_name || `Герой #${p.heroId}`}
                                        </div>
                                      </div>
                                    </div>
                                  </td>

                                  {/* Position Role */}
                                  <td className="py-2.5 px-2 text-center">
                                    <span
                                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${
                                        POS_LABELS[p.posRole || 1]?.color || "text-zinc-400 border-white/10"
                                      }`}
                                      title={POS_LABELS[p.posRole || 1]?.title}
                                    >
                                      <span>{POS_LABELS[p.posRole || 1]?.icon}</span>
                                      <span>{p.posRoman || "I"}</span>
                                    </span>
                                  </td>

                                  {/* IMP Score */}
                                  <td className="py-2.5 px-2 text-center font-mono">
                                    {p.isMvp ? (
                                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm shadow-amber-950/40">
                                        👑 MVP
                                      </span>
                                    ) : (
                                      <span
                                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                          (p.impScore || 0) > 0
                                            ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                                            : (p.impScore || 0) < 0
                                            ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                                            : "bg-white/[0.04] text-zinc-400 border-white/[0.08]"
                                        }`}
                                      >
                                        {(p.impScore || 0) > 0 ? `+${p.impScore}` : p.impScore || 0}
                                      </span>
                                    )}
                                  </td>

                                  {/* Level */}
                                  <td className="py-2.5 px-2 text-center font-mono font-bold text-zinc-300">
                                    {p.level}
                                  </td>

                                  {/* KDA */}
                                  <td className="py-2.5 px-2 text-center font-mono font-bold">
                                    <span className="text-white">{p.kills}</span>
                                    <span className="text-zinc-600"> / </span>
                                    <span className="text-rose-400">{p.deaths}</span>
                                    <span className="text-zinc-600"> / </span>
                                    <span className="text-zinc-400">{p.assists}</span>
                                  </td>

                                  {/* Net worth */}
                                  <td className="py-2.5 px-2 text-center font-mono font-bold text-amber-400">
                                    {p.netWorth > 0 ? `${(p.netWorth / 1000).toFixed(1)}k` : "—"}
                                  </td>

                                  {/* CS */}
                                  <td className="py-2.5 px-2 text-center font-mono text-zinc-400">
                                    {p.lastHits} / {p.denies}
                                  </td>

                                  {/* GPM / XPM */}
                                  <td className="py-2.5 px-2 text-center font-mono text-zinc-400">
                                    <span className="text-amber-300">{p.gpm}</span> / <span>{p.xpm}</span>
                                  </td>

                                  {/* Damage with proportion bar */}
                                  <td className="py-2.5 px-2 text-center font-mono">
                                    <div className="text-zinc-300 text-[11px] font-bold">
                                      {p.heroDamage.toLocaleString()}
                                    </div>
                                    <div className="w-16 h-1 bg-white/10 rounded-full mx-auto mt-1 overflow-hidden">
                                      <div
                                        className="h-full bg-emerald-400 rounded-full"
                                        style={{ width: `${dmgPct}%` }}
                                      />
                                    </div>
                                  </td>

                                  {/* Inventory HUD (6 slots + backpack + neutral) */}
                                  <td className="py-2.5 px-2">
                                    <DotaInventoryHud
                                      items={[p.item0, p.item1, p.item2, p.item3, p.item4, p.item5]}
                                      backpack={[p.backpack0, p.backpack1, p.backpack2]}
                                      neutralItem={p.itemNeutral}
                                      size="xs"
                                      showBackpack={true}
                                      showNeutral={true}
                                      showAghs={false}
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* ── Team 2: Dire Scoreboard ── */}
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between border-b border-rose-500/20 pb-2">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase font-mono ${
                              !radWon
                                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                : "bg-zinc-800 text-zinc-400"
                            }`}
                          >
                            {!radWon ? "Победа" : "Поражение"}
                          </span>
                          <span className="font-extrabold text-sm sm:text-base text-rose-400 uppercase tracking-wider">
                            Силы Тьмы (Dire)
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs font-mono text-zinc-300">
                          <div>
                            Счет: <strong className="text-white">{m.direScore}</strong>
                          </div>
                          <div>
                            Золото:{" "}
                            <strong className="text-amber-400">
                              {(m.direTotalNetWorth || 0).toLocaleString()} 🪙
                            </strong>
                          </div>
                        </div>
                      </div>

                      {/* Dire Players Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-zinc-300 min-w-[760px]">
                          <thead>
                            <tr className="border-b border-white/[0.06] text-[10px] text-zinc-500 uppercase font-mono tracking-wider">
                              <th className="py-2 px-2">Игрок / Герой</th>
                              <th className="py-2 px-2 text-center">Роль</th>
                              <th className="py-2 px-2 text-center">IMP</th>
                              <th className="py-2 px-2 text-center">Ур.</th>
                              <th className="py-2 px-2 text-center">K / D / A</th>
                              <th className="py-2 px-2 text-center">Нетворс</th>
                              <th className="py-2 px-2 text-center">Крипы</th>
                              <th className="py-2 px-2 text-center">GPM / XPM</th>
                              <th className="py-2 px-2 text-center">Урон</th>
                              <th className="py-2 px-2 text-left">Предметы (6 слотов + рюкзак)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.04]">
                            {m.direHeroes.map((p, pIdx) => {
                              const hero = heroMap.get(p.heroId);
                              const dmgPct = Math.round((p.heroDamage / maxDmgInMatch) * 100);

                              return (
                                <tr key={pIdx} className="hover:bg-white/[0.03] transition">
                                  {/* Player & Hero */}
                                  <td className="py-2.5 px-2">
                                    <div className="flex items-center gap-2.5">
                                      <div className="relative size-8 rounded-lg overflow-hidden border border-rose-500/40 bg-zinc-950 shrink-0">
                                        {hero?.name ? (
                                          <img
                                            src={heroIconUrl(hero.name)}
                                            alt=""
                                            className="size-full object-cover"
                                          />
                                        ) : (
                                          <div className="size-full bg-rose-950/40" />
                                        )}
                                      </div>
                                      <div className="min-w-0 max-w-[130px]">
                                        {p.accountId ? (
                                          <Link
                                            href={`/player/${p.accountId}`}
                                            className="font-bold text-white hover:text-blue-400 truncate block transition"
                                          >
                                            {p.personaname || `Игрок #${p.accountId}`}
                                          </Link>
                                        ) : (
                                          <div className="font-semibold text-zinc-300 truncate">
                                            {p.personaname || "Аноним"}
                                          </div>
                                        )}
                                        <div className="text-[10px] text-zinc-400 truncate">
                                          {hero?.localized_name || `Герой #${p.heroId}`}
                                        </div>
                                      </div>
                                    </div>
                                  </td>

                                  {/* Position Role */}
                                  <td className="py-2.5 px-2 text-center">
                                    <span
                                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${
                                        POS_LABELS[p.posRole || 1]?.color || "text-zinc-400 border-white/10"
                                      }`}
                                      title={POS_LABELS[p.posRole || 1]?.title}
                                    >
                                      <span>{POS_LABELS[p.posRole || 1]?.icon}</span>
                                      <span>{p.posRoman || "I"}</span>
                                    </span>
                                  </td>

                                  {/* IMP Score */}
                                  <td className="py-2.5 px-2 text-center font-mono">
                                    {p.isMvp ? (
                                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm shadow-amber-950/40">
                                        👑 MVP
                                      </span>
                                    ) : (
                                      <span
                                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                          (p.impScore || 0) > 0
                                            ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                                            : (p.impScore || 0) < 0
                                            ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                                            : "bg-white/[0.04] text-zinc-400 border-white/[0.08]"
                                        }`}
                                      >
                                        {(p.impScore || 0) > 0 ? `+${p.impScore}` : p.impScore || 0}
                                      </span>
                                    )}
                                  </td>

                                  {/* Level */}
                                  <td className="py-2.5 px-2 text-center font-mono font-bold text-zinc-300">
                                    {p.level}
                                  </td>

                                  {/* KDA */}
                                  <td className="py-2.5 px-2 text-center font-mono font-bold">
                                    <span className="text-white">{p.kills}</span>
                                    <span className="text-zinc-600"> / </span>
                                    <span className="text-rose-400">{p.deaths}</span>
                                    <span className="text-zinc-600"> / </span>
                                    <span className="text-zinc-400">{p.assists}</span>
                                  </td>

                                  {/* Net worth */}
                                  <td className="py-2.5 px-2 text-center font-mono font-bold text-amber-400">
                                    {p.netWorth > 0 ? `${(p.netWorth / 1000).toFixed(1)}k` : "—"}
                                  </td>

                                  {/* CS */}
                                  <td className="py-2.5 px-2 text-center font-mono text-zinc-400">
                                    {p.lastHits} / {p.denies}
                                  </td>

                                  {/* GPM / XPM */}
                                  <td className="py-2.5 px-2 text-center font-mono text-zinc-400">
                                    <span className="text-amber-300">{p.gpm}</span> / <span>{p.xpm}</span>
                                  </td>

                                  {/* Damage with proportion bar */}
                                  <td className="py-2.5 px-2 text-center font-mono">
                                    <div className="text-zinc-300 text-[11px] font-bold">
                                      {p.heroDamage.toLocaleString()}
                                    </div>
                                    <div className="w-16 h-1 bg-white/10 rounded-full mx-auto mt-1 overflow-hidden">
                                      <div
                                        className="h-full bg-rose-400 rounded-full"
                                        style={{ width: `${dmgPct}%` }}
                                      />
                                    </div>
                                  </td>

                                  {/* Inventory HUD (6 slots + backpack + neutral) */}
                                  <td className="py-2.5 px-2">
                                    <DotaInventoryHud
                                      items={[p.item0, p.item1, p.item2, p.item3, p.item4, p.item5]}
                                      backpack={[p.backpack0, p.backpack1, p.backpack2]}
                                      neutralItem={p.itemNeutral}
                                      size="xs"
                                      showBackpack={true}
                                      showNeutral={true}
                                      showAghs={false}
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* ── Match Footer Summary Bar ── */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/[0.08] text-xs font-mono text-zinc-400">
                      <div className="flex flex-wrap items-center gap-3">
                        {m.firstBloodTime !== undefined && (
                          <div className="flex items-center gap-1.5 bg-white/[0.04] px-2.5 py-1 rounded-lg border border-white/[0.06]">
                            <Flame className="size-3.5 text-rose-400" />
                            <span>First Blood: {formatDuration(m.firstBloodTime)}</span>
                          </div>
                        )}
                        {m.skillBracket && (
                          <div className="bg-white/[0.04] px-2.5 py-1 rounded-lg border border-white/[0.06] text-blue-300">
                            {m.skillBracket}
                          </div>
                        )}
                        {m.regionName && (
                          <div className="bg-white/[0.04] px-2.5 py-1 rounded-lg border border-white/[0.06]">
                            Регион: {m.regionName}
                          </div>
                        )}
                        <button
                          onClick={(e) => handleCopyCommand(e, `watch_server ${m.matchId}`, m.matchId)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-zinc-300 hover:text-white transition cursor-pointer text-[11px] font-mono"
                          title="Скопировать команду в консоль игры для просмотра реплея"
                        >
                          <Radio className="size-3 text-red-400" />
                          <span>watch_server {m.matchId}</span>
                          {copiedCommand === m.matchId ? (
                            <Check className="size-3 text-emerald-400" />
                          ) : (
                            <Copy className="size-3 text-zinc-400" />
                          )}
                        </button>
                      </div>

                      <Link
                        href={`/match/${m.matchId}`}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0A84FF] hover:bg-[#007AFF] text-white font-bold text-xs transition shadow-[0_4px_16px_rgba(10,132,255,0.4)] active:scale-95"
                      >
                        <Sparkles className="size-3.5" />
                        <span>Открыть поминутную хронологию матча</span>
                        <ArrowRight className="size-3.5" />
                      </Link>
                    </div>

                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Pagination Bar ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-white/[0.08] pt-4 text-xs font-mono text-zinc-400">
          <div>
            Страница <strong className="text-white">{page}</strong> из{" "}
            <strong className="text-white">{totalPages}</strong> (Всего: {total})
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleFetchPage(page - 1)}
              disabled={page <= 1 || isPending}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.04] text-white font-semibold hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
            >
              <ChevronLeft className="size-4" /> Назад
            </button>
            <button
              onClick={() => handleFetchPage(page + 1)}
              disabled={page >= totalPages || isPending}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.04] text-white font-semibold hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
            >
              Вперед <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
