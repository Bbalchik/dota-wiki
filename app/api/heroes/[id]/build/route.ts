import { NextRequest, NextResponse } from "next/server";
import { fetchAllHeroes, heroIconUrl, getItemIconUrl, getItemName } from "@/lib/opendota";
import { resolveItemKey } from "@/lib/item-utils";
import { estimatePositionFromHistory, POS_NAME_RU, POS_FULL_RU, type DotaPosition } from "@/lib/positions";
import { prisma } from "@/lib/prisma";
import heroAbilitiesData from "@/lib/constants/hero_abilities.json";
import abilitiesData from "@/lib/constants/abilities.json";
import itemIdsData from "@/lib/constants/item_ids.json";
import abilityIdsData from "@/lib/constants/ability_ids.json";

interface PopularItem {
  id: number;
  name: string;
  localizedName: string;
  icon: string;
  count: number;
}

export interface RealPlayerMatch {
  match_id: number;
  start_time: number;
  duration: number;
  won: boolean;
  player_name: string;
  account_id?: number | null;
  avatar?: string | null;
  pos: DotaPosition;
  pos_name: string;
  pos_full: string;
  kills: number;
  deaths: number;
  assists: number;
  kda: string;
  net_worth?: number;
  gpm?: number;
  xpm?: number;
  hero_damage?: number;
  last_hits?: number;
  lane_role?: number | null;
  rank_tier?: number | null;
  final_items: Array<{ id: number; name: string; localizedName: string; icon: string }>;
  neutral_item?: { id: number; name: string; localizedName: string; icon: string } | null;
  starting_items: Array<{ name: string; localizedName: string; icon: string }>;
  timeline_items: Array<{ name: string; localizedName: string; icon: string; time: string; minute: number }>;
  skill_build: Array<{ level: number; name: string; title: string; img: string }>;
}

// In-memory cache for builds to ensure sub-10ms response times
const buildCache = new Map<number, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000;

// Curated role fallback items if a hero has few matches in the local DB
const ROLE_DEFAULT_ITEMS: Record<
  string,
  { start: number[]; early: number[]; mid: number[]; late: number[] }
> = {
  carry: {
    start: [44, 216, 16, 16, 265, 38], // Tango, Quelling Blade, Branches, Branches, Circlet, Clarity
    early: [63, 75, 36, 182, 11, 237], // Power Treads, Wraith Band, Magic Wand, Falcon Blade, Quelling Blade, Orb of Corrosion
    mid: [147, 145, 116, 135, 1, 154], // Manta Style, Battle Fury, BKB, Monkey King Bar, Blink Dagger, S&Y
    late: [139, 208, 160, 156, 114, 249], // Butterfly, Abyssal Blade, Eye of Skadi, Satanic, Heart, Silver Edge
  },
  mid: {
    start: [41, 16, 16, 265, 44, 38], // Bottle, Branches, Branches, Circlet, Tango, Clarity
    early: [41, 48, 36, 77, 236, 102], // Bottle, Power Treads, Magic Wand, Null Talisman, Spirit Vessel, Force Staff
    mid: [1, 116, 96, 100, 108, 235], // Blink Dagger, BKB, Scythe of Vyse, Eul, Aghs, Octarine Core
    late: [141, 96, 114, 208, 180, 160], // Daedalus, Scythe of Vyse, Heart, Abyssal, Octarine, Skadi
  },
  offlane: {
    start: [44, 265, 16, 16, 182, 38], // Tango, Circlet, Branches, Branches, Stout/Ring, Clarity
    early: [50, 73, 36, 178, 180, 242], // Phase Boots, Bracer, Magic Wand, Soul Ring, Arcane Boots, Crimson Guard
    mid: [1, 116, 108, 90, 110, 226], // Blink Dagger, BKB, Aghanim, Pipe of Insight, Shiva's Guard, Lotus Orb
    late: [114, 226, 110, 208, 119, 139], // Heart, Lotus Orb, Shiva, Abyssal, Assault Cuirass, Butterfly
  },
  support: {
    start: [44, 42, 43, 38, 16, 16], // Tango, Observer, Sentry, Clarity, Branch, Branch
    early: [214, 36, 180, 77, 188, 40], // Tranquil Boots, Magic Wand, Arcane Boots, Null, Smoke, Dust
    mid: [102, 254, 108, 90, 226, 1], // Force Staff, Glimmer Cape, Aghs, Pipe, Lotus Orb, Blink
    late: [96, 226, 108, 229, 235, 110], // Scythe of Vyse, Lotus Orb, Aghs Scepter, Solar Crest, Octarine, Shiva
  },
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const heroId = Number(id);

  if (isNaN(heroId) || heroId <= 0) {
    return NextResponse.json({ error: "Invalid hero ID" }, { status: 400 });
  }

  // Check in-memory cache
  const cached = buildCache.get(heroId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cached.data, {
      headers: {
        "Cache-Control": "public, max-age=1800, stale-while-revalidate=900",
        "X-Cache": "HIT",
      },
    });
  }

  try {
    const heroes = await fetchAllHeroes();
    const hero = heroes.find((h) => h.id === heroId);
    if (!hero) {
      return NextResponse.json({ error: "Hero not found" }, { status: 404 });
    }

    const itemMap = itemIdsData as Record<string, string>;
    const abilitiesMap = abilitiesData as Record<string, any>;
    const heroAbilitiesMap = heroAbilitiesData as Record<string, any>;
    const abilityIdMap = abilityIdsData as Record<string, string>;

    // 1. Query real matches from local database
    let localMatches: any[] = [];
    try {
      localMatches = await prisma.dotaMatch.findMany({
        take: 300,
        orderBy: { startTime: "desc" },
        select: {
          matchId: true,
          duration: true,
          startTime: true,
          radiantWin: true,
          playersJson: true,
        },
      });
    } catch (dbErr) {
      console.warn("Could not query dotaMatch table:", dbErr);
    }

    const realPlayerMatches: RealPlayerMatch[] = [];
    const itemCounts = {
      start: new Map<number, number>(),
      early: new Map<number, number>(),
      mid: new Map<number, number>(),
      late: new Map<number, number>(),
    };

    // Filter matches where this hero was played
    for (const m of localMatches) {
      let players: any[] = [];
      try {
        players = typeof m.playersJson === "string" ? JSON.parse(m.playersJson) : m.playersJson;
      } catch {
        continue;
      }

      const p = players.find((pl: any) => pl && pl.hero_id === heroId);
      if (!p) continue;

      const isRadiant = p.player_slot < 128;
      const won = isRadiant ? m.radiantWin : !m.radiantWin;
      const kda = ((p.kills + p.assists) / Math.max(1, p.deaths)).toFixed(2);

      // Final items
      const finalItemIds = [p.item_0, p.item_1, p.item_2, p.item_3, p.item_4, p.item_5];
      const final_items = finalItemIds
        .filter((itemId) => typeof itemId === "number" && itemId > 0)
        .map((itemId) => {
          const res = resolveItemKey(itemId);
          return {
            id: itemId,
            name: res.slug,
            localizedName: res.name,
            icon: res.icon || getItemIconUrl(itemId) || "",
          };
        });

      let neutral_item = null;
      if (p.item_neutral && p.item_neutral > 0) {
        const res = resolveItemKey(p.item_neutral);
        neutral_item = {
          id: p.item_neutral,
          name: res.slug,
          localizedName: res.name,
          icon: res.icon || getItemIconUrl(p.item_neutral) || "",
        };
      }

      // Purchase log analysis
      const purchaseLog: Array<{ time: number; key: string }> = Array.isArray(p.purchase_log)
        ? p.purchase_log
        : [];

      // Count items by game phase
      for (const buy of purchaseLog) {
        if (!buy || !buy.key) continue;
        const res = resolveItemKey(buy.key);
        if (res.id <= 0 || res.slug.startsWith("recipe_") || res.slug === "tpscroll") continue;

        if (buy.time <= 0) {
          itemCounts.start.set(res.id, (itemCounts.start.get(res.id) || 0) + 1);
        } else if (buy.time <= 600) {
          itemCounts.early.set(res.id, (itemCounts.early.get(res.id) || 0) + 1);
        } else if (buy.time <= 1500) {
          itemCounts.mid.set(res.id, (itemCounts.mid.get(res.id) || 0) + 1);
        } else {
          itemCounts.late.set(res.id, (itemCounts.late.get(res.id) || 0) + 1);
        }
      }

      // Starting items
      const starting_items = purchaseLog
        .filter((entry) => entry.time <= 0 && entry.key && !entry.key.includes("ward") && entry.key !== "tpscroll")
        .slice(0, 6)
        .map((entry) => {
          const res = resolveItemKey(entry.key);
          return {
            name: res.slug,
            localizedName: res.name,
            icon: res.icon || `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/items/${res.slug}.png`,
          };
        });

      // Timeline items
      const ignoredInTimeline = new Set([
        "tpscroll", "clarity", "tango", "flask", "faerie_fire", "branches",
        "ward_observer", "ward_sentry", "dust", "smoke_of_deceit", "enchanted_mango",
        "blood_grenade", "bottle",
      ]);

      const timeline_items = purchaseLog
        .filter((entry) => {
          if (entry.time <= 0 || !entry.key) return false;
          const cleanKey = entry.key.replace(/^item_/, "");
          if (cleanKey.startsWith("recipe_")) return false;
          if (ignoredInTimeline.has(cleanKey)) return false;
          return true;
        })
        .slice(0, 10)
        .map((entry) => {
          const res = resolveItemKey(entry.key);
          const mins = Math.floor(entry.time / 60);
          const secs = (entry.time % 60).toString().padStart(2, "0");
          return {
            name: res.slug,
            localizedName: res.name,
            icon: res.icon || `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/items/${res.slug}.png`,
            time: `${mins}:${secs}`,
            minute: mins,
          };
        });

      // Skill build
      const rawAbilityUpgrades: number[] = Array.isArray(p.ability_upgrades_arr) ? p.ability_upgrades_arr : [];
      const skill_build = rawAbilityUpgrades.slice(0, 15).map((abId, idx) => {
        const abCode = abilityIdMap[String(abId)] || "";
        const abMeta = abilitiesMap[abCode] || {};
        const img = abMeta.img
          ? `https://cdn.cloudflare.steamstatic.com${abMeta.img}`
          : `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/abilities/${abCode}.png`;
        return {
          level: idx + 1,
          name: abCode,
          title: abMeta.dname || abCode.replace(/_/g, " ") || `Lvl ${idx + 1}`,
          img,
        };
      });

      const matchPos =
        estimatePositionFromHistory({
          hero_id: heroId,
          lane_role: p.lane_role,
          lane: p.lane,
          player_slot: p.player_slot,
          last_hits: p.last_hits,
          duration: m.duration,
        }) ?? (hero.roles.includes("Carry") ? 1 : hero.roles.includes("Support") ? 5 : 2);

      if (realPlayerMatches.length < 10) {
        realPlayerMatches.push({
          match_id: Number(m.matchId),
          start_time: Math.floor(new Date(m.startTime).getTime() / 1000),
          duration: m.duration,
          won,
          player_name: p.personaname || `Игрок #${p.account_id || m.matchId}`,
          account_id: p.account_id,
          avatar: p.avatarfull || p.avatarmedium || p.avatar || null,
          pos: matchPos,
          pos_name: POS_NAME_RU[matchPos] || "Керри",
          pos_full: POS_FULL_RU[matchPos] || "Позиция 1 · Керри",
          kills: p.kills ?? 0,
          deaths: p.deaths ?? 0,
          assists: p.assists ?? 0,
          kda,
          net_worth: p.net_worth,
          gpm: p.gold_per_min,
          xpm: p.xp_per_min,
          hero_damage: p.hero_damage,
          last_hits: p.last_hits,
          lane_role: p.lane_role,
          rank_tier: p.rank_tier,
          final_items,
          neutral_item,
          starting_items,
          timeline_items,
          skill_build,
        });
      }
    }

    // Determine hero primary role for fallback items
    const roleKey = hero.roles.includes("Support")
      ? "support"
      : hero.roles.includes("Initiator") || hero.primary_attr === "str"
      ? "offlane"
      : hero.roles.includes("Nuker") && hero.primary_attr === "int"
      ? "mid"
      : "carry";

    const defaults = ROLE_DEFAULT_ITEMS[roleKey] || ROLE_DEFAULT_ITEMS.carry;

    // Helper to format item counts into PopularItem list, padding with role defaults if needed
    const formatPhaseItems = (counts: Map<number, number>, fallbackIds: number[], max = 6): PopularItem[] => {
      const sorted = Array.from(counts.entries())
        .map(([id, count]) => ({ id, count }))
        .sort((a, b) => b.count - a.count);

      const addedIds = new Set<number>();
      const result: PopularItem[] = [];

      for (const item of sorted) {
        if (result.length >= max) break;
        addedIds.add(item.id);
        const res = resolveItemKey(item.id);
        result.push({
          id: item.id,
          name: res.slug,
          localizedName: res.name,
          icon: res.icon || getItemIconUrl(item.id) || "https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/items/recipe.png",
          count: item.count,
        });
      }

      // If we don't have enough items from DB, fill with curated role items
      for (const fbId of fallbackIds) {
        if (result.length >= max) break;
        if (addedIds.has(fbId)) continue;
        addedIds.add(fbId);
        const res = resolveItemKey(fbId);
        result.push({
          id: fbId,
          name: res.slug,
          localizedName: res.name,
          icon: res.icon || getItemIconUrl(fbId) || "https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/items/recipe.png",
          count: 1,
        });
      }

      return result;
    };

    const itemBuild = {
      start: formatPhaseItems(itemCounts.start, defaults.start, 6),
      early: formatPhaseItems(itemCounts.early, defaults.early, 6),
      mid: formatPhaseItems(itemCounts.mid, defaults.mid, 6),
      late: formatPhaseItems(itemCounts.late, defaults.late, 6),
    };

    // 2. Extract hero abilities
    const hAbilities = heroAbilitiesMap[hero.name] || {};
    const rawAbilityList: string[] = hAbilities.abilities || [];

    const abilities = rawAbilityList
      .filter((abName) => abName && !abName.includes("generic_hidden") && !abName.includes("empty"))
      .slice(0, 6)
      .map((abName) => {
        const info = abilitiesMap[abName] || {};
        const img = info.img
          ? `https://cdn.cloudflare.steamstatic.com${info.img}`
          : `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/abilities/${abName}.png`;
        return {
          name: abName,
          title: info.dname || abName.replace(/_/g, " "),
          img,
          desc: info.desc || "",
        };
      });

    // 3. Extract talent tree
    const rawTalents: Array<{ name: string; level: number }> = hAbilities.talents || [];
    const talentTree: Array<{
      level: number;
      left: { name: string; title: string };
      right: { name: string; title: string };
    }> = [];

    const levelMap: Record<number, number> = { 1: 10, 2: 15, 3: 20, 4: 25 };

    for (let tier = 1; tier <= 4; tier++) {
      const tierTalents = rawTalents.filter((t) => t.level === tier);
      const leftTalent = tierTalents[0];
      const rightTalent = tierTalents[1];

      const leftTitle = (leftTalent && abilitiesMap[leftTalent.name]?.dname) || leftTalent?.name || "—";
      const rightTitle = (rightTalent && abilitiesMap[rightTalent.name]?.dname) || rightTalent?.name || "—";

      talentTree.push({
        level: levelMap[tier] || tier * 5 + 5,
        left: {
          name: leftTalent?.name || "",
          title: leftTitle,
        },
        right: {
          name: rightTalent?.name || "",
          title: rightTitle,
        },
      });
    }

    const responseData = {
      hero: {
        id: hero.id,
        name: hero.name,
        localized_name: hero.localized_name,
        primary_attr: hero.primary_attr,
        attack_type: hero.attack_type,
        roles: hero.roles,
        iconUrl: heroIconUrl(hero.name),
      },
      itemBuild,
      realPlayerMatches,
      abilities,
      talentTree,
      fetchedAt: Date.now(),
    };

    // Cache in memory
    buildCache.set(heroId, { data: responseData, timestamp: Date.now() });

    return NextResponse.json(responseData, {
      headers: {
        "Cache-Control": "public, max-age=1800, stale-while-revalidate=900",
        "X-Cache": "MISS",
      },
    });
  } catch (error: any) {
    console.error("Hero build error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to load hero build" },
      { status: 500 }
    );
  }
}
