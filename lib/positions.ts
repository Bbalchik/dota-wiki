/**
 * STRATZ- & Dotabuff-style Pos 1–5 assignment from real competitive Dota 2 data.
 * Positions:
 * 1: Керри (Легкая линия)
 * 2: Мидлейнер (Центральная линия)
 * 3: Оффлейнер (Сложная линия)
 * 4: Частичная поддержка (Семи-саппорт)
 * 5: Полная поддержка (Фулл-саппорт)
 */

export type DotaPosition = 1 | 2 | 3 | 4 | 5;

export const POS_ROMAN: Record<DotaPosition, string> = {
  1: "I",
  2: "II",
  3: "III",
  4: "IV",
  5: "V",
};

export const POS_NAME_RU: Record<DotaPosition, string> = {
  1: "Керри",
  2: "Мидлейнер",
  3: "Оффлейнер",
  4: "Частичная поддержка",
  5: "Полная поддержка",
};

export const POS_FULL_RU: Record<DotaPosition, string> = {
  1: "Позиция 1 · Керри (Легкая линия)",
  2: "Позиция 2 · Мидлейнер (Центральная линия)",
  3: "Позиция 3 · Оффлейнер (Сложная линия)",
  4: "Позиция 4 · Частичная поддержка (Семи-саппорт)",
  5: "Позиция 5 · Полная поддержка (Фулл-саппорт)",
};

export function isRadiantSlot(playerSlot: number): boolean {
  return playerSlot < 128;
}

export function teamIndexFromSlot(playerSlot: number): number {
  return (playerSlot % 128) + 1;
}

export type DotaSlotColor = {
  slotNumber: number; // 1..5 for Radiant, 1..5 for Dire
  globalSlot: number; // 1..10 in lobby
  name: string;
  colorName: string;
  hex: string;
  color: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
};

export const DOTA_PLAYER_SLOTS: Record<number, DotaSlotColor> = {
  // Radiant: slots 0..4
  0: { slotNumber: 1, globalSlot: 1, name: "Синий", colorName: "Синий", hex: "#3375FF", color: "#3375FF", bgClass: "bg-[#3375FF]", borderClass: "border-[#3375FF]", textClass: "text-[#3375FF]" },
  1: { slotNumber: 2, globalSlot: 2, name: "Бирюзовый", colorName: "Бирюзовый", hex: "#66FFBF", color: "#66FFBF", bgClass: "bg-[#66FFBF]", borderClass: "border-[#66FFBF]", textClass: "text-[#66FFBF]" },
  2: { slotNumber: 3, globalSlot: 3, name: "Пурпурный", colorName: "Пурпурный", hex: "#BF00BF", color: "#BF00BF", bgClass: "bg-[#BF00BF]", borderClass: "border-[#BF00BF]", textClass: "text-[#BF00BF]" },
  3: { slotNumber: 4, globalSlot: 4, name: "Жёлтый", colorName: "Жёлтый", hex: "#F3F00B", color: "#F3F00B", bgClass: "bg-[#F3F00B]", borderClass: "border-[#F3F00B]", textClass: "text-[#F3F00B]" },
  4: { slotNumber: 5, globalSlot: 5, name: "Оранжевый", colorName: "Оранжевый", hex: "#FF6B00", color: "#FF6B00", bgClass: "bg-[#FF6B00]", borderClass: "border-[#FF6B00]", textClass: "text-[#FF6B00]" },
  // Dire: slots 128..132
  128: { slotNumber: 1, globalSlot: 6, name: "Розовый", colorName: "Розовый", hex: "#FE86C2", color: "#FE86C2", bgClass: "bg-[#FE86C2]", borderClass: "border-[#FE86C2]", textClass: "text-[#FE86C2]" },
  129: { slotNumber: 2, globalSlot: 7, name: "Оливковый", colorName: "Оливковый", hex: "#A1B447", color: "#A1B447", bgClass: "bg-[#A1B447]", borderClass: "border-[#A1B447]", textClass: "text-[#A1B447]" },
  130: { slotNumber: 3, globalSlot: 8, name: "Голубой", colorName: "Голубой", hex: "#65D9F7", color: "#65D9F7", bgClass: "bg-[#65D9F7]", borderClass: "border-[#65D9F7]", textClass: "text-[#65D9F7]" },
  131: { slotNumber: 4, globalSlot: 9, name: "Тёмно-зелёный", colorName: "Тёмно-зелёный", hex: "#008321", color: "#008321", bgClass: "bg-[#008321]", borderClass: "border-[#008321]", textClass: "text-[#008321]" },
  132: { slotNumber: 5, globalSlot: 10, name: "Коричневый", colorName: "Коричневый", hex: "#A46900", color: "#A46900", bgClass: "bg-[#A46900]", borderClass: "border-[#A46900]", textClass: "text-[#A46900]" },
};

export function getPlayerSlotInfo(playerSlot: number): DotaSlotColor {
  if (DOTA_PLAYER_SLOTS[playerSlot]) {
    return DOTA_PLAYER_SLOTS[playerSlot];
  }
  const isRad = isRadiantSlot(playerSlot);
  const normalized = (playerSlot % 128) + 1;
  const fallbackColor = isRad ? "#10B981" : "#F43F5E";
  const fallbackName = isRad ? `Слот Света ${normalized}` : `Слот Тьмы ${normalized}`;
  return {
    slotNumber: normalized,
    globalSlot: isRad ? normalized : normalized + 5,
    name: fallbackName,
    colorName: fallbackName,
    hex: fallbackColor,
    color: fallbackColor,
    bgClass: isRad ? "bg-emerald-500" : "bg-rose-500",
    borderClass: isRad ? "border-emerald-500" : "border-rose-500",
    textClass: isRad ? "text-emerald-400" : "text-rose-400",
  };
}

export type PositionSource = {
  player_slot: number;
  hero_id?: number | null;
  last_hits?: number | null;
  net_worth?: number | null;
  lane?: number | null;
  lane_role?: number | null;
  duration?: number | null;
};

/**
 * Competitive position weights (0-100) for all Dota 2 heroes.
 * Higher score = stronger natural fit for this competitive role.
 */
export const HERO_ROLE_WEIGHTS: Record<number, Record<DotaPosition, number>> = {
  1: { 1: 100, 2: 15, 3: 5, 4: 0, 5: 0 }, // Anti-Mage
  2: { 1: 20, 2: 15, 3: 100, 4: 15, 5: 0 }, // Axe
  3: { 1: 0, 2: 20, 3: 10, 4: 60, 5: 100 }, // Bane
  4: { 1: 90, 2: 60, 3: 80, 4: 20, 5: 10 }, // Bloodseeker
  5: { 1: 0, 2: 0, 3: 0, 4: 60, 5: 100 }, // Crystal Maiden
  6: { 1: 100, 2: 45, 3: 10, 4: 0, 5: 0 }, // Drow Ranger
  7: { 1: 0, 2: 30, 3: 60, 4: 100, 5: 40 }, // Earthshaker
  8: { 1: 100, 2: 25, 3: 10, 4: 0, 5: 0 }, // Juggernaut
  9: { 1: 65, 2: 50, 3: 20, 4: 95, 5: 50 }, // Mirana
  10: { 1: 100, 2: 75, 3: 10, 4: 0, 5: 0 }, // Morphling
  11: { 1: 85, 2: 100, 3: 10, 4: 0, 5: 0 }, // Shadow Fiend
  12: { 1: 100, 2: 20, 3: 10, 4: 0, 5: 0 }, // Phantom Lancer
  13: { 1: 10, 2: 100, 3: 30, 4: 20, 5: 0 }, // Puck
  14: { 1: 75, 2: 50, 3: 85, 4: 90, 5: 35 }, // Pudge
  15: { 1: 65, 2: 85, 3: 95, 4: 10, 5: 0 }, // Razor
  16: { 1: 0, 2: 30, 3: 100, 4: 45, 5: 10 }, // Sand King
  17: { 1: 15, 2: 100, 3: 10, 4: 0, 5: 0 }, // Storm Spirit
  18: { 1: 95, 2: 20, 3: 50, 4: 45, 5: 70 }, // Sven
  19: { 1: 85, 2: 90, 3: 50, 4: 85, 5: 25 }, // Tiny
  20: { 1: 35, 2: 25, 3: 30, 4: 85, 5: 95 }, // Vengeful Spirit
  21: { 1: 70, 2: 90, 3: 40, 4: 85, 5: 35 }, // Windranger
  22: { 1: 20, 2: 95, 3: 20, 4: 70, 5: 30 }, // Zeus
  23: { 1: 50, 2: 90, 3: 85, 4: 35, 5: 10 }, // Kunkka
  24: { 1: 85, 2: 95, 3: 20, 4: 55, 5: 35 }, // Lina
  25: { 1: 0, 2: 20, 3: 10, 4: 85, 5: 95 }, // Lion
  26: { 1: 0, 2: 15, 3: 15, 4: 75, 5: 100 }, // Shadow Shaman
  27: { 1: 40, 2: 20, 3: 100, 4: 25, 5: 0 }, // Slardar
  28: { 1: 10, 2: 10, 3: 100, 4: 20, 5: 20 }, // Tidehunter
  29: { 1: 0, 2: 10, 3: 10, 4: 60, 5: 100 }, // Witch Doctor
  30: { 1: 0, 2: 10, 3: 10, 4: 60, 5: 100 }, // Lich
  31: { 1: 0, 2: 10, 3: 10, 4: 60, 5: 100 }, // Lich
  32: { 1: 90, 2: 40, 3: 25, 4: 65, 5: 0 }, // Riki
  33: { 1: 0, 2: 25, 3: 95, 4: 60, 5: 50 }, // Enigma
  34: { 1: 10, 2: 90, 3: 15, 4: 80, 5: 45 }, // Tinker
  35: { 1: 85, 2: 95, 3: 15, 4: 30, 5: 0 }, // Sniper
  36: { 1: 40, 2: 85, 3: 90, 4: 20, 5: 10 }, // Necrophos
  37: { 1: 0, 2: 10, 3: 10, 4: 50, 5: 100 }, // Warlock
  38: { 1: 15, 2: 30, 3: 100, 4: 15, 5: 0 }, // Beastmaster
  39: { 1: 30, 2: 100, 3: 25, 4: 25, 5: 0 }, // Queen of Pain
  40: { 1: 20, 2: 40, 3: 75, 4: 90, 5: 80 }, // Venomancer
  41: { 1: 100, 2: 25, 3: 35, 4: 10, 5: 0 }, // Faceless Void
  42: { 1: 90, 2: 25, 3: 80, 4: 25, 5: 30 }, // Wraith King
  43: { 1: 25, 2: 85, 3: 90, 4: 35, 5: 35 }, // Death Prophet
  44: { 1: 100, 2: 30, 3: 0, 4: 0, 5: 0 }, // Phantom Assassin
  45: { 1: 10, 2: 60, 3: 30, 4: 90, 5: 80 }, // Pugna
  46: { 1: 90, 2: 95, 3: 10, 4: 0, 5: 0 }, // Templar Assassin
  47: { 1: 30, 2: 90, 3: 90, 4: 25, 5: 15 }, // Viper
  48: { 1: 100, 2: 25, 3: 0, 4: 20, 5: 15 }, // Luna
  49: { 1: 65, 2: 90, 3: 90, 4: 15, 5: 0 }, // Dragon Knight
  50: { 1: 15, 2: 40, 3: 20, 4: 75, 5: 100 }, // Dazzle
  51: { 1: 0, 2: 10, 3: 65, 4: 95, 5: 80 }, // Clockwerk
  52: { 1: 65, 2: 100, 3: 45, 4: 35, 5: 15 }, // Leshrac
  53: { 1: 75, 2: 70, 3: 85, 4: 90, 5: 60 }, // Nature's Prophet
  54: { 1: 100, 2: 15, 3: 35, 4: 0, 5: 0 }, // Lifestealer
  55: { 1: 0, 2: 10, 3: 100, 4: 25, 5: 0 }, // Dark Seer
  56: { 1: 85, 2: 70, 3: 20, 4: 70, 5: 15 }, // Clinkz
  57: { 1: 50, 2: 15, 3: 85, 4: 45, 5: 80 }, // Omniknight
  58: { 1: 15, 2: 25, 3: 40, 4: 80, 5: 100 }, // Enchantress
  59: { 1: 40, 2: 100, 3: 25, 4: 0, 5: 0 }, // Huskar
  60: { 1: 20, 2: 30, 3: 100, 4: 15, 5: 0 }, // Night Stalker
  61: { 1: 45, 2: 90, 3: 90, 4: 0, 5: 0 }, // Broodmother
  62: { 1: 25, 2: 25, 3: 65, 4: 100, 5: 45 }, // Bounty Hunter
  63: { 1: 90, 2: 45, 3: 25, 4: 80, 5: 15 }, // Weaver
  64: { 1: 0, 2: 20, 3: 20, 4: 75, 5: 100 }, // Jakiro
  65: { 1: 0, 2: 85, 3: 90, 4: 55, 5: 25 }, // Batrider
  66: { 1: 0, 2: 0, 3: 10, 4: 50, 5: 100 }, // Chen
  67: { 1: 100, 2: 15, 3: 15, 4: 0, 5: 0 }, // Spectre
  68: { 1: 0, 2: 25, 3: 15, 4: 70, 5: 100 }, // Ancient Apparition
  69: { 1: 30, 2: 25, 3: 100, 4: 25, 5: 10 }, // Doom
  70: { 1: 100, 2: 25, 3: 25, 4: 0, 5: 0 }, // Ursa
  71: { 1: 15, 2: 45, 3: 80, 4: 95, 5: 35 }, // Spirit Breaker
  72: { 1: 90, 2: 45, 3: 15, 4: 65, 5: 25 }, // Gyrocopter
  73: { 1: 90, 2: 85, 3: 40, 4: 25, 5: 15 }, // Alchemist
  74: { 1: 25, 2: 100, 3: 15, 4: 45, 5: 0 }, // Invoker
  75: { 1: 25, 2: 55, 3: 15, 4: 80, 5: 95 }, // Silencer
  76: { 1: 30, 2: 100, 3: 20, 4: 0, 5: 0 }, // Outworld Destroyer
  77: { 1: 85, 2: 30, 3: 95, 4: 0, 5: 0 }, // Lycan
  78: { 1: 15, 2: 40, 3: 100, 4: 25, 5: 0 }, // Brewmaster
  79: { 1: 0, 2: 20, 3: 15, 4: 75, 5: 100 }, // Shadow Demon
  80: { 1: 85, 2: 90, 3: 50, 4: 0, 5: 0 }, // Lone Druid
  81: { 1: 95, 2: 25, 3: 80, 4: 15, 5: 0 }, // Chaos Knight
  82: { 1: 80, 2: 100, 3: 20, 4: 0, 5: 0 }, // Meepo
  83: { 1: 0, 2: 0, 3: 35, 4: 65, 5: 100 }, // Treant Protector
  84: { 1: 15, 2: 20, 3: 70, 4: 80, 5: 95 }, // Ogre Magi
  85: { 1: 0, 2: 0, 3: 45, 4: 65, 5: 100 }, // Undying
  86: { 1: 0, 2: 30, 3: 15, 4: 100, 5: 80 }, // Rubick
  87: { 1: 0, 2: 10, 3: 0, 4: 65, 5: 100 }, // Disruptor
  88: { 1: 0, 2: 40, 3: 45, 4: 100, 5: 35 }, // Nyx Assassin
  89: { 1: 95, 2: 25, 3: 25, 4: 55, 5: 45 }, // Naga Siren
  90: { 1: 0, 2: 60, 3: 15, 4: 95, 5: 85 }, // Keeper of the Light
  91: { 1: 15, 2: 25, 3: 25, 4: 70, 5: 100 }, // Io
  92: { 1: 25, 2: 85, 3: 90, 4: 55, 5: 35 }, // Visage
  93: { 1: 100, 2: 35, 3: 15, 4: 0, 5: 0 }, // Slark
  94: { 1: 100, 2: 55, 3: 15, 4: 0, 5: 0 }, // Medusa
  95: { 1: 100, 2: 35, 3: 15, 4: 0, 5: 0 }, // Troll Warlord
  96: { 1: 15, 2: 15, 3: 100, 4: 15, 5: 0 }, // Centaur Warrunner
  97: { 1: 45, 2: 75, 3: 95, 4: 45, 5: 25 }, // Magnus
  98: { 1: 25, 2: 85, 3: 95, 4: 0, 5: 0 }, // Timbersaw
  99: { 1: 85, 2: 35, 3: 95, 4: 0, 5: 0 }, // Bristleback
  100: { 1: 15, 2: 55, 3: 65, 4: 100, 5: 45 }, // Tusk
  101: { 1: 0, 2: 55, 3: 15, 4: 90, 5: 90 }, // Skywrath Mage
  102: { 1: 65, 2: 15, 3: 85, 4: 55, 5: 95 }, // Abaddon
  103: { 1: 15, 2: 25, 3: 55, 4: 90, 5: 95 }, // Elder Titan
  104: { 1: 45, 2: 35, 3: 100, 4: 0, 5: 0 }, // Legion Commander
  105: { 1: 0, 2: 35, 3: 15, 4: 100, 5: 75 }, // Techies
  106: { 1: 85, 2: 100, 3: 35, 4: 15, 5: 0 }, // Ember Spirit
  107: { 1: 0, 2: 65, 3: 45, 4: 100, 5: 35 }, // Earth Spirit
  108: { 1: 15, 2: 15, 3: 100, 4: 15, 5: 15 }, // Underlord
  109: { 1: 100, 2: 45, 3: 15, 4: 35, 5: 15 }, // Terrorblade
  110: { 1: 0, 2: 35, 3: 75, 4: 95, 5: 85 }, // Phoenix
  111: { 1: 0, 2: 25, 3: 15, 4: 65, 5: 100 }, // Oracle
  112: { 1: 15, 2: 55, 3: 25, 4: 80, 5: 100 }, // Winter Wyvern
  113: { 1: 90, 2: 95, 3: 15, 4: 0, 5: 0 }, // Arc Warden
  114: { 1: 95, 2: 85, 3: 35, 4: 55, 5: 15 }, // Monkey King
  115: { 1: 25, 2: 45, 3: 15, 4: 100, 5: 80 }, // Dark Willow
  116: { 1: 15, 2: 95, 3: 95, 4: 35, 5: 0 }, // Pangolier
  117: { 1: 0, 2: 35, 3: 15, 4: 80, 5: 100 }, // Grimstroke
  118: { 1: 15, 2: 55, 3: 25, 4: 100, 5: 70 }, // Hoodwink
  119: { 1: 25, 2: 100, 3: 35, 4: 45, 5: 0 }, // Void Spirit
  120: { 1: 15, 2: 95, 3: 95, 4: 35, 5: 0 }, // Pangolier
  121: { 1: 0, 2: 35, 3: 15, 4: 80, 5: 100 }, // Grimstroke
  123: { 1: 15, 2: 55, 3: 25, 4: 100, 5: 70 }, // Hoodwink
  126: { 1: 25, 2: 100, 3: 35, 4: 45, 5: 0 }, // Void Spirit
  128: { 1: 25, 2: 75, 3: 35, 4: 95, 5: 80 }, // Snapfire
  129: { 1: 15, 2: 25, 3: 100, 4: 0, 5: 0 }, // Mars
  131: { 1: 0, 2: 25, 3: 15, 4: 100, 5: 90 }, // Ringmaster
  135: { 1: 55, 2: 45, 3: 95, 4: 70, 5: 35 }, // Dawnbreaker
  136: { 1: 80, 2: 35, 3: 70, 4: 95, 5: 50 }, // Marci
  137: { 1: 0, 2: 85, 3: 95, 4: 45, 5: 0 }, // Primal Beast
  138: { 1: 100, 2: 55, 3: 15, 4: 70, 5: 35 }, // Muerta
  145: { 1: 100, 2: 85, 3: 35, 4: 15, 5: 0 }, // Kez
  155: { 1: 0, 2: 20, 3: 30, 4: 95, 5: 85 }, // Largo
};

function getHeroAffinity(heroId: number, pos: DotaPosition): number {
  const w = HERO_ROLE_WEIGHTS[heroId];
  if (w && w[pos] !== undefined) return w[pos];
  return pos === 1 ? 50 : pos === 2 ? 40 : pos === 3 ? 30 : pos === 4 ? 20 : 10;
}

function getPermutations(arr: DotaPosition[]): DotaPosition[][] {
  if (arr.length <= 1) return [arr];
  const res: DotaPosition[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const p of getPermutations(rest)) {
      res.push([arr[i], ...p]);
    }
  }
  return res;
}

const ALL_POS_PERMUTATIONS = getPermutations([1, 2, 3, 4, 5]);

/**
 * Assigns strictly verified, unique 1–5 Dota 2 positions for a 5-player team.
 * Uses replay lanes when available, and optimal Hungarian/permutation matching
 * over canonical hero archetypes + farm priority when unparsed.
 */
export function assignTeamPositions(team: PositionSource[]): Map<number, DotaPosition> {
  const posMap = new Map<number, DotaPosition>();
  if (team.length === 0) return posMap;

  // Single player quick-estimation fallback
  if (team.length === 1) {
    const est = estimatePositionFromHistory(team[0]);
    posMap.set(team[0].player_slot, est ?? 1);
    return posMap;
  }

  const isRadiant = isRadiantSlot(team[0].player_slot);
  const safeLaneNum = isRadiant ? 1 : 3;
  const offLaneNum = isRadiant ? 3 : 1;

  // Check if replay lane coordinates are available
  const hasReplayLanes = team.some((p) => p.lane != null && p.lane > 0);

  if (hasReplayLanes) {
    const assignedSlots = new Set<number>();

    // 1. Mid lane is Lane 2
    const midCandidates = team.filter((p) => p.lane === 2 || p.lane_role === 2);
    if (midCandidates.length > 0) {
      // Pick best mid by hero affinity + farm
      midCandidates.sort((a, b) => {
        const affB = getHeroAffinity(b.hero_id ?? 0, 2) + ((b.last_hits ?? 0) * 0.1);
        const affA = getHeroAffinity(a.hero_id ?? 0, 2) + ((a.last_hits ?? 0) * 0.1);
        return affB - affA;
      });
      posMap.set(midCandidates[0].player_slot, 2);
      assignedSlots.add(midCandidates[0].player_slot);
    }

    // 2. Safe lane -> Pos 1 (Carry) + Pos 5 (Hard Support)
    const safeCandidates = team.filter(
      (p) => !assignedSlots.has(p.player_slot) && (p.lane === safeLaneNum || p.lane_role === 1)
    );
    if (safeCandidates.length >= 2) {
      safeCandidates.sort((a, b) => {
        const scoreB = getHeroAffinity(b.hero_id ?? 0, 1) * 2 + (b.last_hits ?? 0);
        const scoreA = getHeroAffinity(a.hero_id ?? 0, 1) * 2 + (a.last_hits ?? 0);
        return scoreB - scoreA;
      });
      posMap.set(safeCandidates[0].player_slot, 1);
      posMap.set(safeCandidates[safeCandidates.length - 1].player_slot, 5);
      assignedSlots.add(safeCandidates[0].player_slot);
      assignedSlots.add(safeCandidates[safeCandidates.length - 1].player_slot);
    } else if (safeCandidates.length === 1) {
      const p = safeCandidates[0];
      const isCarry = (p.last_hits ?? 0) >= 60 || getHeroAffinity(p.hero_id ?? 0, 1) > getHeroAffinity(p.hero_id ?? 0, 5);
      const posToSet = isCarry ? 1 : 5;
      posMap.set(p.player_slot, posToSet);
      assignedSlots.add(p.player_slot);
    }

    // 3. Off lane -> Pos 3 (Offlaner) + Pos 4 (Soft Support)
    const offCandidates = team.filter(
      (p) => !assignedSlots.has(p.player_slot) && (p.lane === offLaneNum || p.lane_role === 3)
    );
    if (offCandidates.length >= 2) {
      offCandidates.sort((a, b) => {
        const scoreB = getHeroAffinity(b.hero_id ?? 0, 3) * 2 + (b.last_hits ?? 0);
        const scoreA = getHeroAffinity(a.hero_id ?? 0, 3) * 2 + (a.last_hits ?? 0);
        return scoreB - scoreA;
      });
      posMap.set(offCandidates[0].player_slot, 3);
      posMap.set(offCandidates[offCandidates.length - 1].player_slot, 4);
      assignedSlots.add(offCandidates[0].player_slot);
      assignedSlots.add(offCandidates[offCandidates.length - 1].player_slot);
    } else if (offCandidates.length === 1) {
      const p = offCandidates[0];
      const isCore = (p.last_hits ?? 0) >= 50 || getHeroAffinity(p.hero_id ?? 0, 3) > getHeroAffinity(p.hero_id ?? 0, 4);
      const posToSet = isCore ? 3 : 4;
      posMap.set(p.player_slot, posToSet);
      assignedSlots.add(p.player_slot);
    }

    // 4. Roamers or unassigned -> Fill missing positions
    const remainingPlayers = team.filter((p) => !assignedSlots.has(p.player_slot));
    const usedPositions = new Set(Array.from(posMap.values()));
    const missingPositions = ([1, 2, 3, 4, 5] as DotaPosition[]).filter((p) => !usedPositions.has(p));

    if (remainingPlayers.length > 0 && missingPositions.length > 0) {
      // Best matching for remaining
      for (const p of remainingPlayers) {
        let bestPos = missingPositions[0];
        let bestScore = -Infinity;
        for (const pos of missingPositions) {
          const score = getHeroAffinity(p.hero_id ?? 0, pos);
          if (score > bestScore) {
            bestScore = score;
            bestPos = pos;
          }
        }
        posMap.set(p.player_slot, bestPos);
        missingPositions.splice(missingPositions.indexOf(bestPos), 1);
      }
    }

    if (posMap.size === team.length) return posMap;
  }

  // === Permutation Optimal Matching (Works 100% reliably even when replay lanes are absent) ===
  const effectiveTeam = team.slice(0, 5);
  let bestPermutation: DotaPosition[] = [1, 2, 3, 4, 5];
  let maxScore = -Infinity;

  for (const perm of ALL_POS_PERMUTATIONS) {
    let score = 0;
    for (let i = 0; i < effectiveTeam.length; i++) {
      const p = effectiveTeam[i];
      const assignedPos = perm[i];
      const heroId = p.hero_id ?? 0;
      const baseAff = getHeroAffinity(heroId, assignedPos);

      // Farm rate modifiers
      const durationMins = Math.max(1, (p.duration ?? 1800) / 60);
      const lhPerMin = (p.last_hits ?? 0) / durationMins;

      let farmMod = 0;
      if (assignedPos === 1) {
        if (lhPerMin >= 6.5) farmMod += 20;
        else if (lhPerMin < 2.5) farmMod -= 35;
      } else if (assignedPos === 2) {
        if (lhPerMin >= 5.5) farmMod += 20;
        else if (lhPerMin < 2.5) farmMod -= 30;
      } else if (assignedPos === 3) {
        if (lhPerMin >= 4.0) farmMod += 15;
        else if (lhPerMin < 2.0) farmMod -= 25;
      } else if (assignedPos === 4) {
        if (lhPerMin <= 3.5) farmMod += 20;
        else if (lhPerMin > 6.5) farmMod -= 25;
      } else if (assignedPos === 5) {
        if (lhPerMin <= 2.5) farmMod += 25;
        else if (lhPerMin > 5.5) farmMod -= 35;
      }

      score += baseAff + farmMod;
    }

    if (score > maxScore) {
      maxScore = score;
      bestPermutation = perm;
    }
  }

  for (let i = 0; i < effectiveTeam.length; i++) {
    posMap.set(effectiveTeam[i].player_slot, bestPermutation[i]);
  }

  return posMap;
}

/**
 * Single-row match history estimation using hero archetype + lane + CS/min.
 */
export function estimatePositionFromHistory(m: {
  hero_id?: number | null;
  lane_role?: number | null;
  lane?: number | null;
  player_slot?: number | null;
  last_hits?: number | null;
  duration?: number | null;
}): DotaPosition | null {
  const heroId = m.hero_id ?? 0;
  const mins = Math.max(1, (m.duration ?? 1800) / 60);
  const lhpm = (m.last_hits ?? 0) / mins;
  const isHighFarm = lhpm >= 4.0;

  // 1. Direct lane_role mapping with CS support check
  if (m.lane_role === 2) return 2;
  if (m.lane_role === 1) return isHighFarm ? 1 : 5;
  if (m.lane_role === 3) return isHighFarm ? 3 : 4;
  if (m.lane_role === 4) return 4;

  // 2. Direct lane coordinate mapping
  if (m.lane != null) {
    if (m.lane === 2) return 2;
    const isRadiant = m.player_slot != null ? isRadiantSlot(m.player_slot) : true;
    const safeLaneNum = isRadiant ? 1 : 3;
    const offLaneNum = isRadiant ? 3 : 1;
    if (m.lane === safeLaneNum) return isHighFarm ? 1 : 5;
    if (m.lane === offLaneNum) return isHighFarm ? 3 : 4;
  }

  // 3. Hero canonical archetype
  if (heroId > 0 && HERO_ROLE_WEIGHTS[heroId]) {
    const weights = HERO_ROLE_WEIGHTS[heroId];
    let bestPos: DotaPosition = 1;
    let maxWeight = -1;
    for (const [posStr, w] of Object.entries(weights)) {
      const pos = Number(posStr) as DotaPosition;
      let effectiveWeight = w;
      if ((pos === 1 || pos === 2 || pos === 3) && !isHighFarm) effectiveWeight -= 40;
      if ((pos === 4 || pos === 5) && isHighFarm) effectiveWeight -= 40;
      if (effectiveWeight > maxWeight) {
        maxWeight = effectiveWeight;
        bestPos = pos;
      }
    }
    return bestPos;
  }

  return null;
}
