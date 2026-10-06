"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import {
  TrendingUp,
  Coins,
  Zap,
  Swords,
  Shield,
  Layers,
  Sparkles,
} from "lucide-react";
import {
  type FullMatchDetails,
  type OpenDotaHero,
  heroIconUrl,
} from "@/lib/opendota";
import { getPlayerSlotInfo } from "@/lib/positions";

interface StratzChartsProps {
  match: FullMatchDetails;
  heroes: OpenDotaHero[];
  currentMinute: number;
  onChangeMinute: (min: number) => void;
  selectedSlot: number;
  onSelectSlot: (slot: number) => void;
}

function fmtSec(sec: number): string {
  const m = Math.floor(Math.max(0, sec) / 60);
  const s = Math.floor(Math.max(0, sec)) % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Catmull-Rom to Cubic Bezier smooth spline generator
 */
function pointsToSmoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0].x},${pts[0].y}`;
  let d = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

export function StratzCharts({
  match,
  heroes,
  currentMinute,
  onChangeMinute,
  selectedSlot,
  onSelectSlot,
}: StratzChartsProps) {
  const [advMode, setAdvMode] = useState<"gold" | "xp">("gold");
  const [nwFilter, setNwFilter] = useState<"all" | "radiant" | "dire" | "selected">("all");
  const [activeScrubMin, setActiveScrubMin] = useState<number | null>(null);

  const heroMap = useMemo(() => new Map(heroes.map((h) => [h.id, h])), [heroes]);
  const maxMinute = Math.max(1, Math.floor(match.duration / 60));

  const radiantPlayers = useMemo(
    () => [...match.players.filter((p) => p.isRadiant)].sort((a, b) => a.player_slot - b.player_slot),
    [match.players]
  );
  const direPlayers = useMemo(
    () => [...match.players.filter((p) => !p.isRadiant)].sort((a, b) => a.player_slot - b.player_slot),
    [match.players]
  );

  // Total team stats
  const totalRadiantNw = useMemo(() => radiantPlayers.reduce((a, b) => a + (b.net_worth ?? 0), 0), [radiantPlayers]);
  const totalDireNw = useMemo(() => direPlayers.reduce((a, b) => a + (b.net_worth ?? 0), 0), [direPlayers]);
  const totalRadiantDmg = useMemo(() => radiantPlayers.reduce((a, b) => a + (b.hero_damage ?? 0), 0), [radiantPlayers]);
  const totalDireDmg = useMemo(() => direPlayers.reduce((a, b) => a + (b.hero_damage ?? 0), 0), [direPlayers]);

  // 1. Advantage data
  const advData = advMode === "gold" ? match.radiant_gold_adv : match.radiant_xp_adv;
  const maxAdv = Math.max(2000, ...advData.map((v) => Math.abs(v)));
  const finalAdv = advData.length > 0 ? advData[advData.length - 1] : 0;

  // 2. Net worth progression series for all 10 players
  const allNwSeries = useMemo(() => {
    const sorted = [...match.players].sort((a, b) => a.player_slot - b.player_slot);
    return sorted.map((p) => {
      const h = heroMap.get(p.hero_id);
      let series: number[] = [];
      if (p.networth_t && p.networth_t.length > 0) {
        series = p.networth_t;
      } else if (p.gold_t && p.gold_t.length > 0) {
        series = p.gold_t;
      } else {
        const finalNw = p.net_worth ?? 0;
        series = Array.from({ length: maxMinute + 1 }, (_, m) => Math.round(finalNw * (m / maxMinute)));
      }

      const slotInfo = getPlayerSlotInfo(p.player_slot);

      return {
        player: p,
        hero: h,
        series,
        color: slotInfo.color,
        slotInfo,
        isSelected: p.player_slot === selectedSlot,
      };
    });
  }, [match.players, heroMap, maxMinute, selectedSlot]);

  const maxPlayerNw = useMemo(() => {
    let max = 3000;
    for (const item of allNwSeries) {
      for (const val of item.series) {
        if (val > max) max = val;
      }
    }
    return max;
  }, [allNwSeries]);

  const filteredNwSeries = useMemo(() => {
    if (nwFilter === "radiant") return allNwSeries.filter((s) => s.player.isRadiant);
    if (nwFilter === "dire") return allNwSeries.filter((s) => !s.player.isRadiant);
    if (nwFilter === "selected") return allNwSeries.filter((s) => s.isSelected);
    return allNwSeries;
  }, [allNwSeries, nwFilter]);

  const chartW = 860;
  const chartH = 240;
  const padX = 50;
  const padY = 24;

  const displayMinute = activeScrubMin ?? currentMinute;
  const currentLeadVal = advData[displayMinute] ?? (advData.length > 0 ? advData[advData.length - 1] : 0);

  // Interactive scrubber handlers (supporting mouse drag & mobile touch swipe)
  const handleScrub = useCallback((clientX: number, target: SVGSVGElement) => {
    const rect = target.getBoundingClientRect();
    const relX = clientX - rect.left;
    const usableW = rect.width * ((chartW - padX * 2) / chartW);
    const startX = rect.width * (padX / chartW);
    const ratio = Math.max(0, Math.min(1, (relX - startX) / usableW));
    const targetMin = Math.round(ratio * maxMinute);
    setActiveScrubMin(targetMin);
    onChangeMinute(targetMin);
  }, [maxMinute, onChangeMinute, padX, chartW]);

  // Selected player for networth callout
  const selectedSeries = useMemo(
    () => allNwSeries.find((s) => s.isSelected) ?? allNwSeries[0],
    [allNwSeries]
  );

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* ── 1. Apple-style Advantage Area Chart (Gold & XP) ───────────── */}
      <div className="rounded-3xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-md p-4 sm:p-6 shadow-xl space-y-4">
        {/* Header with Segmented Control */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-300">
                <TrendingUp className="size-4" />
              </div>
              <h3 className="text-sm font-semibold tracking-tight text-white">
                Динамика преимущества команд
              </h3>
            </div>
            <p className="text-xs text-zinc-400">
              График перевеса по золоту или опыту с плавными сплайнами и сенсорной прокруткой
            </p>
          </div>

          {/* Segmented Control: Gold / XP */}
          <div className="inline-flex self-start sm:self-auto p-1 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-xl">
            <button
              onClick={() => setAdvMode("gold")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                advMode === "gold"
                  ? "bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/60"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Coins className="size-3.5 text-amber-300" />
              <span>Золото</span>
            </button>
            <button
              onClick={() => setAdvMode("xp")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                advMode === "xp"
                  ? "bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/60"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Zap className="size-3.5 text-sky-400" />
              <span>Опыт</span>
            </button>
          </div>
        </div>

        {/* Live Scrubber Floating Pill Banner */}
        <div className="flex items-center justify-between px-3.5 py-2 rounded-2xl bg-white/[0.04] border border-white/[0.06] text-xs font-mono">
          <div className="flex items-center gap-2 text-zinc-300">
            <span className="size-2 rounded-full bg-amber-400 animate-pulse" />
            <span>Время: <strong>{fmtSec(displayMinute * 60)}</strong> ({displayMinute}-я мин)</span>
          </div>
          <div className="font-semibold">
            {currentLeadVal >= 0 ? (
              <span className="text-emerald-400">
                +{currentLeadVal.toLocaleString("ru-RU")} в пользу Сил Света
              </span>
            ) : (
              <span className="text-rose-400">
                +{Math.abs(currentLeadVal).toLocaleString("ru-RU")} в пользу Сил Тьмы
              </span>
            )}
          </div>
        </div>

        {/* Responsive Interactive SVG Advantage Chart */}
        <div className="w-full relative touch-none select-none">
          <svg
            viewBox={`0 0 ${chartW} ${chartH}`}
            className="w-full h-44 sm:h-56 cursor-crosshair overflow-visible"
            onMouseMove={(e) => handleScrub(e.clientX, e.currentTarget)}
            onMouseLeave={() => setActiveScrubMin(null)}
            onTouchStart={(e) => handleScrub(e.touches[0].clientX, e.currentTarget)}
            onTouchMove={(e) => handleScrub(e.touches[0].clientX, e.currentTarget)}
            onTouchEnd={() => setActiveScrubMin(null)}
            onClick={(e) => handleScrub(e.clientX, e.currentTarget)}
          >
            <defs>
              <linearGradient id="iosRadGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#30d158" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#30d158" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="iosDireGrad" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="#ff453a" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#ff453a" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Zero Baseline */}
            <line
              x1={padX}
              y1={chartH / 2}
              x2={chartW - padX}
              y2={chartH / 2}
              stroke="rgba(255,255,255,0.12)"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
            <text x={padX - 10} y={chartH / 2 + 4} textAnchor="end" fill="#71717a" fontSize="10" fontFamily="monospace">
              0
            </text>
            <text x={padX - 10} y={padY + 4} textAnchor="end" fill="#30d158" fontSize="10" fontFamily="monospace" fontWeight="600">
              +{(maxAdv / 1000).toFixed(0)}k
            </text>
            <text x={padX - 10} y={chartH - padY + 4} textAnchor="end" fill="#ff453a" fontSize="10" fontFamily="monospace" fontWeight="600">
              -{(maxAdv / 1000).toFixed(0)}k
            </text>

            {/* Smooth Spline Area Path */}
            {advData.length > 0 && (() => {
              const pts = advData.map((val, idx) => {
                const x = padX + (idx / Math.max(1, advData.length - 1)) * (chartW - padX * 2);
                const y = chartH / 2 - (val / maxAdv) * (chartH / 2 - padY);
                return { x, y };
              });

              const smoothLine = pointsToSmoothPath(pts);
              const firstPt = pts[0];
              const lastPt = pts[pts.length - 1];
              const areaD = `${smoothLine} L ${lastPt.x},${chartH / 2} L ${firstPt.x},${chartH / 2} Z`;

              return (
                <g>
                  <path
                    d={areaD}
                    fill={finalAdv >= 0 ? "url(#iosRadGrad)" : "url(#iosDireGrad)"}
                  />
                  <path
                    d={smoothLine}
                    fill="none"
                    stroke={finalAdv >= 0 ? "#30d158" : "#ff453a"}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              );
            })()}

            {/* Interactive Vertical Scrubber Line & Dot */}
            {(() => {
              const curX = padX + (displayMinute / maxMinute) * (chartW - padX * 2);
              const val = advData[displayMinute] ?? 0;
              const curY = chartH / 2 - (val / maxAdv) * (chartH / 2 - padY);
              return (
                <g>
                  <line
                    x1={curX}
                    y1={padY}
                    x2={curX}
                    y2={chartH - padY}
                    stroke="#ffd60a"
                    strokeWidth="2"
                    strokeDasharray="4 2"
                  />
                  <circle
                    cx={curX}
                    cy={curY}
                    r="5"
                    fill="#ffd60a"
                    stroke="#000000"
                    strokeWidth="2"
                    className="shadow-lg"
                  />
                </g>
              );
            })()}
          </svg>
        </div>

        {/* Legend / Tip */}
        <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-zinc-400 pt-2 border-t border-white/[0.06]">
          <span className="text-emerald-400 font-semibold">▲ Силы Света (+{advMode === "gold" ? "золото" : "опыт"})</span>
          <span className="text-zinc-500">Проведите пальцем или курсором для выбора минуты</span>
          <span className="text-rose-400 font-semibold">▼ Силы Тьмы (+{advMode === "gold" ? "золото" : "опыт"})</span>
        </div>
      </div>

      {/* ── 2. 10-Player Net Worth Progression Chart ─────── */}
      <div className="rounded-3xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-md p-4 sm:p-6 shadow-xl space-y-4">
        {/* Header & Filter Pills */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-xl bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center text-emerald-300">
                <Coins className="size-4" />
              </div>
              <h3 className="text-sm font-semibold tracking-tight text-white">
                Динамика нетворса всех 10 игроков
              </h3>
            </div>
            <p className="text-xs text-zinc-400">
              Индивидуальные кривые золота героев с подсветкой активного игрока
            </p>
          </div>

          {/* Filter Segmented Control */}
          <div className="inline-flex self-start sm:self-auto p-1 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-xl">
            {[
              { id: "all", label: "Все 10" },
              { id: "radiant", label: "Свет" },
              { id: "dire", label: "Тьма" },
              { id: "selected", label: "Выбранный" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setNwFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  nwFilter === f.id
                    ? "bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/60"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Hero Networth Snapshot Pill */}
        {selectedSeries && (
          <div className="flex items-center justify-between px-3.5 py-2 rounded-2xl bg-zinc-800/60 border border-zinc-700/60 text-xs">
            <div className="flex items-center gap-2">
              <div className="size-5 rounded-md overflow-hidden border border-white/20 shrink-0">
                {selectedSeries.hero ? (
                  <img src={heroIconUrl(selectedSeries.hero.name)} alt="" className="size-full object-cover" />
                ) : (
                  <div className="size-full bg-zinc-800" />
                )}
              </div>
              <span className="font-semibold text-white">
                {selectedSeries.hero?.localized_name ?? "Герой"}
              </span>
              <span className="text-zinc-400 font-mono">({selectedSeries.player.personaname})</span>
            </div>

            <div className="font-mono text-xs">
              <span className="text-zinc-400">На {displayMinute}-й мин: </span>
              <strong className="text-amber-300">
                {(selectedSeries.series[displayMinute] ?? selectedSeries.player.net_worth ?? 0).toLocaleString("ru-RU")} 🪙
              </strong>
            </div>
          </div>
        )}

        {/* Responsive Multi-line SVG Chart */}
        <div className="w-full relative touch-none select-none">
          <svg
            viewBox={`0 0 ${chartW} ${chartH}`}
            className="w-full h-48 sm:h-60 cursor-crosshair overflow-visible"
            onMouseMove={(e) => handleScrub(e.clientX, e.currentTarget)}
            onMouseLeave={() => setActiveScrubMin(null)}
            onTouchStart={(e) => handleScrub(e.touches[0].clientX, e.currentTarget)}
            onTouchMove={(e) => handleScrub(e.touches[0].clientX, e.currentTarget)}
            onTouchEnd={() => setActiveScrubMin(null)}
            onClick={(e) => handleScrub(e.clientX, e.currentTarget)}
          >
            {/* Grid horizontal lines */}
            {[0.25, 0.5, 0.75, 1].map((pct, idx) => {
              const y = chartH - padY - pct * (chartH - padY * 2);
              const val = Math.round((maxPlayerNw * pct) / 1000);
              return (
                <g key={idx}>
                  <line
                    x1={padX}
                    y1={y}
                    x2={chartW - padX}
                    y2={y}
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={padX - 10}
                    y={y + 3}
                    textAnchor="end"
                    fill="#71717a"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    {val}k
                  </text>
                </g>
              );
            })}

            {/* Time labels on X axis */}
            {[0, 5, 10, 15, 20, 25, 30, maxMinute].filter((m, i, arr) => arr.indexOf(m) === i && m <= maxMinute).map((m) => {
              const x = padX + (m / maxMinute) * (chartW - padX * 2);
              return (
                <g key={m}>
                  <line x1={x} y1={chartH - padY} x2={x} y2={chartH - padY + 4} stroke="#52525b" />
                  <text
                    x={x}
                    y={chartH - padY + 14}
                    textAnchor="middle"
                    fill="#a1a1aa"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    {m}м
                  </text>
                </g>
              );
            })}

            {/* 10 Smooth Curves */}
            {filteredNwSeries.map((item, idx) => {
              const pts = item.series.map((val, m) => {
                const x = padX + (m / Math.max(1, item.series.length - 1)) * (chartW - padX * 2);
                const y = chartH - padY - (val / maxPlayerNw) * (chartH - padY * 2);
                return { x, y };
              });

              const smoothLine = pointsToSmoothPath(pts);
              const isSel = item.isSelected;

              return (
                <g key={idx} className="cursor-pointer" onClick={() => onSelectSlot(item.player.player_slot)}>
                  <path
                    d={smoothLine}
                    fill="none"
                    stroke={item.color}
                    strokeWidth={isSel ? 3.5 : 1.8}
                    strokeOpacity={isSel ? 1 : nwFilter === "all" ? 0.6 : 0.85}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="hover:stroke-[3.5px] transition-all"
                  />
                  {pts[displayMinute] && (
                    <circle
                      cx={pts[displayMinute].x}
                      cy={pts[displayMinute].y}
                      r={isSel ? 6 : 3.5}
                      fill={item.color}
                      stroke="#000000"
                      strokeWidth="2"
                    />
                  )}
                </g>
              );
            })}

            {/* Vertical Scrubber Line */}
            {(() => {
              const curX = padX + (displayMinute / maxMinute) * (chartW - padX * 2);
              return (
                <line
                  x1={curX}
                  y1={padY}
                  x2={curX}
                  y2={chartH - padY}
                  stroke="#ffd60a"
                  strokeWidth="2"
                  strokeDasharray="4 2"
                />
              );
            })()}
          </svg>
        </div>

        {/* 10 Hero Quick Toggle Chips (Horizontal scrollable on mobile) */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1 -mx-2 px-2">
          {allNwSeries.map((item) => {
            const h = item.hero;
            const currentNw = item.series[displayMinute] ?? item.player.net_worth ?? 0;
            return (
              <button
                key={item.player.player_slot}
                onClick={() => onSelectSlot(item.player.player_slot)}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-2xl border transition-all shrink-0 cursor-pointer text-left ${
                  item.isSelected
                    ? "bg-white/15 border-white/30 shadow-md ring-2 ring-white/20"
                    : "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.08]"
                }`}
              >
                <div
                  className="size-2 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <div className="size-5 rounded-md overflow-hidden bg-zinc-800 shrink-0">
                  {h && <img src={heroIconUrl(h.name)} alt="" className="size-full object-cover" />}
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold text-white truncate max-w-[80px]">
                    {h?.localized_name ?? "Герой"}
                  </div>
                  <div className="text-[10px] font-mono text-amber-300">
                    {currentNw.toLocaleString("ru-RU")}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 3. Apple-style Team Breakdown: Damage & Farm Distribution ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Hero Damage Share */}
        <div className="rounded-3xl border border-white/[0.08] bg-zinc-900/40 backdrop-blur-2xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.36)] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-xl bg-rose-400/10 border border-rose-400/20 flex items-center justify-center text-rose-300">
                <Swords className="size-4" />
              </div>
              <h4 className="text-sm font-semibold tracking-tight text-white">
                Распределение урона по героям
              </h4>
            </div>
            <span className="text-[10px] text-zinc-400 font-mono">Доля урона</span>
          </div>

          {/* Radiant Damage Bars */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-400">
              <span>Силы Света: {totalRadiantDmg.toLocaleString("ru-RU")} урона</span>
              <span className="text-zinc-500 font-mono text-[10px]">100%</span>
            </div>

            <div className="space-y-2">
              {radiantPlayers.map((p) => {
                const h = heroMap.get(p.hero_id);
                const dmg = p.hero_damage ?? 0;
                const pct = totalRadiantDmg > 0 ? (dmg / totalRadiantDmg) * 100 : 0;
                const playerName = p.personaname && p.personaname !== "Неизвестный игрок" ? p.personaname : (h?.localized_name || "Игрок");
                const slotInfo = getPlayerSlotInfo(p.player_slot);
                return (
                  <div key={p.player_slot} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] font-mono font-bold shrink-0" style={{ color: slotInfo.color }}>
                          #{slotInfo.slotNumber}
                        </span>
                        <div className="size-5 rounded-md overflow-hidden bg-zinc-800 shrink-0">
                          {h && <img src={heroIconUrl(h.name)} alt="" className="size-full object-cover" />}
                        </div>
                        <span className="font-semibold text-white truncate max-w-[120px]">{h?.localized_name}</span>
                        <span className="text-zinc-500 text-[10px] truncate max-w-[100px]">({playerName})</span>
                      </div>
                      <div className="font-mono text-[11px] text-zinc-300 shrink-0">
                        <strong>{dmg.toLocaleString("ru-RU")}</strong> ({pct.toFixed(1)}%)
                      </div>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden p-0.5">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(2, pct))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dire Damage Bars */}
          <div className="space-y-2.5 pt-4 border-t border-white/[0.06]">
            <div className="flex items-center justify-between text-xs font-semibold text-rose-400">
              <span>Силы Тьмы: {totalDireDmg.toLocaleString("ru-RU")} урона</span>
              <span className="text-zinc-500 font-mono text-[10px]">100%</span>
            </div>

            <div className="space-y-2">
              {direPlayers.map((p) => {
                const h = heroMap.get(p.hero_id);
                const dmg = p.hero_damage ?? 0;
                const pct = totalDireDmg > 0 ? (dmg / totalDireDmg) * 100 : 0;
                const playerName = p.personaname && p.personaname !== "Неизвестный игрок" ? p.personaname : (h?.localized_name || "Игрок");
                const slotInfo = getPlayerSlotInfo(p.player_slot);
                return (
                  <div key={p.player_slot} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] font-mono font-bold shrink-0" style={{ color: slotInfo.color }}>
                          #{slotInfo.slotNumber}
                        </span>
                        <div className="size-5 rounded-md overflow-hidden bg-zinc-800 shrink-0">
                          {h && <img src={heroIconUrl(h.name)} alt="" className="size-full object-cover" />}
                        </div>
                        <span className="font-semibold text-white truncate max-w-[120px]">{h?.localized_name}</span>
                        <span className="text-zinc-500 text-[10px] truncate max-w-[100px]">({playerName})</span>
                      </div>
                      <div className="font-mono text-[11px] text-zinc-300 shrink-0">
                        <strong>{dmg.toLocaleString("ru-RU")}</strong> ({pct.toFixed(1)}%)
                      </div>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden p-0.5">
                      <div
                        className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(2, pct))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Farm & Net Worth Distribution */}
        <div className="rounded-3xl border border-white/[0.08] bg-zinc-900/40 backdrop-blur-2xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.36)] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-300">
                <Coins className="size-4" />
              </div>
              <h4 className="text-sm font-semibold tracking-tight text-white">
                Распределение золота (Farm Share)
              </h4>
            </div>
            <span className="text-[10px] text-zinc-400 font-mono">Доля нетворса</span>
          </div>

          {/* Radiant Farm Bars */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-400">
              <span>Силы Света: {totalRadiantNw.toLocaleString("ru-RU")} 🪙</span>
              <span className="text-zinc-500 font-mono text-[10px]">100%</span>
            </div>

            <div className="space-y-2">
              {radiantPlayers.map((p) => {
                const h = heroMap.get(p.hero_id);
                const nw = p.net_worth ?? 0;
                const pct = totalRadiantNw > 0 ? (nw / totalRadiantNw) * 100 : 0;
                const playerName = p.personaname && p.personaname !== "Неизвестный игрок" ? p.personaname : (h?.localized_name || "Игрок");
                const slotInfo = getPlayerSlotInfo(p.player_slot);
                return (
                  <div key={p.player_slot} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] font-mono font-bold shrink-0" style={{ color: slotInfo.color }}>
                          #{slotInfo.slotNumber}
                        </span>
                        <div className="size-5 rounded-md overflow-hidden bg-zinc-800 shrink-0">
                          {h && <img src={heroIconUrl(h.name)} alt="" className="size-full object-cover" />}
                        </div>
                        <span className="font-semibold text-white truncate max-w-[120px]">{h?.localized_name}</span>
                        <span className="text-zinc-500 text-[10px] truncate max-w-[100px]">({playerName})</span>
                      </div>
                      <div className="font-mono text-[11px] text-zinc-300 shrink-0">
                        <strong>{nw.toLocaleString("ru-RU")}</strong> ({pct.toFixed(1)}%)
                      </div>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden p-0.5">
                      <div
                        className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(2, pct))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dire Farm Bars */}
          <div className="space-y-2.5 pt-4 border-t border-white/[0.06]">
            <div className="flex items-center justify-between text-xs font-semibold text-rose-400">
              <span>Силы Тьмы: {totalDireNw.toLocaleString("ru-RU")} 🪙</span>
              <span className="text-zinc-500 font-mono text-[10px]">100%</span>
            </div>

            <div className="space-y-2">
              {direPlayers.map((p) => {
                const h = heroMap.get(p.hero_id);
                const nw = p.net_worth ?? 0;
                const pct = totalDireNw > 0 ? (nw / totalDireNw) * 100 : 0;
                const playerName = p.personaname && p.personaname !== "Неизвестный игрок" ? p.personaname : (h?.localized_name || "Игрок");
                const slotInfo = getPlayerSlotInfo(p.player_slot);
                return (
                  <div key={p.player_slot} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] font-mono font-bold shrink-0" style={{ color: slotInfo.color }}>
                          #{slotInfo.slotNumber}
                        </span>
                        <div className="size-5 rounded-md overflow-hidden bg-zinc-800 shrink-0">
                          {h && <img src={heroIconUrl(h.name)} alt="" className="size-full object-cover" />}
                        </div>
                        <span className="font-semibold text-white truncate max-w-[120px]">{h?.localized_name}</span>
                        <span className="text-zinc-500 text-[10px] truncate max-w-[100px]">({playerName})</span>
                      </div>
                      <div className="font-mono text-[11px] text-zinc-300 shrink-0">
                        <strong>{nw.toLocaleString("ru-RU")}</strong> ({pct.toFixed(1)}%)
                      </div>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden p-0.5">
                      <div
                        className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(2, pct))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
