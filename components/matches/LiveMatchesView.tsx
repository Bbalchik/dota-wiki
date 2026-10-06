"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import {
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Swords,
  Clock,
  Trophy,
  Zap,
  Shield,
  ExternalLink,
  Copy,
  Check,
  Wifi,
  Star,
  Users,
  BarChart2,
  AlertCircle,
} from "lucide-react";
import { DotaInventoryHud } from "@/components/ui/DotaInventoryHud";
import type { EnrichedPublicMatch } from "@/app/api/live-matches/route";
import {
  assignTeamPositions,
  POS_NAME_RU,
  POS_FULL_RU,
  type DotaPosition,
} from "@/lib/positions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface InlineMatchPlayer {
  account_id?: number | null;
  personaname?: string | null;
  hero_id: number;
  hero_name?: string;
  hero_icon?: string | null;
  player_slot: number;
  kills: number;
  deaths: number;
  assists: number;
  level?: number;
  net_worth?: number;
  gold_per_min?: number;
  xp_per_min?: number;
  last_hits?: number;
  denies?: number;
  hero_damage?: number;
  pos_role?: number | null;
  pos_roman?: string | null;
  lane?: number | null;
  lane_role?: number | null;
  item_0?: number;
  item_1?: number;
  item_2?: number;
  item_3?: number;
  item_4?: number;
  item_5?: number;
  item_neutral?: number;
  backpack_0?: number;
  backpack_1?: number;
  backpack_2?: number;
}

interface ExpandedMatchData {
  match_id: number;
  radiant_win: boolean;
  duration: number;
  radiant_score: number;
  dire_score: number;
  game_mode_name: string;
  players: InlineMatchPlayer[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fmt(n: number) {
  return n.toLocaleString("ru-RU");
}

function fmtDuration(s: number) {
  const m = Math.floor(s / 60);
  const sec = String(s % 60).padStart(2, "0");
  return `${m}:${sec}`;
}

function timeAgo(unix: number) {
  const diff = Math.floor((Date.now() / 1000 - unix));
  if (diff < 60) return `${diff}с назад`;
  if (diff < 3600) return `${Math.floor(diff / 60)}м назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}ч назад`;
  return `${Math.floor(diff / 86400)}д назад`;
}

function rankLabel(avgRankTier: number | null): string {
  if (!avgRankTier) return "?";
  const medal = Math.floor(avgRankTier / 10);
  const star = avgRankTier % 10;
  const medals = ["", "Страж", "Рыцарь", "Воин", "Витязь", "Герой", "Легенда", "Властелин", "Властелин"];
  return medals[medal] ? `${medals[medal]} ${star}★` : String(avgRankTier);
}

function isRadiantSlot(slot: number) {
  return slot < 128;
}

const MEDAL_COLORS: Record<number, string> = {
  1: "text-gray-400",
  2: "text-green-400",
  3: "text-cyan-400",
  4: "text-blue-400",
  5: "text-purple-400",
  6: "text-yellow-400",
  7: "text-orange-400",
  8: "text-red-500",
};

function rankColor(avgRankTier: number | null): string {
  if (!avgRankTier) return "text-gray-500";
  return MEDAL_COLORS[Math.floor(avgRankTier / 10)] ?? "text-gray-400";
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

function HeroPortrait({
  hero,
  small,
}: {
  hero: { hero_id: number; name: string; icon: string | null };
  small?: boolean;
}) {
  const size = small ? 24 : 32;
  return (
    <div
      className={`relative rounded overflow-hidden flex-shrink-0 bg-gray-800`}
      style={{ width: size, height: size }}
      title={hero.name}
    >
      {hero.icon ? (
        <Image
          src={hero.icon}
          alt={hero.name}
          width={size}
          height={size}
          className="object-cover w-full h-full"
          unoptimized
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-500">
          {hero.hero_id}
        </div>
      )}
    </div>
  );
}

function TeamHeroRow({
  heroes,
  isRadiant,
  small,
}: {
  heroes: { hero_id: number; name: string; icon: string | null }[];
  isRadiant: boolean;
  small?: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      {heroes.map((h) => (
        <HeroPortrait key={h.hero_id} hero={h} small={small} />
      ))}
      {[...Array(Math.max(0, 5 - heroes.length))].map((_, i) => (
        <div
          key={i}
          className="rounded bg-gray-800/60 border border-gray-700/40"
          style={{ width: small ? 24 : 32, height: small ? 24 : 32 }}
        />
      ))}
    </div>
  );
}

// Inline scoreboard player row
function ScoreboardPlayerRow({
  player,
  pos,
  highlight,
}: {
  player: InlineMatchPlayer;
  pos?: DotaPosition | null;
  highlight?: boolean;
}) {
  return (
    <tr
      className={`border-b border-white/5 text-xs transition-colors ${
        highlight ? "bg-blue-900/10" : "hover:bg-white/[0.03]"
      }`}
    >
      {/* Hero & Position */}
      <td className="px-2 py-1.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded overflow-hidden flex-shrink-0 bg-gray-800">
            {player.hero_icon ? (
              <Image
                src={player.hero_icon}
                alt={player.hero_name ?? ""}
                width={28}
                height={28}
                className="object-cover w-full h-full"
                unoptimized
              />
            ) : (
              <div className="w-full h-full bg-gray-700 rounded" />
            )}
          </div>
          <div className="min-w-0">
            <div className="text-gray-200 truncate max-w-[100px] font-medium leading-tight">
              {player.hero_name ?? `#${player.hero_id}`}
            </div>
            {pos && (
              <div
                className="text-[9px] font-mono text-zinc-400 font-bold truncate mt-0.5"
                title={POS_FULL_RU[pos]}
              >
                Поз {pos} · {POS_NAME_RU[pos]}
              </div>
            )}
          </div>
        </div>
      </td>
      {/* Player */}
      <td className="px-2 py-1.5">
        {player.account_id ? (
          <Link
            href={`/player/${player.account_id}`}
            className="text-blue-400 hover:text-blue-300 truncate max-w-[110px] block transition-colors"
          >
            {player.personaname ?? "Аноним"}
          </Link>
        ) : (
          <span className="text-gray-500 italic text-[11px]">Аноним</span>
        )}
      </td>
      {/* Lvl */}
      <td className="px-2 py-1.5 text-center text-gray-300">
        {player.level ?? "—"}
      </td>
      {/* KDA */}
      <td className="px-2 py-1.5 text-center font-mono">
        <span className="text-green-400">{player.kills}</span>
        <span className="text-gray-500">/</span>
        <span className="text-red-400">{player.deaths}</span>
        <span className="text-gray-500">/</span>
        <span className="text-blue-400">{player.assists}</span>
      </td>
      {/* NW */}
      <td className="px-2 py-1.5 text-center text-yellow-400 font-mono">
        {player.net_worth != null ? `${Math.round(player.net_worth / 1000)}к` : "—"}
      </td>
      {/* CS */}
      <td className="px-2 py-1.5 text-center text-gray-300">
        {player.last_hits ?? 0}
        <span className="text-gray-600">/</span>
        {player.denies ?? 0}
      </td>
      {/* Dmg */}
      <td className="px-2 py-1.5 text-center text-orange-400 font-mono text-[11px]">
        {player.hero_damage != null ? fmt(player.hero_damage) : "—"}
      </td>
      {/* Items */}
      <td className="px-2 py-1.5">
        <DotaInventoryHud
          items={[
            player.item_0,
            player.item_1,
            player.item_2,
            player.item_3,
            player.item_4,
            player.item_5,
          ]}
          neutralItem={player.item_neutral}
          backpack={[
            player.backpack_0,
            player.backpack_1,
            player.backpack_2,
          ]}
          size="xs"
          showBackpack={false}
        />
      </td>
    </tr>
  );
}

function InlineScoreboard({
  data,
  loading,
}: {
  data: ExpandedMatchData | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 gap-3 text-gray-500">
        <RefreshCw className="w-5 h-5 animate-spin" />
        <span>Загрузка деталей матча...</span>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="flex items-center justify-center py-10 gap-3 text-gray-600">
        <AlertCircle className="w-5 h-5" />
        <span>Детали матча недоступны</span>
      </div>
    );
  }

  const radiantPlayers = data.players.filter((p) => isRadiantSlot(p.player_slot));
  const direPlayers = data.players.filter((p) => !isRadiantSlot(p.player_slot));

  const radPosMap = useMemo(
    () =>
      assignTeamPositions(
        radiantPlayers.map((p) => ({
          player_slot: p.player_slot,
          last_hits: p.last_hits ?? 0,
          net_worth: p.net_worth ?? null,
          lane: p.lane,
          lane_role: p.lane_role,
        }))
      ),
    [radiantPlayers]
  );

  const direPosMap = useMemo(
    () =>
      assignTeamPositions(
        direPlayers.map((p) => ({
          player_slot: p.player_slot,
          last_hits: p.last_hits ?? 0,
          net_worth: p.net_worth ?? null,
          lane: p.lane,
          lane_role: p.lane_role,
        }))
      ),
    [direPlayers]
  );

  const cols = (
    <colgroup>
      <col style={{ width: "190px" }} />
      <col style={{ width: "140px" }} />
      <col style={{ width: "42px" }} />
      <col style={{ width: "80px" }} />
      <col style={{ width: "60px" }} />
      <col style={{ width: "70px" }} />
      <col style={{ width: "80px" }} />
      <col style={{ width: "180px" }} />
    </colgroup>
  );

  const thead = (
    <thead>
      <tr className="text-[10px] uppercase tracking-widest text-gray-500 border-b border-white/10">
        <th className="px-2 py-1.5 text-left font-medium">Герой / Позиция</th>
        <th className="px-2 py-1.5 text-left font-medium">Игрок</th>
        <th className="px-2 py-1.5 text-center font-medium">Ур</th>
        <th className="px-2 py-1.5 text-center font-medium">KDA</th>
        <th className="px-2 py-1.5 text-center font-medium">Золото</th>
        <th className="px-2 py-1.5 text-center font-medium">CS/DN</th>
        <th className="px-2 py-1.5 text-center font-medium">Урон</th>
        <th className="px-2 py-1.5 text-left font-medium">Предметы</th>
      </tr>
    </thead>
  );

  return (
    <div className="space-y-4 mt-4">
      {/* Radiant */}
      <div>
        <div className="flex items-center gap-2 mb-1.5 px-2">
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
            Radiant — {data.radiant_score ?? 0}
          </span>
          {data.radiant_win && (
            <span className="ml-auto text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              ПОБЕДА
            </span>
          )}
        </div>
        <div className="overflow-x-auto rounded-lg border border-emerald-500/10 bg-emerald-950/10">
          <table className="w-full min-w-[700px]">
            {cols}
            {thead}
            <tbody>
              {radiantPlayers.map((p) => {
                const assignedPos = (
                  p.pos_role && p.pos_role >= 1 && p.pos_role <= 5
                    ? p.pos_role
                    : radPosMap.get(p.player_slot)
                ) as DotaPosition | undefined;
                return (
                  <ScoreboardPlayerRow
                    key={p.player_slot}
                    player={p}
                    pos={assignedPos}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dire */}
      <div>
        <div className="flex items-center gap-2 mb-1.5 px-2">
          <Swords className="w-3.5 h-3.5 text-red-400" />
          <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">
            Dire — {data.dire_score ?? 0}
          </span>
          {!data.radiant_win && (
            <span className="ml-auto text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
              ПОБЕДА
            </span>
          )}
        </div>
        <div className="overflow-x-auto rounded-lg border border-red-500/10 bg-red-950/10">
          <table className="w-full min-w-[700px]">
            {cols}
            {thead}
            <tbody>
              {direPlayers.map((p) => {
                const assignedPos = (
                  p.pos_role && p.pos_role >= 1 && p.pos_role <= 5
                    ? p.pos_role
                    : direPosMap.get(p.player_slot)
                ) as DotaPosition | undefined;
                return (
                  <ScoreboardPlayerRow
                    key={p.player_slot}
                    player={p}
                    pos={assignedPos}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Full match breakdown button */}
      <div className="flex items-center justify-between pt-2 px-1">
        <span className="text-[11px] text-zinc-500 font-mono">
          ID: #{data.match_id}
        </span>
        <Link
          href={`/match/${data.match_id}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-750 transition"
        >
          <span>Полный разбор матча (драфт, графики, тайминги)</span>
          <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Match card
// ---------------------------------------------------------------------------
function MatchCard({ match }: { match: EnrichedPublicMatch }) {
  const [expanded, setExpanded] = useState(false);
  const [detailData, setDetailData] = useState<ExpandedMatchData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleExpand = useCallback(async () => {
    if (!expanded && !detailData) {
      setDetailLoading(true);
      try {
        const res = await fetch(`/api/matches/${match.match_id}`);
        if (res.ok) {
          const d = await res.json();
          setDetailData(d);
        }
      } catch {
        // silent
      } finally {
        setDetailLoading(false);
      }
    }
    setExpanded((v) => !v);
  }, [expanded, detailData, match.match_id]);

  const copyId = useCallback(() => {
    navigator.clipboard.writeText(String(match.match_id)).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [match.match_id]);

  const radiantWon = match.radiant_win;

  return (
    <div
      className={`rounded-2xl border bg-zinc-900/40 backdrop-blur-md transition-all duration-200 overflow-hidden
        ${expanded ? "border-zinc-700/80 shadow-lg shadow-black/40" : "border-zinc-800/80 hover:border-zinc-700/80"}`}
    >
      {/* Card header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
        onClick={handleExpand}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && handleExpand()}
      >
        {/* Win indicator strip */}
        <div
          className={`w-1 self-stretch rounded-full flex-shrink-0 ${
            radiantWon ? "bg-emerald-500" : "bg-red-500"
          }`}
        />

        {/* Radiant & Dire teams and heroes */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-1.5 min-w-[90px] sm:min-w-[120px]">
              <Shield className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span className="text-xs font-bold text-emerald-300 truncate max-w-[110px]">
                {match.radiant_name || "Radiant"}
              </span>
              {match.radiant_score !== undefined && (
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {match.radiant_score}
                </span>
              )}
            </div>
            <TeamHeroRow heroes={match.radiant_heroes} isRadiant />
            {radiantWon && (
              <span className="ml-auto text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 flex-shrink-0 font-bold">
                ✓ ПОБЕДА
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-1.5 min-w-[90px] sm:min-w-[120px]">
              <Swords className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
              <span className="text-xs font-bold text-red-300 truncate max-w-[110px]">
                {match.dire_name || "Dire"}
              </span>
              {match.dire_score !== undefined && (
                <span className="text-xs font-mono font-bold text-red-400">
                  {match.dire_score}
                </span>
              )}
            </div>
            <TeamHeroRow heroes={match.dire_heroes} isRadiant={false} />
            {!radiantWon && (
              <span className="ml-auto text-[10px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20 flex-shrink-0 font-bold">
                ✓ ПОБЕДА
              </span>
            )}
          </div>
        </div>

        {/* Right info column */}
        <div className="flex flex-col items-end gap-1 text-right flex-shrink-0 min-w-[130px]">
          {match.league_name ? (
            <span
              className="text-[11px] font-bold text-amber-300 truncate max-w-[170px]"
              title={match.league_name}
            >
              🏆 {match.league_name}
            </span>
          ) : (
            <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-200">
              <span className={radiantWon ? "text-emerald-400" : "text-red-400"}>
                {radiantWon ? match.radiant_name || "Radiant" : match.dire_name || "Dire"}
              </span>
              <span className="text-gray-500 font-normal text-xs">победа</span>
            </div>
          )}
          <div className="flex items-center gap-1 text-xs text-gray-400 font-mono">
            <Clock className="w-3 h-3 text-zinc-500" />
            {fmtDuration(match.duration)}
          </div>
          <div className="flex items-center gap-1.5 text-[11px]">
            {match.game_mode === 23 ? (
              <span className="text-amber-400 font-medium">⚡ Turbo</span>
            ) : match.game_mode === 22 ? (
              <span className="text-emerald-400 font-medium">🛡️ Ranked AP</span>
            ) : match.is_pro || match.game_mode === 2 ? (
              <span className="text-purple-400 font-medium">🏆 Про-турнир</span>
            ) : (
              <span className="text-zinc-300 font-medium">⚔️ {match.game_mode_name}</span>
            )}
          </div>
          {match.avg_rank_tier != null && (
            <div
              className={`flex items-center gap-1 text-xs font-medium ${rankColor(
                match.avg_rank_tier
              )}`}
            >
              <Star className="w-3 h-3" />
              {rankLabel(match.avg_rank_tier)}
            </div>
          )}
          {match.avg_mmr != null && match.avg_mmr > 0 && (
            <div className="flex items-center gap-1 text-xs text-blue-400 font-mono">
              <BarChart2 className="w-3 h-3" />
              {fmt(match.avg_mmr)} MMR
            </div>
          )}
          <div className="flex items-center gap-1 text-[11px] text-gray-600 font-mono">
            <Clock className="w-3 h-3" />
            {timeAgo(match.start_time)}
          </div>
        </div>

        {/* Match ID + expand */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                copyId();
              }}
              className="p-1 rounded text-gray-600 hover:text-gray-400 transition-colors"
              title="Скопировать ID матча"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-green-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
            <Link
              href={`/match/${match.match_id}`}
              onClick={(e) => e.stopPropagation()}
              className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              title="Открыть разбор матча"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
          <span className="text-[10px] text-gray-600 font-mono">
            #{match.match_id}
          </span>
          <div className="mt-1 text-gray-500">
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </div>
      </div>

      {/* Expanded scoreboard */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-t border-white/8 px-4 pb-4"
          >
            <InlineScoreboard
              data={detailData}
              loading={detailLoading}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------
interface LiveMatchesViewProps {
  initialMatches: EnrichedPublicMatch[];
}

const GAME_MODE_OPTIONS = [
  { value: "all", label: "Все матчи" },
  { value: "22", label: "🛡️ Ranked All Pick" },
  { value: "23", label: "⚡ Turbo" },
  { value: "pro", label: "🏆 Про-сцена" },
  { value: "normal", label: "⚔️ Обычные игры" },
];

export default function LiveMatchesView({
  initialMatches,
}: LiveMatchesViewProps) {
  const [matches, setMatches] = useState<EnrichedPublicMatch[]>(initialMatches);
  const [loading, setLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState(Date.now());
  const [filterMode, setFilterMode] = useState<string>("all");
  const [filterResult, setFilterResult] = useState<"all" | "radiant" | "dire">(
    "all"
  );
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/live-matches?limit=80");
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.matches)) {
          setMatches(json.matches);
          setLastFetched(json.fetchedAt ?? Date.now());
        }
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  // Background refresh every 60s
  useEffect(() => {
    fetchMatches();
    intervalRef.current = setInterval(() => {
      fetchMatches();
    }, 60_000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchMatches]);

  // Apply filters client-side
  const filteredMatches = matches.filter((m) => {
    if (filterMode === "pro" && !m.is_pro && m.game_mode !== 2) return false;
    if (filterMode === "22" && m.game_mode !== 22) return false;
    if (filterMode === "23" && m.game_mode !== 23) return false;
    if (filterMode === "normal" && (m.game_mode === 22 || m.game_mode === 23 || m.is_pro || m.game_mode === 2)) return false;
    if (filterResult === "radiant" && !m.radiant_win) return false;
    if (filterResult === "dire" && m.radiant_win) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <div className="relative">
              <Wifi className="w-5 h-5 text-zinc-400" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight">
              Матчи
            </h1>
            <span className="text-xs text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded-full border border-zinc-800 font-mono">
              Патч 7.41d
            </span>
          </div>
          <p className="text-xs text-zinc-400 font-mono">
            Рейтинг, Турбо, Про-игры и Паблики · {filteredMatches.length} игр
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={fetchMatches}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 hover:text-white transition cursor-pointer disabled:opacity-50"
            title="Обновить"
          >
            <RefreshCw
              className={`size-3.5 ${loading ? "animate-spin text-zinc-300" : ""}`}
            />
            <span>Обновить</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Game mode */}
        <div className="flex items-center gap-1.5 flex-wrap p-1 rounded-2xl bg-zinc-900/40 border border-zinc-800/80">
          {GAME_MODE_OPTIONS.map((opt) => {
            const active = filterMode === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setFilterMode(opt.value)}
                className={`relative px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  active ? "text-zinc-100" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="liveMatchesModeGlider"
                    className="absolute inset-0 rounded-xl bg-zinc-800 border border-zinc-700/60 shadow-sm"
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  />
                )}
                <span className="relative z-10">{opt.label}</span>
              </button>
            );
          })}
        </div>

        <div className="w-px h-5 bg-zinc-800 hidden sm:block" />

        {/* Result filter */}
        <div className="flex items-center gap-1 flex-wrap p-1 rounded-2xl bg-zinc-900/40 border border-zinc-800/80">
          {(["all", "radiant", "dire"] as const).map((r) => {
            const active = filterResult === r;
            const label = r === "all" ? "Все исходы" : r === "radiant" ? "Radiant ✓" : "Dire ✓";
            const gliderColor =
              r === "radiant"
                ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-300"
                : r === "dire"
                ? "bg-rose-500/15 border border-rose-500/30 text-rose-300"
                : "bg-zinc-800 border border-zinc-700/60 text-zinc-100 shadow-sm";
            return (
              <button
                key={r}
                onClick={() => setFilterResult(r)}
                className={`relative px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  active
                    ? r === "radiant"
                      ? "text-emerald-300"
                      : r === "dire"
                      ? "text-rose-300"
                      : "text-zinc-100"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="liveMatchesResultGlider"
                    className={`absolute inset-0 rounded-xl ${gliderColor}`}
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  />
                )}
                <span className="relative z-10">{label}</span>
              </button>
            );
          })}
        </div>

        <div className="ml-auto text-[11px] text-gray-600">
          Обновлено {timeAgo(lastFetched / 1000)}
        </div>
      </div>

      {/* Match list */}
      {filteredMatches.length === 0 && !loading ? (
        <div className="text-center py-20 text-gray-600">
          <Trophy className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Нет матчей под выбранные фильтры</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredMatches.map((m) => (
            <MatchCard key={m.match_id} match={m} />
          ))}
        </div>
      )}

      {loading && matches.length > 0 && (
        <div className="flex items-center justify-center gap-2 text-gray-600 text-sm py-4">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Обновляем...
        </div>
      )}
    </div>
  );
}
