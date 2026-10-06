"use client";

import { useMemo, useState } from "react";
import {
  Shield,
  ShieldAlert,
  Trophy,
  Swords,
  MapPin,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  type FullMatchDetails,
  type MatchPlayerDetail,
  type OpenDotaHero,
  heroIconUrl,
} from "@/lib/opendota";

interface MinimapViewProps {
  match: FullMatchDetails;
  heroes: OpenDotaHero[];
  selectedSlot?: number;
  onSelectSlot?: (slot: number) => void;
}

interface TowerDef {
  id: string;
  name: string;
  lane: "top" | "mid" | "bot" | "throne";
  tier: 1 | 2 | 3 | 4;
  team: "radiant" | "dire";
  bitIndex: number;
  xPct: number;
  yPct: number;
}

// Exact normalized coordinates (0..100) on standard Dota 2 minimap
const TOWERS: TowerDef[] = [
  // ── Radiant Towers (bits 0..10) ───────────────────
  // Top Lane
  { id: "rad_top_1", name: "Т1 Верхняя", lane: "top", tier: 1, team: "radiant", bitIndex: 0, xPct: 14, yPct: 39 },
  { id: "rad_top_2", name: "Т2 Верхняя", lane: "top", tier: 2, team: "radiant", bitIndex: 1, xPct: 14, yPct: 56 },
  { id: "rad_top_3", name: "Т3 Верхняя", lane: "top", tier: 3, team: "radiant", bitIndex: 2, xPct: 14, yPct: 71 },
  // Mid Lane
  { id: "rad_mid_1", name: "Т1 Центр", lane: "mid", tier: 1, team: "radiant", bitIndex: 3, xPct: 39, yPct: 58 },
  { id: "rad_mid_2", name: "Т2 Центр", lane: "mid", tier: 2, team: "radiant", bitIndex: 4, xPct: 29, yPct: 67 },
  { id: "rad_mid_3", name: "Т3 Центр", lane: "mid", tier: 3, team: "radiant", bitIndex: 5, xPct: 22, yPct: 75 },
  // Bot Lane
  { id: "rad_bot_1", name: "Т1 Нижняя", lane: "bot", tier: 1, team: "radiant", bitIndex: 6, xPct: 63, yPct: 86 },
  { id: "rad_bot_2", name: "Т2 Нижняя", lane: "bot", tier: 2, team: "radiant", bitIndex: 7, xPct: 46, yPct: 86 },
  { id: "rad_bot_3", name: "Т3 Нижняя", lane: "bot", tier: 3, team: "radiant", bitIndex: 8, xPct: 28, yPct: 86 },
  // Throne Towers (T4)
  { id: "rad_t4_top", name: "Т4 Верхняя", lane: "throne", tier: 4, team: "radiant", bitIndex: 9, xPct: 15, yPct: 81 },
  { id: "rad_t4_bot", name: "Т4 Нижняя", lane: "throne", tier: 4, team: "radiant", bitIndex: 10, xPct: 18, yPct: 84 },

  // ── Dire Towers (bits 0..10) ──────────────────────
  // Top Lane
  { id: "dire_top_1", name: "Т1 Верхняя", lane: "top", tier: 1, team: "dire", bitIndex: 0, xPct: 37, yPct: 14 },
  { id: "dire_top_2", name: "Т2 Верхняя", lane: "top", tier: 2, team: "dire", bitIndex: 1, xPct: 54, yPct: 14 },
  { id: "dire_top_3", name: "Т3 Верхняя", lane: "top", tier: 3, team: "dire", bitIndex: 2, xPct: 72, yPct: 14 },
  // Mid Lane
  { id: "dire_mid_1", name: "Т1 Центр", lane: "mid", tier: 1, team: "dire", bitIndex: 3, xPct: 61, yPct: 42 },
  { id: "dire_mid_2", name: "Т2 Центр", lane: "mid", tier: 2, team: "dire", bitIndex: 4, xPct: 71, yPct: 33 },
  { id: "dire_mid_3", name: "Т3 Центр", lane: "mid", tier: 3, team: "dire", bitIndex: 5, xPct: 78, yPct: 24 },
  // Bot Lane
  { id: "dire_bot_1", name: "Т1 Нижняя", lane: "bot", tier: 1, team: "dire", bitIndex: 6, xPct: 86, yPct: 61 },
  { id: "dire_bot_2", name: "Т2 Нижняя", lane: "bot", tier: 2, team: "dire", bitIndex: 7, xPct: 86, yPct: 45 },
  { id: "dire_bot_3", name: "Т3 Нижняя", lane: "bot", tier: 3, team: "dire", bitIndex: 8, xPct: 86, yPct: 28 },
  // Throne Towers (T4)
  { id: "dire_t4_top", name: "Т4 Верхняя", lane: "throne", tier: 4, team: "dire", bitIndex: 9, xPct: 82, yPct: 16 },
  { id: "dire_t4_bot", name: "Т4 Нижняя", lane: "throne", tier: 4, team: "dire", bitIndex: 10, xPct: 85, yPct: 19 },
];

export function MinimapView({ match, heroes, selectedSlot, onSelectSlot }: MinimapViewProps) {
  const [hoveredBuilding, setHoveredBuilding] = useState<string | null>(null);

  const heroMap = useMemo(() => new Map(heroes.map((h) => [h.id, h])), [heroes]);

  const radTowerMask = match.tower_status_radiant ?? 0;
  const direTowerMask = match.tower_status_dire ?? 0;

  const isTowerAlive = (t: TowerDef) => {
    const mask = t.team === "radiant" ? radTowerMask : direTowerMask;
    return Boolean(mask & (1 << t.bitIndex));
  };

  const radTowersAlive = TOWERS.filter((t) => t.team === "radiant" && isTowerAlive(t)).length;
  const direTowersAlive = TOWERS.filter((t) => t.team === "dire" && isTowerAlive(t)).length;

  const radBarracksMask = match.barracks_status_radiant ?? 0;
  const direBarracksMask = match.barracks_status_dire ?? 0;
  const radBarracksAlive = (radBarracksMask).toString(2).replace(/0/g, "").length;
  const direBarracksAlive = (direBarracksMask).toString(2).replace(/0/g, "").length;

  // Approximate player lane markers
  const radiantPlayers = match.players.filter((p) => p.isRadiant);
  const direPlayers = match.players.filter((p) => !p.isRadiant);

  const getPlayerMapPos = (p: MatchPlayerDetail): { x: number; y: number } => {
    const isRad = p.isRadiant;
    // Base coords if no lane or roaming
    if (!p.lane || p.lane === 4) {
      const idx = (p.player_slot % 128);
      return isRad
        ? { x: 10 + idx * 3, y: 88 - idx * 2 }
        : { x: 88 - idx * 3, y: 10 + idx * 2 };
    }
    // Lane 1 = Bot (Safe for Rad, Off for Dire)
    if (p.lane === 1) {
      return isRad ? { x: 60, y: 84 } : { x: 84, y: 55 };
    }
    // Lane 2 = Mid
    if (p.lane === 2) {
      return isRad ? { x: 42, y: 56 } : { x: 58, y: 44 };
    }
    // Lane 3 = Top (Off for Rad, Safe for Dire)
    if (p.lane === 3) {
      return isRad ? { x: 16, y: 44 } : { x: 44, y: 16 };
    }
    return isRad ? { x: 18, y: 82 } : { x: 82, y: 18 };
  };

  return (
    <div className="rounded-3xl border border-white/[0.08] bg-zinc-900/40 backdrop-blur-2xl p-4 sm:p-6 shadow-[0_8px_32px_rgba(0,0,0,0.36)] space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-white flex items-center gap-2">
            <div className="size-7 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <MapPin className="size-4" />
            </div>
            Тактическая карта матча
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Реальная карта Dota 2 с точным состоянием всех 22 башен, казарм и расстановкой героев по линиям.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-semibold">
            <span className="size-2 rounded-full bg-emerald-400" />
            Башни Света: {radTowersAlive}/11
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 font-semibold">
            <span className="size-2 rounded-full bg-rose-400" />
            Башни Тьмы: {direTowersAlive}/11
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* ── Left: Authentic Minimap Box (7 cols) ── */}
        <div className="lg:col-span-7 flex justify-center">
          <div className="relative aspect-square w-full max-w-[440px] rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-black">
            {/* Authentic Dota 2 Minimap Background Image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/map/minimap.jpg"
              alt="Dota 2 Minimap"
              className="size-full object-cover select-none pointer-events-none"
            />

            {/* Radiant Ancient (Throne) */}
            <div
              className={`absolute size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 flex items-center justify-center font-black text-[9px] shadow-lg transition ${
                match.radiant_win
                  ? "bg-emerald-500/80 border-white text-white ring-4 ring-emerald-500/40"
                  : "bg-emerald-950/80 border-emerald-500 text-emerald-300 opacity-60"
              }`}
              style={{ left: "13%", top: "87%" }}
              title={`Древний Сил Света: ${match.radiant_win ? "Устоял (Победа)" : "Разрушен"}`}
            >
              🏛️
            </div>

            {/* Dire Ancient (Throne) */}
            <div
              className={`absolute size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 flex items-center justify-center font-black text-[9px] shadow-lg transition ${
                !match.radiant_win
                  ? "bg-red-500/80 border-white text-white ring-4 ring-red-500/40"
                  : "bg-red-950/80 border-red-500 text-red-300 opacity-60"
              }`}
              style={{ left: "87%", top: "13%" }}
              title={`Древний Сил Тьмы: ${!match.radiant_win ? "Устоял (Победа)" : "Разрушен"}`}
            >
              🏛️
            </div>

            {/* Towers Overlay */}
            {TOWERS.map((t) => {
              const alive = isTowerAlive(t);
              const isRad = t.team === "radiant";
              const isHovered = hoveredBuilding === t.id;

              return (
                <div
                  key={t.id}
                  onMouseEnter={() => setHoveredBuilding(t.id)}
                  onMouseLeave={() => setHoveredBuilding(null)}
                  style={{ left: `${t.xPct}%`, top: `${t.yPct}%` }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-help transition-all duration-200 z-10 ${
                    alive ? "scale-100" : "scale-75 opacity-40 grayscale"
                  } ${isHovered ? "scale-125 z-30" : ""}`}
                  title={`${t.name} (${isRad ? "Свет" : "Тьма"}): ${alive ? "Жива" : "Уничтожена"}`}
                >
                  <div
                    className={`size-3.5 sm:size-4 rounded-full border flex items-center justify-center shadow-md ${
                      isRad
                        ? alive
                          ? "bg-emerald-500 border-white text-zinc-950 shadow-emerald-500/60 ring-2 ring-emerald-400/50"
                          : "bg-zinc-800 border-zinc-600 text-zinc-500"
                        : alive
                        ? "bg-rose-500 border-white text-white shadow-rose-500/60 ring-2 ring-rose-400/50"
                        : "bg-zinc-800 border-zinc-600 text-zinc-500"
                    }`}
                  >
                    <span className="text-[7px] font-black leading-none font-mono">
                      {t.tier}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Hero Icons on Lanes */}
            {match.players.map((p) => {
              const hero = heroMap.get(p.hero_id);
              const pos = getPlayerMapPos(p);
              const isSelected = p.player_slot === selectedSlot;

              return (
                <button
                  key={p.player_slot}
                  onClick={() => onSelectSlot && onSelectSlot(p.player_slot)}
                  style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 size-7 sm:size-8 rounded-full overflow-hidden border-2 transition-all duration-200 cursor-pointer z-20 group hover:scale-125 hover:z-40 ${
                    p.isRadiant
                      ? isSelected
                        ? "border-emerald-300 ring-4 ring-emerald-400/70 shadow-lg scale-110"
                        : "border-emerald-500/80 shadow-md"
                      : isSelected
                      ? "border-rose-300 ring-4 ring-rose-400/70 shadow-lg scale-110"
                      : "border-rose-500/80 shadow-md"
                  }`}
                  title={`${hero?.localized_name ?? "Герой"} (${p.personaname || hero?.localized_name || "Игрок"}) — Нажмите для выбора`}
                >
                  {hero ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={heroIconUrl(hero.name)}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="size-full bg-zinc-800" />
                  )}
                  <span
                    className={`absolute bottom-0 right-0 size-3 rounded-tl text-[8px] font-black font-mono flex items-center justify-center text-white ${
                      p.isRadiant ? "bg-emerald-600" : "bg-rose-600"
                    }`}
                  >
                    {p.pos_roman ?? "I"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Right: Strategic Summary Cards (5 cols) ── */}
        <div className="lg:col-span-5 space-y-4">
          {/* 1. Buildings Health Panel */}
          <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-4 sm:p-5 space-y-3">
            <h4 className="text-xs font-semibold text-zinc-300 tracking-tight flex items-center gap-1.5">
              <Shield className="size-4 text-amber-400" />
              Целостность базы и построек
            </h4>

            <div className="space-y-3">
              {/* Radiant */}
              <div className="rounded-2xl bg-emerald-500/[0.05] border border-emerald-500/20 p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-emerald-400" />
                    Силы Света (The Radiant)
                  </span>
                  <span className="text-[11px] font-mono text-zinc-400">
                    {match.radiant_win ? "Победители" : "Поражение"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center text-xs font-mono">
                  <div className="rounded-xl bg-black/40 border border-white/[0.06] p-2">
                    <div className="text-[10px] text-zinc-400">Башни</div>
                    <div className="text-base font-bold text-emerald-300">{radTowersAlive} / 11</div>
                  </div>
                  <div className="rounded-xl bg-black/40 border border-white/[0.06] p-2">
                    <div className="text-[10px] text-zinc-400">Казармы</div>
                    <div className="text-base font-bold text-emerald-300">{radBarracksAlive} / 6</div>
                  </div>
                </div>
              </div>

              {/* Dire */}
              <div className="rounded-2xl bg-rose-500/[0.05] border border-rose-500/20 p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-rose-400 flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-rose-400" />
                    Силы Тьмы (The Dire)
                  </span>
                  <span className="text-[11px] font-mono text-zinc-400">
                    {!match.radiant_win ? "Победители" : "Поражение"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center text-xs font-mono">
                  <div className="rounded-xl bg-black/40 border border-white/[0.06] p-2">
                    <div className="text-[10px] text-zinc-400">Башни</div>
                    <div className="text-base font-bold text-rose-300">{direTowersAlive} / 11</div>
                  </div>
                  <div className="rounded-xl bg-black/40 border border-white/[0.06] p-2">
                    <div className="text-[10px] text-zinc-400">Казармы</div>
                    <div className="text-base font-bold text-rose-300">{direBarracksAlive} / 6</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Lane Outcomes (Итоги линий) */}
          {match.lane_outcomes && match.lane_outcomes.length > 0 && (
            <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-4 sm:p-5 space-y-3">
              <h4 className="text-xs font-semibold text-zinc-300 tracking-tight flex items-center gap-1.5">
                <Swords className="size-4 text-amber-400" />
                Итоги стадии линий (10-я минута)
              </h4>

              <div className="space-y-2">
                {match.lane_outcomes.map((lo, idx) => {
                  const isRad = lo.winner === "radiant";
                  const isTie = lo.winner === "tie";
                  return (
                    <div
                      key={idx}
                      className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-3 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold text-white">{lo.name}</div>
                        <div className="text-[10px] text-zinc-400">{lo.label}</div>
                      </div>

                      <div className="text-right font-mono">
                        <span
                          className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold ${
                            isTie
                              ? "bg-zinc-800 text-zinc-300"
                              : isRad
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                          }`}
                        >
                          {isTie ? "Ничья" : isRad ? "Победа Света" : "Победа Тьмы"}
                        </span>
                        {lo.adv !== 0 && (
                          <div className="text-[10px] text-zinc-400 mt-0.5">
                            {lo.adv > 0 ? `+${lo.adv}` : lo.adv} золота
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
