"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Sparkles,
  Trophy,
  TrendingUp,
  Swords,
  Shield,
  Coins,
  Eye,
  Flame,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  Zap,
} from "lucide-react";
import {
  type FullMatchDetails,
  type MatchPlayerDetail,
  type OpenDotaHero,
  heroIconUrl,
} from "@/lib/opendota";

interface TacticalBriefingProps {
  match: FullMatchDetails;
  heroes: OpenDotaHero[];
  onSelectHero?: (slot: number) => void;
  onJumpToMinute?: (minute: number) => void;
}

function safeNum(v: number | null | undefined, fallback = 0): number {
  if (v === null || v === undefined || isNaN(v) || !isFinite(v)) return fallback;
  return v;
}

export function TacticalBriefing({
  match,
  heroes,
  onSelectHero,
  onJumpToMinute,
}: TacticalBriefingProps) {
  const heroMap = useMemo(() => new Map(heroes.map((h) => [h.id, h])), [heroes]);

  const radiantPlayers = useMemo(
    () => match.players.filter((p) => p.isRadiant),
    [match.players]
  );
  const direPlayers = useMemo(
    () => match.players.filter((p) => !p.isRadiant),
    [match.players]
  );

  const totalRadKills = useMemo(
    () => Math.max(1, radiantPlayers.reduce((acc, p) => acc + p.kills, 0)),
    [radiantPlayers]
  );
  const totalDireKills = useMemo(
    () => Math.max(1, direPlayers.reduce((acc, p) => acc + p.kills, 0)),
    [direPlayers]
  );

  // 1. MVP Calculation
  const mvp = useMemo(() => {
    const scored = match.players.map((p) => {
      const isWinner = p.isRadiant === match.radiant_win;
      const kda = (p.kills + p.assists) / Math.max(1, p.deaths);
      const teamKills = p.isRadiant ? totalRadKills : totalDireKills;
      const killPart = (p.kills + p.assists) / teamKills;
      const imp = p.imp ?? 0;
      const dmg = p.hero_damage ?? 0;
      
      const score =
        (isWinner ? 35 : 0) +
        imp * 1.8 +
        kda * 4 +
        killPart * 25 +
        (dmg / 1200);

      return { player: p, score, killPart, kda };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0];
  }, [match.players, match.radiant_win, totalRadKills, totalDireKills]);

  // 2. Turning point calculation
  const turningPoint = useMemo(() => {
    const adv = match.radiant_gold_adv;
    if (!adv || adv.length < 5) return null;

    let maxSwing = 0;
    let swingMin = 0;
    let swingTeam: "radiant" | "dire" = "radiant";

    for (let i = 3; i < adv.length; i++) {
      const diff = adv[i] - adv[i - 3];
      if (Math.abs(diff) > maxSwing) {
        maxSwing = Math.abs(diff);
        swingMin = i;
        swingTeam = diff > 0 ? "radiant" : "dire";
      }
    }

    if (maxSwing < 3000) {
      return {
        minute: Math.floor(adv.length / 2),
        swing: Math.abs(adv[adv.length - 1] ?? 0),
        isStable: true,
        winner: match.radiant_win ? "Силы Света" : "Силы Тьмы",
      };
    }

    return {
      minute: swingMin,
      swing: maxSwing,
      isStable: false,
      team: swingTeam === "radiant" ? "Силы Света" : "Силы Тьмы",
      isRadiant: swingTeam === "radiant",
    };
  }, [match.radiant_gold_adv, match.radiant_win]);

  // 3. Lane Outcomes (Safelen vs Offlane, Mid vs Mid)
  const lanes = useMemo(() => {
    const radMid = radiantPlayers.find((p) => p.lane === 2) || radiantPlayers.find((p) => (p.pos_role ?? 2) === 2);
    const direMid = direPlayers.find((p) => p.lane === 2) || direPlayers.find((p) => (p.pos_role ?? 2) === 2);

    const radSafe = radiantPlayers.find((p) => p.lane === 1) || radiantPlayers.find((p) => (p.pos_role ?? 1) === 1);
    const direOff = direPlayers.find((p) => p.lane === 1) || direPlayers.find((p) => (p.pos_role ?? 3) === 3);

    const radOff = radiantPlayers.find((p) => p.lane === 3) || radiantPlayers.find((p) => (p.pos_role ?? 3) === 3);
    const direSafe = direPlayers.find((p) => p.lane === 3) || direPlayers.find((p) => (p.pos_role ?? 1) === 1);

    const checkLane = (p1?: MatchPlayerDetail, p2?: MatchPlayerDetail) => {
      if (!p1 || !p2) return { winner: "Ничья", diff: 0, p1, p2 };
      const g1 = p1.networth_t?.[10] ?? p1.gold_t?.[10];
      const g2 = p2.networth_t?.[10] ?? p2.gold_t?.[10];
      if (g1 == null || g2 == null) {
        return { winner: "Не распарсено", diff: 0, p1, p2 };
      }
      const diff = Math.round(g1 - g2);
      if (Math.abs(diff) < 400) return { winner: "Ничья", diff, p1, p2 };
      return {
        winner: diff > 0 ? "Свет" : "Тьма",
        diff: Math.abs(diff),
        p1,
        p2,
      };
    };

    return [
      {
        name: "Легкая линия (Низ)",
        icon: "🌿",
        ...checkLane(radSafe, direOff),
      },
      {
        name: "Мид линия (Центр)",
        icon: "⚡",
        ...checkLane(radMid, direMid),
      },
      {
        name: "Сложная линия (Верх)",
        icon: "🛡️",
        ...checkLane(radOff, direSafe),
      },
    ];
  }, [radiantPlayers, direPlayers]);

  // 4. Match Record Leaders
  const records = useMemo(() => {
    const topDmg = [...match.players].sort((a, b) => safeNum(b.hero_damage) - safeNum(a.hero_damage))[0];
    const topNw = [...match.players].sort((a, b) => safeNum(b.net_worth) - safeNum(a.net_worth))[0];
    const topSupport = [...match.players].sort((a, b) => {
      const sA = (a.obs_placed ?? 0) * 3 + (a.camps_stacked ?? 0) * 2 + safeNum(a.hero_healing) / 150;
      const sB = (b.obs_placed ?? 0) * 3 + (b.camps_stacked ?? 0) * 2 + safeNum(b.hero_healing) / 150;
      return sB - sA;
    })[0];
    const topFighter = [...match.players].sort((a, b) => {
      const teamKillsA = a.isRadiant ? totalRadKills : totalDireKills;
      const teamKillsB = b.isRadiant ? totalRadKills : totalDireKills;
      return (b.kills + b.assists) / teamKillsB - (a.kills + a.assists) / teamKillsA;
    })[0];

    return { topDmg, topNw, topSupport, topFighter };
  }, [match.players, totalRadKills, totalDireKills]);

  const mvpHero = mvp ? heroMap.get(mvp.player.hero_id) : null;

  return (
    <section className="space-y-4">
      {/* ── Section Title ────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
        <div className="flex items-center gap-2">
          <div className="size-6 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Sparkles className="size-3.5" />
          </div>
          <h2 className="text-sm font-semibold tracking-tight text-white">Тактический вердикт матча</h2>
          <span className="text-[11px] text-zinc-500">Ключевые события и разбор эффективности</span>
        </div>
      </div>

      {/* ── Top Apple Card: MVP + Turning Point ───────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* MVP Card (7 Cols) */}
        {mvp && mvpHero && (
          <div className="lg:col-span-7 rounded-3xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-md p-5 shadow-xl space-y-4 relative overflow-hidden group">
            {/* Ambient background glow */}
            <div className="absolute -top-12 -right-12 size-40 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 text-xs font-semibold">
                <Trophy className="size-3.5" />
                <span>Самый ценный игрок (MVP)</span>
              </div>
              <span className="text-[10px] font-mono text-zinc-400">
                {mvp.player.isRadiant ? "Силы Света" : "Силы Тьмы"} • {mvp.player.pos_roman ?? "I"} Позиция
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative size-18 rounded-2xl overflow-hidden border border-white/20 bg-zinc-950 shadow-lg shrink-0">
                <img
                  src={heroIconUrl(mvpHero.name)}
                  alt={mvpHero.localized_name}
                  className="size-full object-cover"
                />
                <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md bg-black/80 border border-white/20 text-[10px] font-bold text-white font-mono">
                  {mvp.player.level}
                </span>
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    {mvpHero.localized_name}
                  </h3>
                  <span className="text-xs font-semibold text-zinc-400 truncate">
                    ({mvp.player.personaname})
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                  <span className="text-emerald-400 font-bold">{mvp.player.kills}</span>
                  <span className="text-zinc-600">/</span>
                  <span className="text-rose-400 font-bold">{mvp.player.deaths}</span>
                  <span className="text-zinc-600">/</span>
                  <span className="text-sky-400 font-bold">{mvp.player.assists}</span>
                  <span className="text-zinc-500">•</span>
                  <span className="text-amber-300 font-semibold">🪙 {mvp.player.net_worth?.toLocaleString()}</span>
                  <span className="text-zinc-500">•</span>
                  <span className="text-purple-300 font-semibold">+{mvp.player.imp ?? 0} IMP</span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-white/[0.06] border border-white/[0.08] text-zinc-300">
                    🎯 {Math.round(mvp.killPart * 100)}% участие в драках
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-white/[0.06] border border-white/[0.08] text-zinc-300">
                    ⚔️ {mvp.player.hero_damage?.toLocaleString()} урона
                  </span>
                </div>
              </div>
            </div>

            {onSelectHero && (
              <button
                onClick={() => onSelectHero(mvp.player.player_slot)}
                className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-xs font-semibold text-zinc-200 transition cursor-pointer"
              >
                <span>Смотреть поминутный закуп и тайминги героя</span>
                <ChevronRight className="size-4 text-zinc-400" />
              </button>
            )}
          </div>
        )}

        {/* Turning Point & Key Timing (5 Cols) */}
        <div className="lg:col-span-5 rounded-3xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-md p-5 shadow-xl flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-semibold w-fit">
              <TrendingUp className="size-3.5" />
              <span>Переломный момент</span>
            </div>

            {turningPoint ? (
              turningPoint.isStable ? (
                <div className="space-y-1.5">
                  <h4 className="text-sm sm:text-base font-bold text-white tracking-tight">
                    Контролируемое доминирование
                  </h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Команда <strong className="text-emerald-400">{turningPoint.winner}</strong> захватила стабильный контроль с первых минут и довела преимущество до <strong className="text-amber-300 font-mono">+{turningPoint.swing.toLocaleString()} золота</strong> без критических просадок.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-mono font-black text-amber-300">
                      {turningPoint.minute}:00
                    </span>
                    <span className="text-xs font-semibold text-white">Решающая битва</span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    На <strong className="text-white font-mono">{turningPoint.minute}-й минуте</strong> произошел ключевой разворот: команда <strong className={turningPoint.isRadiant ? "text-emerald-400" : "text-rose-400"}>{turningPoint.team}</strong> отыграла <strong className="text-amber-300 font-mono">+{turningPoint.swing.toLocaleString()} золота</strong> за 3 минуты и сломала ход матча.
                  </p>
                </div>
              )
            ) : (
              <p className="text-xs text-zinc-400">
                Преимущество команд развивалось плавно на протяжении всей игры.
              </p>
            )}
          </div>

          {turningPoint && onJumpToMinute && (
            <button
              onClick={() => onJumpToMinute(turningPoint.minute)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[#0A84FF] hover:bg-[#007AFF] text-white text-xs font-bold shadow-[0_4px_16px_rgba(10,132,255,0.35)] transition cursor-pointer active:scale-95"
            >
              <Zap className="size-3.5" />
              <span>Перейти к минуте {turningPoint.minute} в инспекторе</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Bottom Grid: Laning Outcomes & Hall of Fame ─────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Laning Report (6 Cols) */}
        <div className="md:col-span-6 rounded-3xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-md p-5 shadow-xl space-y-3.5">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <Shield className="size-3.5 text-emerald-400" />
              <span>Итог стадии линий (0-10 минут)</span>
            </div>
            <span className="text-[10px] font-mono text-zinc-400">по крипам и золоту</span>
          </div>

          <div className="space-y-2">
            {lanes.map((l, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">{l.icon}</span>
                  <div>
                    <div className="font-semibold text-white">{l.name}</div>
                    <div className="text-[10px] text-zinc-400 font-mono">
                      {l.p1 ? heroMap.get(l.p1.hero_id)?.localized_name : "Свет"} vs {l.p2 ? heroMap.get(l.p2.hero_id)?.localized_name : "Тьма"}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      l.winner === "Свет"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : l.winner === "Тьма"
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                        : "bg-zinc-800 text-zinc-300 border border-zinc-700"
                    }`}
                  >
                    {l.winner === "Ничья" ? "Ничья на линии" : `Победа: ${l.winner}`}
                  </span>
                  {l.diff > 0 && l.winner !== "Ничья" && (
                    <div className="text-[10px] font-mono text-amber-300/80 mt-0.5">
                      +{l.diff.toLocaleString()} 🪙 к 10м
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hall of Fame Leaders (6 Cols) */}
        <div className="md:col-span-6 rounded-3xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-md p-5 shadow-xl space-y-3.5">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <Flame className="size-3.5 text-amber-400" />
              <span>Рекордсмены матча</span>
            </div>
            <span className="text-[10px] font-mono text-zinc-400">лучшие показатели</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {/* Top Damage */}
            <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-1.5">
              <div className="text-[10px] font-semibold text-rose-400 flex items-center gap-1">
                <Swords className="size-3" /> Топ урон
              </div>
              <div className="flex items-center gap-2">
                <div className="size-7 rounded-lg overflow-hidden border border-white/10 shrink-0">
                  <img
                    src={heroIconUrl(heroMap.get(records.topDmg.hero_id)?.name || "")}
                    alt=""
                    className="size-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">
                    {heroMap.get(records.topDmg.hero_id)?.localized_name}
                  </div>
                  <div className="text-[10px] font-mono font-bold text-rose-300">
                    {records.topDmg.hero_damage?.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Top Networth */}
            <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-1.5">
              <div className="text-[10px] font-semibold text-amber-400 flex items-center gap-1">
                <Coins className="size-3" /> Топ золото
              </div>
              <div className="flex items-center gap-2">
                <div className="size-7 rounded-lg overflow-hidden border border-white/10 shrink-0">
                  <img
                    src={heroIconUrl(heroMap.get(records.topNw.hero_id)?.name || "")}
                    alt=""
                    className="size-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">
                    {heroMap.get(records.topNw.hero_id)?.localized_name}
                  </div>
                  <div className="text-[10px] font-mono font-bold text-amber-300">
                    {records.topNw.net_worth?.toLocaleString()} 🪙
                  </div>
                </div>
              </div>
            </div>

            {/* Top Support */}
            <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-1.5">
              <div className="text-[10px] font-semibold text-cyan-400 flex items-center gap-1">
                <Eye className="size-3" /> Лучший саппорт
              </div>
              <div className="flex items-center gap-2">
                <div className="size-7 rounded-lg overflow-hidden border border-white/10 shrink-0">
                  <img
                    src={heroIconUrl(heroMap.get(records.topSupport.hero_id)?.name || "")}
                    alt=""
                    className="size-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">
                    {heroMap.get(records.topSupport.hero_id)?.localized_name}
                  </div>
                  <div className="text-[10px] font-mono text-cyan-300">
                    {records.topSupport.obs_placed ?? 0} вардов • {records.topSupport.camps_stacked ?? 0} стаков
                  </div>
                </div>
              </div>
            </div>

            {/* Top Fighter */}
            <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-1.5">
              <div className="text-[10px] font-semibold text-purple-400 flex items-center gap-1">
                <Zap className="size-3" /> Топ драка
              </div>
              <div className="flex items-center gap-2">
                <div className="size-7 rounded-lg overflow-hidden border border-white/10 shrink-0">
                  <img
                    src={heroIconUrl(heroMap.get(records.topFighter.hero_id)?.name || "")}
                    alt=""
                    className="size-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">
                    {heroMap.get(records.topFighter.hero_id)?.localized_name}
                  </div>
                  <div className="text-[10px] font-mono text-purple-300">
                    {records.topFighter.kills + records.topFighter.assists} килл-участий
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
