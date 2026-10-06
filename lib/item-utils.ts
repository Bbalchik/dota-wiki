import itemIdsData from './constants/item_ids.json';
import itemCostsData from './constants/item_costs.json';

const itemMap = itemIdsData as Record<string, string>;
const itemCosts = itemCostsData as Record<string, { cost: number; dname: string }>;

/**
 * Returns item slug from numeric Dota 2 item ID.
 * e.g. 1 -> "blink", 63 -> "power_treads", 116 -> "black_king_bar"
 */
export function getItemSlug(itemId: number): string | null {
  if (!itemId || itemId <= 0) return null;
  const slug = itemMap[String(itemId)];
  return slug || null;
}

/**
 * Returns official Valve Steam CDN image URL for a Dota 2 item.
 */
export function getItemIconUrl(itemId: number): string | null {
  const slug = getItemSlug(itemId);
  if (!slug) return null;

  // Recipe items use generic recipe icon or specific recipe name
  if (slug.startsWith('recipe_')) {
    return 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/items/recipe.png';
  }

  return `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/items/${slug}.png`;
}

/**
 * Human-readable item name from ID.
 */
export function getItemName(itemId: number): string {
  const custom = itemCosts[String(itemId)];
  if (custom?.dname) return custom.dname;

  const slug = getItemSlug(itemId);
  if (!slug) return 'Пустой слот';

  return slug
    .replace(/^item_/, '')
    .replace(/^recipe_/, 'Recipe: ')
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

import itemRecipesData from './constants/item_recipes.json';

const itemRecipes = itemRecipesData as Record<string, string[]>;

export function getItemCost(itemId: number): number {
  if (!itemId || itemId <= 0) return 0;
  return itemCosts[String(itemId)]?.cost ?? 1000;
}

const slugToIdMap: Record<string, number> = {};
for (const [id, slug] of Object.entries(itemMap)) {
  slugToIdMap[slug] = Number(id);
}

export type ResolvedItem = {
  id: number;
  slug: string;
  name: string;
  icon: string | null;
  cost: number;
  count?: number;
};

/**
 * Resolves item information from either a numeric ID or a string slug (from OpenDota purchase_log).
 */
export function resolveItemKey(key: string | number, count?: number): ResolvedItem {
  // If it's a numeric ID or a numeric string
  const num = Number(key);
  if (!isNaN(num) && num > 0) {
    const slug = itemMap[String(num)] || `item_${num}`;
    const cost = itemCosts[String(num)]?.cost ?? 0;
    const name = itemCosts[String(num)]?.dname || getItemName(num);
    const icon = getItemIconUrl(num);
    return { id: num, slug, name, icon, cost, ...(count !== undefined ? { count } : {}) };
  }

  const strKey = String(key || "");
  const rawSlug = strKey.replace(/^item_/, "");

  // Check if stripping item_ revealed a numeric ID (e.g. item_63 -> 63)
  const numFromSlug = Number(rawSlug);
  if (!isNaN(numFromSlug) && numFromSlug > 0) {
    return resolveItemKey(numFromSlug, count);
  }

  const id = slugToIdMap[rawSlug] || slugToIdMap[strKey] || 0;
  const cost = id ? (itemCosts[String(id)]?.cost ?? 0) : (getItemCostBySlug(rawSlug) || 0);
  const name = id && itemCosts[String(id)]?.dname 
    ? itemCosts[String(id)].dname 
    : rawSlug.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const icon = rawSlug.startsWith("recipe_")
    ? "https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/items/recipe.png"
    : `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/items/${rawSlug}.png`;
  return { id, slug: rawSlug, name, icon, cost, ...(count !== undefined ? { count } : {}) };
}

/**
 * Resolves an item and calculates its authentic stack / charges count (Observer/Sentry wards, Dust, Tango).
 */
export function resolveItemWithStackCount(
  key: number | string,
  purchaseLog?: { time: number; key: string }[],
  obsPlaced?: number,
  senPlaced?: number,
  explicitCount?: number,
  matchDurationSec?: number
): ResolvedItem {
  const base = resolveItemKey(key);
  if (explicitCount !== undefined && explicitCount > 0) {
    return { ...base, count: explicitCount };
  }

  // Sentry Ward (ID 43 or 'ward_sentry')
  if (base.slug === "ward_sentry" || base.id === 43) {
    const bought = (purchaseLog || []).filter(
      (e) => e.key === "ward_sentry" || e.key === "item_ward_sentry"
    );
    const placed = senPlaced ?? 0;
    const net = Math.max(1, bought.length - placed);
    const recent = matchDurationSec
      ? bought.filter((e) => e.time >= matchDurationSec - 240).length
      : 0;
    const count = recent > 0 ? Math.min(3, recent) : Math.min(3, net);
    return { ...base, count: Math.max(1, count) };
  }

  // Observer Ward (ID 42 or 'ward_observer')
  if (base.slug === "ward_observer" || base.id === 42) {
    const bought = (purchaseLog || []).filter(
      (e) => e.key === "ward_observer" || e.key === "item_ward_observer"
    ).length;
    const placed = obsPlaced ?? 0;
    const net = Math.max(1, bought - placed);
    return { ...base, count: Math.min(2, net) };
  }

  // Ward Dispenser (ID 218: holds both Observers + Sentries)
  if (base.slug === "ward_dispenser" || base.id === 218) {
    const sBought = (purchaseLog || []).filter(
      (e) => e.key === "ward_sentry" || e.key === "item_ward_sentry"
    ).length;
    const sPlaced = senPlaced ?? 0;
    const oBought = (purchaseLog || []).filter(
      (e) => e.key === "ward_observer" || e.key === "item_ward_observer"
    ).length;
    const oPlaced = obsPlaced ?? 0;
    const totalWards = Math.max(1, Math.max(0, sBought - sPlaced) + Math.max(0, oBought - oPlaced));
    return { ...base, count: Math.min(4, totalWards) };
  }

  // Dust of Appearance (ID 40: sold in stacks of 2)
  if (base.slug === "dust" || base.id === 40) {
    return { ...base, count: 2 };
  }

  // Tango (ID 44: starts with 3 charges)
  if (base.slug === "tango" || base.id === 44) {
    return { ...base, count: 3 };
  }

  return base;
}

const NON_INVENTORY_ITEMS = new Set([
  'aghanims_shard', 'tpscroll'
]);

const CONSUMABLES = new Set([
  'tango', 'clarity', 'flask', 'faerie_fire', 'blood_grenade', 'enchanted_mango'
]);

export function simulateInventoryAtTime(
  purchaseLog: { time: number; key: string }[] | undefined,
  targetTimeSec: number,
  finalItemIds?: number[],
  matchDurationSec?: number,
  obsLog?: { time: number }[],
  senLog?: { time: number }[]
): ResolvedItem[] {
  const full = simulateFullPlayerStateAtTime(
    purchaseLog,
    targetTimeSec,
    finalItemIds
      ? {
          item_0: finalItemIds[0],
          item_1: finalItemIds[1],
          item_2: finalItemIds[2],
          item_3: finalItemIds[3],
          item_4: finalItemIds[4],
          item_5: finalItemIds[5],
        }
      : undefined,
    undefined,
    matchDurationSec,
    obsLog,
    senLog
  );
  return full.inventory.filter((it): it is ResolvedItem => it !== null);
}

function getItemCostBySlug(slug: string): number {
  const id = slugToIdMap[slug];
  if (!id) return 0;
  return itemCosts[String(id)]?.cost ?? 0;
}

export type SimulatedPlayerSlotState = {
  inventory: (ResolvedItem | null)[];
  backpack: (ResolvedItem | null)[];
  neutralItem: ResolvedItem | null;
  hasShard: boolean;
  hasScepter: boolean;
  purchasesUpToTime: { time: number; key: string; item: ResolvedItem }[];
  recentPurchases: { time: number; key: string; item: ResolvedItem }[];
};

export function simulateFullPlayerStateAtTime(
  purchaseLog: { time: number; key: string }[] | undefined,
  targetTimeSec: number,
  finalItems?: {
    item_0?: number;
    item_1?: number;
    item_2?: number;
    item_3?: number;
    item_4?: number;
    item_5?: number;
    backpack_0?: number;
    backpack_1?: number;
    backpack_2?: number;
    item_neutral?: number;
    aghanims_shard?: number;
    aghanims_scepter?: number;
    permanent_buffs?: { permanent_buff: number; stack_count?: number; grant_time?: number }[];
    obs_placed?: number;
    sen_placed?: number;
  },
  neutralItemHistory?: { time: number; item_neutral?: string | number }[],
  matchDurationSec?: number,
  obsLog?: { time: number }[],
  senLog?: { time: number }[],
  itemUses?: Record<string, number>
): SimulatedPlayerSlotState {
  const isFinal = Boolean(matchDurationSec && targetTimeSec >= matchDurationSec - 60);

  // If at the end of match, return the 100% verified final inventory from Valve
  if (isFinal && finalItems) {
    const mainIds = [
      finalItems.item_0,
      finalItems.item_1,
      finalItems.item_2,
      finalItems.item_3,
      finalItems.item_4,
      finalItems.item_5,
    ];
    const bpIds = [
      finalItems.backpack_0,
      finalItems.backpack_1,
      finalItems.backpack_2,
    ];

    const inventory: (ResolvedItem | null)[] = mainIds.map((id) =>
      id && id > 0
        ? resolveItemWithStackCount(
            id,
            purchaseLog,
            finalItems.obs_placed,
            finalItems.sen_placed,
            undefined,
            matchDurationSec
          )
        : null
    );
    const backpack: (ResolvedItem | null)[] = bpIds.map((id) =>
      id && id > 0
        ? resolveItemWithStackCount(
            id,
            purchaseLog,
            finalItems.obs_placed,
            finalItems.sen_placed,
            undefined,
            matchDurationSec
          )
        : null
    );
    const neutralItem =
      finalItems.item_neutral && finalItems.item_neutral > 0
        ? resolveItemKey(finalItems.item_neutral)
        : null;
    const hasShard = Boolean(
      finalItems.aghanims_shard ||
        finalItems.permanent_buffs?.some((b) => b.permanent_buff === 2)
    );
    const hasScepter = Boolean(
      finalItems.aghanims_scepter ||
        finalItems.permanent_buffs?.some((b) => b.permanent_buff === 1)
    );

    const allPurchases = (purchaseLog || []).map((p) => ({
      time: p.time,
      key: p.key,
      item: resolveItemKey(p.key),
    }));

    const recent = allPurchases.filter(
      (p) => p.time >= targetTimeSec - 60 && p.time <= targetTimeSec
    );

    return {
      inventory,
      backpack,
      neutralItem,
      hasShard,
      hasScepter,
      purchasesUpToTime: allPurchases,
      recentPurchases: recent,
    };
  }

  // If purchaseLog is empty (replay was not parsed), we never invent items for minute T
  if (!purchaseLog || purchaseLog.length === 0) {
    return {
      inventory: [null, null, null, null, null, null],
      backpack: [null, null, null],
      neutralItem: null,
      hasShard: false,
      hasScepter: false,
      purchasesUpToTime: [],
      recentPurchases: [],
    };
  }

  // Filter purchases up to target minute
  const purchases = purchaseLog.filter((e) => e.time <= targetTimeSec);
  const purchasesUpToTime = purchases.map((p) => ({
    time: p.time,
    key: p.key,
    item: resolveItemKey(p.key),
  }));

  const recentPurchases = purchasesUpToTime.filter(
    (p) => p.time >= targetTimeSec - 60 && p.time <= targetTimeSec
  );

  const hasShard = purchases.some(
    (p) => p.key === "aghanims_shard" || p.key === "item_aghanims_shard"
  );
  const hasScepter = purchases.some(
    (p) =>
      p.key === "ultimate_scepter" ||
      p.key === "item_ultimate_scepter" ||
      p.key === "ultimate_scepter_synth"
  );

  // Neutral Item resolution
  let neutralItem: ResolvedItem | null = null;
  if (neutralItemHistory && neutralItemHistory.length > 0) {
    const pastNeutrals = neutralItemHistory.filter(
      (n) => n.time <= targetTimeSec && n.item_neutral
    );
    if (pastNeutrals.length > 0) {
      const latest = pastNeutrals[pastNeutrals.length - 1];
      if (latest.item_neutral) {
        neutralItem = resolveItemKey(latest.item_neutral);
      }
    }
  }

  if (!neutralItem && targetTimeSec >= 420 && finalItems?.item_neutral && finalItems.item_neutral > 0) {
    if (targetTimeSec >= 1200) {
      neutralItem = resolveItemKey(finalItems.item_neutral);
    }
  }

  // 1. Calculate realistic active ward counts at target second
  const obsBought = purchases.filter(
    (e) => e.key === "ward_observer" || e.key === "item_ward_observer"
  ).length;
  const obsPlacedCount = (obsLog || []).filter((o) => o.time <= targetTimeSec).length;
  let remObs = obsLog && obsLog.length > 0
    ? Math.max(0, obsBought - obsPlacedCount)
    : purchases.filter(
        (e) => (e.key === "ward_observer" || e.key === "item_ward_observer") && targetTimeSec - e.time <= 90
      ).length;
  remObs = Math.min(2, remObs);

  const senBought = purchases.filter(
    (e) => e.key === "ward_sentry" || e.key === "item_ward_sentry"
  ).length;
  const senPlacedCount = (senLog || []).filter((s) => s.time <= targetTimeSec).length;
  let remSen = senLog && senLog.length > 0
    ? Math.max(0, senBought - senPlacedCount)
    : purchases.filter(
        (e) => (e.key === "ward_sentry" || e.key === "item_ward_sentry") && targetTimeSec - e.time <= 90
      ).length;
  remSen = Math.min(3, remSen);

  // Track standard items dynamically: each slot preserves slug, count, and lastBuyTime
  interface SlotItem {
    slug: string;
    count: number;
    lastBuyTime: number;
  }
  let inv: SlotItem[] = [];

  for (const entry of purchases) {
    const slug = entry.key.replace(/^item_/, "");
    if (slug.startsWith("recipe_")) continue;
    // Shard and TP scroll never occupy standard inventory slots
    if (slug === "aghanims_shard" || slug === "tpscroll") continue;
    // Wards are handled separately to guarantee accurate merging and counts
    if (slug === "ward_observer" || slug === "ward_sentry" || slug === "ward_dispenser") continue;

    // Check recipe consumption - replace first component in-place to preserve item slot position
    const comps = itemRecipes[slug];
    let replaced = false;
    if (comps && comps.length > 0) {
      for (const comp of comps) {
        const idx = inv.findIndex((it) => it.slug === comp);
        if (idx !== -1) {
          if (!replaced) {
            inv[idx] = { slug, count: 1, lastBuyTime: entry.time };
            replaced = true;
          } else {
            inv.splice(idx, 1);
          }
        }
      }
    }

    if (replaced) continue;

    const isConsumable = CONSUMABLES.has(slug);
    const isStackable = isConsumable || slug === "dust" || slug === "smoke_of_deceit";

    if (isStackable) {
      const existingIdx = inv.findIndex((it) => it.slug === slug);
      if (existingIdx !== -1) {
        const inc = slug === "dust" ? 2 : slug === "tango" ? 3 : 1;
        inv[existingIdx].count = Math.min(6, inv[existingIdx].count + inc);
        inv[existingIdx].lastBuyTime = entry.time;
        continue;
      }
    }

    // Initial stack count
    const initialCount = slug === "dust" ? 2 : slug === "tango" ? 3 : 1;
    inv.push({ slug, count: initialCount, lastBuyTime: entry.time });
  }

  // Expire consumables used or expired
  inv = inv.filter((slot) => {
    if (slot.slug === "tango") {
      const elapsed = targetTimeSec - slot.lastBuyTime;
      if (elapsed > 300) return false;
      slot.count = Math.max(1, 3 - Math.floor(elapsed / 90));
      return true;
    }
    if (slot.slug === "dust") {
      const elapsed = targetTimeSec - slot.lastBuyTime;
      if (elapsed > 360) return false;
      if (elapsed > 180) slot.count = 1;
      return true;
    }
    if (CONSUMABLES.has(slot.slug) && targetTimeSec - slot.lastBuyTime > 120) {
      return false;
    }
    return true;
  });

  // Inject active wards (merging into ward_dispenser if holding both, exactly like Dota 2)
  if (remObs > 0 && remSen > 0) {
    inv.push({ slug: "ward_dispenser", count: remObs + remSen, lastBuyTime: targetTimeSec });
  } else if (remObs > 0) {
    inv.push({ slug: "ward_observer", count: remObs, lastBuyTime: targetTimeSec });
  } else if (remSen > 0) {
    inv.push({ slug: "ward_sentry", count: remSen, lastBuyTime: targetTimeSec });
  }

  // Preserve natural slot acquisition order: first 6 in active inventory, next 3 in backpack
  const mainItems = inv.slice(0, 6);
  const bpItems = inv.slice(6, 9);

  const inventory: (ResolvedItem | null)[] = [null, null, null, null, null, null];
  for (let i = 0; i < 6; i++) {
    if (mainItems[i]) {
      inventory[i] = resolveItemKey(mainItems[i].slug, mainItems[i].count);
    }
  }

  const backpack: (ResolvedItem | null)[] = [null, null, null];
  for (let i = 0; i < 3; i++) {
    if (bpItems[i]) {
      backpack[i] = resolveItemKey(bpItems[i].slug, bpItems[i].count);
    }
  }

  return {
    inventory,
    backpack,
    neutralItem,
    hasShard,
    hasScepter,
    purchasesUpToTime,
    recentPurchases,
  };
}

