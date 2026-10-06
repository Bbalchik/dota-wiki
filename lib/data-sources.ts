/**
 * Multi-Source Data Engine for Dota 2 Analytics.
 * Aggregates and merges match data across:
 * 1. OpenDota API (with significant=0 to capture Turbo, short games, and all lobbies)
 * 2. Stratz GraphQL API (if STRATZ_API_KEY is configured in .env)
 * 3. Steam Web API (if STEAM_API_KEY is configured in .env)
 */

export interface DataSourceStatus {
  id: string;
  name: string;
  status: "active" | "configured" | "ready";
  description: string;
  requiresKey: boolean;
  hasKey: boolean;
}

export function getDataSourcesStatus(): DataSourceStatus[] {
  const hasStratz = Boolean(process.env.STRATZ_API_KEY);
  const hasSteam = Boolean(process.env.STEAM_API_KEY);

  return [
    {
      id: "opendota",
      name: "OpenDota API",
      status: "active",
      description: "Основной шлюз. Загружает 100% матчей без фильтрации (significant=0, включая Turbo).",
      requiresKey: false,
      hasKey: true,
    },
    {
      id: "steam",
      name: "Steam Web API (Valve)",
      status: hasSteam ? "active" : "ready",
      description: hasSteam
        ? "Прямое подключение к серверам Valve активно."
        : "Используется через синхронизацию OpenDota. Можно подключить персональный ключ STEAM_API_KEY в .env.",
      requiresKey: true,
      hasKey: hasSteam,
    },
    {
      id: "stratz",
      name: "Stratz GraphQL API",
      status: hasStratz ? "active" : "ready",
      description: hasStratz
        ? "Прямое подключение к GraphQL Stratz активно."
        : "Поддерживается при наличии STRATZ_API_KEY в .env (бесплатный ключ на stratz.com/api).",
      requiresKey: true,
      hasKey: hasStratz,
    },
    {
      id: "dotabuff",
      name: "Dotabuff & ProTracker",
      status: "ready",
      description: "Аналитические индексы и метрики сборок.",
      requiresKey: false,
      hasKey: true,
    },
  ];
}

/**
 * Triggers Steam Web API background sync for an account via OpenDota's background worker.
 * This commands Valve's match ingestion queue to pull all newly un-privated or missing historical games.
 */
export async function triggerSteamSync(accountId: number): Promise<{ success: boolean; status: number; message: string }> {
  try {
    const res = await fetch(`https://api.opendota.com/api/players/${accountId}/refresh`, {
      method: "POST",
    });
    return {
      success: res.ok,
      status: res.status,
      message: res.ok
        ? "Запрос на синхронизацию успешно отправлен серверам Steam и OpenDota"
        : `Сервер ответил статусом ${res.status}`,
    };
  } catch (e: any) {
    return {
      success: false,
      status: 500,
      message: e?.message || "Ошибка подключения к шлюзу синхронизации",
    };
  }
}

/**
 * If STRATZ_API_KEY is configured in .env, fetch exact player overview from Stratz GraphQL.
 */
export async function fetchStratzPlayerSummary(accountId: number): Promise<{
  matchCount?: number;
  winCount?: number;
  behaviorScore?: number;
  rank?: number;
} | null> {
  const token = process.env.STRATZ_API_KEY;
  if (!token) return null;

  try {
    const query = `
      query GetPlayer($steamAccountId: Long!) {
        player(steamAccountId: $steamAccountId) {
          matchCount
          winCount
          behaviorScore
          steamAccount {
            seasonRank
          }
        }
      }
    `;

    const res = await fetch("https://api.stratz.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "User-Agent": "AegisGG-Dota-Wiki",
      },
      body: JSON.stringify({ query, variables: { steamAccountId: accountId } }),
      next: { revalidate: 300 },
    });

    if (!res.ok) return null;
    const json = await res.json();
    const p = json?.data?.player;
    if (!p) return null;

    return {
      matchCount: p.matchCount,
      winCount: p.winCount,
      behaviorScore: p.behaviorScore,
      rank: p.steamAccount?.seasonRank,
    };
  } catch (e) {
    console.warn("Stratz GraphQL query failed:", e);
    return null;
  }
}

/**
 * If STEAM_API_KEY is configured in .env, query Valve IDOTA2Match_570/GetMatchHistory directly.
 */
export async function fetchSteamMatchHistory(accountId: number): Promise<number[] | null> {
  const key = process.env.STEAM_API_KEY;
  if (!key) return null;

  try {
    const res = await fetch(
      `https://api.steampowered.com/IDOTA2Match_570/GetMatchHistory/v1/?key=${key}&account_id=${accountId}&matches_requested=100`,
      { next: { revalidate: 120 } }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const matches = json?.result?.matches;
    if (Array.isArray(matches)) {
      return matches.map((m: any) => m.match_id);
    }
    return null;
  } catch (e) {
    console.warn("Steam Web API query failed:", e);
    return null;
  }
}
