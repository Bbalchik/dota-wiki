import { prisma } from "@/lib/prisma";
import {
  fetchMatchDetails,
  fetchAllPlayerMatches,
  fetchProMatches,
  type FullMatchDetails,
} from "@/lib/opendota";
import { saveDotaMatchToDb, getDatabaseStats } from "@/lib/dota-match-db";

interface SyncLogEntry {
  time: number;
  message: string;
  added: number;
}

interface AutoUpdaterState {
  isStarted: boolean;
  isSyncing: boolean;
  lastSyncTime: number;
  totalSyncCycles: number;
  totalMatchesIngested: number;
  activeTrackedPlayers: Set<number>;
  lastAddedCount: number;
  syncLog: SyncLogEntry[];
}

declare global {
  // eslint-disable-next-line no-var
  var __dotaAutoUpdaterState: AutoUpdaterState | undefined;
  // eslint-disable-next-line no-var
  var __dotaAutoUpdaterTimer: NodeJS.Timeout | undefined;
}

function getState(): AutoUpdaterState {
  if (!globalThis.__dotaAutoUpdaterState) {
    globalThis.__dotaAutoUpdaterState = {
      isStarted: false,
      isSyncing: false,
      lastSyncTime: 0,
      totalSyncCycles: 0,
      totalMatchesIngested: 0,
      activeTrackedPlayers: new Set<number>([
        86745912,   // Default user / reference account
        321580662,  // Yatoro
        43711266,   // Satanic
        116630858,  // Malr1ne
        1068082356, // Top 1 EU
      ]),
      lastAddedCount: 0,
      syncLog: [],
    };
  }
  return globalThis.__dotaAutoUpdaterState;
}

/**
 * Register a player ID to be continuously tracked and auto-updated by the engine.
 */
export function trackPlayerId(accountId: number): void {
  if (!accountId || accountId <= 0) return;
  const state = getState();
  state.activeTrackedPlayers.add(accountId);
}

/**
 * Runs a single autonomous sync cycle:
 * 1. Crawls recent finished public matches across Dota 2 worldwide (all ranks & players).
 * 2. Ingests new matches into SQLite with full 10-player rosters, items, net worth, KDA, and roles.
 * 3. Refreshes active tracked players from Steam / Valve.
 */
export async function runSyncCycle(): Promise<{ added: number; message: string }> {
  const state = getState();
  if (state.isSyncing) {
    return { added: 0, message: "Sync cycle already in progress" };
  }

  state.isSyncing = true;
  let addedTotal = 0;

  try {
    // 1. Seed tracked players from database if not already loaded
    try {
      const dbProfiles = await prisma.steamProfile.findMany({
        select: { steamId: true },
        take: 30,
        orderBy: { updatedAt: "desc" },
      });
      for (const p of dbProfiles) {
        const id = Number(p.steamId);
        if (id > 0) state.activeTrackedPlayers.add(id);
      }
    } catch {}

    // 2. Discover recent live/finished matches across Dota 2 worldwide
    const candidateMatchIds = new Set<string>();

    // A. Fetch recent public matches (all brackets)
    try {
      const pubRes = await fetch("https://api.opendota.com/api/publicMatches", {
        cache: "no-store",
      });
      if (pubRes.ok) {
        const pubData = await pubRes.json();
        if (Array.isArray(pubData)) {
          pubData
            .filter((m: any) => m && m.duration >= 300 && m.match_id)
            .slice(0, 15)
            .forEach((m: any) => candidateMatchIds.add(String(m.match_id)));
        }
      }
    } catch {}

    // B. Fetch recent parsed matches (with complete replays)
    try {
      const pRes = await fetch("https://api.opendota.com/api/parsedMatches", {
        cache: "no-store",
      });
      if (pRes.ok) {
        const pData = await pRes.json();
        if (Array.isArray(pData)) {
          pData
            .filter((m: any) => m && m.match_id)
            .slice(0, 10)
            .forEach((m: any) => candidateMatchIds.add(String(m.match_id)));
        }
      }
    } catch {}

    // C. Fetch matches from 2 tracked players (round-robin)
    const trackedList = Array.from(state.activeTrackedPlayers);
    if (trackedList.length > 0) {
      // Pick 2 players based on cycle counter
      const p1 = trackedList[state.totalSyncCycles % trackedList.length];
      const p2 = trackedList[(state.totalSyncCycles + 1) % trackedList.length];
      const selectedPlayers = [p1, p2].filter(Boolean);

      for (const accId of selectedPlayers) {
        try {
          // Trigger Valve Steam sync in background
          fetch(`https://api.opendota.com/api/players/${accId}/refresh`, {
            method: "POST",
            cache: "no-store",
          }).catch(() => {});

          // Fetch latest player matches
          const playerMatches = await fetchAllPlayerMatches(accId, 15, 0, undefined, true);
          if (Array.isArray(playerMatches)) {
            playerMatches.forEach((m) => {
              if (m?.match_id) candidateMatchIds.add(String(m.match_id));
            });
          }
        } catch {}
      }
    }

    // 3. Filter candidates against SQLite to only process NEW or UNPARSED matches
    const allCandidateList = Array.from(candidateMatchIds);
    if (allCandidateList.length > 0) {
      const existingInDb = await prisma.dotaMatch.findMany({
        where: { matchId: { in: allCandidateList } },
        select: { matchId: true, isParsed: true },
      });
      const parsedSet = new Set(existingInDb.filter((m) => m.isParsed).map((m) => m.matchId));
      const freshMatchIds = allCandidateList.filter((id) => !parsedSet.has(id));

      // 4. Ingest at most 2 fresh matches per cycle to maintain smooth performance and zero lag
      const toIngest = freshMatchIds.slice(0, 2);
      for (const mid of toIngest) {
        try {
          const matchDetails = await fetchMatchDetails(mid);
          if (matchDetails && matchDetails.players && matchDetails.players.length >= 10) {
            await saveDotaMatchToDb(matchDetails);
            addedTotal++;

            // Register any active players found in this match
            for (const p of matchDetails.players) {
              if (p.account_id && p.account_id > 0) {
                state.activeTrackedPlayers.add(p.account_id);
              }
            }
          }
          // Polite delay between match fetches
          await new Promise((r) => setTimeout(r, 1500));
        } catch {}
      }
    }

    state.lastSyncTime = Date.now();
    state.totalSyncCycles++;
    state.totalMatchesIngested += addedTotal;
    state.lastAddedCount = addedTotal;

    const message = addedTotal > 0
      ? `Успешно сохранено ${addedTotal} новых матчей в базу данных SQLite`
      : `Матчи проверены: база данных актуальна (проверено ${allCandidateList.length} матчей)`;

    state.syncLog.unshift({
      time: Date.now(),
      message,
      added: addedTotal,
    });
    if (state.syncLog.length > 20) {
      state.syncLog = state.syncLog.slice(0, 20);
    }

    return { added: addedTotal, message };
  } catch (error: any) {
    console.warn("Auto-sync cycle error:", error);
    return { added: 0, message: error?.message || "Sync failed" };
  } finally {
    state.isSyncing = false;
  }
}

/**
 * Initializes and starts the background auto-updater.
 * Safe to call multiple times (idempotent).
 */
export function startDotaAutoUpdater(): void {
  const state = getState();
  if (state.isStarted) return;
  state.isStarted = true;

  console.log("🚀 [Dota Auto-Updater] Запущен автономный сервис обновления матчей Dota 2...");

  // Run first cycle gently after 15 seconds to allow full server startup
  setTimeout(() => {
    runSyncCycle().catch(() => {});
  }, 15_000);

  // Run automatically every 3 minutes (180s) to eliminate lag and prevent 429 rate limits
  if (globalThis.__dotaAutoUpdaterTimer) {
    clearInterval(globalThis.__dotaAutoUpdaterTimer);
  }
  globalThis.__dotaAutoUpdaterTimer = setInterval(() => {
    runSyncCycle().catch(() => {});
  }, 180_000);
}

/**
 * Returns current status of the auto-updater for API and UI.
 */
export async function getAutoUpdaterStatus() {
  const state = getState();
  const dbStats = await getDatabaseStats();

  return {
    isStarted: state.isStarted,
    isSyncing: state.isSyncing,
    lastSyncTime: state.lastSyncTime,
    lastSyncAgoSec: state.lastSyncTime > 0 ? Math.round((Date.now() - state.lastSyncTime) / 1000) : null,
    totalSyncCycles: state.totalSyncCycles,
    totalMatchesIngested: state.totalMatchesIngested,
    trackedPlayersCount: state.activeTrackedPlayers.size,
    dbTotalMatches: dbStats.totalMatches,
    lastAddedCount: state.lastAddedCount,
    recentLogs: state.syncLog.slice(0, 5),
  };
}
