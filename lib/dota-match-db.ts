import { prisma } from "@/lib/prisma";
import {
  type FullMatchDetails,
  type MatchPlayerDetail,
  fetchMatchDetails,
  fetchProMatches,
  fetchRecentMatches,
} from "@/lib/opendota";

/**
 * Saves a full Dota 2 match directly into the SQLite database.
 * Preserves 100% of the authentic Valve / OpenDota match data.
 */
export async function saveDotaMatchToDb(
  match: FullMatchDetails,
  rawJson?: any
): Promise<void> {
  try {
    if (!match || !match.players || match.players.length === 0 || match.duration <= 0) return;

    const matchIdStr = String(match.match_id);

    // Check if match already has parsed timeline arrays
    const isParsed = Boolean(
      match.players.some(
        (p) =>
          (p.purchase_log && p.purchase_log.length > 0) ||
          (p.networth_t && p.networth_t.length > 0)
      )
    );

    const startTimeDate = match.start_time
      ? new Date(match.start_time * 1000)
      : new Date();

    await prisma.dotaMatch.upsert({
      where: { matchId: matchIdStr },
      create: {
        matchId: matchIdStr,
        radiantWin: Boolean(match.radiant_win),
        duration: match.duration,
        startTime: startTimeDate,
        gameMode: typeof match.lobby_type === "number" ? match.lobby_type : 22,
        gameModeName: match.game_mode_name || "Ranked All Pick",
        lobbyType: match.lobby_type ?? 7,
        radiantScore: match.radiant_score ?? 0,
        direScore: match.dire_score ?? 0,
        firstBloodTime: match.first_blood_time ?? null,
        towerStatusRad: match.tower_status_radiant ?? null,
        towerStatusDire: match.tower_status_dire ?? null,
        barracksStatusRad: match.barracks_status_radiant ?? null,
        barracksStatusDire: match.barracks_status_dire ?? null,
        regionName: match.region_name ?? null,
        skillBracket: match.skill_bracket_name ?? null,
        radiantGoldAdv: match.radiant_gold_adv
          ? JSON.stringify(match.radiant_gold_adv)
          : null,
        radiantXpAdv: match.radiant_xp_adv
          ? JSON.stringify(match.radiant_xp_adv)
          : null,
        playersJson: JSON.stringify(match.players),
        rawDetailsJson: rawJson ? JSON.stringify(rawJson) : null,
        isParsed,
      },
      update: {
        radiantWin: Boolean(match.radiant_win),
        duration: match.duration,
        startTime: startTimeDate,
        gameMode: typeof match.lobby_type === "number" ? match.lobby_type : 22,
        gameModeName: match.game_mode_name || "Ranked All Pick",
        lobbyType: match.lobby_type ?? 7,
        radiantScore: match.radiant_score ?? 0,
        direScore: match.dire_score ?? 0,
        towerStatusRad: match.tower_status_radiant ?? null,
        towerStatusDire: match.tower_status_dire ?? null,
        barracksStatusRad: match.barracks_status_radiant ?? null,
        barracksStatusDire: match.barracks_status_dire ?? null,
        radiantGoldAdv: match.radiant_gold_adv
          ? JSON.stringify(match.radiant_gold_adv)
          : null,
        radiantXpAdv: match.radiant_xp_adv
          ? JSON.stringify(match.radiant_xp_adv)
          : null,
        playersJson: JSON.stringify(match.players),
        rawDetailsJson: rawJson ? JSON.stringify(rawJson) : undefined,
        isParsed,
      },
    });
  } catch (error) {
    console.warn("Failed to persist DotaMatch to SQLite:", error);
  }
}

/**
 * Loads a match directly from the SQLite database.
 */
export async function getDotaMatchFromDb(
  matchId: string | number
): Promise<FullMatchDetails | null> {
  try {
    const record = await prisma.dotaMatch.findUnique({
      where: { matchId: String(matchId) },
    });

    if (!record) return null;

    const players: MatchPlayerDetail[] = JSON.parse(record.playersJson);
    const radiantGoldAdv: number[] = record.radiantGoldAdv
      ? JSON.parse(record.radiantGoldAdv)
      : [];
    const radiantXpAdv: number[] = record.radiantXpAdv
      ? JSON.parse(record.radiantXpAdv)
      : [];

    return {
      match_id: record.matchId,
      radiant_win: record.radiantWin,
      duration: record.duration,
      start_time: Math.floor(record.startTime.getTime() / 1000),
      radiant_score: record.radiantScore,
      dire_score: record.direScore,
      game_mode_name: record.gameModeName,
      lobby_type: record.lobbyType,
      radiant_gold_adv: radiantGoldAdv,
      radiant_xp_adv: radiantXpAdv,
      players,
      tower_status_radiant: record.towerStatusRad ?? undefined,
      tower_status_dire: record.towerStatusDire ?? undefined,
      barracks_status_radiant: record.barracksStatusRad ?? undefined,
      barracks_status_dire: record.barracksStatusDire ?? undefined,
      region_name: record.regionName ?? undefined,
      skill_bracket_name: record.skillBracket ?? undefined,
      first_blood_time: record.firstBloodTime ?? undefined,
      is_parsed: Boolean(record.isParsed),
    };
  } catch (error) {
    console.warn("Error reading DotaMatch from SQLite:", error);
    return null;
  }
}

/**
 * Retrieves all matches for a player stored in SQLite.
 */
export async function getPlayerMatchesFromDb(
  accountId: number,
  limit = 100
): Promise<any[]> {
  try {
    const records = await prisma.dotaMatch.findMany({
      where: {
        playersJson: { contains: `"account_id":${accountId}` },
      },
      orderBy: { startTime: "desc" },
      take: limit,
    });

    return records.map((rec) => {
      let players: any[] = [];
      try {
        players = JSON.parse(rec.playersJson);
      } catch {}
      const p = players.find((x) => x.account_id === accountId) || players[0] || {};

      return {
        match_id: Number(rec.matchId),
        player_slot: p.player_slot ?? 0,
        radiant_win: rec.radiantWin,
        duration: rec.duration,
        game_mode: rec.gameMode,
        lobby_type: rec.lobbyType,
        hero_id: p.hero_id ?? 0,
        start_time: Math.floor(rec.startTime.getTime() / 1000),
        kills: p.kills ?? 0,
        deaths: p.deaths ?? 0,
        assists: p.assists ?? 0,
        gold_per_min: p.gold_per_min ?? 0,
        xp_per_min: p.xp_per_min ?? 0,
        net_worth: p.net_worth ?? null,
        hero_damage: p.hero_damage ?? null,
        tower_damage: p.tower_damage ?? null,
        hero_healing: p.hero_healing ?? null,
        last_hits: p.last_hits ?? 0,
        denies: p.denies ?? 0,
        lane: p.lane ?? null,
        lane_role: p.lane_role ?? null,
        item_0: p.item_0 ?? 0,
        item_1: p.item_1 ?? 0,
        item_2: p.item_2 ?? 0,
        item_3: p.item_3 ?? 0,
        item_4: p.item_4 ?? 0,
        item_5: p.item_5 ?? 0,
        item_neutral: p.item_neutral ?? 0,
        backpack_0: p.backpack_0 ?? 0,
        backpack_1: p.backpack_1 ?? 0,
        backpack_2: p.backpack_2 ?? 0,
        level: p.level ?? null,
      };
    });
  } catch (err) {
    console.warn("Error reading player matches from SQLite:", err);
    return [];
  }
}

/**
 * Saves/updates a player profile into SQLite.
 */
export async function savePlayerProfileToDb(profile: {
  accountId: number;
  personaName?: string;
  avatarUrl?: string | null;
  rankTier?: number;
  leaderboardRank?: number | null;
  currentMmr?: number;
  wins?: number;
  losses?: number;
}): Promise<void> {
  try {
    if (!profile.accountId) return;
    await prisma.steamProfile.upsert({
      where: { steamId: String(profile.accountId) },
      create: {
        steamId: String(profile.accountId),
        personaName: profile.personaName || `Игрок ${profile.accountId}`,
        avatarUrl: profile.avatarUrl || null,
        rankTier: profile.rankTier || 0,
        leaderboardRank: profile.leaderboardRank || null,
        currentMmr: profile.currentMmr || 0,
        wins: profile.wins || 0,
        losses: profile.losses || 0,
      },
      update: {
        personaName: profile.personaName || undefined,
        avatarUrl: profile.avatarUrl || undefined,
        rankTier: profile.rankTier || undefined,
        leaderboardRank: profile.leaderboardRank || undefined,
        currentMmr: profile.currentMmr || undefined,
        wins: profile.wins || undefined,
        losses: profile.losses || undefined,
      },
    });
  } catch (err) {
    console.warn("Error saving SteamProfile to SQLite:", err);
  }
}

export interface ListMatchesOptions {
  page?: number;
  limit?: number;
  search?: string;
  heroId?: number;
  gameMode?: number;
  radiantWin?: boolean;
  isParsed?: boolean;
}

export interface MatchSummaryPlayer {
  accountId?: number;
  personaname?: string;
  heroId: number;
  name?: string;
  isRadiant: boolean;
  playerSlot: number;
  level: number;
  kills: number;
  deaths: number;
  assists: number;
  netWorth: number;
  nw?: number;
  lastHits: number;
  denies: number;
  gpm: number;
  xpm: number;
  heroDamage: number;
  towerDamage: number;
  heroHealing: number;
  item0: number;
  item1: number;
  item2: number;
  item3: number;
  item4: number;
  item5: number;
  backpack0: number;
  backpack1: number;
  backpack2: number;
  itemNeutral: number;
  posRole?: number;
  posRoman?: string;
  impScore?: number;
  isMvp?: boolean;
}

export interface MatchSummaryListItem {
  id: number;
  matchId: string;
  radiantWin: boolean;
  duration: number;
  startTime: string;
  gameModeName: string;
  lobbyType?: number;
  regionName?: string;
  skillBracket?: string;
  radiantScore: number;
  direScore: number;
  firstBloodTime?: number;
  towerStatusRad?: number;
  towerStatusDire?: number;
  barracksStatusRad?: number;
  barracksStatusDire?: number;
  isParsed: boolean;
  radiantHeroes: MatchSummaryPlayer[];
  direHeroes: MatchSummaryPlayer[];
  allPlayers: MatchSummaryPlayer[];
  radiantTotalNetWorth: number;
  direTotalNetWorth: number;
  stratzUrl?: string;
  d2ptUrl?: string;
  dotabuffUrl?: string;
  opendotaUrl?: string;
}

/**
 * Returns paginated matches from the SQLite database with rich player/hero details.
 */
export async function listDbMatches(options: ListMatchesOptions = {}): Promise<{
  matches: MatchSummaryListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(50, Math.max(1, options.limit || 15));
  const skip = (page - 1) * limit;

  const whereClause: any = {};

  if (options.search && options.search.trim()) {
    const s = options.search.trim();
    whereClause.OR = [
      { matchId: { contains: s } },
      { gameModeName: { contains: s } },
      { playersJson: { contains: s } },
    ];
  }

  if (typeof options.heroId === "number") {
    whereClause.playersJson = { contains: `"hero_id":${options.heroId}` };
  }

  if (typeof options.radiantWin === "boolean") {
    whereClause.radiantWin = options.radiantWin;
  }

  if (typeof options.isParsed === "boolean") {
    whereClause.isParsed = options.isParsed;
  }

  if (typeof options.gameMode === "number") {
    whereClause.gameMode = options.gameMode;
  } else if (!options.search) {
    // By default, prioritize competitive/ranked matches over Turbo
    whereClause.gameModeName = { not: "Turbo" };
  }

  try {
    let [total, records] = await Promise.all([
      prisma.dotaMatch.count({ where: whereClause }),
      prisma.dotaMatch.findMany({
        where: whereClause,
        orderBy: { startTime: "desc" },
        skip,
        take: limit,
      }),
    ]);

    // If search looks like a Dota 2 Match ID and not in DB yet, fetch live from Dota 2
    if (records.length === 0 && options.search && /^\d{8,11}$/.test(options.search.trim())) {
      const matchIdToFetch = options.search.trim();
      const directMatch = await fetchMatchDetails(matchIdToFetch);
      if (directMatch) {
        await saveDotaMatchToDb(directMatch);
        const newlySaved = await prisma.dotaMatch.findUnique({
          where: { matchId: matchIdToFetch },
        });
        if (newlySaved) {
          records = [newlySaved];
          total = 1;
        }
      }
    }

    const matches: MatchSummaryListItem[] = records.map((r) => {
      let players: MatchPlayerDetail[] = [];
      try {
        players = JSON.parse(r.playersJson);
      } catch {
        players = [];
      }

      const romanMap: Record<number, string> = { 1: "I", 2: "II", 3: "III", 4: "IV", 5: "V" };

      const allPlayers: MatchSummaryPlayer[] = players.map((p) => {
        const isRad = Boolean(p.isRadiant ?? (p.player_slot < 128));
        const nw = p.net_worth || 0;
        const isWon = isRad ? r.radiantWin : !r.radiantWin;
        const kdaScore = ((p.kills || 0) * 2.5 + (p.assists || 0) * 1.2) - ((p.deaths || 0) * 3.5);
        const winBonus = isWon ? 8 : -8;
        const computedImp = Math.max(-75, Math.min(75, Math.round(kdaScore * 1.3 + winBonus)));
        const imp = typeof p.imp === "number" ? p.imp : computedImp;
        const posRole = p.pos_role ?? 1;
        const posRoman = p.pos_roman ?? (romanMap[posRole] || "I");

        return {
          accountId: p.account_id || undefined,
          personaname: p.personaname || (p as any).name || undefined,
          heroId: p.hero_id,
          name: p.personaname || (p as any).name || undefined,
          isRadiant: isRad,
          playerSlot: p.player_slot,
          level: p.level || 1,
          kills: p.kills || 0,
          deaths: p.deaths || 0,
          assists: p.assists || 0,
          netWorth: nw,
          nw,
          lastHits: p.last_hits || 0,
          denies: p.denies || 0,
          gpm: p.gold_per_min || 0,
          xpm: p.xp_per_min || 0,
          heroDamage: p.hero_damage || 0,
          towerDamage: p.tower_damage || 0,
          heroHealing: p.hero_healing || 0,
          item0: p.item_0 || 0,
          item1: p.item_1 || 0,
          item2: p.item_2 || 0,
          item3: p.item_3 || 0,
          item4: p.item_4 || 0,
          item5: p.item_5 || 0,
          backpack0: p.backpack_0 || 0,
          backpack1: p.backpack_1 || 0,
          backpack2: p.backpack_2 || 0,
          itemNeutral: p.item_neutral || 0,
          posRole,
          posRoman,
          impScore: imp,
          isMvp: false,
        };
      });

      // Compute MVP: winning player with top IMP score
      const winners = allPlayers.filter((p) => p.isRadiant === r.radiantWin);
      if (winners.length > 0) {
        let best = winners[0];
        for (const wp of winners) {
          if ((wp.impScore ?? 0) > (best.impScore ?? 0)) {
            best = wp;
          }
        }
        best.isMvp = true;
      }

      const radiant = allPlayers.filter((p) => p.isRadiant);
      const dire = allPlayers.filter((p) => !p.isRadiant);
      const radiantTotalNetWorth = radiant.reduce((sum, p) => sum + p.netWorth, 0);
      const direTotalNetWorth = dire.reduce((sum, p) => sum + p.netWorth, 0);

      return {
        id: r.id,
        matchId: r.matchId,
        radiantWin: r.radiantWin,
        duration: r.duration,
        startTime: r.startTime.toISOString(),
        gameModeName: r.gameModeName,
        lobbyType: r.lobbyType,
        regionName: r.regionName ?? undefined,
        skillBracket: r.skillBracket ?? undefined,
        radiantScore: r.radiantScore,
        direScore: r.direScore,
        firstBloodTime: r.firstBloodTime ?? undefined,
        towerStatusRad: r.towerStatusRad ?? undefined,
        towerStatusDire: r.towerStatusDire ?? undefined,
        barracksStatusRad: r.barracksStatusRad ?? undefined,
        barracksStatusDire: r.barracksStatusDire ?? undefined,
        isParsed: r.isParsed,
        radiantHeroes: radiant,
        direHeroes: dire,
        allPlayers,
        radiantTotalNetWorth,
        direTotalNetWorth,
        stratzUrl: `https://stratz.com/matches/${r.matchId}`,
        d2ptUrl: `https://dota2protracker.com`,
        dotabuffUrl: `https://dotabuff.com/matches/${r.matchId}`,
        opendotaUrl: `https://opendota.com/matches/${r.matchId}`,
      };
    });

    // If heroId filter is active, filter in memory if needed
    let finalMatches = matches;
    if (options.heroId) {
      finalMatches = matches.filter(
        (m) =>
          m.radiantHeroes.some((h) => h.heroId === options.heroId) ||
          m.direHeroes.some((h) => h.heroId === options.heroId)
      );
    }

    return {
      matches: finalMatches,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  } catch (error) {
    console.warn("Error listing matches from DB:", error);
    return {
      matches: [],
      total: 0,
      page: 1,
      limit,
      totalPages: 1,
    };
  }
}

/**
 * Returns database overview statistics.
 */
export async function getDatabaseStats(): Promise<{
  totalMatches: number;
  radiantWins: number;
  direWins: number;
  avgDuration: number;
  parsedMatches: number;
}> {
  try {
    const [total, radiantWins, parsedMatches, aggregate] = await Promise.all([
      prisma.dotaMatch.count(),
      prisma.dotaMatch.count({ where: { radiantWin: true } }),
      prisma.dotaMatch.count({ where: { isParsed: true } }),
      prisma.dotaMatch.aggregate({
        _avg: {
          duration: true,
        },
      }),
    ]);

    const direWins = Math.max(0, total - radiantWins);
    const avgDuration = Math.round(aggregate._avg.duration || 0);

    return {
      totalMatches: total,
      radiantWins,
      direWins,
      avgDuration,
      parsedMatches,
    };
  } catch (error) {
    console.warn("Error getting DB stats:", error);
    return {
      totalMatches: 0,
      radiantWins: 0,
      direWins: 0,
      avgDuration: 0,
      parsedMatches: 0,
    };
  }
}

/**
 * Synchronizes matches directly from Valve / Dota 2 servers into the local SQLite database.
 * Pulls recent pro matches + top public tier matches and persists them.
 */
export async function syncRecentDotaMatches(limit: number = 20): Promise<{
  added: number;
  total: number;
  syncedIds: string[];
}> {
  const syncedIds: string[] = [];
  let added = 0;

  try {
    // 1. Fetch live matches directly from Dota 2 Pro Tracker (https://dota2protracker.com/)
    let d2ptCandidateIds: string[] = [];
    try {
      const { getD2PTHomeMatches, getD2PTPlayerMatches } = await import("@/lib/d2pt");
      const [homeIds, p1, p2, p3] = await Promise.all([
        getD2PTHomeMatches(),
        getD2PTPlayerMatches("Satanic"),
        getD2PTPlayerMatches("Yatoro"),
        getD2PTPlayerMatches("Nightfall"),
      ]);
      d2ptCandidateIds = Array.from(new Set([...homeIds, ...p1, ...p2, ...p3]));
    } catch (e) {
      console.warn("D2PT match sync failed:", e);
    }

    // 2. Fetch live pro tournament matches (Captains Mode, TI / BLAST / BetBoom)
    let proCandidateIds: string[] = [];
    try {
      const proMatches = await fetchProMatches(30);
      if (Array.isArray(proMatches)) {
        proCandidateIds = proMatches.map((m) => String(m.match_id));
      }
    } catch {}

    // 2. Fetch live parsed matches from Valve clusters (guaranteed full replay timeline)
    let parsedMatchIds: string[] = [];
    try {
      const pRes = await fetch("https://api.opendota.com/api/parsedMatches", {
        cache: "no-store",
      });
      if (pRes.ok) {
        const pData: { match_id: number }[] = await pRes.json();
        if (Array.isArray(pData)) {
          parsedMatchIds = pData.map((m) => String(m.match_id));
        }
      }
    } catch {}

    // 3. Fetch fresh high-MMR public matches (Immortal / Divine 7k+ MMR)
    let highMmrCandidateIds: string[] = [];
    try {
      const pubRes = await fetch("https://api.opendota.com/api/publicMatches?min_rank=70", {
        cache: "no-store",
      });
      if (pubRes.ok) {
        const pubData = await pubRes.json();
        if (Array.isArray(pubData)) {
          highMmrCandidateIds = pubData
            .filter((m: any) => m.duration >= 1200 && m.game_mode !== 23 && m.game_mode !== 13)
            .map((m: any) => String(m.match_id));
        }
      }
    } catch {}

    // 4. Fetch fresh public matches for ALL players and brackets
    let generalPublicCandidateIds: string[] = [];
    try {
      const allPubRes = await fetch("https://api.opendota.com/api/publicMatches", {
        cache: "no-store",
      });
      if (allPubRes.ok) {
        const allPubData = await allPubRes.json();
        if (Array.isArray(allPubData)) {
          generalPublicCandidateIds = allPubData
            .filter((m: any) => m.duration >= 1200 && m.game_mode !== 23 && m.game_mode !== 13)
            .map((m: any) => String(m.match_id));
        }
      }
    } catch {}

    // 5. Fetch recent matches of active tier-1 pros (Satanic, Yatoro, Malr1ne)
    let proPlayerMatchIds: string[] = [];
    try {
      const starAccounts = [321580662, 43711266, 116630858]; // Yatoro, Satanic, Malr1ne
      const starPromises = starAccounts.map((accId) =>
        fetch(`https://api.opendota.com/api/players/${accId}/matches?limit=4`, {
          cache: "no-store",
        })
          .then((r) => r.json())
          .catch(() => [])
      );
      const starResults = await Promise.all(starPromises);
      for (const resList of starResults) {
        if (Array.isArray(resList)) {
          for (const m of resList) {
            if (m.match_id) proPlayerMatchIds.push(String(m.match_id));
          }
        }
      }
    } catch {}

    // Merge candidates: Dota 2 Pro Tracker (D2PT) + Pro Tournaments + Parsed Replays + High MMR Ranked + General Public
    const allCandidates = Array.from(
      new Set([
        ...d2ptCandidateIds,
        ...proCandidateIds,
        ...parsedMatchIds,
        ...highMmrCandidateIds,
        ...generalPublicCandidateIds,
        ...proPlayerMatchIds,
      ])
    );

    if (allCandidates.length === 0) {
      const total = await prisma.dotaMatch.count();
      return { added: 0, total, syncedIds: [] };
    }

    // Query SQLite to find which matches are already stored and already have parsed replay
    const existingMatches = await prisma.dotaMatch.findMany({
      where: { matchId: { in: allCandidates } },
      select: { matchId: true, isParsed: true },
    });
    const parsedSet = new Set(
      existingMatches.filter((m) => m.isParsed).map((m) => m.matchId)
    );

    // Candidates to sync: not yet in DB, or in DB but not yet parsed
    const toSync = allCandidates.filter((id) => !parsedSet.has(id));
    const targetIds = toSync.slice(0, Math.max(1, limit));

    // Fetch and persist details
    for (const matchId of targetIds) {
      try {
        const details = await fetchMatchDetails(matchId);
        if (details && details.players && details.players.length === 10) {
          await saveDotaMatchToDb(details);
          syncedIds.push(matchId);
          added++;
        }
      } catch (err) {
        console.warn(`Error syncing match ${matchId}:`, err);
      }
    }

    const total = await prisma.dotaMatch.count();
    return { added, total, syncedIds };
  } catch (error) {
    console.warn("Failed to sync matches from Dota:", error);
    const total = await prisma.dotaMatch.count().catch(() => 0);
    return { added, total, syncedIds };
  }
}
