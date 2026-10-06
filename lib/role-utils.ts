import { estimatePositionFromHistory, POS_NAME_RU, type DotaPosition } from "./positions";
import type { OpenDotaHero } from "./opendota";

export type PlayerRoleKey = "all" | "1" | "2" | "3" | "4" | "5" | "unknown";

/**
 * Standard competitive position for each Dota 2 hero (1: Carry, 2: Mid, 3: Offlane, 4: Soft Sup, 5: Hard Sup).
 */
export const HERO_DEFAULT_POS: Record<number, DotaPosition> = {
  1: 1, // Anti-Mage
  2: 3, // Axe
  3: 5, // Bane
  4: 1, // Bloodseeker
  5: 5, // Crystal Maiden
  6: 1, // Drow Ranger
  7: 4, // Earthshaker
  8: 1, // Juggernaut
  9: 4, // Mirana
  10: 1, // Morphling
  11: 2, // Shadow Fiend
  12: 1, // Phantom Lancer
  13: 2, // Puck
  14: 4, // Pudge
  15: 2, // Razor
  16: 3, // Sand King
  17: 2, // Storm Spirit
  18: 1, // Sven
  19: 2, // Tiny
  20: 5, // Vengeful Spirit
  21: 2, // Windranger
  22: 2, // Zeus
  23: 2, // Kunkka
  24: 2, // Lina
  25: 5, // Lion
  26: 5, // Shadow Shaman
  27: 3, // Slardar
  28: 3, // Tidehunter
  29: 5, // Witch Doctor
  30: 5, // Lich
  31: 5, // Lich (alt id)
  32: 1, // Riki
  33: 3, // Enigma
  34: 2, // Tinker
  35: 2, // Sniper
  36: 2, // Necrophos
  37: 5, // Warlock
  38: 3, // Beastmaster
  39: 2, // Queen of Pain
  40: 4, // Venomancer
  41: 1, // Faceless Void
  42: 1, // Wraith King
  43: 2, // Death Prophet
  44: 1, // Phantom Assassin
  45: 4, // Pugna
  46: 2, // Templar Assassin
  47: 2, // Viper
  48: 1, // Luna
  49: 2, // Dragon Knight
  50: 5, // Dazzle
  51: 4, // Clockwerk
  52: 2, // Leshrac
  53: 3, // Nature's Prophet
  54: 1, // Lifestealer
  55: 3, // Dark Seer
  56: 1, // Clinkz
  57: 3, // Omniknight
  58: 5, // Enchantress
  59: 2, // Huskar
  60: 3, // Night Stalker
  61: 3, // Broodmother
  62: 4, // Bounty Hunter
  63: 1, // Weaver
  64: 5, // Jakiro
  65: 3, // Batrider
  66: 5, // Chen
  67: 1, // Spectre
  68: 5, // Ancient Apparition
  69: 3, // Doom
  70: 1, // Ursa
  71: 4, // Spirit Breaker
  72: 1, // Gyrocopter
  73: 1, // Alchemist
  74: 2, // Invoker
  75: 5, // Silencer
  76: 2, // Outworld Destroyer
  77: 3, // Lycan
  78: 3, // Brewmaster
  79: 5, // Shadow Demon
  80: 2, // Lone Druid
  81: 1, // Chaos Knight
  82: 2, // Meepo
  83: 5, // Treant Protector
  84: 5, // Ogre Magi
  85: 5, // Undying
  86: 4, // Rubick
  87: 5, // Disruptor
  88: 4, // Nyx Assassin
  89: 1, // Naga Siren
  90: 4, // Keeper of the Light
  91: 5, // Io
  92: 2, // Visage
  93: 1, // Slark
  94: 1, // Medusa
  95: 1, // Troll Warlord
  96: 3, // Centaur Warrunner
  97: 3, // Magnus
  98: 3, // Timbersaw
  99: 3, // Bristleback
  100: 4, // Tusk
  101: 4, // Skywrath Mage
  102: 5, // Abaddon
  103: 5, // Elder Titan
  104: 3, // Legion Commander
  105: 4, // Techies
  106: 2, // Ember Spirit
  107: 4, // Earth Spirit
  108: 3, // Underlord
  109: 1, // Terrorblade
  110: 4, // Phoenix
  111: 5, // Oracle
  112: 5, // Winter Wyvern
  113: 2, // Arc Warden
  114: 1, // Monkey King
  115: 4, // Dark Willow
  116: 2, // Pangolier
  117: 5, // Grimstroke
  118: 4, // Hoodwink
  119: 2, // Void Spirit
  120: 2, // Pangolier (alt)
  121: 5, // Grimstroke (alt)
  123: 4, // Hoodwink (alt)
  126: 2, // Void Spirit (alt)
  128: 4, // Snapfire
  129: 3, // Mars
  131: 4, // Ringmaster
  135: 3, // Dawnbreaker
  136: 4, // Marci
  137: 3, // Primal Beast
  138: 1, // Muerta
  145: 1, // Kez
  155: 4, // Largo
};

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
  // First attempt: use lane and lane_role if available from parsed match
  const heroId = m.hero_id ?? _hero?.id ?? 0;
  const posFromHistory = estimatePositionFromHistory({
    hero_id: heroId,
    lane_role: m.lane_role,
    lane: m.lane,
    player_slot: m.player_slot,
    last_hits: m.last_hits,
    duration: m.duration,
  });
  if (posFromHistory) return String(posFromHistory) as "1" | "2" | "3" | "4" | "5";

  // Second attempt: use hero canonical position combined with farm rate
  const defaultPos = HERO_DEFAULT_POS[heroId];
  const mins = Math.max(1, (m.duration ?? 1800) / 60);
  const lhpm = (m.last_hits ?? 0) / mins;

  if (defaultPos) {
    // If hero is standard core but has virtually no farm -> played as support
    if (defaultPos <= 3 && lhpm > 0 && lhpm < 2.0) {
      return defaultPos === 1 ? "5" : "4";
    }
    // If hero is standard support but has heavy core farm -> played as core
    if (defaultPos >= 4 && lhpm >= 5.0) {
      return "1";
    }
    return String(defaultPos) as "1" | "2" | "3" | "4" | "5";
  }

  // Third attempt: deduce from hero roles
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

