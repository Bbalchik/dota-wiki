/**
 * Dota 2 Rank Medal utilities with official Russian Dota 2 client names.
 */

export type RankInfo = {
  name: string; // Russian name: Рекрут, Страж, Рыцарь, Герой, Легенда, Властелин, Божество, Титан
  nameEn: string; // Herald, Guardian, Crusader, Archon, Legend, Ancient, Divine, Immortal
  tier: number; // 0-8
  stars: number; // 0-5
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  medalIconPath: string;
  starIconPath: string | null;
};

const MEDAL_NAMES_RU: Record<number, string> = {
  1: 'Рекрут',
  2: 'Страж',
  3: 'Рыцарь',
  4: 'Герой',
  5: 'Легенда',
  6: 'Властелин',
  7: 'Божество',
  8: 'Титан',
};

const MEDAL_NAMES_EN: Record<number, string> = {
  1: 'Herald',
  2: 'Guardian',
  3: 'Crusader',
  4: 'Archon',
  5: 'Legend',
  6: 'Ancient',
  7: 'Divine',
  8: 'Immortal',
};

const MEDAL_COLORS: Record<
  number,
  { color: string; bg: string; border: string; text: string }
> = {
  1: { color: '#9ca3af', bg: 'bg-zinc-800/60',  border: 'border-zinc-600', text: 'text-zinc-300' },
  2: { color: '#4ade80', bg: 'bg-emerald-950/40', border: 'border-emerald-700', text: 'text-emerald-300' },
  3: { color: '#86efac', bg: 'bg-emerald-950/40', border: 'border-emerald-600', text: 'text-emerald-200' },
  4: { color: '#2dd4bf', bg: 'bg-teal-950/40',  border: 'border-teal-600',  text: 'text-teal-300' },
  5: { color: '#38bdf8', bg: 'bg-sky-950/40',   border: 'border-sky-600',   text: 'text-sky-300' },
  6: { color: '#818cf8', bg: 'bg-indigo-950/40',border: 'border-indigo-500',text: 'text-indigo-300' },
  7: { color: '#c084fc', bg: 'bg-purple-950/40',border: 'border-purple-500',text: 'text-purple-300' },
  8: { color: '#fbbf24', bg: 'bg-amber-950/40', border: 'border-amber-500', text: 'text-amber-300' },
};

export function getRankInfo(rankTier: number | null): RankInfo {
  if (!rankTier || rankTier <= 0) {
    return {
      name: 'Без ранга',
      nameEn: 'Unranked',
      tier: 0,
      stars: 0,
      color: '#71717a',
      bgColor: 'bg-zinc-900',
      borderColor: 'border-zinc-700',
      textColor: 'text-zinc-400',
      medalIconPath: '/assets/ranks/rank_icon_0.png',
      starIconPath: null,
    };
  }

  const tier = Math.min(8, Math.max(1, Math.floor(rankTier / 10)));
  const stars = tier === 8 ? 0 : Math.min(5, Math.max(0, rankTier % 10));
  const c = MEDAL_COLORS[tier] ?? MEDAL_COLORS[1];

  return {
    name: MEDAL_NAMES_RU[tier] ?? 'Неизвестно',
    nameEn: MEDAL_NAMES_EN[tier] ?? 'Unknown',
    tier,
    stars,
    color: c.color,
    bgColor: c.bg,
    borderColor: c.border,
    textColor: c.text,
    medalIconPath: `/assets/ranks/rank_icon_${tier}.png`,
    starIconPath: stars > 0 ? `/assets/ranks/rank_star_${stars}.png` : null,
  };
}

export function rankTierToString(tier: number | null): string {
  const info = getRankInfo(tier);
  if (!tier || info.tier === 0) return 'Без ранга';
  if (info.tier === 8) return 'Титан';
  return `${info.name} ${info.stars > 0 ? `${info.stars}★` : ''}`;
}

export function rankTierToColor(tier: number | null): string {
  return getRankInfo(tier).textColor;
}

export function rankTierBg(tier: number | null): string {
  return getRankInfo(tier).bgColor;
}

/**
 * Approximate Dota 2 MMR estimated from rank tier (1 star = ~154 MMR).
 */
export function estimateMmrFromTier(rankTier: number | null): number | null {
  if (!rankTier || rankTier <= 0) return null;
  const tier = Math.floor(rankTier / 10);
  const stars = Math.max(1, rankTier % 10);

  const baseMmr: Record<number, number> = {
    1: 10,   // Herald
    2: 770,  // Guardian
    3: 1540, // Crusader
    4: 2310, // Archon
    5: 3080, // Legend
    6: 3850, // Ancient
    7: 4620, // Divine
    8: 5620, // Immortal
  };

  const base = baseMmr[tier];
  if (base == null) return null;
  if (tier === 8) return 5620;

  const starStep = tier === 7 ? 200 : 154;
  return base + (stars - 1) * starStep;
}

/**
 * Returns estimated MMR range based on official Valve medal and stars.
 * Example: rankTier 61 (Ancient 1) -> "~3,850 – 4,004 MMR"
 */
export function getMmrRangeFromTier(rankTier: number | null): string | null {
  if (!rankTier || rankTier <= 0) return null;
  const tier = Math.floor(rankTier / 10);
  const base = estimateMmrFromTier(rankTier);
  if (!base) return null;
  if (tier === 8) return '5,620+ MMR';
  const step = tier === 7 ? 200 : 154;
  return `~${base.toLocaleString()} – ${(base + step).toLocaleString()} MMR`;
}

