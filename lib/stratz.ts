/**
 * Stratz API Client (GraphQL)
 * 
 * Stratz (https://stratz.com/api) provides comprehensive Dota 2 match data,
 * including individual performance ratings (IMP), lane win probabilities,
 * second-by-second playback, and 100% bracket coverage.
 * 
 * Supports STRATZ_API_TOKEN from .env with automatic fallback to OpenDota.
 */

import { type FullMatchDetails, type MatchPlayerDetail, getGameModeName } from "@/lib/opendota";

export const STRATZ_GRAPHQL_URL = "https://api.stratz.com/graphql";

declare global {
  var __stratzToken: string | undefined;
}

/**
 * Retrieves the Stratz API Bearer token from global memory or environment variables.
 */
export function getStratzToken(): string | null {
  if (typeof globalThis !== "undefined" && globalThis.__stratzToken && globalThis.__stratzToken.trim()) {
    return globalThis.__stratzToken.trim();
  }
  if (typeof process !== "undefined" && process.env?.STRATZ_API_TOKEN && process.env.STRATZ_API_TOKEN.trim()) {
    return process.env.STRATZ_API_TOKEN.trim();
  }
  if (typeof process !== "undefined" && process.env?.STRATZ_TOKEN && process.env.STRATZ_TOKEN.trim()) {
    return process.env.STRATZ_TOKEN.trim();
  }
  return null;
}

/**
 * Checks whether the Stratz API integration is active with a valid token.
 */
export function isStratzConfigured(): boolean {
  return Boolean(getStratzToken());
}

/**
 * Validates a Stratz API Bearer token by executing a light introspection query.
 */
export async function validateStratzToken(token: string): Promise<boolean> {
  const clean = token.trim();
  if (!clean) return false;

  try {
    const res = await fetch(STRATZ_GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${clean}`,
        "User-Agent": "AegisGG-Dota2-Analytics/1.0",
      },
      body: JSON.stringify({
        query: "{ constants { gameVersions { id name } } }",
      }),
      cache: "no-store",
    });

    if (!res.ok) return false;
    const json = await res.json().catch(() => null);
    return Boolean(json?.data?.constants?.gameVersions);
  } catch {
    return false;
  }
}

/**
 * Saves a Stratz API Bearer token to memory and environment variables.
 */
export function saveStratzToken(token: string): void {
  const clean = token.trim();
  if (typeof globalThis !== "undefined") {
    globalThis.__stratzToken = clean;
  }
  if (typeof process !== "undefined" && process.env) {
    process.env.STRATZ_API_TOKEN = clean;
  }
}

/**
 * Removes the saved Stratz token.
 */
export function clearStratzToken(): void {
  if (typeof globalThis !== "undefined") {
    globalThis.__stratzToken = undefined;
  }
  if (typeof process !== "undefined" && process.env) {
    process.env.STRATZ_API_TOKEN = "";
  }
}

/**
 * Queries Stratz GraphQL API.
 */
async function queryStratzGraphQL<T>(query: string, variables: Record<string, any> = {}): Promise<T | null> {
  const token = getStratzToken();
  if (!token) return null;

  try {
    const res = await fetch(STRATZ_GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "User-Agent": "AegisGG-Dota2-Analytics/1.0",
      },
      body: JSON.stringify({ query, variables }),
      cache: "no-store",
    });

    if (!res.ok) {
      console.warn(`Stratz GraphQL error (${res.status}):`, await res.text().catch(() => ""));
      return null;
    }

    const json = await res.json();
    if (json.errors && json.errors.length > 0) {
      console.warn("Stratz GraphQL query errors:", json.errors);
      return null;
    }

    return json.data as T;
  } catch (error) {
    console.warn("Failed to reach Stratz GraphQL API:", error);
    return null;
  }
}

/**
 * Fetches full match details from Stratz by match ID.
 */
export async function fetchStratzMatch(matchId: number | string): Promise<FullMatchDetails | null> {
  const idNum = Number(matchId);
  if (isNaN(idNum) || idNum <= 0) return null;

  const query = `
    query GetStratzMatch($id: Long!) {
      match(id: $id) {
        id
        didRadiantWin
        durationSeconds
        startDateTime
        gameMode
        lobbyType
        radiantKills
        direKills
        radiantNetworth
        direNetworth
        firstBloodTime
        towerStatusRadiant
        towerStatusDire
        barracksStatusRadiant
        barracksStatusDire
        players {
          matchId
          playerSlot
          heroId
          isRadiant
          numKills
          numDeaths
          numAssists
          networth
          goldPerMinute
          experiencePerMinute
          heroDamage
          towerDamage
          heroHealing
          level
          imp
          lane
          role
          item0Id
          item1Id
          item2Id
          item3Id
          item4Id
          item5Id
          backpack0Id
          backpack1Id
          backpack2Id
          neutral0Id
          playbackData {
            purchaseEvents {
              time
              itemId
            }
            abilityCustomEvents {
              time
              abilityId
            }
          }
          stats {
            networthPerMinute
            experiencePerMinute
            heroDamageReport {
              dealtTotal {
                physicalDamage
                magicalDamage
                pureDamage
              }
            }
          }
        }
      }
    }
  `;

  interface StratzMatchResponse {
    match: {
      id: number;
      didRadiantWin: boolean;
      durationSeconds: number;
      startDateTime: number;
      gameMode: number;
      lobbyType: number;
      radiantKills?: number[];
      direKills?: number[];
      firstBloodTime?: number;
      towerStatusRadiant?: number;
      towerStatusDire?: number;
      barracksStatusRadiant?: number;
      barracksStatusDire?: number;
      players: {
        playerSlot: number;
        heroId: number;
        isRadiant: boolean;
        numKills: number;
        numDeaths: number;
        numAssists: number;
        networth: number;
        goldPerMinute: number;
        experiencePerMinute: number;
        heroDamage: number;
        towerDamage: number;
        heroHealing: number;
        level: number;
        imp?: number;
        lane?: number;
        role?: number;
        item0Id?: number;
        item1Id?: number;
        item2Id?: number;
        item3Id?: number;
        item4Id?: number;
        item5Id?: number;
        backpack0Id?: number;
        backpack1Id?: number;
        backpack2Id?: number;
        neutral0Id?: number;
        playbackData?: {
          purchaseEvents?: { time: number; itemId: number }[];
          abilityCustomEvents?: { time: number; abilityId: number }[];
        };
        stats?: {
          networthPerMinute?: number[];
          experiencePerMinute?: number[];
          heroDamageReport?: {
            dealtTotal?: {
              physicalDamage?: number;
              magicalDamage?: number;
              pureDamage?: number;
            };
          };
        };
      }[];
    } | null;
  }

  const data = await queryStratzGraphQL<StratzMatchResponse>(query, { id: idNum });
  if (!data?.match || !data.match.players) return null;

  return convertStratzMatchToDetails(data.match);
}

/**
 * Converts Stratz GraphQL match representation into our unified FullMatchDetails format.
 */
function convertStratzMatchToDetails(m: any): FullMatchDetails {
  const isRadiantWin = Boolean(m.didRadiantWin);
  const radKills = Array.isArray(m.radiantKills) ? m.radiantKills.length : 0;
  const direKills = Array.isArray(m.direKills) ? m.direKills.length : 0;

  const players: MatchPlayerDetail[] = (m.players || []).map((p: any) => {
    const isRad = Boolean(p.isRadiant ?? (p.playerSlot < 128));
    const purchases = (p.playbackData?.purchaseEvents || []).map((e: any) => ({
      time: e.time,
      key: `item_${e.itemId}`,
    }));

    const abilityUpgradesArr = (p.playbackData?.abilityCustomEvents || []).map((e: any) => e.abilityId);
    const abilityUpgrades = (p.playbackData?.abilityCustomEvents || []).map((e: any, idx: number) => ({
      time: e.time,
      ability: e.abilityId,
      level: idx + 1,
    }));

    const dealt = p.stats?.heroDamageReport?.dealtTotal;
    const damageBreakdown = dealt ? {
      physical: dealt.physicalDamage || 0,
      magical: dealt.magicalDamage || 0,
      pure: dealt.pureDamage || 0,
    } : {
      physical: Math.round((p.heroDamage || 0) * 0.6),
      magical: Math.round((p.heroDamage || 0) * 0.35),
      pure: Math.round((p.heroDamage || 0) * 0.05),
    };

    return {
      player_slot: p.playerSlot,
      hero_id: p.heroId,
      personaname: "Игрок",
      account_id: null,
      isRadiant: isRad,
      kills: p.numKills || 0,
      deaths: p.numDeaths || 0,
      assists: p.numAssists || 0,
      net_worth: p.networth || 0,
      gold_per_min: p.goldPerMinute || 0,
      xp_per_min: p.experiencePerMinute || 0,
      hero_damage: p.heroDamage || 0,
      tower_damage: p.towerDamage || 0,
      hero_healing: p.heroHealing || 0,
      level: p.level || 1,
      imp: typeof p.imp === "number" ? p.imp : undefined,
      lane: p.lane ?? null,
      lane_role: p.role ?? null,
      item_0: p.item0Id || 0,
      item_1: p.item1Id || 0,
      item_2: p.item2Id || 0,
      item_3: p.item3Id || 0,
      item_4: p.item4Id || 0,
      item_5: p.item5Id || 0,
      backpack_0: p.backpack0Id || 0,
      backpack_1: p.backpack1Id || 0,
      backpack_2: p.backpack2Id || 0,
      item_neutral: p.neutral0Id || 0,
      purchase_log: purchases,
      ability_upgrades_arr: abilityUpgradesArr,
      ability_upgrades: abilityUpgrades,
      damage_breakdown: damageBreakdown,
      gold_t: p.stats?.networthPerMinute || [],
      networth_t: p.stats?.networthPerMinute || [],
      xp_t: p.stats?.experiencePerMinute || [],
      lh_t: [],
      dn_t: [],
      last_hits: 0,
      denies: 0,
    };
  });

  const maxMins = Math.floor((m.durationSeconds || 0) / 60);
  const radiantGoldAdv: number[] = [];
  const radiantXpAdv: number[] = [];
  for (let min = 0; min <= maxMins; min++) {
    const radNw = players.filter(p => p.isRadiant).reduce((a, b) => a + (b.networth_t?.[min] ?? 0), 0);
    const direNw = players.filter(p => !p.isRadiant).reduce((a, b) => a + (b.networth_t?.[min] ?? 0), 0);
    radiantGoldAdv.push(radNw - direNw);

    const radXp = players.filter(p => p.isRadiant).reduce((a, b) => a + (b.xp_t?.[min] ?? 0), 0);
    const direXp = players.filter(p => !p.isRadiant).reduce((a, b) => a + (b.xp_t?.[min] ?? 0), 0);
    radiantXpAdv.push(radXp - direXp);
  }

  return {
    match_id: String(m.id),
    radiant_win: isRadiantWin,
    duration: m.durationSeconds || 0,
    start_time: m.startDateTime || 0,
    radiant_score: radKills,
    dire_score: direKills,
    game_mode_name: getGameModeName(m.gameMode),
    lobby_type: m.lobbyType,
    radiant_gold_adv: radiantGoldAdv,
    radiant_xp_adv: radiantXpAdv,
    players,
    tower_status_radiant: m.towerStatusRadiant,
    tower_status_dire: m.towerStatusDire,
    barracks_status_radiant: m.barracksStatusRadiant,
    barracks_status_dire: m.barracksStatusDire,
    first_blood_time: m.firstBloodTime,
    is_parsed: true, // Stratz matches are parsed by default
  };
}

/**
 * Triggers an asynchronous replay parse request on OpenDota / Valve clusters
 * if a match does not yet have full timeline analytics.
 */
export async function triggerReplayParse(matchId: string | number): Promise<boolean> {
  try {
    const res = await fetch(`https://api.opendota.com/api/request/${matchId}`, {
      method: "POST",
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}
