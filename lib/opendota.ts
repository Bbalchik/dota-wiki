import { getItemIconUrl, getItemName, getItemCost } from './item-utils';
import { assignTeamPositions, isRadiantSlot, type DotaPosition } from './positions';

import heroStatsFallback from './constants/hero_stats.json';

const BASE = 'https://api.opendota.com/api';

export const CURRENT_DOTA_PATCH = '7.41d';

const memCache = new Map<string, { time: number; data: unknown }>();

let rateLimitCooldownUntil = 0;

export function isRateLimitExceeded(): boolean {
  return Date.now() < rateLimitCooldownUntil;
}

export function setRateLimitCooldown(ms = 1800_000): void {
  rateLimitCooldownUntil = Date.now() + ms;
}

export async function safeOpenDotaFetch(endpoint: string, options?: RequestInit, timeoutMs = 2500): Promise<Response | null> {
  if (isRateLimitExceeded()) {
    return null;
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const url = endpoint.startsWith('http') ? endpoint : `${BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (res.status === 429) {
      setRateLimitCooldown();
      return null;
    }
    return res;
  } catch {
    return null;
  }
}

function readCache<T>(key: string, maxAgeMs: number): T | null {
  const item = memCache.get(key);
  if (!item) return null;
  if (Date.now() - item.time > maxAgeMs) {
    return null;
  }
  return item.data as T;
}

function readStaleCache<T>(key: string): T | null {
  const item = memCache.get(key);
  return item ? (item.data as T) : null;
}

function writeCache<T>(key: string, data: T): void {
  memCache.set(key, { time: Date.now(), data });
}

export function clearPlayerCache(accountId: number): void {
  const accountStr = String(accountId);
  for (const key of memCache.keys()) {
    if (key.includes(accountStr)) {
      memCache.delete(key);
    }
  }
}

export function clearAllCache(): void {
  memCache.clear();
}

export type OpenDotaRatingHistory = {
  time: string;
  rank_tier: number;
};

export type OpenDotaPlayer = {
  tracked_until: number | null;
  solo_competitive_rank: number | null;
  competitive_rank: number | null;
  rank_tier: number | null;
  leaderboard_rank: number | null;
  mmr_estimate?: { estimate: number };
  computed_mmr?: number | null;
  computed_mmr_turbo?: number | null;
  profile: {
    account_id: number;
    personaname: string;
    name: string | null;
    plus: boolean;
    cheese: number;
    steamid: string;
    avatar: string;
    avatarmedium: string;
    avatarfull: string;
    profileurl: string;
    last_login: string | null;
    loccountrycode: string | null;
  };
};

export type OpenDotaMatch = {
  match_id: number;
  player_slot: number;
  radiant_win: boolean;
  duration: number;
  game_mode: number;
  lobby_type: number;
  hero_id: number;
  start_time: number;
  kills: number;
  deaths: number;
  assists: number;
  average_rank: number | null;
  gold_per_min: number;
  xp_per_min: number;
  net_worth: number | null;
  hero_damage: number | null;
  hero_healing: number | null;
  tower_damage: number | null;
  last_hits: number;
  lane: number | null;
  lane_role: number | null;
  item_0: number;
  item_1: number;
  item_2: number;
  item_3: number;
  item_4: number;
  item_5: number;
  item_neutral: number;
  backpack_0: number;
  backpack_1: number;
  backpack_2: number;
  leaver_status: number;
  party_size: number | null;
  level?: number | null;
};



export type OpenDotaHero = {
  id: number;
  name: string; // e.g. "npc_dota_hero_antimage"
  localized_name: string;
  primary_attr: string;
  attack_type: string;
  roles: string[];
  img: string;
  icon: string;
  base_health: number;
  move_speed: number;
};

export type OpenDotaWinLoss = {
  win: number;
  lose: number;
};

export type OpenDotaPlayerHeroStat = {
  hero_id: number;
  last_played: number;
  games: number;
  win: number;
  with_games: number;
  with_win: number;
  against_games: number;
  against_win: number;
};

export type OpenDotaSearchResult = {
  account_id: number;
  personaname: string;
  avatarfull: string;
  last_match_time: string;
  sml: number;
};

export type OpenDotaPlayerCounts = {
  leaver_status: Record<string, { games: number; win: number }>;
  game_mode: Record<string, { games: number; win: number }>;
  lobby_type: Record<string, { games: number; win: number }>;
  lane_role: Record<string, { games: number; win: number }>;
  region: Record<string, { games: number; win: number }>;
  is_radiant: Record<string, { games: number; win: number }>;
};

export type MatchPlayerDetail = {
  account_id: number | null;
  player_slot: number;
  hero_id: number;
  personaname: string;
  isRadiant: boolean;
  kills: number;
  deaths: number;
  assists: number;
  gold_per_min: number;
  xp_per_min: number;
  net_worth: number | null;
  last_hits: number;
  denies: number;
  hero_damage: number;
  tower_damage: number;
  hero_healing: number;
  level: number;
  item_0: number;
  item_1: number;
  item_2: number;
  item_3: number;
  item_4: number;
  item_5: number;
  backpack_0: number;
  backpack_1: number;
  backpack_2: number;
  item_neutral: number;
  item_neutral2?: number;
  gold_t: number[];
  networth_t: number[];
  lh_t: number[];
  dn_t?: number[];
  xp_t?: number[];
  purchase_log: { time: number; key: string }[];
  neutral_item_history?: { time: number; item_neutral?: string | number }[];
  lane?: number | null;
  lane_role?: number | null;
  pos_role?: DotaPosition;
  pos_roman?: string;
  rank_tier?: number | null;
  imp?: number; // -90 to +90
  ability_upgrades_arr?: (number | string)[];
  benchmarks?: Record<string, { raw: number; pct?: number; pct_bracket?: number }>;
  killed?: Record<string, number>;
  kills_log?: { time: number; key: string }[];
  obs_placed?: number;
  sen_placed?: number;
  obs_log?: { time: number; [key: string]: any }[];
  sen_log?: { time: number; [key: string]: any }[];
  camps_stacked?: number;
  aghanims_scepter?: number;
  aghanims_shard?: number;
  moonshard?: number;
  computed_mmr?: number | null;
  permanent_buffs?: { permanent_buff: number; stack_count: number; grant_time: number }[];
  additional_units?: {
    unitname: string;
    item_0: number;
    item_1: number;
    item_2: number;
    item_3: number;
    item_4: number;
    item_5: number;
    backpack_0: number;
    backpack_1: number;
    backpack_2: number;
    item_neutral?: number;
  }[];
  ability_upgrades?: {
    ability: number;
    time: number;
    level: number;
  }[];
  item_uses?: Record<string, number>;
  damage_inflictor?: Record<string, number>;
  damage_targets?: Record<string, Record<string, number>>;
  damage_inflictor_received?: Record<string, number>;
  damage_taken?: number;
  stuns?: number;
  hero_damage_t?: number[];
  hero_healing_t?: number[];
  damage_breakdown?: {
    physical: number;
    magical: number;
    pure: number;
  };
};

export type FullMatchDetails = {
  match_id: number | string;
  radiant_win: boolean;
  duration: number;
  start_time: number;
  radiant_score: number;
  dire_score: number;
  game_mode_name: string;
  lobby_type?: number;
  radiant_gold_adv: number[];
  radiant_xp_adv: number[];
  players: MatchPlayerDetail[];
  picks_bans?: { is_pick: boolean; hero_id: number; team: number; order: number }[];
  region_name?: string;
  skill_bracket_name?: string;
  tower_status_radiant?: number;
  tower_status_dire?: number;
  barracks_status_radiant?: number;
  barracks_status_dire?: number;
  first_blood_time?: number;
  average_mmr?: number;
  chat?: {
    time: number;
    type: string;
    key: string;
    slot: number;
    player_slot: number;
  }[];
  objectives?: {
    time: number;
    type: string;
    key?: string;
    slot?: number;
    player_slot?: number;
    value?: number;
  }[];
  replay_url?: string;
  is_parsed?: boolean;
  lane_outcomes?: {
    lane: 'top' | 'mid' | 'bot';
    name: string;
    winner: 'radiant' | 'dire' | 'tie';
    label: string;
    adv: number;
  }[];
};

const gameModeNames: Record<number, string> = {
  1: 'All Pick',
  2: "Captain's Mode",
  3: 'Random Draft',
  4: 'Single Draft',
  5: 'All Random',
  12: 'Least Played',
  13: 'Limited Heroes',
  16: "Captain's Draft",
  18: 'Ability Draft',
  20: 'All Random Deathmatch',
  21: '1v1 Mid',
  22: 'Ranked All Pick',
  23: 'Turbo',
  24: 'Mutation',
};

const laneRoleNames: Record<number, string> = {
  1: 'Легкая линия',
  2: 'Мидлейн',
  3: 'Сложная линия',
  4: 'Лес / роум',
};

export function getGameModeName(id: number) {
  return gameModeNames[id] ?? `Режим #${id}`;
}

export function getLaneRoleName(id: number | null) {
  if (!id) return 'Неизвестно';
  return laneRoleNames[id] ?? 'Линия не определена';
}

export async function fetchPlayerProfile(
  accountId: number
): Promise<OpenDotaPlayer | null> {
  const cacheKey = `player_${accountId}.json`;
  const cached = readCache<OpenDotaPlayer>(cacheKey, 300_000);
  if (cached) return cached;

  if (!isRateLimitExceeded()) {
    try {
      const res = await safeOpenDotaFetch(`/players/${accountId}`, {
        next: { revalidate: 300 },
      });
      if (res && res.ok) {
        const data = await res.json();
        if (data && typeof data === 'object' && data.profile) {
          writeCache(cacheKey, data);
          return data;
        }
      }
    } catch {}
  }

  // Fallback to local DB (steamProfile or dotaMatch)
  try {
    const { prisma } = await import('@/lib/prisma');
    const dbProfile = await prisma.steamProfile.findFirst({
      where: { OR: [{ steamId: String(accountId) }, { id: accountId }] },
    });
    if (dbProfile) {
      const constructed: OpenDotaPlayer = {
        tracked_until: null,
        solo_competitive_rank: null,
        competitive_rank: null,
        rank_tier: dbProfile.rankTier,
        leaderboard_rank: dbProfile.leaderboardRank,
        computed_mmr: dbProfile.currentMmr || 6500,
        profile: {
          account_id: accountId,
          personaname: dbProfile.personaName,
          name: dbProfile.personaName,
          plus: true,
          cheese: 0,
          steamid: dbProfile.steamId,
          avatar: dbProfile.avatarUrl || 'https://avatars.steamstatic.com/9440037af5259d7d7b171a854c17210d98081a30_full.jpg',
          avatarmedium: dbProfile.avatarUrl || 'https://avatars.steamstatic.com/9440037af5259d7d7b171a854c17210d98081a30_full.jpg',
          avatarfull: dbProfile.avatarUrl || 'https://avatars.steamstatic.com/9440037af5259d7d7b171a854c17210d98081a30_full.jpg',
          profileurl: `https://steamcommunity.com/profiles/${dbProfile.steamId}`,
          last_login: null,
          loccountrycode: null,
        },
      };
      writeCache(cacheKey, constructed);
      return constructed;
    }

    const recentMatch = await prisma.dotaMatch.findFirst({
      where: { playersJson: { contains: `"account_id":${accountId}` } },
      orderBy: { startTime: 'desc' },
      select: { playersJson: true },
    });
    if (recentMatch) {
      const pl = JSON.parse(recentMatch.playersJson);
      const p = pl.find((x: any) => x.account_id === accountId);
      if (p) {
        const constructed: OpenDotaPlayer = {
          tracked_until: null,
          solo_competitive_rank: null,
          competitive_rank: null,
          rank_tier: p.rank_tier || 80,
          leaderboard_rank: null,
          computed_mmr: p.computed_mmr || 6000,
          profile: {
            account_id: accountId,
            personaname: p.personaname || `Игрок #${accountId}`,
            name: p.personaname || `Игрок #${accountId}`,
            plus: false,
            cheese: 0,
            steamid: String(accountId),
            avatar: p.avatarfull || 'https://avatars.steamstatic.com/9440037af5259d7d7b171a854c17210d98081a30_full.jpg',
            avatarmedium: p.avatarfull || 'https://avatars.steamstatic.com/9440037af5259d7d7b171a854c17210d98081a30_full.jpg',
            avatarfull: p.avatarfull || 'https://avatars.steamstatic.com/9440037af5259d7d7b171a854c17210d98081a30_full.jpg',
            profileurl: `https://steamcommunity.com/profiles/${accountId}`,
            last_login: null,
            loccountrycode: null,
          },
        };
        writeCache(cacheKey, constructed);
        return constructed;
      }
    }
  } catch {}

  return readStaleCache<OpenDotaPlayer>(cacheKey);
}

export async function fetchPlayerWinLoss(
  accountId: number
): Promise<OpenDotaWinLoss | null> {
  const cacheKey = `wl_${accountId}.json`;
  const cached = readCache<OpenDotaWinLoss>(cacheKey, 300_000);
  if (cached) return cached;

  if (!isRateLimitExceeded()) {
    try {
      const res = await safeOpenDotaFetch(`/players/${accountId}/wl?significant=0`, {
        next: { revalidate: 300 },
      });
      if (res && res.ok) {
        const data = await res.json();
        if (typeof data?.win === 'number' && typeof data?.lose === 'number') {
          writeCache(cacheKey, data);
          return data;
        }
      }
    } catch {}
  }

  // Calculate from local matches
  try {
    const { getPlayerMatchesFromDb } = await import('@/lib/dota-match-db');
    const matches = await getPlayerMatchesFromDb(accountId, 100);
    if (matches && matches.length > 0) {
      let win = 0;
      let lose = 0;
      for (const m of matches) {
        const isRad = m.player_slot < 128;
        const won = isRad ? m.radiant_win : !m.radiant_win;
        if (won) win++;
        else lose++;
      }
      const result = { win, lose };
      writeCache(cacheKey, result);
      return result;
    }
  } catch {}

  return readStaleCache<OpenDotaWinLoss>(cacheKey) ?? { win: 0, lose: 0 };
}

const MATCH_PROJECT_FIELDS = [
  'match_id', 'player_slot', 'radiant_win', 'duration', 'game_mode', 'lobby_type',
  'hero_id', 'start_time', 'kills', 'deaths', 'assists', 'average_rank',
  'item_0', 'item_1', 'item_2', 'item_3', 'item_4', 'item_5', 'item_neutral',
  'backpack_0', 'backpack_1', 'backpack_2',
  'gold_per_min', 'xp_per_min', 'net_worth', 'last_hits', 'denies', 'hero_damage', 'tower_damage',
  'hero_healing', 'lane', 'lane_role', 'leaver_status', 'party_size', 'level',
];

export async function triggerPlayerSteamSync(accountId: number): Promise<boolean> {
  clearPlayerCache(accountId);
  try {
    const res = await fetch(`${BASE}/players/${accountId}/refresh`, {
      method: 'POST',
      cache: 'no-store',
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchRecentMatches(
  accountId: number,
  limit = 20,
  bypassCache = false
): Promise<OpenDotaMatch[]> {
  const cacheKey = `recent_matches_${accountId}_${limit}.json`;
  if (!bypassCache) {
    const cached = readCache<OpenDotaMatch[]>(cacheKey, 15_000);
    if (cached && cached.length > 0) return cached;
  }

  // 1. Instant real-time query from OpenDota Redis/memory (200ms–1s)
  const recentPromise = (async (): Promise<OpenDotaMatch[]> => {
    try {
      const res = await fetch(`${BASE}/players/${accountId}/recentMatches`, {
        cache: bypassCache ? "no-store" : "default",
        next: { revalidate: 15 },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          return data.filter((m: any) => m && m.duration > 0);
        }
      }
      return [];
    } catch {
      return [];
    }
  })();

  // 2. Query local SQLite database (0ms)
  const dbPromise = (async (): Promise<OpenDotaMatch[]> => {
    try {
      const { getPlayerMatchesFromDb } = await import("@/lib/dota-match-db");
      return await getPlayerMatchesFromDb(accountId, limit);
    } catch {
      return [];
    }
  })();

  // 3. Fallback / Historical query with 6s timeout (includes complete items for all matches)
  const historicalPromise = (async (): Promise<OpenDotaMatch[]> => {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      const params = new URLSearchParams({ limit: String(Math.min(limit, 100)), significant: '0' });
      MATCH_PROJECT_FIELDS.forEach((f) => params.append('project', f));
      const res = await fetch(`${BASE}/players/${accountId}/matches?${params}`, {
        signal: controller.signal,
        cache: bypassCache ? 'no-store' : 'default',
        next: { revalidate: 30 },
      });
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          return data.filter((m: any) => m && m.duration > 0);
        }
      }
      return [];
    } catch {
      return [];
    }
  })();

  const [recentList, dbList, historicalList] = await Promise.all([
    recentPromise,
    dbPromise,
    historicalPromise,
  ]);

  // Merge and deduplicate by match_id
  const matchMap = new Map<number, OpenDotaMatch>();

  // Add historical and DB matches first (preserving items if present)
  for (const m of historicalList) {
    if (m?.match_id) matchMap.set(m.match_id, m);
  }
  for (const m of dbList) {
    if (m?.match_id) {
      const existing = matchMap.get(m.match_id);
      matchMap.set(m.match_id, existing ? { ...existing, ...m } : m);
    }
  }

  // Merge recent matches (latest games from minutes/hours ago)
  for (const m of recentList) {
    if (m?.match_id) {
      const existing = matchMap.get(m.match_id);
      if (existing) {
        matchMap.set(m.match_id, {
          ...existing,
          ...m,
          item_0: existing.item_0 ?? m.item_0,
          item_1: existing.item_1 ?? m.item_1,
          item_2: existing.item_2 ?? m.item_2,
          item_3: existing.item_3 ?? m.item_3,
          item_4: existing.item_4 ?? m.item_4,
          item_5: existing.item_5 ?? m.item_5,
          item_neutral: existing.item_neutral ?? m.item_neutral,
          backpack_0: existing.backpack_0 ?? m.backpack_0,
          backpack_1: existing.backpack_1 ?? m.backpack_1,
          backpack_2: existing.backpack_2 ?? m.backpack_2,
        });
      } else {
        matchMap.set(m.match_id, m);
      }
    }
  }

  const merged = Array.from(matchMap.values())
    .sort((a, b) => (b.start_time || 0) - (a.start_time || 0))
    .slice(0, limit);

  if (merged.length > 0) {
    writeCache(cacheKey, merged);
  }

  return merged;
}

import heroesData from './constants/heroes.json';

const localHeroes = heroesData as OpenDotaHero[];
let cachedHeroes: OpenDotaHero[] | null = null;

export async function fetchAllHeroes(): Promise<OpenDotaHero[]> {
  if (cachedHeroes && cachedHeroes.length > 0) return cachedHeroes;
  try {
    const res = await fetch(`${BASE}/heroes`, { next: { revalidate: 86400 } });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        cachedHeroes = data;
        return data;
      }
    }
  } catch {
    // fallback to local constants
  }
  cachedHeroes = localHeroes;
  return localHeroes;
}

/** Build Dota 2 hero portrait URL from hero name slug */
export function heroIconUrl(heroName: string) {
  const slug = heroName.replace('npc_dota_hero_', '');
  return `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/${slug}.png`;
}

/** Export item helpers from item-utils */
export { getItemIconUrl, getItemName, getItemCost };

/** Hero stats (winrate per hero) for a player */
export async function fetchPlayerHeroes(
  accountId: number
): Promise<OpenDotaPlayerHeroStat[]> {
  try {
    const res = await fetch(`${BASE}/players/${accountId}/heroes?significant=0`, {
      next: { revalidate: 600 },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

/** Player counts — breakdown by game_mode, lane_role, etc. */
export async function fetchPlayerCounts(
  accountId: number
): Promise<OpenDotaPlayerCounts | null> {
  try {
    const res = await fetch(`${BASE}/players/${accountId}/counts?significant=0`, {
      next: { revalidate: 600 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/** Fetch historical rank milestones and rating progression */
export async function fetchPlayerRatings(
  accountId: number
): Promise<OpenDotaRatingHistory[]> {
  try {
    const res = await fetch(`${BASE}/players/${accountId}/ratings`, {
      next: { revalidate: 600 },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

/** Fetch more matches with offset-based pagination */
export async function fetchAllPlayerMatches(
  accountId: number,
  limit?: number | null,
  offset = 0,
  lobbyType?: number,
  bypassCache = false
): Promise<OpenDotaMatch[]> {
  const isDefaultAll = !limit && !offset && lobbyType === undefined;
  const cacheKey = `matches_${accountId}_${limit ?? 'all'}_${offset}_${lobbyType ?? 'any'}.json`;
  if (isDefaultAll && !bypassCache) {
    const cached = readCache<OpenDotaMatch[]>(cacheKey, 60_000);
    if (cached && cached.length > 0) return cached;
  }

  try {
    const params = new URLSearchParams({ significant: '0' });
    if (limit && limit > 0) params.set('limit', String(limit));
    if (offset && offset > 0) params.set('offset', String(offset));
    MATCH_PROJECT_FIELDS.forEach((f) => params.append('project', f));
    if (lobbyType !== undefined) params.set('lobby_type', String(lobbyType));

    const fetchOptions: RequestInit = bypassCache
      ? { cache: 'no-store' }
      : { next: { revalidate: 30 } };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(`${BASE}/players/${accountId}/matches?${params}`, {
      ...fetchOptions,
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        writeCache(cacheKey, data);
        return data;
      }
    }
  } catch {
    // fallback to cache or recent
  }

  // If offset === 0, ensure we return at least recent matches
  if (offset === 0) {
    const recent = await fetchRecentMatches(accountId, limit || 20, bypassCache);
    if (recent.length > 0) return recent;
  }

  const stale = readStaleCache<OpenDotaMatch[]>(cacheKey);
  if (stale && stale.length > 0) return stale;
  return [];
}

/** Search for players by name via OpenDota */
export async function searchPlayers(
  query: string
): Promise<OpenDotaSearchResult[]> {
  try {
    const res = await fetch(
      `${BASE}/search?q=${encodeURIComponent(query)}`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return [];
    const data: OpenDotaSearchResult[] = await res.json();
    return data.slice(0, 12);
  } catch {
    return [];
  }
}

/** Rank tier -> readable string */
export function rankTierToString(tier: number | null): string {
  if (!tier) return 'Unranked';
  const medals: Record<number, string> = {
    1: 'Herald', 2: 'Guardian', 3: 'Crusader',
    4: 'Archon', 5: 'Legend', 6: 'Ancient',
    7: 'Divine', 8: 'Immortal',
  };
  const rank = Math.floor(tier / 10);
  const stars = tier % 10;
  const name = medals[rank] ?? 'Unknown';
  return rank === 8 ? 'Immortal' : `${name} ${stars}★`;
}

export function rankTierToColor(tier: number | null): string {
  if (!tier) return 'text-zinc-400';
  const rank = Math.floor(tier / 10);
  const colors: Record<number, string> = {
    1: 'text-zinc-400', 2: 'text-green-400', 3: 'text-green-300',
    4: 'text-teal-300', 5: 'text-sky-300', 6: 'text-blue-400',
    7: 'text-violet-400', 8: 'text-amber-400',
  };
  return colors[rank] ?? 'text-zinc-400';
}

export function rankTierBg(tier: number | null): string {
  if (!tier) return 'bg-zinc-800';
  const rank = Math.floor(tier / 10);
  const colors: Record<number, string> = {
    1: 'bg-zinc-700/30', 2: 'bg-green-900/30', 3: 'bg-green-900/30',
    4: 'bg-teal-900/30', 5: 'bg-sky-900/30', 6: 'bg-blue-900/30',
    7: 'bg-violet-900/30', 8: 'bg-amber-900/30',
  };
  return colors[rank] ?? 'bg-zinc-700/30';
}

/** Fetch a match directly from Database or Valve/OpenDota. Never invent missing replay data. */
export async function fetchMatchDetails(
  matchId: string | number
): Promise<FullMatchDetails | null> {
  const cacheKey = `match_${matchId}.json`;
  const cached = readCache<FullMatchDetails>(cacheKey, 86400_000);
  if (cached) return cached;

  // 1. Check local SQLite database first
  try {
    const { getDotaMatchFromDb } = await import("@/lib/dota-match-db");
    const dbMatch = await getDotaMatchFromDb(matchId);
    if (dbMatch && dbMatch.players && dbMatch.players.length >= 10) {
      writeCache(cacheKey, dbMatch);
      return dbMatch;
    }
  } catch {}

  // 2. Check Stratz (if token is configured, Stratz has full parse data)
  try {
    const { fetchStratzMatch, isStratzConfigured } = await import("@/lib/stratz");
    if (isStratzConfigured()) {
      const stratzMatch = await fetchStratzMatch(matchId);
      if (stratzMatch) {
        writeCache(cacheKey, stratzMatch);
        try {
          const { saveDotaMatchToDb } = await import("@/lib/dota-match-db");
          await saveDotaMatchToDb(stratzMatch);
        } catch {}
        return stratzMatch;
      }
    }
  } catch {}

  // 3. Fetch from Valve / OpenDota API if not rate limited
  if (!isRateLimitExceeded()) {
    try {
      const res = await safeOpenDotaFetch(`/matches/${matchId}`, {
        next: { revalidate: 3600 },
      });

      if (res && res.ok) {
        const data = await res.json();
        const processed = processOpenDotaMatchData(data);
        writeCache(cacheKey, processed);

      // If replay is not yet parsed, trigger background parse
      if (!processed.is_parsed) {
        import("@/lib/stratz")
          .then(({ triggerReplayParse }) => triggerReplayParse(matchId))
          .catch(() => {});
      }

      // Persist to SQLite to guarantee items and rosters are permanently saved
      try {
        const { saveDotaMatchToDb } = await import("@/lib/dota-match-db");
        await saveDotaMatchToDb(processed, data);
      } catch {}

      return processed;
      }
    } catch (e) {
      console.warn(`Could not fetch match ${matchId} from API:`, e);
    }
  }

  return readStaleCache<FullMatchDetails>(cacheKey);
}

export function computeDamageBreakdown(
  heroDamage: number,
  damageInflictor?: Record<string, number>
): { physical: number; magical: number; pure: number } {
  if (!damageInflictor || Object.keys(damageInflictor).length === 0) {
    return {
      physical: Math.round(heroDamage * 0.6),
      magical: Math.round(heroDamage * 0.35),
      pure: Math.round(heroDamage * 0.05),
    };
  }

  let physical = 0;
  let magical = 0;
  let pure = 0;

  for (const [key, amount] of Object.entries(damageInflictor)) {
    const val = Number(amount) || 0;
    if (val <= 0) continue;

    const lower = key.toLowerCase();
    if (lower === "null" || lower === "" || lower.includes("attack")) {
      physical += val;
    } else if (
      lower.includes("pure") ||
      lower.includes("laser") ||
      lower.includes("sun_strike") ||
      lower.includes("culling_blade") ||
      lower.includes("brain_sap") ||
      lower.includes("sonic_wave") ||
      lower.includes("timber_chain") ||
      lower.includes("chakram") ||
      lower.includes("whirling_death") ||
      lower.includes("blood_rite") ||
      lower.includes("glaives_of_wisdom") ||
      lower.includes("desolate") ||
      lower.includes("purification") ||
      lower.includes("test_of_faith") ||
      lower.includes("echo_slam")
    ) {
      pure += val;
    } else if (
      lower.includes("quill_spray") ||
      lower.includes("poison_touch") ||
      lower.includes("anchor_smash") ||
      lower.includes("amplify_damage") ||
      lower.includes("unstable_concoction") ||
      lower.includes("meld") ||
      lower.includes("the_swarm") ||
      lower.includes("stifling_dagger") ||
      lower.includes("tidebringer") ||
      lower.includes("cleave") ||
      lower.includes("slithereen_crush")
    ) {
      physical += val;
    } else {
      magical += val;
    }
  }

  const total = physical + magical + pure;
  if (total === 0 && heroDamage > 0) {
    return {
      physical: Math.round(heroDamage * 0.6),
      magical: Math.round(heroDamage * 0.35),
      pure: Math.round(heroDamage * 0.05),
    };
  }

  return { physical, magical, pure };
}

function lastSeriesValue(arr: unknown, fallback: number | null): number | null {
  if (!Array.isArray(arr) || arr.length === 0) return fallback;
  const v = arr[arr.length - 1];
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function processOpenDotaMatchData(data: any): FullMatchDetails {
  const mapped = (data.players || []).map((p: any, index: number) => {
    const player_slot = Number.isFinite(p.player_slot) ? p.player_slot : index;
    const networth_t: number[] = Array.isArray(p.networth_t) ? p.networth_t : [];
    const gold_t: number[] = Array.isArray(p.gold_t) ? p.gold_t : [];
    const duration = data.duration ?? 0;
    const reportedNw = typeof p.net_worth === 'number' && p.net_worth > 0 ? p.net_worth : null;
    const estimatedNw = p.gold_per_min && duration > 0 ? Math.round(p.gold_per_min * (duration / 60)) : null;
    const net_worth = reportedNw ?? lastSeriesValue(networth_t, lastSeriesValue(gold_t, estimatedNw));

    return {
      account_id: p.account_id ?? null,
      player_slot,
      hero_id: p.hero_id ?? 0,
      personaname: p.personaname || p.name || 'Игрок',
      isRadiant: isRadiantSlot(player_slot),
      kills: p.kills ?? 0,
      deaths: p.deaths ?? 0,
      assists: p.assists ?? 0,
      gold_per_min: p.gold_per_min ?? 0,
      xp_per_min: p.xp_per_min ?? 0,
      net_worth,
      last_hits: p.last_hits ?? 0,
      denies: p.denies ?? 0,
      hero_damage: p.hero_damage ?? 0,
      tower_damage: p.tower_damage ?? 0,
      hero_healing: p.hero_healing ?? 0,
      level: p.level ?? 0,
      item_0: p.item_0 ?? 0,
      item_1: p.item_1 ?? 0,
      item_2: p.item_2 ?? 0,
      item_3: p.item_3 ?? 0,
      item_4: p.item_4 ?? 0,
      item_5: p.item_5 ?? 0,
      backpack_0: p.backpack_0 ?? 0,
      backpack_1: p.backpack_1 ?? 0,
      backpack_2: p.backpack_2 ?? 0,
      item_neutral: p.item_neutral ?? 0,
      item_neutral2: p.item_neutral2 ?? 0,
      gold_t,
      networth_t,
      lh_t: Array.isArray(p.lh_t) ? p.lh_t : [],
      dn_t: Array.isArray(p.dn_t) ? p.dn_t : [],
      xp_t: Array.isArray(p.xp_t) ? p.xp_t : [],
      purchase_log: Array.isArray(p.purchase_log) ? p.purchase_log : [],
      neutral_item_history: Array.isArray(p.neutral_item_history) ? p.neutral_item_history : [],
      lane: p.lane ?? null,
      lane_role: p.lane_role ?? null,
      rank_tier: p.rank_tier ?? null,
      computed_mmr: p.computed_mmr != null ? Math.round(p.computed_mmr) : null,
      party_size: p.party_size ?? null,
      permanent_buffs: Array.isArray(p.permanent_buffs) ? p.permanent_buffs : [],
      ability_upgrades_arr:
        Array.isArray(p.ability_upgrades_arr) && p.ability_upgrades_arr.length > 0
          ? p.ability_upgrades_arr
          : Array.isArray(p.ability_upgrades)
          ? p.ability_upgrades.map((u: any) => u.ability)
          : [],
      ability_upgrades: Array.isArray(p.ability_upgrades)
        ? p.ability_upgrades.map((u: any) => ({
            ability: u.ability,
            time: u.time,
            level: u.level,
          }))
        : undefined,
      additional_units: Array.isArray(p.additional_units)
        ? p.additional_units.map((u: any) => ({
            unitname: u.unitname || "unit",
            item_0: u.item_0 ?? 0,
            item_1: u.item_1 ?? 0,
            item_2: u.item_2 ?? 0,
            item_3: u.item_3 ?? 0,
            item_4: u.item_4 ?? 0,
            item_5: u.item_5 ?? 0,
            backpack_0: u.backpack_0 ?? 0,
            backpack_1: u.backpack_1 ?? 0,
            backpack_2: u.backpack_2 ?? 0,
            item_neutral: u.item_neutral ?? 0,
          }))
        : undefined,
      item_uses: p.item_uses ?? undefined,
      damage_inflictor: p.damage_inflictor ?? undefined,
      damage_targets: p.damage_targets ?? undefined,
      damage_inflictor_received: p.damage_inflictor_received ?? undefined,
      damage_taken: p.damage_taken ? Object.values(p.damage_taken).reduce((a: number, b: any) => a + Number(b), 0) : undefined,
      stuns: typeof p.stuns === "number" ? Math.round(p.stuns) : 0,
      hero_damage_t: Array.isArray(p.hero_damage_t) ? p.hero_damage_t : [],
      hero_healing_t: Array.isArray(p.hero_healing_t) ? p.hero_healing_t : [],
      damage_breakdown: computeDamageBreakdown(p.hero_damage ?? 0, p.damage_inflictor),
      benchmarks: p.benchmarks,
      killed: p.killed,
      kills_log: p.kills_log,
      obs_placed: p.obs_placed ?? 0,
      sen_placed: p.sen_placed ?? 0,
      camps_stacked: p.camps_stacked ?? 0,
      aghanims_scepter: p.aghanims_scepter ?? 0,
      aghanims_shard: p.aghanims_shard ?? 0,
      moonshard: p.moonshard ?? 0,
    };
  });

  const isRadiantWin = Boolean(data.radiant_win);
  const roman: Record<number, string> = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V' };
  const radPos = assignTeamPositions(mapped.filter((p: MatchPlayerDetail) => p.isRadiant));
  const direPos = assignTeamPositions(mapped.filter((p: MatchPlayerDetail) => !p.isRadiant));

  const players: MatchPlayerDetail[] = mapped.map((p: MatchPlayerDetail) => {
    const pos = (p.isRadiant ? radPos : direPos).get(p.player_slot) ?? 1;
    const isWon = p.isRadiant ? isRadiantWin : !isRadiantWin;
    const kdaScore = ((p.kills || 0) * 2.5 + (p.assists || 0) * 1.2) - ((p.deaths || 0) * 3.5);
    const winBonus = isWon ? 8 : -8;
    const computedImp = Math.max(-75, Math.min(75, Math.round(kdaScore * 1.3 + winBonus)));
    const imp = typeof p.imp === 'number' ? p.imp : computedImp;

    return { ...p, pos_role: pos, pos_roman: roman[pos], imp };
  });

  const radiantScore =
    data.radiant_score ??
    players.filter((p) => p.isRadiant).reduce((a, b) => a + b.kills, 0);
  const direScore =
    data.dire_score ??
    players.filter((p) => !p.isRadiant).reduce((a, b) => a + b.kills, 0);

  const regionNames: Record<number, string> = {
    1: 'США (Запад)',
    2: 'США (Восток)',
    3: 'Европа (Запад)',
    5: 'ЮВА (Сингапур)',
    6: 'Дубай',
    7: 'Австралия',
    8: 'Россия',
    9: 'Европа (Восток)',
    10: 'Бразилия',
    11: 'Южная Африка',
    12: 'Китай',
    13: 'Китай',
    14: 'Чили',
    15: 'Перу',
    16: 'Индия',
    17: 'Польша',
    18: 'Япония',
  };
  const region_name = data.region ? (regionNames[data.region] ?? `Регион #${data.region}`) : 'Сервер Valve';

  const radTop = players.filter((p) => p.isRadiant && (p.lane === 3 || p.pos_role === 3 || p.pos_role === 4));
  const direTop = players.filter((p) => !p.isRadiant && (p.lane === 3 || p.pos_role === 1 || p.pos_role === 5));
  const radMid = players.filter((p) => p.isRadiant && (p.lane === 2 || p.pos_role === 2));
  const direMid = players.filter((p) => !p.isRadiant && (p.lane === 2 || p.pos_role === 2));
  const radBot = players.filter((p) => p.isRadiant && (p.lane === 1 || p.pos_role === 1 || p.pos_role === 5));
  const direBot = players.filter((p) => !p.isRadiant && (p.lane === 1 || p.pos_role === 3 || p.pos_role === 4));

  const getLaneAdv = (rad: MatchPlayerDetail[], dire: MatchPlayerDetail[]) => {
    const rNw = rad.reduce((acc, p) => acc + (p.networth_t?.[10] ?? p.net_worth ?? 0), 0);
    const dNw = dire.reduce((acc, p) => acc + (p.networth_t?.[10] ?? p.net_worth ?? 0), 0);
    return rNw - dNw;
  };

  const topAdv = getLaneAdv(radTop, direTop);
  const midAdv = getLaneAdv(radMid, direMid);
  const botAdv = getLaneAdv(radBot, direBot);

  const lane_outcomes = [
    {
      lane: 'top' as const,
      name: 'Верхняя линия',
      winner: topAdv > 800 ? ('radiant' as const) : topAdv < -800 ? ('dire' as const) : ('tie' as const),
      label: topAdv > 800 ? 'Победа Света - Верхняя линия' : topAdv < -800 ? 'Победа Тьмы - Верхняя линия' : 'Ничья - Верхняя линия',
      adv: topAdv,
    },
    {
      lane: 'mid' as const,
      name: 'Центральная линия',
      winner: midAdv > 800 ? ('radiant' as const) : midAdv < -800 ? ('dire' as const) : ('tie' as const),
      label: midAdv > 800 ? 'Победа Света - Центральная линия' : midAdv < -800 ? 'Победа Тьмы - Центральная линия' : 'Ничья - Центральная линия',
      adv: midAdv,
    },
    {
      lane: 'bot' as const,
      name: 'Нижняя линия',
      winner: botAdv > 800 ? ('radiant' as const) : botAdv < -800 ? ('dire' as const) : ('tie' as const),
      label: botAdv > 800 ? 'Победа Света - Нижняя линия' : botAdv < -800 ? 'Победа Тьмы - Нижняя линия' : 'Ничья - Нижняя линия',
      adv: botAdv,
    },
  ];

  return {
    match_id: data.match_id,
    radiant_win: isRadiantWin,
    duration: data.duration ?? 0,
    start_time: data.start_time ?? 0,
    radiant_score: radiantScore,
    dire_score: direScore,
    game_mode_name: getGameModeName(data.game_mode),
    lobby_type: data.lobby_type,
    region_name,
    radiant_gold_adv: Array.isArray(data.radiant_gold_adv) ? data.radiant_gold_adv : [],
    radiant_xp_adv: Array.isArray(data.radiant_xp_adv) ? data.radiant_xp_adv : [],
    players,
    picks_bans: data.picks_bans,
    tower_status_radiant: data.tower_status_radiant,
    tower_status_dire: data.tower_status_dire,
    barracks_status_radiant: data.barracks_status_radiant,
    barracks_status_dire: data.barracks_status_dire,
    first_blood_time: data.first_blood_time,
    average_mmr: data.average_rank ?? undefined,
    chat: Array.isArray(data.chat) ? data.chat : [],
    objectives: Array.isArray(data.objectives) ? data.objectives : [],
    replay_url: data.replay_url ?? undefined,
    is_parsed: Boolean(
      (Array.isArray(data.players) && data.players.some((p: any) => p.purchase_log && p.purchase_log.length > 0)) ||
      (Array.isArray(data.players) && data.players.some((p: any) => p.networth_t && p.networth_t.length > 0))
    ),
    lane_outcomes,
  };
}

export type OpenDotaHeroStat = OpenDotaHero & {
  hero_id: number;
  turbo_picks: number;
  turbo_wins: number;
  pro_pick: number;
  pro_win: number;
  pro_ban: number;
  "1_pick": number;
  "1_win": number;
  "2_pick": number;
  "2_win": number;
  "3_pick": number;
  "3_win": number;
  "4_pick": number;
  "4_win": number;
  "5_pick": number;
  "5_win": number;
  "6_pick": number;
  "6_win": number;
  "7_pick": number;
  "7_win": number;
  "8_pick": number;
  "8_win": number;
};

export type OpenDotaProMatch = {
  match_id: number;
  duration: number;
  start_time: number;
  radiant_team_id?: number;
  radiant_name?: string;
  dire_team_id?: number;
  dire_name?: string;
  leagueid?: number;
  league_name?: string;
  series_id?: number;
  series_type?: number;
  radiant_score: number;
  dire_score: number;
  radiant_win: boolean;
  radiant?: boolean;
};

export async function fetchHeroStats(): Promise<OpenDotaHeroStat[]> {
  const cacheKey = "hero_stats_all.json";
  const cached = readCache<OpenDotaHeroStat[]>(cacheKey, 300_000);
  if (cached && cached.length > 0) return cached;

  if (!isRateLimitExceeded()) {
    try {
      const res = await safeOpenDotaFetch('/heroStats', { next: { revalidate: 300 } });
      if (res && res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          writeCache(cacheKey, data);
          return data;
        }
      }
    } catch (e) {
      console.warn("Could not fetch heroStats:", e);
    }
  }

  const stale = readStaleCache<OpenDotaHeroStat[]>(cacheKey);
  if (stale && stale.length > 0) return stale;

  const fallback = (heroStatsFallback as unknown as OpenDotaHeroStat[]) ?? [];
  writeCache(cacheKey, fallback);
  return fallback;
}

export async function fetchProMatches(limit = 25): Promise<OpenDotaProMatch[]> {
  const cacheKey = `pro_matches_${limit}.json`;
  const cached = readCache<OpenDotaProMatch[]>(cacheKey, 600_000);
  if (cached && cached.length > 0) return cached;

  if (!isRateLimitExceeded()) {
    try {
      const res = await safeOpenDotaFetch('/proMatches', { next: { revalidate: 300 } });
      if (res && res.ok) {
        const data: OpenDotaProMatch[] = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const sliced = data.slice(0, limit);
          writeCache(cacheKey, sliced);
          return sliced;
        }
      }
    } catch (e) {
      console.warn("Could not fetch proMatches:", e);
    }
  }

  // Fallback to local database matches
  try {
    const { prisma } = await import('@/lib/prisma');
    const dbMatches = await prisma.dotaMatch.findMany({
      take: limit,
      orderBy: { startTime: 'desc' },
      select: {
        matchId: true,
        duration: true,
        startTime: true,
        radiantWin: true,
        radiantScore: true,
        direScore: true,
        gameModeName: true,
      },
    });
    if (dbMatches && dbMatches.length > 0) {
      const mapped: OpenDotaProMatch[] = dbMatches.map((m) => ({
        match_id: Number(m.matchId),
        duration: m.duration,
        start_time: Math.floor(new Date(m.startTime).getTime() / 1000),
        radiant_name: 'Radiant',
        dire_name: 'Dire',
        league_name: m.gameModeName || 'Ranked All Pick',
        radiant_score: m.radiantScore,
        dire_score: m.direScore,
        radiant_win: m.radiantWin,
      }));
      writeCache(cacheKey, mapped);
      return mapped;
    }
  } catch {}

  return readStaleCache<OpenDotaProMatch[]>(cacheKey) ?? [];
}

export interface ProPlayerPreset {
  name: string;
  realName: string;
  accountId: number;
  team: string;
  teamTag: string;
  role: string;
  pos: 1 | 2 | 3 | 4 | 5;
  avatar: string;
  country: string;
  achievements: string;
  rankLeaderboard: number;
  signatureHeroIds?: number[];
}

export const TOP_PRO_PLAYERS: ProPlayerPreset[] = [
  {
    name: "Yatoro (Raddan)",
    realName: "Илья Мулярчук",
    accountId: 321580662,
    team: "Team Spirit",
    teamTag: "Spirit",
    role: "Керри (Поз 1)",
    pos: 1,
    avatar: "https://avatars.steamstatic.com/df264d7df6db0ba73685f0ef3d7dfd670678d49a_full.jpg",
    country: "UA",
    achievements: "2x Чемпион The International",
    rankLeaderboard: 71,
    signatureHeroIds: [10, 44, 1], // Morphling, PA, AM
  },
  {
    name: "Satanic",
    realName: "Алан Галлямов",
    accountId: 431770905,
    team: "Team Spirit",
    teamTag: "Spirit",
    role: "Керри (Поз 1)",
    pos: 1,
    avatar: "https://avatars.steamstatic.com/47bf62c686ec5a7cf9b6fc52aa8e67a68579ad22_full.jpg",
    country: "RU",
    achievements: "16-летний вундеркинд, топ-1 ладдера",
    rankLeaderboard: 1,
    signatureHeroIds: [10, 8, 48], // Morph, Jugg, Luna
  },
  {
    name: "Malr1ne",
    realName: "Станислав Поторак",
    accountId: 385161499,
    team: "Team Falcons",
    teamTag: "Falcons",
    role: "Мидлейн (Поз 2)",
    pos: 2,
    avatar: "https://avatars.steamstatic.com/6d7db1ef4e5ff2bc40283ba6fc7db8b7a42b102b_full.jpg",
    country: "RU",
    achievements: "Чемпион ESL One Birmingham & DreamLeague",
    rankLeaderboard: 3,
    signatureHeroIds: [111, 74, 17], // Oracle/Timbersaw, Invoker, Storm
  },
  {
    name: "Miracle-",
    realName: "Амер аль-Баркави",
    accountId: 105248644,
    team: "Nigma Galaxy",
    teamTag: "Nigma",
    role: "Керри / Мид (Поз 1/2)",
    pos: 1,
    avatar: "https://avatars.steamstatic.com/a42feaa2828b6d80d29ae553b6fa03ee32c8fe5f_full.jpg",
    country: "JO",
    achievements: "Чемпион The International & Majors",
    rankLeaderboard: 16,
    signatureHeroIds: [74, 10, 48], // Invoker, Morph, Luna
  },
  {
    name: "Collapse",
    realName: "Магомед Халилов",
    accountId: 302214028,
    team: "Team Spirit",
    teamTag: "Spirit",
    role: "Оффлейн (Поз 3)",
    pos: 3,
    avatar: "https://avatars.steamstatic.com/2199b0572b22bb8be2195fefabecceacbe73426e_full.jpg",
    country: "RU",
    achievements: "2x Чемпион The International",
    rankLeaderboard: 4,
    signatureHeroIds: [46, 96, 29], // Magnus, Centaur, Tide
  },
  {
    name: "ATF (Ammar)",
    realName: "Аммар аль-Ассаф",
    accountId: 317880638,
    team: "Team Falcons",
    teamTag: "Falcons",
    role: "Оффлейн (Поз 3)",
    pos: 3,
    avatar: "https://avatars.steamstatic.com/b9500ea543666d9255bb120f269a8b16cf4c9354_full.jpg",
    country: "JO",
    achievements: "Победитель BetBoom Dacha & DreamLeague",
    rankLeaderboard: 9,
    signatureHeroIds: [98, 77, 19], // Timbersaw, Lycan, Tiny
  },
  {
    name: "Nisha",
    realName: "Михал Янковски",
    accountId: 121110826,
    team: "Team Liquid",
    teamTag: "Liquid",
    role: "Мидлейн (Поз 2)",
    pos: 2,
    avatar: "https://avatars.steamstatic.com/0b45bba214a1c518b0c802b5cb8845fc8677c7c2_full.jpg",
    country: "PL",
    achievements: "Чемпион The International 2024",
    rankLeaderboard: 11,
    signatureHeroIds: [13, 17, 106], // Puck, Storm, Ember
  },
  {
    name: "Quinn",
    realName: "Квин Каллахан",
    accountId: 221666230,
    team: "Gaimin Gladiators",
    teamTag: "GG",
    role: "Мидлейн (Поз 2)",
    pos: 2,
    avatar: "https://avatars.steamstatic.com/00147ae5b410425c27bf05256e0fc41f191b4081_full.jpg",
    country: "US",
    achievements: "3x Major & Riyadh Masters Champion",
    rankLeaderboard: 18,
    signatureHeroIds: [22, 13, 11], // Zeus, Puck, Shadow Fiend
  },
  {
    name: "watson",
    realName: "Алимжан Исламбеков",
    accountId: 171262902,
    team: "Gaimin Gladiators",
    teamTag: "GG",
    role: "Керри (Поз 1)",
    pos: 1,
    avatar: "https://avatars.steamstatic.com/d6501c64ebfe70b8a4f89fb0c6ff744c680653ba_full.jpg",
    country: "KZ",
    achievements: "Топ-1 европейского ладдера",
    rankLeaderboard: 7,
    signatureHeroIds: [10, 48, 12], // Morph, Luna, PL
  },
  {
    name: "Nightfall",
    realName: "Егор Григоренко",
    accountId: 86198642,
    team: "Tundra Esports",
    teamTag: "Tundra",
    role: "Керри (Поз 1)",
    pos: 1,
    avatar: "https://avatars.steamstatic.com/c15b157497d3e0980fa2fef9bc62e15ee9d8efd5_full.jpg",
    country: "RU",
    achievements: "Победитель ESL One & DreamLeague",
    rankLeaderboard: 12,
    signatureHeroIds: [10, 48, 70], // Morph, Luna, Ursa
  },
  {
    name: "Pure",
    realName: "Иван Москаленко",
    accountId: 20321748,
    team: "BetBoom Team",
    teamTag: "BB",
    role: "Керри (Поз 1)",
    pos: 1,
    avatar: "https://avatars.steamstatic.com/3ad2e9514e85731ad85f866ce9825b1be2f6244f_full.jpg",
    country: "RU",
    achievements: "Вице-чемпион DreamLeague & ESL",
    rankLeaderboard: 5,
    signatureHeroIds: [44, 48, 10], // PA, Luna, Morph
  },
  {
    name: "Topson",
    realName: "Топиас Таавитсайнен",
    accountId: 94054712,
    team: "Tundra / OG",
    teamTag: "Tundra",
    role: "Мидлейн (Поз 2)",
    pos: 2,
    avatar: "https://avatars.steamstatic.com/8302061245037d04bce3ef7781b490f84ae85ae9_full.jpg",
    country: "FI",
    achievements: "2x Чемпион The International",
    rankLeaderboard: 43,
    signatureHeroIds: [19, 74, 34], // Tiny, Invoker, Tinker
  },
  {
    name: "33 (Neta)",
    realName: "Нета Шапира",
    accountId: 86698277,
    team: "Tundra Esports",
    teamTag: "Tundra",
    role: "Оффлейн (Поз 3)",
    pos: 3,
    avatar: "https://avatars.steamstatic.com/b9a1eb40be0a6ca553ea9560fbc35fb313491f68_full.jpg",
    country: "IL",
    achievements: "2x Чемпион The International (Tundra & Liquid)",
    rankLeaderboard: 8,
    signatureHeroIds: [88, 38, 77], // Nyx, Beastmaster, Lycan
  },
  {
    name: "Cr1t-",
    realName: "Андреас Нильсен",
    accountId: 25907144,
    team: "Team Falcons",
    teamTag: "Falcons",
    role: "Семи-саппорт (Поз 4)",
    pos: 4,
    avatar: "https://avatars.steamstatic.com/b7c20c02058faef79fce8fc5bc5c64e622b7dc00_full.jpg",
    country: "DK",
    achievements: "2x Major Champion, Победитель Dacha",
    rankLeaderboard: 21,
    signatureHeroIds: [86, 64, 87], // Rubick, Jakiro, Disruptor
  },
  {
    name: "Saksa",
    realName: "Мартин Саздов",
    accountId: 103735789,
    team: "Tundra Esports",
    teamTag: "Tundra",
    role: "Семи-саппорт (Поз 4)",
    pos: 4,
    avatar: "https://avatars.steamstatic.com/00e84c2fcefc8433dfdf3bfcf849cf24c4dc8c9a_full.jpg",
    country: "MK",
    achievements: "Чемпион The International 2022",
    rankLeaderboard: 19,
    signatureHeroIds: [19, 137, 86], // Tiny, Primal, Rubick
  },
  {
    name: "Boxi",
    realName: "Самуэль Сван",
    accountId: 77444977,
    team: "Team Liquid",
    teamTag: "Liquid",
    role: "Семи-саппорт (Поз 4)",
    pos: 4,
    avatar: "https://avatars.steamstatic.com/49275e7a9b0c0f99b9cf6e0adfc4ea95147be15e_full.jpg",
    country: "SE",
    achievements: "Чемпион The International 2024",
    rankLeaderboard: 25,
    signatureHeroIds: [91, 51, 83], // Io, Clockwerk, Treant
  },
  {
    name: "Miposhka",
    realName: "Ярослав Найдёнов",
    accountId: 115965038,
    team: "Team Spirit",
    teamTag: "Spirit",
    role: "Полная поддержка (Поз 5)",
    pos: 5,
    avatar: "https://avatars.steamstatic.com/f9157db2e38c9735d1f5b08ec32e3a1309f7a610_full.jpg",
    country: "RU",
    achievements: "2x Чемпион The International (Капитан Spirit)",
    rankLeaderboard: 32,
    signatureHeroIds: [79, 64, 111], // Shadow Demon, Jakiro, Oracle
  },
  {
    name: "Sneyking",
    realName: "Цзинцзюнь У",
    accountId: 10366616,
    team: "Team Falcons",
    teamTag: "Falcons",
    role: "Полная поддержка (Поз 5)",
    pos: 5,
    avatar: "https://avatars.steamstatic.com/9fe6f790bc78d102e3b2e3f5b7aa2eb85f81ae0b_full.jpg",
    country: "US",
    achievements: "Чемпион The International 2022 (Капитан Falcons)",
    rankLeaderboard: 28,
    signatureHeroIds: [121, 87, 85], // Grimstroke, Disruptor, Undying
  },
  {
    name: "No[o]ne-",
    realName: "Владимир Миненко",
    accountId: 106573901,
    team: "PARIVISION",
    teamTag: "PV",
    role: "Мидлейн (Поз 2)",
    pos: 2,
    avatar: "https://avatars.steamstatic.com/71e9564ea5feef2bbffc556b69b596f7cff9d71c_full.jpg",
    country: "UA",
    achievements: "5x Чемпион Major-турниров",
    rankLeaderboard: 15,
    signatureHeroIds: [11, 106, 17], // SF, Ember, Storm
  },
];
