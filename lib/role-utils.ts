import {
  estimatePositionFromHistory,
  HERO_DEFAULT_POS,
  POS_NAME_RU,
  type DotaPosition,
} from "./positions";
import type { OpenDotaHero } from "./opendota";

export { HERO_DEFAULT_POS };

export type PlayerRoleKey = "all" | "1" | "2" | "3" | "4" | "5" | "unknown";

export function resolveMatchRole(
  m: {
    lane_role?: number | null;
    lane?: number | null;
    hero_id?: number;
    last_hits?: number | null;
    duration?: number | null;
    player_slot?: number | null;
  },
  _hero?: OpenDotaHero | null
): Exclude<PlayerRoleKey, "all"> {
  const heroId = m.hero_id ?? _hero?.id ?? 0;

  // 1. First attempt: Use verified lane/farm estimator
  const posFromHistory = estimatePositionFromHistory({
    hero_id: heroId,
    lane_role: m.lane_role,
    lane: m.lane,
    player_slot: m.player_slot,
    last_hits: m.last_hits,
    duration: m.duration,
  });
  if (posFromHistory) {
    return String(posFromHistory) as "1" | "2" | "3" | "4" | "5";
  }

  // 2. Second attempt: Hero canonical position combined with farm rate
  const defaultPos = HERO_DEFAULT_POS[heroId];
  const mins = Math.max(1, (m.duration ?? 1800) / 60);
  const lhpm = (m.last_hits ?? 0) / mins;

  if (defaultPos) {
    // If hero is standard core but has virtually no farm -> played as support
    if (defaultPos <= 3 && (m.last_hits ?? 0) > 0 && lhpm < 1.5) {
      return defaultPos === 1 ? "5" : "4";
    }
    // If hero is standard support but has heavy carry farm -> played as carry
    if (defaultPos >= 4 && lhpm >= 5.5) {
      return "1";
    }
    return String(defaultPos) as "1" | "2" | "3" | "4" | "5";
  }

  // 3. Third attempt: deduce from hero roles
  if (_hero?.roles?.includes("Carry") && lhpm >= 3.5) return "1";
  if (_hero?.roles?.includes("Support") && lhpm < 3.0) return "5";
  if (lhpm >= 5.0) return "1";
  if (lhpm >= 3.0) return "3";

  return "unknown";
}

export function getRoleNameRu(role: Exclude<PlayerRoleKey, "all">): string {
  if (role === "unknown") return "Роль неизвестна";
  const pos = Number(role) as DotaPosition;
  return `Поз ${role} · ${POS_NAME_RU[pos]}`;
}

export function getRoleBadgeClass(role: Exclude<PlayerRoleKey, "all">): { bg: string; text: string; border: string } {
  switch (role) {
    case "1":
      return { bg: "bg-emerald-950/40", text: "text-emerald-300", border: "border-emerald-500/30" };
    case "2":
      return { bg: "bg-amber-950/40", text: "text-amber-300", border: "border-amber-500/30" };
    case "3":
      return { bg: "bg-blue-950/40", text: "text-blue-300", border: "border-blue-500/30" };
    case "4":
      return { bg: "bg-violet-950/40", text: "text-violet-300", border: "border-violet-500/30" };
    case "5":
      return { bg: "bg-fuchsia-950/40", text: "text-fuchsia-300", border: "border-fuchsia-500/30" };
    default:
      return { bg: "bg-zinc-900/40", text: "text-zinc-300", border: "border-zinc-500/30" };
  }
}
