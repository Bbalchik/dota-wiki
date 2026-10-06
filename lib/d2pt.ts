/**
 * Dota 2 Pro Tracker (D2PT) Client & Scraper
 * 
 * Fetches real high-MMR and professional matches directly from https://dota2protracker.com/
 * Streams live match IDs, tournament series, and player match histories.
 */

// Safely execute curl on Node server without leaking child_process into client bundle
async function runCurlCommand(cmd: string): Promise<string> {
  if (typeof window !== "undefined") return "";
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const cp = eval("require")("child_process");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const util = eval("require")("util");
    const execAsync = util.promisify(cp.exec);
    const { stdout } = await execAsync(cmd, {
      maxBuffer: 20 * 1024 * 1024,
      timeout: 15000,
      windowsHide: true,
    });
    return stdout || "";
  } catch (err) {
    console.warn("Curl command execution error:", err);
    return "";
  }
}

const D2PT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

export const D2PT_TOP_PLAYERS = [
  "Satanic",
  "Yatoro",
  "Nightfall",
  "Malr1ne",
  "Collapse",
  "miCKe",
  "Watson",
  "dyrachyo",
  "Ame",
  "Nisha",
  "Topson",
  "Pure",
  "Save",
  "bzm",
  "skiter",
  "33",
  "Sneyking",
  "TORONTOTOKYO",
  "Noone",
  "SumaiL",
];

/**
 * Executes a native HTTP GET using curl with browser TLS headers to bypass Cloudflare.
 */
export async function fetchD2PTHtml(url: string): Promise<string> {
  const cmd = `curl.exe -s -H "User-Agent: ${D2PT_USER_AGENT}" -H "Referer: https://dota2protracker.com/" -H "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" "${url}"`;
  return runCurlCommand(cmd);
}

/**
 * Extracts all Dota 2 match IDs embedded in a D2PT SvelteKit page.
 */
export function extractD2PTMatchIds(html: string): string[] {
  const ids = new Set<string>();
  if (!html) return [];

  // Parse streamed SvelteKit script tags
  const scripts = html.match(/<script[^>]*>([\s\S]*?)<\/script>/g) || [];
  for (const s of scripts) {
    if (s.includes("resolve(") && (s.includes("match_id") || s.includes("matches"))) {
      const match = s.match(/resolve\(\d+,\s*\(\)\s*=>\s*(\[[\s\S]*\])\)/);
      if (match) {
        try {
          // Safely evaluate data array
          const fn = new Function(`return ${match[1]}`);
          const data = fn();
          if (Array.isArray(data)) {
            for (const item of data) {
              if (Array.isArray(item?.matches)) {
                item.matches.forEach((m: any) => {
                  if (m?.match_id) ids.add(String(m.match_id));
                });
              }
              if (item?.pro_pulse?.recent_series) {
                item.pro_pulse.recent_series.forEach((ser: any) => {
                  ser.matches?.forEach((m: any) => {
                    if (m?.match_id) ids.add(String(m.match_id));
                  });
                });
              }
            }
          }
        } catch {}
      }
    }
  }

  // Regex fallback for match_id: 1234567890
  const rx = /match_id:\s*(\d{9,11})/g;
  let r: RegExpExecArray | null;
  while ((r = rx.exec(html)) !== null) {
    ids.add(r[1]);
  }

  // Regex for direct match URLs /matches/1234567890
  const rxUrl = /\/matches\/(\d{9,11})/g;
  let rUrl: RegExpExecArray | null;
  while ((rUrl = rxUrl.exec(html)) !== null) {
    ids.add(rUrl[1]);
  }

  return Array.from(ids);
}

/**
 * Fetches recent match IDs from Dota2ProTracker homepage (live stream + tournaments).
 */
export async function getD2PTHomeMatches(): Promise<string[]> {
  const html = await fetchD2PTHtml("https://dota2protracker.com/");
  return extractD2PTMatchIds(html);
}

/**
 * Fetches match IDs from a specific pro player's D2PT profile.
 */
export async function getD2PTPlayerMatches(playerName: string): Promise<string[]> {
  const html = await fetchD2PTHtml(
    `https://dota2protracker.com/player/${encodeURIComponent(playerName)}`
  );
  return extractD2PTMatchIds(html);
}

/**
 * Pulls match IDs directly from Dota 2 Pro Tracker (Home + Top Pros)
 * and synchronizes full authentic match details into SQLite.
 */
export async function syncMatchesFromD2PT(limit: number = 20): Promise<{
  added: number;
  total: number;
  syncedIds: string[];
}> {
  const syncedIds: string[] = [];
  let added = 0;

  try {
    const { prisma } = await import("@/lib/prisma");
    const { fetchMatchDetails } = await import("@/lib/opendota");
    const { saveDotaMatchToDb } = await import("@/lib/dota-match-db");

    // 1. Fetch live match stream from D2PT homepage
    const homeMatches = await getD2PTHomeMatches();

    // 2. Sample 4 random top pro players from D2PT for diversity
    const shuffledPros = [...D2PT_TOP_PLAYERS].sort(() => 0.5 - Math.random());
    const selectedPros = shuffledPros.slice(0, 4);

    const proMatchPromises = selectedPros.map((p) => getD2PTPlayerMatches(p));
    const proResults = await Promise.all(proMatchPromises);

    const candidateIds = Array.from(
      new Set([...homeMatches, ...proResults.flat()])
    );

    if (candidateIds.length === 0) {
      const total = await prisma.dotaMatch.count();
      return { added: 0, total, syncedIds: [] };
    }

    // 3. Check SQLite for already parsed matches
    const existing = await prisma.dotaMatch.findMany({
      where: { matchId: { in: candidateIds } },
      select: { matchId: true, isParsed: true },
    });
    const parsedSet = new Set(
      existing.filter((m) => m.isParsed).map((m) => m.matchId)
    );

    const toSync = candidateIds.filter((id) => !parsedSet.has(id));
    const targetIds = toSync.slice(0, Math.max(1, limit));

    // 4. Fetch details and save to DB
    for (const matchId of targetIds) {
      try {
        const details = await fetchMatchDetails(matchId);
        if (details && details.players && details.players.length === 10) {
          await saveDotaMatchToDb(details);
          syncedIds.push(matchId);
          added++;
        }
      } catch (err) {
        console.warn(`Error syncing D2PT match ${matchId}:`, err);
      }
    }

    const total = await prisma.dotaMatch.count();
    return { added, total, syncedIds };
  } catch (error) {
    console.warn("Failed to sync matches from Dota2ProTracker:", error);
    try {
      const { prisma } = await import("@/lib/prisma");
      const total = await prisma.dotaMatch.count().catch(() => 0);
      return { added, total, syncedIds };
    } catch {
      return { added, total: 0, syncedIds };
    }
  }
}
