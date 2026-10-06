import { NextRequest, NextResponse } from "next/server";
import { fetchAllHeroes, heroIconUrl, getItemIconUrl, getItemName } from "@/lib/opendota";
import { resolveItemKey } from "@/lib/item-utils";
import { estimatePositionFromHistory, POS_NAME_RU, POS_FULL_RU, type DotaPosition } from "@/lib/positions";
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const heroId = Number(id);

  if (isNaN(heroId) || heroId <= 0) {
    return NextResponse.json({ error: "Invalid hero ID" }, { status: 400 });
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

    // 1. Fetch item popularity from OpenDota (cached for 1 day)
    let itemPopData: any = null;
    try {
      const popRes = await fetch(`https://api.opendota.com/api/heroes/${heroId}/itemPopularity`, {
        next: { revalidate: 86400 },
      });
      if (popRes.ok) itemPopData = await popRes.json();
    } catch {
      // fallback
    }

    const formatItemList = (record?: Record<string, number>, max = 6): PopularItem[] => {
      if (!record) return [];
      const entries = Object.entries(record)
        .map(([itemId, count]) => ({ id: Number(itemId), count: Number(count) }))
        .sort((a, b) => b.count - a.count);

      return entries.slice(0, max).map((item) => {
        const itemCode = itemMap[String(item.id)] || `item_${item.id}`;
        return {
          id: item.id,
          name: itemCode,
          localizedName: getItemName(item.id),
          icon: getItemIconUrl(item.id) || "https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/items/recipe.png",
          count: item.count,
        };
      });
    };

    const itemBuild = {
      start: formatItemList(itemPopData?.start_game_items, 6),
      early: formatItemList(itemPopData?.early_game_items, 6),
      mid: formatItemList(itemPopData?.mid_game_items, 6),
      late: formatItemList(itemPopData?.late_game_items, 6),
    };

    // 2. Fetch recent real matches where this hero was played (Dotabuff Guides style)
    const realPlayerMatches: RealPlayerMatch[] = [];
    try {
      const heroMatchesRes = await fetch(`https://api.opendota.com/api/heroes/${heroId}/matches`, {
        next: { revalidate: 1800 },
      });
      if (heroMatchesRes.ok) {
        const recentHeroGames: any[] = await heroMatchesRes.json();
        const candidateMatches = (Array.isArray(recentHeroGames) ? recentHeroGames : [])
          .filter((m) => m.match_id && m.duration > 900)
          .slice(0, 8);

        // Fetch details of those real matches in parallel
        const matchDetailsList = await Promise.all(
          candidateMatches.map(async (cm) => {
            try {
              const dRes = await fetch(`https://api.opendota.com/api/matches/${cm.match_id}`, {
                next: { revalidate: 86400 },
              });
              if (dRes.ok) return await dRes.json();
            } catch {
              return null;
            }
            return null;
          })
        );

        for (const mDetail of matchDetailsList) {
          if (!mDetail || !Array.isArray(mDetail.players)) continue;
          const p = mDetail.players.find((pl: any) => pl.hero_id === heroId);
          if (!p || (!p.purchase_log?.length && !p.item_0 && !p.item_1)) continue;

          const isRadiant = p.player_slot < 128;
          const won = isRadiant ? mDetail.radiant_win : !mDetail.radiant_win;
          const kda = ((p.kills + p.assists) / Math.max(1, p.deaths)).toFixed(2);

          // Final items
          const finalItemIds = [p.item_0, p.item_1, p.item_2, p.item_3, p.item_4, p.item_5];
          const final_items = finalItemIds
            .filter((id) => typeof id === "number" && id > 0)
            .map((id) => {
              const res = resolveItemKey(id);
              return {
                id,
                name: res.slug,
                localizedName: res.name,
                icon: res.icon || "",
              };
            });

          let neutral_item = null;
          if (p.item_neutral && p.item_neutral > 0) {
            const res = resolveItemKey(p.item_neutral);
            neutral_item = {
              id: p.item_neutral,
              name: res.slug,
              localizedName: res.name,
              icon: res.icon || "",
            };
          }

          // Starting items and timeline from purchase_log
          const purchaseLog: Array<{ time: number; key: string }> = Array.isArray(p.purchase_log)
            ? p.purchase_log
            : [];

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

          // Timeline items (core items bought during the game)
          const ignoredInTimeline = new Set([
            "tpscroll", "clarity", "tango", "flask", "faerie_fire", "branches",
            "ward_observer", "ward_sentry", "dust", "smoke_of_deceit", "enchanted_mango",
            "blood_grenade", "bottle"
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

          // Skill build from ability_upgrades_arr
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
              duration: mDetail.duration,
            }) ?? 1;

          realPlayerMatches.push({
            match_id: mDetail.match_id,
            start_time: mDetail.start_time,
            duration: mDetail.duration,
            won,
            player_name: p.personaname || p.name || `Игрок #${p.account_id || mDetail.match_id}`,
            account_id: p.account_id,
            avatar: p.avatarfull || p.avatarmedium || p.avatar || null,
            pos: matchPos,
            pos_name: POS_NAME_RU[matchPos],
            pos_full: POS_FULL_RU[matchPos],
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
    } catch (mErr) {
      console.warn("Failed to fetch real player matches:", mErr);
    }

    // 3. Extract hero abilities
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

    // 4. Extract talents
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

    return NextResponse.json(
      {
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
      },
      {
        headers: {
          "Cache-Control": "public, max-age=1800, stale-while-revalidate=900",
        },
      }
    );
  } catch (error: any) {
    console.error("Hero build error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to load hero build" },
      { status: 500 }
    );
  }
}
